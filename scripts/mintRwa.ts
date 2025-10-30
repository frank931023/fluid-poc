import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  // 1. 取得部署者（owner）帳號
//   const ownerAddress = "0xf39Fd6e51aad88F6F4ce6B8827279cffFb92266";
//   const owner = await ethers.getSigner(ownerAddress);
    const [owner] = await ethers.getSigners(); // index 0 通常是部署者
//   console.log("Owner address:", owner.address);

  // 2. 取得合約實例 (連上 owner)
  // Try to read deployed address from frontend config if available, otherwise fallback to hardcoded address
  let rwaAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  try {
    const cfgPath = path.resolve(__dirname, '..', 'frontend', 'src', 'contract-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfgRaw = fs.readFileSync(cfgPath, 'utf8');
      const cfg = JSON.parse(cfgRaw);
      if (cfg?.contracts?.RwaNft) rwaAddress = cfg.contracts.RwaNft;
    }
  } catch (e) {
    console.warn('Could not read frontend contract-config.json, using fallback address');
  }

  const RwaNft = await ethers.getContractAt("RwaNft", rwaAddress, owner);

//   const txOwner = await RwaNft.transferOwnership(owner.address);
//   await txOwner.wait();
//   console.log(`✅ Ownership transferred to ${owner.address}`);

  // 3. 指定要 mint 的帳號 — use local signers to avoid typos / mismatched addresses
  const signers = await ethers.getSigners();
  const recipients = signers.slice(0, 4).map(s => s.address);

  // 4. Mint 多個 NFT (例如 mint tokenId 1~5)
  let tokenId = 1;
  for (const r of recipients) {
    console.log('Minting token', tokenId, 'to', r, 'using owner', owner.address, 'contract', rwaAddress);
    const tx = await RwaNft.min(r, tokenId);
    await tx.wait();
    console.log(`Minted tokenId ${tokenId} to ${r}`);
    tokenId++;
  }

  console.log("All NFTs minted!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
