import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  const rwaTokenAddress = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";
  const rwaVaultAddress = "0x5c38Ab14C9274901Bed678900ea3e6801fCBe58E";
  
  console.log("Quick setup for new AIAgent...\n");
  
  // Get contracts
  const rwaToken = await ethers.getContractAt("IERC20", rwaTokenAddress);
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  // Check balance
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log(`RWA Token balance: ${ethers.formatEther(balance)}`);
  
  if (balance < ethers.parseEther("3000")) {
    console.log("❌ Not enough RWA tokens. Need to mint first.");
    return;
  }
  
  // Approve AIAgent
  console.log("\n1. Approving AIAgent...");
  await rwaToken.approve(aiAgentAddress, ethers.parseEther("3000"));
  console.log("✅ Approved\n");
  
  // Initialize agent
  console.log("2. Initializing AIAgent...");
  const config = {
    owner: deployer.address,
    riskTolerance: 5,
    targetROI: 1200, // 12%
    maxDrawdown: 1500, // 15%
    strategies: []
  };
  
  const tx = await aiAgent.initializeAgent(
    config,
    rwaVaultAddress,
    rwaTokenAddress,
    ethers.parseEther("3000")
  );
  await tx.wait();
  console.log("✅ Agent initialized with 3000 RWA collateral\n");
  
  console.log("Setup complete! Agent is ready.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
