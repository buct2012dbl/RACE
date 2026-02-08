import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n=== Redeploying AI Agent (Price Fix) ===");
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const RWA_VAULT_ADDRESS = "0x42c168F005161F3BBf9F2eB8D4F9f253332556C3";
  const LENDING_POOL_ADDRESS = "0x6bec256464AD5f994a154A4210510E86a0833b19";
  const USDC_ADDRESS = "0xfC40492859281e332abb84537398acF1FFc24560";
  const RISK_MANAGER_ADDRESS = "0x31fBDe7eDe13D37a4888aF43e3B36106Ec06F90c";

  console.log("\n1️⃣ Deploying new AIAgent contract...");
  const AIAgent = await ethers.getContractFactory("AIAgent");
  const aiAgent = await AIAgent.deploy(
    RWA_VAULT_ADDRESS,
    LENDING_POOL_ADDRESS,
    USDC_ADDRESS,
    RISK_MANAGER_ADDRESS
  );
  await aiAgent.waitForDeployment();
  const aiAgentAddress = await aiAgent.getAddress();

  console.log("✅ AIAgent deployed to:", aiAgentAddress);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nNew AIAgent Address:", aiAgentAddress);
  console.log("\n⚠️  IMPORTANT: Update the following files:");
  console.log("1. packages/frontend/.env.local");
  console.log("   NEXT_PUBLIC_AI_AGENT_ADDRESS=" + aiAgentAddress);
  console.log("\n2. packages/ai-agents/.env");
  console.log("   AI_AGENT_ADDRESS=" + aiAgentAddress);
  console.log("\n3. Then run: npx hardhat run scripts/initialize-new-agent.ts --network arc");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
