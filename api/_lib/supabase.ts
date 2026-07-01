// Shared Supabase clients for all serverless API routes.
// - `supabaseAdmin` uses the service role key (server-side only, full access)
// - `supabasePublic` uses the anon key (safe for client-side, respects RLS)
//
// NEVER import supabaseAdmin from client-side code.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing env: SUPABASE_URL");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing env: SUPABASE_ANON_KEY");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
