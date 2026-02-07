import { ethers } from "hardhat";

async function main() {
  const txHash = "0xc06fd42baae479cb66697c3a16228bcd75750d2758d9246dea43a8be42a95a2e";
  
  console.log(`Checking transaction: ${txHash}\n`);
  
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log(`Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`\nLogs (${receipt.logs.length} events):`);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\nEvent ${i + 1}:`);
    console.log(`  Address: ${log.address}`);
    console.log(`  Topics: ${log.topics.length}`);
    console.log(`  Data length: ${log.data.length}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
