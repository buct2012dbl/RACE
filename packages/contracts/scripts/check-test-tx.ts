import { ethers } from "hardhat";

async function main() {
  // Check the transaction from the test
  const txHash = "0x5408645148327593aff3337cbbe699b28c716673d6ec059e60bfc89f6b9d48a4";

  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    console.log("Transaction not found");
    return;
  }

  console.log("\n=== Transaction Receipt ===");
  console.log(`Status: ${receipt.status === 1 ? "SUCCESS" : "FAILED"}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Logs: ${receipt.logs.length}`);

  // Check agent state after this transaction
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  console.log("\n=== Agent State ===");
  const state = await aiAgent.agentState();
  console.log(`Borrowed USDC: ${ethers.formatEther(state.borrowedUSDC)}`);
  console.log(`Available Credit: ${ethers.formatEther(state.availableCredit)}`);

  const positions = await aiAgent.getAllPositions();
  console.log(`Positions: ${positions.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
