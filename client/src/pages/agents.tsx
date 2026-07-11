import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { KPI, ProgressBar, SectionCard, StatusBadge } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  AlertTriangle,
  BellRing,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  GraduationCap,
  Handshake,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

// ---------------------------------------------------------------------
// Static concept cards for the other five agents (unchanged)
// ---------------------------------------------------------------------
type AgentStatus = "Active" | "In Progress" | "Pending";
type Agent = {
  id: string;
  name: string;
  operatingRole: string;
  status: AgentStatus;
  readiness: number;
  owner: string;
  cadence: string;
  icon: typeof Bot;
  mission: string;
  responsibilities: string[];
  tools: string[];
  humanApprovals: string[];
};

const CONCEPT_AGENTS: Agent[] = [
  {
    id: "donor-registration",
    name: "AI Donor Registration Assistant",
    operatingRole: "SAM.gov, Grants.gov, eRA, EU PIC, donor portal readiness",
    status: "Pending",
    readiness: 0,
    owner: "Director, RSO",
    cadence: "Weekly registration control check",
    icon: ClipboardCheck,
    mission:
      "Maintains donor registration readiness by tracking portal status, renewal dates, missing entity records, and required institutional documents.",
    responsibilities: [
      "Maintains SAM.gov, Grants.gov, eRA Commons, EU PIC, USAID, Wellcome, EDCTP, DANIDA registrations",
      "Creates renewal reminders and quarterly access-review lists",
      "Escalates registration blockers to the responsible officer",
    ],
    tools: ["Donor tracker", "Portal-role register", "Renewal calendar"],
    humanApprovals: ["Entity registration submission", "Banking changes", "Authorized rep changes"],
  },
  {
    id: "compliance",
    name: "AI Compliance Monitor",
    operatingRole: "Internal controls, audit readiness, award obligations",
    status: "Pending",
    readiness: 0,
    owner: "Finance & Compliance Officer",
    cadence: "Twice-weekly exception review",
    icon: ShieldCheck,
    mission:
      "Reviews operational records for missing approvals, unresolved risk items, and audit-readiness gaps before they become donor findings.",
    responsibilities: [
      "Checks proposal files for COI, confidentiality, budget review, and final authorization",
      "Monitors award reporting deadlines, procurement evidence, and closeout files",
      "Produces exception reports for overdue compliance tasks",
    ],
    tools: ["Compliance deadlines", "Audit records", "Budget control sheets"],
    humanApprovals: ["Compliance certification", "Financial report submission", "Policy exceptions"],
  },
  {
    id: "training",
    name: "AI Training Coordinator",
    operatingRole: "Onboarding, module completion, access eligibility",
    status: "Pending",
    readiness: 0,
    owner: "Training & Onboarding Coordinator",
    cadence: "Daily learner-status sync",
    icon: GraduationCap,
    mission:
      "Guides staff, volunteers, researchers, and partners through required GAIOS training before full system access is granted.",
    responsibilities: [
      "Tracks modules 1–10, quiz scores, certificates, and pending access approvals",
      "Generates learner nudges and supervisor escalation lists",
      "Recommends access readiness only after all conditions are met",
    ],
    tools: ["Curriculum", "Learner roster", "Access approval queue"],
    humanApprovals: ["Final access approval", "Training waiver", "Role assignment"],
  },
  {
    id: "document-controller",
    name: "AI Document Controller",
    operatingRole: "Repository hygiene, naming conventions, version control",
    status: "Pending",
    readiness: 0,
    owner: "IT Systems Administrator",
    cadence: "Nightly repository scan",
    icon: FileText,
    mission:
      "Keeps GAIOS document folders orderly, searchable, and audit-ready through naming checks, missing-file detection, and version-control discipline.",
    responsibilities: [
      "Checks proposal and award folders against required file lists",
      "Flags duplicate, outdated, or incorrectly named documents",
      "Prepares closeout file completeness reports",
    ],
    tools: ["Document repository", "Templates", "Audit records"],
    humanApprovals: ["Document deletion", "Retention exceptions", "External sharing"],
  },
  {
    id: "proposal",
    name: "AI Proposal Development Assistant",
    operatingRole: "Concept notes, outlines, narratives, biosketch support",
    status: "Pending",
    readiness: 0,
    owner: "Principal Investigator / Project Lead",
    cadence: "On-demand during proposal cycles",
    icon: MessageSquareText,
    mission:
      "Accelerates proposal drafting by preparing structured first drafts, donor-specific outlines, biosketch summaries, and capacity statements.",
    responsibilities: [
      "Drafts concept notes, LOIs, proposal outlines, and non-final narrative sections",
      "Adapts content to donor instructions, page limits, and review criteria",
      "Builds biosketch and CV summaries from approved source material",
    ],
    tools: ["Concept note template", "Proposal checklist", "Biosketch template"],
    humanApprovals: ["Technical claims", "Final narrative", "Submission package"],
  },
];

