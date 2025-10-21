import React from 'react';
import { AlertCircle, CheckCircle, Loader, Wifi } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useWallet } from '../contexts/WalletContext';
import { NETWORK_CONFIG } from '../contracts/config';

export const NetworkStatus: React.FC = () => {
  const { isInitialized, networkError, switchNetwork } = useWeb3();
  const { walletAddress, connectWallet } = useWallet();

  if (!walletAddress) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <Wifi className="w-5 h-5 text-yellow-400" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-400">Wallet Not Connected</h3>
            <p className="text-sm text-yellow-300/80">
              Connect your wallet to interact with smart contracts
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-400">Network Error</h3>
            <p className="text-sm text-red-300/80">{networkError}</p>
            <p className="text-xs text-red-300/60 mt-1">
              Please switch to {NETWORK_CONFIG.NETWORK_NAME} network to continue
            </p>
          </div>
          <button
            onClick={switchNetwork}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <Loader className="w-5 h-5 text-blue-400 animate-spin" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-400">Initializing Contracts</h3>
            <p className="text-sm text-blue-300/80">
              Connecting to smart contracts on {NETWORK_CONFIG.NETWORK_NAME}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-400">Connected to {NETWORK_CONFIG.NETWORK_NAME}</h3>
          <p className="text-sm text-green-300/80">
            Smart contracts are ready for interaction
          </p>
        </div>
      </div>
    </div>
  );
};
