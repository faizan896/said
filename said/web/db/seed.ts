// Seeds db/said.db with realistic demo data so the landing feed, explore
// page, and a sample profile all look alive out of the box. Run with:
//   npm run db:seed   (or npm run db:reset to wipe + reseed)
import "dotenv/config";
import { getDb } from "./client";

const NOW = new Date("2026-08-17T12:00:00.000Z");

function daysAgo(n: number) {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}
function daysFromNow(n: number) {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}
function fakeTx(seed: string) {
  let h = "";
  for (let i = 0; i < 64; i++) {
    const c = (seed.charCodeAt(i % seed.length) * (i + 7)) % 16;
    h += c.toString(16);
  }
  return `0x${h}`;
}
function witnessAddr(i: number) {
  return `0x${(i * 111111111111 + 7).toString(16).padStart(40, "0")}`;
}

const FAIZAN = "0x1111111111111111111111111111111111faaa";
const ALEX = "0x2222222222222222222222222222222222a1ex";
const MARA = "0x3333333333333333333333333333333333ma7a";
const DEV_JUN = "0x4444444444444444444444444444444444de99";
const PRIYA = "0x5555555555555555555555555555555555p71a";

type Seed = {
  id: number;
  creator: string;
  statement: string;
  category: string;
  createdAt: string;
  deadline: string;
  status: "ACTIVE" | "KEPT" | "BROKEN";
  completedAt?: string;
  proofUrl?: string;
  proofNote?: string;
  witnessCount: number;
};

const seeds: Seed[] = [
  {
    id: 1,
    creator: FAIZAN,
    statement: "I'll ship my startup before December.",
    category: "BUILD",
    createdAt: daysAgo(6),
    deadline: "2026-12-01T00:00:00.000Z",
    status: "ACTIVE",
    witnessCount: 14,
  },
  {
    id: 2,
    creator: FAIZAN,
    statement: "I'll launch Vexa before 2027.",
    category: "BUILD",
    createdAt: daysAgo(12),
    deadline: daysFromNow(104),
    status: "ACTIVE",
    witnessCount: 29,
  },
  {
    id: 3,
    creator: FAIZAN,
    statement: "I'll publish my Monad research before August.",
    category: "BUILD",
    createdAt: daysAgo(41),
    deadline: "2026-08-01T00:00:00.000Z",
    status: "KEPT",
    completedAt: daysAgo(43),
    proofUrl: "https://mirror.xyz/faizan.eth/monad-research",
    witnessCount: 17,
  },
  {
    id: 4,
    creator: FAIZAN,
    statement: "I'll run every morning for 30 days.",
    category: "FITNESS",
    createdAt: daysAgo(75),
    deadline: daysAgo(45),
    status: "BROKEN",
    witnessCount: 8,
  },
  {
    id: 5,
    creator: FAIZAN,
    statement: "I'll finish reading 12 books this year.",
    category: "LEARNING",
    createdAt: daysAgo(150),
    deadline: "2026-12-31T00:00:00.000Z",
    status: "ACTIVE",
    witnessCount: 6,
  },
  {
    id: 6,
    creator: FAIZAN,
    statement: "I'll cut freelance clients down to 3.",
    category: "MONEY",
    createdAt: daysAgo(100),
    deadline: daysAgo(30),
    status: "KEPT",
    completedAt: daysAgo(35),
    proofNote: "Down to 3 as of last month. Feels great.",
    witnessCount: 9,
  },
  {
    id: 7,
    creator: FAIZAN,
    statement: "I'll learn conversational Spanish.",
    category: "LEARNING",
    createdAt: daysAgo(130),
    deadline: daysAgo(10),
    status: "BROKEN",
    witnessCount: 11,
  },
  {
    id: 8,
    creator: FAIZAN,
    statement: "I'll open source my design system.",
    category: "BUILD",
    createdAt: daysAgo(60),
    deadline: daysAgo(20),
    status: "KEPT",
    completedAt: daysAgo(22),
    proofUrl: "https://github.com/faizan/said-design",
    witnessCount: 22,
  },
  {
    id: 9,
    creator: FAIZAN,
    statement: "I'll do a 30-day no-spending challenge.",
    category: "MONEY",
    createdAt: daysAgo(90),
    deadline: daysAgo(60),
    status: "KEPT",
    completedAt: daysAgo(61),
    proofNote: "Barely. Never again.",
    witnessCount: 5,
  },
  {
    id: 10,
    creator: FAIZAN,
    statement: "I'll write one blog post a month for 6 months.",
    category: "OTHER",
    createdAt: daysAgo(170),
    deadline: daysAgo(5),
    status: "KEPT",
    completedAt: daysAgo(6),
    proofUrl: "https://faizan.blog",
    witnessCount: 13,
  },
  {
    id: 11,
    creator: FAIZAN,
    statement: "I'll get my private pilot's license.",
    category: "LIFE",
    createdAt: daysAgo(200),
    deadline: daysAgo(90),
    status: "KEPT",
    completedAt: daysAgo(95),
    proofUrl: "https://faa.gov",
    witnessCount: 31,
  },
  {
    id: 12,
    creator: FAIZAN,
    statement: "I'll ship a v1 of Said before it's too embarrassing not to.",
    category: "BUILD",
    createdAt: daysAgo(3),
    deadline: daysFromNow(21),
    status: "KEPT",
    completedAt: daysAgo(0),
    proofUrl: "https://said.xyz",
    witnessCount: 4,
  },
  {
    id: 13,
    creator: ALEX,
    statement: "I'll run my first marathon this year.",
    category: "FITNESS",
    createdAt: daysAgo(220),
    deadline: "2026-12-31T00:00:00.000Z",
    status: "KEPT",
    completedAt: daysAgo(19),
    proofUrl: "https://strava.com/activities/0xalex-marathon",
    witnessCount: 31,
  },
  {
    id: 14,
    creator: MARA,
    statement: "I'll go vegetarian for 90 days straight.",
    category: "LIFE",
    createdAt: daysAgo(2),
    deadline: daysFromNow(88),
    status: "ACTIVE",
    witnessCount: 41,
  },
  {
    id: 15,
    creator: DEV_JUN,
    statement: "I'll beat my little brother at chess before his birthday.",
    category: "OTHER",
    createdAt: daysAgo(1),
    deadline: daysFromNow(14),
    status: "ACTIVE",
    witnessCount: 53,
  },
  {
    id: 16,
    creator: PRIYA,
    statement: "I'll finally tell my landlord about the leak.",
    category: "LIFE",
    createdAt: daysAgo(4),
    deadline: daysFromNow(3),
    status: "ACTIVE",
    witnessCount: 19,
  },
  {
    id: 17,
    creator: DEV_JUN,
    statement: "I'll ship this product in 30 days.",
    category: "BUILD",
    createdAt: daysAgo(29),
    deadline: daysAgo(1),
    status: "BROKEN",
    witnessCount: 24,
  },
  {
    id: 18,
    creator: MARA,
    statement: "I'll text my ex one last time to say nothing, and mean it.",
    category: "OTHER",
    createdAt: daysAgo(15),
    deadline: daysAgo(1),
    status: "KEPT",
    completedAt: daysAgo(2),
    proofNote: "Didn't text. That was the point.",
    witnessCount: 67,
  },
  {
    id: 19,
    creator: ALEX,
    statement: "I'll get to inbox zero and stay there for a week.",
    category: "OTHER",
    createdAt: daysAgo(8),
    deadline: daysFromNow(2),
    status: "ACTIVE",
    witnessCount: 12,
  },
  {
    id: 20,
    creator: PRIYA,
    statement: "I'll learn to skateboard before I turn 30.",
    category: "LIFE",
    createdAt: daysAgo(45),
    deadline: daysFromNow(200),
    status: "ACTIVE",
    witnessCount: 8,
  },
];

