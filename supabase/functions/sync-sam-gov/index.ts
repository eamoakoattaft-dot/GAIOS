// sync-sam-gov: fetch open opportunities from SAM.gov Opportunities API v2
// and upsert into external_opportunities.
// Requires Deno.env.get('SAM_GOV_API_KEY'). If missing, returns 'skipped'.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SAM_KEY      = Deno.env.get("SAM_GOV_API_KEY");
const DEMO_ORG_ID  = "b333f317-68b4-4f11-b053-0d8116e3335c";

const SAM_URL = "https://api.sam.gov/opportunities/v2/search";

type SamHit = {
  noticeId: string;
  title: string;
  fullParentPathName?: string;
  fullParentPathCode?: string;
  postedDate?: string;   // YYYY-MM-DD
  type?: string;
  baseType?: string;
  archiveType?: string;
  archiveDate?: string;
  responseDeadLine?: string; // ISO 8601
  naicsCode?: string;
  classificationCode?: string;
  typeOfSetAsideDescription?: string;
  organizationType?: string;
  uiLink?: string;
  description?: string;
  additionalInfoLink?: string;
  award?: unknown;
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function formatMDY(d: Date) {
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  const yy = d.getUTCFullYear();
  return `${mm}/${dd}/${yy}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Guard: no key yet -> log skipped and return cleanly
  if (!SAM_KEY) {
    const { data: runRow } = await sb.from("agent_sync_runs")
      .insert({ source: "sam.gov", status: "skipped", finished_at: new Date().toISOString(), error: "SAM_GOV_API_KEY not configured" })
      .select("id").single();
    return new Response(JSON.stringify({
      ok: false, skipped: true, run_id: runRow?.id ?? null,
      reason: "SAM_GOV_API_KEY secret not set on this Supabase project"
    }), { status: 200, headers: { ...cors(), "content-type": "application/json" } });
  }

  const { data: runRow, error: runErr } = await sb
    .from("agent_sync_runs")
    .insert({ source: "sam.gov", status: "running" })
    .select("id").single();
  if (runErr) return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  const runId = runRow!.id;

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty ok */ }

    const now = new Date();
    const fromDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const postedFrom = (body.postedFrom as string | undefined) ?? formatMDY(fromDate);
    const postedTo   = (body.postedTo   as string | undefined) ?? formatMDY(now);
    const limit      = Math.min((body.limit as number | undefined) ?? 100, 1000);
    const keyword    = (body.keyword as string | undefined) ?? "";

    const { data: cfg } = await sb.from("agent_scoring_config")
      .select("keywords").eq("org_id", DEMO_ORG_ID).eq("agent_id","grant-manager").maybeSingle();
    const queries = keyword ? [keyword] : (cfg?.keywords?.length ? cfg.keywords : ["STEM"]);

    let totalFetched = 0, totalNew = 0, totalUpdated = 0;

    for (const q of queries) {
      const url = new URL(SAM_URL);
      url.searchParams.set("api_key", SAM_KEY);
      url.searchParams.set("postedFrom", postedFrom);
      url.searchParams.set("postedTo",   postedTo);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset","0");
      if (q) url.searchParams.set("q", q);

      const resp = await fetch(url.toString());
      if (!resp.ok) {
        throw new Error(`sam.gov ${q}: ${resp.status} ${await resp.text().catch(()=>"")}`);
      }
      const json = await resp.json();
      const hits: SamHit[] = json?.opportunitiesData ?? [];
      totalFetched += hits.length;

      for (const h of hits) {
        const upsertPayload = {
          source: "sam.gov" as const,
          notice_id: h.noticeId,
          title: h.title,
          agency: h.fullParentPathName ?? null,
          sub_agency: null,
          opportunity_number: null,
          naics_codes: h.naicsCode ? [h.naicsCode] : [],
          psc_codes:   h.classificationCode ? [h.classificationCode] : [],
          set_aside:   h.typeOfSetAsideDescription ?? null,
          posted_date: h.postedDate ?? null,
          response_deadline: h.responseDeadLine ?? null,
          award_ceiling: null,
          award_floor:   null,
          description: h.description ?? null,
          url: h.uiLink ?? null,
          raw_json: h,
          synced_at: new Date().toISOString(),
        };

        const { data: existing } = await sb.from("external_opportunities")
          .select("id").eq("source","sam.gov").eq("notice_id", h.noticeId).maybeSingle();
        const { error: upErr } = await sb.from("external_opportunities")
          .upsert(upsertPayload, { onConflict: "source,notice_id" });
        if (upErr) throw upErr;
        if (existing) totalUpdated += 1; else totalNew += 1;
      }
    }

    await sb.from("agent_sync_runs").update({
      status: "success", finished_at: new Date().toISOString(),
      opportunities_fetched: totalFetched, opportunities_new: totalNew, opportunities_updated: totalUpdated,
      meta: { queries, postedFrom, postedTo },
    }).eq("id", runId);

    return new Response(JSON.stringify({
      ok: true, run_id: runId, fetched: totalFetched, new: totalNew, updated: totalUpdated, queries,
    }), { headers: { ...cors(), "content-type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await sb.from("agent_sync_runs").update({
      status: "error", finished_at: new Date().toISOString(), error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  }
});
