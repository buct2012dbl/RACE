import { ethers } from "hardhat";

async function main() {
  console.log("Deploying RACE Protocol contracts...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy RWAVault
  console.log("\n1. Deploying RWAVault...");
  const RWAVault = await ethers.getContractFactory("RWAVault");
  const rwaVault = await RWAVault.deploy();
  await rwaVault.waitForDeployment();
  const rwaVaultAddress = await rwaVault.getAddress();
  console.log("RWAVault deployed to:", rwaVaultAddress);

  // Deploy mock USDC for testing
  console.log("\n2. Deploying Mock USDC...");
  const MockERC20 = await ethers.getContractFactory("RWAToken");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", ethers.parseUnits("1000000", 6));
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Mock USDC deployed to:", usdcAddress);

  // Deploy mock LendingPool (placeholder)
  console.log("\n3. Deploying Mock LendingPool...");
  const lendingPoolAddress = ethers.ZeroAddress; // Replace with actual lending pool

  // Deploy AIAgent
  console.log("\n4. Deploying AIAgent...");
  const AIAgent = await ethers.getContractFactory("AIAgent");
  const aiAgent = await AIAgent.deploy(
    rwaVaultAddress,
    lendingPoolAddress,
    usdcAddress,
    deployer.address // Controller address
  );
  await aiAgent.waitForDeployment();
  const aiAgentAddress = await aiAgent.getAddress();
  console.log("AIAgent deployed to:", aiAgentAddress);

  // Deploy RiskManager
  console.log("\n5. Deploying RiskManager...");
  const RiskManager = await ethers.getContractFactory("RiskManager");
  const riskManager = await RiskManager.deploy();
  await riskManager.waitForDeployment();
  const riskManagerAddress = await riskManager.getAddress();
  console.log("RiskManager deployed to:", riskManagerAddress);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("RWAVault:", rwaVaultAddress);
  console.log("Mock USDC:", usdcAddress);
  console.log("AIAgent:", aiAgentAddress);
  console.log("RiskManager:", riskManagerAddress);
  console.log("\nSave these addresses for frontend configuration!");

  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(), // Convert BigInt to string
    deployer: deployer.address,
    contracts: {
      RWAVault: rwaVaultAddress,
      USDC: usdcAddress,
      AIAgent: aiAgentAddress,
      RiskManager: riskManagerAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
