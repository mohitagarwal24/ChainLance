import { createContext, useContext, useState, useEffect } from 'react';
import { useData, Profile } from './DataContext';

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  userProfile: Profile | null;
  availableAccounts: string[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchAccount: (address: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const { getProfile, createProfile, updateProfile: updateProfileData } = useData();

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      loadUserProfile(savedAddress);
      refreshAccounts();
    }
  }, []);

  const loadUserProfile = async (address: string) => {
    const profile = getProfile(address);
    if (profile) {
      setUserProfile(profile);
    }
  };

  const refreshAccounts = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        setAvailableAccounts(accounts);
      } catch (error) {
        console.error('Error refreshing accounts:', error);
      }
    }
  };

  const switchAccount = async (address: string) => {
    if (!availableAccounts.includes(address)) {
      console.error('Address not found in available accounts');
      return;
    }

    try {
      setWalletAddress(address);
      localStorage.setItem('walletAddress', address);

      let profile = getProfile(address);

      if (!profile) {
        profile = await createProfile({
          wallet_address: address,
          role: 'both',
        });
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          localStorage.setItem('walletAddress', address);
          setAvailableAccounts(accounts);

          let profile = getProfile(address);

          if (!profile) {
            profile = await createProfile({
              wallet_address: address,
              role: 'both',
            });
          }

          setUserProfile(profile);
        }
      } else {
        alert('Please install MetaMask or another Web3 wallet to use this platform.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setUserProfile(null);
    setAvailableAccounts([]);
    localStorage.removeItem('walletAddress');
  };

  const updateProfile = async (updates: any) => {
    if (!walletAddress) return;

    const updatedProfile = await updateProfileData(walletAddress, updates);
    if (updatedProfile) {
      setUserProfile(updatedProfile);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnecting,
        userProfile,
        availableAccounts,
        connectWallet,
        disconnectWallet,
        switchAccount,
        refreshAccounts,
        updateProfile,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
