import { ethers } from "hardhat";

async function main() {
  const lendingPoolAddress = "0x37372D83047cb40FAA478325891a65c28f29ABeb";
  const usdcAddress = "0x21a6e8e27bA20089c8176fB7606Cc9259b30834f";
  const aiAgentAddress = "0xCA934F59907cC34a9b949dfa34C2bA2339f82aE4";
  
  console.log("Checking LendingPool state...\n");
  
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  const lendingPool = await ethers.getContractAt("LendingPool", lendingPoolAddress);
  
  // Check USDC balance
  const balance = await usdc.balanceOf(lendingPoolAddress);
  console.log(`LendingPool USDC Balance: ${ethers.formatEther(balance)}`);
  
  // Check lending pool state
  const totalLiquidity = await lendingPool.totalLiquidity();
  const totalBorrowed = await lendingPool.totalBorrowed();
  console.log(`Total Liquidity: ${ethers.formatEther(totalLiquidity)}`);
  console.log(`Total Borrowed: ${ethers.formatEther(totalBorrowed)}`);
  console.log(`Available: ${ethers.formatEther(totalLiquidity - totalBorrowed)}`);
  
  // Check if AIAgent has a loan
  console.log(`\nChecking AIAgent loan...`);
  try {
    const loan = await lendingPool.loans(aiAgentAddress);
    console.log(`Borrower: ${loan.borrower}`);
    console.log(`Principal: ${ethers.formatEther(loan.principal)}`);
    console.log(`Interest: ${ethers.formatEther(loan.interestAccrued)}`);
    console.log(`Active: ${loan.active}`);
  } catch (e) {
    console.log("No loan found or error:", e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
