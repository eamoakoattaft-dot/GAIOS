// Postgres connection via Drizzle ORM, using Supabase's transaction pooler.
// Serverless-safe: uses a lightweight postgres-js client with limited pool.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing env: DATABASE_URL");
}

// Single connection per serverless invocation (pooler handles concurrency)
const client = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // required for Supabase transaction pooler
});

export const db = drizzle(client);
