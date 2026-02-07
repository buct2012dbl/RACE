import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  const rwaTokenAddress = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";
  const rwaVaultAddress = "0x5c38Ab14C9274901Bed678900ea3e6801fCBe58E";
  
  console.log("Quick setup for new AIAgent...\n");
  
  // Get contracts
  const rwaToken = await ethers.getContractAt("MockToken", rwaTokenAddress);
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  // Mint RWA tokens
  console.log("1. Minting 3000 RWA tokens...");
  await rwaToken.mint(deployer.address, ethers.parseEther("3000"));
  console.log("✅ Minted\n");
  
  // Approve AIAgent
  console.log("2. Approving AIAgent...");
  await rwaToken.approve(aiAgentAddress, ethers.parseEther("3000"));
  console.log("✅ Approved\n");
  
  // Initialize agent
  console.log("3. Initializing AIAgent...");
  const config = {
    owner: deployer.address,
    riskTolerance: 5,
    targetROI: 1200, // 12%
    maxDrawdown: 1500, // 15%
    strategies: []
  };
  
  await aiAgent.initializeAgent(
    config,
    rwaVaultAddress,
    rwaTokenAddress,
    ethers.parseEther("3000")
  );
  console.log("✅ Agent initialized with 3000 RWA collateral\n");
  
  console.log("Setup complete! Agent is ready.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
