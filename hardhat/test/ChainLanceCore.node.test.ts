import { test, describe } from "node:test";
import assert from "node:assert";
import { parseUnits } from "viem";
import { network } from "hardhat";

describe("ChainLanceCore", () => {
  // Fixture to deploy contracts
  async function deployChainLanceFixture() {
    const { viem } = await network.connect() as any;
    const [owner, client, freelancer, agent, otherAccount] = await viem.getWalletClients();

    // Deploy MockPYUSD
    const pyusd = await viem.deployContract("MockPYUSD");

    // Deploy ASIAgentVerifier (with placeholder address)
    const asiVerifier = await viem.deployContract("ASIAgentVerifier", ["0x0000000000000000000000000000000000000000"]);

    // Deploy ChainLanceCore
    const chainLance = await viem.deployContract("ChainLanceCore", [pyusd.address, asiVerifier.address]);

    // Update ASI verifier with correct ChainLance address
    await asiVerifier.write.updateChainLanceCore([chainLance.address]);

    // Deploy ReputationSystem
    const reputation = await viem.deployContract("ReputationSystem");

    // Authorize ChainLance to submit ratings
    await reputation.write.authorizeContract([chainLance.address]);

    // Mint PYUSD tokens for testing (PYUSD uses 6 decimals)
    await pyusd.write.mint([client.account.address, parseUnits("10000", 6)]);
    await pyusd.write.mint([freelancer.account.address, parseUnits("5000", 6)]);

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

  describe("Deployment", () => {
    test("Should set the right owner", async () => {
      const { chainLance, owner } = await deployChainLanceFixture();
      const contractOwner = await chainLance.read.owner();
      assert.strictEqual(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    });

    test("Should set the correct PYUSD token", async () => {
      const { chainLance, pyusd } = await deployChainLanceFixture();
      const tokenAddress = await chainLance.read.pyusdToken();
      assert.strictEqual(tokenAddress.toLowerCase(), pyusd.address.toLowerCase());
    });

    test("Should set the correct ASI agent verifier", async () => {
      const { chainLance, asiVerifier } = await deployChainLanceFixture();
      const verifierAddress = await chainLance.read.asiAgentVerifier();
      assert.strictEqual(verifierAddress.toLowerCase(), asiVerifier.address.toLowerCase());
    });
  });

  describe("Profile Management", () => {
    test("Should allow users to create and update profiles", async () => {
      const { chainLance, client } = await deployChainLanceFixture();

      await chainLance.write.updateProfile([
        "John Doe",
        "Experienced developer",
        "New York",
        ["JavaScript", "React", "Node.js"],
        ["https://github.com/johndoe"],
        85n // $85/hour
      ], { account: client.account });

      const profile = await chainLance.read.profiles([client.account.address]);
      assert.strictEqual(profile[1], "John Doe"); // displayName
      assert.strictEqual(profile[2], "Experienced developer"); // bio
      assert.strictEqual(profile[3], "New York"); // location
      assert.strictEqual(profile[4], 85n); // hourlyRate
    });
  });

  describe("Job Posting", () => {
    test("Should allow clients to post jobs with escrow deposit", async () => {
      const { chainLance, pyusd, client } = await deployChainLanceFixture();

      const budget = parseUnits("1000", 6); // 1000 PYUSD
      const escrowDeposit = budget / 10n; // 10% deposit

      // Approve PYUSD spending
      await pyusd.write.approve([chainLance.address, escrowDeposit], { account: client.account });

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30); // 30 days from now

      await chainLance.write.postJob([
        "Build a DeFi Dashboard",
        "Need a React developer to build a comprehensive DeFi dashboard",
        "Web Development",
        ["React", "TypeScript", "Web3"],
        budget,
        0, // Fixed contract type
        deadline,
        "expert",
        "4-6 weeks",
        4n // number of milestones
      ], { account: client.account });

      const job = await chainLance.read.getJob([1n]);
      assert.strictEqual(job.title, "Build a DeFi Dashboard");
      assert.strictEqual(job.budget, budget);
      assert.strictEqual(job.client.toLowerCase(), client.account.address.toLowerCase());
      assert.strictEqual(job.status, 0); // JobStatus.Open
    });

    test("Should require escrow deposit for job posting", async () => {
      const { chainLance, client } = await deployChainLanceFixture();

      const budget = parseUnits("1000", 6);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);

      // Don't approve PYUSD spending - should fail
      let errorThrown = false;
      try {
        await chainLance.write.postJob([
          "Build a DeFi Dashboard",
          "Description",
          "Web Development",
          ["React"],
          budget,
          0,
          deadline,
          "expert",
          "4-6 weeks",
          4n
        ], { account: client.account });
      } catch (error: any) {
        errorThrown = true;
        // Check if error is related to insufficient allowance or transfer failure
        assert(error.message.includes("insufficient allowance") || error.message.includes("transfer") || error.message.includes("ERC20"));
      }
      assert(errorThrown, "Expected transaction to revert");
    });
  });

  describe("Bidding System", () => {
    test("Should allow freelancers to place bids with stake", async () => {
      const { chainLance, pyusd, client, freelancer } = await deployChainLanceFixture();

      // First, post a job
      const budget = parseUnits("1000", 6);
      const escrowDeposit = budget / 10n;
      await pyusd.write.approve([chainLance.address, escrowDeposit], { account: client.account });
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);
      await chainLance.write.postJob([
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        0,
        deadline,
        "expert",
        "4-6 weeks",
        4n
      ], { account: client.account });

      // Now place a bid
      const proposedAmount = parseUnits("900", 6);
      const stakeAmount = proposedAmount / 10n; // 10% stake

      await pyusd.write.approve([chainLance.address, stakeAmount], { account: freelancer.account });

      await chainLance.write.placeBid([
        1n, // jobId
        proposedAmount,
        "I have 5+ years experience with React and DeFi",
        "4 weeks",
        ["Setup & Planning", "UI Development", "DeFi Integration", "Testing & Deployment"]
      ], { account: freelancer.account });

      const bid = await chainLance.read.getBid([1n]);
      assert.strictEqual(bid.freelancer.toLowerCase(), freelancer.account.address.toLowerCase());
      assert.strictEqual(bid.proposedAmount, proposedAmount);
      assert.strictEqual(bid.stakeAmount, stakeAmount);
      assert.strictEqual(bid.status, 0); // BidStatus.Pending
    });

    test("Should not allow bidding on own jobs", async () => {
      const { chainLance, pyusd, client } = await deployChainLanceFixture();

      // Post a job
      const budget = parseUnits("1000", 6);
      const escrowDeposit = budget / 10n;
      await pyusd.write.approve([chainLance.address, escrowDeposit], { account: client.account });
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);
      await chainLance.write.postJob([
        "Build a DeFi Dashboard",
        "Description",
        "Web Development",
        ["React"],
        budget,
        0,
        deadline,
        "expert",
        "4-6 weeks",
        4n
      ], { account: client.account });

      // Try to bid on own job
      const proposedAmount = parseUnits("900", 6);
      const stakeAmount = proposedAmount / 10n;
      await pyusd.write.approve([chainLance.address, stakeAmount], { account: client.account });

      let errorThrown = false;
      try {
        await chainLance.write.placeBid([
          1n,
          proposedAmount,
          "Bidding on my own job",
          "4 weeks",
          []
        ], { account: client.account });
      } catch (error: any) {
        errorThrown = true;
        assert(error.message.includes("Cannot bid on your own job") || error.message.includes("own job"));
      }
      assert(errorThrown, "Expected transaction to revert");
    });
  });

  describe("Platform Administration", () => {
    test("Should allow owner to set platform fee", async () => {
      const { chainLance, owner } = await deployChainLanceFixture();

      await chainLance.write.setPlatformFee([500n], { account: owner.account }); // 5%
      const fee = await chainLance.read.platformFee();
      assert.strictEqual(fee, 500n);
    });

    test("Should not allow setting fee above maximum", async () => {
      const { chainLance, owner } = await deployChainLanceFixture();

      let errorThrown = false;
      try {
        await chainLance.write.setPlatformFee([1500n], { account: owner.account }); // 15% - above 10% max
      } catch (error: any) {
        errorThrown = true;
        assert(error.message.includes("Fee too high") || error.message.includes("maximum") || error.message.includes("exceed"));
      }
      assert(errorThrown, "Expected transaction to revert");
    });
  });
});
