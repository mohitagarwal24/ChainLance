import React, { useState } from 'react';
import { Briefcase, Bell, User, Search, Menu, X, LogOut } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const { walletAddress, connectWallet, disconnectWallet, userProfile, isConnecting } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              <Briefcase className="w-7 h-7" />
              <span>ChainLance</span>
            </button>

            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => onNavigate('jobs')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'jobs'
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Find Work
              </button>
              <button
                onClick={() => onNavigate('my-jobs')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'my-jobs'
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                My Jobs
              </button>
              <button
                onClick={() => onNavigate('contracts')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'contracts'
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Contracts
              </button>
              <button
                onClick={() => onNavigate('messages')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'messages'
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Messages
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {walletAddress ? (
              <>
                <button
                  onClick={() => onNavigate('notifications')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {userProfile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {userProfile?.display_name || truncateAddress(walletAddress)}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('settings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings
                      </button>
                      <hr className="my-2" />
                      <div className="px-4 py-2 text-xs text-gray-500">
                        {truncateAddress(walletAddress)}
                      </div>
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onNavigate('post-job')}
                  className="hidden md:block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Post a Job
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-2">
            <button
              onClick={() => {
                onNavigate('jobs');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Find Work
            </button>
            <button
              onClick={() => {
                onNavigate('my-jobs');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              My Jobs
            </button>
            <button
              onClick={() => {
                onNavigate('contracts');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Contracts
            </button>
            <button
              onClick={() => {
                onNavigate('messages');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Messages
            </button>
            {walletAddress && (
              <button
                onClick={() => {
                  onNavigate('post-job');
                  setMobileMenuOpen(false);
                }}
                className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
