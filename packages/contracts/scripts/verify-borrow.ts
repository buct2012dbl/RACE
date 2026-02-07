import { ethers } from "hardhat";

async function main() {
  const aiAgent = await ethers.getContractAt(
    "AIAgent",
    "0xD713C2Bb53eC5f829ae0D72582b89F73798e9E03"
  );

  console.log("Checking AI Agent state after borrow...\n");
  const state = await aiAgent.agentState();
  
  console.log("Agent State:");
  console.log("Collateral Amount:", ethers.formatEther(state[2]));
  console.log("Borrowed USDC:", ethers.formatEther(state[3]));
  console.log("Available Credit:", ethers.formatEther(state[4]));
  console.log("Total Assets:", ethers.formatEther(state[5]));
}

main().catch(console.error);
