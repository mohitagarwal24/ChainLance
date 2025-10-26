import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContractData, EnhancedContract, EnhancedJob } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';

export const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getContractsForWallet, getJob, getJobDirect, refreshContracts, contractService } = useContractData();
  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [contractJobs, setContractJobs] = useState<{ [key: string]: EnhancedJob }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    if (walletAddress) {
      loadContracts();
    }
  }, [walletAddress, activeTab]);

  const loadContracts = async () => {
    if (!walletAddress) return;

    setLoading(true);

    console.log(`🔍 ContractsPage: Loading contracts for wallet: ${walletAddress}, tab: ${activeTab}`);
    
    // First refresh contracts from blockchain
    console.log(`🔄 ContractsPage: Refreshing contracts from blockchain...`);
    await refreshContracts();
    
    // Then get the filtered contracts
    const statusFilter = activeTab === 'all' ? undefined : activeTab;
    const contractsData = getContractsForWallet(walletAddress, statusFilter);
    console.log(`📋 ContractsPage: Found ${contractsData.length} contracts:`, contractsData);
    setContracts(contractsData);

    // Load job details for each contract
    const jobs: { [key: string]: EnhancedJob } = {};
    console.log(`🔍 ContractsPage: Loading job details for ${contractsData.length} contracts...`);
    
    for (const contract of contractsData) {
      console.log(`📋 ContractsPage: Loading job ${contract.job_id} for contract ${contract.id}`);
      
      // Try synchronous method first
      let job = getJob(contract.job_id);
      
      // If not found, try async method
      if (!job) {
        console.log(`⚠️ ContractsPage: Job ${contract.job_id} not found in cache, trying direct fetch...`);
        try {
          job = await getJobDirect(contract.job_id);
          console.log(`✅ ContractsPage: Job ${contract.job_id} fetched directly:`, job);
        } catch (error) {
          console.error(`❌ ContractsPage: Error fetching job ${contract.job_id}:`, error);
        }
      } else {
        console.log(`✅ ContractsPage: Job ${contract.job_id} found in cache:`, job);
      }
      
      if (job) {
        jobs[contract.job_id] = job;
        console.log(`💰 ContractsPage: Job ${contract.job_id} budget: ${job.budget}`);
      } else {
        console.warn(`⚠️ ContractsPage: Could not load job ${contract.job_id}`);
      }
    }
    
    console.log(`📊 ContractsPage: Loaded ${Object.keys(jobs).length} jobs:`, jobs);
    setContractJobs(jobs);

    setLoading(false);
  };

  const handleApproveWork = async (contractId: number) => {
    if (!contractService) return;
    
    try {
      console.log(`✅ Approving work for contract ${contractId}`);
      await contractService.approveWork(contractId);
      
      // Refresh contracts to show updated status
      await loadContracts();
      
      alert('Work approved successfully! Full payment has been released to the freelancer.');
    } catch (error: any) {
      console.error('Failed to approve work:', error);
      alert(`Failed to approve work: ${error.message}`);
    }
  };

  const handleRevokeContract = async (contractId: number) => {
    if (!contractService) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to revoke this contract? This will:\n' +
      '• Give 20% of the contract amount to the freelancer\n' +
      '• Refund 80% to you\n' +
      '• Mark the contract as cancelled\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      console.log(`❌ Revoking contract ${contractId}`);
      await contractService.revokeContract(contractId);
      
      // Refresh contracts to show updated status
      await loadContracts();
      
      alert('Contract revoked successfully! Refunds have been processed.');
    } catch (error: any) {
      console.error('Failed to revoke contract:', error);
      alert(`Failed to revoke contract: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'disputed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Contracts</h1>
          <p className="text-gray-400">
            Manage your active and completed smart contracts
          </p>
        </div>

        <div className="card p-6 mb-6">
          <div>
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Completed' },
                { key: 'all', label: 'All' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No contracts found</h3>
            <p className="text-gray-400">You don't have any contracts yet. Start by browsing jobs or posting a project.</p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const isClient = contract.client_wallet.toLowerCase() === walletAddress?.toLowerCase();
              const role = isClient ? 'Client' : 'Freelancer';

              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/contract/${contract.id}`)}
                  className="card card-hover p-6 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white hover:text-blue-400">
                          {contractJobs[contract.job_id]?.title || 'Contract'}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                            contract.status
                          )}`}
                        >
                          {getStatusIcon(contract.status)}
                          {contract.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        Your role: <span className="font-medium text-gray-300">{role}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-white">
                        ${contractJobs[contract.job_id]?.budget?.toLocaleString() || contract.escrow_amount?.toLocaleString() || contract.total_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400 capitalize">
                        {contractJobs[contract.job_id]?.budget ? 'Job Budget' : 'Escrow Amount'}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Start Date</div>
                      <div className="font-medium text-white">
                        {new Date(contract.start_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Job Budget</div>
                      <div className="font-medium text-white">
                        ${contractJobs[contract.job_id]?.budget?.toLocaleString() || contract.escrow_amount?.toLocaleString() || 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Freelancer Stake</div>
                      <div className="font-medium text-white">
                        ${contract.total_amount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Payment Type</div>
                      <div className="font-medium text-white">
                        {contract.contract_type}
                      </div>
                    </div>
                  </div>

                  {contract.status === 'active' && (
                    <div className="mt-4 flex justify-end space-x-3">
                      {/* Freelancer Actions */}
                      {!isClient && (
                        <button
                          onClick={() => navigate(`/contract/${contract.id}/submit`)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Submit Work
                        </button>
                      )}
                      
                      {/* Client Actions */}
                      {isClient && (
                        <>
                          <button
                            onClick={() => handleApproveWork(contract.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Work
                          </button>
                          <button
                            onClick={() => handleRevokeContract(contract.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Revoke Contract
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => navigate(`/contract/${contract.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
