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
  const usdc = await MockERC20.deploy("USD Coin", "USDC", ethers.parseUnits("10000000", 18)); // 10M USDC
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Mock USDC deployed to:", usdcAddress);

  // Deploy LendingPool
  console.log("\n3. Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(usdcAddress, rwaVaultAddress);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddress);

  // Fund the lending pool with USDC
  console.log("\n3a. Funding LendingPool with USDC...");
  const fundAmount = ethers.parseUnits("1000000", 18); // 1M USDC
  console.log("Approving LendingPool to spend USDC...");
  const approveTx = await usdc.approve(lendingPoolAddress, fundAmount);
  await approveTx.wait();
  console.log("Approval confirmed");

  console.log("Adding liquidity to LendingPool...");
  const addLiqTx = await lendingPool.addLiquidity(fundAmount);
  await addLiqTx.wait();
  console.log("LendingPool funded with", ethers.formatUnits(fundAmount, 18), "USDC");

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

  // Deploy SimpleDEX
  console.log("\n6. Deploying SimpleDEX...");
  const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
  const simpleDEX = await SimpleDEX.deploy();
  await simpleDEX.waitForDeployment();
  const simpleDEXAddress = await simpleDEX.getAddress();
  console.log("SimpleDEX deployed to:", simpleDEXAddress);

  // Deploy WETH
  console.log("\n7. Deploying WETH...");
  const WETH = await ethers.getContractFactory("RWAToken");
  const weth = await WETH.deploy("Wrapped Ether", "WETH", ethers.parseUnits("10000", 18));
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("WETH deployed to:", wethAddress);

  // Deploy WBTC
  console.log("\n8. Deploying WBTC...");
  const WBTC = await ethers.getContractFactory("RWAToken");
  const wbtc = await WBTC.deploy("Wrapped Bitcoin", "WBTC", ethers.parseUnits("1000", 18));
  await wbtc.waitForDeployment();
  const wbtcAddress = await wbtc.getAddress();
  console.log("WBTC deployed to:", wbtcAddress);

  // Deploy RWA Token
  console.log("\n9. Deploying RWA Token...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy("Real World Asset", "RWA", ethers.parseUnits("1000000", 18));
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("RWA Token deployed to:", rwaTokenAddress);

  // Create DEX pools
  console.log("\n10. Creating DEX liquidity pools...");

  // Approve DEX to spend tokens
  console.log("Approving DEX...");
  await usdc.approve(simpleDEXAddress, ethers.parseUnits("700000", 18));
  await weth.approve(simpleDEXAddress, ethers.parseUnits("200", 18));
  await wbtc.approve(simpleDEXAddress, ethers.parseUnits("20", 18));

  // Create ETH-USDC pool
  console.log("Creating ETH-USDC pool...");
  const ethAmount = ethers.parseUnits("100", 18);
  const ethUsdcAmount = ethers.parseUnits("250000", 18);
  const tx1 = await simpleDEX.createPool(wethAddress, usdcAddress, ethAmount, ethUsdcAmount);
  await tx1.wait();
  console.log("✅ ETH-USDC pool created");

  // Create BTC-USDC pool
  console.log("Creating BTC-USDC pool...");
  const btcAmount = ethers.parseUnits("10", 18);
  const btcUsdcAmount = ethers.parseUnits("450000", 18);
  const tx2 = await simpleDEX.createPool(wbtcAddress, usdcAddress, btcAmount, btcUsdcAmount);
  await tx2.wait();
  console.log("✅ BTC-USDC pool created");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("RWAVault:", rwaVaultAddress);
  console.log("Mock USDC:", usdcAddress);
  console.log("LendingPool:", lendingPoolAddress);
  console.log("AIAgent:", aiAgentAddress);
  console.log("RiskManager:", riskManagerAddress);
  console.log("SimpleDEX:", simpleDEXAddress);
  console.log("WETH:", wethAddress);
  console.log("WBTC:", wbtcAddress);
  console.log("RWA Token:", rwaTokenAddress);
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
      LendingPool: lendingPoolAddress,
      AIAgent: aiAgentAddress,
      RiskManager: riskManagerAddress,
      SimpleDEX: simpleDEXAddress,
      WETH: wethAddress,
      WBTC: wbtcAddress,
      RWAToken: rwaTokenAddress,
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