function main() {
  const db = getDb();

  db.exec("DELETE FROM witnesses");
  db.exec("DELETE FROM promises");
  db.exec("DELETE FROM profiles");

  const insertProfile = db.prepare(
    "INSERT INTO profiles (address, username, joined_at) VALUES (?, ?, ?)"
  );
  insertProfile.run(FAIZAN, "faizan", daysAgo(190));
  insertProfile.run(ALEX, "0xalex", daysAgo(240));
  insertProfile.run(MARA, "mara", daysAgo(80));
  insertProfile.run(DEV_JUN, "jun", daysAgo(150));
  insertProfile.run(PRIYA, "priya", daysAgo(60));

  const insertPromise = db.prepare(
    `INSERT INTO promises
      (id, creator_address, statement, category, created_at, deadline, status, proof_url, proof_note, completed_at, create_tx_hash, complete_tx_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertWitness = db.prepare(
    `INSERT INTO witnesses (promise_id, witness_address, witnessed_at, tx_hash) VALUES (?, ?, ?, ?)`
  );

  for (const s of seeds) {
    insertPromise.run(
      s.id,
      s.creator,
      s.statement,
      s.category,
      s.createdAt,
      s.deadline,
      s.status,
      s.proofUrl ?? null,
      s.proofNote ?? null,
      s.completedAt ?? null,
      fakeTx(`create-${s.id}`),
      s.status === "KEPT" ? fakeTx(`complete-${s.id}`) : null
    );

    for (let i = 0; i < s.witnessCount; i++) {
      insertWitness.run(
        s.id,
        witnessAddr(s.id * 1000 + i),
        daysAgo(0),
        fakeTx(`witness-${s.id}-${i}`)
      );
    }
  }

  console.log(`Seeded ${seeds.length} promises.`);
}

main();
