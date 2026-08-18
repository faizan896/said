import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const MONAD_TESTNET_RPC_URL =
  process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    monad: {
      url: MONAD_RPC_URL,
      chainId: 143,
      accounts,
    },
    monadTestnet: {
      url: MONAD_TESTNET_RPC_URL,
      chainId: 10143,
      accounts,
    },
  },
  // Monad mainnet is covered by Etherscan's V2 multichain API, so a single
  // Etherscan API key verifies the contract on Monadscan.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "monad",
        chainId: 143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=143",
          browserURL: "https://monadscan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
