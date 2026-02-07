import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Mock RWA Token...");
  console.log("Deployer:", deployer.address);
  
  // Deploy a simple RWA token that mints to the deployer
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy(
    "Mock Treasury Bond",
    "MTB",
    ethers.parseUnits("10000000", 18) // 10M tokens to deployer
  );
  await rwaToken.waitForDeployment();
  const tokenAddress = await rwaToken.getAddress();
  
  console.log("✅ Mock RWA Token deployed:", tokenAddress);
  
  // Check balance
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log("Your balance:", ethers.formatEther(balance), "MTB");
  
  // Now register it in the vault
  const RWA_VAULT_ADDRESS = "0x58966610b982608D305763a4311Ebb1a092499a6";
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);
  
  // We need to manually add it to the registry
  // Since there's no registerRWA function, we'll need to use the owner to update storage
  // For now, just log the address
  
  console.log("\n📝 Update your .env.local:");
  console.log(`NEXT_PUBLIC_RWA_TOKEN_ADDRESS=${tokenAddress}`);
  
  console.log("\n⚠️  Note: This token is NOT registered in the vault yet.");
  console.log("You'll need to add a registerRWA function to the vault contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
