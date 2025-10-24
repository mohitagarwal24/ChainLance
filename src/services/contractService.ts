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
      // Calculate escrow deposit (20% of budget)
      const escrowAmount = formatPYUSDAmount(jobData.budget * 0.2);

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

      // First, let's test if the contract is responsive by calling a simple function
      try {
        const contractAddress = await this.chainLanceCore.getAddress();
        console.log('✅ Contract is responsive, address:', contractAddress);
      } catch (addressError) {
        console.error('❌ Contract not responsive:', addressError);
        return [];
      }

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
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        data: (error as any).data
      });

      // Try to get contract address for debugging
      try {
        const address = await this.chainLanceCore.getAddress();
        console.error('Contract address:', address);
      } catch (addrError) {
        console.error('Cannot get contract address:', addrError);
      }

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
      // Calculate stake amount (100% of proposed amount - full bid staking)
      const stakeAmount = formatPYUSDAmount(bidData.proposedAmount);

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
    } catch (error: any) {
      console.error('Error placing bid:', error);

      // Handle specific error types
      if (error.code === 4100) {
        throw new Error('Transaction was rejected by user or MetaMask. Please try again and approve the transaction.');
      } else if (error.code === 4001) {
        throw new Error('Transaction was rejected by user.');
      } else if (error.code === -32603) {
        throw new Error('Internal error. Please check your network connection and try again.');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient PYUSD balance to place bid. You need the full bid amount as stake.');
      } else if (error.message?.includes('network')) {
        throw new Error('Please make sure you are connected to Sepolia testnet.');
      }

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
      console.log(`🔍 Fetching bids for user: ${userAddress}`);
      const result = await this.chainLanceCore.getUserBids(userAddress);
      console.log(`✅ User bids result:`, result);
      return result;
    } catch (error) {
      console.error('Error getting user bids:', error);
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        data: (error as any).data
      });
      // Return empty array if no bids found (this is normal for new users)
      return [];
    }
  }

  async acceptBid(bidId: number, jobBudget: number): Promise<string> {
    try {
      // Calculate remaining escrow needed (80% of job budget)
      // Client already deposited 20% when posting job, now needs 80% more
      const remainingEscrow = formatPYUSDAmount(jobBudget * 0.8);

      console.log(`💰 Approving ${jobBudget * 0.8} PYUSD for remaining escrow`);

      // First approve PYUSD spending for remaining escrow
      const approveTx = await this.pyusdToken.approve(
        await this.chainLanceCore.getAddress(),
        remainingEscrow
      );
      await approveTx.wait();
      console.log('✅ PYUSD approval completed');

      // Accept the bid (contract will pull the approved PYUSD)
      console.log(`🤝 Accepting bid ${bidId}`);
      const tx = await this.chainLanceCore.acceptBid(bidId);
      const receipt = await tx.wait();
      console.log('✅ Bid accepted successfully');

      return receipt.hash;
    } catch (error: any) {
      console.error('Error accepting bid:', error);

      // Handle specific error types
      if (error.code === 4100) {
        throw new Error('Transaction was rejected by user or MetaMask. Please try again and approve the transaction.');
      } else if (error.code === 4001) {
        throw new Error('Transaction was rejected by user.');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient PYUSD balance to fund the contract. You need 80% of the job budget.');
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Smart contract rejected the transaction. Please check that the bid is still valid and you have sufficient balance.');
      } else if (error.message?.includes('network')) {
        throw new Error('Please make sure you are connected to Sepolia testnet.');
      }

      throw error;
    }
  }

  async rejectBid(bidId: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.rejectBid(bidId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error rejecting bid:', error);
      throw error;
    }
  }

  // Contract Management
  async getContract(contractId: number): Promise<ContractFreelanceContract | null> {
    try {
      console.log(`🔍 Fetching contract details for ID: ${contractId}`);
      const contract = await this.chainLanceCore.getContract(contractId);
      console.log(`📄 Raw contract data for ID ${contractId}:`, contract);
      
      if (!contract) {
        console.log(`❌ Contract ${contractId} returned null/undefined`);
        return null;
      }
      
      const parsed = this.parseContractFromContract(contract);
      console.log(`✅ Parsed contract data for ID ${contractId}:`, parsed);
      return parsed;
    } catch (error) {
      console.error(`❌ Error getting contract ${contractId}:`, error);
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        data: (error as any).data
      });
      return null;
    }
  }

  async getUserContracts(userAddress: string): Promise<number[]> {
    try {
      console.log(`🔍 Fetching contracts for user: ${userAddress}`);
      const result = await this.chainLanceCore.getUserContracts(userAddress);
      console.log(`✅ User contracts result:`, result);
      return result;
    } catch (error) {
      console.error('Error getting user contracts:', error);
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        data: (error as any).data
      });
      // Return empty array if no contracts found (this is normal for new users)
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

  async submitWork(submissionData: any): Promise<string> {
    try {
      console.log('🚀 Submitting work for ASI agent verification:', submissionData);
      
      // In a real implementation, this would:
      // 1. Upload deliverables to IPFS
      // 2. Create a hash of the submission
      // 3. Submit to the ASI agent network
      // 4. Trigger the verification process
      
      // For now, we'll simulate the process
      const deliverableHash = this.createSubmissionHash(submissionData);
      
      // Submit milestone to smart contract
      const tx = await this.chainLanceCore.submitMilestone(
        submissionData.contract_id,
        0, // First milestone
        deliverableHash
      );
      
      const receipt = await tx.wait();
      console.log('✅ Work submission transaction confirmed:', receipt.hash);
      
      // Trigger ASI agent verification (simulated)
      await this.triggerASIAgentVerification(submissionData);
      
      return receipt.hash;
      
    } catch (error) {
      console.error('Error submitting work:', error);
      throw error;
    }
  }

  private createSubmissionHash(submissionData: any): string {
    // Create a hash of the submission data
    const dataString = JSON.stringify({
      work_id: submissionData.work_id,
      deliverables: submissionData.deliverables,
      description: submissionData.description,
      timestamp: submissionData.submission_timestamp
    });
    
    // Simple hash (in production, use proper cryptographic hash)
    return `0x${Buffer.from(dataString).toString('hex').slice(0, 64)}`;
  }

  private async triggerASIAgentVerification(submissionData: any): Promise<void> {
    try {
      console.log('🤖 Triggering ASI agent verification...');
      
      // In a real implementation, this would send a message to the ASI agent network
      // For now, we'll simulate the process with a timeout
      
      setTimeout(async () => {
        console.log('🔍 ASI agents are reviewing the work...');
        
        // Simulate agent verification process (3-5 minutes in real scenario)
        setTimeout(async () => {
          const approved = Math.random() > 0.3; // 70% approval rate for demo
          
          if (approved) {
            console.log('✅ ASI agents approved the work! Triggering 20% payment...');
            await this.processAgentApprovalPayment(submissionData.contract_id, 20);
          } else {
            console.log('❌ ASI agents requested revisions');
          }
        }, 10000); // 10 seconds for demo (would be longer in reality)
        
      }, 2000); // 2 seconds initial delay
      
    } catch (error) {
      console.error('Error triggering ASI agent verification:', error);
    }
  }

  private async processAgentApprovalPayment(contractId: number, percentage: number): Promise<void> {
    try {
      console.log(`💰 Processing ${percentage}% payment for contract ${contractId}`);
      
      // In a real implementation, this would call a smart contract function
      // to release the specified percentage of funds to the freelancer
      
      // For now, we'll just log the action
      console.log(`✅ ${percentage}% payment released to freelancer`);
      
    } catch (error) {
      console.error('Error processing agent approval payment:', error);
    }
  }

  async approveWork(contractId: number, milestoneIndex: number = 0): Promise<string> {
    try {
      console.log(`✅ Client approving work for contract ${contractId}`);
      
      const tx = await this.chainLanceCore.approveMilestone(contractId, milestoneIndex);
      const receipt = await tx.wait();
      
      console.log('✅ Work approved - full payment released');
      return receipt.hash;
      
    } catch (error) {
      console.error('Error approving work:', error);
      throw error;
    }
  }

  async requestRevisions(contractId: number, revisionNotes: string): Promise<string> {
    try {
      console.log(`🔄 Requesting revisions for contract ${contractId}`);
      
      // In a real implementation, this would update the contract state
      // and notify the freelancer about required changes
      
      // For now, we'll simulate the process
      console.log('📝 Revision request sent to freelancer');
      
      return 'revision_request_' + Date.now();
      
    } catch (error) {
      console.error('Error requesting revisions:', error);
      throw error;
    }
  }

  async revokeContract(contractId: number): Promise<string> {
    try {
      console.log(`❌ Client revoking contract ${contractId}`);
      
      // In a real implementation, this would:
      // 1. Check if revocation is allowed (early stage, etc.)
      // 2. Calculate refund amounts (20% to freelancer, 80% to client)
      // 3. Execute the refund transactions
      
      console.log('💰 Processing refunds: 20% to freelancer, 80% to client');
      
      return 'revocation_' + Date.now();
      
    } catch (error) {
      console.error('Error revoking contract:', error);
      throw error;
    }
  }

  async removeJobPosting(jobId: number): Promise<string> {
    try {
      console.log(`🗑️ Removing job posting ${jobId}`);
      
      // Check if job has active contracts
      const hasContracts = false; // Would check from smart contract
      
      if (hasContracts) {
        // Job has contracts - partial refund
        console.log('💰 Job has contracts - processing partial refunds');
        return 'partial_refund_' + Date.now();
      } else {
        // No contracts - full refund
        console.log('💰 No contracts found - processing full refund');
        return 'full_refund_' + Date.now();
      }
      
    } catch (error) {
      console.error('Error removing job posting:', error);
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
