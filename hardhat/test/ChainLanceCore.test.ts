import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther, formatEther } from "viem";

describe("ChainLanceCore", function () {
  // Fixture to deploy contracts
  async function deployChainLanceFixture() {
    const [owner, client, freelancer, agent, otherAccount] = await ethers.getSigners();

    // Deploy MockPYUSD
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    const pyusd = await MockPYUSD.deploy();

    // Deploy ASIAgentVerifier (with placeholder address)
    const ASIAgentVerifier = await ethers.getContractFactory("ASIAgentVerifier");
    const asiVerifier = await ASIAgentVerifier.deploy(ethers.ZeroAddress);

    // Deploy ChainLanceCore
    const ChainLanceCore = await ethers.getContractFactory("ChainLanceCore");
    const chainLance = await ChainLanceCore.deploy(pyusd.target, asiVerifier.target);

    // Update ASI verifier with correct ChainLance address
    await asiVerifier.updateChainLanceCore(chainLance.target);

    // Deploy ReputationSystem
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const reputation = await ReputationSystem.deploy();

    // Authorize ChainLance to submit ratings
    await reputation.authorizeContract(chainLance.target);

    // Mint PYUSD tokens for testing
    await pyusd.mint(client.address, parseEther("10000"));
    await pyusd.mint(freelancer.address, parseEther("5000"));

    return {
      chainLance,
      pyusd,
      asiVerifier,
      reputation,
      owner,
      client,
      freelancer,
      agent,
      otherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { chainLance, owner } = await loadFixture(deployChainLanceFixture);
      expect(await chainLance.owner()).to.equal(owner.address);
    });

    it("Should set the correct PYUSD token", async function () {
      const { chainLance, pyusd } = await loadFixture(deployChainLanceFixture);
      expect(await chainLance.pyusdToken()).to.equal(pyusd.target);
    });

    it("Should set the correct ASI agent verifier", async function () {
      const { chainLance, asiVerifier } = await loadFixture(deployChainLanceFixture);
      expect(await chainLance.asiAgentVerifier()).to.equal(asiVerifier.target);
    });
  });

  describe("Profile Management", function () {
    it("Should allow users to create and update profiles", async function () {
      const { chainLance, client } = await loadFixture(deployChainLanceFixture);

      await chainLance.connect(client).updateProfile(
        "John Doe",
        "Experienced developer",
        "New York",
        ["JavaScript", "React", "Node.js"],
        ["https://github.com/johndoe"],
        85 // $85/hour
      );

      const profile = await chainLance.profiles(client.address);
      expect(profile.displayName).to.equal("John Doe");
      expect(profile.bio).to.equal("Experienced developer");
      expect(profile.location).to.equal("New York");
      expect(profile.hourlyRate).to.equal(85);
    });
  });

  describe("Job Posting", function () {
    it("Should allow clients to post jobs with escrow deposit", async function () {
      const { chainLance, pyusd, client } = await loadFixture(deployChainLanceFixture);

      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n; // 10% deposit

      // Approve PYUSD spending
      await pyusd.connect(client).approve(chainLance.target, escrowDeposit);

      await expect(
        chainLance.connect(client).postJob(
          "Build a DeFi Dashboard",
          "Need a React developer to build a comprehensive DeFi dashboard",
          "Web Development",
          ["React", "TypeScript", "Web3"],
          budget,
          0, // Fixed contract type
          Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
          "expert",
          "4-6 weeks",
          4 // number of milestones
        )
      ).to.emit(chainLance, "JobPosted");

      const job = await chainLance.getJob(1);
      expect(job.title).to.equal("Build a DeFi Dashboard");
      expect(job.budget).to.equal(budget);
      expect(job.client).to.equal(client.address);
      expect(job.status).to.equal(0); // JobStatus.Open
    });

    it("Should require escrow deposit for job posting", async function () {
      const { chainLance, client } = await loadFixture(deployChainLanceFixture);

      const budget = parseEther("1000");

      // Don't approve PYUSD spending - should fail
      await expect(
        chainLance.connect(client).postJob(
          "Build a DeFi Dashboard",
          "Description",
          "Web Development",
          ["React"],
          budget,
          0,
          Math.floor(Date.now() / 1000) + 86400 * 30,
          "expert",
          "4-6 weeks",
          4
        )
      ).to.be.revertedWith("Escrow deposit transfer failed");
    });
  });

  describe("Bidding System", function () {
    it("Should allow freelancers to place bids with stake", async function () {
      const { chainLance, pyusd, client, freelancer } = await loadFixture(deployChainLanceFixture);

      // First, post a job
      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n;
      await pyusd.connect(client).approve(chainLance.target, escrowDeposit);
      
      await chainLance.connect(client).postJob(
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        0,
        Math.floor(Date.now() / 1000) + 86400 * 30,
        "expert",
        "4-6 weeks",
        4
      );

      // Now place a bid
      const proposedAmount = parseEther("900");
      const stakeAmount = proposedAmount / 10n; // 10% stake

      await pyusd.connect(freelancer).approve(chainLance.target, stakeAmount);

      await expect(
        chainLance.connect(freelancer).placeBid(
          1, // jobId
          proposedAmount,
          "I have 5+ years experience with React and DeFi",
          "4 weeks",
          ["Setup & Planning", "UI Development", "DeFi Integration", "Testing & Deployment"]
        )
      ).to.emit(chainLance, "BidPlaced");

      const bid = await chainLance.getBid(1);
      expect(bid.freelancer).to.equal(freelancer.address);
      expect(bid.proposedAmount).to.equal(proposedAmount);
      expect(bid.stakeAmount).to.equal(stakeAmount);
      expect(bid.status).to.equal(0); // BidStatus.Pending
    });

    it("Should not allow bidding on own jobs", async function () {
      const { chainLance, pyusd, client } = await loadFixture(deployChainLanceFixture);

      // Post a job
      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n;
      await pyusd.connect(client).approve(chainLance.target, escrowDeposit);
      
      await chainLance.connect(client).postJob(
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        0,
        Math.floor(Date.now() / 1000) + 86400 * 30,
        "expert",
        "4-6 weeks",
        4
      );

      // Try to bid on own job
      const proposedAmount = parseEther("900");
      const stakeAmount = proposedAmount / 10n;
      await pyusd.connect(client).approve(chainLance.target, stakeAmount);

      await expect(
        chainLance.connect(client).placeBid(
          1,
          proposedAmount,
          "Bidding on my own job",
          "4 weeks",
          []
        )
      ).to.be.revertedWith("Cannot bid on your own job");
    });
  });

  describe("Contract Creation", function () {
    it("Should create contract when bid is accepted", async function () {
      const { chainLance, pyusd, client, freelancer } = await loadFixture(deployChainLanceFixture);

      // Post job
      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n;
      await pyusd.connect(client).approve(chainLance.target, escrowDeposit);
      
      await chainLance.connect(client).postJob(
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        2, // Milestone contract type
        Math.floor(Date.now() / 1000) + 86400 * 30,
        "expert",
        "4-6 weeks",
        4
      );

      // Place bid
      const proposedAmount = parseEther("900");
      const stakeAmount = proposedAmount / 10n;
      await pyusd.connect(freelancer).approve(chainLance.target, stakeAmount);
      
      await chainLance.connect(freelancer).placeBid(
        1,
        proposedAmount,
        "Great proposal",
        "4 weeks",
        ["Milestone 1", "Milestone 2", "Milestone 3", "Milestone 4"]
      );

      // Accept bid - need to approve remaining escrow
      const remainingEscrow = proposedAmount - escrowDeposit;
      await pyusd.connect(client).approve(chainLance.target, remainingEscrow);

      await expect(
        chainLance.connect(client).acceptBid(1)
      ).to.emit(chainLance, "ContractCreated");

      const contract = await chainLance.getContract(1);
      expect(contract.client).to.equal(client.address);
      expect(contract.freelancer).to.equal(freelancer.address);
      expect(contract.totalAmount).to.equal(proposedAmount);
      expect(contract.status).to.equal(1); // JobStatus.InProgress

      // Check that job status is updated
      const job = await chainLance.getJob(1);
      expect(job.status).to.equal(1); // JobStatus.InProgress
    });
  });

  describe("Milestone Management", function () {
    async function setupContractFixture() {
      const fixture = await loadFixture(deployChainLanceFixture);
      const { chainLance, pyusd, client, freelancer } = fixture;

      // Post job, place bid, and accept bid
      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n;
      await pyusd.connect(client).approve(chainLance.target, escrowDeposit);
      
      await chainLance.connect(client).postJob(
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        2, // Milestone contract type
        Math.floor(Date.now() / 1000) + 86400 * 30,
        "expert",
        "4-6 weeks",
        4
      );

      const proposedAmount = parseEther("900");
      const stakeAmount = proposedAmount / 10n;
      await pyusd.connect(freelancer).approve(chainLance.target, stakeAmount);
      
      await chainLance.connect(freelancer).placeBid(
        1,
        proposedAmount,
        "Great proposal",
        "4 weeks",
        ["Milestone 1", "Milestone 2", "Milestone 3", "Milestone 4"]
      );

      const remainingEscrow = proposedAmount - escrowDeposit;
      await pyusd.connect(client).approve(chainLance.target, remainingEscrow);
      await chainLance.connect(client).acceptBid(1);

      return { ...fixture, proposedAmount };
    }

    it("Should allow freelancer to submit milestones", async function () {
      const { chainLance, freelancer } = await setupContractFixture();

      await expect(
        chainLance.connect(freelancer).submitMilestone(
          1, // contractId
          0, // milestoneIndex
          "QmX1Y2Z3DeliverableHash" // IPFS hash
        )
      ).to.emit(chainLance, "MilestoneSubmitted");

      const contract = await chainLance.getContract(1);
      expect(contract.milestones[0].status).to.equal(1); // MilestoneStatus.Submitted
    });

    it("Should allow client to approve milestones", async function () {
      const { chainLance, client, freelancer, proposedAmount } = await setupContractFixture();

      // Submit milestone
      await chainLance.connect(freelancer).submitMilestone(1, 0, "QmX1Y2Z3DeliverableHash");

      // Approve milestone
      await expect(
        chainLance.connect(client).approveMilestone(1, 0)
      ).to.emit(chainLance, "MilestoneApproved");

      const contract = await chainLance.getContract(1);
      expect(contract.milestones[0].status).to.equal(2); // MilestoneStatus.Approved
    });

    it("Should release payment when milestone is approved", async function () {
      const { chainLance, pyusd, client, freelancer, proposedAmount } = await setupContractFixture();

      const initialBalance = await pyusd.balanceOf(freelancer.address);

      // Submit and approve milestone
      await chainLance.connect(freelancer).submitMilestone(1, 0, "QmX1Y2Z3DeliverableHash");
      await chainLance.connect(client).approveMilestone(1, 0);

      const finalBalance = await pyusd.balanceOf(freelancer.address);
      const milestoneAmount = proposedAmount / 4n; // 4 milestones
      const platformFeeAmount = (milestoneAmount * 300n) / 10000n; // 3% fee
      const expectedPayment = milestoneAmount - platformFeeAmount;

      expect(finalBalance - initialBalance).to.equal(expectedPayment);
    });
  });

  describe("ASI Agent Integration", function () {
    it("Should allow ASI agent to verify milestones", async function () {
      const { chainLance, asiVerifier, agent, client, freelancer } = await loadFixture(deployChainLanceFixture);

      // Register ASI agent
      await asiVerifier.connect(agent).registerAgent(
        agent.address,
        "verification_agent_metadata"
      );

      // Setup contract (simplified)
      const budget = parseEther("1000");
      const escrowDeposit = budget / 10n;
      await chainLance.pyusdToken().then(async (token) => {
        const pyusd = await ethers.getContractAt("MockPYUSD", token);
        await pyusd.connect(client).approve(chainLance.target, escrowDeposit);
      });
      
      await chainLance.connect(client).postJob(
        "Test Job",
        "Description",
        "Web Development",
        ["React"],
        budget,
        2,
        Math.floor(Date.now() / 1000) + 86400 * 30,
        "expert",
        "4-6 weeks",
        4
      );

      // Test ASI verification (this would normally be called by the ASI agent)
      await expect(
        asiVerifier.connect(agent).submitVerification(
          1, // requestId
          true, // approved
          "Verification passed: Code quality is good, tests are comprehensive"
        )
      ).to.emit(asiVerifier, "VerificationCompleted");
    });
  });

  describe("Platform Administration", function () {
    it("Should allow owner to set platform fee", async function () {
      const { chainLance, owner } = await loadFixture(deployChainLanceFixture);

      await chainLance.connect(owner).setPlatformFee(500); // 5%
      expect(await chainLance.platformFee()).to.equal(500);
    });

    it("Should not allow setting fee above maximum", async function () {
      const { chainLance, owner } = await loadFixture(deployChainLanceFixture);

      await expect(
        chainLance.connect(owner).setPlatformFee(1500) // 15% - above 10% max
      ).to.be.revertedWith("Fee too high");
    });

    it("Should not allow non-owner to set platform fee", async function () {
      const { chainLance, otherAccount } = await loadFixture(deployChainLanceFixture);

      await expect(
        chainLance.connect(otherAccount).setPlatformFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
