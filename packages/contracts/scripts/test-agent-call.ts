import { ethers } from "hardhat";

async function main() {
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  const lendingPoolAddress = "0x6bec256464AD5f994a154A4210510E86a0833b19";
  const simpleDEXAddress = "0x293E0a8f6bbEd6CeE135693c3F93C143f3110627";
  const wethAddress = "0xd39EDBb61F3de1FEBDf984e58F2447Dd14D3a491";
  const usdcAddress = "0xfC40492859281e332abb84537398acF1FFc24560";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  console.log("\n=== Testing AIAgent ===");
  
  // Check if contract exists
  const code = await ethers.provider.getCode(aiAgentAddress);
  console.log(`Contract code length: ${code.length}`);
  
  // Try to call a simple view function
  try {
    const owner = await aiAgent.owner();
    console.log(`Owner: ${owner}`);
  } catch (e) {
    console.log("Error getting owner:", e.message);
  }

  // Check lending pool
  try {
    const lp = await aiAgent.lendingPool();
    console.log(`Lending Pool: ${lp}`);
  } catch (e) {
    console.log("Error getting lending pool:", e.message);
  }

  // Check if agent is initialized
  try {
    const state = await aiAgent.agentState();
    console.log("\nAgent State:");
    console.log(`  Collateral Token: ${state.collateralToken}`);
    console.log(`  Collateral Amount: ${ethers.formatEther(state.collateralAmount)}`);
    console.log(`  Borrowed: ${ethers.formatEther(state.borrowedUSDC)}`);
  } catch (e) {
    console.log("Error getting agent state:", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
