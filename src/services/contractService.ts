import { Contract } from 'ethers';
import { formatPYUSDAmount, parsePYUSDAmount } from '../contracts/config';

// Types for contract interactions
export interface ContractJob {
  id: number;
  client: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  budget: number;
  contractType: number; // 0: fixed, 1: hourly, 2: milestone
  escrowDeposit: number;
  status: number; // 0: draft, 1: open, 2: in_progress, 3: completed, 4: cancelled, 5: disputed
  deadline: number;
  experienceLevel: string;
  projectDuration: string;
  numberOfMilestones: number;
  bidsCount: number;
  viewsCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContractBid {
  id: number;
  jobId: number;
  freelancer: string;
  proposedAmount: number;
  stakeAmount: number;
  coverLetter: string;
  estimatedTimeline: string;
  proposedMilestones: string[];
  status: number; // 0: pending, 1: accepted, 2: rejected, 3: withdrawn
  createdAt: number;
}

export interface ContractFreelanceContract {
  id: number;
  jobId: number;
  bidId: number;
  client: string;
  freelancer: string;
  totalAmount: number;
  escrowAmount: number;
  contractType: number;
  hourlyRate: number;
  hoursAllocated: number;
  status: number;
  startDate: number;
  endDate: number;
  completionDate: number;
  milestones: Milestone[];
  createdAt: number;
}

export interface Milestone {
  name: string;
  amount: number;
  description: string;
  status: number; // 0: pending, 1: submitted, 2: approved, 3: rejected
  submissionDate: number;
  approvalDeadline: number;
  asiVerified: boolean;
  deliverableHash: string;
}

export class ContractService {
  private chainLanceCore: Contract;
  private pyusdToken: Contract;
  private reputationSystem: Contract;
  // Note: asiAgentVerifier will be used for future AI verification features
  private asiAgentVerifier: Contract;

  constructor(contracts: {
    chainLanceCore: Contract;
    pyusdToken: Contract;
    reputationSystem: Contract;
    asiAgentVerifier: Contract;
  }) {
    this.chainLanceCore = contracts.chainLanceCore;
    this.pyusdToken = contracts.pyusdToken;
    this.reputationSystem = contracts.reputationSystem;
    this.asiAgentVerifier = contracts.asiAgentVerifier;
  }

  // Getter for ASI Agent Verifier (for future AI verification features)
  get asiVerifier(): Contract {
    return this.asiAgentVerifier;
  }