const OPERATING_CONTROLS = [
  {
    title: "Human-in-the-loop approvals",
    icon: UserCheck,
    text: "Agents may recommend, draft, check, and route work, but final decisions remain with the Executive Director, RSO, Finance, PI, IT, or Training Coordinator.",
  },
  {
    title: "No unsupervised submissions",
    icon: LockKeyhole,
    text: "Agents cannot submit donor applications, change banking records, sign agreements, certify compliance, or send external commitments without human approval.",
  },
  {
    title: "Audit trail by default",
    icon: FileText,
    text: "Every agent recommendation preserves inputs, source documents, timestamps, and the human approver of record.",
  },
  {
    title: "Escalation over autonomy",
    icon: BellRing,
    text: "When confidence is low, donor rules conflict, or a deadline is at risk, the agent escalates to the responsible officer instead of acting alone.",
  },
];

// ---------------------------------------------------------------------
// Live types
// ---------------------------------------------------------------------
type ExtOpp = {
  id: string;
  source: "grants.gov" | "sam.gov";
  notice_id: string;
  title: string;
  agency: string | null;
  opportunity_number: string | null;
  response_deadline: string | null;
  url: string | null;
};

type Recommendation = {
  id: string;
  external_opportunity_id: string;
  recommendation: "Pursue" | "Partner" | "Monitor" | "Decline";
  score: number;
  rationale: {
    matched_keywords?: string[];
    matched_agencies?: string[];
    matched_naics?: string[];
    excluded_set_aside?: string | null;
    days_to_deadline?: number | null;
  };
  status: "pending" | "approved" | "declined" | "partner_review";
  generated_at: string;
  approved_by_name: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  linked_opportunity_id: string | null;
  external?: ExtOpp;
};

type SyncRun = {
  id: string;
  source: string;
  status: string;
  finished_at: string | null;
  opportunities_new: number | null;
  opportunities_fetched: number | null;
  recommendations_created: number | null;
  error: string | null;
};

const SUPABASE_URL = "https://mxixvyvigajojyrabpfe.supabase.co";
const SUPABASE_ANON = "sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_";

async function callFunction(name: string, body: Record<string, unknown> = {}) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "never";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function recTone(rec: Recommendation["recommendation"]) {
  if (rec === "Pursue") return "bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]";
  if (rec === "Partner") return "bg-[hsl(var(--status-info)/0.14)] text-[hsl(var(--status-info))]";
  if (rec === "Monitor") return "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]";
  return "bg-secondary text-secondary-foreground";
}

// ---------------------------------------------------------------------
// Approval modal
// ---------------------------------------------------------------------
type ApprovalModalState = {
  rec: Recommendation;
  action: "approve" | "decline" | "partner_review";
} | null;

