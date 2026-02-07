import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying SimpleDEX and creating liquidity pools...");
  console.log("Deployer:", deployer.address);

  // 1. Deploy SimpleDEX
  console.log("\n1️⃣ Deploying SimpleDEX...");
  const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
  const dex = await SimpleDEX.deploy();
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("✅ SimpleDEX deployed to:", dexAddress);

  // 2. Deploy mock tokens (ETH, BTC)
  console.log("\n2️⃣ Deploying mock tokens...");
  const MockToken = await ethers.getContractFactory("MockToken");
  
  const ethToken = await MockToken.deploy("Wrapped ETH", "WETH", ethers.parseEther("10000"));
  await ethToken.waitForDeployment();
  const ethAddress = await ethToken.getAddress();
  console.log("✅ WETH deployed to:", ethAddress);

  const btcToken = await MockToken.deploy("Wrapped BTC", "WBTC", ethers.parseEther("1000"));
  await btcToken.waitForDeployment();
  const btcAddress = await btcToken.getAddress();
  console.log("✅ WBTC deployed to:", btcAddress);

  // 3. Get USDC address (already deployed)
  const USDC_ADDRESS = "0x10767D5bFa385A473c90Bb6fb1b0208Fec5D3266";
  const usdc = await ethers.getContractAt("MockToken", USDC_ADDRESS);
  console.log("✅ Using USDC at:", USDC_ADDRESS);

  // 4. Create ETH-USDC pool
  console.log("\n3️⃣ Creating ETH-USDC liquidity pool...");
  const ethAmount = ethers.parseEther("100"); // 100 ETH
  const usdcForEth = ethers.parseEther("250000"); // 250k USDC (price: 2500 USDC/ETH)

  await ethToken.approve(dexAddress, ethAmount);
  await usdc.approve(dexAddress, usdcForEth);

  const createEthPoolTx = await dex.createPool(ethAddress, USDC_ADDRESS, ethAmount, usdcForEth);
  await createEthPoolTx.wait();
  console.log("✅ ETH-USDC pool created");

  // 5. Create BTC-USDC pool
  console.log("\n4️⃣ Creating BTC-USDC liquidity pool...");
  const btcAmount = ethers.parseEther("10"); // 10 BTC
  const usdcForBtc = ethers.parseEther("450000"); // 450k USDC (price: 45000 USDC/BTC)

  await btcToken.approve(dexAddress, btcAmount);
  await usdc.approve(dexAddress, usdcForBtc);

  const createBtcPoolTx = await dex.createPool(btcAddress, USDC_ADDRESS, btcAmount, usdcForBtc);
  await createBtcPoolTx.wait();
  console.log("✅ BTC-USDC pool created");

  // 6. Verify pools
  console.log("\n5️⃣ Verifying pools...");
  const ethPrice = await dex.getPrice(ethAddress, USDC_ADDRESS);
  console.log("ETH Price:", ethers.formatEther(ethPrice), "USDC");

  const btcPrice = await dex.getPrice(btcAddress, USDC_ADDRESS);
  console.log("BTC Price:", ethers.formatEther(btcPrice), "USDC");

  const [ethReserve0, ethReserve1] = await dex.getReserves(ethAddress, USDC_ADDRESS);
  console.log("ETH Pool Reserves:", ethers.formatEther(ethReserve0), "ETH,", ethers.formatEther(ethReserve1), "USDC");

  const [btcReserve0, btcReserve1] = await dex.getReserves(btcAddress, USDC_ADDRESS);
  console.log("BTC Pool Reserves:", ethers.formatEther(btcReserve0), "BTC,", ethers.formatEther(btcReserve1), "USDC");

  // 7. Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Deployment Summary");
  console.log("=".repeat(60));
  console.log("SimpleDEX:", dexAddress);
  console.log("WETH:", ethAddress);
  console.log("WBTC:", btcAddress);
  console.log("USDC:", USDC_ADDRESS);
  console.log("\n💰 Liquidity Pools:");
  console.log("ETH-USDC: 100 ETH + 250,000 USDC (Price: 2,500 USDC/ETH)");
  console.log("BTC-USDC: 10 BTC + 450,000 USDC (Price: 45,000 USDC/BTC)");
  console.log("=".repeat(60));

  return {
    dex: dexAddress,
    weth: ethAddress,
    wbtc: btcAddress,
    usdc: USDC_ADDRESS
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
