import { ethers } from "hardhat";
import axios from "axios";

// Contract addresses (Updated Feb 8, 2026)
const SIMPLE_DEX_ADDRESS = "0x75687780AD8B39Cc7bab179Dd127f672be04b9ED";
const WETH_ADDRESS = "0x6e204AF9414C49032bC3851DbDe3fe5c42ac7585";
const WBTC_ADDRESS = "0xB79c2c7e30C64002A64Ab0375D36a7f701CAB84E";
const USDC_ADDRESS = "0xfC40492859281e332abb84537398acF1FFc24560";

// CoinGecko API
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Minimum price deviation to trigger sync (1%)
const MIN_DEVIATION_PERCENT = 1.0;

interface CoinGeckoPrices {
  bitcoin: { usd: number };
  ethereum: { usd: number };
}

/**
 * Fetch current BTC and ETH prices from CoinGecko
 */
async function fetchMarketPrices(): Promise<{ btcPrice: number; ethPrice: number }> {
  try {
    const response = await axios.get<CoinGeckoPrices>(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: "bitcoin,ethereum",
        vs_currencies: "usd",
      },
      timeout: 10000,
    });

    const btcPrice = response.data.bitcoin.usd;
    const ethPrice = response.data.ethereum.usd;

    console.log(`\n=== Market Prices from CoinGecko ===`);
    console.log(`BTC: $${btcPrice.toLocaleString()}`);
    console.log(`ETH: $${ethPrice.toLocaleString()}`);

    return { btcPrice, ethPrice };
  } catch (error) {
    console.error("Failed to fetch prices from CoinGecko:", error);
    throw error;
  }
}

/**
 * Get current DEX price for a pool
 */
async function getDexPrice(
  dex: any,
  token0: string,
  token1: string
): Promise<{ price: number; reserve0: bigint; reserve1: bigint }> {
  const poolId = await dex.getPoolId(token0, token1);
  const pool = await dex.pools(poolId);

  if (!pool.exists) {
    throw new Error(`Pool does not exist for ${token0}/${token1}`);
  }

  // Determine which token is token0 in the pool
  const isToken0 = token0.toLowerCase() === pool.token0.toLowerCase();
  const reserve0 = isToken0 ? pool.reserve0 : pool.reserve1;
  const reserve1 = isToken0 ? pool.reserve1 : pool.reserve0;

  // Calculate price (token1 per token0)
  // Both reserves are in 18 decimals, so price is reserve1/reserve0
  const price = Number(reserve1) / Number(reserve0);

  return { price, reserve0, reserve1 };
}

/**
 * Calculate new reserves to match target price
 * Keeps reserve0 constant and adjusts reserve1
 */
function calculateNewReserves(
  currentReserve0: bigint,
  currentReserve1: bigint,
  targetPrice: number
): { newReserve0: bigint; newReserve1: bigint } {
  // Keep reserve0 constant
  const newReserve0 = currentReserve0;

  // Calculate new reserve1 to match target price
  // price = reserve1 / reserve0
  // reserve1 = price * reserve0
  const newReserve1 = BigInt(Math.floor(targetPrice * Number(currentReserve0)));

  return { newReserve0, newReserve1 };
}

/**
 * Calculate price deviation percentage
 */
function calculateDeviation(currentPrice: number, targetPrice: number): number {
  return Math.abs(((currentPrice - targetPrice) / targetPrice) * 100);
}

/**
 * Sync a single pool with market price
 */
async function syncPool(
  dex: any,
  token0: string,
  token1: string,
  tokenName: string,
  targetPrice: number,
  dryRun: boolean = false
): Promise<boolean> {
  console.log(`\n=== Syncing ${tokenName}-USDC Pool ===`);

  try {
    // Get current DEX price
    const { price: currentPrice, reserve0, reserve1 } = await getDexPrice(dex, token0, token1);

    console.log(`Current DEX Price: $${currentPrice.toLocaleString()}`);
    console.log(`Target Market Price: $${targetPrice.toLocaleString()}`);
    console.log(`Current Reserves: ${ethers.formatEther(reserve0)} ${tokenName}, ${ethers.formatEther(reserve1)} USDC`);

    // Calculate deviation
    const deviation = calculateDeviation(currentPrice, targetPrice);
    console.log(`Price Deviation: ${deviation.toFixed(2)}%`);

    // Check if sync is needed
    if (deviation < MIN_DEVIATION_PERCENT) {
      console.log(`✓ Price deviation below ${MIN_DEVIATION_PERCENT}%, no sync needed`);
      return false;
    }

    // Calculate new reserves
    const { newReserve0, newReserve1 } = calculateNewReserves(reserve0, reserve1, targetPrice);

    console.log(`New Reserves: ${ethers.formatEther(newReserve0)} ${tokenName}, ${ethers.formatEther(newReserve1)} USDC`);
    console.log(`New DEX Price: $${(Number(newReserve1) / Number(newReserve0)).toLocaleString()}`);

    if (dryRun) {
      console.log(`[DRY RUN] Would adjust reserves`);
      return true;
    }

    // Adjust reserves
    console.log(`Adjusting reserves...`);
    const tx = await dex.adjustReserves(token0, token1, newReserve0, newReserve1);
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✓ Reserves adjusted successfully (Gas used: ${receipt.gasUsed.toString()})`);

    return true;
  } catch (error) {
    console.error(`Failed to sync ${tokenName} pool:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const continuous = args.includes("--continuous");
  const interval = parseInt(args.find((arg) => arg.startsWith("--interval="))?.split("=")[1] || "300");

  console.log("\n=== SimpleDEX Price Synchronization ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Continuous: ${continuous ? `Yes (${interval}s interval)` : "No"}`);
  console.log(`Min Deviation: ${MIN_DEVIATION_PERCENT}%`);

  const dex = await ethers.getContractAt("SimpleDEX", SIMPLE_DEX_ADDRESS);

  const runSync = async () => {
    try {
      // Fetch market prices
      const { btcPrice, ethPrice } = await fetchMarketPrices();

      // Sync BTC pool
      const btcSynced = await syncPool(dex, WBTC_ADDRESS, USDC_ADDRESS, "BTC", btcPrice, dryRun);

      // Sync ETH pool
      const ethSynced = await syncPool(dex, WETH_ADDRESS, USDC_ADDRESS, "ETH", ethPrice, dryRun);

      // Summary
      console.log("\n=== Sync Summary ===");
      console.log(`BTC Pool: ${btcSynced ? "✓ Synced" : "○ No sync needed"}`);
      console.log(`ETH Pool: ${ethSynced ? "✓ Synced" : "○ No sync needed"}`);
    } catch (error) {
      console.error("\nSync failed:", error);
    }
  };

  // Run sync
  await runSync();

  // Continuous mode
  if (continuous) {
    console.log(`\nRunning in continuous mode, syncing every ${interval} seconds...`);
    console.log("Press Ctrl+C to stop\n");

    setInterval(async () => {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Sync run at ${new Date().toISOString()}`);
      console.log("=".repeat(60));
      await runSync();
    }, interval * 1000);

    // Keep process alive
    await new Promise(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
