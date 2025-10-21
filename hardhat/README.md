# ChainLance Smart Contracts

Decentralized freelancing platform with AI-powered verification using Hardhat 3.0, viem, and Hardhat Ignition for deployment.

## 🏗️ Architecture Overview

ChainLance implements a complete decentralized freelancing ecosystem with:

- **Escrow-based job posting** (10-20% upfront deposit)
- **Stake-based bidding** (10% freelancer commitment)
- **AI-powered work verification** using ASI agents
- **Automatic payment release** after 14-day timeout
- **On-chain reputation system** with tamper-proof ratings
- **PYUSD stablecoin integration** for stable payments

## 📦 Smart Contracts

### Core Contracts

1. **ChainLanceCore.sol** - Main platform contract
   - Job posting with escrow deposits
   - Bidding system with stake mechanism
   - Milestone-based contract management
   - Automatic payment release

2. **ASIAgentVerifier.sol** - AI verification system
   - Agent registration and management
   - Verification request handling
   - Category-specific verification templates

3. **ReputationSystem.sol** - On-chain reputation
   - Multi-dimensional ratings
   - Reputation levels (Bronze, Silver, Gold, Platinum)
   - Dispute resolution

4. **ASIAgentOracle.sol** - Blockchain oracle for ASI agents
5. **MockPYUSD.sol** - Testing token (6 decimals like real PYUSD)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm or yarn
- Hardhat 3.0+
- Git

### Installation

```bash
npm install
```

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
```

### Deployment

#### Local Network

```bash
# Deploy to local Hardhat network
npm run deploy:local
```

#### Sepolia Testnet Deployment

1. **Setup Environment Variables**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
# SEPOLIA_PRIVATE_KEY=your_private_key_here
```

2. **Set Private Key (Secure Method)**

```bash
# Using hardhat-keystore for secure key management
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

3. **Deploy to Sepolia**

```bash
# Deploy all contracts using Hardhat Ignition
npm run deploy:sepolia
```

4. **Verify Contracts (Optional)**

```bash
# Verify contracts on Etherscan
npm run verify:sepolia
```

## 📋 Contract Addresses

After deployment, contract addresses will be saved to:
- `deployments/{network}-deployment.json`
- `../.env.contracts` (for frontend)

## 🤖 ASI Agent Integration

The platform integrates with Fetch.ai ASI agents for autonomous work verification:

### Agent Types

1. **Verification Agent** - Verifies deliverable quality against criteria
2. **Coordinator Agent** - Routes requests to appropriate agents
3. **Oracle Agent** - Handles blockchain communication

### Starting ASI Agents

```bash
cd ../asi-agents
pip install -r requirements.txt
python start_agents.py
```

## 🔧 Configuration

### Environment Variables

Create `.env` file with:

```bash
# Network Configuration
WEB3_PROVIDER=http://localhost:8545
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0x...

# Contract Addresses (auto-populated after deployment)
CHAINLANCE_CORE_ADDRESS=0x...
PYUSD_TOKEN_ADDRESS=0x...
ASI_VERIFIER_CONTRACT=0x...
```

## 📊 Contract Interactions

### Job Posting Flow

1. Client posts job with escrow deposit (10-20% of budget)
2. Freelancers place bids with stake (10% of proposed amount)
3. Client accepts bid and funds full escrow
4. Contract created with milestone structure

### Verification Flow

1. Freelancer submits milestone deliverable
2. ASI agent automatically verifies against criteria
3. Client has 14 days to approve/dispute
4. Payment auto-releases if no action taken

### Example Usage

```javascript
// Post a job
await chainLance.postJob(
  "Build DeFi Dashboard",
  "Comprehensive React dashboard...",
  "Web Development",
  ["React", "TypeScript", "Web3"],
  ethers.parseEther("5000"), // 5000 PYUSD
  2, // Milestone contract
  deadline,
  "expert",
  "6-8 weeks",
  4 // milestones
);

// Place a bid
await chainLance.placeBid(
  jobId,
  ethers.parseEther("4500"), // 4500 PYUSD
  "I have extensive experience...",
  "6 weeks",
  ["Planning", "Development", "Testing", "Deployment"]
);
```

## 🧪 Testing

The test suite covers:

- Contract deployment and initialization
- Job posting with escrow requirements
- Bidding system with stake mechanism
- Contract creation and milestone management
- ASI agent verification integration
- Payment release and fee distribution
- Reputation system functionality

Run specific test categories:

```bash
# Core functionality
npx hardhat test test/ChainLanceCore.test.ts

# ASI integration
npx hardhat test test/ASIAgentVerifier.test.ts

