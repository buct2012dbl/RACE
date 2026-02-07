import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Adding RWA to registry with account:", deployer.address);

  // Contract addresses
  const RWA_VAULT_ADDRESS = "0x58966610b982608D305763a4311Ebb1a092499a6";
  const USDC_ADDRESS = "0x24aD65150D0ac047279EF6c336Bf7EDA8b799600";

  // Get RWAVault contract
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);

  console.log("\nManually adding USDC to RWA registry...");
  console.log("This requires modifying the contract or using owner functions");
  
  // Check if we're the owner
  const owner = await rwaVault.owner();
  console.log("Vault owner:", owner);
  console.log("Our address:", deployer.address);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("❌ You are not the owner of the RWAVault contract!");
    console.log("Only the owner can add RWAs to the registry.");
    return;
  }

  // The RWAVault contract doesn't have a direct function to add to registry
  // We need to either:
  // 1. Mint a treasury bond token (which auto-registers)
  // 2. Modify the contract to add a registerRWA function
  
  console.log("\n⚠️  The RWAVault contract needs a registerRWA function added.");
  console.log("For now, let's mint a treasury bond token to register USDC:");
  
  // First, set KYC verified
  console.log("\nSetting KYC verification...");
  const kycTx = await rwaVault.setKYCVerified(deployer.address, true);
  await kycTx.wait();
  console.log("✅ KYC verified");
  
  // Mint a treasury bond token
  console.log("\nMinting treasury bond token...");
  const faceValue = ethers.parseUnits("100000", 18); // 100k
  const maturityDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
  const isin = "US912828Z590";
  
  const mintTx = await rwaVault.mintTreasuryBondToken(faceValue, maturityDate, isin);
  const receipt = await mintTx.wait();
  console.log("✅ Treasury bond minted!");
  console.log("Transaction:", receipt?.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
