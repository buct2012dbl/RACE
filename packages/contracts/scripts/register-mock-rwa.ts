import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Registering Mock RWA Token...");
  console.log("Account:", deployer.address);

  const RWA_VAULT_ADDRESS = "0xBBEdF3C069f38AF47BF68E0a71b37c327eEf74aF";
  const RWA_TOKEN_ADDRESS = "0x26016f7a4a900e3F5f42936202760f9F7A0DE21E";

  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);

  console.log("\nRegistering RWA token in vault...");
  const valuation = ethers.parseUnits("10000000", 18); // 10M USDC valuation
  const ltv = 8000; // 80% LTV

  const tx = await rwaVault.registerRWA(RWA_TOKEN_ADDRESS, valuation, ltv);
  await tx.wait();

  console.log("✅ RWA token registered successfully!");
  console.log("Transaction:", tx.hash);

  // Verify
  const rwa = await rwaVault.rwaRegistry(RWA_TOKEN_ADDRESS);
  console.log("\nVerification:");
  console.log("Token:", rwa.token);
  console.log("Valuation:", ethers.formatEther(rwa.valuation), "USDC");
  console.log("LTV:", rwa.ltv.toString(), "basis points");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
