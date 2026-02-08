import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Arc testnet addresses
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  const rwaTokenAddress = "0xcbc68a505be3Eb3bca598CA3E1B68a6Fbcdd2cF2";
  const rwaVaultAddress = "0x42c168F005161F3BBf9F2eB8D4F9f253332556C3";
  const simpleDEXAddress = "0x293E0a8f6bbEd6CeE135693c3F93C143f3110627";
  
  console.log("Initializing AI Agent on Arc testnet...\n");
  console.log("Deployer:", deployer.address);
  
  // Get contracts
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  const rwaToken = await ethers.getContractAt("IERC20", rwaTokenAddress);
  const rwaVault = await ethers.getContractAt("RWAVault", rwaVaultAddress);
  
  // 1. Check RWA token balance
  console.log("\n1. Checking RWA token balance...");
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} RWA`);
  
  if (balance < ethers.parseEther("3000")) {
    console.log("❌ Insufficient RWA tokens. Need at least 3000 RWA.");
    return;
  }
  
  // 2. Register RWA token in vault if not already registered
  console.log("\n2. Registering RWA token in vault...");
  try {
    const registerTx = await rwaVault.registerRWA(
      rwaTokenAddress,
      ethers.parseEther("1000000"), // 1M USDC valuation
      8000 // 80% LTV
    );
    await registerTx.wait();
    console.log("✅ RWA token registered");
  } catch (e: any) {
    if (e.message.includes("Already registered")) {
      console.log("✅ RWA token already registered");
    } else {
      throw e;
    }
  }
  
  // 3. Approve AI Agent to spend RWA tokens
  console.log("\n3. Approving AI Agent to spend RWA tokens...");
  const collateralAmount = ethers.parseEther("3000"); // 3k RWA
  const approveTx = await rwaToken.approve(aiAgentAddress, collateralAmount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // 4. Initialize the AI Agent with config
  console.log("\n4. Initializing AI Agent...");
  const config = {
    owner: deployer.address,
    riskTolerance: 5, // Medium risk (1-10 scale)
    targetROI: 800, // 8% annual ROI (in basis points)
    maxDrawdown: 1500, // 15% max drawdown (in basis points)
    strategies: [simpleDEXAddress] // Available strategies
  };
  
  const initTx = await aiAgent.initializeAgent(
    rwaTokenAddress,
    collateralAmount,
    config
  );
  await initTx.wait();
  console.log("✅ AI Agent initialized");
  
  // 5. Check agent state
  console.log("\n5. Checking agent state...");
  const state = await aiAgent.agentState();
  console.log(`   RWA Collateral: ${state[1]}`);
  console.log(`   Collateral Amount: ${ethers.formatEther(state[2])}`);
  console.log(`   Borrowed: ${ethers.formatEther(state[3])}`);
  console.log(`   Available Credit: ${ethers.formatEther(state[4])}`);
  console.log(`   Total Assets: ${ethers.formatEther(state[5])}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ AI Agent ready to trade on Arc testnet!");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
