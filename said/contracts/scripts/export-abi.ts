// Copies the compiled ABI into web/lib/contracts/ so the frontend has a typed
// ABI to work against even before any real deployment exists. `deploy.ts`
// overwrites the same file (plus addresses.json) once you actually deploy.
import * as fs from "fs";
import * as path from "path";

async function main() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "Said.sol",
    "Said.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("No compiled artifact found — run `npm run compile` first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const outDir = path.join(__dirname, "..", "..", "web", "src", "lib", "contracts");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "Said.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  const addressesPath = path.join(outDir, "addresses.json");
  if (!fs.existsSync(addressesPath)) {
    fs.writeFileSync(addressesPath, JSON.stringify({}, null, 2));
  }

  console.log(`ABI exported to ${outDir}`);
}

main();
