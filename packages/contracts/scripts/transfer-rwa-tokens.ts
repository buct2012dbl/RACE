import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const RWA_TOKEN_ADDRESS = "0xd02aAEe343e1a00C4A7ee44D9A211658d9c5E2cA";
  
  console.log("Transferring RWA tokens from:", deployer.address);
  
  const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);
  
  // Check balance
  const balance = await rwaToken.balanceOf(deployer.address);
  console.log("Your RWA token balance:", ethers.formatEther(balance));
  
  console.log("\n✅ You already have RWA tokens!");
  console.log("You can now approve and deposit them through the frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
