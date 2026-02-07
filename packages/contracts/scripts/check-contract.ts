import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  
  const AI_AGENT_ADDRESS = "0x24aD65150D0ac047279EF6c336Bf7EDA8b799600";
  
  // Check if contract exists
  const code = await provider.getCode(AI_AGENT_ADDRESS);
  console.log("Contract code length:", code.length);
  console.log("Has code:", code !== "0x");
  
  if (code === "0x") {
    console.log("❌ No contract deployed at this address!");
  } else {
    console.log("✅ Contract exists at this address");
    console.log("Code preview:", code.substring(0, 100) + "...");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
