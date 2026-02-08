import { ethers } from "hardhat";

async function main() {
  const simpleDEXAddress = "0x293E0a8f6bbEd6CeE135693c3F93C143f3110627";
  const wethAddress = "0xd39EDBb61F3de1FEBDf984e58F2447Dd14D3a491";
  const wbtcAddress = "0x3C13f9d8aE7EC88ce5B54D2F5BC9D05E0330712D";
  const usdcAddress = "0xfC40492859281e332abb84537398acF1FFc24560";

  const dex = await ethers.getContractAt("SimpleDEX", simpleDEXAddress);

  console.log("\n=== Checking DEX Pools ===\n");

  try {
    const ethPoolId = await dex.getPoolId(wethAddress, usdcAddress);
    const ethPool = await dex.pools(ethPoolId);
    console.log("ETH-USDC Pool:");
    console.log(`  Pool ID: ${ethPoolId}`);
    console.log(`  Token0: ${ethPool.token0}`);
    console.log(`  Token1: ${ethPool.token1}`);
    console.log(`  Reserve0: ${ethers.formatEther(ethPool.reserve0)}`);
    console.log(`  Reserve1: ${ethers.formatEther(ethPool.reserve1)}`);
    console.log(`  Exists: ${ethPool.exists}`);
  } catch (e) {
    console.log("ETH-USDC Pool: ERROR", e.message);
  }

  try {
    const btcPoolId = await dex.getPoolId(wbtcAddress, usdcAddress);
    const btcPool = await dex.pools(btcPoolId);
    console.log("\nBTC-USDC Pool:");
    console.log(`  Pool ID: ${btcPoolId}`);
    console.log(`  Token0: ${btcPool.token0}`);
    console.log(`  Token1: ${btcPool.token1}`);
    console.log(`  Reserve0: ${ethers.formatEther(btcPool.reserve0)}`);
    console.log(`  Reserve1: ${ethers.formatEther(btcPool.reserve1)}`);
    console.log(`  Exists: ${btcPool.exists}`);
  } catch (e) {
    console.log("BTC-USDC Pool: ERROR", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
