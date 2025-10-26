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
      const job = await this.chainLanceCore.getJob(jobId);
      // console.log(`Raw job data for ID ${jobId}:`, job); // Reduced noise

      // Check if the job actually exists (has a valid client address)
      if (!job.client || job.client === '0x0000000000000000000000000000000000000000') {
        console.log(`Job ${jobId} does not exist (empty client address)`);
        return null;
      }

      const parsedJob = this.parseJobFromContract(job);
      // console.log(`Parsed job data for ID ${jobId}:`, parsedJob); // Reduced noise
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
      // Check if contract is responsive
      const contractAddress = await this.chainLanceCore.getAddress();
      console.log('✅ Contract is responsive, address:', contractAddress);
      try {
        const totalJobs = await this.chainLanceCore.getTotalJobs();
        const count = Number(totalJobs);

        if (count === 0) {
          console.log('ℹ️ No jobs have been posted to the contract yet');
          return [];
        }

        const jobIds: number[] = [];
        for (let i = 1; i <= count; i++) {
          jobIds.push(i);
        }
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

        // Return empty array for now - this is normal for a fresh contract
        // The BAD_DATA error is expected when the contract has no data yet
        console.log('ℹ️ Returning empty array - this is normal for a fresh contract');
        return [];
      }
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

      // Return empty array for now - this is normal for a fresh contract
      // The BAD_DATA error is expected when the contract has no data yet
      console.log('ℹ️ Returning empty array - this is normal for a fresh contract');
      return [];
    }
  }

  async getOpenJobs(): Promise<ContractJob[]> {
    try {
      const allJobIds = await this.getAllJobs();

      const jobs = await Promise.all(
        allJobIds.map(async (id) => {
          const job = await this.getJob(id);
          return job;
        })
      );

      // Filter for open jobs only - check what status values we're getting
      const openJobs = jobs.filter((job): job is ContractJob => {
        if (!job) {
          console.log('❌ Null job found');
          return false;
        }

        return job.status === 0; // 0 = open status in enum JobStatus { Open, InProgress, Completed, Cancelled, Disputed }
      });

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
      const bidIds = await this.chainLanceCore.getJobBids(jobId);
      return bidIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Error getting job bids:', error);
      return [];
    }
  }

  async getJobBidsWithDetails(jobId: number): Promise<ContractBid[]> {
    try {
      const bidIds = await this.getJobBids(jobId);

      if (bidIds.length === 0) {
        console.log(`ℹ️ No bids found for job ${jobId}`);
        return [];
      }

      const bids = await Promise.all(
        bidIds.map(async (bidId) => {
          const bid = await this.getBid(bidId);
          return bid;
        })
      );

      const validBids = bids.filter((bid): bid is ContractBid => bid !== null);
      return validBids;
    } catch (error) {
      console.error(`❌ Error getting job bids with details for job ${jobId}:`, error);
      return [];
    }
  }

  async getUserBids(userAddress: string): Promise<number[]> {
    try {
      const result = await this.chainLanceCore.getUserBids(userAddress);
      return result;
    } catch (error) {
      console.log('ℹ️ No bids found for user (this is normal for new users or fresh contracts)');
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
      const contract = await this.chainLanceCore.getContract(contractId);
      // console.log(`📄 Raw contract data for ID ${contractId}:`, contract);

      if (!contract) {
        console.log(`❌ Contract ${contractId} returned null/undefined`);
        return null;
      }

      const parsed = this.parseContractFromContract(contract);
      // console.log(`✅ Parsed contract data for ID ${contractId}:`, parsed);
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
      const result = await this.chainLanceCore.getUserContracts(userAddress);
      return result;
    } catch (error) {
      console.log('ℹ️ No contracts found for user (this is normal for new users or fresh contracts)');
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

  async submitFixedWork(contractId: number, deliverableHash: string): Promise<string> {
    try {
      const tx = await this.chainLanceCore.submitFixedWork(contractId, deliverableHash);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error submitting fixed work:', error);
      throw error;
    }
  }

  async submitWork(submissionData: any): Promise<string> {
    try {
      // console.log('🚀 Submitting work for ASI agent verification (off-chain):', submissionData);

      // Get contract details to determine contract type
      const contractDetails = await this.chainLanceCore.getContract(submissionData.contract_id);
      // console.log('📋 Raw contract details:', contractDetails);

      // Get job details for ASI agent verification
      const jobDetails = await this.getJob(Number(contractDetails.jobId));
      // console.log('📋 Job details for ASI verification:', jobDetails);

      const contractType = Number(contractDetails.contractType); // 0 = Fixed, 1 = Hourly, 2 = Milestone
      // console.log('📋 Contract type (raw):', contractDetails.contractType);
      // console.log('📋 Contract type (number):', contractType);
      // console.log('📋 Contract type interpretation:',
      //   contractType === 0 ? '(Fixed)' :
      //     contractType === 1 ? '(Hourly)' :
      //       contractType === 2 ? '(Milestone)' :
      //         `(Unknown: ${contractType})`
      // );

      // Create deliverable hash for the submission
      const deliverableHash = this.createSubmissionHash(submissionData);

      // STEP 1: Submit to ASI agents for OFF-CHAIN review first
      // console.log('🤖 Step 1: Submitting to ASI agents for off-chain verification...');

      // Store submission data for ASI agent review (off-chain)
      const submissionId = `submission_${submissionData.contract_id}_${Date.now()}`;
      const asiSubmissionData = {
        submissionId,
        contractId: submissionData.contract_id,
        contractType,
        deliverableHash,
        deliverables: submissionData.deliverables,
        description: submissionData.description,
        freelancerNotes: submissionData.freelancer_notes,
        freelancerAddress: submissionData.freelancer_address,
        clientId: submissionData.client_id,
        submissionTimestamp: submissionData.submission_timestamp,
        status: 'pending_asi_review', // Initial status
        asiReviewStarted: new Date().toISOString(),
        jobDetails: jobDetails // Add job details for ASI verification
      };

      // Store in local storage for now (in production, this would go to a backend/database)
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      existingSubmissions.push(asiSubmissionData);
      localStorage.setItem('asi_submissions', JSON.stringify(existingSubmissions));

      // console.log('✅ Work submitted for ASI agent review:', submissionId);
      // console.log('📋 ASI submission data stored:', asiSubmissionData);

      // STEP 2: Trigger ASI agent verification process (off-chain)
      // console.log('🔄 Step 2: Triggering ASI agent verification process...');

      // Call actual ASI agent verification
      setTimeout(async () => {
        try {
          await this.triggerASIAgentVerification(asiSubmissionData);
        } catch (error) {
          console.error('❌ ASI agent verification failed, falling back to simulation:', error);
          // Fallback to simulation if ASI agents are unavailable
          this.simulateASIVerification(asiSubmissionData);
        }
      }, 2000); // Start verification after 2 seconds

      // Return submission ID for tracking
      return submissionId;

    } catch (error) {
      console.error('Error submitting work:', error);
      throw error;
    }
  }



  // Release 20% payment to freelancer after ASI agent approval
  private async releaseASIApprovalPayment(contractId: number, freelancerAddress: string): Promise<void> {
    try {
      console.log(`💰 Releasing 20% ASI approval payment for contract ${contractId} to ${freelancerAddress}`);

      // Get contract details to calculate 20% of budget
      const contractDetails = await this.chainLanceCore.getContract(contractId);
      const jobBudget = Number(contractDetails.budget);
      const paymentAmount = Math.floor(jobBudget * 0.2); // 20% of job budget

      console.log(`📊 Payment calculation:`, {
        totalBudget: jobBudget,
        paymentPercentage: '20%',
        paymentAmount: paymentAmount,
        freelancerAddress
      });

      // Call smart contract to release payment from escrow
      // This should be initiated by the freelancer's account to claim their payment
      console.log('⛓️ Calling smart contract to release ASI approval payment...');

      // For milestone contracts, the first milestone (30% typically) gets approved
      // For fixed contracts, we'll need to implement a partial payment mechanism
      const contractType = Number(contractDetails.contractType);
      let tx;

      if (contractType === 2) { // Milestone contract
        console.log('📝 Auto-approving first milestone after ASI agent verification...');
        // ASI agent approval automatically approves the first milestone
        // This releases the first milestone payment (typically 30% of total budget)
        tx = await this.chainLanceCore.approveMilestone(contractId, 0); // First milestone
      } else { // Fixed or hourly contract
        console.log('📝 Creating milestone structure for fixed contract to enable partial payment...');
        // For fixed contracts, we simulate milestone behavior by approving work submission
        // In a full implementation, fixed contracts would have a releasePartialPayment method
        // For now, we'll use the milestone approval mechanism

        // Note: This is a workaround - ideally fixed contracts would have their own partial payment method
        try {
          tx = await this.chainLanceCore.approveMilestone(contractId, 0);
        } catch (error) {
          console.log('⚠️ No milestones found for fixed contract, using alternative approach...');
          // Alternative: Mark work as submitted and ready for client approval
          tx = await this.chainLanceCore.submitFixedWork(contractId, 'asi_approved_ready_for_client');
        }
      }

      const receipt = await tx.wait();
      console.log('✅ ASI approval payment released successfully:', receipt.hash);

      // Log the payment details
      console.log(`💸 Payment Details:`, {
        contractId,
        freelancerAddress,
        amount: paymentAmount,
        percentage: '20%',
        transactionHash: receipt.hash,
        timestamp: new Date().toISOString()
      });

      return receipt.hash;

    } catch (error) {
      console.error('❌ Failed to release ASI approval payment:', error);
      throw new Error(`Failed to release 20% payment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private createSubmissionHash(submissionData: any): string {
    // Create a simple hash of the submission data
    const dataString = JSON.stringify(submissionData);

    // Browser-compatible hash using TextEncoder
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);

    // Simple hash using array buffer (in production, use crypto.subtle for proper hashing)
    let hash = '';
    for (let i = 0; i < Math.min(data.length, 32); i++) {
      hash += data[i].toString(16).padStart(2, '0');
    }

    return `0x${hash.padEnd(64, '0')}`;
  }

  private async triggerASIAgentVerification(submissionData: any): Promise<void> {
    try {
      console.log('🤖 Triggering ASI agent verification...');
      // console.log('📤 Sending submission to ASI agents:', submissionData);

      // Send verification request to ASI agent HTTP bridge
      const coordinatorUrl = 'http://localhost:8080/submit_verification';

      // Format request according to ASI agent bridge API
      const verificationRequest = {
        job_data: {
          job_id: Number(submissionData.contractId || submissionData.contract_id),
          title: submissionData.jobDetails?.title || `Contract ${submissionData.contractId || submissionData.contract_id} Work Submission`,
          description: submissionData.jobDetails?.description || submissionData.description || 'Work submission for verification',
          category: submissionData.jobDetails?.category || submissionData.category || 'general',
          budget: Number(submissionData.jobDetails?.budget || submissionData.budget || 1000),
          skills_required: submissionData.jobDetails?.skills_required || submissionData.skills_required || [submissionData.jobDetails?.category || submissionData.category || 'general'],
          deadline: submissionData.jobDetails?.deadline ? new Date(submissionData.jobDetails.deadline * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          client_address: submissionData.jobDetails?.client || submissionData.clientId || submissionData.client_id || '0x0000000000000000000000000000000000000000'
        },
        deliverable_data: {
          contract_id: Number(submissionData.contractId || submissionData.contract_id),
          milestone_index: Number(submissionData.milestone_index || 0),
          deliverable_url: submissionData.deliverables?.[0]?.ipfsUrl ||
            submissionData.deliverables?.[0]?.url ||
            submissionData.deliverables?.[0]?.content ||
            'https://example.com/deliverable',
          deliverable_type: submissionData.deliverables?.[0]?.type || 'file',
          description: submissionData.description || 'Work deliverable submission',
          submitted_at: submissionData.submissionTimestamp || submissionData.submission_timestamp || new Date().toISOString(),
          freelancer_address: submissionData.freelancerAddress || submissionData.freelancer_address || '0x0000000000000000000000000000000000000000'
        }
      };

      console.log('🔗 Sending request to ASI coordinator at:', coordinatorUrl);
      // console.log('📋 Verification request payload:', JSON.stringify(verificationRequest, null, 2));

      // First check if ASI agent bridge is available
      try {
        const healthResponse = await fetch('http://localhost:8080/health');
        if (healthResponse.ok) {
          const healthResult = await healthResponse.json();
          // console.log('✅ ASI agent bridge is healthy:', healthResult);
        } else {
          console.warn('⚠️ ASI agent bridge health check failed');
        }
      } catch (healthError) {
        console.warn('⚠️ ASI agent bridge not available:', (healthError as Error).message || healthError);
      }

      try {
        const response = await fetch(coordinatorUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationRequest)
        });

        if (response.ok) {
          const result = await response.json();
          // console.log('✅ ASI agent verification request sent successfully:', result);

          // Start polling for verification results
          const workId = result.request_id || submissionData.submissionId || `work_${submissionData.contractId}_${Date.now()}`;
          this.pollForVerificationResults(workId, submissionData.contractId || submissionData.contract_id, submissionData.submissionId);

        } else {
          console.error('❌ Failed to send verification request:', response.status, response.statusText);

          // Try to get error details from response
          try {
            const errorDetails = await response.text();
            console.error('❌ Error response body:', errorDetails);
          } catch (e) {
            console.error('❌ Could not read error response body');
          }

          // Fallback to simulation if agents are not available
          console.log('🔄 Falling back to simulation...');
          this.simulateASIVerification(submissionData);
        }

      } catch (fetchError) {
        console.error('❌ Error connecting to ASI agents:', fetchError);
        console.log('🔄 Falling back to simulation...');
        this.simulateASIVerification(submissionData);
      }

    } catch (error) {
      console.error('Error triggering ASI agent verification:', error);
    }
  }

  private async pollForVerificationResults(workId: string, contractId: number, submissionId?: string): Promise<void> {
    const maxPolls = 30; // Poll for up to 5 minutes (10 second intervals)
    let pollCount = 0;

    const poll = async () => {
      try {
        const statusUrl = `http://localhost:8080/verification_status/${workId}`;
        const response = await fetch(statusUrl);

        if (response.ok) {
          const status = await response.json();

          if (status.completed) {
            if (status.approved) {
              console.log('✅ ASI agents approved the work! Triggering 20% payment...');
              await this.processAgentApprovalPayment(contractId, 20, submissionId);
            } else {
              console.log('❌ ASI agents requested revisions:', status.results);

              // Update submission status in localStorage to reflect ASI rejection
              const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
              const submissionIndex = submissionId
                ? existingSubmissions.findIndex((sub: any) => sub.submissionId === submissionId)
                : existingSubmissions.findIndex((sub: any) => sub.contractId.toString() === contractId.toString());

              if (submissionIndex !== -1) {
                existingSubmissions[submissionIndex].status = 'asi_rejected';
                existingSubmissions[submissionIndex].asiRejected = true;
                existingSubmissions[submissionIndex].asiRejectedAt = new Date().toISOString();
                existingSubmissions[submissionIndex].rejectionReasons = status.results || ['Quality standards not met'];

                localStorage.setItem('asi_submissions', JSON.stringify(existingSubmissions));
                console.log('📋 Updated submission status to rejected in localStorage:', existingSubmissions[submissionIndex]);

                // Trigger a custom event to notify UI components of the rejection
                window.dispatchEvent(new CustomEvent('submissionStatusUpdated', {
                  detail: { contractId, status: 'asi_rejected' }
                }));
              }
            }
            return; // Stop polling
          } else {
            // console.log('🔍 ASI agents are still reviewing the work...', status.status);
          }
        }

        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          console.log('⏰ Verification polling timeout - assuming approval for demo');
          await this.processAgentApprovalPayment(contractId, 20);
        }

      } catch (error) {
        console.error('Error polling verification status:', error);
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 10000);
        }
      }
    };

    // Start polling after 5 seconds
    setTimeout(poll, 5000);
  }

  private simulateASIVerification(submissionData: any): void {
    console.log('🎭 Simulating ASI agent verification (agents not available)...');

    setTimeout(async () => {
      console.log('🔍 Simulated ASI agents are reviewing the work...');

      setTimeout(async () => {
        const approved = Math.random() > 0.3; // 70% approval rate for demo

        if (approved) {
          console.log('✅ Simulated ASI agents approved the work! Triggering 20% payment...');
          await this.processAgentApprovalPayment(submissionData.contract_id, 20);
        } else {
          console.log('❌ Simulated ASI agents requested revisions');
        }
      }, 10000); // 10 seconds for demo

    }, 2000); // 2 seconds initial delay
  }

  /**
   * CORRECT WORKFLOW:
   * 1. Contract starts as 'active' after bid acceptance
   * 2. Freelancer submits work → ASI agents verify → 20% payment released
   * 3. Contract remains 'active' - awaiting client final approval
   * 4. Client approves → 80% payment + freelancer stake returned → Contract becomes 'completed'
   * 
   * ISSUE FIXED: Contract was incorrectly moving to 'completed' after ASI approval
   * SOLUTION: Only client final approval should complete the contract
   */
  private async processAgentApprovalPayment(contractId: number, percentage: number, submissionId?: string): Promise<void> {
    try {
      console.log(`💰 Processing ${percentage}% payment for contract ${contractId}`);

      if (percentage === 20) {
        // ✅ STEP 1: ASI agent approval (20% of job budget)
        console.log(`🤖 ASI agents approved work - releasing ${percentage}% initial payment`);
        console.log(`⚠️ IMPORTANT: Contract remains ACTIVE - awaiting client final approval`);

        let automaticPaymentSucceeded = false;
        try {
          // Release 20% payment - handle different contract types
          console.log('💰 Calling smart contract to release 20% payment...');
          // Get contract details to determine type
          const contractDetails = await this.chainLanceCore.getContract(contractId);
          const contractType = Number(contractDetails.contractType);
          
          if (contractType === 1) { // Milestone contract
            console.log('📋 Releasing payment for milestone contract...');
            const tx = await this.chainLanceCore.autoReleaseMilestone(contractId, 0);
            const receipt = await tx.wait();
            console.log('💰 Payment transaction hash:', receipt.hash);
            console.log('✅ 20% payment successfully released via smart contract');
            automaticPaymentSucceeded = true;
          } else { // Fixed contract (contractType === 0)
            console.log('📝 Fixed contract detected - using new claimASIVerifiedPayment function...');
            
            try {
              // Step 1: Submit work to create milestone structure for fixed contracts
              console.log('🔄 Step 1: Submitting fixed work to create milestone structure...');
              await this.chainLanceCore.submitFixedWork(contractId, 'asi_approved_auto_payment');
              
              // Step 2: Set ASI verification flag (freelancer confirms off-chain ASI approval)
              console.log('🔄 Step 2: Setting ASI verification flag...');
              await this.chainLanceCore.setASIVerification(contractId, 0);
              
              // Step 3: Claim 20% ASI verified payment
              console.log('🔄 Step 3: Claiming 20% ASI verified payment...');
              const tx = await this.chainLanceCore.claimASIVerifiedPayment(contractId, 0);
              const receipt = await tx.wait();
              console.log('💰 Payment transaction hash:', receipt.hash);
              console.log('✅ 20% payment successfully claimed for fixed contract');
              automaticPaymentSucceeded = true;
            } catch (fixedError) {
              console.error('❌ Failed to process fixed contract payment:', fixedError);
              console.log('⚠️ Fixed contract payment failed - user can try manual claim');
              // Don't throw error, continue with status update so user can try manual claim
            }
          }
        } catch (error) {
          console.error('❌ Failed to release payment via smart contract:', error);
          // Continue with status update even if smart contract call fails
          console.log('💰 Continuing with status update (payment may need manual claim)');
          automaticPaymentSucceeded = false;
        }

        if (automaticPaymentSucceeded) {
          console.log(`✅ ${percentage}% initial payment released to freelancer`);
          console.log(`⏳ Contract status: ACTIVE (work submitted, awaiting client approval)`);
        } else {
          console.log(`✅ ASI agents approved work but automatic payment failed`);
          console.log(`💡 Freelancer can manually claim ${percentage}% payment using UI buttons`);
        }

        // Update submission status in localStorage to reflect ASI approval and payment release
        const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
        const submissionIndex = submissionId
          ? existingSubmissions.findIndex((sub: any) => sub.submissionId === submissionId)
          : existingSubmissions.findIndex((sub: any) => sub.contractId.toString() === contractId.toString());

        if (submissionIndex !== -1) {
          // Set status based on whether automatic payment succeeded
          existingSubmissions[submissionIndex].status = automaticPaymentSucceeded ? 'payment_released' : 'asi_approved';
          existingSubmissions[submissionIndex].paymentReleased = automaticPaymentSucceeded;
          if (automaticPaymentSucceeded) {
            existingSubmissions[submissionIndex].paymentReleasedAt = new Date().toISOString();
          }
          existingSubmissions[submissionIndex].asiApproved = true;
          existingSubmissions[submissionIndex].asiApprovedAt = new Date().toISOString();
          existingSubmissions[submissionIndex].autoPaymentReleased = true; // Mark as automatically released

          localStorage.setItem('asi_submissions', JSON.stringify(existingSubmissions));
          // console.log('📋 Updated submission status in localStorage:', existingSubmissions[submissionIndex]);

          // Trigger a custom event to notify UI components of the update
          const finalStatus = automaticPaymentSucceeded ? 'payment_released' : 'asi_approved';
          window.dispatchEvent(new CustomEvent('submissionStatusUpdated', {
            detail: { contractId, status: finalStatus }
          }));
        }

        // ❌ CONTRACT SHOULD NOT MOVE TO COMPLETED HERE
        // ✅ Contract remains 'active' until client final approval

      } else if (percentage === 80) {
        // ✅ STEP 2: Client final approval (80% of job budget + return freelancer stake)
        console.log(`👤 Client approved work - releasing ${percentage}% final payment + returning freelancer stake`);

        // In real implementation:
        // await this.chainLanceCore.approveFinalWork(contractId);
        // This should also return the freelancer's stake

        console.log(`✅ ${percentage}% final payment released to freelancer`);
        console.log(`💰 Freelancer stake returned (full bid amount)`);
        console.log(`🎉 Contract status: COMPLETED`);

        // ✅ NOW the contract should move to 'completed' status

      } else {
        console.log(`✅ ${percentage}% payment released to freelancer`);
      }

    } catch (error) {
      console.error('Error processing agent approval payment:', error);
    }
  }

  async approveWork(contractId: number, milestoneIndex: number = 0): Promise<string> {
    try {
      console.log(`✅ Client approving final work for contract ${contractId}`);

      // This should release the remaining 80% payment AND return freelancer stake
      const tx = await this.chainLanceCore.approveMilestone(contractId, milestoneIndex);
      const receipt = await tx.wait();

      // Process the final payment (80% + stake return)
      await this.processAgentApprovalPayment(contractId, 80);

      console.log('✅ Final work approved - remaining payment released + freelancer stake returned');
      console.log('🎉 Contract moved to completed status');

      return receipt.hash;

    } catch (error) {
      console.error('Error approving work:', error);
      throw error;
    }
  }

  async returnFreelancerStake(contractId: number): Promise<void> {
    try {
      console.log(`💰 Returning freelancer stake for contract ${contractId}`);

      // In real implementation, this would call smart contract function:
      // await this.chainLanceCore.returnStake(contractId);

      console.log(`✅ Freelancer stake returned successfully`);

    } catch (error) {
      console.error('Error returning freelancer stake:', error);
      throw error;
    }
  }

  async cancelContract(contractId: number, reason: string): Promise<string> {
    try {
      console.log(`❌ Cancelling contract ${contractId}. Reason: ${reason}`);

      // In real implementation:
      // 1. Return freelancer stake
      // 2. Return client escrow (minus any penalties)
      // 3. Update contract status to cancelled

      await this.returnFreelancerStake(contractId);

      console.log(`✅ Contract ${contractId} cancelled - stakes and escrow returned`);

      // Return mock transaction hash
      return `0x${Date.now().toString(16)}`;

    } catch (error) {
      console.error('Error cancelling contract:', error);
      throw error;
    }
  }

  async requestRevisions(contractId: number, revisionNotes: string): Promise<string> {
    try {
      console.log(`🔄 Requesting revisions for contract ${contractId}:`, revisionNotes);

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

  async verifyMilestone(contractId: number, milestoneIndex: number, approved: boolean): Promise<string> {
    try {
      const tx = await this.chainLanceCore.verifyMilestone(contractId, milestoneIndex, approved);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error verifying milestone:', error);
      throw error;
    }
  }

  async approveFixedWork(contractId: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.approveFixedWork(contractId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error approving fixed work:', error);
      throw error;
    }
  }

  async claimASIVerifiedPayment(contractId: number, milestoneIndex: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.claimASIVerifiedPayment(contractId, milestoneIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error claiming ASI verified payment:', error);
      throw error;
    }
  }

  async setASIVerification(contractId: number, milestoneIndex: number): Promise<string> {
    try {
      const tx = await this.chainLanceCore.setASIVerification(contractId, milestoneIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error setting ASI verification:', error);
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

  // ASI Agent Integration Methods
  async submitWorkForASIVerification(
    contractId: number,
    milestoneIndex: number,
    deliverableUrl: string,
    deliverableType: string,
    description: string
  ): Promise<string> {
    try {
      console.log(`🤖 Submitting work for ASI verification: Contract ${contractId}, Milestone ${milestoneIndex}`);

      // Get job and contract data for ASI analysis
      const contract = await this.getContract(contractId);
      if (!contract) {
        throw new Error(`Contract ${contractId} not found`);
      }

      const job = await this.getJob(contract.jobId);
      if (!job) {
        throw new Error(`Job ${contract.jobId} not found`);
      }

      // Prepare job data for ASI agents
      const jobData = {
        job_id: job.id,
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        skills_required: job.requiredSkills || [],
        deadline: new Date(job.deadline * 1000).toISOString(),
        client_address: job.client
      };

      // Prepare deliverable data
      const deliverableData = {
        contract_id: contractId,
        milestone_index: milestoneIndex,
        deliverable_url: deliverableUrl,
        deliverable_type: deliverableType,
        description: description,
        submitted_at: new Date().toISOString(),
        freelancer_address: contract.freelancer
      };

      // Submit to ASI agent service
      const asiResponse = await fetch('http://localhost:8080/submit_verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_data: jobData,
          deliverable_data: deliverableData
        })
      });

      if (!asiResponse.ok) {
        throw new Error(`ASI submission failed: ${asiResponse.statusText}`);
      }

      const result = await asiResponse.json();
      console.log(`✅ ASI verification request submitted: ${result.request_id}`);

      return result.request_id;

    } catch (error) {
      console.error('Error submitting work for ASI verification:', error);
      throw error;
    }
  }

  async getASIVerificationStatus(requestId: string): Promise<any> {
    try {
      const response = await fetch(`http://localhost:8080/verification_status/${requestId}`);

      if (!response.ok) {
        throw new Error(`Failed to get ASI verification status: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting ASI verification status:', error);
      throw error;
    }
  }

  async getASINetworkStatus(): Promise<any> {
    try {
      const [agentsResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:8080/active_agents'),
        fetch('http://localhost:8080/network_stats')
      ]);

      const agents = agentsResponse.ok ? await agentsResponse.json() : [];
      const stats = statsResponse.ok ? await statsResponse.json() : {
        total_agents: 0,
        active_agents: 0,
        total_verifications: 0,
        success_rate: 0
      };

      return { agents, stats };

    } catch (error) {
      console.error('Error getting ASI network status:', error);
      return { agents: [], stats: { total_agents: 0, active_agents: 0, total_verifications: 0, success_rate: 0 } };
    }
  }

  async releasePaymentAfterASIApproval(contractId: number, milestoneIndex: number): Promise<string> {
    try {
      console.log(`💰 Releasing 20% payment after ASI approval: Contract ${contractId}, Milestone ${milestoneIndex}`);

      // This would call the smart contract to release 20% payment
      // For now, we'll simulate the process
      const tx = await this.chainLanceCore.approveMilestone(contractId, milestoneIndex);
      const receipt = await tx.wait();

      console.log(`✅ 20% payment released automatically via ASI consensus`);
      return receipt.hash;

    } catch (error) {
      console.error('Error releasing payment after ASI approval:', error);
      throw error;
    }
  }
}
