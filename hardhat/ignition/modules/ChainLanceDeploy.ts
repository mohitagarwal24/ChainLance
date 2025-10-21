import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ChainLanceModule = buildModule("ChainLanceModule", (m) => {
  // Deploy MockPYUSD first
  const mockPYUSD = m.contract("MockPYUSD");

  // Deploy ReputationSystem
  const reputationSystem = m.contract("ReputationSystem");

  // Deploy ASIAgentOracle
  const asiAgentOracle = m.contract("ASIAgentOracle");

  // Deploy ASIAgentVerifier with placeholder for ChainLanceCore (will be updated)
  const asiAgentVerifier = m.contract("ASIAgentVerifier", ["0x0000000000000000000000000000000000000000"]);

  // Deploy ChainLanceCore with PYUSD and ASI verifier
  const chainLanceCore = m.contract("ChainLanceCore", [mockPYUSD, asiAgentVerifier]);

  // Update ASIAgentVerifier with actual ChainLanceCore address
  m.call(asiAgentVerifier, "updateChainLanceCore", [chainLanceCore]);

  // Authorize ChainLanceCore to submit ratings to ReputationSystem
  m.call(reputationSystem, "authorizeContract", [chainLanceCore]);

  // Set ASI agent verifier in ChainLanceCore
  m.call(chainLanceCore, "setASIAgentVerifier", [asiAgentVerifier]);

  return {
    mockPYUSD,
    reputationSystem,
    asiAgentOracle,
    asiAgentVerifier,
    chainLanceCore,
  };
});

export default ChainLanceModule;
