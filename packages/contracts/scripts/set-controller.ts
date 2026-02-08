import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n=== Setting Controller for AI Agent ===");
  console.log("Deployer:", deployer.address);

  const AI_AGENT_ADDRESS = "0xDEe535cF20a05A5Ac8099Ce3612396C3E7C9586f";

  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);

  // Check current controller
  const currentController = await aiAgent.controller();
  console.log("\n📋 Current Controller:", currentController);

  // Set deployer as controller (so Python orchestrator can call from this address)
  console.log("\n🔄 Setting deployer as controller...");
  const tx = await aiAgent.setController(deployer.address);
  await tx.wait();

  console.log("✅ Controller updated to:", deployer.address);

  // Verify
  const newController = await aiAgent.controller();
  console.log("✅ Verified new controller:", newController);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Controller successfully set!");
  console.log("The Python orchestrator can now execute decisions.");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
