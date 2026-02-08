import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n=== Testing BORROW_AND_INVEST ===");
  console.log("Caller:", deployer.address);

  const AI_AGENT_ADDRESS = "0xDEe535cF20a05A5Ac8099Ce3612396C3E7C9586f";
  const SIMPLE_DEX_ADDRESS = "0x75687780AD8B39Cc7bab179Dd127f672be04b9ED";
  const WBTC_ADDRESS = "0xB79c2c7e30C64002A64Ab0375D36a7f701CAB84E";

  const aiAgent = await ethers.getContractAt("AIAgent", AI_AGENT_ADDRESS);

  // Check controller
  const controller = await aiAgent.controller();
  console.log("\n📋 Contract Info:");
  console.log("- Controller:", controller);
  console.log("- Deployer:", deployer.address);
  console.log("- Is Controller?", controller.toLowerCase() === deployer.address.toLowerCase());

  // Check agent state
  const state = await aiAgent.agentState();
  console.log("\n📊 Agent State:");
  console.log("- Collateral:", ethers.formatEther(state.collateralAmount));
  console.log("- Borrowed:", ethers.formatEther(state.borrowedUSDC));
  console.log("- Available Credit:", ethers.formatEther(state.availableCredit));

  // Try to execute decision
  console.log("\n🔄 Attempting to execute BORROW_AND_INVEST...");

  const borrowAmount = ethers.parseEther("500");
  const minAmountOut = ethers.parseEther("0.007041767565604832");

  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "address", "address", "uint256"],
    [borrowAmount, SIMPLE_DEX_ADDRESS, WBTC_ADDRESS, minAmountOut]
  );

  try {
    // Try with estimateGas first to see the revert reason
    await aiAgent.executeDecision.estimateGas(1, params, "0x", "0x");
    console.log("✅ Gas estimation succeeded");
  } catch (error: any) {
    console.log("❌ Gas estimation failed:");
    console.log(error.message);

    // Try to get more details
    if (error.data) {
      console.log("\nError data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
