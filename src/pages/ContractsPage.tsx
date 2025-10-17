import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWallet } from '../contexts/WalletContext';

interface ContractsPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export const ContractsPage: React.FC<ContractsPageProps> = ({ onNavigate }) => {
  const { walletAddress } = useWallet();
  const [contracts, setContracts] = useState<any[]>([]);
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
    let query = supabase
      .from('contracts')
      .select('*, jobs(*)')
      .or(`client_wallet.eq.${walletAddress},freelancer_wallet.eq.${walletAddress}`)
      .order('created_at', { ascending: false });

    if (activeTab === 'active') {
      query = query.in('status', ['pending', 'active']);
    } else if (activeTab === 'completed') {
      query = query.eq('status', 'completed');
    }

    const { data, error } = await query;

    if (!error && data) {
      setContracts(data);
    }
    setLoading(false);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Contracts</h1>
          <p className="text-gray-600">
            Manage your active and completed smart contracts
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Completed' },
                { key: 'all', label: 'All' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'active'
                ? "You don't have any active contracts yet"
                : "You don't have any contracts in this category"}
            </p>
            <button
              onClick={() => onNavigate('jobs')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const isClient = contract.client_wallet === walletAddress;
              const role = isClient ? 'Client' : 'Freelancer';

              return (
                <div
                  key={contract.id}
                  onClick={() => onNavigate('contract-detail', { contractId: contract.id })}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                          {contract.jobs?.title || 'Contract'}
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
                      <div className="text-sm text-gray-500 mb-2">
                        Your role: <span className="font-medium text-gray-700">{role}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${contract.total_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {contract.contract_type}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Start Date</div>
                      <div className="font-medium text-gray-900">
                        {new Date(contract.start_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Escrow Amount</div>
                      <div className="font-medium text-gray-900">
                        ${contract.escrow_amount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Payment Type</div>
                      <div className="font-medium text-gray-900 capitalize">
                        {contract.contract_type}
                      </div>
                    </div>
                  </div>

                  {contract.status === 'active' && (
                    <div className="mt-4 flex justify-end">
                      <button className="text-blue-600 font-medium hover:text-blue-700 text-sm">
                        View Details →
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
