# Sample Hardhat 3 Beta Project (`node:test` and `viem`)

This project showcases a Hardhat 3 Beta project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test

- Node.js >= 18
- npm or yarn
- Hardhat 3.0+

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
# Start local Hardhat network
npm run node

# Deploy contracts (in another terminal)
npm run deploy
```

#### Testnet Deployment

```bash
# Configure network in hardhat.config.ts
npx hardhat run scripts/deploy.ts --network sepolia
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

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
