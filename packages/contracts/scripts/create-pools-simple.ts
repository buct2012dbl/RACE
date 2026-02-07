import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const dexAddress = "0x7C303B4A9384965530d3e6a80378c27FDD9202bE";
  const usdcAddress = "0x21a6e8e27bA20089c8176fB7606Cc9259b30834f";
  const wethAddress = "0xC931BA8825A9Db6620a30bE42D3f1E554206a4e2";
  const wbtcAddress = "0x5aa45CB5A0c55429caa8094261Da3Bfe607aF284";
  
  console.log("Creating DEX liquidity pools...\n");
  
  const dex = await ethers.getContractAt("SimpleDEX", dexAddress);
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  const weth = await ethers.getContractAt("IERC20", wethAddress);
  const wbtc = await ethers.getContractAt("IERC20", wbtcAddress);
  
  // Check balances
  const usdcBalance = await usdc.balanceOf(deployer.address);
  const wethBalance = await weth.balanceOf(deployer.address);
  const wbtcBalance = await wbtc.balanceOf(deployer.address);
  
  console.log(`Current balances:`);
  console.log(`  USDC: ${ethers.formatEther(usdcBalance)}`);
  console.log(`  WETH: ${ethers.formatEther(wethBalance)}`);
  console.log(`  WBTC: ${ethers.formatEther(wbtcBalance)}`);
  
  if (usdcBalance < ethers.parseEther("700000")) {
    console.log("\n❌ Not enough USDC. Need to mint or transfer more.");
    return;
  }
  
  // Approve DEX
  console.log("\n1. Approving DEX...");
  await usdc.approve(dexAddress, ethers.parseEther("700000"));
  await weth.approve(dexAddress, ethers.parseEther("200"));
  await wbtc.approve(dexAddress, ethers.parseEther("20"));
  console.log("✅ Approved\n");
  
  // Create ETH-USDC pool
  console.log("2. Creating ETH-USDC pool...");
  const ethAmount = ethers.parseEther("100"); // 100 ETH
  const ethUsdcAmount = ethers.parseEther("250000"); // 250k USDC (price: $2,500/ETH)
  
  const tx1 = await dex.createPool(wethAddress, usdcAddress, ethAmount, ethUsdcAmount);
  await tx1.wait();
  console.log("✅ ETH-USDC pool created (100 ETH + 250,000 USDC)\n");
  
  // Create BTC-USDC pool
  console.log("3. Creating BTC-USDC pool...");
  const btcAmount = ethers.parseEther("10"); // 10 BTC
  const btcUsdcAmount = ethers.parseEther("450000"); // 450k USDC (price: $45,000/BTC)
  
  const tx2 = await dex.createPool(wbtcAddress, usdcAddress, btcAmount, btcUsdcAmount);
  await tx2.wait();
  console.log("✅ BTC-USDC pool created (10 BTC + 450,000 USDC)\n");
  
  console.log("=" * 50);
  console.log("✅ All pools created successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
