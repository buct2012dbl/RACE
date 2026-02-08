import { ethers } from "hardhat";

async function main() {
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  console.log("=== Checking Current Position ===\n");

  const state = await aiAgent.agentState();
  console.log(`Borrowed USDC: ${ethers.formatEther(state.borrowedUSDC)}`);
  console.log(`Available Credit: ${ethers.formatEther(state.availableCredit)}`);

  const positions = await aiAgent.getAllPositions();
  console.log(`\nNumber of Positions: ${positions.length}`);

  if (positions.length > 0) {
    console.log("\n=== Position 0 ===");
    const pos = positions[0];
    console.log(`Protocol: ${pos.protocol}`);
    console.log(`Asset: ${pos.asset}`);
    console.log(`Amount: ${ethers.formatEther(pos.amount)}`);
    console.log(`Entry Price: ${pos.entryPrice.toString()}`);
    console.log(`Stop Loss: ${pos.stopLoss.toString()}`);
    console.log(`Take Profit: ${pos.takeProfit.toString()}`);
    console.log(`Timestamp: ${pos.timestamp.toString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
