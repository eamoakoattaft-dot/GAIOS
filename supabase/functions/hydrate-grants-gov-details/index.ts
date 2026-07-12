// hydrate-grants-gov-details: for external_opportunities from grants.gov that
// lack a description, call fetchOpportunity to pull synopsisDesc, award
// ceiling/floor, and eligibility. Batches to avoid API abuse.
// Trigger: POST { limit?: number, force?: boolean }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DETAIL_URL   = "https://api.grants.gov/v1/api/fetchOpportunity";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchOne(opportunityId: string): Promise<Record<string, unknown> | null> {
  const resp = await fetch(DETAIL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ opportunityId: Number(opportunityId) }),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  if (json?.errorcode && json.errorcode !== 0) return null;
  return json?.data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty ok */ }
  const limit = Math.min((body.limit as number | undefined) ?? 100, 500);
  const force = Boolean(body.force);

  const { data: runRow, error: runErr } = await sb
    .from("agent_sync_runs")
    .insert({ source: "grants.gov", status: "running", meta: { phase: "hydrate" } })
    .select("id").single();
  if (runErr) return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  const runId = runRow!.id;

  try {
    // Which rows still need hydration?
    let q = sb.from("external_opportunities")
      .select("id,notice_id")
      .eq("source", "grants.gov")
      .order("posted_date", { ascending: false })
      .limit(limit);
    if (!force) q = q.is("description", null);
    const { data: rows, error: qErr } = await q;
    if (qErr) throw qErr;

    let updated = 0;
    let missed = 0;

    for (const row of rows ?? []) {
      // Small sleep to be polite to the public API
      await new Promise((r) => setTimeout(r, 120));
      const detail = await fetchOne(row.notice_id);
      if (!detail) { missed += 1; continue; }
      const syn = (detail.synopsis ?? {}) as Record<string, unknown>;
      const descHtml = String(syn.synopsisDesc ?? "");
      const description = descHtml ? stripHtml(descHtml) : null;
      const eligibility = syn.applicantEligibilityDesc ? stripHtml(String(syn.applicantEligibilityDesc)) : null;
      const combined = [description, eligibility ? `\n\nEligibility: ${eligibility}` : ""].filter(Boolean).join("");

      const patch: Record<string, unknown> = {
        description: combined || null,
        award_ceiling: syn.awardCeiling ? Number(syn.awardCeiling) : null,
        award_floor:   syn.awardFloor   ? Number(syn.awardFloor)   : null,
      };

      // Also fold assistance listing (CFDA) into naics_codes-adjacent field?
      // We keep naics_codes reserved for actual NAICS; skip for now.

      const { error: upErr } = await sb.from("external_opportunities").update(patch).eq("id", row.id);
      if (upErr) throw upErr;
      if (combined) updated += 1; else missed += 1;
    }

    await sb.from("agent_sync_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      opportunities_fetched: (rows ?? []).length,
      opportunities_updated: updated,
      meta: { phase: "hydrate", missed },
    }).eq("id", runId);

    return new Response(JSON.stringify({
      ok: true, run_id: runId, considered: (rows ?? []).length, updated, missed,
    }), { headers: { ...cors(), "content-type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await sb.from("agent_sync_runs").update({
      status: "error", finished_at: new Date().toISOString(), error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  }
});
