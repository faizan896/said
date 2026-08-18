#!/usr/bin/env node
// Fakes a native `solc --standard-json` binary using the npm-published
// solc-js package. This sandbox blocks binaries.soliditylang.org, so Hardhat
// can't download the real compiler binary/list. We install `solc` from the
// npm registry (which IS reachable) instead and shim it into Hardhat's
// compiler cache directory so `hardhat compile`/`hardhat test` work exactly
// as if the real binary had been downloaded. See contracts/README section
// "Why is there a local-solc-wrapper.js?" for the full explanation.
"use strict";

const solc = require(process.env.SAID_SOLC_MODULE_PATH || "solc");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const output = solc.compile(input);
  process.stdout.write(output);
});
