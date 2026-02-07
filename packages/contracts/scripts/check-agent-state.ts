import { ethers } from "hardhat";

async function main() {
  const aiAgent = await ethers.getContractAt(
    "AIAgent",
    "0x039A841D68728bd8B0EBf4409Dc5e61305D41199"
  );

  console.log("Checking AI Agent state...");
  const state = await aiAgent.agentState();
  
  console.log("\nAgent State:");
  console.log("Collateral Amount:", ethers.formatEther(state[2]));
  console.log("Borrowed USDC:", ethers.formatEther(state[3]));
  console.log("Available Credit:", ethers.formatEther(state[4]));
  console.log("Total Assets:", ethers.formatEther(state[5]));
}

main().catch(console.error);
