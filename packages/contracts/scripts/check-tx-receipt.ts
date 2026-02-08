import { ethers } from "hardhat";

async function main() {
  const txHash = "0x7cfafc41766ff77d6c67c298a1090b9e36bdbf12085f4ff706bb858f5ed8e330";
  
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
  
  if (receipt.logs.length > 0) {
    console.log("\n=== Events ===");
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nLog ${i}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${log.topics.length}`);
      console.log(`  Data: ${log.data.substring(0, 66)}...`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
