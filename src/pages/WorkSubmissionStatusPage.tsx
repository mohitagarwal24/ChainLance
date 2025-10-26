import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Bot,
  User,
  RefreshCw
} from 'lucide-react';
import { useContractData } from '../contexts/ContractDataContext';
import { useWeb3 } from '../contexts/Web3Context';
import { ASIAgentVerificationTracker } from '../components/ASIAgentVerificationTracker';
import { ContractService } from '../services/contractService';

interface WorkSubmission {
  id: string;
  contract_id: string;
  deliverables: any[];
  description: string;
  submission_timestamp: string;
  status: 'submitted' | 'agent_review' | 'agent_approved' | 'client_review' | 'completed' | 'revision_requested';
  agent_verification?: {
    status: 'pending' | 'in_progress' | 'completed';
    approved?: boolean;
    payment_released?: boolean;
  };
  client_approval?: {
    status: 'pending' | 'approved' | 'revision_requested';
    feedback?: string;
  };
}

export const WorkSubmissionStatusPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { getContract, getJobDirect } = useContractData();
  const { contracts: web3Contracts } = useWeb3();
  
  const [contract, setContract] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [submission, setSubmission] = useState<WorkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingASIVerification, setSettingASIVerification] = useState(false);
  const [claimingPayment, setClaimingPayment] = useState(false);
  const [contractService, setContractService] = useState<ContractService | null>(null);

  // Initialize contract service when Web3 contracts are available
  useEffect(() => {
    if (web3Contracts.chainLanceCore && web3Contracts.pyusdToken && web3Contracts.reputationSystem && web3Contracts.asiAgentVerifier) {
      const service = new ContractService({
        chainLanceCore: web3Contracts.chainLanceCore,
        pyusdToken: web3Contracts.pyusdToken,
        reputationSystem: web3Contracts.reputationSystem,
        asiAgentVerifier: web3Contracts.asiAgentVerifier
      });
      setContractService(service);
    }
  }, [web3Contracts]);

  const loadData = async () => {
      if (contractId) {
        const contractData = getContract(contractId);
        if (contractData) {
          setContract(contractData);
          
          const jobData = await getJobDirect(contractData.job_id);
          if (jobData) {
            setJob(jobData);
          }

          // Load real submission data from localStorage - get the LATEST submission for this contract
          const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
          const contractSubmissions = existingSubmissions.filter((sub: any) => 
            sub.contractId.toString() === contractId.toString()
          );
          
          // Get the most recent submission (latest submissionId)
          const contractSubmission = contractSubmissions.length > 0 
            ? contractSubmissions.sort((a: any, b: any) => b.submissionId.localeCompare(a.submissionId))[0]
            : null;

          if (contractSubmission) {
            console.log('📋 Found real submission data:', contractSubmission);
            console.log('📋 Submission status:', contractSubmission.status);
            console.log('📋 Payment released:', contractSubmission.paymentReleased);
            
            // Convert ASI submission data to WorkSubmission format
            const realSubmission: WorkSubmission = {
              id: contractSubmission.submissionId,
              contract_id: contractId,
              deliverables: contractSubmission.deliverables || [],
              description: contractSubmission.description || 'Work submission',
              submission_timestamp: contractSubmission.submissionTimestamp || contractSubmission.asiReviewStarted,
              status: contractSubmission.status === 'payment_released' ? 'client_review' : 
                     contractSubmission.status === 'asi_approved' ? 'agent_approved' :
                     contractSubmission.status === 'asi_rejected' ? 'revision_requested' :
                     contractSubmission.status === 'under_asi_review' ? 'agent_review' : 'submitted',
              agent_verification: {
                status: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved' ? 'completed' :
                       contractSubmission.status === 'under_asi_review' ? 'in_progress' : 'pending',
                approved: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved',
                payment_released: contractSubmission.paymentReleased || false
              },
              client_approval: {
                status: contractSubmission.status === 'payment_released' ? 'pending' : 'pending'
              }
            };

            console.log('📋 Final submission object:', realSubmission);
            console.log('📋 Should show ASI buttons?', realSubmission.status === 'agent_approved' && realSubmission.agent_verification?.approved && !realSubmission.agent_verification?.payment_released);
            
            setSubmission(realSubmission);
          } else {
            // No submission found - create placeholder
            const placeholderSubmission: WorkSubmission = {
              id: `work_${contractId}_placeholder`,
              contract_id: contractId,
              deliverables: [],
              description: "No submission found",
              submission_timestamp: new Date().toISOString(),
              status: 'submitted',
              agent_verification: {
                status: 'pending',
                approved: false,
                payment_released: false
              },
              client_approval: {
                status: 'pending'
              }
            };

            setSubmission(placeholderSubmission);
          }
        }
      }
      setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [contractId, getContract, getJobDirect]);

  // Separate useEffect for auto-refresh to avoid circular dependencies
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have a contractId and submission is still in progress
      if (contractId && submission && (submission.status === 'agent_review' || submission.status === 'submitted')) {
        // Reload submission data from localStorage - get the LATEST submission
        const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
        const contractSubmissions = existingSubmissions.filter((sub: any) => 
          sub.contractId.toString() === contractId.toString()
        );
        const contractSubmission = contractSubmissions.length > 0 
          ? contractSubmissions.sort((a: any, b: any) => b.submissionId.localeCompare(a.submissionId))[0]
          : null;

        if (contractSubmission && contractSubmission.status !== submission.status) {
          // console.log('🔄 Status changed - updating UI:', contractSubmission.status);
          
          const realSubmission: WorkSubmission = {
            id: contractSubmission.submissionId,
            contract_id: contractId,
            deliverables: contractSubmission.deliverables || [],
            description: contractSubmission.description || 'Work submission',
            submission_timestamp: contractSubmission.submissionTimestamp || contractSubmission.asiReviewStarted,
            status: contractSubmission.status === 'payment_released' ? 'client_review' : 
                   contractSubmission.status === 'asi_approved' ? 'agent_approved' :
                   contractSubmission.status === 'asi_rejected' ? 'revision_requested' :
                   contractSubmission.status === 'under_asi_review' ? 'agent_review' : 'submitted',
            agent_verification: {
              status: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved' ? 'completed' :
                     contractSubmission.status === 'under_asi_review' ? 'in_progress' : 'pending',
              approved: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved',
              payment_released: contractSubmission.paymentReleased || false
            },
            client_approval: {
              status: contractSubmission.status === 'payment_released' ? 'pending' : 'pending'
            }
          };

          setSubmission(realSubmission);
        }
      }
    }, 10000); // Refresh every 10 seconds, only when needed

    return () => clearInterval(interval);
  }, [contractId, submission]); // Depend on contractId and submission

  // Listen for immediate submission status updates
  useEffect(() => {
    const handleSubmissionUpdate = (event: CustomEvent) => {
      if (event.detail.contractId.toString() === contractId?.toString()) {
        // console.log('🔔 Received immediate submission status update:', event.detail);
        
        // Immediately refresh the submission data - get the LATEST submission
        const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
        const contractSubmissions = existingSubmissions.filter((sub: any) => 
          sub.contractId.toString() === contractId?.toString()
        );
        const contractSubmission = contractSubmissions.length > 0 
          ? contractSubmissions.sort((a: any, b: any) => b.submissionId.localeCompare(a.submissionId))[0]
          : null;

        if (contractSubmission && contractId) {
          const realSubmission: WorkSubmission = {
            id: contractSubmission.submissionId,
            contract_id: contractId,
            deliverables: contractSubmission.deliverables || [],
            description: contractSubmission.description || 'Work submission',
            submission_timestamp: contractSubmission.submissionTimestamp || contractSubmission.asiReviewStarted,
            status: contractSubmission.status === 'payment_released' ? 'client_review' : 
                   contractSubmission.status === 'asi_approved' ? 'agent_approved' :
                   contractSubmission.status === 'asi_rejected' ? 'revision_requested' :
                   contractSubmission.status === 'under_asi_review' ? 'agent_review' : 'submitted',
            agent_verification: {
              status: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved' ? 'completed' :
                     contractSubmission.status === 'under_asi_review' ? 'in_progress' : 'pending',
              approved: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved',
              payment_released: contractSubmission.paymentReleased || false
            },
            client_approval: {
              status: contractSubmission.status === 'payment_released' ? 'pending' : 'pending'
            }
          };

          setSubmission(realSubmission);
          console.log('✅ UI immediately updated with new submission status');
        }
      }
    };

    window.addEventListener('submissionStatusUpdated', handleSubmissionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('submissionStatusUpdated', handleSubmissionUpdate as EventListener);
    };
  }, [contractId]);

  const handleAgentVerificationComplete = (approved: boolean, paymentReleased: boolean) => {
    setSubmission(prev => prev ? {
      ...prev,
      status: approved ? 'client_review' : 'revision_requested',
      agent_verification: {
        status: 'completed',
        approved,
        payment_released: paymentReleased
      }
    } : null);
  };

  const handleResubmitWork = () => {
    navigate(`/contract/${contractId}/submit`);
  };

  const handleSetASIVerification = async () => {
    if (!contractId || !contractService) return;
    
    setSettingASIVerification(true);
    try {
      // First submit fixed work to create milestone structure
      await contractService.submitFixedWork(parseInt(contractId), 'asi_approved_manual');
      
      // Then set ASI verification flag
      const txHash = await contractService.setASIVerification(parseInt(contractId), 0);
      console.log('✅ ASI verification set successfully:', txHash);
      
      // Refresh the page data
      await loadData();
      
      alert('ASI verification set successfully! You can now claim your 20% payment.');
    } catch (error) {
      console.error('❌ Failed to set ASI verification:', error);
      alert('Failed to set ASI verification. Please try again.');
    } finally {
      setSettingASIVerification(false);
    }
  };

  const handleClaimPayment = async () => {
    if (!contractId || !contractService) return;
    
    setClaimingPayment(true);
    try {
      const txHash = await contractService.claimASIVerifiedPayment(parseInt(contractId), 0);
      console.log('✅ Payment claimed successfully:', txHash);
      
      // Refresh the page data
      await loadData();
      
      alert('20% payment claimed successfully!');
    } catch (error) {
      console.error('❌ Failed to claim payment:', error);
      alert('Failed to claim payment. Please try again.');
    } finally {
      setClaimingPayment(false);
    }
  };

  const handleSetASIVerificationAndClaim = async () => {
    if (!contractId || !contractService) return;
    
    setSettingASIVerification(true);
    setClaimingPayment(true);
    try {
      // Step 1: Submit fixed work to create milestone structure
      await contractService.submitFixedWork(parseInt(contractId), 'asi_approved_manual');
      
      // Step 2: Set ASI verification flag
      await contractService.setASIVerification(parseInt(contractId), 0);
      
      // Step 3: Claim payment
      const txHash = await contractService.claimASIVerifiedPayment(parseInt(contractId), 0);
      console.log('✅ ASI verification set and payment claimed successfully:', txHash);
      
      // Refresh the page data
      await loadData();
      
      alert('ASI verification set and 20% payment claimed successfully!');
    } catch (error) {
      console.error('❌ Failed to set ASI verification and claim payment:', error);
      alert('Failed to process ASI verification and payment claim. Please try again.');
    } finally {
      setSettingASIVerification(false);
      setClaimingPayment(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    if (contractId) {
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const contractSubmission = existingSubmissions.find((sub: any) => 
        sub.contractId.toString() === contractId.toString()
      );

      if (contractSubmission) {
        const realSubmission: WorkSubmission = {
          id: contractSubmission.submissionId,
          contract_id: contractId,
          deliverables: contractSubmission.deliverables || [],
          description: contractSubmission.description || 'Work submission',
          submission_timestamp: contractSubmission.submissionTimestamp || contractSubmission.asiReviewStarted,
          status: contractSubmission.status === 'payment_released' ? 'client_review' : 
                 contractSubmission.status === 'asi_approved' ? 'agent_approved' :
                 contractSubmission.status === 'asi_rejected' ? 'revision_requested' :
                 contractSubmission.status === 'under_asi_review' ? 'agent_review' : 'submitted',
          agent_verification: {
            status: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved' ? 'completed' :
                   contractSubmission.status === 'under_asi_review' ? 'in_progress' : 'pending',
            approved: contractSubmission.status === 'payment_released' || contractSubmission.status === 'asi_approved',
            payment_released: contractSubmission.paymentReleased || false
          },
          client_approval: {
            status: contractSubmission.status === 'payment_released' ? 'pending' : 'pending'
          }
        };

        setSubmission(realSubmission);
      }
    }
    
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'submitted': { color: 'bg-blue-900 text-blue-400', text: 'Submitted' },
      'agent_review': { color: 'bg-yellow-900 text-yellow-400', text: 'Agent Review' },
      'agent_approved': { color: 'bg-green-900 text-green-400', text: 'Agent Approved' },
      'client_review': { color: 'bg-purple-900 text-purple-400', text: 'Client Review' },
      'completed': { color: 'bg-green-900 text-green-400', text: 'Completed' },
      'revision_requested': { color: 'bg-red-900 text-red-400', text: 'Revision Requested' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading submission status...</div>
      </div>
    );
  }

  if (!contract || !job || !submission) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Submission Not Found</h2>
          <p>Could not load work submission details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/contract/${contractId}`)}
              className="flex items-center text-gray-400 hover:text-white mr-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Contract
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Work Submission Status</h1>
              <p className="text-gray-400">Contract #{contractId} • {job.title}</p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        {/* Status Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Submission Overview</h2>
            {getStatusBadge(submission.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">${job?.budget?.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Total Contract Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                ${submission.agent_verification?.payment_released ? (job?.budget * 0.2)?.toLocaleString() : '0'}
              </div>
              <div className="text-gray-400 text-sm">Released (20%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                ${(job?.budget * 0.8)?.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Pending (80% + Stake)</div>
            </div>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6">Workflow Progress</h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-600"></div>
            
            <div className="space-y-8">
              {/* Step 1: Work Submitted */}
              <div className="flex items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="ml-6">
                  <h3 className="text-lg font-semibold text-white">Work Submitted</h3>
                  <p className="text-gray-400">Freelancer submitted deliverables for review</p>
                  <p className="text-sm text-gray-500">
                    {new Date(submission.submission_timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Step 2: ASI Agent Review */}
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                  submission.agent_verification?.status === 'completed' 
                    ? 'bg-green-600' 
                    : submission.agent_verification?.status === 'in_progress'
                    ? 'bg-blue-600'
                    : 'bg-gray-600'
                }`}>
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div className="ml-6">
                  <h3 className="text-lg font-semibold text-white">ASI Agent Verification</h3>
                  <p className="text-gray-400">
                    {submission.agent_verification?.status === 'completed'
                      ? submission.agent_verification.approved 
                        ? '✅ Agents approved work - 20% payment released'
                        : '❌ Agents requested revisions'
                      : submission.agent_verification?.status === 'in_progress'
                      ? '🔄 Agents are reviewing the work...'
                      : '⏳ Waiting for agent review'
                    }
                  </p>
                  {submission.agent_verification?.payment_released && (
                    <div className="mt-2 p-2 bg-green-900/20 border border-green-700 rounded text-green-400 text-sm">
                      💰 ${(job?.budget * 0.2)?.toLocaleString()} released to freelancer
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Client Review */}
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                  submission.client_approval?.status === 'approved' 
                    ? 'bg-green-600' 
                    : submission.status === 'client_review'
                    ? 'bg-blue-600'
                    : 'bg-gray-600'
                }`}>
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="ml-6">
                  <h3 className="text-lg font-semibold text-white">Client Final Approval</h3>
                  <p className="text-gray-400">
                    {submission.client_approval?.status === 'approved'
                      ? '✅ Client approved - final payment + stake returned'
                      : submission.status === 'client_review'
                      ? '⏳ Awaiting client final approval'
                      : '⏸️ Pending agent approval'
                    }
                  </p>
                  {submission.status === 'client_review' && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700 rounded text-blue-400 text-sm">
                      💰 ${(job?.budget * 0.8)?.toLocaleString()} + freelancer stake pending
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ASI Agent Verification Tracker */}
        <ASIAgentVerificationTracker
          workId={submission.id}
          isVisible={submission.status === 'agent_review' || submission.status === 'client_review'}
          onVerificationComplete={handleAgentVerificationComplete}
        />

        {/* Submitted Work Details */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Submitted Work</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300">{submission.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Deliverables</h3>
            <div className="space-y-2">
              {submission.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-blue-400 mr-3" />
                    <div>
                      <div className="text-white font-medium">{deliverable.name || 'Deliverable'}</div>
                      <div className="text-gray-400 text-sm">
                        {deliverable.type || 'file'} • {deliverable.size ? `${(deliverable.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={deliverable.ipfsUrl || deliverable.ipfs_url || deliverable.url || deliverable.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {/* ASI Verification Buttons - Show when ASI agents approved but not yet set on-chain */}
          {submission.status === 'agent_approved' && submission.agent_verification?.approved && !submission.agent_verification?.payment_released && (
            <>
              <button
                onClick={handleSetASIVerificationAndClaim}
                disabled={settingASIVerification || claimingPayment}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingASIVerification || claimingPayment ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                {settingASIVerification || claimingPayment ? 'Processing...' : 'Confirm ASI Approval & Claim 20%'}
              </button>
              
              <button
                onClick={handleSetASIVerification}
                disabled={settingASIVerification}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingASIVerification ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Bot className="w-5 h-5 mr-2" />
                )}
                {settingASIVerification ? 'Setting...' : 'Set ASI Verification Only'}
              </button>
            </>
          )}

          {/* Manual Claim Button - Show when ASI verification is set but payment not claimed */}
          {submission.status === 'agent_approved' && submission.agent_verification?.approved && !submission.agent_verification?.payment_released && (
            <button
              onClick={handleClaimPayment}
              disabled={claimingPayment}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claimingPayment ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {claimingPayment ? 'Claiming...' : 'Claim 20% Payment'}
            </button>
          )}

          {submission.status === 'revision_requested' && (
            <button
              onClick={handleResubmitWork}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Resubmit Work
            </button>
          )}
          
          <button
            onClick={() => navigate(`/contract/${contractId}`)}
            className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Contract
          </button>
        </div>
      </div>
    </div>
  );
};
