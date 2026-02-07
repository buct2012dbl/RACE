import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  
  const txHash = "0xd5aad22b1c4f923cdfb0db445fb238aefd03b3e57cfcb527523f99ef8e82766d";
  
  console.log("Checking transaction:", txHash);
  
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log("\nTransaction Receipt:");
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Logs:", receipt.logs.length);
  
  if (receipt.status === 0) {
    console.log("\n❌ Transaction FAILED!");
  }
}

main().catch(console.error);
