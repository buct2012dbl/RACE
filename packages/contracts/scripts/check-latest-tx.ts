import { ethers } from "hardhat";

async function main() {
  const txHash = "0xd003073017ca4d14784b5a0e8a591036888efac9bedd253f2385d35035acf11a";
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  
  console.log(`Checking transaction: ${txHash}\n`);
  
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log(`Status: ${receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Events: ${receipt.logs.length}`);
  
  if (receipt.status === 1) {
    // Check agent state
    console.log(`\n\nChecking agent state after transaction...`);
    const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
    const state = await aiAgent.agentState();
    console.log(`Collateral: ${ethers.formatEther(state[2])}`);
    console.log(`Borrowed: ${ethers.formatEther(state[3])}`);
    console.log(`Available Credit: ${ethers.formatEther(state[4])}`);
    console.log(`Total Assets: ${ethers.formatEther(state[5])}`);
    
    // Check positions
    const positions = await aiAgent.getAllPositions();
    console.log(`\nPositions: ${positions.length}`);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      console.log(`\nPosition ${i + 1}:`);
      console.log(`  Asset: ${pos.asset}`);
      console.log(`  Amount: ${ethers.formatEther(pos.amount)}`);
      console.log(`  Entry Price: ${ethers.formatEther(pos.entryPrice)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
