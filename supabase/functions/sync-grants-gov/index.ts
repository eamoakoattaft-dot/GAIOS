// sync-grants-gov: fetch open opportunities from Grants.gov Search2 API and
// upsert into external_opportunities. Public API, no key required.
// After ingest, chains hydrate-grants-gov-details and score-opportunities.
// Trigger: POST with optional { keyword?: string, rows?: number, skipChain?: boolean }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEMO_ORG_ID  = "b333f317-68b4-4f11-b053-0d8116e3335c";

const GRANTS_GOV_URL = "https://api.grants.gov/v1/api/search2";

type GrantsGovHit = {
  id: string;
  number: string;
  title: string;
  agencyCode?: string;
  agencyName?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  docType?: string;
  alnist?: string[];
};

function parseMDY(s?: string): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

async function callSibling(name: string, body: Record<string, unknown>) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    return await resp.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: runRow, error: runErr } = await sb
    .from("agent_sync_runs")
    .insert({ source: "grants.gov", status: "running" })
    .select("id").single();
  if (runErr) return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  const runId = runRow!.id;

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* GET or empty body */ }

    const keyword    = (body.keyword as string | undefined) ?? "";
    const rows       = Math.min((body.rows as number | undefined) ?? 100, 500);
    const skipChain  = Boolean(body.skipChain);

    const { data: cfg } = await sb
      .from("agent_scoring_config")
      .select("keywords,agencies")
      .eq("org_id", DEMO_ORG_ID)
      .eq("agent_id", "grant-manager")
      .maybeSingle();

    const queries: string[] = keyword
      ? [keyword]
      : (cfg?.keywords?.length ? cfg.keywords : ["STEM", "climate health", "public health capacity"]);

    let totalFetched = 0;
    let totalNew     = 0;
    let totalUpdated = 0;

    for (const q of queries) {
      const payload = {
        keyword: q,
        oppStatuses: "forecasted|posted",
        rows,
        startRecordNum: 0,
        sortBy: "openDate|desc",
      };
      const resp = await fetch(GRANTS_GOV_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`grants.gov ${q}: ${resp.status} ${await resp.text().catch(()=>"")}`);
      }
      const json = await resp.json();
      const hits: GrantsGovHit[] = json?.data?.oppHits ?? [];
      totalFetched += hits.length;

      for (const h of hits) {
        const posted   = parseMDY(h.openDate);
        const deadline = parseMDY(h.closeDate);
        const upsertPayload = {
          source: "grants.gov" as const,
          notice_id: h.id,
          title: h.title,
          agency: h.agencyName ?? h.agencyCode ?? null,
          sub_agency: null,
          opportunity_number: h.number ?? null,
          naics_codes: [] as string[],
          psc_codes:   [] as string[],
          set_aside:   null,
          posted_date: posted,
          response_deadline: deadline ? `${deadline}T23:59:59Z` : null,
          url: `https://www.grants.gov/search-results-detail/${h.id}`,
          raw_json: h,
          synced_at: new Date().toISOString(),
        };

        const { data: existing } = await sb
          .from("external_opportunities")
          .select("id")
          .eq("source", "grants.gov")
          .eq("notice_id", h.id)
          .maybeSingle();

        const { error: upErr } = await sb
          .from("external_opportunities")
          .upsert(upsertPayload, { onConflict: "source,notice_id" });
        if (upErr) throw upErr;

        if (existing) totalUpdated += 1; else totalNew += 1;
      }
    }

    let hydrated: unknown = null;
    let scored: unknown   = null;

    // Chain hydrate + score to keep the recommendations fresh
    if (!skipChain) {
      // Hydrate is bounded to keep runtime reasonable; anything missed will be
      // picked up by the nightly backfill cron.
      hydrated = await callSibling("hydrate-grants-gov-details", { limit: 60 });
      scored   = await callSibling("score-opportunities", {});
    }

    await sb.from("agent_sync_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      opportunities_fetched: totalFetched,
      opportunities_new: totalNew,
      opportunities_updated: totalUpdated,
      meta: { queries, hydrated, scored },
    }).eq("id", runId);

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      fetched: totalFetched,
      new: totalNew,
      updated: totalUpdated,
      queries,
      hydrated,
      scored,
    }), { headers: { ...cors(), "content-type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await sb.from("agent_sync_runs").update({
      status: "error", finished_at: new Date().toISOString(), error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  }
});
