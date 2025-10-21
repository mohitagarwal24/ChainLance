// Contract configuration for ChainLance platform
import ChainLanceCoreABI from './abis/ChainLanceCore.json';
import MockPYUSDABI from './abis/MockPYUSD.json';
import ReputationSystemABI from './abis/ReputationSystem.json';
import ASIAgentVerifierABI from './abis/ASIAgentVerifier.json';
import ASIAgentOracleABI from './abis/ASIAgentOracle.json';

// Contract addresses from environment variables
export const CONTRACTS = {
  CHAINLANCE_CORE: import.meta.env.VITE_CHAINLANCE_CORE_ADDRESS,
  PYUSD_TOKEN: import.meta.env.VITE_PYUSD_TOKEN_ADDRESS,
  REPUTATION_SYSTEM: import.meta.env.VITE_REPUTATION_SYSTEM_ADDRESS,
  ASI_AGENT_VERIFIER: import.meta.env.VITE_ASI_AGENT_VERIFIER_ADDRESS,
  ASI_AGENT_ORACLE: import.meta.env.VITE_ASI_AGENT_ORACLE_ADDRESS,
} as const;

// Contract ABIs
export const ABIS = {
  CHAINLANCE_CORE: ChainLanceCoreABI,
  PYUSD_TOKEN: MockPYUSDABI,
  REPUTATION_SYSTEM: ReputationSystemABI,
  ASI_AGENT_VERIFIER: ASIAgentVerifierABI,
  ASI_AGENT_ORACLE: ASIAgentOracleABI,
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '11155111'),
  NETWORK_NAME: import.meta.env.VITE_NETWORK_NAME || 'Sepolia',
  RPC_URL: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // You may want to add this to env
} as const;

// Contract constants
export const CONTRACT_CONSTANTS = {
  MIN_ESCROW_DEPOSIT: 10, // 10% minimum
  MAX_ESCROW_DEPOSIT: 20, // 20% maximum
  STAKE_PERCENTAGE: 10, // 10% stake for bidding
  PLATFORM_FEE: 2.5, // 2.5% platform fee
  AUTO_RELEASE_DAYS: 14, // 14 days for auto-release
  PYUSD_DECIMALS: 6, // PYUSD has 6 decimals
} as const;

// Validation function to ensure all contracts are configured
export const validateContractConfig = (): boolean => {
  const requiredContracts = Object.values(CONTRACTS);
  const missingContracts = requiredContracts.filter(address => !address);
  
  if (missingContracts.length > 0) {
    console.error('Missing contract addresses:', missingContracts);
    return false;
  }
  
  return true;
};

// Helper function to format PYUSD amounts
export const formatPYUSDAmount = (amount: number): bigint => {
  return BigInt(Math.floor(amount * Math.pow(10, CONTRACT_CONSTANTS.PYUSD_DECIMALS)));
};

// Helper function to parse PYUSD amounts from contract
export const parsePYUSDAmount = (amount: bigint): number => {
  return Number(amount) / Math.pow(10, CONTRACT_CONSTANTS.PYUSD_DECIMALS);
};
