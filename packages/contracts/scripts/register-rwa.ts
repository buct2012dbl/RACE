import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Registering RWA token with account:", deployer.address);

  // Contract addresses from Monad testnet
  const RWA_VAULT_ADDRESS = "0x58966610b982608D305763a4311Ebb1a092499a6";
  const USDC_ADDRESS = "0x24aD65150D0ac047279EF6c336Bf7EDA8b799600";

  // Get RWAVault contract
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);

  console.log("\nRegistering USDC as RWA token...");
  console.log("USDC Address:", USDC_ADDRESS);
  
  // Register the RWA token with 80% LTV (8000 basis points)
  const tx = await rwaVault.registerRWA(
    USDC_ADDRESS,
    8000, // 80% LTV
    true  // isActive
  );
  
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  
  console.log("✅ USDC registered as RWA token successfully!");
  
  // Verify registration
  const isRegistered = await rwaVault.registeredRWAs(USDC_ADDRESS);
  console.log("\nVerification - Is registered:", isRegistered);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
