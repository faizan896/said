import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys Said.sol and writes its address + ABI into web/src/lib/contracts/
 * so the frontend picks it up without any manual copy-pasting.
 *
 * Usage (from contracts/):
 *   npm run deploy:monad            # mainnet, chain 143
 *   npm run deploy:monad-testnet    # testnet, chain 10143
 *
 * Requires MONAD_RPC_URL (or MONAD_TESTNET_RPC_URL) and DEPLOYER_PRIVATE_KEY
 * in contracts/.env.
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY in contracts/.env before deploying."
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} MON`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 MON — fund this address before deploying, or gas will fail."
    );
  }

  const Said = await ethers.getContractFactory("Said");
  const said = await Said.deploy();
  console.log("Deploying…");
  await said.waitForDeployment();

  const address = await said.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  console.log(`\n✓ Said deployed to: ${address}`);
  console.log(`  Chain id: ${chainId}`);

  // Hand the ABI + address to the frontend.
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "Said.sol",
    "Said.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const outDir = path.join(__dirname, "..", "..", "web", "src", "lib", "contracts");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "Said.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  const addressesPath = path.join(outDir, "addresses.json");
  const existing = fs.existsSync(addressesPath)
    ? JSON.parse(fs.readFileSync(addressesPath, "utf-8"))
    : {};
  existing[chainId.toString()] = address;
  fs.writeFileSync(addressesPath, JSON.stringify(existing, null, 2));

  console.log(`  ABI + address written to web/src/lib/contracts/`);
  console.log(`\nNext steps:`);
  console.log(`  1. Put this in web/.env:`);
  console.log(`       NEXT_PUBLIC_SAID_CONTRACT_ADDRESS=${address}`);
  console.log(`  2. Verify the source on the explorer:`);
  console.log(`       npx hardhat verify --network ${network.name} ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
