# Fluid PoC (Hardhat + Vue frontend)

This repository is a small proof-of-concept for a lending / checkout flow using an on-chain NFT as collateral.

Key pieces
- Contracts (in `contracts/`):
  - `FakeUSDC.sol`  a test stablecoin used for payments and loans.
  - `RwaNft.sol`  an ERC721 (RWA NFT) with a simple `min` function (onlyOwner) used as collateral.
  - `MockPriceOracle.sol`  simple on-chain oracle to set/get a price used by the pool.
  - `LendingPool.sol`  the demo pool implementing `borrowAndPay(merchant, totalAmountToPay, rwaTokenId)` used by the frontend.

- Scripts (in `scripts/`):
  - `deploy.ts`  deploys FakeUSDC, MockPriceOracle, RwaNft, LendingPool and performs initial setup (mints, approvals) and writes `frontend/src/contract-config.json`.
  - `mintRwa.ts`  mints RWA NFTs to local accounts (helper script).

- Frontend (in `frontend/`): a Vite + Vue app that reads `frontend/src/contract-config.json` and provides a tiny PoC UI (Connect Wallet, Borrow & Pay).

Goals of this README
- Explain what the project does.
- Step-by-step instructions to run everything locally on a Windows machine (PowerShell).
- Notes about MetaMask and how to connect to a local Hardhat node.

Prerequisites
- Node.js (v18+ recommended) and npm installed.
- A browser with the MetaMask extension for the frontend wallet.

Quick start  full walkthrough (PowerShell)

1) Clone repo (if you haven't already)

```powershell
cd 'C:\Users\frank\Desktop\code'
git clone <your-repo-url> fluid-poc-new
cd 'C:\Users\frank\Desktop\code\fluid-poc-new'
```

2) Install root dependencies

```powershell
npm install
```

3) Install frontend deps (separate folder)

```powershell
cd frontend
npm install
cd ..
```

4) Start a local Hardhat node (in a new terminal)

```powershell
cd 'C:\Users\frank\Desktop\code\fluid-poc-new'
npx hardhat node
```

Notes about the Hardhat node output:
- The node prints a list of local accounts and their private keys. Keep that terminal open. You can import one of these private keys into MetaMask for testing or simply use MetaMask's "Localhost 8545" RPC.

5) In another terminal, deploy the contracts (this will also generate `frontend/src/contract-config.json`)

```powershell
cd 'C:\Users\frank\Desktop\code\fluid-poc-new'
npx hardhat run --network localhost scripts/deploy.ts
```

Expected: deploy script prints deployed addresses and writes `frontend/src/contract-config.json` containing network, contract addresses and example accounts.

6) Mint some RWA NFTs (optional  only needed if you want more tokens)

```powershell
npx hardhat run --network localhost scripts/mintRwa.ts
```
編譯這個有問題

7) Start the frontend dev server

```powershell
cd frontend
npm run dev
```

Open the Vite URL shown in the output (default: http://localhost:5173).

MetaMask setup (connect to your local Hardhat node)

1. Add a network (if not already present):
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Network name: `Hardhat Local` (or similar)

2. Import an account (optional but useful):
- When you run `npx hardhat node` it prints accounts with their private keys. Copy a private key and in MetaMask use "Import Account"  paste the private key  import.

3. Use MetaMask to connect to the frontend UI
- Click "Connect Wallet" in the UI. MetaMask will prompt to connect; accept it.

How the app is wired
- The `deploy.ts` script writes `frontend/src/contract-config.json`. The frontend reads that file and uses the ABIs in `frontend/src/constants.js` to create contract instances.
- The main action from the UI is `LendingPool.borrowAndPay(merchant, totalAmountToPay, rwaTokenId)` which:
  - Moves USDC from the pool/user as appropriate
  - Uses the oracle price and NFT collateral (this is a demo  review `LendingPool.sol` for details)

Troubleshooting & common issues
- HH19 / ESM error when running `npx hardhat node`
  - If you see an error that Hardhat refuses to load the config because the project is ESM ("you have 'type': 'module' set"), open `package.json` and remove or change the `"type": "module"` setting, or rename CommonJS config files to `.cjs`. The repo is configured to run using CommonJS/ts-node; altering the package type may break other tooling.

- "No signer available" in frontend
  - Ensure MetaMask is connected to the correct network (Localhost:8545) and you have accepted the connection in the popup. If you imported a private key, make sure the account matches one of the Hardhat node accounts.

- Errors related to ENS / proxy/_network when calling contract methods with a non-hex merchant string
  - Use a proper hex address (0x...) in the merchant field or add ENS resolution/validation before calling the contract. The UI includes basic validation and logs helpful messages in the Logs panel.

- When a mint or tx reverts with `ERC721InvalidSender("0x000...")`
  - This usually means a zero address or incorrect/missing argument was passed to a mint function, or you're calling a contract at the wrong address. Check `scripts/mintRwa.ts` and `frontend/src/contract-config.json` to ensure addresses match your deployed contracts.

Project layout (short)
- `contracts/`  solidity sources
- `scripts/`  deployment and helper scripts (`deploy.ts`, `mintRwa.ts`, ...)
- `artifacts/` & `typechain-types/`  generated by Hardhat (ABIs, types)
- `frontend/`  Vite + Vue app (reads `frontend/src/contract-config.json`)

Useful commands reference
- Run tests (if any):
```powershell
npx hardhat test
```
- Compile contracts:
```powershell
npx hardhat compile
```
- Run a single script (example):
```powershell
npx hardhat run --network localhost scripts/deploy.ts
npx hardhat run --network localhost scripts/mintRwa.ts
```

Contact / next steps
- If you want, I can:
  - Add ENS resolution support to the frontend or add inline form error messages.
  - Lock dependencies to specific versions and add a small README inside `frontend/` with dev-server tips.

Enjoy experimenting  this PoC is intentionally small and opinionated. Review the contracts and scripts before using with real funds.

補充 
- 要去用 metamask 錢包 (網頁版不能用 要用擴充功能) 然後自己去新增 account 和加入一些 private key
- 痾
