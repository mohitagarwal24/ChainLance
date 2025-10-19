import React, { createContext, useContext, useState, useEffect } from 'react';

// Type definitions based on the original Supabase schema
export interface Profile {
  id: string;
  wallet_address: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: 'client' | 'freelancer' | 'both';
  skills: string[];
  portfolio_links: string[];
  hourly_rate: number | null;
  location: string | null;
  total_earned: number;
  total_spent: number;
  jobs_completed: number;
  success_rate: number;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  client_wallet: string;
  title: string;
  description: string;
  category: string;
  required_skills: string[];
  budget: number;
  contract_type: 'fixed' | 'hourly' | 'milestone';
  escrow_deposit: number;
  escrow_tx_hash: string | null;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  deadline: string | null;
  experience_level: 'beginner' | 'intermediate' | 'expert';
  project_duration: string | null;
  number_of_milestones: number;
  bids_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
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

export interface Contract {
  id: string;
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

export interface Rating {
  id: string;
  contract_id: string;
  rater_wallet: string;
  rated_wallet: string;
  rating: number;
  quality_rating: number | null;
  communication_rating: number | null;
  timeliness_rating: number | null;
  review_text: string | null;
  would_recommend: boolean;
  is_public: boolean;
  created_at: string;
}

interface DataContextType {
  // Data
  profiles: Profile[];
  jobs: Job[];
  bids: Bid[];
  contracts: Contract[];
  ratings: Rating[];
  
  // Profile methods
  getProfile: (walletAddress: string) => Profile | null;
  createProfile: (profileData: Partial<Profile>) => Promise<Profile>;
  updateProfile: (walletAddress: string, updates: Partial<Profile>) => Promise<Profile | null>;
  
  // Job methods
  getJobs: (filters?: { category?: string; contract_type?: string; budget_range?: string; status?: string }) => Job[];
  getJob: (jobId: string) => Job | null;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
  updateJob: (jobId: string, updates: Partial<Job>) => Promise<Job | null>;
  
  // Bid methods
  getBidsForJob: (jobId: string) => Bid[];
  getBidsForFreelancer: (freelancerWallet: string) => Bid[];
  createBid: (bidData: Partial<Bid>) => Promise<Bid>;
  updateBid: (bidId: string, updates: Partial<Bid>) => Promise<Bid | null>;
  
  // Contract methods
  getContractsForWallet: (walletAddress: string, status?: string) => Contract[];
  getContract: (contractId: string) => Contract | null;
  createContract: (contractData: Partial<Contract>) => Promise<Contract>;
  updateContract: (contractId: string, updates: Partial<Contract>) => Promise<Contract | null>;
  
  // Rating methods
  getRatingsForWallet: (walletAddress: string) => Rating[];
  createRating: (ratingData: Partial<Rating>) => Promise<Rating>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const getCurrentTimestamp = () => new Date().toISOString();

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const savedProfiles = localStorage.getItem('chainlance_profiles');
        const savedJobs = localStorage.getItem('chainlance_jobs');
        const savedBids = localStorage.getItem('chainlance_bids');
        const savedContracts = localStorage.getItem('chainlance_contracts');
        const savedRatings = localStorage.getItem('chainlance_ratings');

        if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
        if (savedJobs) setJobs(JSON.parse(savedJobs));
        if (savedBids) setBids(JSON.parse(savedBids));
        if (savedContracts) setContracts(JSON.parse(savedContracts));
        if (savedRatings) setRatings(JSON.parse(savedRatings));

        // Initialize with sample data if empty
        if (!savedJobs || JSON.parse(savedJobs || '[]').length === 0) {
          initializeSampleData();
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('chainlance_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('chainlance_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('chainlance_bids', JSON.stringify(bids));
  }, [bids]);

