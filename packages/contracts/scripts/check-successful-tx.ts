import { ethers } from "hardhat";

async function main() {
  const txHash = "0x78f72fd31a03bc7be9764c742bcbf9fb69f6918637e9465c1e72f174b93064e1";
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  
  console.log(`Checking SUCCESSFUL transaction: ${txHash}\n`);
  
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
