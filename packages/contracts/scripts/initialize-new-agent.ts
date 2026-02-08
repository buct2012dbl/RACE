import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n=== Initializing New AI Agent ===");
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const AI_AGENT_ADDRESS = "0xDEe535cF20a05A5Ac8099Ce3612396C3E7C9586f";
  const RWA_TOKEN_ADDRESS = "0xcbc68a505be3Eb3bca598CA3E1B68a6Fbcdd2cF2";
  const RWA_VAULT_ADDRESS = "0x42c168F005161F3BBf9F2eB8D4F9f253332556C3";

  console.log("\n1️⃣ Getting contracts...");
  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);
  const rwaToken = await ethers.getContractAt("IERC20", RWA_TOKEN_ADDRESS);

  // Check RWA token balance
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log("RWA Token Balance:", ethers.formatEther(balance));

  if (balance < ethers.parseEther("100")) {
    console.log("\n⚠️  Not enough RWA tokens. Minting...");
    const mockRwa = await ethers.getContractAt("MockToken", RWA_TOKEN_ADDRESS);
    const mintTx = await mockRwa.mint(deployer.address, ethers.parseEther("1000"));
    await mintTx.wait();
    console.log("✅ Minted 1000 RWA tokens");
  }

  // Approve AI Agent to spend RWA tokens
  console.log("\n2️⃣ Approving AI Agent to spend RWA tokens...");
  const collateralAmount = ethers.parseEther("100"); // 100 RWA tokens
  const approveTx = await rwaToken.approve(AI_AGENT_ADDRESS, collateralAmount);
  await approveTx.wait();
  console.log("✅ Approved");

  // Initialize agent with config
  console.log("\n3️⃣ Initializing AI Agent...");
  const config = {
    owner: deployer.address,
    riskTolerance: 5, // Medium risk (1-10 scale)
    targetROI: 2000, // 20% annual ROI (in basis points)
    maxDrawdown: 1000, // 10% max drawdown (in basis points)
    strategies: [], // No specific strategies yet
  };

  const initTx = await aiAgent.initializeAgent(
    RWA_TOKEN_ADDRESS,
    collateralAmount,
    config
  );
  await initTx.wait();
  console.log("✅ Agent initialized");

  // Verify initialization
  console.log("\n4️⃣ Verifying agent state...");
  const state = await aiAgent.agentState();
  console.log("- RWA Collateral:", state.rwaCollateral);
  console.log("- Collateral Amount:", ethers.formatEther(state.collateralAmount), "tokens");
  console.log("- Borrowed USDC:", ethers.formatEther(state.borrowedUSDC), "USDC");
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit), "USDC");
  console.log("- Risk Tolerance:", state.config.riskTolerance.toString());
  console.log("- Target ROI:", state.config.targetROI.toString(), "bps");

  console.log("\n" + "=".repeat(60));
  console.log("✅ AI Agent successfully initialized!");
  console.log("- Collateral deposited: 100 RWA tokens");
  console.log("- Ready to start trading");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
