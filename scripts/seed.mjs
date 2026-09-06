// Run with: npm run seed
// (package.json runs this as `node --env-file=.env.local scripts/seed.mjs`)
//
// Safe to run more than once: table creation uses IF NOT EXISTS, and any
// account that already exists is left untouched rather than overwritten.

import postgres from "postgres";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — add it to .env.local first (see DEPLOY.md Step 6).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

const TEAM = [
  { username: "harsh", displayName: "Harsh", envVar: "SEED_HARSH_PASSWORD" },
  { username: "shristi", displayName: "Shristi", envVar: "SEED_SHRISTI_PASSWORD" },
  { username: "ruchit", displayName: "Ruchit", envVar: "SEED_RUCHIT_PASSWORD" },
];

function randomPassword() {
  return crypto.randomBytes(9).toString("base64url"); // ~12 chars, url-safe
}

async function ensureSchema() {
  await sql`
    create table if not exists accounts (
      username text primary key,
      display_name text not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists tasks (
      id text primary key,
      start_date date not null,
      assigned_to text not null references accounts(username),
      created_by text not null references accounts(username),
      summary text not null,
      completed boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists comments (
      id text primary key,
      task_id text not null references tasks(id) on delete cascade,
      author text not null,
      body text not null,
      created_at timestamptz not null default now()
    )
  `;
}

async function seedAccounts() {
  console.log("Seeding accounts...\n");
  for (const person of TEAM) {
    const [existing] = await sql`select username from accounts where username = ${person.username}`;
    if (existing) {
      console.log(`- ${person.displayName}: account already exists, skipped.`);
      continue;
    }

    const password = process.env[person.envVar] || randomPassword();
    const hash = await bcrypt.hash(password, 10);
    await sql`
      insert into accounts (username, display_name, password_hash)
      values (${person.username}, ${person.displayName}, ${hash})
    `;

    console.log(`- ${person.displayName}`);
    console.log(`    username: ${person.username}`);
    console.log(`    password: ${password}\n`);
  }
}

async function main() {
  await ensureSchema();
  await seedAccounts();
  console.log("Done. Copy any passwords printed above now — they aren't stored anywhere retrievable.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
