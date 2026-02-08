import { ethers } from "hardhat";

/**
 * Reset AI Agent by deploying a fresh instance
 * This will clear all positions and borrowed amounts
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n=== Resetting AI Agent ===");
  console.log("Deployer:", deployer.address);

  // Existing contract addresses
  const RWA_VAULT_ADDRESS = "0x42c168F005161F3BBf9F2eB8D4F9f253332556C3";
  const LENDING_POOL_ADDRESS = "0x6bec256464AD5f994a154A4210510E86a0833b19";
  const USDC_ADDRESS = "0xfC40492859281e332abb84537398acF1FFc24560";
  const OLD_AI_AGENT_ADDRESS = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";

  // Controller address (Python backend)
  const CONTROLLER_ADDRESS = deployer.address; // Using deployer as controller for now

  console.log("\n1️⃣ Deploying new AIAgent contract...");
  const AIAgent = await ethers.getContractFactory("AIAgent");
  const aiAgent = await AIAgent.deploy(
    RWA_VAULT_ADDRESS,
    LENDING_POOL_ADDRESS,
    USDC_ADDRESS,
    CONTROLLER_ADDRESS
  );
  await aiAgent.waitForDeployment();
  const aiAgentAddress = await aiAgent.getAddress();
  console.log("✅ New AIAgent deployed to:", aiAgentAddress);

  console.log("\n2️⃣ Agent State:");
  console.log("- Positions: 0 (fresh start)");
  console.log("- Borrowed USDC: 0");
  console.log("- Collateral: 0");
  console.log("- Controller:", CONTROLLER_ADDRESS);

  console.log("\n" + "=".repeat(60));
  console.log("📊 Reset Summary");
  console.log("=".repeat(60));
  console.log("Old AIAgent:", OLD_AI_AGENT_ADDRESS);
  console.log("New AIAgent:", aiAgentAddress);
  console.log("\n⚠️  Update your .env.local file with the new address:");
  console.log(`NEXT_PUBLIC_AI_AGENT_ADDRESS=${aiAgentAddress}`);
  console.log("=".repeat(60));

  return {
    aiAgent: aiAgentAddress,
    rwaVault: RWA_VAULT_ADDRESS,
    lendingPool: LENDING_POOL_ADDRESS,
    usdc: USDC_ADDRESS,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
