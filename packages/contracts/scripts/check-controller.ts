import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const aiAgentAddress = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f";
  
  const aiAgent = await ethers.getContractAt("AIAgent", aiAgentAddress);
  
  console.log("Deployer:", deployer.address);
  
  try {
    const controller = await aiAgent.controller();
    console.log("Controller:", controller);
    console.log("Match:", controller.toLowerCase() === deployer.address.toLowerCase());
  } catch (e) {
    console.log("Error getting controller:", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
