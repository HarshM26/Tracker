import postgres from "postgres";

// Reused across hot-reloads in dev so we don't open a new pool on every save.
declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example) — " +
      "DEPLOY.md Step 3 explains how Vercel provides it automatically once a database is connected."
  );
}

const sql = global.__sql ?? postgres(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  global.__sql = sql;
}

export default sql;
