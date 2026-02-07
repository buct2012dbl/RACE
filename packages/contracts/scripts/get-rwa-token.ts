import { ethers } from "hardhat";

async function main() {
  const RWA_VAULT_ADDRESS = "0x58966610b982608D305763a4311Ebb1a092499a6";
  const TX_HASH = "0x375fe42986131505adbe2ccab68c0cc4f1e17c1d6e3aa0e06cddba6003ec6fb3";
  
  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  if (!receipt) {
    console.log("Transaction not found");
    return;
  }
  
  console.log("Transaction logs:");
  for (const log of receipt.logs) {
    console.log("Log address:", log.address);
    console.log("Topics:", log.topics);
  }
  
  // The RWAMinted event should contain the token address
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);
  const iface = rwaVault.interface;
  
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      if (parsed && parsed.name === "RWAMinted") {
        console.log("\n✅ Found RWAMinted event!");
        console.log("RWA Token Address:", parsed.args.token);
        console.log("\nUpdate your .env.local with this address for deposits!");
      }
    } catch (e) {
      // Not an RWAVault event
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
