import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// For Hardhat 3.0, we need to get ethers from the artifacts
const { artifacts, network } = hre;

async function main() {
  console.log("🚀 Starting ChainLance deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy MockPYUSD
  console.log("\n📄 Deploying MockPYUSD...");
  const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
  const mockPYUSD = await MockPYUSD.deploy();
  await mockPYUSD.waitForDeployment();
  console.log("✅ MockPYUSD deployed to:", await mockPYUSD.getAddress());

  // Deploy ReputationSystem
  console.log("\n📄 Deploying ReputationSystem...");
  const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy();
  await reputationSystem.waitForDeployment();
  console.log("✅ ReputationSystem deployed to:", await reputationSystem.getAddress());

  // Deploy ASIAgentOracle
  console.log("\n📄 Deploying ASIAgentOracle...");
  const ASIAgentOracle = await hre.ethers.getContractFactory("ASIAgentOracle");
  const asiAgentOracle = await ASIAgentOracle.deploy(await mockPYUSD.getAddress());
  await asiAgentOracle.waitForDeployment();
  console.log("✅ ASIAgentOracle deployed to:", await asiAgentOracle.getAddress());

  // Deploy ASIAgentVerifier (with placeholder address first)
  console.log("\n📄 Deploying ASIAgentVerifier...");
  const ASIAgentVerifier = await hre.ethers.getContractFactory("ASIAgentVerifier");
  const asiAgentVerifier = await ASIAgentVerifier.deploy(hre.ethers.ZeroAddress);
  await asiAgentVerifier.waitForDeployment();
  console.log("✅ ASIAgentVerifier deployed to:", await asiAgentVerifier.getAddress());

  // Deploy ChainLanceCore
  console.log("\n📄 Deploying ChainLanceCore...");
  const ChainLanceCore = await hre.ethers.getContractFactory("ChainLanceCore");
  const chainLanceCore = await ChainLanceCore.deploy(
    await mockPYUSD.getAddress(),
    await asiAgentVerifier.getAddress()
  );
  await chainLanceCore.waitForDeployment();
  console.log("✅ ChainLanceCore deployed to:", await chainLanceCore.getAddress());

  // Update ASIAgentVerifier with ChainLanceCore address
  console.log("\n🔧 Configuring contracts...");
  await asiAgentVerifier.updateChainLanceCore(await chainLanceCore.getAddress());
  console.log("✅ ASIAgentVerifier configured with ChainLanceCore address");

  // Authorize ChainLanceCore in ReputationSystem
  await reputationSystem.authorizeContract(await chainLanceCore.getAddress());
  console.log("✅ ChainLanceCore authorized in ReputationSystem");

  // Mint some PYUSD for testing
  console.log("\n💰 Minting test PYUSD tokens...");
  await mockPYUSD.mint(deployer.address, hre.ethers.parseUnits("1000000", 6)); // 1M PYUSD
  console.log("✅ Minted 1,000,000 PYUSD to deployer");

  // Create deployment info
  const deploymentInfo = {
    network: await hre.ethers.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockPYUSD: {
        address: await mockPYUSD.getAddress(),
        constructorArgs: []
      },
      ReputationSystem: {
        address: await reputationSystem.getAddress(),
        constructorArgs: []
      },
      ASIAgentOracle: {
        address: await asiAgentOracle.getAddress(),
        constructorArgs: [await mockPYUSD.getAddress()]
      },
      ASIAgentVerifier: {
        address: await asiAgentVerifier.getAddress(),
        constructorArgs: [await chainLanceCore.getAddress()]
      },
      ChainLanceCore: {
        address: await chainLanceCore.getAddress(),
        constructorArgs: [await mockPYUSD.getAddress(), await asiAgentVerifier.getAddress()]
      }
    },
    gasUsed: {
      // These would be populated with actual gas usage
      total: "Calculated during deployment"
    }
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = (await hre.ethers.provider.getNetwork()).name;
  const deploymentFile = path.join(deploymentsDir, `${networkName}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Create environment file for frontend
  const envContent = `
# ChainLance Contract Addresses - ${networkName}
VITE_CHAINLANCE_CORE_ADDRESS=${await chainLanceCore.getAddress()}
VITE_PYUSD_TOKEN_ADDRESS=${await mockPYUSD.getAddress()}
VITE_REPUTATION_SYSTEM_ADDRESS=${await reputationSystem.getAddress()}
VITE_ASI_AGENT_VERIFIER_ADDRESS=${await asiAgentVerifier.getAddress()}
VITE_ASI_AGENT_ORACLE_ADDRESS=${await asiAgentOracle.getAddress()}
VITE_NETWORK_NAME=${networkName}
VITE_CHAIN_ID=${(await hre.ethers.provider.getNetwork()).chainId}

# ASI Agent Configuration
ASI_VERIFIER_CONTRACT=${await asiAgentVerifier.getAddress()}
ORACLE_CONTRACT_ADDRESS=${await asiAgentOracle.getAddress()}
WEB3_PROVIDER=${process.env.WEB3_PROVIDER || "http://localhost:8545"}
`;

  const frontendEnvFile = path.join(__dirname, "../../.env.contracts");
  fs.writeFileSync(frontendEnvFile, envContent.trim());

  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Network: ${networkName}`);
  console.log(`Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("\n📍 Contract Addresses:");
  console.log(`MockPYUSD: ${await mockPYUSD.getAddress()}`);
  console.log(`ReputationSystem: ${await reputationSystem.getAddress()}`);
  console.log(`ASIAgentOracle: ${await asiAgentOracle.getAddress()}`);
  console.log(`ASIAgentVerifier: ${await asiAgentVerifier.getAddress()}`);
  console.log(`ChainLanceCore: ${await chainLanceCore.getAddress()}`);
  
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
    console.log(`npx hardhat verify --network ${networkName} ${await chainLanceCore.getAddress()} "${await mockPYUSD.getAddress()}" "${await asiAgentVerifier.getAddress()}"`);
    console.log(`npx hardhat verify --network ${networkName} ${await mockPYUSD.getAddress()}`);
    console.log(`npx hardhat verify --network ${networkName} ${await reputationSystem.getAddress()}`);
    console.log(`npx hardhat verify --network ${networkName} ${await asiAgentOracle.getAddress()} "${await mockPYUSD.getAddress()}"`);
    console.log(`npx hardhat verify --network ${networkName} ${await asiAgentVerifier.getAddress()} "${await chainLanceCore.getAddress()}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
