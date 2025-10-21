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
  getBidsForJob: (jobId: string) => EnhancedBid[];
  getBidsForFreelancer: (freelancerWallet: string) => EnhancedBid[];
  createBid: (bidData: any) => Promise<EnhancedBid>;
  acceptBid: (bidId: string) => Promise<void>;
  refreshBids: () => Promise<void>;
  
  // Contract methods
  getContractsForWallet: (walletAddress: string, status?: string) => EnhancedContract[];
  getContract: (contractId: string) => EnhancedContract | null;
  refreshContracts: () => Promise<void>;
  
  // Token operations
  getPYUSDBalance: () => Promise<number>;
  requestPYUSDFromFaucet: () => Promise<void>;
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
    if (contractService && walletAddress) {
      loadInitialData();
    }
  }, [contractService, walletAddress]);

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
    if (!contractService || !walletAddress) return;
    
    try {
      // Get all jobs for the user (both posted and available)
      const userJobIds = await contractService.getUserJobs(walletAddress);
      const userJobs = await Promise.all(
        userJobIds.map(async (id) => {
          const job = await contractService.getJob(id);
          return job ? convertContractJobToEnhanced(job) : null;
        })
      );
      
      setJobs(userJobs.filter(Boolean) as EnhancedJob[]);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
    }
  };

  const getJobs = (filters?: { category?: string; contract_type?: string; budget_range?: string; status?: string }): EnhancedJob[] => {
    let filteredJobs = [...jobs];

    if (filters?.status) {
      filteredJobs = filteredJobs.filter(job => job.status === filters.status);
    } else {
      filteredJobs = filteredJobs.filter(job => job.status === 'open');
    }

    if (filters?.category && filters.category !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.category === filters.category);
    }

    if (filters?.contract_type && filters.contract_type !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.contract_type === filters.contract_type);
    }

    if (filters?.budget_range && filters.budget_range !== 'all') {
      const [min, max] = filters.budget_range.split('-').map(Number);
      filteredJobs = filteredJobs.filter(job => {
        if (max) {
          return job.budget >= min && job.budget <= max;
        }
        return job.budget >= min;
      });
    }

    return filteredJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getJob = (jobId: string): EnhancedJob | null => {
    return jobs.find(job => job.id.toString() === jobId) || null;
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
    if (!contractService || !walletAddress) return;
    
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

  const getBidsForJob = (jobId: string): EnhancedBid[] => {
    return bids.filter(bid => bid.job_id === jobId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      
      // Return the newly created bid
      const newBid = bids[bids.length - 1];
      return newBid;
    } catch (error) {
      console.error('Error creating bid:', error);
      throw error;
    }
  };

  const acceptBid = async (bidId: string): Promise<void> => {
    if (!contractService) throw new Error('Contract service not initialized');
    
    try {
      await contractService.acceptBid(parseInt(bidId));
      
      // Refresh data to reflect changes
      await Promise.all([refreshBids(), refreshContracts()]);
    } catch (error) {
      console.error('Error accepting bid:', error);
      throw error;
    }
  };

  // Contract methods
  const refreshContracts = async () => {
    if (!contractService || !walletAddress) return;
    
    try {
      const userContractIds = await contractService.getUserContracts(walletAddress);
      const userContracts = await Promise.all(
        userContractIds.map(async (id) => {
          const contract = await contractService.getContract(id);
          return contract ? convertContractToEnhanced(contract) : null;
        })
      );
      
      setContracts(userContracts.filter(Boolean) as EnhancedContract[]);
    } catch (error) {
      console.error('Error refreshing contracts:', error);
    }
  };

  const getContractsForWallet = (walletAddress: string, status?: string): EnhancedContract[] => {
    let filteredContracts = contracts.filter(contract => 
      contract.client_wallet === walletAddress || contract.freelancer_wallet === walletAddress
    );

    if (status) {
      if (status === 'active') {
        filteredContracts = filteredContracts.filter(contract => 
          contract.status === 'pending' || contract.status === 'active'
        );
      } else {
        filteredContracts = filteredContracts.filter(contract => contract.status === status);
      }
    }

    return filteredContracts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getContract = (contractId: string): EnhancedContract | null => {
    return contracts.find(contract => contract.id.toString() === contractId) || null;
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
    const statusMap = ['draft', 'open', 'in_progress', 'completed', 'cancelled', 'disputed'] as const;
    const experienceLevelMap = ['beginner', 'intermediate', 'expert'] as const;
    
    return {
      ...job,
      id: job.id.toString(),
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
  };

  const convertContractBidToEnhanced = (bid: ContractBid): EnhancedBid => {
    const statusMap = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
    
    return {
      ...bid,
      id: bid.id.toString(),
      job_id: bid.jobId.toString(),
      freelancer_wallet: bid.freelancer,
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
    const statusMap = ['pending', 'active', 'completed', 'cancelled', 'disputed'] as const;
    
    return {
      ...contract,
      id: contract.id.toString(),
      job_id: contract.jobId.toString(),
      bid_id: contract.bidId.toString(),
      client_wallet: contract.client,
      freelancer_wallet: contract.freelancer,
      escrow_tx_hash: null,
      contract_type: contractTypeMap[contract.contractType] || 'fixed',
      payment_schedule: null,
      status: statusMap[contract.status] || 'pending',
      start_date: new Date(contract.startDate * 1000).toISOString(),
      end_date: contract.endDate ? new Date(contract.endDate * 1000).toISOString() : null,
      completion_date: contract.completionDate ? new Date(contract.completionDate * 1000).toISOString() : null,
      dispute_reason: null,
      created_at: new Date(contract.createdAt * 1000).toISOString(),
      updated_at: new Date(contract.createdAt * 1000).toISOString(),
    };
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
        refreshBids,
        getContractsForWallet,
        getContract,
        refreshContracts,
        getPYUSDBalance,
        requestPYUSDFromFaucet,
      }}
    >
      {children}
    </ContractDataContext.Provider>
  );
};
