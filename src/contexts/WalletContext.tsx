import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  userProfile: any | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
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
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      loadUserProfile(savedAddress);
    }
  }, []);

  const loadUserProfile = async (address: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', address)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
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

          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', address)
            .maybeSingle();

          if (!profile) {
            const { data: newProfile, error } = await supabase
              .from('profiles')
              .insert({
                wallet_address: address,
                role: 'both',
              })
              .select()
              .single();

            if (!error && newProfile) {
              profile = newProfile;
            }
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
    localStorage.removeItem('walletAddress');
  };

  const updateProfile = async (updates: any) => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (!error && data) {
      setUserProfile(data);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnecting,
        userProfile,
        connectWallet,
        disconnectWallet,
        updateProfile,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
