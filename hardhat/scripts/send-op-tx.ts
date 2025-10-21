import { network } from "hardhat";

async function main() {
  console.log("Sending transaction using Hardhat 3.0");

  const { viem } = await network.connect() as any;
  const publicClient = await viem.getPublicClient();
  const [senderClient] = await viem.getWalletClients();

  console.log("Sending 1 wei from", senderClient.account.address, "to itself");

  console.log("Sending transaction");
  const tx = await senderClient.sendTransaction({
    to: senderClient.account.address,
    value: 1n,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  
  console.log("Transaction sent successfully");
  console.log("Transaction hash:", tx);
  console.log("Block number:", receipt.blockNumber);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Transaction failed:", error);
    process.exit(1);
  });
