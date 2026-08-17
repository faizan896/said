import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys Said.sol and writes its address + ABI to web/lib/contracts/ so the
 * frontend can pick it up without any manual copy-pasting.
 *
 * Usage:
 *   MONAD_TESTNET_RPC_URL=... DEPLOYER_PRIVATE_KEY=... npm run deploy:monad-testnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying Said with account: ${deployer.address}`);

  const Said = await ethers.getContractFactory("Said");
  const said = await Said.deploy();
  await said.waitForDeployment();

  const address = await said.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log(`Said deployed to: ${address}`);
  console.log(`Chain id: ${network.chainId}`);

  const artifact = await import("../artifacts/src/Said.sol/Said.json");
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
  existing[network.chainId.toString()] = address;
  fs.writeFileSync(addressesPath, JSON.stringify(existing, null, 2));

  console.log(`ABI + address written to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
