# said

**you said you'd do it.**

Said is a small, editorial, on-chain promise app for Monad. You say what you're going to
do, it gets timestamped permanently on-chain, other people witness it, and later you either
kept your word or you didn't — and either way, it stays on the record.

No tokens. No staking. No NFTs. No financial incentive. Just public accountability.

## Repo layout

```
said/
├── contracts/     Said.sol + Hardhat tests, deploy script (Monad mainnet/testnet)
└── web/           Next.js app (App Router, TS, Tailwind) + a Postgres index
```

The chain is always the source of truth for a promise's existence, its statement, its
deadline, its witnesses, and whether it's been marked kept. The Postgres database under
`web/db` is purely a read-optimized mirror of on-chain events, built so pages like the
landing feed or a profile's stats don't have to walk chain logs on every request. It can be
dropped and rebuilt from `PromiseCreated` / `PromiseWitnessed` / `PromiseCompleted` events
at any time without losing anything. See
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
cp .env.example .env        # set DATABASE_URL (free Postgres: neon.tech / supabase.com)
npm run db:seed             # creates the schema and loads demo promises
npm run dev                 # http://localhost:3000
```

The app runs and is fully browsable (landing feed, explore, profiles, promise pages) with
zero blockchain setup, using the seeded demo data. The schema is applied automatically on
first query, so pointing `DATABASE_URL` at an empty database is enough. Wallet-gated actions (make a promise,
witness, mark kept) will work end-to-end once you deploy the contract and set
`NEXT_PUBLIC_SAID_CONTRACT_ADDRESS` — until then the composer tells you plainly that the
contract isn't deployed yet, rather than pretending to succeed.

## Going on-chain

Said targets **Monad mainnet (chain 143)** by default. Set `NEXT_PUBLIC_CHAIN=testnet` in
`web/.env` and use the `:monad-testnet` scripts to point everything at testnet
(chain 10143) instead — same code, no other changes.

### Easiest: deploy from your browser wallet

Run the app (`cd web && npm run dev`) and open **http://localhost:3000/deploy**. It deploys
`Said.sol` using whatever wallet is already in your browser, writes the resulting address
into `web/.env.local`, and records it in `src/lib/contracts/addresses.json`. No private key
in a file, nothing pasted anywhere. This page is development-only — it 404s in a production
build.

If you'd rather deploy from the command line, the rest of this section covers that.

### 1. Fund a deployer wallet

Make a **fresh wallet used only for deploying** — not one holding real balances. Send it a
small amount of MON for gas; deploying Said is a single contract creation, so it costs very
little. Export that wallet's private key for the next step.

### 2. Deploy

```bash
cd contracts
npm install
cp .env.example .env      # paste DEPLOYER_PRIVATE_KEY (0x-prefixed, no quotes)
npm test                  # 32 tests — always green before you spend real gas
npm run deploy:monad      # mainnet.  testnet: npm run deploy:monad-testnet
```

The script prints the deployer address and balance before spending anything, refuses to run
on a 0-balance account, then deploys and writes the ABI + address straight into
`web/src/lib/contracts/`. It finishes by printing the exact env line to paste next.

### 3. Point the app at the contract

```bash
cd ../web
# paste the address the deploy script printed:
#   NEXT_PUBLIC_SAID_CONTRACT_ADDRESS=0x...
npm run dev
```

That's the whole loop live — make a promise, and it's a real transaction on Monad.

### 4. Verify the source (recommended)

Verifying publishes `Said.sol` next to its bytecode so anyone can read what they're
trusting. Monad mainnet is covered by Etherscan's V2 multichain API, so a free
[etherscan.io](https://etherscan.io/apidashboard) key works:

```bash
cd contracts
# add ETHERSCAN_API_KEY to .env, then:
npx hardhat verify --network monad <deployed-address>
```

### 5. Deploy the frontend

1. Create a free Postgres database ([neon.tech](https://neon.tech) or
   [supabase.com](https://supabase.com)) and copy its **pooled** connection string — Neon's
   `-pooler` host, Supabase's port 6543. Serverless functions scale to many instances, and a
   direct connection string will exhaust the database's connection limit.
2. Import the repo on Vercel with **root directory set to `web`**.
3. Set these environment variables in Vercel:

   ```
   DATABASE_URL=postgresql://…            # the pooled string
   NEXT_PUBLIC_SAID_CONTRACT_ADDRESS=0x…  # from the deploy step above
   ```

4. Deploy. The schema is created automatically on the first request. To load the demo
   promises too, run `npm run db:seed` locally with `DATABASE_URL` pointed at the same
   database.

The landing feed and `/explore` are `force-dynamic`, so they always read live rather than
serving a build-time snapshot.

Network details (chain ids, RPCs, explorers) come from viem's built-in `monad` and
`monadTestnet` definitions — see
[docs.monad.xyz](https://docs.monad.xyz/developer-essentials/network-information) if they
ever change.

## A note on tooling substitutions

This was built in a network-restricted sandbox that couldn't reach `binaries.soliditylang.org`
or `foundry.paradigm.xyz`, so two substitutions were made from what the spec suggested:

- **Hardhat instead of Foundry**, for the same reason (`foundry.paradigm.xyz` was
  unreachable). The contract itself is plain, portable Solidity — if you'd rather use
  Foundry locally, `contracts/test/Said.test.ts` maps 1:1 onto a `forge-std` test file; the
  test *cases* are the valuable part, and they're all there.
- **Plain `pg` instead of Prisma** (`web/db/`), because Prisma's engine binaries are also
  fetched from a blocked host. `db/queries.ts` is the only file that knows SQL, so the rest
  of the app (pages, API routes, components) is unaware of which client is underneath.

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
