import React, { createContext, useContext, useState, useEffect } from 'react';
import { Contract, BrowserProvider, Signer } from "ethers";
import { CONTRACTS, ABIS, NETWORK_CONFIG, validateContractConfig } from '../contracts/config';

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  contracts: {
    chainLanceCore: Contract | null;
    pyusdToken: Contract | null;
    reputationSystem: Contract | null;
    asiAgentVerifier: Contract | null;
    asiAgentOracle: Contract | null;
  };
  isInitialized: boolean;
  networkError: string | null;
  initializeContracts: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contracts, setContracts] = useState({
    chainLanceCore: null,
    pyusdToken: null,
    reputationSystem: null,
    asiAgentVerifier: null,
    asiAgentOracle: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      initializeProvider();
    }
  }, []);

  const initializeProvider = async () => {
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      // Check if wallet is already connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const signer = await browserProvider.getSigner();
        setSigner(signer);
        await initializeContracts(browserProvider, signer);
      }

      // Listen for account changes
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);
    } catch (error) {
      console.error('Error initializing provider:', error);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setSigner(null);
      setContracts({
        chainLanceCore: null,
        pyusdToken: null,
        reputationSystem: null,
        asiAgentVerifier: null,
        asiAgentOracle: null,
      });
      setIsInitialized(false);
    } else if (provider) {
      // User switched accounts
      const newSigner = await provider.getSigner();
      setSigner(newSigner);
      await initializeContracts(provider, newSigner);
    }
  };

  const handleChainChanged = () => {
    // Reload the page when chain changes
    window.location.reload();
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.CHAIN_ID.toString(16)}` }],
      });
      setNetworkError(null);
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${NETWORK_CONFIG.CHAIN_ID.toString(16)}`,
              chainName: NETWORK_CONFIG.NETWORK_NAME,
              rpcUrls: [NETWORK_CONFIG.RPC_URL],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            }],
          });
          setNetworkError(null);
        } catch (addError) {
          console.error('Error adding network:', addError);
          setNetworkError('Failed to add network');
        }
      } else {
        console.error('Error switching network:', error);
        setNetworkError('Failed to switch network');
      }
    }
  };

  const initializeContracts = async (
    web3Provider?: BrowserProvider, 
    web3Signer?: Signer
  ) => {
    try {
      const currentProvider = web3Provider || provider;
      const currentSigner = web3Signer || signer;

      if (!currentProvider || !currentSigner) {
        throw new Error('Provider or signer not available');
      }

      // Validate contract configuration
      if (!validateContractConfig()) {
        throw new Error('Invalid contract configuration');
      }

      // Check network
      const network = await currentProvider.getNetwork();
      if (Number(network.chainId) !== NETWORK_CONFIG.CHAIN_ID) {
        setNetworkError(`Please switch to ${NETWORK_CONFIG.NETWORK_NAME} network`);
        return;
      }

      // Initialize contracts
      const chainLanceCore = new Contract(
        CONTRACTS.CHAINLANCE_CORE,
        ABIS.CHAINLANCE_CORE,
        currentSigner
      );

      const pyusdToken = new Contract(
        CONTRACTS.PYUSD_TOKEN,
        ABIS.PYUSD_TOKEN,
        currentSigner
      );

      const reputationSystem = new Contract(
        CONTRACTS.REPUTATION_SYSTEM,
        ABIS.REPUTATION_SYSTEM,
        currentSigner
      );

      const asiAgentVerifier = new Contract(
        CONTRACTS.ASI_AGENT_VERIFIER,
        ABIS.ASI_AGENT_VERIFIER,
        currentSigner
      );

      const asiAgentOracle = new Contract(
        CONTRACTS.ASI_AGENT_ORACLE,
        ABIS.ASI_AGENT_ORACLE,
        currentSigner
      );

      setContracts({
        chainLanceCore,
        pyusdToken,
        reputationSystem,
        asiAgentVerifier,
        asiAgentOracle,
      });

      setIsInitialized(true);
      setNetworkError(null);
      
      console.log('Contracts initialized successfully');
    } catch (error) {
      console.error('Error initializing contracts:', error);
      setNetworkError('Failed to initialize contracts');
      setIsInitialized(false);
    }
  };

  // Initialize contracts when signer becomes available
  useEffect(() => {
    if (provider && signer && !isInitialized) {
      initializeContracts();
    }
  }, [provider, signer]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        contracts,
        isInitialized,
        networkError,
        initializeContracts,
        switchNetwork,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
