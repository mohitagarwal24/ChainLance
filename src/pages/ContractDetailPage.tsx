import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, Upload, FileText, Eye, Bot, DollarSign } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useContractData, EnhancedContract, EnhancedJob } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { useData, Profile, Job } from '../contexts/DataContext';
import { Milestone as ContractMilestone } from '../services/contractService';

export const ContractDetailPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { walletAddress } = useWallet();
  const { getContract, getJob, contractService, contracts, updateContractMilestones } = useContractData();
  const { getProfile, getJob: getJobFromData } = useData();
  const [contract, setContract] = useState<EnhancedContract | null>(null);
  const [job, setJob] = useState<EnhancedJob | null>(null);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMilestone, setSubmittingMilestone] = useState<number | null>(null);
  const [approvingMilestone, setApprovingMilestone] = useState<number | null>(null);
  const [milestoneSubmissions, setMilestoneSubmissions] = useState<{ [key: number]: string }>({});
  const [processedMilestones, setProcessedMilestones] = useState<ContractMilestone[]>([]);
  const [workSubmissions, setWorkSubmissions] = useState<any[]>([]);
  const [claimingPayment, setClaimingPayment] = useState(false);
  const [approvingWork, setApprovingWork] = useState(false);
  const [settingASIVerification, setSettingASIVerification] = useState(false);

  // Convert and validate milestone data
  const processContractMilestones = (milestones: ContractMilestone[], jobBudget: number, contractType?: string): ContractMilestone[] => {
    console.log('📋 Processing milestones:', { milestones, jobBudget, contractType });
    
    // Check if we need to create default milestones
    const needsDefaultMilestones = !milestones || milestones.length === 0 || 
      (contractType === 'milestone' && milestones.some(m => 
        !m.name || m.name === 'Milestone' || m.name.trim() === '' || 
        m.amount < jobBudget * 0.05 // Less than 5% of budget suggests invalid data
      ));
    
    if (needsDefaultMilestones && contractType === 'milestone' && jobBudget > 0) {
      console.log('📋 Creating/replacing with default milestones for milestone contract');
      const defaultMilestones: ContractMilestone[] = [
        {
          name: 'Project Setup & Planning',
          amount: jobBudget * 0.3,
          description: 'Initial project setup, requirements analysis, and development plan',
          status: 0, // pending
          submissionDate: 0,
          approvalDeadline: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
          asiVerified: false,
          deliverableHash: ''
        },
        {
          name: 'Core Development',
          amount: jobBudget * 0.5,
          description: 'Implementation of main features and functionality',
          status: 0, // pending
          submissionDate: 0,
          approvalDeadline: Math.floor((Date.now() + 21 * 24 * 60 * 60 * 1000) / 1000),
          asiVerified: false,
          deliverableHash: ''
        },
        {
          name: 'Testing & Deployment',
          amount: jobBudget * 0.2,
          description: 'Final testing, bug fixes, and production deployment',
          status: 0, // pending
          submissionDate: 0,
          approvalDeadline: Math.floor((Date.now() + 28 * 24 * 60 * 60 * 1000) / 1000),
          asiVerified: false,
          deliverableHash: ''
        }
      ];
      
      // Save the default milestones to the contract
      if (contractId) {
        console.log('📋 Saving default milestones to contract:', defaultMilestones);
        updateContractMilestones(contractId, defaultMilestones);
      }
      
      return defaultMilestones;
    }
    
    if (!milestones || milestones.length === 0) {
      console.log('📋 No milestones found and not a milestone contract');
      return [];
    }
    
    // Check if milestone amounts are reasonable compared to job budget
    const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
    console.log(`📋 Milestone validation: Total amount: ${totalAmount}, Job budget: ${jobBudget}`);
    console.log('📋 Milestones:', milestones);
    
    // More lenient validation - check if total amount is at least 1% of budget or if milestones have valid structure
    const hasValidAmounts = totalAmount > jobBudget * 0.01; // At least 1% of budget
    const hasValidStructure = milestones.every(m => m.name && typeof m.amount === 'number');
    
    if (!hasValidAmounts && !hasValidStructure) {
      console.warn('Invalid milestone data detected:', { totalAmount, jobBudget, milestones });
      return [];
    }
    
    console.log(`📋 Validated ${milestones.length} milestones successfully`);
    return milestones;
  };

  // Load work submissions from localStorage
  const loadWorkSubmissions = () => {
    try {
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const contractSubmissions = existingSubmissions.filter((sub: any) => 
        sub.contractId.toString() === contractId
      );
      setWorkSubmissions(contractSubmissions);
      console.log('📋 Loaded work submissions for contract:', contractId, contractSubmissions);
    } catch (error) {
      console.error('Error loading work submissions:', error);
      setWorkSubmissions([]);
    }
  };

  useEffect(() => {
    loadContractDetails();
  }, [contractId]);

  // Refresh contract details when contracts data changes (after milestone updates)
  useEffect(() => {
    if (contractId) {
      console.log('🔄 Contracts data changed, refreshing contract details');
      loadContractDetails();
    }
  }, [contracts]);

  // Refresh when the page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && contractId) {
        console.log('🔄 Page became visible, refreshing contract details');
        loadContractDetails();
      }
    };

    const handleFocus = () => {
      if (contractId) {
        console.log('🔄 Window focused, refreshing contract details');
        loadContractDetails();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [contractId]);

  // Refresh when location changes (navigation back from milestone page)
  useEffect(() => {
    if (contractId && location.pathname === `/contract/${contractId}`) {
      console.log('🔄 Navigated back to contract page, refreshing data');
      loadContractDetails();
    }
  }, [location.pathname, contractId]);

  // Listen for work submission updates
  useEffect(() => {
    const handleSubmissionUpdate = () => {
      console.log('🔄 Work submission updated, refreshing submissions');
      loadWorkSubmissions();
    };

    window.addEventListener('submissionStatusUpdated', handleSubmissionUpdate);
    
    return () => {
      window.removeEventListener('submissionStatusUpdated', handleSubmissionUpdate);
    };
  }, [contractId]);

  const loadContractDetails = async () => {
    try {
      setLoading(true);
      
      // Get contract details
      const contractData = getContract(String(contractId));
      if (!contractData) {
        console.error('Contract not found:', contractId);
        return;
      }
      setContract(contractData);

      // Get job details - try multiple approaches
      let jobData: EnhancedJob | null = getJob(String(contractData.job_id));
      
      // If not found, try DataContext
      if (!jobData) {
        const dataContextJob: Job | null = getJobFromData(String(contractData.job_id));
        if (dataContextJob) {
          // Convert Job to EnhancedJob format
          jobData = {
            // From Job (keeping original properties)
            id: dataContextJob.id,
            client: dataContextJob.client_wallet,
            title: dataContextJob.title,
            description: dataContextJob.description,
            category: dataContextJob.category,
            requiredSkills: dataContextJob.required_skills,
            budget: dataContextJob.budget,
            escrowDeposit: dataContextJob.escrow_deposit,
            deadline: dataContextJob.deadline ? Math.floor(new Date(dataContextJob.deadline).getTime() / 1000) : 0,
            experienceLevel: dataContextJob.experience_level,
            projectDuration: dataContextJob.project_duration,
            numberOfMilestones: dataContextJob.number_of_milestones,
            bidsCount: dataContextJob.bids_count,
            viewsCount: dataContextJob.views_count,
            createdAt: Math.floor(new Date(dataContextJob.created_at).getTime() / 1000),
            updatedAt: Math.floor(new Date(dataContextJob.updated_at).getTime() / 1000),

            // Enhanced properties (mapped from Job)
            contract_type: dataContextJob.contract_type,
            status: dataContextJob.status,
            client_wallet: dataContextJob.client_wallet,
            required_skills: dataContextJob.required_skills,
            escrow_tx_hash: dataContextJob.escrow_tx_hash,
            deadline_date: dataContextJob.deadline,
            experience_level: dataContextJob.experience_level,
            project_duration: dataContextJob.project_duration,
            number_of_milestones: dataContextJob.number_of_milestones,
            bids_count: dataContextJob.bids_count,
            views_count: dataContextJob.views_count,
            created_at: dataContextJob.created_at,
            updated_at: dataContextJob.updated_at
          } as unknown as EnhancedJob;
        }
      }
      
      // If still not found, try direct fetch
      if (!jobData && contractService) {
        try {
          const directJob = await contractService.getJob(parseInt(contractData.job_id));
          if (directJob) {
            // Convert ContractJob to EnhancedJob format
            jobData = {
              // From ContractJob (keeping original properties)
              id: directJob.id,
              client: directJob.client,
              title: directJob.title,
              description: directJob.description,
              category: directJob.category,
              requiredSkills: directJob.requiredSkills,
              budget: directJob.budget,
              escrowDeposit: directJob.escrowDeposit,
              deadline: directJob.deadline,
              experienceLevel: directJob.experienceLevel,
              projectDuration: directJob.projectDuration,
              numberOfMilestones: directJob.numberOfMilestones,
              bidsCount: directJob.bidsCount,
              viewsCount: directJob.viewsCount,
              createdAt: directJob.createdAt,
              updatedAt: directJob.updatedAt,

              // Enhanced properties (mapped from ContractJob)
              contract_type: directJob.contractType === 0 ? 'fixed' : directJob.contractType === 1 ? 'hourly' : 'milestone',
              status: directJob.status === 1 ? 'open' : directJob.status === 2 ? 'in_progress' : 'completed',
              client_wallet: directJob.client,
              required_skills: directJob.requiredSkills,
              escrow_tx_hash: null,
              deadline_date: directJob.deadline ? new Date(directJob.deadline * 1000).toISOString() : null,
              experience_level: directJob.experienceLevel as 'beginner' | 'intermediate' | 'expert',
              project_duration: directJob.projectDuration,
              number_of_milestones: directJob.numberOfMilestones,
              bids_count: directJob.bidsCount,
              views_count: directJob.viewsCount,
              created_at: new Date(directJob.createdAt * 1000).toISOString(),
              updated_at: new Date(directJob.updatedAt * 1000).toISOString()
            } as unknown as EnhancedJob;
          }
        } catch (error) {
          console.error('Error fetching job directly:', error);
        }
      }
      
      if (jobData) {
        console.log('Found job data:', jobData);
        setJob(jobData);
        
        // Process milestones with job budget validation
        if (jobData.budget) {
          const validMilestones = processContractMilestones(contractData.milestones || [], jobData.budget, contractData.contract_type);
          setProcessedMilestones(validMilestones);
          console.log('Final processed milestones:', validMilestones);
        } else {
          console.log('No milestones to process:', { 
            hasMilestones: !!contractData.milestones, 
            hasJobBudget: !!jobData.budget,
            contractType: contractData.contract_type 
          });
          setProcessedMilestones([]);
        }
      } else {
        console.error('Could not find job data for ID:', contractData.job_id);
      }

      // Get profiles
      const client = getProfile(contractData.client_wallet);
      const freelancer = getProfile(contractData.freelancer_wallet);
      setClientProfile(client);
      setFreelancerProfile(freelancer);

      // Load work submissions
      loadWorkSubmissions();

    } catch (error) {
      console.error('Error loading contract details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneIndex: number) => {
    if (!contract || !contractService) return;
    
    const deliverableHash = milestoneSubmissions[milestoneIndex];
    if (!deliverableHash) {
      alert('Please provide a deliverable hash/URL');
      return;
    }

    setSubmittingMilestone(milestoneIndex);
    try {
      await contractService.submitMilestone(Number(contractId), milestoneIndex, deliverableHash);
      alert('Milestone submitted successfully! The client will be notified for review.');
      loadContractDetails(); // Refresh contract data
    } catch (error) {
      console.error('Error submitting milestone:', error);
      alert('Error submitting milestone. Please try again.');
    } finally {
      setSubmittingMilestone(null);
    }
  };

  const handleApproveMilestone = async (milestoneIndex: number) => {
    if (!contract || !contractService) return;

    setApprovingMilestone(milestoneIndex);
    try {
      await contractService.approveMilestone(Number(contractId), milestoneIndex);
      alert('Milestone approved! Payment has been released to the freelancer.');
      loadContractDetails(); // Refresh contract data
    } catch (error) {
      console.error('Error approving milestone:', error);
      alert('Error approving milestone. Please try again.');
    } finally {
      setApprovingMilestone(null);
    }
  };

  const handleAutoRelease = async (milestoneIndex: number) => {
    if (!contractService || !contract) return;

    try {
      await contractService.approveMilestone(contract.id, milestoneIndex);
      await loadContractDetails();
    } catch (error) {
      console.error('Error triggering auto-release:', error);
    }
  };

  const handleApproveWork = async () => {
    if (!contractService || !contract) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to approve this work? This will release the remaining 80% of the payment to the freelancer.'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('Client approving work for contract', contract.id);
      await contractService.approveWork(contract.id);
      
      // Refresh contract details
      await loadContractDetails();
      
      alert('Work approved successfully! Full payment has been released to the freelancer.');
    } catch (error: any) {
      console.error('Failed to approve work:', error);
      alert(`Failed to approve work: ${error.message}`);
    }
  };

  const handleRequestRevisions = async () => {
    if (!contractService || !contract) return;
    
    const revisionNotes = window.prompt(
      'Please describe what changes you would like the freelancer to make:'
    );
    
    if (!revisionNotes) return;
    
    try {
      console.log('Requesting revisions for contract', contract.id);
      await contractService.requestRevisions(contract.id, revisionNotes);
      
      alert('Revision request sent to the freelancer. They will be notified about the required changes.');
    } catch (error: any) {
      console.error('Failed to request revisions:', error);
      alert(`Failed to request revisions: ${error.message}`);
    }
  };

  const handleRevokeContract = async () => {
    if (!contractService || !contract) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to revoke this contract? This will:\n' +
      '• Give 20% of the contract amount to the freelancer\n' +
      '• Refund 80% to you\n' +
      '• Mark the contract as cancelled\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('Client revoking contract', contract.id);
      await contractService.revokeContract(contract.id);
      
      // Refresh contract details
      await loadContractDetails();
      
      alert('Contract revoked successfully! Refunds have been processed.');
    } catch (error: any) {
      console.error('Failed to revoke contract:', error);
      alert(`Failed to revoke contract: ${error.message}`);
    }
  };

  const handleClaimASIPayment = async () => {
    if (!contractService || !contract || !job) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to claim your 20% ASI verification payment?\n\n` +
      `Amount: $${(job.budget * 0.2).toLocaleString()}\n` +
      `This will release the payment that was approved by ASI agents.`
    );
    
    if (!confirmed) return;
    
    setClaimingPayment(true);
    try {
      console.log('Freelancer claiming 20% ASI payment for contract', contract.id);
      console.log('Contract type:', contract.contract_type);
      
      // Handle different contract types for payment release
      if (contract.contract_type === 'milestone') {
        // For milestone contracts, use autoReleaseMilestone with the first milestone
        console.log('📋 Releasing payment for milestone contract...');
        await contractService.autoReleaseMilestone(contract.id, 0);
      } else {
        // For fixed contracts with new two-milestone structure
        console.log('📝 Fixed contract detected - claiming 20% ASI verification payment...');
        
        try {
          // Check if work has been submitted (milestones created)
          // If not, we need to submit work first to create the milestone structure
          console.log('🔄 Step 1: Ensuring work is submitted and milestones exist...');
          
          try {
            // Try to claim ASI verified payment directly (this will fail if milestones don't exist or aren't verified)
            await contractService.claimASIVerifiedPayment(contract.id, 0);
            console.log('✅ Successfully claimed 20% ASI verified payment directly');
          } catch (claimError: any) {
            if (claimError.message?.includes('Invalid milestone index')) {
              console.log('📤 Milestones not found, submitting work first...');
              // Submit work to create the two-milestone structure
              await contractService.submitFixedWork(contract.id, 'asi_approved_payment_claim');
              console.log('✅ Work submitted, milestones created');
              
              // Verify the first milestone
              await contractService.verifyMilestone(contract.id, 0, true);
              console.log('✅ ASI verification set on first milestone');
              
              // Now claim the payment
              await contractService.claimASIVerifiedPayment(contract.id, 0);
              console.log('✅ Successfully claimed 20% ASI verified payment');
            } else if (claimError.message?.includes('Milestone not verified by ASI agents')) {
              console.log('🔄 Milestone exists but not verified, setting ASI verification...');
              // Verify the first milestone
              await contractService.verifyMilestone(contract.id, 0, true);
              console.log('✅ ASI verification set');
              
              // Now claim the payment
              await contractService.claimASIVerifiedPayment(contract.id, 0);
              console.log('✅ Successfully claimed 20% ASI verified payment');
            } else {
              throw claimError;
            }
          }
        } catch (fixedError: any) {
          console.error('❌ Failed to process fixed contract payment:', fixedError);
          
          if (fixedError.message?.includes('Only freelancer can submit work') || fixedError.message?.includes('Only freelancer can claim payment')) {
            throw new Error(
              'Only the freelancer can submit work and claim payments for this contract.'
            );
          } else if (fixedError.message?.includes('Contract not in progress')) {
            throw new Error(
              'This contract is not in progress. Work may have already been submitted or the contract may be completed.'
            );
          } else {
            // Re-throw other errors with more context
            throw new Error(`Fixed contract payment failed: ${fixedError.message}`);
          }
        }
      }
      
      // Update the work submission status to reflect payment claimed
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const submissionIndex = existingSubmissions.findIndex((sub: any) => 
        sub.contractId.toString() === contractId
      );
      
      if (submissionIndex !== -1) {
        existingSubmissions[submissionIndex].paymentClaimed = true;
        existingSubmissions[submissionIndex].paymentClaimedAt = new Date().toISOString();
        existingSubmissions[submissionIndex].status = 'payment_claimed';
        localStorage.setItem('asi_submissions', JSON.stringify(existingSubmissions));
        
        // Refresh work submissions
        loadWorkSubmissions();
      }
      
      // Refresh contract details
      await loadContractDetails();
      
      alert(`Successfully claimed $${(job.budget * 0.2).toLocaleString()} ASI verification payment!`);
    } catch (error: any) {
      console.error('Failed to claim ASI payment:', error);
      alert(`Failed to claim payment: ${error.message}`);
    } finally {
      setClaimingPayment(false);
    }
  };

  const handleSetASIVerification = async () => {
    if (!contractService || !contract || !contractId) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to set ASI verification on-chain?\n\n' +
      'This will confirm that ASI agents have approved your work and allow you to claim the 20% payment.'
    );
    
    if (!confirmed) return;
    
    setSettingASIVerification(true);
    try {
      // First submit fixed work to create milestone structure
      await contractService.submitFixedWork(parseInt(contractId), 'asi_approved_manual');
      
      // Then set ASI verification flag
      await contractService.setASIVerification(parseInt(contractId), 0);
      
      // Refresh contract details
      await loadContractDetails();
      
      alert('ASI verification set successfully! You can now claim your 20% payment.');
    } catch (error: any) {
      console.error('Failed to set ASI verification:', error);
      alert(`Failed to set ASI verification: ${error.message}`);
    } finally {
      setSettingASIVerification(false);
    }
  };

  const handleSetASIVerificationAndClaim = async () => {
    if (!contractService || !contract || !contractId || !job) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to confirm ASI approval and claim your 20% payment?\n\n` +
      `Amount: $${(job.budget * 0.2).toLocaleString()}\n` +
      `This will set ASI verification on-chain and immediately claim the payment.`
    );
    
    if (!confirmed) return;
    
    setSettingASIVerification(true);
    setClaimingPayment(true);
    try {
      // Step 1: Submit fixed work to create milestone structure
      await contractService.submitFixedWork(parseInt(contractId), 'asi_approved_manual');
      
      // Step 2: Set ASI verification flag
      await contractService.setASIVerification(parseInt(contractId), 0);
      
      // Step 3: Claim payment
      await contractService.claimASIVerifiedPayment(parseInt(contractId), 0);
      
      // Update work submission status
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const submissionIndex = existingSubmissions.findIndex((sub: any) => 
        sub.contractId.toString() === contractId
      );
      
      if (submissionIndex !== -1) {
        existingSubmissions[submissionIndex].paymentClaimed = true;
        existingSubmissions[submissionIndex].paymentClaimedAt = new Date().toISOString();
        existingSubmissions[submissionIndex].status = 'payment_claimed';
        localStorage.setItem('asi_submissions', JSON.stringify(existingSubmissions));
        
        // Refresh work submissions
        loadWorkSubmissions();
      }
      
      // Refresh contract details
      await loadContractDetails();
      
      alert(`Successfully confirmed ASI approval and claimed $${(job.budget * 0.2).toLocaleString()} payment!`);
    } catch (error: any) {
      console.error('Failed to set ASI verification and claim payment:', error);
      alert(`Failed to process ASI verification and payment claim: ${error.message}`);
    } finally {
      setSettingASIVerification(false);
      setClaimingPayment(false);
    }
  };

  const handleApproveFixedWork = async () => {
    if (!contractService || !contract || !job) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to approve this work and release the final payment?\n\n` +
      `Amount: $${(job.budget * 0.8).toLocaleString()} (80% of job budget)\n` +
      `This will complete the contract and release the remaining payment to the freelancer.`
    );
    
    if (!confirmed) return;
    
    setApprovingWork(true);
    try {
      console.log('Client approving fixed work for contract', contract.id);
      
      // Call the smart contract function to approve final work
      await contractService.approveFixedWork(contract.id);
      
      // Refresh contract details
      await loadContractDetails();
      
      alert(`Successfully approved work and released $${(job.budget * 0.8).toLocaleString()} final payment!`);
    } catch (error: any) {
      console.error('Failed to approve fixed work:', error);
      alert(`Failed to approve work: ${error.message}`);
    } finally {
      setApprovingWork(false);
    }
  };

  const getMilestoneStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-gray-100 text-gray-800'; // pending
      case 1: return 'bg-yellow-100 text-yellow-800'; // submitted
      case 2: return 'bg-green-100 text-green-800'; // approved
      case 3: return 'bg-red-100 text-red-800'; // rejected
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestoneStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Submitted';
      case 2: return 'Approved';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  };

  const isClient = contract?.client_wallet?.toLowerCase() === walletAddress?.toLowerCase();
  const isFreelancer = contract?.freelancer_wallet?.toLowerCase() === walletAddress?.toLowerCase();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Contract not found</h2>
        <p className="text-gray-400 mb-6">
          Contract ID "{contractId}" could not be found.
        </p>
        <button
          onClick={() => navigate('/contracts')}
          className="btn-primary"
        >
          Back to Contracts
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Contracts
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Overview */}
            <div className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {job?.title || 'Contract Details'}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Contract ID: #{contract.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMilestoneStatusColor(contract.status === 'active' ? 1 : 0)}`}>
                      {contract.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    ${job?.budget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 capitalize">
                    {contract.contract_type} contract
                  </div>
                </div>
              </div>

              {job && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Project Description</h3>
                  <p className="text-gray-400">{job.description}</p>
                </div>
              )}
            </div>

            {/* Work Submission Section for Freelancers */}
            {isFreelancer && contract.status === 'active' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Submit Work for ASI Agent Verification</h3>
                  <div className="flex items-center text-sm text-purple-400">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    AI-Powered Verification
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">🤖 ASI Agent Verification Process</h4>
                  <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-300">
                    <div>
                      <div className="font-medium text-purple-300">1. Multi-Agent Review</div>
                      <div>3 specialist AI agents analyze your work</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-300">2. Quality Assessment</div>
                      <div>MeTTa reasoning provides structured evaluation</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-300">3. Automatic Payment</div>
                      <div>20% released on agent approval</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/contract/${contract.id}/submit`)}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Submit Work for AI Verification
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-400">
                    <FileText className="w-4 h-4 mr-1" />
                    Upload deliverables & get instant AI feedback
                  </div>
                </div>
              </div>
            )}

            {/* Client Work Review Section */}
            {isClient && contract.status === 'active' && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Work Review & Approval</h3>
                
                <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">💰 Payment Process</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <div className="font-medium text-blue-300">Agent Approval (20%)</div>
                      <div>Automatic release when AI agents approve work</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-300">Your Approval (80%)</div>
                      <div>Final review and approval for remaining payment</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveWork()}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Approve Work & Release Payment
                  </button>
                  
                  <button
                    onClick={() => handleRequestRevisions()}
                    className="flex items-center px-4 py-3 border border-yellow-600 text-yellow-400 rounded-lg hover:bg-yellow-600 hover:text-white transition-colors"
                  >
                    Request Revisions
                  </button>
                  
                  <button
                    onClick={() => handleRevokeContract()}
                    className="flex items-center px-4 py-3 border border-red-600 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Revoke Contract
                  </button>
                </div>
              </div>
            )}

            {/* Work Submission Status - Show if there are any work submissions */}
            {workSubmissions.length > 0 && (() => {
              // Get the latest submission (most recent by timestamp)
              const latestSubmission = workSubmissions.reduce((latest, current) => {
                const latestTime = new Date(latest.asiReviewStarted || latest.submissionTimestamp || 0).getTime();
                const currentTime = new Date(current.asiReviewStarted || current.submissionTimestamp || 0).getTime();
                return currentTime > latestTime ? current : latest;
              });

              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'pending_asi_review':
                    return 'bg-gray-900/20 text-gray-400 border-gray-600';
                  case 'under_asi_review':
                    return 'bg-blue-900/20 text-blue-400 border-blue-600';
                  case 'asi_approved':
                  case 'payment_released':
                    return 'bg-green-900/20 text-green-400 border-green-600';
                  case 'payment_claimed':
                    return 'bg-emerald-900/20 text-emerald-400 border-emerald-600';
                  case 'asi_rejected':
                    return 'bg-red-900/20 text-red-400 border-red-600';
                  default:
                    return 'bg-gray-900/20 text-gray-400 border-gray-600';
                }
              };

              const getStatusText = (status: string) => {
                switch (status) {
                  case 'pending_asi_review':
                    return 'Pending ASI Review';
                  case 'under_asi_review':
                    return 'Under ASI Review';
                  case 'asi_approved':
                    return 'ASI Approved';
                  case 'payment_released':
                    return 'Payment Released (20%)';
                  case 'payment_claimed':
                    return 'Payment Claimed';
                  case 'asi_rejected':
                    return 'ASI Rejected';
                  default:
                    return 'Unknown Status';
                }
              };

              return (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Bot className="w-6 h-6 text-purple-400 mr-3" />
                      <h3 className="text-xl font-bold text-white">Latest Work Submission</h3>
                    </div>
                    {workSubmissions.length > 1 && (
                      <span className="text-sm text-gray-400">
                        Latest of {workSubmissions.length} submissions
                      </span>
                    )}
                  </div>

                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">
                            Submission #{latestSubmission.submissionId?.slice(-8) || '1'}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(latestSubmission.status)}`}>
                            {getStatusText(latestSubmission.status)}
                          </span>
                        </div>
                        
                        {latestSubmission.description && (
                          <p className="text-sm text-gray-400 mb-2">{latestSubmission.description}</p>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Submitted: {new Date(latestSubmission.asiReviewStarted || latestSubmission.submissionTimestamp).toLocaleString()}
                        </div>
                        
                        {latestSubmission.deliverables && latestSubmission.deliverables.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-400 mb-1">Deliverables:</div>
                            <div className="flex flex-wrap gap-1">
                              {latestSubmission.deliverables.slice(0, 3).map((deliverable: any, idx: number) => (
                                <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                                  {deliverable.name || `File ${idx + 1}`}
                                </span>
                              ))}
                              {latestSubmission.deliverables.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{latestSubmission.deliverables.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ASI Agent Results */}
                    {latestSubmission.asiReviewResult && (
                      <div className="mt-3 p-3 bg-gray-800 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-300">ASI Agent Analysis</span>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {latestSubmission.asiReviewResult.agentCount && (
                              <span>{latestSubmission.asiReviewResult.agentCount} agents</span>
                            )}
                            {latestSubmission.asiReviewResult.confidence && (
                              <span>{Math.round(latestSubmission.asiReviewResult.confidence * 100)}% confidence</span>
                            )}
                          </div>
                        </div>
                        
                        {latestSubmission.asiReviewResult.issues && latestSubmission.asiReviewResult.issues.length > 0 && (
                          <div className="text-sm text-gray-300">
                            {latestSubmission.asiReviewResult.issues.slice(0, 2).map((issue: string, idx: number) => (
                              <div key={idx} className="text-xs text-gray-400 mb-1">• {issue}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Notification for Freelancers */}
                    {isFreelancer && job && (
                      <>
                        {/* Auto-Released Payment Notification */}
                        {latestSubmission.status === 'payment_released' && latestSubmission.autoPaymentReleased && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-lg border border-emerald-700">
                            <div className="flex items-center text-emerald-400 mb-2">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <span className="font-medium">Payment Automatically Released!</span>
                            </div>
                            <p className="text-sm text-emerald-300">
                              ASI agents approved your work and automatically released your 20% verification payment 
                              (${(job.budget * 0.2).toLocaleString()}) to your wallet. No action needed!
                            </p>
                          </div>
                        )}
                        
                        {/* Manual Claim Payment Notification */}
                        {(latestSubmission.status === 'asi_approved' || (latestSubmission.status === 'payment_released' && !latestSubmission.autoPaymentReleased)) && !latestSubmission.paymentClaimed && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg border border-green-700">
                            <div className="flex items-center text-green-400 mb-2">
                              <DollarSign className="w-5 h-5 mr-2" />
                              <span className="font-medium">Payment Ready to Claim!</span>
                            </div>
                            <p className="text-sm text-green-300">
                              ASI agents have approved your work. You can now claim your 20% verification payment 
                              (${(job.budget * 0.2).toLocaleString()}) from the smart contract escrow.
                              {contract?.contract_type === 'fixed' && (
                                <span className="block mt-1 text-yellow-300 text-xs">
                                  Note: Fixed contracts require milestone structure for PYUSD transfers.
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex justify-end gap-3">
                      {/* Claim Payment Button for Freelancers - Only show if payment wasn't automatically released */}
                      {isFreelancer && (latestSubmission.status === 'asi_approved' || (latestSubmission.status === 'payment_released' && !latestSubmission.autoPaymentReleased)) && !latestSubmission.paymentClaimed && (
                        <button
                          onClick={handleClaimASIPayment}
                          disabled={claimingPayment}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {claimingPayment ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Claim 20% Payment
                            </>
                          )}
                        </button>
                      )}

                      {/* ASI Verification Buttons - Show when ASI agents approved but not yet set on-chain */}
                      {isFreelancer && latestSubmission.status === 'asi_approved' && !latestSubmission.paymentClaimed && (
                        <>
                          <button
                            onClick={handleSetASIVerificationAndClaim}
                            disabled={settingASIVerification || claimingPayment}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {settingASIVerification || claimingPayment ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirm ASI Approval & Claim 20%
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={handleSetASIVerification}
                            disabled={settingASIVerification}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {settingASIVerification ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Setting...
                              </>
                            ) : (
                              <>
                                <Bot className="w-4 h-4 mr-2" />
                                Set ASI Verification Only
                              </>
                            )}
                          </button>
                        </>
                      )}
                      
                      {/* Client Approve Work Button - Only for fixed contracts after ASI payment */}
                      {!isFreelancer && contract?.contract_type === 'fixed' && latestSubmission.status === 'payment_released' && contract.status !== 'completed' && (
                        <button
                          onClick={handleApproveFixedWork}
                          disabled={approvingWork}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {approvingWork ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve Work & Release 80%
                            </>
                          )}
                        </button>
                      )}

                      {/* Payment Claimed Status */}
                      {isFreelancer && latestSubmission.paymentClaimed && (
                        <div className="flex items-center px-4 py-2 bg-green-900/20 text-green-400 rounded-lg border border-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Payment Claimed
                        </div>
                      )}
                      
                      <button
                        onClick={() => navigate(`/contract/${contractId}/submission-status`)}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Status
                      </button>
                    </div>
                  </div>

                  {/* Summary for clients */}
                  {isClient && (latestSubmission.status === 'payment_released' || latestSubmission.status === 'asi_approved') && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg border border-green-700">
                      <div className="flex items-center text-green-400 mb-2">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Work Ready for Your Review</span>
                      </div>
                      <p className="text-sm text-green-300">
                        ASI agents have approved submitted work and released 20% payment to the freelancer. 
                        Please review the work and approve for final 80% payment release.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Milestones - Only show for milestone contracts */}
            {contract?.contract_type === 'milestone' && job?.budget ? (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Milestones</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        console.log('🔄 Manual refresh triggered');
                        loadContractDetails();
                      }}
                      className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Refresh
                    </button>
                    <button
                      onClick={() => navigate(`/contract/${contract.id}/milestones`)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Manage Milestones
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {processedMilestones.length > 0 ? processedMilestones.map((milestone, index) => (
                    <div key={index} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{milestone.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{milestone.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            ${milestone.amount.toLocaleString()}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                            {getMilestoneStatusText(milestone.status)}
                          </span>
                        </div>
                      </div>

                      {/* Milestone Actions for Freelancer */}
                      {isFreelancer && milestone.status === 0 && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Deliverable URL/Hash
                            </label>
                            <input
                              type="text"
                              value={milestoneSubmissions[index] || ''}
                              onChange={(e) => setMilestoneSubmissions({
                                ...milestoneSubmissions,
                                [index]: e.target.value
                              })}
                              placeholder="https://github.com/... or IPFS hash"
                              className="input w-full"
                            />
                          </div>
                          <button
                            onClick={() => handleSubmitMilestone(index)}
                            disabled={submittingMilestone === index || !milestoneSubmissions[index]}
                            className="btn-primary disabled:opacity-50"
                          >
                            {submittingMilestone === index ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin mr-2" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Submit Milestone
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Milestone Actions for Client */}
                      {isClient && milestone.status === 1 && (
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => handleApproveMilestone(index)}
                            disabled={approvingMilestone === index}
                            className="btn-primary disabled:opacity-50"
                          >
                            {approvingMilestone === index ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin mr-2" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve & Release Payment
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Deliverable Info */}
                      {milestone.deliverableHash && (
                        <div className="mt-3 p-3 bg-gray-800 rounded">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <FileText className="w-4 h-4" />
                            <span>Deliverable:</span>
                            <a 
                              href={milestone.deliverableHash.startsWith('http') ? milestone.deliverableHash : `#${milestone.deliverableHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 break-all"
                            >
                              {milestone.deliverableHash}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Auto-release info */}
                      {milestone.status === 1 && milestone.approvalDeadline && (
                        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                          <div className="text-sm text-yellow-300">
                            Auto-release in: {new Date(milestone.approvalDeadline * 1000).toLocaleString()}
                          </div>
                          {Date.now() > milestone.approvalDeadline * 1000 && (
                            <button
                              onClick={() => handleAutoRelease(index)}
                              className="mt-2 btn-secondary text-sm"
                            >
                              Trigger Auto-Release
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )) : (
                    /* Show milestone setup message when no milestones exist */
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Milestones Need Setup</h4>
                      <p className="text-gray-400 mb-4">
                        This milestone contract needs proper milestone configuration. Click "Manage Milestones" to set up the milestone structure.
                      </p>
                      <p className="text-sm text-yellow-400">
                        Job Budget: ${job?.budget?.toLocaleString() || 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}


            {/* Completed Contract Summary - Only show for completed contracts */}
            {contract?.status === 'completed' && job?.budget ? (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">Contract Completed</h3>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-900/20 text-green-400">
                    ✓ Finished
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="font-bold text-green-400">${job.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Paid to:</span>
                    <span className="font-mono text-white text-xs">
                      {contract.freelancer_wallet}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Completed:</span>
                    <span className="text-white">
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Freelancer Stake:</span>
                  <span className="text-white font-medium">${contract.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Job Budget:</span>
                  <span className="text-white font-medium">${job?.budget.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="text-white font-medium">${((job?.budget || 0) + contract.total_amount).toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Start Date:</span>
                  <span className="text-white font-medium">
                    {new Date(contract.start_date).toLocaleDateString()}
                  </span>
                </div>
                {contract.end_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">End Date:</span>
                    <span className="text-white font-medium">
                      {new Date(contract.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Client Info */}
            {clientProfile && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {isClient ? 'You (Client)' : 'Client'}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {clientProfile.display_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {clientProfile.display_name || 'Anonymous Client'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {clientProfile.average_rating > 0 ? `${clientProfile.average_rating.toFixed(1)} ⭐` : 'No ratings yet'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Freelancer Info */}
            {freelancerProfile && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {isFreelancer ? 'You (Freelancer)' : 'Freelancer'}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {freelancerProfile.display_name?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {freelancerProfile.display_name || 'Anonymous Freelancer'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {freelancerProfile.average_rating > 0 ? `${freelancerProfile.average_rating.toFixed(1)} ⭐` : 'No ratings yet'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
