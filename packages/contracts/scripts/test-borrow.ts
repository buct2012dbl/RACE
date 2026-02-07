import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  const dexAddress = "0x7C303B4A9384965530d3e6a80378c27FDD9202bE";
  const wethAddress = "0xC931BA8825A9Db6620a30bE42D3f1E554206a4e2";
  
  console.log("Testing borrow and invest transaction...\n");
  
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  // Check agent state
  const state = await aiAgent.agentState();
  console.log(`Current state:`);
  console.log(`  Collateral: ${ethers.formatEther(state[2])}`);
  console.log(`  Borrowed: ${ethers.formatEther(state[3])}`);
  console.log(`  Available Credit: ${ethers.formatEther(state[4])}`);
  
  // Encode params
  const borrowAmount = ethers.parseEther("500");
  const minAmountOut = ethers.parseEther("490");
  
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'address', 'uint256'],
    [borrowAmount, dexAddress, wethAddress, minAmountOut]
  );
  
  console.log(`\nAttempting to borrow 500 USDC and swap for ETH...`);
  
  try {
    // Try to call the function
    const tx = await aiAgent.makeInvestmentDecision(1, params); // 1 = BORROW_AND_INVEST
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Success! Block: ${receipt?.blockNumber}`);
  } catch (error: any) {
    console.log(`❌ Error:`, error.message);
    
    // Try to get more details
    if (error.data) {
      console.log(`Error data:`, error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