function ApprovalModal({
  state,
  onClose,
  onSubmit,
}: {
  state: ApprovalModalState;
  onClose: () => void;
  onSubmit: (approverName: string, approverEmail: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      setName("");
      setEmail("");
      setErr(null);
    }
  }, [state]);

  if (!state) return null;

  const actionLabel =
    state.action === "approve" ? "Approve to pursue" : state.action === "decline" ? "Decline" : "Send to partner review";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="approval-modal">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-5 shadow-xl">
        <h3 className="text-[15px] font-semibold text-foreground">{actionLabel}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground leading-snug">
          {state.rec.external?.title}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Your name</label>
            <input
              data-testid="input-approver-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emmanuel Amoako-Atta"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Your email</label>
            <input
              data-testid="input-approver-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@cstemglobal.org"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {err && <div className="mt-3 rounded-md border border-[hsl(var(--status-error)/0.3)] bg-[hsl(var(--status-error)/0.08)] p-2 text-[12px] text-[hsl(var(--status-error))]">{err}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            data-testid="button-approval-cancel"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            data-testid="button-approval-submit"
            disabled={busy || !name.trim() || !email.trim()}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSubmit(name.trim(), email.trim());
              } catch (e) {
                setErr((e as Error).message ?? "failed");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Grant Manager live section
// ---------------------------------------------------------------------
function GrantManagerLive() {
  const { activeOrgId } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [modal, setModal] = useState<ApprovalModalState>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    const [recRes, runRes] = await Promise.all([
      supabase
        .from("agent_recommendations")
        .select(
          "id,external_opportunity_id,recommendation,score,rationale,status,generated_at,approved_by_name,approved_by_email,approved_at,linked_opportunity_id, external:external_opportunities(id,source,notice_id,title,agency,opportunity_number,response_deadline,url)"
        )
        .eq("org_id", activeOrgId)
        .eq("agent_id", "grant-manager")
        .order("score", { ascending: false })
        .order("generated_at", { ascending: false })
        .limit(100),
      supabase
        .from("agent_sync_runs")
        .select("id,source,status,finished_at,opportunities_new,opportunities_fetched,recommendations_created,error")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    if (!recRes.error && recRes.data) setRecs(recRes.data as unknown as Recommendation[]);
    if (!runRes.error && runRes.data) setRuns(runRes.data as SyncRun[]);
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (statusFilter === "pending") return recs.filter((r) => r.status === "pending");
    return recs;
  }, [recs, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    // Reset to first page whenever the filter changes or the visible set shrinks
    setPage(1);
  }, [statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageStart = (page - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const kpiPending = recs.filter((r) => r.status === "pending").length;
  const kpiApproved = recs.filter((r) => r.status === "approved").length;
  const kpiTotal = recs.length;
  const kpiAvg = kpiTotal ? Math.round(recs.reduce((s, r) => s + Number(r.score), 0) / kpiTotal) : 0;

  const lastGrantsRun = runs.find((r) => r.source === "grants.gov" && r.status === "success");
  const lastSamRun = runs.find((r) => r.source === "sam.gov");
  const lastScoreRun = runs.find((r) => r.source === "scorer" && r.status === "success");

  async function runSync() {
    setSyncing(true);
    setBanner(null);
    try {
      const [g, s] = await Promise.all([
        callFunction("sync-grants-gov", {}),
        callFunction("sync-sam-gov", {}),
      ]);
      const parts: string[] = [];
      if (g?.ok) parts.push(`Grants.gov: ${g.new ?? 0} new, ${g.updated ?? 0} updated`);
      else parts.push(`Grants.gov error`);
      if (s?.ok) parts.push(`SAM.gov: ${s.new ?? 0} new`);
      else if (s?.skipped) parts.push(`SAM.gov: skipped (no key)`);
      else parts.push(`SAM.gov error`);
      // Immediately trigger scoring so new items get recommendations
      const sc = await callFunction("score-opportunities", {});
      if (sc?.ok) parts.push(`Scored: ${sc.scored ?? 0}`);
      setBanner(parts.join(" · "));
    } catch (e) {
      setBanner(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      await loadData();
    }
  }

  async function runScore() {
    setScoring(true);
    setBanner(null);
    try {
      const sc = await callFunction("score-opportunities", {});
      if (sc?.ok) setBanner(`Scored ${sc.scored ?? 0} of ${sc.considered ?? 0} unscored`);
      else setBanner(`Scoring error: ${sc?.error ?? "unknown"}`);
    } finally {
      setScoring(false);
      await loadData();
    }
  }

  async function submitApproval(name: string, email: string) {
    if (!modal) return;
    const { error } = await supabase.rpc("approve_recommendation", {
      p_recommendation_id: modal.rec.id,
      p_approver_name: name,
      p_approver_email: email,
      p_action: modal.action,
    });
    if (error) throw new Error(error.message);
    setModal(null);
    setBanner(
      modal.action === "approve"
        ? "Approved — added to Grants pipeline as screening opportunity"
        : modal.action === "decline"
          ? "Declined"
          : "Sent to partner review"
    );
    await loadData();
  }

  return (
    <>
      <SectionCard
        title="AI Grant Manager — live"
        subtitle={`Real opportunities from Grants.gov${lastSamRun ? " + SAM.gov" : ""} · scored against CSTEM profile`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
              Grants.gov: {relativeTime(lastGrantsRun?.finished_at ?? null)}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-1",
                lastSamRun?.status === "success"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]"
              )}
              title={lastSamRun?.error ?? undefined}
            >
              SAM.gov: {lastSamRun?.status === "success" ? relativeTime(lastSamRun?.finished_at ?? null) : "not configured"}
            </span>
            <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
              Scored: {relativeTime(lastScoreRun?.finished_at ?? null)}
            </span>
            <button
              data-testid="button-score-now"
              onClick={runScore}
              disabled={scoring || syncing}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground hover:bg-accent disabled:opacity-50"
            >
              {scoring ? "Scoring…" : "Score now"}
            </button>
            <button
              data-testid="button-sync-now"
              onClick={runSync}
              disabled={syncing || scoring}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : undefined} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
        }
        testid="card-grant-manager-live"
      >
        {banner && (
          <div className="mb-4 rounded-md border border-primary/30 bg-primary/8 px-3 py-2 text-[12px] text-foreground" data-testid="grant-manager-banner">
            {banner}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KPI label="Opportunities scored" value={kpiTotal} delta={`${lastGrantsRun?.opportunities_new ?? 0} new run`} trend="up" testid="kpi-gm-total" />
          <KPI label="Pending review" value={kpiPending} delta="human gate" trend="flat" testid="kpi-gm-pending" />
          <KPI label="Approved to pursue" value={kpiApproved} delta="in pipeline" trend="up" testid="kpi-gm-approved" />
          <KPI label="Average score" value={`${kpiAvg}`} delta="0–100" trend="flat" hint="Rule-based scorer v1" testid="kpi-gm-avg" />
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 text-[11.5px]">
            <button
              data-testid="filter-pending"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "rounded-md border px-3 py-1.5",
                statusFilter === "pending" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Pending only ({kpiPending})
            </button>
            <button
              data-testid="filter-all"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-md border px-3 py-1.5",
                statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              All ({kpiTotal})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12px]">
            <thead className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Opportunity</th>
                <th className="py-2 px-3 font-medium">Agency</th>
                <th className="py-2 px-3 font-medium">Deadline</th>
                <th className="py-2 px-3 font-medium">Score</th>
                <th className="py-2 px-3 font-medium">Recommendation</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 pl-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading recommendations…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No {statusFilter === "pending" ? "pending" : ""} recommendations yet. Try "Sync now".
                  </td>
                </tr>
              )}
              {!loading &&
                paged.map((r) => {
                  const ext = r.external;
                  const days = r.rationale?.days_to_deadline;
                  return (
                    <tr key={r.id} data-testid={`row-rec-${r.id}`}>
                      <td className="py-2.5 pr-3 max-w-[360px]">
                        <div className="font-medium text-foreground line-clamp-2">
                          {ext?.url ? (
                            <a href={ext.url} target="_blank" rel="noreferrer" className="hover:underline">
                              {ext?.title ?? "—"}
                            </a>
                          ) : (
                            ext?.title ?? "—"
                          )}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                          {ext?.source} · {ext?.opportunity_number ?? ext?.notice_id}
                          {r.rationale?.matched_keywords?.length ? ` · kw: ${r.rationale.matched_keywords.slice(0, 3).join(", ")}` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{ext?.agency ?? "—"}</td>
                      <td className="py-2.5 px-3 tabular-nums text-muted-foreground">
                        {ext?.response_deadline ? new Date(ext.response_deadline).toISOString().slice(0, 10) : "—"}
                        {typeof days === "number" && (
                          <div className="text-[10.5px]">{days >= 0 ? `${days}d left` : `${Math.abs(days)}d past`}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="tabular-nums font-semibold">{Number(r.score).toFixed(0)}</div>
                        <ProgressBar value={Number(r.score)} tone={Number(r.score) >= 70 ? "primary" : "warning"} testid={`progress-${r.id}`} />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cn("rounded-full px-2 py-1 text-[11px] font-medium", recTone(r.recommendation))}>
                          {r.recommendation}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {r.status === "pending" && <span className="text-muted-foreground">Pending</span>}
                        {r.status === "approved" && (
                          <span className="text-[hsl(var(--status-success))]">
                            Approved by {r.approved_by_name ?? "?"}
                          </span>
                        )}
                        {r.status === "declined" && (
                          <span className="text-muted-foreground">Declined by {r.approved_by_name ?? "?"}</span>
                        )}
                        {r.status === "partner_review" && (
                          <span className="text-[hsl(var(--status-info))]">Partner review · {r.approved_by_name ?? "?"}</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3">
                        {r.status === "pending" ? (
                          <div className="flex gap-1">
                            <button
                              data-testid={`btn-approve-${r.id}`}
                              onClick={() => setModal({ rec: r, action: "approve" })}
                              className="rounded-md bg-[hsl(var(--status-success)/0.14)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success)/0.22)]"
                              title="Approve to pursue"
                            >
                              Approve
                            </button>
                            <button
                              data-testid={`btn-partner-${r.id}`}
                              onClick={() => setModal({ rec: r, action: "partner_review" })}
                              className="rounded-md bg-[hsl(var(--status-info)/0.14)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--status-info))] hover:bg-[hsl(var(--status-info)/0.22)]"
                              title="Send to partner review"
                            >
                              Partner
                            </button>
                            <button
                              data-testid={`btn-decline-${r.id}`}
                              onClick={() => setModal({ rec: r, action: "decline" })}
                              className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground hover:opacity-90"
                              title="Decline"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10.5px] text-muted-foreground">
                            {r.approved_at ? relativeTime(r.approved_at) : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px]" data-testid="pagination-controls">
            <div className="text-muted-foreground tabular-nums">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="page-prev"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                data-testid="page-next"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <ApprovalModal state={modal} onClose={() => setModal(null)} onSubmit={submitApproval} />
    </>
  );
}

// ---------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------
export default function Agents() {
  const [selectedAgentId, setSelectedAgentId] = useState("donor-registration");
  const selectedAgent = CONCEPT_AGENTS.find((a) => a.id === selectedAgentId) ?? CONCEPT_AGENTS[0];

  return (
    <>
      <PageHeader
        title="AI Agents"
        subtitle="Supervised AI assistants for GAIOS operations. Agents prepare, check, remind, and recommend; CSTEM staff approve, submit, sign, and certify."
      />

      <GrantManagerLive />

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-3 mt-6">
        <SectionCard
          title="Other agent roles (concept)"
          subtitle="Not yet activated — Grant Manager is the pilot"
          testid="card-agent-roster"
        >
          <div className="grid md:grid-cols-2 gap-3">
            {CONCEPT_AGENTS.map((agent) => {
              const Icon = agent.icon;
              const active = agent.id === selectedAgent.id;
              return (
                <button
                  key={agent.id}
                  data-testid={`agent-card-${agent.id}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-colors",
                    active ? "border-primary bg-primary/7" : "border-card-border bg-background/40 hover:border-primary/35"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{agent.name}</h3>
                        <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{agent.operatingRole}</p>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} testid={`agent-status-${agent.id}`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{agent.owner}</span>
                    <span className="tabular-nums">not activated</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedAgent.name}
          subtitle={`${selectedAgent.owner} · ${selectedAgent.cadence}`}
          testid="card-selected-agent"
        >
          <div className="space-y-4" data-testid={`agent-detail-${selectedAgent.id}`}>
            <p className="text-[13px] leading-relaxed text-foreground">{selectedAgent.mission}</p>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Core responsibilities</h4>
              <ul className="space-y-2">
                {selectedAgent.responsibilities.map((item) => (
                  <li key={item} className="flex gap-2 text-[12.5px] leading-snug">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[hsl(var(--status-success))]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-card-border bg-background/45 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Uses</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.tools.map((tool) => (
                    <span key={tool} className="rounded-full bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-card-border bg-background/45 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Requires human approval</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.humanApprovals.map((approval) => (
                    <span key={approval} className="rounded-full bg-[hsl(var(--status-warning)/0.14)] px-2 py-1 text-[11px] text-[hsl(var(--status-warning))]">
                      {approval}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Supervision controls" subtitle="Guardrails for safe grant, donor, compliance, and training automation" className="mt-6" testid="card-agent-controls">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OPERATING_CONTROLS.map((control) => {
            const Icon = control.icon;
            return (
              <div key={control.title} className="rounded-lg border border-card-border bg-background/45 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={14} />
                  </div>
                  <h3 className="text-[12.5px] font-semibold tracking-tight">{control.title}</h3>
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">{control.text}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Operating principle" className="mt-6" testid="card-agent-principle">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Handshake size={18} />
          </div>
          <p className="text-[13px] leading-relaxed text-foreground">
            GAIOS agents should act like a supervised Research Support Office team: AI prepares, checks, reminds, drafts, and recommends; humans approve, submit, sign, certify, and represent CSTEM Global to donors.
          </p>
        </div>
      </SectionCard>

      {/* Show alert icon somewhere to keep import in use */}
      <span className="hidden">
        <FileSearch size={0} />
        <AlertTriangle size={0} />
        <Bot size={0} />
      </span>
    </>
  );
}
