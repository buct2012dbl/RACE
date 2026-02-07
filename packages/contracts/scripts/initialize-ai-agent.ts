import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Initializing AI Agent...");
  console.log("Account:", deployer.address);

  const AI_AGENT_ADDRESS = "0xF93365E688AF86faFD666ca91A8F29fF2DA01fBB";
  const RWA_TOKEN_ADDRESS = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";
  
  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);
  const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);

  // Check if already initialized
  const state = await aiAgent.agentState();
  if (state[1] !== ethers.ZeroAddress) {
    console.log("✅ Agent already initialized!");
    console.log("RWA Collateral:", state[1]);
    console.log("Collateral Amount:", ethers.formatEther(state[2]));
    return;
  }

  console.log("\nInitializing agent with RWA collateral...");
  
  // Approve tokens first
  const amount = ethers.parseEther("100");
  console.log("Approving", ethers.formatEther(amount), "tokens...");
  const approveTx = await rwaToken.approve(AI_AGENT_ADDRESS, amount);
  await approveTx.wait();
  console.log("✅ Approved");

  // Initialize agent
  const config = {
    owner: deployer.address,
    riskTolerance: 5,
    targetROI: 1200, // 12% in basis points
    maxDrawdown: 1500, // 15% in basis points
    strategies: []
  };

  console.log("\nInitializing agent...");
  const tx = await aiAgent.initializeAgent(RWA_TOKEN_ADDRESS, amount, config);
  await tx.wait();
  
  console.log("✅ AI Agent initialized successfully!");
  console.log("Transaction:", tx.hash);

  // Verify
  const newState = await aiAgent.agentState();
  console.log("\nAgent State:");
  console.log("RWA Collateral:", newState[1]);
  console.log("Collateral Amount:", ethers.formatEther(newState[2]));
  console.log("Available Credit:", ethers.formatEther(newState[4]));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
