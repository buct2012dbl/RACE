import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying AIAgent with account:", deployer.address);

  // Existing deployed addresses (kept as-is)
  const rwaVaultAddress    = "0xcca23BdcA726Af2505E81c829c2D2765B747704E";
  const lendingPoolAddress = "0xCafd467ee0E137b3d7A28b8435Dbbf1598ab0F75";
  const usdcAddress        = "0xCC4b2A63DDf0fa7218163Ef5bbaE02145802C52C";
  const rwaTokenAddress    = "0x1c694D03f699b71b6A03e2419d8094a3780f80A8";

  // Deploy new AIAgent
  console.log("\nDeploying new AIAgent...");
  const AIAgent = await ethers.getContractFactory("AIAgent");
  const aiAgent = await AIAgent.deploy(
    rwaVaultAddress,
    lendingPoolAddress,
    usdcAddress,
    deployer.address // controller
  );
  await aiAgent.waitForDeployment();
  const newAIAgentAddress = await aiAgent.getAddress();
  console.log("✅ New AIAgent deployed to:", newAIAgentAddress);

  // Optionally register the RWA token in the vault so getBorrowingPower works
  console.log("\nRegistering RWA token in vault...");
  const rwaVault = await ethers.getContractAt("RWAVault", rwaVaultAddress);
  try {
    const tx = await rwaVault.registerRWA(
      rwaTokenAddress,
      ethers.parseEther("1000000"), // 1M USDC valuation
      8000                          // 80% LTV
    );
    await tx.wait();
    console.log("✅ RWA token registered in vault");
  } catch (e: any) {
    if (e.message?.includes("Already registered")) {
      console.log("✅ RWA token already registered");
    } else {
      console.warn("⚠️  Could not register RWA token:", e.message);
    }
  }

  // Update frontend .env
  const envPath = path.resolve(__dirname, "../../frontend/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_AI_AGENT_ADDRESS=.*/,
      `NEXT_PUBLIC_AI_AGENT_ADDRESS=${newAIAgentAddress}`
    );
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("\n✅ Updated frontend/.env with new AIAgent address");
  } else {
    console.log("\n⚠️  frontend/.env not found — update manually:");
  }

  console.log("\n=== Done ===");
  console.log("New AIAgent address:", newAIAgentAddress);
  console.log("Update NEXT_PUBLIC_AI_AGENT_ADDRESS in packages/frontend/.env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
