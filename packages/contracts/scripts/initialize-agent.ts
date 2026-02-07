import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Initializing agent with account:", deployer.address);

  // Contract addresses from deployment
  const AI_AGENT_ADDRESS = "0x24aD65150D0ac047279EF6c336Bf7EDA8b799600";
  const MOCK_USDC_ADDRESS = "0xaAE8b402CEb7B8CdBF67865686De128b57e8c4ca";

  // Get contract instance
  const AIAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);

  // Try to read current state
  try {
    const state = await AIAgent.getState();
    console.log("Current state:", state);
  } catch (error: any) {
    console.log("Error reading state:", error.message);
  }

  // Check if already initialized
  try {
    const rwaVault = await AIAgent.rwaVault();
    console.log("RWA Vault:", rwaVault);
  } catch (error: any) {
    console.log("Error reading rwaVault:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
