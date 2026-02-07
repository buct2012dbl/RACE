import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  const rwaTokenAddress = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";
  const rwaVaultAddress = "0x5c38Ab14C9274901Bed678900ea3e6801fCBe58E";
  
  console.log("Complete setup for new AIAgent...\n");
  
  // Get contracts
  const rwaToken = await ethers.getContractAt("IERC20", rwaTokenAddress);
  const rwaVault = await ethers.getContractAt("RWAVault", rwaVaultAddress);
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  // Check balance
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log(`RWA Token balance: ${ethers.formatEther(balance)}\n`);
  
  // Register RWA token
  console.log("1. Registering RWA token in vault...");
  try {
    const registerTx = await rwaVault.registerRWA(
      rwaTokenAddress,
      ethers.parseEther("0.8"), // 80% LTV
      ethers.parseEther("1.0")  // $1 price
    );
    await registerTx.wait();
    console.log("✅ RWA registered\n");
  } catch (e: any) {
    if (e.message.includes("Already registered")) {
      console.log("✅ RWA already registered\n");
    } else {
      throw e;
    }
  }
  
  // Approve AIAgent
  console.log("2. Approving AIAgent...");
  const approveTx = await rwaToken.approve(aiAgentAddress, ethers.parseEther("3000"));
  await approveTx.wait();
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
  
  const tx = await aiAgent.initializeAgent(
    rwaTokenAddress,
    ethers.parseEther("3000"),
    config
  );
  await tx.wait();
  console.log("✅ Agent initialized with 3000 RWA collateral\n");
  
  // Check agent state
  const state = await aiAgent.agentState();
  console.log("Agent State:");
  console.log(`  Collateral: ${ethers.formatEther(state[2])}`);
  console.log(`  Borrowed: ${ethers.formatEther(state[3])}`);
  console.log(`  Available Credit: ${ethers.formatEther(state[4])}`);
  
  console.log("\n✅ Setup complete! Agent is ready.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
