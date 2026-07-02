// Data access layer, backed by Supabase Postgres via Drizzle ORM.
// Auth now lives entirely in Supabase Auth — the toy `users` table has been removed.
// This file just exports the Drizzle db handle for server-side data access.

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (see .env.example)");
}

const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client);

// Legacy placeholder to keep old imports working; no methods yet.
// Add real data access methods here as we wire modules to the DB.
export const storage = {};