# Reputation system
npx hardhat test test/ReputationSystem.test.ts
```

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive parameter checking
- **Escrow Protection**: Funds locked until conditions met
- **Stake Slashing**: Penalties for contract breaches

## 📈 Gas Optimization

- Efficient data structures
- Batch operations where possible
- Optimized for common use cases
- Configurable gas limits

## 🌐 Network Support

- Ethereum Mainnet (production)
- Sepolia Testnet (testing)
- Local Hardhat Network (development)
- Arbitrum (L2 scaling)
- Polygon (alternative L2)

## 📚 API Reference

### ChainLanceCore

#### Job Management
- `postJob()` - Create new job posting
- `getJob(uint256)` - Get job details
- `getUserJobs(address)` - Get user's jobs

#### Bidding
- `placeBid()` - Submit bid on job
- `withdrawBid()` - Withdraw pending bid
- `getBidsForJob(uint256)` - Get job bids

#### Contracts
- `acceptBid()` - Accept bid and create contract
- `submitMilestone()` - Submit work deliverable
- `approveMilestone()` - Approve milestone
- `autoReleaseMilestone()` - Auto-release after timeout

### ASIAgentVerifier

#### Agent Management
- `registerAgent()` - Register ASI agent
- `submitVerification()` - Submit verification result
- `disputeVerification()` - Dispute agent decision

## 🚨 Emergency Functions

Owner-only emergency functions for platform management:

- `setPlatformFee()` - Adjust platform fees
- `emergencyWithdraw()` - Emergency fund recovery
- `pauseAgent()` - Disable problematic agents

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 🆘 Support

- Documentation: See `/docs` directory
- Issues: GitHub Issues
- Discord: ChainLance Community

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

## 📄 License

MIT License - see LICENSE file for details

---

**Built with Hardhat 3.0, viem, and Hardhat Ignition for modern Ethereum development** 🚀

## 📋 Deployment Output

After successful deployment, you'll see contract addresses like:

```
Deployed Addresses

ChainLanceModule#MockPYUSD - 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
ChainLanceModule#ReputationSystem - 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
ChainLanceModule#ASIAgentOracle - 0x5FbDB2315678afecb367f032d93F642f64180aa3
ChainLanceModule#ASIAgentVerifier - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ChainLanceModule#ChainLanceCore - 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

## 🔧 Key Features Implemented

### Escrow & Payment System
- ✅ Trustless escrow with smart contract automation
- ✅ PYUSD stablecoin integration for stable payments
- ✅ Automatic release after 14-day timeout
- ✅ Platform fee collection (configurable 0-10%)

### Staking Mechanism
- ✅ Freelancer stake requirement (10% of bid amount)
- ✅ Client escrow deposit (10-20% of budget)
- ✅ Stake slashing for contract breaches
- ✅ Automatic refunds for rejected bids

### ASI Agent Integration
- ✅ Autonomous work verification using Fetch.ai agents
- ✅ Multi-criteria evaluation system
- ✅ Category-specific verification templates
- ✅ Confidence scoring and issue reporting

### Reputation System
- ✅ On-chain storage of ratings and reviews
- ✅ Multi-dimensional scoring system
- ✅ Reputation levels with thresholds
- ✅ Dispute handling for unfair ratings

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Compile contracts
npm run compile
```

## 📚 Usage Examples

### Job Posting

```solidity
// Post a job with escrow deposit
chainLance.postJob(
    "Build DeFi Dashboard",
    "Comprehensive React dashboard for DeFi protocols",
    "Web Development",
    ["React", "TypeScript", "Web3"],
    5000 * 10**6, // 5000 PYUSD (6 decimals)
    ContractType.Milestone,
    block.timestamp + 30 days,
    "expert",
    "6-8 weeks",
    4 // number of milestones
);
```

### Bidding

```solidity
// Place bid with stake
chainLance.placeBid(
    jobId,
    4500 * 10**6, // 4500 PYUSD
    "I have 5+ years experience building DeFi dashboards...",
    "6 weeks",
    ["Planning & Design", "Core Development", "Testing", "Deployment"]
);
```

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Role-based permissions with OpenZeppelin
- **Input Validation**: Comprehensive parameter checking
- **Escrow Protection**: Funds locked until conditions met
- **Stake Slashing**: Economic penalties for contract breaches
- **Automatic Timeouts**: Protects against indefinite holds

## 🌐 Network Configuration

Supported networks:
- **Ethereum Mainnet** (production)
- **Sepolia Testnet** (testing) ✅ Ready
- **Local Hardhat Network** (development) ✅ Ready
- **Arbitrum** (L2 scaling) - Future
- **Polygon** (alternative L2) - Future

## 🤖 ASI Agent Integration

To start the ASI agent network:

```bash
cd ../asi-agents
pip install -r requirements.txt
python start_agents.py
```

Agents will automatically:
1. Monitor blockchain events
2. Verify submitted deliverables
3. Submit verification results
4. Handle dispute resolution

## 📊 Contract Interactions Flow

1. **Job Posting**: Client deposits 10-20% escrow
2. **Bidding**: Freelancers stake 10% of bid amount
3. **Contract Creation**: Full payment locked in escrow
4. **Milestone Delivery**: Freelancer submits work
5. **AI Verification**: ASI agents verify deliverables
6. **Payment Release**: Automatic after 14 days or manual approval
7. **Reputation Update**: On-chain ratings recorded

## 🆘 Troubleshooting

### Common Issues

1. **Compilation Errors**: Enable viaIR in hardhat.config.ts
2. **Gas Estimation**: Use optimizer with 200 runs
3. **Network Issues**: Check RPC URL and private key
4. **Test Failures**: Ensure chai dependency is installed

### Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports
- **Community**: Discord for general questions
