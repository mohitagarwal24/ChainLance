import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { parseUnits } from "viem";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting ChainLance deployment...");

  const { viem } = await network.connect() as any;
  const [deployer] = await viem.getWalletClients();
  console.log("Deploying contracts with account:", deployer.account.address);
  const publicClient = await viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Account balance:", balance.toString());

  // Deploy MockPYUSD
  console.log("\n📄 Deploying MockPYUSD...");
  const mockPYUSD = await viem.deployContract("MockPYUSD");
  console.log("✅ MockPYUSD deployed to:", mockPYUSD.address);

  // Deploy ReputationSystem
  console.log("\n📄 Deploying ReputationSystem...");
  const reputationSystem = await viem.deployContract("ReputationSystem");
  console.log("✅ ReputationSystem deployed to:", reputationSystem.address);

  // Deploy ASIAgentOracle
  console.log("\n📄 Deploying ASIAgentOracle...");
  const asiAgentOracle = await viem.deployContract("ASIAgentOracle");
  console.log("✅ ASIAgentOracle deployed to:", asiAgentOracle.address);

  // Deploy ASIAgentVerifier (with placeholder address first)
  console.log("\n📄 Deploying ASIAgentVerifier...");
  const asiAgentVerifier = await viem.deployContract("ASIAgentVerifier", ["0x0000000000000000000000000000000000000000"]);
  console.log("✅ ASIAgentVerifier deployed to:", asiAgentVerifier.address);

  // Deploy ChainLanceCore
  console.log("\n📄 Deploying ChainLanceCore...");
  const chainLanceCore = await viem.deployContract("ChainLanceCore", [
    mockPYUSD.address,
    asiAgentVerifier.address
  ]);
  console.log("✅ ChainLanceCore deployed to:", chainLanceCore.address);

  // Update ASIAgentVerifier with ChainLanceCore address
  console.log("\n🔧 Configuring contracts...");
  await asiAgentVerifier.write.updateChainLanceCore([chainLanceCore.address]);
  console.log("✅ ASIAgentVerifier configured with ChainLanceCore address");

  // Authorize ChainLanceCore in ReputationSystem
  await reputationSystem.write.authorizeContract([chainLanceCore.address]);
  console.log("✅ ChainLanceCore authorized in ReputationSystem");

  // Mint some PYUSD for testing
  console.log("\n💰 Minting test PYUSD tokens...");
  await mockPYUSD.write.mint([deployer.account.address, parseUnits("1000000", 6)]); // 1M PYUSD
  console.log("✅ Minted 1,000,000 PYUSD to deployer");

  // Create deployment info
  const chainId = await publicClient.getChainId();
  
  const deploymentInfo = {
    network: { chainId, name: publicClient.chain?.name || 'unknown' },
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockPYUSD: {
        address: mockPYUSD.address,
        constructorArgs: []
      },
      ReputationSystem: {
        address: reputationSystem.address,
        constructorArgs: []
      },
      ASIAgentOracle: {
        address: asiAgentOracle.address,
        constructorArgs: []
      },
      ASIAgentVerifier: {
        address: asiAgentVerifier.address,
        constructorArgs: [chainLanceCore.address]
      },
      ChainLanceCore: {
        address: chainLanceCore.address,
        constructorArgs: [mockPYUSD.address, asiAgentVerifier.address]
      }
    },
    gasUsed: {
      total: "Calculated during deployment"
    }
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = publicClient.chain?.name || 'localhost';
  const deploymentFile = path.join(deploymentsDir, `${networkName}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Create environment file for frontend
  const envContent = `
# ChainLance Contract Addresses - ${networkName}
VITE_CHAINLANCE_CORE_ADDRESS=${chainLanceCore.address}
VITE_PYUSD_TOKEN_ADDRESS=${mockPYUSD.address}
VITE_REPUTATION_SYSTEM_ADDRESS=${reputationSystem.address}
VITE_ASI_AGENT_VERIFIER_ADDRESS=${asiAgentVerifier.address}
VITE_ASI_AGENT_ORACLE_ADDRESS=${asiAgentOracle.address}
VITE_NETWORK_NAME=${networkName}
VITE_CHAIN_ID=${chainId}

# ASI Agent Configuration
ASI_VERIFIER_CONTRACT=${asiAgentVerifier.address}
ORACLE_CONTRACT_ADDRESS=${asiAgentOracle.address}
WEB3_PROVIDER=${process.env.WEB3_PROVIDER || "http://localhost:8545"}
`;

  const frontendEnvFile = path.join(__dirname, "../../.env.contracts");
  fs.writeFileSync(frontendEnvFile, envContent.trim());

  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Network: ${networkName}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log("\n📍 Contract Addresses:");
  console.log(`MockPYUSD: ${mockPYUSD.address}`);
  console.log(`ReputationSystem: ${reputationSystem.address}`);
  console.log(`ASIAgentOracle: ${asiAgentOracle.address}`);
  console.log(`ASIAgentVerifier: ${asiAgentVerifier.address}`);
  console.log(`ChainLanceCore: ${chainLanceCore.address}`);
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  console.log(`💾 Frontend env file created: ${frontendEnvFile}`);
  
  console.log("\n🎉 Deployment completed successfully!");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Copy the contract addresses to your frontend .env file");
  console.log("2. Update the ASI agent configuration with contract addresses");
  console.log("3. Register ASI agents using the ASIAgentVerifier contract");
  console.log("4. Start the ASI agent coordinator and verification agents");
  
  // Verify contracts on Etherscan (if not local network)
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n🔍 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${networkName} ${chainLanceCore.address} "${mockPYUSD.address}" "${asiAgentVerifier.address}"`);
    console.log(`npx hardhat verify --network ${networkName} ${mockPYUSD.address}`);
    console.log(`npx hardhat verify --network ${networkName} ${reputationSystem.address}`);
    console.log(`npx hardhat verify --network ${networkName} ${asiAgentOracle.address}`);
    console.log(`npx hardhat verify --network ${networkName} ${asiAgentVerifier.address} "${chainLanceCore.address}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
