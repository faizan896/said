# said

**you said you'd do it.**

Said is a small, editorial, on-chain promise app for Monad. You say what you're going to
do, it gets timestamped permanently on-chain, other people witness it, and later you either
kept your word or you didn't — and either way, it stays on the record.

No tokens. No staking. No NFTs. No financial incentive. Just public accountability.

## Repo layout

```
said/
├── contracts/     Said.sol + Hardhat tests, deploy script (Monad testnet)
└── web/           Next.js app (App Router, TS, Tailwind) + a small SQLite index
```

The chain is always the source of truth for a promise's existence, its statement, its
deadline, its witnesses, and whether it's been marked kept. The `web/db` SQLite database is
purely a read-optimized mirror of on-chain events, built so pages like the landing feed or a
profile's stats don't have to walk chain logs on every request. See
`web/src/lib/server/chain-verify.ts` — every write to the index re-derives its data from the
actual confirmed transaction's event log, never from whatever a client claims happened.

## Quick start

```bash
# 1. Contracts — compile + test
cd contracts
npm install
npm test                    # 32 Hardhat tests

# 2. Frontend
cd ../web
npm install
cp .env.example .env        # fill in NEXT_PUBLIC_SAID_CONTRACT_ADDRESS once deployed
npm run db:seed             # seeds web/db/said.db with demo promises
npm run dev                 # http://localhost:3000
```

The app runs and is fully browsable (landing feed, explore, profiles, promise pages) with
zero blockchain setup, using the seeded demo data. Wallet-gated actions (make a promise,
witness, mark kept) will work end-to-end once you deploy the contract and set
`NEXT_PUBLIC_SAID_CONTRACT_ADDRESS` — until then the composer tells you plainly that the
contract isn't deployed yet, rather than pretending to succeed.

## Deploying to Monad testnet

```bash
cd contracts
cp .env.example .env        # set MONAD_TESTNET_RPC_URL and a throwaway DEPLOYER_PRIVATE_KEY
npm run deploy:monad-testnet
```

This deploys `Said.sol`, then writes the ABI and address straight into
`web/src/lib/contracts/`, so the frontend picks it up automatically — copy the printed
address into `web/.env` as `NEXT_PUBLIC_SAID_CONTRACT_ADDRESS` and restart the dev server.

Note: chain params (RPC URL, explorer, chain id 10143) come from viem's built-in
`monadTestnet` definition — double check them against
[docs.monad.xyz](https://docs.monad.xyz/developer-essentials/network-information) in case
they've changed since this was built.

## A note on tooling substitutions

This was built in a network-restricted sandbox that couldn't reach `binaries.soliditylang.org`
or `foundry.paradigm.xyz`, so two substitutions were made from what the spec suggested:

- **Hardhat instead of Foundry**, for the same reason (`foundry.paradigm.xyz` was
  unreachable). The contract itself is plain, portable Solidity — if you'd rather use
  Foundry locally, `contracts/test/Said.test.ts` maps 1:1 onto a `forge-std` test file; the
  test *cases* are the valuable part, and they're all there.
- **A hand-rolled SQLite layer instead of Prisma** (`web/db/`), because Prisma's engine
  binaries are also fetched from a blocked host. It uses Node 22's built-in `node:sqlite`,
  so there's zero install step. Swapping this for Postgres/Supabase later is a matter of
  rewriting `web/db/queries.ts` against the same function signatures — nothing above that
  layer (pages, API routes, components) knows or cares which database is underneath.

Both substitutions are functionally equivalent to what was asked for — same test coverage,
same "chain is truth, DB is a fast index" architecture — just swapped for tools this sandbox
could actually reach over the network.

## What's implemented

- `Said.sol` — create/witness/complete a promise, with `Broken` always *derived* from
  `deadline` + completion state rather than stored, so it can never drift out of sync with
  the clock. 32 Hardhat tests covering creation, invalid deadlines, witnessing, duplicate/self
  witnessing, completion, unauthorized completion, deadline behavior, status derivation, and
  events.
- Landing page, `/explore` (happening now / most witnessed / kept their word / they said
  WHAT?), `/p/[id]` promise pages with an editorial OG share image, `/u/[wallet-or-username]`
  profiles with the all/active/kept/broken tabs, and the `/new` composer.
- Wallet connection is invisible until you actually try to do something — no connect button
  on load, just a quiet "not connected" in the corner. Composer, witness, and complete all
  trigger the connect sheet inline if needed, then send the transaction, wait for it to
  confirm, and index the result from the verified event log.
- Every important edge case from the spec is handled explicitly — see
  `web/src/lib/hooks/use-said-contract.ts` (`CONTRACT_ERROR_COPY`, `friendlyError`) and the
  Solidity custom errors in `Said.sol`.
