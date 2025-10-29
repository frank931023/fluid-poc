import hre, { ethers } from "hardhat";
import fs from "fs";
import path from "path";

function getAddress(contract: any): string {
  return contract?.target || contract?.address || (typeof contract?.getAddress === "function" ? contract.getAddress() : undefined);
}

// 等待合約屬完成 確保交易被鏈上確認
async function waitDeployed(contract: any) {
  if (!contract) return;
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
    return;
  }
  if (typeof contract.deployed === "function") {
    await contract.deployed();
    return;
  }
  if (typeof contract.deploymentTransaction === "function") {
    try {
      const tx = await contract.deploymentTransaction();
      if (tx && typeof tx.wait === "function") await tx.wait();
    } catch {}
  }
}

// 安全的呼叫合約方法 像是mint, approve 
async function tryCall(contract: any, fnName: string, ...args: any[]) {
  if (!contract) throw new Error("Contract missing");
  const fn = (contract as any)[fnName];
  if (typeof fn === "function") {
    return await fn.apply(contract, args);
  }
  throw new Error(`${fnName} not found on contract`);
}

async function main() {
  // 取得帳號
  const [owner, user, merchant] = await ethers.getSigners();

  console.log("Owner (Deployer):", owner.address);
  console.log("User (Wallet):", user.address);
  console.log("Merchant (POS):", merchant.address);

  // Deploy FakeUSDC
  const FakeUSDC = await ethers.getContractFactory("FakeUSDC");
  const fakeUSDC = await FakeUSDC.connect(owner).deploy();
  await waitDeployed(fakeUSDC);

  // Deploy MockPriceOracle with an initial price (1 as placeholder)
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const initialPrice = ethers.parseUnits("1", 18);
  const mockPriceOracle = await MockPriceOracle.connect(owner).deploy(initialPrice);
  await waitDeployed(mockPriceOracle);

  // Deploy RwaNft
  const RwaNft = await ethers.getContractFactory("RwaNft");
  const rwaNft = await RwaNft.connect(owner).deploy();
  await waitDeployed(rwaNft);

  // Deploy LendingPool (pass addresses)
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.connect(owner).deploy(
    getAddress(fakeUSDC),
    getAddress(rwaNft),
    getAddress(mockPriceOracle)
  );
  await waitDeployed(lendingPool);

  const fakeUSDCAddr = await (typeof fakeUSDC.getAddress === "function" ? fakeUSDC.getAddress() : fakeUSDC.target || fakeUSDC.target);
  const mockPriceOracleAddr = await (typeof mockPriceOracle.getAddress === "function" ? mockPriceOracle.getAddress() : mockPriceOracle.target || mockPriceOracle.target);
  const rwaNftAddr = await (typeof rwaNft.getAddress === "function" ? rwaNft.getAddress() : rwaNft.target || rwaNft.target);
  const lendingPoolAddr = await (typeof lendingPool.getAddress === "function" ? lendingPool.getAddress() : lendingPool.target || lendingPool.target);

  console.log("Deployed contracts:");
  console.log("FakeUSDC:", fakeUSDCAddr);
  console.log("MockPriceOracle:", mockPriceOracleAddr);
  console.log("RwaNft:", rwaNftAddr);
  console.log("LendingPool:", lendingPoolAddr);

  // Setup sequence (owner actions)
  // Give user 10 USDC
  await tryCall(fakeUSDC.connect(owner), "mint", user.address, ethers.parseUnits("10", 18));

  // Fund the pool with 1,000,000 USDC
  await tryCall(fakeUSDC.connect(owner), "mint", lendingPoolAddr, ethers.parseUnits("1000000", 18));

  // Mint RWA NFT token id 1 to user
  // Contract has `min` in source; try `mint` first then fallback to `min`.
  try {
    await tryCall(rwaNft.connect(owner), "mint", user.address, 1);
  } catch (e) {
    console.log("`mint` not found, trying `min`...");
    await tryCall(rwaNft.connect(owner), "min", user.address, 1);
  }

  // Set price to $170
  await tryCall(mockPriceOracle.connect(owner), "setPrice", ethers.parseUnits("170", 18));

  // Simulate user approvals
  await tryCall(fakeUSDC.connect(user), "approve", lendingPoolAddr, ethers.MaxUint256);
  await tryCall(rwaNft.connect(user), "approve", lendingPoolAddr, 1);

  console.log('User has approved LendingPool for USDC and RwaNft');

  // Generate frontend config
  const config = {
    network: hre.network.name,
    contracts: {
      FakeUSDC: fakeUSDCAddr,
      MockPriceOracle: mockPriceOracleAddr,
      RwaNft: rwaNftAddr,
      LendingPool: lendingPoolAddr,
    },
    addresses: {
      owner: owner.address,
      user: user.address,
      merchant: merchant.address,
    },
  };

  const outDir = path.resolve(__dirname, "..", "frontend", "src");
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "contract-config.json");
    fs.writeFileSync(outPath, JSON.stringify(config, null, 2), { encoding: "utf8" });
    console.log("Frontend config written to", outPath);
  } catch (e) {
    console.warn("Failed to write frontend config:", e);
  }

  console.log("✅ Deployment and setup complete. Frontend config file generated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
