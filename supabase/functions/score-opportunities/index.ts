// score-opportunities v3 (rules-v3):
// - Everything from v2 (eligibility flags)
// - Adds fit_summary: one-sentence rule-based "why this fits CSTEM Global"
// - Adds deadline_bucket: urgent-10 | soon-30 | comfortable-60 | later | past | none

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEMO_ORG_ID  = "b333f317-68b4-4f11-b053-0d8116e3335c";
const SCORER_VERSION = "rules-v3";

type Config = {
  keywords: string[];
  naics_codes: string[];
  agencies: string[];
  exclude_set_asides: string[];
  min_days_to_deadline: number;
  max_days_to_deadline: number;
  weights: Record<string, number>;
  thresholds: { pursue: number; partner: number; monitor: number };
};

type ExtOpp = {
  id: string;
  title: string | null;
  agency: string | null;
  naics_codes: string[] | null;
  set_aside: string | null;
  response_deadline: string | null;
  description: string | null;
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function matchesAny(hay: string, needles: string[]): string[] {
  const h = hay.toLowerCase();
  return needles.filter((n) => n && h.includes(n.toLowerCase()));
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

function deadlineBucket(days: number | null): string {
  if (days === null) return "none";
  if (days < 0) return "past";
  if (days <= 10) return "urgent-10";
  if (days <= 30) return "soon-30";
  if (days <= 60) return "comfortable-60";
  return "later";
}

type EligFlag = { code: string; label: string; penalty: number; disqualify?: boolean };

function detectEligibilityFlags(description: string | null): EligFlag[] {
  if (!description) return [];
  const flags: EligFlag[] = [];

  if (/(eligible applicants are|eligibility is limited to|only eligible applicants|only.{0,20}eligible)[^.]{0,120}(tribes|tribal|indian)/i.test(description)) {
    flags.push({ code: "tribal_only", label: "Tribal governments only", penalty: 100, disqualify: true });
  }
  if (/eligible applicants[^.]{0,120}(state agencies|state governments|state, local)/i.test(description) && !/nonprofit|non-profit|501\(c\)/i.test(description)) {
    flags.push({ code: "gov_only", label: "Government agencies only", penalty: 100, disqualify: true });
  }
  if (/(for-profit|commercial|small business).{0,30}(only|exclusively)/i.test(description)) {
    flags.push({ code: "for_profit_only", label: "For-profit / small business only", penalty: 100, disqualify: true });
  }
  if (/(institutions of higher education|colleges and universities|academic institutions).{0,30}(only|exclusively)/i.test(description)) {
    flags.push({ code: "universities_only", label: "Universities/higher-ed only", penalty: 100, disqualify: true });
  }
  if (/domestic applicants only|u\.s\. citizens only|foreign entities.{0,30}(not eligible|disqualified)/i.test(description)) {
    flags.push({ code: "us_only_ok", label: "US applicants only (we qualify)", penalty: 0 });
  }

  if (/(three|3|five|5).{0,10}years.{0,30}(operating|experience|existence|history|track record)/i.test(description)) {
    flags.push({ code: "operating_history", label: "Requires multi-year operating history", penalty: 25 });
  }
  if (/(prior|previous|past).{0,30}(federal award|federal grant|recipient of)/i.test(description)) {
    flags.push({ code: "prior_federal_award", label: "Prior federal award required", penalty: 25 });
  }
  if (/audited financial statements|independent audit/i.test(description)) {
    flags.push({ code: "audited_financials", label: "Audited financial statements required", penalty: 15 });
  }
  if (/single audit|OMB.{0,10}A-133|2 CFR 200 Subpart F/i.test(description)) {
    flags.push({ code: "single_audit", label: "Single Audit / 2 CFR 200 Subpart F required", penalty: 15 });
  }

  const bigMoney = description.match(/(minimum|at least|no less than).{0,30}\$\s?([\d,]+)/i);
  if (bigMoney) {
    const val = Number(bigMoney[2].replace(/,/g, ""));
    if (val >= 500000) {
      flags.push({ code: "large_minimum", label: `Minimum ~$${(val/1000).toFixed(0)}k — large for a new org`, penalty: 15 });
    }
  }
  if (/cost.{0,10}(share|matching).{0,80}(required|mandatory|must)/i.test(description)) {
    flags.push({ code: "cost_share_required", label: "Cost-share / matching funds required", penalty: 15 });
  }

  if (/(planning grant|capacity building|seed grant|first-time applicant|emerging organizations|new applicant)/i.test(description)) {
    flags.push({ code: "newcomer_friendly", label: "Newcomer-friendly / capacity building", penalty: -15 });
  }

  return flags;
}

const THEME_GROUPS: Array<{ label: string; matches: string[] }> = [
  { label: "biodiversity & ecosystems", matches: ["biodiversity","ecosystem","conservation","restoration","landscape ecology","ecosystem services","natural resource","wildlife","habitat"] },
  { label: "climate resilience & adaptation", matches: ["climate resilience","climate adaptation","climate change"] },
  { label: "sustainability", matches: ["sustainability","sustainable development","circular economy","renewable"] },
  { label: "ecotourism & destination management", matches: ["ecotourism","sustainable tourism","destination management"] },
  { label: "cultural heritage", matches: ["cultural heritage","heritage preservation"] },
  { label: "community livelihoods", matches: ["livelihoods","community development","workforce training","small enterprise","poverty reduction","rural development"] },
  { label: "women & youth empowerment", matches: ["women empowerment","youth development"] },
  { label: "applied research & policy", matches: ["applied research","impact assessment","policy","monitoring and evaluation"] },
  { label: "environmental education", matches: ["environmental education"] },
  { label: "Africa / Global South focus", matches: ["africa","west africa","ghana","global south","sub-saharan"] },
  { label: "capacity building for emerging orgs", matches: ["capacity building","emerging organizations","planning grant","seed grant"] },
];

function summarizeThemes(matchedKeywords: string[]): string[] {
  const lc = matchedKeywords.map((k) => k.toLowerCase());
  const themes: string[] = [];
  for (const g of THEME_GROUPS) {
    if (g.matches.some((m) => lc.includes(m.toLowerCase()))) themes.push(g.label);
  }
  return themes;
}

const AGENCY_MISSION: Record<string, string> = {
  "USAID": "USAID (international development)",
  "DOS": "State Department (diplomacy & culture)",
  "EPA": "EPA (environmental protection)",
  "DOI": "Interior (natural resources & parks)",
  "DOI-NPS": "National Park Service",
  "DOI-FWS": "Fish & Wildlife Service",
  "DOI-BLM": "Bureau of Land Management",
  "USDA": "USDA (agriculture & rural development)",
  "USDA-NRCS": "USDA-NRCS (conservation)",
  "USDA-FS": "US Forest Service",
  "USDA-NIFA": "USDA-NIFA (research & extension)",
  "NSF": "NSF (research)",
  "NOAA": "NOAA (oceans, coasts, climate)",
  "DOC": "Commerce",
  "ED": "Education",
  "MCC": "Millennium Challenge Corp (global development)",
  "DFC": "Development Finance Corp",
};

function buildFitSummary(
  _recommendation: string,
  matchedKeywords: string[],
  matchedAgencies: string[],
  eligFlags: EligFlag[],
  disqualified: boolean,
  daysToDeadline: number | null,
): string {
  if (disqualified) {
    const blocker = eligFlags.find((f) => f.disqualify);
    return `Not eligible: ${blocker?.label ?? "restricted applicant pool"}.`;
  }

  const themes = summarizeThemes(matchedKeywords).slice(0, 3);
  const agencyBlurb = matchedAgencies
    .map((a) => AGENCY_MISSION[a.toUpperCase()] ?? a)
    .slice(0, 1)[0];

  const parts: string[] = [];

  if (themes.length > 0) {
    parts.push(`Matches CSTEM's work in ${themes.join(", ")}`);
  } else if (matchedKeywords.length > 0) {
    parts.push(`Matches CSTEM keywords: ${matchedKeywords.slice(0, 3).join(", ")}`);
  } else {
    parts.push(`Weak thematic match — monitor for context`);
  }

  if (agencyBlurb) parts.push(`funder is ${agencyBlurb}`);

  const newcomer = eligFlags.find((f) => f.code === "newcomer_friendly");
  if (newcomer) parts.push(`newcomer-friendly (planning/seed/first-time)`);

  const warn = eligFlags.find((f) => !f.disqualify && f.penalty > 0);
  if (warn) parts.push(`caveat: ${warn.label.toLowerCase()}`);

  if (typeof daysToDeadline === "number") {
    if (daysToDeadline < 0) parts.push(`deadline passed`);
    else if (daysToDeadline <= 10) parts.push(`urgent — ${daysToDeadline}d to deadline`);
    else if (daysToDeadline <= 30) parts.push(`due in ${daysToDeadline}d`);
  }

  let s = parts.join(" · ");
  if (s.length > 240) s = s.slice(0, 237) + "…";
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

function scoreOpportunity(opp: ExtOpp, cfg: Config) {
  const text = [opp.title ?? "", opp.description ?? ""].join(" \n ");
  const w = cfg.weights;

  const kwHits    = matchesAny(text, cfg.keywords);
  const agHits    = opp.agency ? matchesAny(opp.agency, cfg.agencies) : [];
  const naicsHits = (opp.naics_codes ?? []).filter((n) => cfg.naics_codes.includes(n));
  const setAsideBad = opp.set_aside
    ? cfg.exclude_set_asides.some((x) => x && opp.set_aside!.toLowerCase().includes(x.toLowerCase()))
    : false;
  const days = daysUntil(opp.response_deadline);

  const kwScore    = cfg.keywords.length ? Math.min(1, kwHits.length / Math.min(3, cfg.keywords.length)) * w.keyword : 0;
  const naicsScore = cfg.naics_codes.length ? (naicsHits.length ? w.naics : 0) : 0;
  const agScore    = cfg.agencies.length ? (agHits.length ? w.agency : 0) : 0;

  let deadlineScore = 0;
  if (days !== null) {
    if (days >= cfg.min_days_to_deadline && days <= cfg.max_days_to_deadline) deadlineScore = w.deadline;
    else if (days >= 0 && days < cfg.min_days_to_deadline) deadlineScore = w.deadline * 0.4;
  }
  const setAsideScore = setAsideBad ? 0 : w.set_aside;

  const raw = kwScore + naicsScore + agScore + deadlineScore + setAsideScore;
  const cap = w.keyword + w.naics + w.agency + w.deadline + w.set_aside;
  let score = Math.round((raw / cap) * 100);

  const eligFlags = detectEligibilityFlags(opp.description);
  let eligibilityPenalty = 0;
  let disqualified = false;
  for (const f of eligFlags) {
    eligibilityPenalty += f.penalty;
    if (f.disqualify) disqualified = true;
  }
  score = Math.max(0, Math.min(100, score - eligibilityPenalty));
  if (disqualified) score = Math.min(score, 15);

  const t = cfg.thresholds;
  let recommendation: "Pursue" | "Partner" | "Monitor" | "Decline";
  if (score >= t.pursue)  recommendation = "Pursue";
  else if (score >= t.partner) recommendation = "Partner";
  else if (score >= t.monitor) recommendation = "Monitor";
  else recommendation = "Decline";

  const fitSummary = buildFitSummary(recommendation, kwHits, agHits, eligFlags, disqualified, days);

  return {
    score,
    recommendation,
    rationale: {
      matched_keywords: kwHits,
      matched_agencies: agHits,
      matched_naics:    naicsHits,
      excluded_set_aside: setAsideBad ? opp.set_aside : null,
      days_to_deadline: days,
      deadline_bucket: deadlineBucket(days),
      component_scores: {
        keyword: kwScore, naics: naicsScore, agency: agScore, deadline: deadlineScore, set_aside: setAsideScore,
      },
      eligibility_flags: eligFlags,
      eligibility_penalty: eligibilityPenalty,
      disqualified,
      fit_summary: fitSummary,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: runRow, error: runErr } = await sb
    .from("agent_sync_runs").insert({ source: "scorer", status: "running" }).select("id").single();
  if (runErr) return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  const runId = runRow!.id;

  try {
    const { data: cfgRow, error: cfgErr } = await sb.from("agent_scoring_config")
      .select("*").eq("org_id", DEMO_ORG_ID).eq("agent_id", "grant-manager").single();
    if (cfgErr) throw cfgErr;
    const cfg = cfgRow as unknown as Config;

    const { data: existingRecs } = await sb.from("agent_recommendations")
      .select("external_opportunity_id").eq("agent_id","grant-manager").eq("scorer_version", SCORER_VERSION);
    const done = new Set((existingRecs ?? []).map((r) => r.external_opportunity_id));

    const { data: opps, error: oppErr } = await sb.from("external_opportunities")
      .select("id,title,agency,naics_codes,set_aside,response_deadline,description")
      .order("posted_date", { ascending: false }).limit(500);
    if (oppErr) throw oppErr;

    const toScore = (opps ?? []).filter((o) => !done.has(o.id));
    let created = 0;

    for (const o of toScore) {
      const result = scoreOpportunity(o as ExtOpp, cfg);
      const { error: insErr } = await sb.from("agent_recommendations").insert({
        org_id: DEMO_ORG_ID,
        external_opportunity_id: o.id,
        agent_id: "grant-manager",
        recommendation: result.recommendation,
        score: result.score,
        rationale: result.rationale,
        scorer_version: SCORER_VERSION,
        status: "pending",
      });
      if (insErr) {
        if (!insErr.message?.includes("duplicate")) throw insErr;
      } else {
        created += 1;
      }
    }

    await sb.from("agent_sync_runs").update({
      status: "success", finished_at: new Date().toISOString(),
      recommendations_created: created,
      opportunities_fetched: toScore.length,
      meta: { scorer_version: SCORER_VERSION },
    }).eq("id", runId);

    return new Response(JSON.stringify({
      ok: true, run_id: runId, scored: created, considered: toScore.length,
    }), { headers: { ...cors(), "content-type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await sb.from("agent_sync_runs").update({
      status: "error", finished_at: new Date().toISOString(), error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...cors(), "content-type": "application/json" } });
  }
});
