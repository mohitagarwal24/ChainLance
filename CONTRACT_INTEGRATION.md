# ChainLance Smart Contract Integration

This document outlines the complete integration of ChainLance frontend with deployed smart contracts, replacing all mock data with real blockchain interactions.

## 🏗️ Architecture Overview

### Smart Contract Integration Stack
- **Frontend**: React + TypeScript + Vite
- **Web3 Library**: Ethers.js v6
- **Network**: Sepolia Testnet
- **Token**: PYUSD (Mock implementation for testing)
- **Contracts**: ChainLanceCore, ReputationSystem, ASIAgentVerifier, ASIAgentOracle

### Key Components Created

#### 1. Contract Configuration (`src/contracts/config.ts`)
- Centralized contract addresses and ABIs
- Network configuration
- Helper functions for PYUSD amount formatting
- Contract validation utilities

#### 2. Web3 Context (`src/contexts/Web3Context.tsx`)
- Manages Web3 provider and signer
- Initializes contract instances
- Handles network switching
- Monitors account changes

#### 3. Contract Service (`src/services/contractService.ts`)
- Abstraction layer for all contract interactions
- Job posting with escrow deposits
- Bidding with stake mechanism
- Contract management and milestone tracking
- Token operations (PYUSD)
- Reputation system integration

#### 4. Contract Data Context (`src/contexts/ContractDataContext.tsx`)
- Replaces mock DataContext
- Real-time contract data fetching
- State management for jobs, bids, contracts
- Integration with ContractService

#### 5. Network Status Component (`src/components/NetworkStatus.tsx`)
- Visual feedback for connection status
- Network switching assistance
- Contract initialization status

## 🔄 Real Contract Workflows

### Job Posting Workflow
1. **User connects wallet** → Web3Context initializes
2. **User fills job form** → PostJobPage validates data
3. **Check PYUSD balance** → Ensure sufficient funds for escrow
4. **Submit transaction** → ContractService.postJob()
   - Approve PYUSD spending
   - Call ChainLanceCore.postJob()
   - Lock 15% escrow deposit
5. **Job appears on platform** → Real-time data refresh

### Bidding Workflow
1. **Freelancer views job** → JobDetailPage loads contract data
2. **Submit bid** → ContractService.placeBid()
   - Calculate 10% stake amount
   - Approve PYUSD spending for stake
   - Call ChainLanceCore.placeBid()
3. **Bid recorded on-chain** → Visible to job poster

### Contract Formation
1. **Client accepts bid** → ContractService.acceptBid()
2. **Smart contract created** → Full payment locked in escrow
3. **Milestone tracking begins** → ASI agents monitor progress

## 🎯 Key Features Implemented

### ✅ Real Escrow System
- **15% deposit** required for job posting
- **10% stake** required for bidding
- **Full payment** locked when contract formed
- **Automatic refunds** for rejected bids

### ✅ PYUSD Integration
- **Mock PYUSD token** for testing (6 decimals)
- **Faucet functionality** for getting test tokens
- **Balance checking** before transactions
- **Approval workflows** for token spending

### ✅ Network Management
- **Sepolia testnet** configuration
- **Automatic network switching**
- **Connection status monitoring**
- **Error handling** for network issues

### ✅ User Experience
- **Balance display** with faucet access
- **Transaction feedback** with loading states
- **Error handling** with user-friendly messages
- **Network status** indicators

## 🔧 Environment Configuration

### Required Environment Variables (.env.contracts)
```bash
VITE_CHAINLANCE_CORE_ADDRESS=0x...
VITE_PYUSD_TOKEN_ADDRESS=0x...
VITE_REPUTATION_SYSTEM_ADDRESS=0x...
VITE_ASI_AGENT_VERIFIER_ADDRESS=0x...
VITE_ASI_AGENT_ORACLE_ADDRESS=0x...
VITE_NETWORK_NAME=Sepolia
VITE_CHAIN_ID=11155111
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

### 2. Configure Environment
- Ensure `.env.contracts` has correct contract addresses
- Contracts should be deployed to Sepolia testnet

### 3. Start Development Server
```bash
npm run dev
```

### 4. Connect Wallet
- Install MetaMask
- Switch to Sepolia testnet
- Connect wallet to application

### 5. Get Test Tokens
- Use the "Get Test PYUSD" button in the UI
- Faucet provides test tokens for escrow deposits

## 🔍 Testing the Integration

### Job Posting Test
1. Connect wallet with sufficient ETH for gas
2. Click "Get Test PYUSD" to receive tokens
3. Navigate to "Post a Job"
4. Fill out job details
5. Submit and confirm transaction
6. Verify job appears in listings

### Bidding Test
1. Switch to different wallet account
2. Get test PYUSD for stake
3. Find a posted job
4. Submit bid with stake
5. Verify bid appears for job poster

### Contract Formation Test
1. As job poster, accept a bid
2. Confirm transaction
3. Verify contract creation
4. Check escrow balance in contract

## 🛠️ Technical Implementation Details

### Contract Interaction Patterns
```typescript
// Job posting with escrow
const tx = await chainLanceCore.postJob(
  title, description, category, skills,
  formatPYUSDAmount(budget), contractType,
  deadline, experienceLevel, duration, milestones
);

// Bidding with stake
const stakeAmount = formatPYUSDAmount(proposedAmount * 0.1);
await pyusdToken.approve(chainLanceCoreAddress, stakeAmount);
await chainLanceCore.placeBid(jobId, proposedAmount, ...);
```

### Error Handling
- **Insufficient funds** → User-friendly message
- **Transaction rejection** → Clear feedback
- **Network errors** → Automatic retry suggestions
- **Contract failures** → Detailed error reporting

### State Management
- **Real-time updates** after transactions
- **Optimistic UI updates** where appropriate
- **Loading states** during blockchain operations
- **Error recovery** mechanisms

## 🔮 Future Enhancements

### Planned Features
- **Real PYUSD integration** (mainnet deployment)
- **ASI agent verification** UI integration
- **Milestone submission** interface
- **Dispute resolution** workflows
- **Advanced filtering** by contract status
- **Real-time notifications** for contract events

### Scalability Considerations
- **Event listening** for real-time updates
- **Caching strategies** for contract data
- **Batch operations** for efficiency
- **Gas optimization** techniques

## 📚 Resources

- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Integration Guide](https://docs.metamask.io/)
- [Sepolia Testnet Info](https://sepolia.dev/)
- [PYUSD Documentation](https://developer.paypal.com/dev-center/pyusd/)

## 🤝 Contributing

When adding new contract interactions:
1. Add methods to `ContractService`
2. Update `ContractDataContext` if needed
3. Handle errors gracefully
4. Add loading states to UI
5. Test on Sepolia testnet
6. Update this documentation

---

**Status**: ✅ Core integration complete
**Next**: Deploy to production with real PYUSD integration
