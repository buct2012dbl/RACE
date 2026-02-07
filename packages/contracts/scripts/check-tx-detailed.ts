import { ethers } from "hardhat";

async function main() {
  const txHash = "0xedd38dea2ff6b3abe117e15fb2ef43d75d01075122b62856b48d834ce21ee4af";
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  
  console.log(`Checking transaction: ${txHash}\n`);
  
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log(`Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`\nLogs (${receipt.logs.length} events emitted):`);
  
  // Get AIAgent contract to decode events
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\nEvent ${i + 1}:`);
    console.log(`  Address: ${log.address}`);
    console.log(`  Topics: ${log.topics.length}`);
    
    // Try to decode if it's from AIAgent
    if (log.address.toLowerCase() === aiAgentAddress.toLowerCase()) {
      try {
        const parsed = aiAgent.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsed) {
          console.log(`  Event Name: ${parsed.name}`);
          console.log(`  Args:`, parsed.args);
        }
      } catch (e) {
        console.log(`  (Could not decode)`);
      }
    }
  }
  
  // Check agent state after transaction
  console.log(`\n\nChecking agent state after transaction...`);
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
    console.log(`  Protocol: ${pos.protocol}`);
    console.log(`  Asset: ${pos.asset}`);
    console.log(`  Amount: ${ethers.formatEther(pos.amount)}`);
    console.log(`  Entry Price: ${ethers.formatEther(pos.entryPrice)}`);
    console.log(`  Timestamp: ${new Date(Number(pos.timestamp) * 1000).toLocaleString()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
