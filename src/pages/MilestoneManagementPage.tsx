import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Upload, MessageSquare } from 'lucide-react';
import { useContractData } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { MilestoneSetup, Milestone as UIMilestone } from '../components/MilestoneSetup';
import { Milestone as ContractMilestone } from '../services/contractService';

export const MilestoneManagementPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getContract, getJobDirect, updateContractMilestones } = useContractData();
  
  const [contract, setContract] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [milestones, setMilestones] = useState<UIMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Convert ContractMilestone to UIMilestone
  const convertContractMilestoneToUI = (contractMilestone: ContractMilestone, index: number, totalBudget: number): UIMilestone => {
    const statusMap = {
      0: 'pending' as const,
      1: 'submitted' as const,
      2: 'approved' as const,
      3: 'completed' as const
    };

    // Handle deadline conversion properly - if it's 0 or invalid, use a future date
    let deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (contractMilestone.approvalDeadline && contractMilestone.approvalDeadline > 0) {
      deadline = new Date(contractMilestone.approvalDeadline * 1000).toISOString().split('T')[0];
    }

    // Ensure amount is reasonable - if it's too small, it's likely wrong data
    let amount = contractMilestone.amount;
    let percentage = Math.round((amount / totalBudget) * 100);
    
    // If the amount seems wrong (too small compared to budget), don't use it
    if (amount < totalBudget * 0.01) { // Less than 1% of budget
      amount = 0;
      percentage = 0;
    }

    return {
      id: (index + 1).toString(),
      title: contractMilestone.name || `Milestone ${index + 1}`,
      description: contractMilestone.description || '',
      amount: amount,
      percentage: percentage,
      deadline: deadline,
      deliverables: contractMilestone.deliverableHash ? [contractMilestone.deliverableHash] : [''],
      status: statusMap[contractMilestone.status as keyof typeof statusMap] || 'pending',
      order: index + 1
    };
  };

  useEffect(() => {
    const loadData = async () => {
      if (contractId) {
        const contractData = getContract(contractId);
        if (contractData) {
          setContract(contractData);
          setIsClient(contractData.client_wallet.toLowerCase() === walletAddress?.toLowerCase());
          
          const jobData = await getJobDirect(contractData.job_id);
          if (jobData) {
            setJob(jobData);
            
            // Load existing milestones or create default ones
            const existingMilestones = contractData.milestones || [];
            if (existingMilestones.length > 0) {
              // Convert ContractMilestones to UIMilestones
              const convertedMilestones = existingMilestones.map((milestone: ContractMilestone, index: number) => 
                convertContractMilestoneToUI(milestone, index, jobData.budget)
              );
              
              // Check if converted milestones have valid data (total amount should be reasonable)
              const totalConverted = convertedMilestones.reduce((sum, m) => sum + m.amount, 0);
              const isValidData = totalConverted > jobData.budget * 0.1; // At least 10% of budget
              
              if (isValidData) {
                setMilestones(convertedMilestones);
              } else {
                // Existing milestone data is invalid, create default ones
                setMilestones([]);
              }
            }
            // If no valid milestones exist, setMilestones([]) and let MilestoneSetup component create defaults
          }
        }
      }
      setLoading(false);
    };

    loadData();
  }, [contractId, getContract, getJobDirect, walletAddress]);

  const handleMilestonesChange = (updatedMilestones: UIMilestone[]) => {
    setMilestones(updatedMilestones);
    
    // Convert UI milestones back to contract milestone format and save to contract
    if (contractId) {
      const contractMilestones = updatedMilestones.map((milestone, index) => ({
        name: milestone.title,
        amount: milestone.amount,
        description: milestone.description,
        status: milestone.status === 'pending' ? 0 : milestone.status === 'submitted' ? 1 : milestone.status === 'approved' ? 2 : 3,
        submissionDate: 0,
        approvalDeadline: Math.floor(new Date(milestone.deadline).getTime() / 1000),
        asiVerified: false,
        deliverableHash: milestone.deliverables.join(',')
      }));
      
      updateContractMilestones(contractId, contractMilestones);
    }
  };

  const handleSubmitMilestone = (milestoneId: string) => {
    navigate(`/contract/${contractId}/submit?milestone=${milestoneId}`);
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    try {
      // In real implementation, this would call the smart contract
      console.log(`Approving milestone ${milestoneId} for contract ${contractId}`);
      
      // Update milestone status
      const updatedMilestones = milestones.map(m => 
        m.id === milestoneId ? { ...m, status: 'approved' as const } : m
      );
      setMilestones(updatedMilestones);
      
      // Show success message
      alert('Milestone approved! Payment has been released to the freelancer.');
    } catch (error) {
      console.error('Error approving milestone:', error);
      alert('Failed to approve milestone. Please try again.');
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-purple-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading milestone details...</div>
      </div>
    );
  }

  if (!contract || !job) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Contract Not Found</h2>
          <p>Could not load contract details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(`/contract/${contractId}`)}
            className="flex items-center text-gray-400 hover:text-white mr-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Contract
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Milestone Management</h1>
            <p className="text-gray-400">Contract #{contractId} • {job.title}</p>
          </div>
        </div>

        {/* Contract Overview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">${job.budget.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Total Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {milestones.filter(m => m.status === 'approved' || m.status === 'completed').length}
              </div>
              <div className="text-gray-400 text-sm">Approved Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {milestones.filter(m => m.status === 'submitted').length}
              </div>
              <div className="text-gray-400 text-sm">Pending Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                ${milestones.filter(m => m.status === 'approved' || m.status === 'completed')
                  .reduce((sum, m) => sum + m.amount, 0).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Released</div>
            </div>
          </div>
        </div>

        {/* Experience Highlight */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Accelerated Timeline with Experience</h3>
              <p className="text-gray-300 mb-3">
                With 3 years of industrial React.js experience, I can complete this project in <strong>half the specified duration</strong> 
                while maintaining high quality standards. My expertise allows for efficient implementation and fewer iterations.
              </p>
              <div className="flex items-center text-sm text-blue-400">
                <Clock className="w-4 h-4 mr-1" />
                Estimated completion: 3 weeks (50% faster than typical timeline)
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Setup/Display */}
        <MilestoneSetup
          totalBudget={job.budget}
          initialMilestones={milestones}
          onMilestonesChange={handleMilestonesChange}
          readOnly={contract.status !== 'pending'}
        />

        {/* Milestone Actions */}
        {contract.status === 'active' && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold text-white">Milestone Actions</h3>
            
            {milestones.map((milestone) => (
              <div key={milestone.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getMilestoneStatusIcon(milestone.status)}
                    <div className="ml-3">
                      <h4 className="font-semibold text-white">{milestone.title}</h4>
                      <p className="text-gray-400 text-sm">${milestone.amount.toLocaleString()} • {milestone.percentage}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Freelancer Actions */}
                    {!isClient && milestone.status === 'pending' && (
                      <button
                        onClick={() => handleSubmitMilestone(milestone.id)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Work
                      </button>
                    )}
                    
                    {!isClient && milestone.status === 'submitted' && (
                      <div className="text-yellow-400 text-sm">Awaiting client approval</div>
                    )}
                    
                    {/* Client Actions */}
                    {isClient && milestone.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleApproveMilestone(milestone.id)}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve & Release Payment
                        </button>
                        <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Request Changes
                        </button>
                      </>
                    )}
                    
                    {milestone.status === 'approved' && (
                      <div className="text-green-400 text-sm">✅ Approved & Paid</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => navigate(`/contract/${contractId}`)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Contract Details
          </button>
          
          {contract.status === 'pending' && !isClient && (
            <button
              onClick={() => {
                // Save milestones and proceed
                console.log('Saving milestones:', milestones);
                alert('Milestone plan saved! Client can now review and approve.');
                navigate(`/contract/${contractId}`);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Milestone Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
