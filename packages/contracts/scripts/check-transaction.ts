import { ethers } from "hardhat";

async function main() {
  const txHash = "0x036797e9a909420f5756c634a89e02039cd4529fc72e784a67f41390365697a8";

  console.log("\n=== Checking Transaction ===");
  console.log("TX Hash:", txHash);

  const provider = ethers.provider;

  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    console.log("❌ Transaction not found");
    return;
  }

  console.log("\n📋 Transaction Receipt:");
  console.log("- Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("- Block:", receipt.blockNumber);
  console.log("- Gas Used:", receipt.gasUsed.toString());
  console.log("- From:", receipt.from);
  console.log("- To:", receipt.to);

  console.log("\n📝 Logs:", receipt.logs.length, "events");

  // Parse logs
  const aiAgentAddress = "0xDEe535cF20a05A5Ac8099Ce3612396C3E7C9586f";
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    try {
      const parsed = aiAgent.interface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      if (parsed) {
        console.log(`\nEvent ${i + 1}: ${parsed.name}`);
        console.log("Args:", parsed.args);
      }
    } catch (e) {
      // Not an AIAgent event, skip
    }
  }

  // Check current agent state
  console.log("\n=== Current Agent State ===");
  const state = await aiAgent.agentState();
  console.log("- Borrowed USDC:", ethers.formatEther(state.borrowedUSDC));
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit));
  console.log("- Total Assets:", ethers.formatEther(state.totalAssets));

  const positions = await aiAgent.getAllPositions();
  console.log("- Positions:", positions.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