  useEffect(() => {
    localStorage.setItem('chainlance_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('chainlance_ratings', JSON.stringify(ratings));
  }, [ratings]);

  const initializeSampleData = () => {
    const sampleJobs: Job[] = [
      {
        id: 'job1',
        client_wallet: '0x1234567890123456789012345678901234567890',
        title: 'Build a DeFi Dashboard with Real-time Analytics',
        description: 'Looking for an experienced React developer to build a comprehensive DeFi dashboard that displays portfolio analytics, yield farming opportunities, and real-time market data. The project includes user authentication, data visualization charts, and smart contract interactions.',
        category: 'Web Development',
        required_skills: ['React', 'TypeScript', 'Web3', 'DeFi', 'TailwindCSS'],
        budget: 5000,
        contract_type: 'milestone',
        escrow_deposit: 750,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2024-12-31',
        experience_level: 'expert',
        project_duration: '6-8 weeks',
        number_of_milestones: 4,
        bids_count: 3,
        views_count: 45,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job2',
        client_wallet: '0x2345678901234567890123456789012345678901',
        title: 'Smart Contract Security Audit',
        description: 'Need a thorough security audit of our new lending protocol smart contracts. Must have experience with Solidity and common DeFi vulnerabilities. Includes formal verification and gas optimization.',
        category: 'Blockchain',
        required_skills: ['Solidity', 'Security Auditing', 'DeFi', 'Smart Contracts', 'Formal Verification'],
        budget: 8000,
        contract_type: 'fixed',
        escrow_deposit: 1200,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2024-11-30',
        experience_level: 'expert',
        project_duration: '3-4 weeks',
        number_of_milestones: 2,
        bids_count: 5,
        views_count: 28,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job3',
        client_wallet: '0x3456789012345678901234567890123456789012',
        title: 'Cross-Chain NFT Marketplace',
        description: 'Create a modern NFT marketplace with minting, trading, and auction features. Should support multiple blockchain networks including Ethereum, Polygon, and Arbitrum.',
        category: 'Web Development',
        required_skills: ['React', 'Node.js', 'Web3', 'NFTs', 'IPFS', 'Cross-chain'],
        budget: 12000,
        contract_type: 'milestone',
        escrow_deposit: 1800,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-01-15',
        experience_level: 'expert',
        project_duration: '10-12 weeks',
        number_of_milestones: 6,
        bids_count: 7,
        views_count: 62,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job4',
        client_wallet: '0x4567890123456789012345678901234567890123',
        title: 'AI-Powered Trading Bot',
        description: 'Develop an intelligent trading bot that uses machine learning to analyze market patterns and execute trades on DEXs. Must include risk management and backtesting capabilities.',
        category: 'AI/ML',
        required_skills: ['Python', 'Machine Learning', 'DeFi', 'Trading Algorithms', 'Web3'],
        budget: 15000,
        contract_type: 'milestone',
        escrow_deposit: 2250,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-02-28',
        experience_level: 'expert',
        project_duration: '12-16 weeks',
        number_of_milestones: 8,
        bids_count: 4,
        views_count: 38,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job5',
        client_wallet: '0x5678901234567890123456789012345678901234',
        title: 'Mobile DeFi Wallet App',
        description: 'Build a secure mobile wallet app for iOS and Android with DeFi integration, staking features, and multi-chain support. Focus on user experience and security.',
        category: 'Mobile Development',
        required_skills: ['React Native', 'Mobile Security', 'Web3', 'DeFi', 'Biometric Auth'],
        budget: 18000,
        contract_type: 'milestone',
        escrow_deposit: 2700,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-03-31',
        experience_level: 'expert',
        project_duration: '14-18 weeks',
        number_of_milestones: 7,
        bids_count: 6,
        views_count: 51,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job6',
        client_wallet: '0x6789012345678901234567890123456789012345',
        title: 'DeFi Protocol Documentation',
        description: 'Create comprehensive technical documentation for our new DeFi protocol including API docs, integration guides, and user tutorials. Must be clear and developer-friendly.',
        category: 'Writing',
        required_skills: ['Technical Writing', 'DeFi', 'Documentation', 'API Documentation'],
        budget: 3500,
        contract_type: 'fixed',
        escrow_deposit: 525,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2024-12-15',
        experience_level: 'intermediate',
        project_duration: '4-6 weeks',
        number_of_milestones: 3,
        bids_count: 8,
        views_count: 29,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job7',
        client_wallet: '0x7890123456789012345678901234567890123456',
        title: 'Yield Farming Aggregator',
        description: 'Build a yield farming aggregator that automatically finds the best yields across multiple DeFi protocols. Include auto-compounding and risk assessment features.',
        category: 'Web Development',
        required_skills: ['React', 'DeFi', 'Smart Contracts', 'Yield Farming', 'Web3'],
        budget: 9500,
        contract_type: 'milestone',
        escrow_deposit: 1425,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-01-31',
        experience_level: 'expert',
        project_duration: '8-10 weeks',
        number_of_milestones: 5,
        bids_count: 2,
        views_count: 34,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job8',
        client_wallet: '0x8901234567890123456789012345678901234567',
        title: 'Decentralized Identity System',
        description: 'Develop a decentralized identity verification system using zero-knowledge proofs. Must be privacy-focused and integrate with major DeFi protocols.',
        category: 'Blockchain',
        required_skills: ['Solidity', 'Zero-Knowledge Proofs', 'Identity', 'Privacy', 'Cryptography'],
        budget: 22000,
        contract_type: 'milestone',
        escrow_deposit: 3300,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-04-30',
        experience_level: 'expert',
        project_duration: '16-20 weeks',
        number_of_milestones: 8,
        bids_count: 1,
        views_count: 18,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job9',
        client_wallet: '0x9012345678901234567890123456789012345678',
        title: 'GameFi Token Economics Design',
        description: 'Design tokenomics for a new GameFi project including play-to-earn mechanics, staking rewards, and governance tokens. Need economic modeling and simulations.',
        category: 'Design',
        required_skills: ['Tokenomics', 'GameFi', 'Economic Modeling', 'Game Design', 'DeFi'],
        budget: 6500,
        contract_type: 'fixed',
        escrow_deposit: 975,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2024-12-20',
        experience_level: 'expert',
        project_duration: '5-7 weeks',
        number_of_milestones: 4,
        bids_count: 9,
        views_count: 67,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'job10',
        client_wallet: '0xa012345678901234567890123456789012345678',
        title: 'Cross-Chain Bridge Development',
        description: 'Build a secure cross-chain bridge between Ethereum and Polygon with support for multiple token types. Must include comprehensive security measures.',
        category: 'Blockchain',
        required_skills: ['Solidity', 'Cross-chain', 'Bridge Development', 'Security', 'Multi-chain'],
        budget: 28000,
        contract_type: 'milestone',
        escrow_deposit: 4200,
        escrow_tx_hash: null,
        status: 'open',
        deadline: '2025-05-31',
        experience_level: 'expert',
        project_duration: '20-24 weeks',
        number_of_milestones: 10,
        bids_count: 3,
        views_count: 41,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      }
    ];

    const sampleProfiles: Profile[] = [
      {
        id: 'profile1',
        wallet_address: '0xabc1234567890123456789012345678901234567',
        display_name: 'Alex Chen',
        bio: 'Full-stack developer specializing in DeFi and Web3 applications. 5+ years experience building scalable blockchain solutions.',
        avatar_url: null,
        role: 'freelancer',
        skills: ['React', 'TypeScript', 'Solidity', 'Web3', 'DeFi', 'Node.js'],
        portfolio_links: ['https://github.com/alexchen', 'https://alexchen.dev'],
        hourly_rate: 85,
        location: 'San Francisco, CA',
        total_earned: 45000,
        total_spent: 0,
        jobs_completed: 12,
        success_rate: 95,
        average_rating: 4.8,
        total_reviews: 11,
        is_verified: true,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'profile2',
        wallet_address: '0xdef2345678901234567890123456789012345678',
        display_name: 'Sarah Johnson',
        bio: 'Smart contract security auditor with expertise in formal verification and DeFi protocols. Former security researcher at ConsenSys.',
        avatar_url: null,
        role: 'freelancer',
        skills: ['Solidity', 'Security Auditing', 'Formal Verification', 'DeFi', 'Smart Contracts'],
        portfolio_links: ['https://github.com/sarahjohnson', 'https://sarahsecurity.com'],
        hourly_rate: 120,
        location: 'London, UK',
        total_earned: 78000,
        total_spent: 0,
        jobs_completed: 18,
        success_rate: 100,
        average_rating: 4.9,
        total_reviews: 16,
        is_verified: true,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'profile3',
        wallet_address: '0x1234567890123456789012345678901234567890',
        display_name: 'TechCorp Solutions',
        bio: 'Leading blockchain development company looking for top talent to build the future of DeFi.',
        avatar_url: null,
        role: 'client',
        skills: [],
        portfolio_links: ['https://techcorp.com'],
        hourly_rate: null,
        location: 'New York, NY',
        total_earned: 0,
        total_spent: 125000,
        jobs_completed: 0,
        success_rate: 100,
        average_rating: 4.7,
        total_reviews: 8,
        is_verified: true,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      }
    ];

    const sampleBids: Bid[] = [
      {
        id: 'bid1',
        job_id: 'job1',
        freelancer_wallet: '0xabc1234567890123456789012345678901234567',
        proposed_amount: 4800,
        stake_amount: 480,
        stake_tx_hash: null,
        cover_letter: 'I have extensive experience building DeFi dashboards and would love to work on this project. I can deliver high-quality code with comprehensive testing.',
        estimated_timeline: '6 weeks',
        proposed_milestones: ['UI/UX Design', 'Core Dashboard', 'DeFi Integration', 'Testing & Deployment'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'bid2',
        job_id: 'job2',
        freelancer_wallet: '0xdef2345678901234567890123456789012345678',
        proposed_amount: 7500,
        stake_amount: 750,
        stake_tx_hash: null,
        cover_letter: 'As a security auditor with 50+ smart contract audits completed, I can provide comprehensive security analysis for your lending protocol.',
        estimated_timeline: '3 weeks',
        proposed_milestones: ['Initial Review', 'Detailed Audit & Report'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'bid3',
        job_id: 'job1',
        freelancer_wallet: '0xdef2345678901234567890123456789012345678',
        proposed_amount: 5200,
        stake_amount: 520,
        stake_tx_hash: null,
        cover_letter: 'I specialize in DeFi integrations and have built similar dashboards for major protocols. I can implement advanced analytics and real-time data feeds.',
        estimated_timeline: '7 weeks',
        proposed_milestones: ['Research & Planning', 'UI Development', 'Backend Integration', 'Testing & Launch'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'bid4',
        job_id: 'job3',
        freelancer_wallet: '0xabc1234567890123456789012345678901234567',
        proposed_amount: 11500,
        stake_amount: 1150,
        stake_tx_hash: null,
        cover_letter: 'I have built multiple NFT marketplaces and understand the complexities of cross-chain functionality. I can deliver a robust, scalable solution.',
        estimated_timeline: '12 weeks',
        proposed_milestones: ['Architecture', 'Core Marketplace', 'Cross-chain Integration', 'Advanced Features', 'Testing', 'Deployment'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'bid5',
        job_id: 'job4',
        freelancer_wallet: '0xdef2345678901234567890123456789012345678',
        proposed_amount: 14200,
        stake_amount: 1420,
        stake_tx_hash: null,
        cover_letter: 'ML engineer with 8+ years in algorithmic trading. I have experience with DeFi protocols and can build sophisticated trading strategies with proper risk management.',
        estimated_timeline: '14 weeks',
        proposed_milestones: ['Strategy Research', 'ML Model Development', 'Backtesting System', 'Risk Management', 'Live Trading Integration', 'Monitoring Dashboard', 'Documentation', 'Deployment'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      },
      {
        id: 'bid6',
        job_id: 'job7',
        freelancer_wallet: '0xabc1234567890123456789012345678901234567',
        proposed_amount: 9200,
        stake_amount: 920,
        stake_tx_hash: null,
        cover_letter: 'I have deep knowledge of yield farming protocols and can build an efficient aggregator with auto-compounding features. My previous work includes similar DeFi tools.',
        estimated_timeline: '9 weeks',
        proposed_milestones: ['Protocol Integration', 'Yield Calculation Engine', 'Auto-compound Logic', 'UI Development', 'Testing & Optimization'],
        status: 'pending',
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      }
    ];

    const sampleContracts: Contract[] = [
      {
        id: 'contract1',
        job_id: 'job1',
        bid_id: 'bid1',
        client_wallet: '0x1234567890123456789012345678901234567890',
        freelancer_wallet: '0xabc1234567890123456789012345678901234567',
        total_amount: 4800,
        escrow_amount: 4800,
        escrow_tx_hash: null,
        contract_type: 'milestone',
        hourly_rate: null,
        hours_allocated: null,
        payment_schedule: null,
        status: 'active',
        start_date: getCurrentTimestamp(),
        end_date: null,
        completion_date: null,
        dispute_reason: null,
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      }
    ];

    const sampleRatings: Rating[] = [
      {
        id: 'rating1',
        contract_id: 'contract1',
        rater_wallet: '0x1234567890123456789012345678901234567890',
        rated_wallet: '0xabc1234567890123456789012345678901234567',
        rating: 5,
        quality_rating: 5,
        communication_rating: 5,
        timeliness_rating: 5,
        review_text: 'Excellent work on the DeFi dashboard. Alex delivered high-quality code on time and was very responsive to feedback.',
        would_recommend: true,
        is_public: true,
        created_at: getCurrentTimestamp(),
      }
    ];

    setJobs(sampleJobs);
    setProfiles(sampleProfiles);
    setBids(sampleBids);
    setContracts(sampleContracts);
    setRatings(sampleRatings);
  };

  // Profile methods
  const getProfile = (walletAddress: string): Profile | null => {
    return profiles.find(p => p.wallet_address === walletAddress) || null;
  };

  const createProfile = async (profileData: Partial<Profile>): Promise<Profile> => {
    const newProfile: Profile = {
      id: generateId(),
      wallet_address: profileData.wallet_address || '',
      display_name: profileData.display_name || null,
      bio: profileData.bio || null,
      avatar_url: profileData.avatar_url || null,
      role: profileData.role || 'both',
      skills: profileData.skills || [],
      portfolio_links: profileData.portfolio_links || [],
      hourly_rate: profileData.hourly_rate || null,
      location: profileData.location || null,
      total_earned: profileData.total_earned || 0,
      total_spent: profileData.total_spent || 0,
      jobs_completed: profileData.jobs_completed || 0,
      success_rate: profileData.success_rate || 100,
      average_rating: profileData.average_rating || 0,
      total_reviews: profileData.total_reviews || 0,
      is_verified: profileData.is_verified || false,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    setProfiles(prev => [...prev, newProfile]);
    return newProfile;
  };

  const updateProfile = async (walletAddress: string, updates: Partial<Profile>): Promise<Profile | null> => {
    setProfiles(prev => prev.map(profile => 
      profile.wallet_address === walletAddress 
        ? { ...profile, ...updates, updated_at: getCurrentTimestamp() }
        : profile
    ));
    return getProfile(walletAddress);
  };

  // Job methods
  const getJobs = (filters?: { category?: string; contract_type?: string; budget_range?: string; status?: string }): Job[] => {
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

  const getJob = (jobId: string): Job | null => {
    return jobs.find(job => job.id === jobId) || null;
  };

  const createJob = async (jobData: Partial<Job>): Promise<Job> => {
    const newJob: Job = {
      id: generateId(),
      client_wallet: jobData.client_wallet || '',
      title: jobData.title || '',
      description: jobData.description || '',
      category: jobData.category || '',
      required_skills: jobData.required_skills || [],
      budget: jobData.budget || 0,
      contract_type: jobData.contract_type || 'fixed',
      escrow_deposit: jobData.escrow_deposit || 0,
      escrow_tx_hash: jobData.escrow_tx_hash || null,
      status: jobData.status || 'open',
      deadline: jobData.deadline || null,
      experience_level: jobData.experience_level || 'intermediate',
      project_duration: jobData.project_duration || null,
      number_of_milestones: jobData.number_of_milestones || 1,
      bids_count: 0,
      views_count: 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    setJobs(prev => [...prev, newJob]);
    return newJob;
  };

  const updateJob = async (jobId: string, updates: Partial<Job>): Promise<Job | null> => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, ...updates, updated_at: getCurrentTimestamp() }
        : job
    ));
    return getJob(jobId);
  };

  // Bid methods
  const getBidsForJob = (jobId: string): Bid[] => {
    return bids.filter(bid => bid.job_id === jobId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getBidsForFreelancer = (freelancerWallet: string): Bid[] => {
    return bids.filter(bid => bid.freelancer_wallet === freelancerWallet)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const createBid = async (bidData: Partial<Bid>): Promise<Bid> => {
    const newBid: Bid = {
      id: generateId(),
      job_id: bidData.job_id || '',
      freelancer_wallet: bidData.freelancer_wallet || '',
      proposed_amount: bidData.proposed_amount || 0,
      stake_amount: bidData.stake_amount || 0,
      stake_tx_hash: bidData.stake_tx_hash || null,
      cover_letter: bidData.cover_letter || null,
      estimated_timeline: bidData.estimated_timeline || null,
      proposed_milestones: bidData.proposed_milestones || null,
      status: bidData.status || 'pending',
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    setBids(prev => [...prev, newBid]);
    
    // Update job's bid count
    if (bidData.job_id) {
      await updateJob(bidData.job_id, { 
        bids_count: getBidsForJob(bidData.job_id).length + 1 
      });
    }

    return newBid;
  };

  const updateBid = async (bidId: string, updates: Partial<Bid>): Promise<Bid | null> => {
    setBids(prev => prev.map(bid => 
      bid.id === bidId 
        ? { ...bid, ...updates, updated_at: getCurrentTimestamp() }
        : bid
    ));
    return bids.find(bid => bid.id === bidId) || null;
  };

  // Contract methods
  const getContractsForWallet = (walletAddress: string, status?: string): Contract[] => {
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

  const getContract = (contractId: string): Contract | null => {
    return contracts.find(contract => contract.id === contractId) || null;
  };

  const createContract = async (contractData: Partial<Contract>): Promise<Contract> => {
    const newContract: Contract = {
      id: generateId(),
      job_id: contractData.job_id || '',
      bid_id: contractData.bid_id || null,
      client_wallet: contractData.client_wallet || '',
      freelancer_wallet: contractData.freelancer_wallet || '',
      total_amount: contractData.total_amount || 0,
      escrow_amount: contractData.escrow_amount || 0,
      escrow_tx_hash: contractData.escrow_tx_hash || null,
      contract_type: contractData.contract_type || 'fixed',
      hourly_rate: contractData.hourly_rate || null,
      hours_allocated: contractData.hours_allocated || null,
      payment_schedule: contractData.payment_schedule || null,
      status: contractData.status || 'pending',
      start_date: contractData.start_date || getCurrentTimestamp(),
      end_date: contractData.end_date || null,
      completion_date: contractData.completion_date || null,
      dispute_reason: contractData.dispute_reason || null,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    setContracts(prev => [...prev, newContract]);
    return newContract;
  };

  const updateContract = async (contractId: string, updates: Partial<Contract>): Promise<Contract | null> => {
    setContracts(prev => prev.map(contract => 
      contract.id === contractId 
        ? { ...contract, ...updates, updated_at: getCurrentTimestamp() }
        : contract
    ));
    return getContract(contractId);
  };

  // Rating methods
  const getRatingsForWallet = (walletAddress: string): Rating[] => {
    return ratings.filter(rating => rating.rated_wallet === walletAddress && rating.is_public)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const createRating = async (ratingData: Partial<Rating>): Promise<Rating> => {
    const newRating: Rating = {
      id: generateId(),
      contract_id: ratingData.contract_id || '',
      rater_wallet: ratingData.rater_wallet || '',
      rated_wallet: ratingData.rated_wallet || '',
      rating: ratingData.rating || 5,
      quality_rating: ratingData.quality_rating || null,
      communication_rating: ratingData.communication_rating || null,
      timeliness_rating: ratingData.timeliness_rating || null,
      review_text: ratingData.review_text || null,
      would_recommend: ratingData.would_recommend || true,
      is_public: ratingData.is_public !== undefined ? ratingData.is_public : true,
      created_at: getCurrentTimestamp(),
    };

    setRatings(prev => [...prev, newRating]);
    return newRating;
  };

  const value: DataContextType = {
    profiles,
    jobs,
    bids,
    contracts,
    ratings,
    getProfile,
    createProfile,
    updateProfile,
    getJobs,
    getJob,
    createJob,
    updateJob,
    getBidsForJob,
    getBidsForFreelancer,
    createBid,
    updateBid,
    getContractsForWallet,
    getContract,
    createContract,
    updateContract,
    getRatingsForWallet,
    createRating,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
