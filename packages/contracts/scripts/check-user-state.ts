import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x31933957578133cbbbab776fa19d6cf24fe1a597";
  const aiAgentAddress = "0xd4ADBf2A154d2a5dcE84B0A71E58d683fE4CaF85";

  const AIAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  console.log("Checking user state for:", userAddress);

  const state = await AIAgent.getUserState(userAddress);
  console.log("\nUser State:");
  console.log("- RWA Collateral:", state.rwaCollateral);
  console.log("- Collateral Amount:", ethers.formatEther(state.collateralAmount));
  console.log("- Borrowed USDC:", ethers.formatEther(state.borrowedUSDC));
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit));
  console.log("- Total Profit:", state.totalProfit ? ethers.formatEther(state.totalProfit) : "0");
  console.log("- Total Loss:", state.totalLoss ? ethers.formatEther(state.totalLoss) : "0");

  // Agent is initialized if we got state back
  console.log("\nAgent is initialized: true");

  // Check RWA token balance and allowance
  const rwaToken = await ethers.getContractAt("IERC20", state.rwaCollateral);
  const balance = await rwaToken.balanceOf(userAddress);
  const allowance = await rwaToken.allowance(userAddress, aiAgentAddress);

  console.log("\nRWA Token:");
  console.log("- Balance:", ethers.formatEther(balance));
  console.log("- Allowance:", ethers.formatEther(allowance));

  // Try to calculate what would happen with addCollateral
  const rwaVaultAddress = await AIAgent.rwaVault();
  const RWAVault = await ethers.getContractAt("RWAVault", rwaVaultAddress);

  try {
    const borrowingPower = await RWAVault.getBorrowingPower(
      state.rwaCollateral,
      state.collateralAmount
    );
    console.log("\nCurrent Borrowing Power:", ethers.formatEther(borrowingPower));

    // Check if borrowed > capacity (would cause underflow)
    if (state.borrowedUSDC > borrowingPower) {
      console.log("\n⚠️  PROBLEM FOUND: borrowedUSDC > borrowingPower");
      console.log("This will cause underflow in addCollateral at line 207!");
    }
  } catch (error: any) {
    console.log("\nBorrowing Power check failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
