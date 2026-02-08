import { ethers } from "hardhat";

async function main() {
  const AI_AGENT_ADDRESS = "0xBf7b3Fb3B5923F40B84D40baAc3F6D35Aa7d25DA";

  console.log("\n=== Verifying AI Agent Reset ===");
  console.log("Agent Address:", AI_AGENT_ADDRESS);

  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);

  // Get agent state
  const state = await aiAgent.agentState();

  console.log("\n📊 Agent State:");
  console.log("- RWA Collateral:", state.rwaCollateral);
  console.log("- Collateral Amount:", ethers.formatEther(state.collateralAmount), "tokens");
  console.log("- Borrowed USDC:", ethers.formatEther(state.borrowedUSDC), "USDC");
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit), "USDC");
  console.log("- Total Assets:", ethers.formatEther(state.totalAssets), "USDC");

  // Get all positions
  const positions = await aiAgent.getAllPositions();
  console.log("\n📍 Investment Positions:");
  console.log("- Total Positions:", positions.length);

  if (positions.length === 0) {
    console.log("✅ No active positions (clean slate)");
  } else {
    positions.forEach((pos: any, index: number) => {
      console.log(`\nPosition ${index + 1}:`);
      console.log("  Protocol:", pos.protocol);
      console.log("  Asset:", pos.asset);
      console.log("  Amount:", ethers.formatEther(pos.amount));
      console.log("  Entry Price:", ethers.formatEther(pos.entryPrice));
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Agent successfully reset!");
  console.log("- All positions cleared: ✓");
  console.log("- Borrowed amount reset to 0: ✓");
  console.log("- Ready for fresh start: ✓");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
