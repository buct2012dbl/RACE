import { ethers } from "hardhat";

async function main() {
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  console.log("\n=== Checking Agent State After Transaction ===");

  const state = await aiAgent.agentState();
  console.log(`Collateral Amount: ${ethers.formatEther(state.collateralAmount)}`);
  console.log(`Borrowed USDC: ${ethers.formatEther(state.borrowedUSDC)}`);
  console.log(`Available Credit: ${ethers.formatEther(state.availableCredit)}`);
  console.log(`Total Assets: ${ethers.formatEther(state.totalAssets)}`);

  // Get all positions
  try {
    const positions = await aiAgent.getAllPositions();
    console.log(`\nNumber of Positions: ${positions.length}`);

    if (positions.length > 0) {
      console.log("\n=== Positions ===");
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        console.log(`\nPosition ${i}:`);
        console.log(`  Protocol: ${pos.protocol}`);
        console.log(`  Asset: ${pos.asset}`);
        console.log(`  Amount: ${ethers.formatEther(pos.amount)}`);
        console.log(`  Entry Price: ${ethers.formatEther(pos.entryPrice)}`);
        console.log(`  Stop Loss: ${ethers.formatEther(pos.stopLoss)}`);
        console.log(`  Take Profit: ${ethers.formatEther(pos.takeProfit)}`);
      }
    }
  } catch (e: any) {
    console.log("Error getting positions:", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
