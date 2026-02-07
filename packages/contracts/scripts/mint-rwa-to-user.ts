import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const RWA_VAULT_ADDRESS = "0x58966610b982608D305763a4311Ebb1a092499a6";
  
  console.log("Minting RWA tokens to:", deployer.address);
  
  const rwaVault = await ethers.getContractAt("RWAVault", RWA_VAULT_ADDRESS);
  
  // Mint a new treasury bond
  const faceValue = ethers.parseUnits("1000000", 18); // 1M tokens
  const maturityDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
  const isin = "US912828Z591";
  
  console.log("\nMinting treasury bond...");
  const tx = await rwaVault.mintTreasuryBondToken(faceValue, maturityDate, isin);
  const receipt = await tx.wait();
  
  // Get the token address from events
  const iface = rwaVault.interface;
  let tokenAddress;
  
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      if (parsed && parsed.name === "RWAMinted") {
        tokenAddress = parsed.args.token;
      }
    } catch (e) {}
  }
  
  console.log("✅ RWA Token minted:", tokenAddress);
  
  // The tokens are minted to the vault, we need to transfer them to the user
  // But wait - the RWAToken contract mints to msg.sender (the vault)
  // We need to check who owns the tokens
  
  if (tokenAddress) {
    const rwaToken = await ethers.getContractAt("RWAToken", tokenAddress);
    const vaultBalance = await rwaToken.balanceOf(RWA_VAULT_ADDRESS);
    const userBalance = await rwaToken.balanceOf(deployer.address);
    
    console.log("\nToken balances:");
    console.log("Vault:", ethers.formatEther(vaultBalance));
    console.log("User:", ethers.formatEther(userBalance));
    
    console.log("\n⚠️  Tokens are minted to the vault, not the user.");
    console.log("The contract design needs adjustment for user deposits.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
