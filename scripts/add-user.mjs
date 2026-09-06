// Add one more teammate account (beyond the three `npm run seed` creates).
//
// Usage:
//   node --env-file=.env.local scripts/add-user.mjs <username> "<Display Name>" [password]
//
// <username> is what they'll type in the "Name" field on the login screen
// (keep it one word, lowercase — e.g. "priya"). Display Name is what shows
// in the app (e.g. "Priya"). If you leave [password] off, one is generated
// and printed for you to share with them.

import postgres from "postgres";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const [, , usernameArg, displayNameArg, passwordArg] = process.argv;

if (!usernameArg || !displayNameArg) {
  console.error('Usage: node --env-file=.env.local scripts/add-user.mjs <username> "<Display Name>" [password]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — add it to .env.local first (see .env.example).");
  process.exit(1);
}

const username = usernameArg.trim().toLowerCase();
const displayName = displayNameArg.trim();
const password = passwordArg || crypto.randomBytes(9).toString("base64url");

const sql = postgres(process.env.DATABASE_URL);

const [existing] = await sql`select username from accounts where username = ${username}`;
if (existing) {
  console.error(`An account with username "${username}" already exists.`);
  await sql.end();
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await sql`
  insert into accounts (username, display_name, password_hash)
  values (${username}, ${displayName}, ${hash})
`;

console.log("Created account:");
console.log(`  name:     ${displayName}`);
console.log(`  username: ${username}`);
console.log(`  password: ${password}`);
console.log(`\nThey log in by typing "${username}" (or "${displayName}", it's case-insensitive) and this password.`);

await sql.end();
