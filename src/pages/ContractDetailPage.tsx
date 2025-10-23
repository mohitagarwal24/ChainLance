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
    if (!contract || !contractService) return;

    try {
      await contractService.autoReleaseMilestone(Number(contractId), milestoneIndex);
      alert('Milestone payment auto-released successfully!');
      loadContractDetails(); // Refresh contract data
    } catch (error) {
      console.error('Error auto-releasing milestone:', error);
      alert('Error auto-releasing milestone. Please try again.');
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
