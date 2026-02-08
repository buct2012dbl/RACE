import { ethers } from "hardhat";

async function main() {
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);

  // Check agent state first
  console.log("\n=== Agent State ===");
  const state = await aiAgent.agentState();
  console.log(`Collateral Token: ${state.collateralToken}`);
  console.log(`Collateral Amount: ${ethers.formatEther(state.collateralAmount)}`);
  console.log(`Borrowed USDC: ${ethers.formatEther(state.borrowedUSDC)}`);
  console.log(`Available Credit: ${ethers.formatEther(state.availableCredit)}`);
  console.log(`Total Assets: ${ethers.formatEther(state.totalAssets)}`);
  console.log(`Positions: ${state.positions ? state.positions.length : 'undefined'}`);

  // Try to call makeInvestmentDecision with proper error handling
  console.log("\n=== Attempting makeInvestmentDecision ===");

  const action = 1; // BORROW_AND_INVEST

  // Correct parameter order: (uint256 borrowAmount, address dexAddress, address tokenOut, uint256 minAmountOut)
  const borrowAmount = ethers.parseEther("1000"); // 1000 USDC
  const dexAddress = "0x293E0a8f6bbEd6CeE135693c3F93C143f3110627"; // SimpleDEX
  const tokenOut = "0xd39EDBb61F3de1FEBDf984e58F2447Dd14D3a491"; // WETH
  const minAmountOut = 0; // Accept any amount for testing

  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "address", "address", "uint256"],
    [borrowAmount, dexAddress, tokenOut, minAmountOut]
  );

  console.log("Parameters:");
  console.log(`  Borrow Amount: ${ethers.formatEther(borrowAmount)} USDC`);
  console.log(`  DEX Address: ${dexAddress}`);
  console.log(`  Token Out: ${tokenOut}`);
  console.log(`  Min Amount Out: ${minAmountOut}`);

  try {
    // First try to estimate gas to see if it would revert
    console.log("Estimating gas...");
    const gasEstimate = await aiAgent.makeInvestmentDecision.estimateGas(action, params);
    console.log(`Gas estimate: ${gasEstimate.toString()}`);

    // If gas estimation succeeds, try the actual call
    console.log("Sending transaction...");
    const tx = await aiAgent.makeInvestmentDecision(action, params);
    console.log(`Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log(`Status: ${receipt?.status === 1 ? "SUCCESS" : "FAILED"}`);

  } catch (error: any) {
    console.log("\n=== ERROR CAUGHT ===");
    console.log("Error message:", error.message);

    if (error.data) {
      console.log("Error data:", error.data);
    }

    // Try to decode the revert reason
    if (error.reason) {
      console.log("Revert reason:", error.reason);
    }

    // If it's a custom error, try to decode it
    if (error.error && error.error.data) {
      console.log("Raw error data:", error.error.data);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