  // Job Management
  async postJob(jobData: {
    title: string;
    description: string;
    category: string;
    requiredSkills: string[];
    budget: number;
    contractType: number;
    deadline: number;
    experienceLevel: string;
    projectDuration: string;
    numberOfMilestones: number;
  }): Promise<string> {
    try {
      // Calculate escrow deposit (15% of budget)
      const escrowAmount = formatPYUSDAmount(jobData.budget * 0.15);
      
      // First approve PYUSD spending
      const approveTx = await this.pyusdToken.approve(
        await this.chainLanceCore.getAddress(),
        escrowAmount
      );
      await approveTx.wait();

      // Post the job
      const tx = await this.chainLanceCore.postJob(
        jobData.title,
        jobData.description,
        jobData.category,
        jobData.requiredSkills,
        formatPYUSDAmount(jobData.budget),
        jobData.contractType,
        jobData.deadline,
        jobData.experienceLevel,
        jobData.projectDuration,
        jobData.numberOfMilestones
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error posting job:', error);
      throw error;
    }
  }

  async getJob(jobId: number): Promise<ContractJob | null> {
    try {
      console.log(`Fetching job ${jobId} from contract...`);
      const job = await this.chainLanceCore.getJob(jobId);
      console.log(`Raw job data for ID ${jobId}:`, job);
      
      // Check if the job actually exists (has a valid client address)
      if (!job.client || job.client === '0x0000000000000000000000000000000000000000') {
        console.log(`Job ${jobId} does not exist (empty client address)`);
        return null;
      }
      
      const parsedJob = this.parseJobFromContract(job);
      console.log(`Parsed job data for ID ${jobId}:`, parsedJob);
      return parsedJob;
    } catch (error) {
      console.error(`Error getting job ${jobId}:`, error);
      return null;
    }
  }

  async getUserJobs(userAddress: string): Promise<number[]> {
    try {
      return await this.chainLanceCore.getUserJobs(userAddress);
    } catch (error) {
      console.error('Error getting user jobs:', error);
      return [];
    }
  }

  async getAllJobs(): Promise<number[]> {
    try {
      console.log('Fetching all jobs from contract...');
      console.log('Contract address:', await this.chainLanceCore.getAddress());
      
      // Use getTotalJobs function (now available in updated contract)
      const totalJobs = await this.chainLanceCore.getTotalJobs();
      const count = Number(totalJobs);
      console.log(`✅ Total jobs from contract: ${count}`);
      
      if (count === 0) {
        console.log('ℹ️ No jobs have been posted to the contract yet');
        return [];
      }
      
      const jobIds: number[] = [];
      for (let i = 1; i <= count; i++) {
        jobIds.push(i);
      }
      console.log('📋 Generated job IDs:', jobIds);
      return jobIds;
    } catch (error) {
      console.error('❌ Error getting all jobs:', error);
      console.error('Contract address:', await this.chainLanceCore.getAddress());
      return [];
    }
  }

  async getOpenJobs(): Promise<ContractJob[]> {
    try {
      const allJobIds = await this.getAllJobs();
      console.log('🔍 Fetching jobs for IDs:', allJobIds);
      
      const jobs = await Promise.all(
        allJobIds.map(async (id) => {
          const job = await this.getJob(id);
          return job;
        })
      );
      
      console.log('📋 All fetched jobs:', jobs.map(j => j ? { id: j.id, status: j.status, title: j.title } : null));
      
      // Filter for open jobs only - check what status values we're getting
      const openJobs = jobs.filter((job): job is ContractJob => {
        if (!job) {
          console.log('❌ Null job found');
          return false;
        }
        
        console.log(`🔍 Job ${job.id} status check: ${job.status} (looking for status 0 = open)`);
        return job.status === 0; // 0 = open status in enum JobStatus { Open, InProgress, Completed, Cancelled, Disputed }
      });
      
      console.log('✅ Filtered open jobs:', openJobs.length);
      return openJobs;
    } catch (error) {
      console.error('Error getting open jobs:', error);
      return [];
    }
  }

  // Bidding
  async placeBid(bidData: {
    jobId: number;
    proposedAmount: number;
    coverLetter: string;
    estimatedTimeline: string;
    proposedMilestones: string[];
  }): Promise<string> {
    try {
      // Calculate stake amount (10% of proposed amount)
      const stakeAmount = formatPYUSDAmount(bidData.proposedAmount * 0.1);
      
      // First approve PYUSD spending for stake
      const approveTx = await this.pyusdToken.approve(
        await this.chainLanceCore.getAddress(),
        stakeAmount
      );
      await approveTx.wait();

      // Place the bid
      const tx = await this.chainLanceCore.placeBid(
        bidData.jobId,
        formatPYUSDAmount(bidData.proposedAmount),
        bidData.coverLetter,
        bidData.estimatedTimeline,
        bidData.proposedMilestones
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    }
  }

  async getBid(bidId: number): Promise<ContractBid | null> {
    try {
      const bid = await this.chainLanceCore.getBid(bidId);
      return this.parseBidFromContract(bid);
    } catch (error) {
      console.error('Error getting bid:', error);
      return null;
    }
  }

  async getJobBids(jobId: number): Promise<number[]> {
    try {
      console.log(`🔍 Fetching bid IDs for job ${jobId}...`);
      const bidIds = await this.chainLanceCore.getJobBids(jobId);
      console.log(`📋 Found ${bidIds.length} bid IDs for job ${jobId}:`, bidIds.map((id: any) => Number(id)));
      return bidIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Error getting job bids:', error);
      return [];
    }
  }

  async getJobBidsWithDetails(jobId: number): Promise<ContractBid[]> {
    try {
      console.log(`🔍 Fetching all bids with details for job ${jobId}...`);
      const bidIds = await this.getJobBids(jobId);
      
      if (bidIds.length === 0) {
        console.log(`ℹ️ No bids found for job ${jobId}`);
        return [];
      }

      const bids = await Promise.all(
        bidIds.map(async (bidId) => {
          console.log(`📋 Fetching bid details for bid ID ${bidId}...`);
          const bid = await this.getBid(bidId);
          return bid;
        })
      );

      const validBids = bids.filter((bid): bid is ContractBid => bid !== null);
      console.log(`✅ Successfully fetched ${validBids.length} bids for job ${jobId}`);
      return validBids;
    } catch (error) {
      console.error(`❌ Error getting job bids with details for job ${jobId}:`, error);
      return [];
    }
  }

  async getUserBids(userAddress: string): Promise<number[]> {
    try {
      return await this.chainLanceCore.getUserBids(userAddress);
    } catch (error) {
      console.error('Error getting user bids:', error);
      return [];
    }
  }

  async acceptBid(bidId: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.acceptBid(bidId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error accepting bid:', error);
      throw error;
    }
  }

  // Contract Management
  async getContract(contractId: number): Promise<ContractFreelanceContract | null> {
    try {
      const contract = await this.chainLanceCore.getContract(contractId);
      return this.parseContractFromContract(contract);
    } catch (error) {
      console.error('Error getting contract:', error);
      return null;
    }
  }

  async getUserContracts(userAddress: string): Promise<number[]> {
    try {
      return await this.chainLanceCore.getUserContracts(userAddress);
    } catch (error) {
      console.error('Error getting user contracts:', error);
      return [];
    }
  }

  async submitMilestone(contractId: number, milestoneIndex: number, deliverableHash: string): Promise<string> {
    try {
      const tx = await this.chainLanceCore.submitMilestone(contractId, milestoneIndex, deliverableHash);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error submitting milestone:', error);
      throw error;
    }
  }

  async approveMilestone(contractId: number, milestoneIndex: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.approveMilestone(contractId, milestoneIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error approving milestone:', error);
      throw error;
    }
  }

  async autoReleaseMilestone(contractId: number, milestoneIndex: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.autoReleaseMilestone(contractId, milestoneIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error auto-releasing milestone:', error);
      throw error;
    }
  }

  // Token Operations
  async getPYUSDBalance(address: string): Promise<number> {
    try {
      const balance = await this.pyusdToken.balanceOf(address);
      return parsePYUSDAmount(balance);
    } catch (error) {
      console.error('Error getting PYUSD balance:', error);
      return 0;
    }
  }

  async getPYUSDAllowance(owner: string, spender: string): Promise<number> {
    try {
      const allowance = await this.pyusdToken.allowance(owner, spender);
      return parsePYUSDAmount(allowance);
    } catch (error) {
      console.error('Error getting PYUSD allowance:', error);
      return 0;
    }
  }

  async approvePYUSD(spender: string, amount: number): Promise<string> {
    try {
      const tx = await this.pyusdToken.approve(spender, formatPYUSDAmount(amount));
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error approving PYUSD:', error);
      throw error;
    }
  }

  // For testing purposes - faucet function
  async requestPYUSDFromFaucet(address: string): Promise<string> {
    try {
      const tx = await this.pyusdToken.faucet(address);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error requesting PYUSD from faucet:', error);
      throw error;
    }
  }

  // Reputation System
  async submitRating(ratingData: {
    contractId: number;
    rater: string;
    rated: string;
    overallRating: number;
    qualityRating: number;
    communicationRating: number;
    timelinessRating: number;
    reviewText: string;
    wouldRecommend: boolean;
    isPublic: boolean;
  }): Promise<string> {
    try {
      const tx = await this.reputationSystem.submitRating(
        ratingData.contractId,
        ratingData.rater,
        ratingData.rated,
        ratingData.overallRating,
        ratingData.qualityRating,
        ratingData.communicationRating,
        ratingData.timelinessRating,
        ratingData.reviewText,
        ratingData.wouldRecommend,
        ratingData.isPublic
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  async getReputationScore(userAddress: string) {
    try {
      return await this.reputationSystem.getReputationScore(userAddress);
    } catch (error) {
      console.error('Error getting reputation score:', error);
      return null;
    }
  }

  async getPublicRatings(userAddress: string) {
    try {
      return await this.reputationSystem.getPublicRatings(userAddress);
    } catch (error) {
      console.error('Error getting public ratings:', error);
      return [];
    }
  }

  // Helper methods to parse contract data
  private parseJobFromContract(jobData: any): ContractJob {
    return {
      id: Number(jobData.id),
      client: jobData.client,
      title: jobData.title,
      description: jobData.description,
      category: jobData.category,
      requiredSkills: jobData.requiredSkills,
      budget: parsePYUSDAmount(jobData.budget),
      contractType: Number(jobData.contractType),
      escrowDeposit: parsePYUSDAmount(jobData.escrowDeposit),
      status: Number(jobData.status),
      deadline: Number(jobData.deadline),
      experienceLevel: jobData.experienceLevel,
      projectDuration: jobData.projectDuration,
      numberOfMilestones: Number(jobData.numberOfMilestones),
      bidsCount: Number(jobData.bidsCount),
      viewsCount: Number(jobData.viewsCount),
      createdAt: Number(jobData.createdAt),
      updatedAt: Number(jobData.updatedAt),
    };
  }

  private parseBidFromContract(bidData: any): ContractBid {
    return {
      id: Number(bidData.id),
      jobId: Number(bidData.jobId),
      freelancer: bidData.freelancer,
      proposedAmount: parsePYUSDAmount(bidData.proposedAmount),
      stakeAmount: parsePYUSDAmount(bidData.stakeAmount),
      coverLetter: bidData.coverLetter,
      estimatedTimeline: bidData.estimatedTimeline,
      proposedMilestones: bidData.proposedMilestones,
      status: Number(bidData.status),
      createdAt: Number(bidData.createdAt),
    };
  }

  private parseContractFromContract(contractData: any): ContractFreelanceContract {
    return {
      id: Number(contractData.id),
      jobId: Number(contractData.jobId),
      bidId: Number(contractData.bidId),
      client: contractData.client,
      freelancer: contractData.freelancer,
      totalAmount: parsePYUSDAmount(contractData.totalAmount),
      escrowAmount: parsePYUSDAmount(contractData.escrowAmount),
      contractType: Number(contractData.contractType),
      hourlyRate: parsePYUSDAmount(contractData.hourlyRate),
      hoursAllocated: Number(contractData.hoursAllocated),
      status: Number(contractData.status),
      startDate: Number(contractData.startDate),
      endDate: Number(contractData.endDate),
      completionDate: Number(contractData.completionDate),
      milestones: contractData.milestones.map((m: any) => ({
        name: m.name,
        amount: parsePYUSDAmount(m.amount),
        description: m.description,
        status: Number(m.status),
        submissionDate: Number(m.submissionDate),
        approvalDeadline: Number(m.approvalDeadline),
        asiVerified: m.asiVerified,
        deliverableHash: m.deliverableHash,
      })),
      createdAt: Number(contractData.createdAt),
    };
  }
}
