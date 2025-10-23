import React, { useState, useEffect } from 'react';
import { Briefcase, Bell, User, Menu, X, LogOut, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletAddress, connectWallet, disconnectWallet, userProfile, isConnecting, availableAccounts, switchAccount, refreshAccounts } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (walletAddress && availableAccounts.length === 0) {
      refreshAccounts();
    }
  }, [walletAddress]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="flex items-center space-x-2 text-xl font-bold gradient-text hover:scale-105 transition-transform duration-200"
            >
              <Briefcase className="w-7 h-7 text-blue-500" />
              <span>ChainLance</span>
            </Link>

            <nav className="hidden md:flex space-x-6">
              <Link
                to="/jobs"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/jobs'
                    ? 'text-blue-400'
                    : 'text-gray-300 hover:text-blue-400'
                }`}
              >
                Find Work
              </Link>
              <Link
                to="/contracts"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/contracts'
                    ? 'text-blue-400'
                    : 'text-gray-300 hover:text-blue-400'
                }`}
              >
                Contracts
              </Link>
              <Link
                to="/messages"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/messages'
                    ? 'text-blue-400'
                    : 'text-gray-300 hover:text-blue-400'
                }`}
              >
                Messages
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {walletAddress ? (
              <>
                <button
                  onClick={() => navigate('/notifications')}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {userProfile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-300">
                      {userProfile?.display_name || truncateAddress(walletAddress)}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 card rounded-lg shadow-2xl py-2 z-50">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
                      >
                        Settings
                      </button>
                      
                      {availableAccounts.length > 1 && (
                        <>
                          <hr className="my-2 border-gray-700" />
                          <div className="px-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Switch Account</span>
                              <button
                                onClick={refreshAccounts}
                                className="p-1 text-gray-500 hover:text-gray-300 rounded"
                                title="Refresh accounts"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {availableAccounts.map((account) => (
                                <button
                                  key={account}
                                  onClick={() => {
                                    if (account !== walletAddress) {
                                      switchAccount(account);
                                    }
                                    setUserMenuOpen(false);
                                  }}
                                  className={`w-full px-2 py-1 text-left text-xs rounded transition-colors ${
                                    account === walletAddress
                                      ? 'bg-blue-900 text-blue-200'
                                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                  }`}
                                >
                                  {truncateAddress(account)}
                                  {account === walletAddress && (
                                    <span className="ml-2 text-blue-400 text-[10px]">(current)</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      
                      <hr className="my-2 border-gray-700" />
                      <div className="px-4 py-2 text-xs text-gray-500">
                        Current: {truncateAddress(walletAddress)}
                      </div>
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/post-job')}
                  className="hidden md:block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Post a Job
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-blue-400"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800 glass">
          <nav className="px-4 py-4 space-y-2">
            <Link
              to="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              Find Work
            </Link>
            <Link
              to="/contracts"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              Contracts
            </Link>
            <Link
              to="/messages"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              Messages
            </Link>
            {walletAddress && (
              <button
                onClick={() => {
                  navigate('/post-job');
                  setMobileMenuOpen(false);
                }}
                className="btn-primary w-full"
              >
                Post a Job
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
