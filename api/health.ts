// Health check endpoint - verifies API + Supabase connection.
// GET /api/health

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  const result: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    },
  };

  // Try a lightweight Supabase query to confirm connectivity
  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    result.supabase = error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    result.supabase = { ok: false, error: (err as Error).message };
  }

  result.durationMs = Date.now() - started;
  return res.status(200).json(result);
}
