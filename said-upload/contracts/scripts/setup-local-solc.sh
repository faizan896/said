#!/usr/bin/env bash
# Only needed in network-restricted environments where binaries.soliditylang.org
# is unreachable (Hardhat normally downloads solc from there automatically).
# Shims the npm-published `solc` package into Hardhat's compiler cache so
# `hardhat compile` / `hardhat test` work fully offline-from-solc's-CDN.
#
# Safe to run anywhere: if binaries.soliditylang.org IS reachable for you,
# you don't need this at all — just delete the cache dir this script writes
# to (or skip running it) and Hardhat will download the real binary normally.
set -euo pipefail

SOLC_VERSION="0.8.24"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${HOME}/.cache/hardhat-nodejs/compilers-v2/linux-amd64"
SOLC_MODULE="${CONTRACTS_DIR}/node_modules/solc"

if [ ! -d "$SOLC_MODULE" ]; then
  echo "solc npm package not found — run 'npm install' in contracts/ first." >&2
  exit 1
fi

mkdir -p "$CACHE_DIR"
cp "${SCRIPT_DIR}/local-solc-wrapper.js" "${CACHE_DIR}/solc-${SOLC_VERSION}"
chmod +x "${CACHE_DIR}/solc-${SOLC_VERSION}"
sed -i "1a process.env.SAID_SOLC_MODULE_PATH = process.env.SAID_SOLC_MODULE_PATH || '${SOLC_MODULE}';" "${CACHE_DIR}/solc-${SOLC_VERSION}"

cat > "${CACHE_DIR}/list.json" <<EOF
{
  "builds": [
    {
      "path": "solc-${SOLC_VERSION}",
      "version": "${SOLC_VERSION}",
      "build": "commit.local",
      "longVersion": "${SOLC_VERSION}+commit.local",
      "keccak256": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "urls": [],
      "platform": "linux-amd64"
    }
  ],
  "releases": { "${SOLC_VERSION}": "solc-${SOLC_VERSION}" },
  "latestRelease": "${SOLC_VERSION}"
}
EOF

echo "Local solc ${SOLC_VERSION} shimmed into ${CACHE_DIR}"
