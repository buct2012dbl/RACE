import { ethers } from "hardhat";

async function main() {
  const AI_AGENT_ADDRESS = "0xBf7b3Fb3B5923F40B84D40baAc3F6D35Aa7d25DA";

  console.log("\n=== Debugging Position Data ===");
  console.log("Agent Address:", AI_AGENT_ADDRESS);

  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);

  // Get all positions
  const positions = await aiAgent.getAllPositions();
  console.log("\n📍 Total Positions:", positions.length);

  if (positions.length === 0) {
    console.log("No positions found.");
    return;
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    console.log(`\n=== Position ${i} ===`);
    console.log("Protocol:", pos.protocol);
    console.log("Asset:", pos.asset);
    console.log("Amount:", ethers.formatEther(pos.amount));
    console.log("Entry Price (raw):", pos.entryPrice.toString());
    console.log("Entry Price (formatted):", ethers.formatEther(pos.entryPrice));
    console.log("Timestamp:", new Date(Number(pos.timestamp) * 1000).toISOString());
    console.log("Stop Loss (raw):", pos.stopLoss.toString());
    console.log("Stop Loss (formatted):", ethers.formatEther(pos.stopLoss));
    console.log("Take Profit (raw):", pos.takeProfit.toString());
    console.log("Take Profit (formatted):", ethers.formatEther(pos.takeProfit));
  }

  // Get agent state
  const state = await aiAgent.agentState();
  console.log("\n📊 Agent State:");
  console.log("- Borrowed USDC:", ethers.formatEther(state.borrowedUSDC));
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit));
  console.log("- Total Assets:", ethers.formatEther(state.totalAssets));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
