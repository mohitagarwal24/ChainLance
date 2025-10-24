import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, Upload, FileText } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContractData, EnhancedContract, EnhancedJob } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { useData, Profile } from '../contexts/DataContext';

export const ContractDetailPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getContract, getJob, contractService } = useContractData();
  const { getProfile } = useData();
  const [contract, setContract] = useState<EnhancedContract | null>(null);
  const [job, setJob] = useState<EnhancedJob | null>(null);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMilestone, setSubmittingMilestone] = useState<number | null>(null);
  const [approvingMilestone, setApprovingMilestone] = useState<number | null>(null);
  const [milestoneSubmissions, setMilestoneSubmissions] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    loadContractDetails();
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

      // Get job details
      const jobData = getJob(contractData.job_id);
      if (jobData) {
        setJob(jobData);
      }

      // Get profiles
      const client = getProfile(contractData.client_wallet);
      const freelancer = getProfile(contractData.freelancer_wallet);
      setClientProfile(client);
      setFreelancerProfile(freelancer);

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
    if (!contractService) return;

    try {
      await contractService.approveMilestone(contract!.id, milestoneIndex);
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
      console.log(`✅ Client approving work for contract ${contract.id}`);
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
      console.log(`🔄 Requesting revisions for contract ${contract.id}`);
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
      console.log(`❌ Client revoking contract ${contract.id}`);
      await contractService.revokeContract(contract.id);
      
      // Refresh contract details
      await loadContractDetails();
      
      alert('Contract revoked successfully! Refunds have been processed.');
    } catch (error: any) {
      console.error('Failed to revoke contract:', error);
      alert(`Failed to revoke contract: ${error.message}`);
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
                    ${contract.total_amount.toLocaleString()}
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
            {(() => {
              console.log('🔍 ContractDetailPage: Checking work submission visibility');
              console.log('📊 isFreelancer:', isFreelancer);
              console.log('📊 contract.status:', contract?.status);
              console.log('📊 walletAddress:', walletAddress);
              console.log('📊 contract.freelancer_wallet:', contract?.freelancer_wallet);
              return null;
            })()}
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
                    onClick={() => navigate(`/submit-work/${contract.id}`)}
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

            {/* Milestones */}
            {contract.milestones && contract.milestones.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Milestones</h3>
                <div className="space-y-4">
                  {contract.milestones.map((milestone, index) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="text-white font-medium">${contract.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Escrow Amount:</span>
                  <span className="text-white font-medium">${contract.escrow_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Contract Type:</span>
                  <span className="text-white font-medium capitalize">{contract.contract_type}</span>
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
