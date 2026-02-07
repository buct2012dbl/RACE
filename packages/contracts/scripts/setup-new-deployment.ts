import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Setting up new deployment...");
  console.log("Account:", deployer.address);

  const RWA_VAULT_ADDRESS = "0x44ea26df5a3737B0F1D6d2D306470B25B21389Fe";
  const AI_AGENT_ADDRESS = "0x039A841D68728bd8B0EBf4409Dc5e61305D41199";
  const RWA_TOKEN_ADDRESS = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";

  // 1. Register RWA token in vault
  console.log("\n1. Registering RWA token in vault...");
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);
  const valuation = ethers.parseUnits("10000000", 18);
  const ltv = 8000;
  
  const registerTx = await rwaVault.registerRWA(RWA_TOKEN_ADDRESS, valuation, ltv);
  await registerTx.wait();
  console.log("✅ RWA token registered");

  // 2. Initialize AI Agent
  console.log("\n2. Initializing AI Agent...");
  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);
  const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);

  const amount = ethers.parseEther("100");
  
  // Approve
  const approveTx = await rwaToken.approve(AI_AGENT_ADDRESS, amount);
  await approveTx.wait();
  console.log("✅ Approved tokens");

  // Initialize
  const config = {
    owner: deployer.address,
    riskTolerance: 5,
    targetROI: 1200,
    maxDrawdown: 1500,
    strategies: []
  };

  const initTx = await aiAgent.initializeAgent(RWA_TOKEN_ADDRESS, amount, config);
  await initTx.wait();
  console.log("✅ AI Agent initialized");

  // 3. Verify
  console.log("\n3. Verifying setup...");
  const state = await aiAgent.agentState();
  console.log("Collateral Amount:", ethers.formatEther(state[2]));
  console.log("Available Credit:", ethers.formatEther(state[4]));

  console.log("\n✅ Setup complete! You can now use the frontend to add more collateral.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
