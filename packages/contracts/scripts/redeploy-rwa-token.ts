import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const rwaVaultAddress = "0xcca23BdcA726Af2505E81c829c2D2765B747704E";

  // Deploy new RWA token as MockToken (has public mint for testing)
  console.log("\nDeploying new RWA token (MockToken with public mint)...");
  const MockToken = await ethers.getContractFactory("MockToken");
  const rwaToken = await MockToken.deploy(
    "Real World Asset",
    "RWA",
    ethers.parseUnits("1000000", 18) // 1M initial supply to deployer
  );
  await rwaToken.waitForDeployment();
  const newRWATokenAddress = await rwaToken.getAddress();
  console.log("✅ New RWA Token deployed to:", newRWATokenAddress);

  // Register in vault
  console.log("\nRegistering new RWA token in vault...");
  const rwaVault = await ethers.getContractAt("RWAVault", rwaVaultAddress);
  try {
    const tx = await rwaVault.registerRWA(
      newRWATokenAddress,
      ethers.parseEther("1000000"), // 1M USDC valuation
      8000                          // 80% LTV
    );
    await tx.wait();
    console.log("✅ RWA token registered in vault");
  } catch (e: any) {
    console.warn("⚠️  Could not register RWA token:", e.message);
  }

  // Update frontend .env
  const envPath = path.resolve(__dirname, "../../frontend/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_RWA_TOKEN_ADDRESS=.*/,
      `NEXT_PUBLIC_RWA_TOKEN_ADDRESS=${newRWATokenAddress}`
    );
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("✅ Updated frontend/.env with new RWA Token address");
  }

  console.log("\n=== Done ===");
  console.log("New RWA Token address:", newRWATokenAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
