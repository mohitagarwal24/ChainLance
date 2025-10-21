# 🚀 ChainLance Sepolia Testnet Deployment Guide

Complete guide to deploy ChainLance smart contracts to Sepolia testnet using Hardhat 3.0 and Ignition.

## 📋 Prerequisites

### 1. Required Software
- Node.js >= 18
- npm or yarn
- Git
- MetaMask or other Ethereum wallet

### 2. Sepolia Testnet Requirements
- **Sepolia ETH** for gas fees (get from faucets)
- **RPC URL** (Infura, Alchemy, or public RPC)
- **Private Key** of deployer account
- **Etherscan API Key** (optional, for contract verification)

## 🔧 Environment Setup

### Step 1: Clone and Install Dependencies

```bash
cd /home/mohitagarwal_24/hackathons/ChainLance/hardhat
npm install
```

### Step 2: Get Sepolia ETH

Visit any of these faucets to get test ETH:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

**Minimum required:** ~0.1 ETH for deployment

### Step 3: Get RPC URL

Choose one option:

#### Option A: Infura (Recommended)
1. Go to [infura.io](https://infura.io)
2. Create account and new project
3. Copy your project ID
4. RPC URL: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

#### Option B: Alchemy
1. Go to [alchemy.com](https://alchemy.com)
2. Create account and new app
3. Copy your API key
4. RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### Option C: Public RPC (Free but less reliable)
- `https://rpc.sepolia.org`
- `https://ethereum-sepolia.blockpi.network/v1/rpc/public`

### Step 4: Configure Environment Variables

#### Method A: Using .env file (Simple)

```bash
# Copy the example file
cp .env.example .env

# Edit .env file with your values
nano .env
```

Add these values to `.env`:
```bash
# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Etherscan API Key for contract verification (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

#### Method B: Using Hardhat Keystore (Secure)

```bash
# Set private key securely
npx hardhat keystore set SEPOLIA_PRIVATE_KEY

# Set RPC URL
npx hardhat keystore set SEPOLIA_RPC_URL

# Set Etherscan API key (optional)
npx hardhat keystore set ETHERSCAN_API_KEY
```

## 🏗️ Pre-Deployment Checks

### Step 1: Compile Contracts

```bash
npm run compile
```

Expected output:
```
Compiled 5 Solidity files with solc 0.8.28 (evm target: cancun)
Nothing to compile
```

### Step 2: Run Tests (Optional)

```bash
# Run Node.js tests
npm test

# Or run specific test file
npx hardhat test test/ChainLanceCore.node.test.ts
```

### Step 3: Verify Network Configuration

```bash
# Check if Sepolia network is configured
npx hardhat ignition status --network sepolia
```

## 🚀 Deployment Process

### Step 1: Deploy to Sepolia

```bash
# Deploy all contracts using Hardhat Ignition
npm run deploy:sepolia
```

**Alternative command:**
```bash
npx hardhat ignition deploy ignition/modules/ChainLanceDeploy.ts --network sepolia
```

### Step 2: Monitor Deployment

The deployment will show progress like this:

```
Hardhat Ignition 🚀

Deploying [ ChainLanceModule ]

Batch #1
  Executing ChainLanceModule#MockPYUSD...
  Executed ChainLanceModule#MockPYUSD
  Executing ChainLanceModule#ReputationSystem...
  Executed ChainLanceModule#ReputationSystem
  Executing ChainLanceModule#ASIAgentOracle...
  Executed ChainLanceModule#ASIAgentOracle
  Executing ChainLanceModule#ASIAgentVerifier...
  Executed ChainLanceModule#ASIAgentVerifier

Batch #2
  Executing ChainLanceModule#ChainLanceCore...
  Executed ChainLanceModule#ChainLanceCore

Batch #3
  Executing ChainLanceModule#ASIAgentVerifier.updateChainLanceCore...
  Executed ChainLanceModule#ASIAgentVerifier.updateChainLanceCore
  Executing ChainLanceModule#ReputationSystem.authorizeContract...
  Executed ChainLanceModule#ReputationSystem.authorizeContract
  Executing ChainLanceModule#ChainLanceCore.setASIAgentVerifier...
  Executed ChainLanceModule#ChainLanceCore.setASIAgentVerifier

[ ChainLanceModule ] successfully deployed 🚀

Deployed Addresses

ChainLanceModule#MockPYUSD - 0x1234...5678
ChainLanceModule#ReputationSystem - 0x2345...6789
ChainLanceModule#ASIAgentOracle - 0x3456...789A
ChainLanceModule#ASIAgentVerifier - 0x4567...89AB
ChainLanceModule#ChainLanceCore - 0x5678...9ABC
```

### Step 3: Save Contract Addresses

Contract addresses will be automatically saved to:
- `ignition/deployments/chain-11155111/deployed_addresses.json`
- Console output (copy these for your records)

## ✅ Post-Deployment Verification

### Step 1: Verify Contracts on Etherscan (Optional)

```bash
# Verify all contracts
npm run verify:sepolia
```

**Alternative command:**
```bash
npx hardhat ignition verify ChainLanceModule --network sepolia
```

### Step 2: Test Deployed Contracts

Create a test script to verify deployment:

```bash
# Create test script
cat > test-deployment.js << 'EOF'
const { viem } = require("hardhat");

async function main() {
  const [deployer] = await viem.getWalletClients();
  
  // Replace with your deployed addresses
  const chainLanceAddress = "0x5678...9ABC";
  const pyusdAddress = "0x1234...5678";
  
  const chainLance = await viem.getContractAt("ChainLanceCore", chainLanceAddress);
  const pyusd = await viem.getContractAt("MockPYUSD", pyusdAddress);
  
  console.log("ChainLance owner:", await chainLance.read.owner());
  console.log("PYUSD total supply:", await pyusd.read.totalSupply());
  console.log("Platform fee:", await chainLance.read.platformFee());
  
  console.log("✅ Deployment verification successful!");
}

main().catch(console.error);
EOF

# Run test
npx hardhat run test-deployment.js --network sepolia
```

## 📊 Contract Information

After successful deployment, you'll have these contracts:

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **ChainLanceCore** | Main platform | `postJob()`, `placeBid()`, `acceptBid()` |
| **MockPYUSD** | Test token | `mint()`, `faucet()`, `transfer()` |
| **ASIAgentVerifier** | AI verification | `registerAgent()`, `submitVerification()` |
| **ReputationSystem** | On-chain ratings | `submitRating()`, `getReputationScore()` |
| **ASIAgentOracle** | Agent communication | `createRequest()`, `fulfillRequest()` |

## 🔗 Frontend Integration

### Step 1: Update Frontend Environment

Create `.env.contracts` in your frontend directory:

```bash
# Replace with your actual deployed addresses
VITE_CHAINLANCE_CORE_ADDRESS=0x5678...9ABC
VITE_PYUSD_TOKEN_ADDRESS=0x1234...5678
VITE_ASI_VERIFIER_ADDRESS=0x4567...89AB
VITE_REPUTATION_SYSTEM_ADDRESS=0x2345...6789
VITE_ASI_ORACLE_ADDRESS=0x3456...789A

# Network configuration
VITE_NETWORK_ID=11155111
VITE_NETWORK_NAME=sepolia
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### Step 2: Copy Contract ABIs

```bash
# Copy ABIs to frontend
npm run copy-abis

# Or manually copy from artifacts/contracts/
cp artifacts/contracts/ChainLanceCore.sol/ChainLanceCore.json ../src/contracts/
cp artifacts/contracts/MockPYUSD.sol/MockPYUSD.json ../src/contracts/
# ... copy other contract ABIs
```

## 🤖 ASI Agent Setup

### Step 1: Configure Agents

```bash
cd ../asi-agents

# Update agent configuration with deployed addresses
cat > config.json << EOF
{
  "network": {
    "rpc_url": "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
    "chain_id": 11155111
  },
  "contracts": {
    "chainlance_core": "0x5678...9ABC",
    "asi_verifier": "0x4567...89AB",
    "asi_oracle": "0x3456...789A"
  },
  "agents": {
    "verification_agent": {
      "port": 8001,
      "private_key": "0x..."
    }
  }
}
EOF
```

### Step 2: Start ASI Agents

```bash
# Install dependencies
pip install -r requirements.txt

# Start agent network
python start_agents.py
```

## 🧪 Testing the Deployment

### Step 1: Get Test PYUSD

```bash
# Use the faucet function to get test tokens
npx hardhat console --network sepolia

# In the console:
const pyusd = await ethers.getContractAt("MockPYUSD", "0x1234...5678");
await pyusd.faucet("YOUR_ADDRESS");
```

### Step 2: Test Job Posting

```javascript
// Example: Post a test job
const chainLance = await ethers.getContractAt("ChainLanceCore", "0x5678...9ABC");
const pyusd = await ethers.getContractAt("MockPYUSD", "0x1234...5678");

// Approve and post job
const budget = ethers.parseUnits("1000", 6); // 1000 PYUSD
const escrow = budget / 10n; // 10% escrow

await pyusd.approve(chainLance.address, escrow);
await chainLance.postJob(
  "Test Job",
  "Test Description", 
  "Web Development",
  ["React"],
  budget,
  0, // Fixed contract
  Math.floor(Date.now()/1000) + 86400*30, // 30 days
  "expert",
  "2 weeks",
  2 // milestones
);
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Insufficient Gas
```
Error: insufficient funds for intrinsic transaction cost
```
**Solution:** Get more Sepolia ETH from faucets

#### 2. RPC Issues
```
Error: could not detect network
```
**Solution:** Check RPC URL and network connectivity

#### 3. Private Key Issues
```
Error: invalid private key
```
**Solution:** Ensure private key starts with `0x` and is 64 characters

#### 4. Contract Verification Failed
```
Error: contract verification failed
```
**Solution:** Wait a few minutes and retry, or verify manually on Etherscan

### Getting Help

1. **Check deployment logs** in `ignition/deployments/chain-11155111/`
2. **Verify on Sepolia Etherscan**: https://sepolia.etherscan.io
3. **Check gas prices**: https://sepolia.etherscan.io/gastracker
4. **Community support**: Discord/GitHub issues

## 🎉 Success Checklist

- [ ] All 5 contracts deployed successfully
- [ ] Contract addresses saved and documented
- [ ] Contracts verified on Etherscan (optional)
- [ ] Test transactions completed successfully
- [ ] Frontend environment variables updated
- [ ] ASI agents configured and running
- [ ] Test PYUSD tokens obtained and transferred

## 📝 Next Steps

1. **Update Frontend**: Connect React app to deployed contracts
2. **Test Full Flow**: Job posting → Bidding → Contract → Payment
3. **Register ASI Agents**: Set up autonomous verification
4. **Monitor Performance**: Track gas usage and transaction times
5. **Prepare for Mainnet**: When ready, deploy to Ethereum mainnet

---

**🚀 Your ChainLance platform is now live on Sepolia testnet!**

Contract addresses and deployment details are saved in the `ignition/deployments/` directory. You can now integrate these contracts with your frontend and start testing the full platform functionality.
