import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  
  const txHash = "0xa67d7e1f119b7235ae14eb553a4a535ef46eaa71aca16d6513d93405809f7c8c";
  
  console.log("Checking transaction:", txHash);
  
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log("\nTransaction Receipt:");
  console.log("Status:", receipt.status === 1 ? "Success ✅" : "Failed ❌");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Logs:", receipt.logs.length);
  
  if (receipt.status === 0) {
    console.log("\n❌ Transaction FAILED!");
  } else {
    console.log("\n✅ Transaction succeeded!");
    
    // Try to decode logs
    const aiAgent = await ethers.getContractAt("AIAgent", "0xD713C2Bb53eC5f829ae0D72582b89F73798e9E03");
    
    for (const log of receipt.logs) {
      try {
        const parsed = aiAgent.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsed) {
          console.log("\nEvent:", parsed.name);
          console.log("Args:", parsed.args);
        }
      } catch (e) {
        // Not an AIAgent event
      }
    }
  }
}

main().catch(console.error);
