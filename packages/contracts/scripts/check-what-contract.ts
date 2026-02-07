import { ethers } from "hardhat";

async function main() {
  const ADDRESS = "0x24aD65150D0ac047279EF6c336Bf7EDA8b799600";
  
  // Try ERC20 functions
  try {
    const erc20 = await ethers.getContractAt("RWAToken", ADDRESS);
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    console.log("✅ This is an ERC20 token!");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
  } catch (error: any) {
    console.log("❌ Not an ERC20 token:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
