import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { useWallet } from './WalletContext';
import { ContractService, ContractJob, ContractBid, ContractFreelanceContract } from '../services/contractService';

// Enhanced interfaces that combine contract data with UI state
export interface EnhancedJob extends Omit<ContractJob, 'contractType' | 'status'> {
  contract_type: 'fixed' | 'hourly' | 'milestone';
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  client_wallet: string;
  required_skills: string[];
  escrow_tx_hash: string | null;
  deadline_date: string | null;
  experience_level: 'beginner' | 'intermediate' | 'expert';
  project_duration: string | null;
  number_of_milestones: number;
  bids_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedBid extends Omit<ContractBid, 'status'> {
  job_id: string;
  freelancer_wallet: string;
  proposed_amount: number;
  stake_amount: number;
  stake_tx_hash: string | null;
  cover_letter: string | null;
  estimated_timeline: string | null;
  proposed_milestones: any;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface EnhancedContract extends Omit<ContractFreelanceContract, 'contractType' | 'status'> {
  job_id: string;
  bid_id: string | null;
  client_wallet: string;
  freelancer_wallet: string;
  total_amount: number;
  escrow_amount: number;
  escrow_tx_hash: string | null;
  contract_type: 'fixed' | 'hourly' | 'milestone';
  hourly_rate: number | null;
  hours_allocated: number | null;
  payment_schedule: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  start_date: string;
  end_date: string | null;
  completion_date: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface ContractDataContextType {
  // Data
  jobs: EnhancedJob[];
  bids: EnhancedBid[];
  contracts: EnhancedContract[];

  // Loading states
  isLoading: boolean;

  // Service instance
  contractService: ContractService | null;

  // Job methods
  getJobs: (filters?: { category?: string; contract_type?: string; budget_range?: string; status?: string }) => EnhancedJob[];
  getJob: (jobId: string) => EnhancedJob | null;
  createJob: (jobData: any) => Promise<EnhancedJob>;
  refreshJobs: () => Promise<void>;

  // Bid methods
  getBidsForJob: (jobId: string) => Promise<EnhancedBid[]>;
  getBidsForFreelancer: (freelancerWallet: string) => EnhancedBid[];
  createBid: (bidData: any) => Promise<EnhancedBid>;
  acceptBid: (bidId: string, jobBudget: number) => Promise<void>;
  rejectBid: (bidId: string) => Promise<void>;
  refreshBids: () => Promise<void>;

  // Contract methods
  getContractsForWallet: (walletAddress: string, status?: string) => EnhancedContract[];
  getContract: (contractId: string) => EnhancedContract | null;
  updateContractMilestones: (contractId: string, milestones: any[]) => void;
  refreshContracts: () => Promise<void>;

  // Token operations
  getPYUSDBalance: () => Promise<number>;
  requestPYUSDFromFaucet: () => Promise<void>;

  // Work submission
  submitWork: (submissionData: any) => Promise<string>;
  
  // Direct job access (bypasses filtering)
  getJobDirect: (jobId: string) => Promise<EnhancedJob | null>;
}

const ContractDataContext = createContext<ContractDataContextType | undefined>(undefined);

export const useContractData = () => {
  const context = useContext(ContractDataContext);
  if (!context) {
    throw new Error('useContractData must be used within ContractDataProvider');
  }
  return context;
};

export const ContractDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<EnhancedJob[]>([]);
  const [bids, setBids] = useState<EnhancedBid[]>([]);
  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contractService, setContractService] = useState<ContractService | null>(null);

  const { contracts: web3Contracts, isInitialized } = useWeb3();
  const { walletAddress } = useWallet();

  // Initialize contract service when Web3 is ready
  useEffect(() => {
    if (isInitialized && web3Contracts.chainLanceCore) {
      const service = new ContractService({
        chainLanceCore: web3Contracts.chainLanceCore,
        pyusdToken: web3Contracts.pyusdToken!,
        reputationSystem: web3Contracts.reputationSystem!,
        asiAgentVerifier: web3Contracts.asiAgentVerifier!,
      });
      setContractService(service);
    }
  }, [isInitialized, web3Contracts]);

  // Load initial data when service is ready
  useEffect(() => {
    if (contractService) {
      loadInitialData();
    }
  }, [contractService]);

  // Refresh data when wallet address changes
  useEffect(() => {
    if (contractService && walletAddress) {
      console.log('🔄 Wallet address changed, refreshing contract data for:', walletAddress);
      loadInitialData();
    }
  }, [walletAddress, contractService]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshJobs(),
        refreshBids(),
        refreshContracts(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Job methods
  const refreshJobs = async () => {
    if (!contractService) {
      console.log('Contract service not available, skipping job refresh');
      return;
    }

    try {
      console.log('Starting job refresh...');
      // Get all open jobs from the blockchain
      const openJobs = await contractService.getOpenJobs();
      console.log('Open jobs from contract:', openJobs);

      const enhancedJobs = openJobs.map(job => convertContractJobToEnhanced(job));
      console.log('Enhanced jobs:', enhancedJobs);

      setJobs(enhancedJobs);
      console.log('Jobs state updated with', enhancedJobs.length, 'jobs');
    } catch (error) {
      console.error('Error refreshing jobs:', error);
    }
  };

  const getJobs = (filters?: { category?: string; contract_type?: string; budget_range?: string; status?: string }): EnhancedJob[] => {
    console.log('🔍 Getting jobs with filters:', filters);
    console.log('📊 Total jobs in state:', jobs.length);

    let filteredJobs = [...jobs];
    console.log('📋 Jobs before filtering:', filteredJobs.map(j => ({ id: j.id, title: j.title, status: j.status })));

    if (filters?.status) {
      filteredJobs = filteredJobs.filter(job => job.status === filters.status);
      console.log(`🔎 Filtered by status '${filters.status}':`, filteredJobs.length, 'jobs');
    } else {
      filteredJobs = filteredJobs.filter(job => job.status === 'open');
      console.log('🔎 Filtered by default status "open":', filteredJobs.length, 'jobs');
    }

    if (filters?.category && filters.category !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.category === filters.category);
      console.log(`🔎 Filtered by category '${filters.category}':`, filteredJobs.length, 'jobs');
    }

    if (filters?.contract_type && filters.contract_type !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.contract_type === filters.contract_type);
      console.log(`🔎 Filtered by contract_type '${filters.contract_type}':`, filteredJobs.length, 'jobs');
    }

    if (filters?.budget_range && filters.budget_range !== 'all') {
      const [min, max] = filters.budget_range.split('-').map(Number);
      filteredJobs = filteredJobs.filter(job => {
        if (max) {
          return job.budget >= min && job.budget <= max;
        }
        return job.budget >= min;
      });
      console.log(`🔎 Filtered by budget range '${filters.budget_range}':`, filteredJobs.length, 'jobs');
    }

    const sortedJobs = filteredJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    console.log('✅ Final filtered jobs:', sortedJobs.length);
    return sortedJobs;
  };

  const getJob = (jobId: string): EnhancedJob | null => {
    console.log('🔍 ContractDataContext getJob: Looking for job ID:', jobId);
    console.log('📊 Available jobs in state:', jobs.length);
    console.log('📋 Job IDs in state:', jobs.map(j => j.id));
    
    // First try to find in current jobs array
    const foundJob = jobs.find(job => job.id === parseInt(jobId));
    if (foundJob) {
      console.log('✅ Found job in filtered array:', foundJob);
      return foundJob;
    }
    
    // If not found, try to fetch directly from contract service
    if (contractService) {
      console.log('🔍 Job not in filtered array, trying to fetch directly...');
      try {
        // We need to get the job directly, regardless of status
        // For now, let's return null and fix this by using DataContext
        console.log('❌ Job not found in ContractDataContext, should use DataContext instead');
      } catch (error) {
        console.error('Error fetching job directly:', error);
      }
    }
    
    return null;
  };

  const getJobDirect = async (jobId: string): Promise<EnhancedJob | null> => {
    if (!contractService) {
      console.log('❌ Contract service not available');
      return null;
    }

    try {
      console.log('🔍 Getting job directly from contract for ID:', jobId);
      const job = await contractService.getJob(parseInt(jobId));
      console.log('📄 Direct job result:', job);
      
      if (!job) {
        console.log('❌ Job not found in contract');
        return null;
      }

      // Convert to EnhancedJob format - simplified
      const enhancedJob: any = {
        id: job.id,
        client: job.client,
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        createdAt: job.createdAt,
        experienceLevel: job.experienceLevel,
        updatedAt: job.updatedAt,
        contract_type: job.contractType === 0 ? 'fixed' : job.contractType === 1 ? 'hourly' : 'milestone',
        status: job.status === 0 ? 'open' : job.status === 1 ? 'in_progress' : 'completed',
        client_wallet: job.client,
        required_skills: [],
        escrow_tx_hash: null,
        deadline_date: null,
        experience_level: 'intermediate',
        project_duration: '1 week',
        number_of_milestones: 1,
        bids_count: 0,
        views_count: 0,
        created_at: new Date(job.createdAt * 1000).toISOString(),
        updated_at: new Date(job.updatedAt * 1000).toISOString()
      };

      console.log('✅ Enhanced job created:', enhancedJob);
      return enhancedJob;
    } catch (error) {
      console.error('❌ Error getting job directly:', error);
      return null;
    }
  };

  const createJob = async (jobData: any): Promise<EnhancedJob> => {
    if (!contractService) throw new Error('Contract service not initialized');

    try {
      const contractTypeMap = { 'fixed': 0, 'hourly': 1, 'milestone': 2 };

      await contractService.postJob({
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        requiredSkills: jobData.required_skills,
        budget: jobData.budget,
        contractType: contractTypeMap[jobData.contract_type as keyof typeof contractTypeMap],
        deadline: Math.floor(new Date(jobData.deadline).getTime() / 1000),
        experienceLevel: jobData.experience_level,
        projectDuration: jobData.project_duration,
        numberOfMilestones: jobData.number_of_milestones,
      });

      // Refresh jobs to get the new job
      await refreshJobs();

      // Return the newly created job (this is a simplified approach)
      const newJob = jobs[jobs.length - 1];
      return newJob;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  };

  // Bid methods
  const refreshBids = async () => {
    if (!contractService) return;
    if (!walletAddress) {
      setBids([]);
      return;
    }

    try {
      const userBidIds = await contractService.getUserBids(walletAddress);
      const userBids = await Promise.all(
        userBidIds.map(async (id) => {
          const bid = await contractService.getBid(id);
          return bid ? convertContractBidToEnhanced(bid) : null;
        })
      );

      setBids(userBids.filter(Boolean) as EnhancedBid[]);
    } catch (error) {
      console.error('Error refreshing bids:', error);
    }
  };

  const getBidsForJob = async (jobId: string): Promise<EnhancedBid[]> => {
    if (!contractService) {
      console.log('❌ Contract service not available for fetching job bids');
      return [];
    }

    try {
      console.log(`🔍 Fetching bids for job ${jobId}...`);
      const jobBids = await contractService.getJobBidsWithDetails(parseInt(jobId));
      console.log(`📋 Raw job bids from contract:`, jobBids);

      const enhancedBids = jobBids.map(bid => convertContractBidToEnhanced(bid));
      console.log(`✅ Enhanced bids for job ${jobId}:`, enhancedBids);

      return enhancedBids.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error(`❌ Error fetching bids for job ${jobId}:`, error);
      return [];
    }
  };

  const getBidsForFreelancer = (freelancerWallet: string): EnhancedBid[] => {
    return bids.filter(bid => bid.freelancer_wallet === freelancerWallet)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const createBid = async (bidData: any): Promise<EnhancedBid> => {
    if (!contractService) throw new Error('Contract service not initialized');

    try {
      await contractService.placeBid({
        jobId: parseInt(bidData.job_id),
        proposedAmount: bidData.proposed_amount,
        coverLetter: bidData.cover_letter,
        estimatedTimeline: bidData.estimated_timeline,
        proposedMilestones: bidData.proposed_milestones,
      });

      // Refresh bids to get the new bid
      await refreshBids();

      // Also refresh jobs to update bid count
      await refreshJobs();

      // Return the newly created bid
      const newBid = bids[bids.length - 1];
      return newBid;
    } catch (error) {
      console.error('Error creating bid:', error);
      throw error;
    }
  };

  const acceptBid = async (bidId: string, jobBudget: number): Promise<void> => {
    if (!contractService) throw new Error('Contract service not initialized');

    try {
      await contractService.acceptBid(parseInt(bidId), jobBudget);

      // Find the accepted bid to get job info
      const bidIdNumber = parseInt(bidId);
      const acceptedBid = bids.find(bid => bid.id === bidIdNumber);
      if (acceptedBid) {
        // Update job status to "in_progress" (no longer available for bidding)
        const updatedJobs = jobs.map(job =>
          job.id === parseInt(acceptedBid.job_id)
            ? { ...job, status: 'in_progress' as const }
            : job
        );
        setJobs(updatedJobs);

        // Remove all bids for this job (since it's now closed)
        const filteredBids = bids.filter(bid => bid.job_id !== acceptedBid.job_id);
        setBids(filteredBids);
      }

      // Refresh data to reflect changes
      await Promise.all([refreshBids(), refreshContracts()]);
    } catch (error) {
      console.error('Error accepting bid:', error);
      throw error;
    }
  };

  const rejectBid = async (bidId: string): Promise<void> => {
    if (!contractService) throw new Error('Contract service not initialized');

    try {
      await contractService.rejectBid(parseInt(bidId));

      // Remove the rejected bid from the local state
      const filteredBids = bids.filter(bid => bid.id !== parseInt(bidId));
      setBids(filteredBids);

      // Refresh data to reflect changes
      await refreshBids();
    } catch (error) {
      console.error('Error rejecting bid:', error);
      throw error;
    }
  };

  // Contract methods
  const refreshContracts = async () => {
    if (!contractService) return;
    if (!walletAddress) {
      setContracts([]);
      return;
    }

    try {
      console.log(`🔄 Refreshing contracts for wallet: ${walletAddress}`);
      const userContractIds = await contractService.getUserContracts(walletAddress);
      console.log(`📋 Found contract IDs:`, userContractIds);

      if (userContractIds.length === 0) {
        console.log(`⚠️ No contract IDs found for wallet ${walletAddress}`);
        setContracts([]);
        return;
      }

      const userContracts = await Promise.all(
        userContractIds.map(async (id) => {
          console.log(`📄 Processing contract ID: ${id}`);
          const contract = await contractService.getContract(id);

          if (contract) {
            console.log(`✅ Contract ${id} fetched successfully:`, contract);
            try {
              const enhanced = convertContractToEnhanced(contract);
              console.log(`✅ Enhanced contract ${id}:`, enhanced);
              return enhanced;
            } catch (conversionError) {
              console.error(`❌ Error converting contract ${id}:`, conversionError);
              return null;
            }
          } else {
            console.log(`❌ Failed to fetch contract ${id}`);
            return null;
          }
        })
      );

      const validContracts = userContracts.filter(Boolean) as EnhancedContract[];
      console.log(`✅ Setting ${validContracts.length} contracts in state:`, validContracts);
      setContracts(validContracts);
    } catch (error) {
      console.error('Error refreshing contracts:', error);
      console.error('Error details:', error);
    }
  };

  const getContractsForWallet = (walletAddress: string, status?: string): EnhancedContract[] => {
    console.log(`🔍 getContractsForWallet called with wallet: ${walletAddress}, status: ${status}`);
    console.log(`📋 Total contracts in state: ${contracts.length}`, contracts);

    let filteredContracts = contracts.filter(contract => {
      const isClientOrFreelancer =
        contract.client_wallet.toLowerCase() === walletAddress.toLowerCase() ||
        contract.freelancer_wallet.toLowerCase() === walletAddress.toLowerCase();
      console.log(`🔍 Contract ${contract.id}: client=${contract.client_wallet}, freelancer=${contract.freelancer_wallet}, wallet=${walletAddress}, matches=${isClientOrFreelancer}`);
      return isClientOrFreelancer;
    });

    console.log(`📋 After wallet filter: ${filteredContracts.length} contracts`, filteredContracts);

    if (status) {
      if (status === 'active') {
        filteredContracts = filteredContracts.filter(contract => {
          const isActive = contract.status === 'pending' || contract.status === 'active';
          console.log(`🔍 Contract ${contract.id} status: ${contract.status}, isActive: ${isActive}`);
          return isActive;
        });
      } else {
        filteredContracts = filteredContracts.filter(contract => {
          const matchesStatus = contract.status === status;
          console.log(`🔍 Contract ${contract.id} status: ${contract.status}, matches ${status}: ${matchesStatus}`);
          return matchesStatus;
        });
      }
    }

    console.log(`📋 Final filtered contracts: ${filteredContracts.length}`, filteredContracts);
    return filteredContracts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getContract = (contractId: string): EnhancedContract | null => {
    return contracts.find(contract => contract.id.toString() === contractId) || null;
  };

  const updateContractMilestones = (contractId: string, milestones: any[]) => {
    setContracts(prevContracts => 
      prevContracts.map(contract => 
        contract.id.toString() === contractId 
          ? { ...contract, milestones }
          : contract
      )
    );
  };

  // Token operations
  const getPYUSDBalance = async (): Promise<number> => {
    if (!contractService || !walletAddress) return 0;
    return await contractService.getPYUSDBalance(walletAddress);
  };

  const requestPYUSDFromFaucet = async (): Promise<void> => {
    if (!contractService || !walletAddress) return;
    await contractService.requestPYUSDFromFaucet(walletAddress);
  };

  // Helper functions to convert contract types to enhanced types
  const convertContractJobToEnhanced = (job: ContractJob): EnhancedJob => {
    const contractTypeMap = ['fixed', 'hourly', 'milestone'] as const;
    // Contract enum: JobStatus { Open, InProgress, Completed, Cancelled, Disputed } = [0, 1, 2, 3, 4]
    const statusMap = ['open', 'in_progress', 'completed', 'cancelled', 'disputed'] as const;
    const experienceLevelMap = ['beginner', 'intermediate', 'expert'] as const;

    console.log('🔄 Converting job:', {
      id: job.id,
      title: job.title,
      rawStatus: job.status,
      rawContractType: job.contractType,
      client: job.client
    });

    const enhancedJob = {
      ...job,
      id: job.id, // Keep as number
      client_wallet: job.client,
      contract_type: contractTypeMap[job.contractType] || 'fixed',
      status: statusMap[job.status] || 'open',
      required_skills: job.requiredSkills,
      escrow_tx_hash: null,
      deadline_date: job.deadline ? new Date(job.deadline * 1000).toISOString() : null,
      experience_level: experienceLevelMap[0] || 'intermediate', // Default mapping
      project_duration: job.projectDuration,
      number_of_milestones: job.numberOfMilestones,
      bids_count: job.bidsCount,
      views_count: job.viewsCount,
      created_at: new Date(job.createdAt * 1000).toISOString(),
      updated_at: new Date(job.updatedAt * 1000).toISOString(),
    };

    console.log('✅ Enhanced job:', {
      id: enhancedJob.id,
      title: enhancedJob.title,
      status: enhancedJob.status,
      contract_type: enhancedJob.contract_type
    });

    return enhancedJob;
  };

  const convertContractBidToEnhanced = (bid: ContractBid): EnhancedBid => {
    const statusMap = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;

    return {
      id: bid.id,
      jobId: bid.jobId,
      freelancer: bid.freelancer,
      proposedAmount: bid.proposedAmount,
      stakeAmount: bid.stakeAmount,
      coverLetter: bid.coverLetter,
      estimatedTimeline: bid.estimatedTimeline,
      proposedMilestones: bid.proposedMilestones,
      createdAt: bid.createdAt,
      job_id: bid.jobId.toString(),
      freelancer_wallet: bid.freelancer,
      proposed_amount: bid.proposedAmount,
      stake_amount: bid.stakeAmount,
      stake_tx_hash: null,
      cover_letter: bid.coverLetter,
      estimated_timeline: bid.estimatedTimeline,
      proposed_milestones: bid.proposedMilestones,
      status: statusMap[bid.status] || 'pending',
      created_at: new Date(bid.createdAt * 1000).toISOString(),
      updated_at: new Date(bid.createdAt * 1000).toISOString(),
    };
  };

  const convertContractToEnhanced = (contract: ContractFreelanceContract): EnhancedContract => {
    const contractTypeMap = ['fixed', 'hourly', 'milestone'] as const;
    // Contract enum: ContractStatus { Pending, Active, Completed, Cancelled, Disputed } = [0, 1, 2, 3, 4]
    const statusMap = ['pending', 'active', 'completed', 'cancelled', 'disputed'] as const;

    return {
      id: contract.id,
      job_id: contract.jobId.toString(),
      bid_id: contract.bidId.toString(),
      client_wallet: contract.client,
      freelancer_wallet: contract.freelancer,
      total_amount: contract.totalAmount,
      escrow_amount: contract.escrowAmount,
      escrow_tx_hash: null,
      contract_type: contractTypeMap[contract.contractType] || 'fixed',
      hourly_rate: contract.hourlyRate,
      hours_allocated: contract.hoursAllocated,
      payment_schedule: null,
      status: statusMap[contract.status] || 'pending',
      start_date: new Date(contract.startDate * 1000).toISOString(),
      end_date: contract.endDate ? new Date(contract.endDate * 1000).toISOString() : null,
      completion_date: contract.completionDate ? new Date(contract.completionDate * 1000).toISOString() : null,
      dispute_reason: null,
      created_at: new Date(contract.createdAt * 1000).toISOString(),
      updated_at: new Date(contract.createdAt * 1000).toISOString(),
      // Include original contract properties for compatibility
      jobId: contract.jobId,
      bidId: contract.bidId,
      client: contract.client,
      freelancer: contract.freelancer,
      totalAmount: contract.totalAmount,
      escrowAmount: contract.escrowAmount,
      contractType: contract.contractType,
      hourlyRate: contract.hourlyRate,
      hoursAllocated: contract.hoursAllocated,
      startDate: contract.startDate,
      endDate: contract.endDate,
      completionDate: contract.completionDate,
      milestones: contract.milestones,
      createdAt: contract.createdAt,
    } as EnhancedContract;
  };

  return (
    <ContractDataContext.Provider
      value={{
        jobs,
        bids,
        contracts,
        isLoading,
        contractService,
        getJobs,
        getJob,
        createJob,
        refreshJobs,
        getBidsForJob,
        getBidsForFreelancer,
        createBid,
        acceptBid,
        rejectBid,
        refreshBids,
        getContractsForWallet,
        getContract,
        updateContractMilestones,
        refreshContracts,
        getPYUSDBalance,
        requestPYUSDFromFaucet,
        submitWork: contractService?.submitWork.bind(contractService) || (async () => { throw new Error('Contract service not available'); }),
        getJobDirect,
      }}
    >
      {children}
    </ContractDataContext.Provider>
  );
};
