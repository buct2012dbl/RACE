import { ethers } from "hardhat";

async function main() {
  const aiAgent = await ethers.getContractAt(
    "AIAgent",
    "0x80E4f1b1D7C7c50DBC3EC480f3F18f25683D6066"
  );

  console.log("Checking AI Agent state after borrow...\n");
  const state = await aiAgent.agentState();
  
  console.log("✅ Agent State:");
  console.log("Collateral Amount:", ethers.formatEther(state[2]), "RWA");
  console.log("Borrowed USDC:", ethers.formatEther(state[3]), "USDC");
  console.log("Available Credit:", ethers.formatEther(state[4]), "USDC");
  console.log("Total Assets:", ethers.formatEther(state[5]), "USDC");
  
  // Check transaction
  const txHash = "0x8dcb56fe2ef279937b2fdff3b2d86d23741eeea7ec94f8ef197af5d0fd8eafbe";
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  console.log("\n✅ Transaction Status:", receipt?.status === 1 ? "SUCCESS" : "FAILED");
}

main().catch(console.error);
