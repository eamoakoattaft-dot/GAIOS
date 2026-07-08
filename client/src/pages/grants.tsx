import { useEffect, useMemo, useState, FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, StatusBadge, ProgressBar } from "@/components/ui-bits";
import {
  ROLES,
  LIFECYCLE_STAGES,
  SCREENING_CRITERIA,
} from "@/lib/data";
import { ChevronDown, ChevronRight, Search, Plus, ExternalLink, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// Types (rows as returned by Supabase)
// ============================================================

type Donor = {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
  website: string | null;
};

type Opportunity = {
  id: string;
  donor_id: string | null;
  title: string;
  foa_number: string | null;
  theme: string | null;
  deadline: string | null;
  submission_url: string | null;
  amount_min_usd: number | null;
  amount_max_usd: number | null;
  status: "open" | "screening" | "pursuing" | "declined" | "closed";
  stage: string;
  description: string | null;
  donor?: Donor | null;
};

type Proposal = {
  id: string;
  opportunity_id: string | null;
  donor_id: string | null;
  title: string;
  pi_name: string | null;
  amount_usd: number | null;
  stage: string;
  status:
    | "not_started"
    | "in_progress"
    | "under_review"
    | "submitted"
    | "awarded"
    | "declined"
    | "on_hold"
    | "withdrawn";
  theme: string | null;
  deadline: string | null;
  awarded_amount_usd: number | null;
  donor?: Donor | null;
};

// ============================================================
// Helpers
// ============================================================

const OPP_STATUS_TONES: Record<string, string> = {
  open: "bg-[hsl(var(--status-info)/0.12)] text-[hsl(var(--status-info))]",
  screening: "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]",
  pursuing: "bg-[hsl(var(--status-success)/0.12)] text-[hsl(var(--status-success))]",
  declined: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
  closed: "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]",
};

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  under_review: "Under Review",
  submitted: "Submitted",
  awarded: "Awarded",
  declined: "Declined",
  on_hold: "On Hold",
  withdrawn: "Withdrawn",
};

const PROPOSAL_STATUS_TONES: Record<string, string> = {
  not_started: "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]",
  in_progress: "bg-[hsl(var(--status-info)/0.12)] text-[hsl(var(--status-info))]",
  under_review: "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]",
  submitted: "bg-[hsl(var(--status-info)/0.12)] text-[hsl(var(--status-info))]",
  awarded: "bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]",
  declined: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
  on_hold: "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]",
  withdrawn: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
};

function OppStatusPill({ status }: { status: string }) {
  const tone = OPP_STATUS_TONES[status] ?? OPP_STATUS_TONES.closed;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight capitalize", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function ProposalStatusPill({ status }: { status: string }) {
  const label = PROPOSAL_STATUS_LABEL[status] ?? status;
  const tone = PROPOSAL_STATUS_TONES[status] ?? PROPOSAL_STATUS_TONES.not_started;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function formatUSD(n: number | null | undefined, opts?: { compact?: boolean }) {
  if (n == null) return "—";
  if (opts?.compact) return `$${(n / 1000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d).getTime();
  const now = Date.now();
  const days = Math.round((dt - now) / (1000 * 60 * 60 * 24));
  return days;
}

function DeadlineCell({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days == null) return <span className="text-muted-foreground">—</span>;
  const past = days < 0;
  const soon = !past && days <= 30;
  return (
    <div className="flex flex-col">
      <span className="tabular-nums text-foreground/80">{formatDate(deadline)}</span>
      <span className={cn(
        "text-[10.5px]",
        past ? "text-[hsl(var(--status-error))]" : soon ? "text-[hsl(var(--status-warning))]" : "text-muted-foreground"
      )}>
        {past ? `${Math.abs(days)}d ago` : `in ${days}d`}
      </span>
    </div>
  );
}

// ============================================================
// Modal shell
// ============================================================

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={cn("bg-card border border-border rounded-lg shadow-lg w-full max-h-[90vh] overflow-y-auto", wide ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// Static reference: Roles
// ============================================================

function UnitRoles() {
  const [expanded, setExpanded] = useState<string | null>(ROLES[0]?.id ?? null);
  return (
    <SectionCard title="Unit roles" subtitle="Grant administration organizational structure">
      <div className="space-y-1.5">
        {ROLES.map((role) => {
          const isOpen = expanded === role.id;
          return (
            <div key={role.id} className="rounded-md border border-border bg-background">
              <button
                onClick={() => setExpanded(isOpen ? null : role.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/40 rounded-md"
                data-testid={`role-toggle-${role.id}`}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span className="text-[12.5px] font-medium">{role.title}</span>
                  <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{role.short}</span>
                </div>
              </button>
              {isOpen && (
                <ul className="px-8 pb-2.5 pt-0.5 space-y-1 text-[12px] text-muted-foreground">
                  {role.duties.map((d, i) => (
                    <li key={i} className="list-disc">{d}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ============================================================
// Static reference: Lifecycle stages
// ============================================================

function LifecycleStages() {
  return (
    <SectionCard title="Lifecycle SOP" subtitle="Standard operating procedure across the grant lifecycle">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {LIFECYCLE_STAGES.map((stage, idx) => (
          <div key={stage.id} className="rounded-md border border-border bg-background p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-[12.5px] font-medium">{stage.title}</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">{stage.blurb}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ============================================================
// Screening matrix (now saveable against an opportunity)
// ============================================================

function ScreeningMatrix({ opportunities, onSaved }: { opportunities: Opportunity[]; onSaved: () => void }) {
  const { profile, activeOrgId } = useAuth();
  const { toast } = useToast();
  const [selectedOppId, setSelectedOppId] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(SCREENING_CRITERIA.map((c) => [c.id, 3])),
  );
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const max = SCREENING_CRITERIA.length * 5;
  const avg = total / SCREENING_CRITERIA.length;
  const pct = (total / max) * 100;

  const decision =
    avg >= 4.2
      ? { label: "Pursue", tone: "success" as const, key: "pursue" }
      : avg >= 3.5
        ? { label: "Pursue with partner", tone: "info" as const, key: "pursue_with_partner" }
        : avg >= 2.5
          ? { label: "Monitor", tone: "warning" as const, key: "monitor" }
          : { label: "Do not pursue", tone: "error" as const, key: "decline" };

  async function save() {
    if (!activeOrgId) {
      toast({ title: "No active org", description: "Cannot save without an active organization.", variant: "destructive" });
      return;
    }
    if (!selectedOppId) {
      toast({ title: "Pick an opportunity", description: "Select an opportunity to score.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("screenings").insert({
      org_id: activeOrgId,
      opportunity_id: selectedOppId,
      scores,
      total,
      average: avg,
      decision: decision.label,
      rationale: rationale || null,
      scored_by_user_id: profile?.id ?? null,
    });
    // Auto-advance opportunity: if pursue, mark pursuing/concept; if decline, mark declined.
    if (!error) {
      const patch =
        decision.key === "pursue" || decision.key === "pursue_with_partner"
          ? { status: "pursuing", stage: "concept" }
          : decision.key === "decline"
            ? { status: "declined" }
            : null;
      if (patch) {
        await supabase.from("opportunities").update(patch).eq("id", selectedOppId);
      }
    }
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Screening saved", description: `${decision.label} · avg ${avg.toFixed(1)}` });
      setRationale("");
      onSaved();
    }
  }

  const screenableOpps = opportunities.filter((o) => o.status === "open" || o.status === "screening");

  return (
    <SectionCard
      title="Screening matrix"
      subtitle="Score opportunities on 10 dimensions to guide pursue/decline decisions"
      actions={
        <select
          value={selectedOppId}
          onChange={(e) => setSelectedOppId(e.target.value)}
          className="h-8 rounded-md bg-secondary border border-border text-[12px] px-2 max-w-[280px]"
          data-testid="screening-opp-select"
        >
          <option value="">Pick opportunity to score…</option>
          {screenableOpps.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title.length > 50 ? o.title.slice(0, 50) + "…" : o.title}
            </option>
          ))}
        </select>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4">
        {SCREENING_CRITERIA.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <label className="text-[12px] flex-1 min-w-0 truncate">{c.label}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScores({ ...scores, [c.id]: n })}
                  className={cn(
                    "h-6 w-6 text-[11px] rounded-md border transition-colors tabular-nums",
                    scores[c.id] === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Score</span>
            <span className="tabular-nums font-medium">{total} / {max} · avg {avg.toFixed(1)}</span>
          </div>
          <ProgressBar value={pct} tone={decision.tone === "error" ? "error" : decision.tone === "warning" ? "warning" : decision.tone === "info" ? "info" : "success"} />
        </div>
        <StatusBadge status={decision.label} />
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Rationale (optional)…"
        className="w-full mt-3 text-[12.5px] p-2 rounded-md bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[60px]"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={save}
          disabled={saving || !selectedOppId}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50"
          data-testid="screening-save"
        >
          <Save size={13} />
          {saving ? "Saving…" : "Save screening"}
        </button>
      </div>
    </SectionCard>
  );
}

// ============================================================
// Opportunities table + add dialog
// ============================================================

function AddOpportunityDialog({ open, onClose, donors, onCreated }: { open: boolean; onClose: () => void; donors: Donor[]; onCreated: () => void; }) {
  const { activeOrgId, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    donor_id: "",
    foa_number: "",
    theme: "",
    deadline: "",
    submission_url: "",
    amount_min_usd: "",
    amount_max_usd: "",
    description: "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    setSaving(true);
    const payload: any = {
      org_id: activeOrgId,
      title: form.title,
      donor_id: form.donor_id || null,
      foa_number: form.foa_number || null,
      theme: form.theme || null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      submission_url: form.submission_url || null,
      amount_min_usd: form.amount_min_usd ? Number(form.amount_min_usd) : null,
      amount_max_usd: form.amount_max_usd ? Number(form.amount_max_usd) : null,
      description: form.description || null,
      status: "open",
      stage: "identification",
      created_by_user_id: profile?.id ?? null,
    };
    const { error } = await supabase.from("opportunities").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Opportunity added", description: form.title });
      setForm({ title: "", donor_id: "", foa_number: "", theme: "", deadline: "", submission_url: "", amount_min_usd: "", amount_max_usd: "", description: "" });
      onCreated();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add funding opportunity" wide>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title" required>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Funder">
            <select value={form.donor_id} onChange={(e) => setForm({ ...form, donor_id: e.target.value })} className={inputCls}>
              <option value="">Select donor…</option>
              {donors.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </Field>
          <Field label="FOA / Solicitation #">
            <input value={form.foa_number} onChange={(e) => setForm({ ...form, foa_number: e.target.value })} className={inputCls} placeholder="NSF 25-534" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Theme">
            <input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className={inputCls} placeholder="STEM education" />
          </Field>
          <Field label="Deadline">
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min amount (USD)">
            <input type="number" value={form.amount_min_usd} onChange={(e) => setForm({ ...form, amount_min_usd: e.target.value })} className={inputCls} placeholder="100000" />
          </Field>
          <Field label="Max amount (USD)">
            <input type="number" value={form.amount_max_usd} onChange={(e) => setForm({ ...form, amount_max_usd: e.target.value })} className={inputCls} placeholder="500000" />
          </Field>
        </div>
        <Field label="Submission URL">
          <input type="url" value={form.submission_url} onChange={(e) => setForm({ ...form, submission_url: e.target.value })} className={inputCls} placeholder="https://…" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(inputCls, "min-h-[60px] resize-y")} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-border text-[12px] hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving || !form.title} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Add opportunity"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls = "w-full h-8 px-2 rounded-md bg-secondary border border-border text-[12.5px] focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode; }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1 block">
        {label}{required && <span className="text-[hsl(var(--status-error))] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function OpportunitiesTable({ opportunities, donors, loading, onRefresh, onConvertToProposal }: {
  opportunities: Opportunity[];
  donors: Donor[];
  loading: boolean;
  onRefresh: () => void;
  onConvertToProposal: (opp: Opportunity) => void;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      const matchQ = !q ||
        o.title.toLowerCase().includes(q.toLowerCase()) ||
        (o.donor?.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (o.theme || "").toLowerCase().includes(q.toLowerCase()) ||
        (o.foa_number || "").toLowerCase().includes(q.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [opportunities, q, statusFilter]);

  return (
    <>
      <SectionCard
        testid="opportunities-table"
        title="Funding opportunities"
        subtitle="Prospect pipeline — screen, decide, and convert to proposals"
        actions={
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search opportunities…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 w-56 pl-7 pr-2 rounded-md bg-secondary border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md bg-secondary border border-border text-[12px] px-2"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="screening">Screening</option>
              <option value="pursuing">Pursuing</option>
              <option value="declined">Declined</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90"
              data-testid="opp-add"
            >
              <Plus size={13} />
              Add opportunity
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Funder</th>
                <th className="py-2 pr-3 font-medium">Theme</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                <th className="py-2 pr-3 font-medium">Deadline</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={7} className="py-8 text-center text-[12px] text-muted-foreground">Loading opportunities…</td></tr>
              )}
              {!loading && filtered.map((o) => {
                const amount = o.amount_min_usd && o.amount_max_usd
                  ? `${formatUSD(o.amount_min_usd, { compact: true })}–${formatUSD(o.amount_max_usd, { compact: true })}`
                  : o.amount_max_usd ? `up to ${formatUSD(o.amount_max_usd, { compact: true })}` : "—";
                return (
                  <tr key={o.id} data-testid={`opp-row-${o.id}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-start gap-1.5">
                        <div>
                          <div className="font-medium text-foreground">{o.title}</div>
                          {o.foa_number && <div className="text-[10.5px] text-muted-foreground tabular-nums">{o.foa_number}</div>}
                        </div>
                        {o.submission_url && (
                          <a href={o.submission_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-foreground/80">{o.donor?.name ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-foreground/80">{o.theme ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-foreground/80 whitespace-nowrap">{amount}</td>
                    <td className="py-2.5 pr-3"><DeadlineCell deadline={o.deadline} /></td>
                    <td className="py-2.5 pr-3"><OppStatusPill status={o.status} /></td>
                    <td className="py-2.5 pr-3 text-right">
                      {o.status === "pursuing" && (
                        <button
                          onClick={() => onConvertToProposal(o)}
                          className="text-[11px] text-primary hover:underline"
                          data-testid={`opp-convert-${o.id}`}
                        >
                          Start proposal
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-[12px] text-muted-foreground">
                  {opportunities.length === 0 ? "No opportunities yet. Click Add opportunity to start." : "No opportunities match your filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <AddOpportunityDialog open={showAdd} onClose={() => setShowAdd(false)} donors={donors} onCreated={onRefresh} />
    </>
  );
}

// ============================================================
// Proposal pipeline (live) + dialogs
// ============================================================

function StartProposalDialog({ open, onClose, opportunity, onCreated }: {
  open: boolean; onClose: () => void; opportunity: Opportunity | null; onCreated: () => void;
}) {
  const { activeOrgId, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [pi, setPi] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (opportunity) {
      setPi("");
      const avg = opportunity.amount_min_usd && opportunity.amount_max_usd
        ? (Number(opportunity.amount_min_usd) + Number(opportunity.amount_max_usd)) / 2
        : opportunity.amount_max_usd ?? "";
      setAmount(avg ? String(avg) : "");
    }
  }, [opportunity]);

  if (!opportunity) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !opportunity) return;
    setSaving(true);
    const { error } = await supabase.from("proposals").insert({
      org_id: activeOrgId,
      opportunity_id: opportunity.id,
      donor_id: opportunity.donor_id,
      title: opportunity.title,
      pi_name: pi || null,
      amount_usd: amount ? Number(amount) : null,
      stage: "concept",
      status: "in_progress",
      theme: opportunity.theme,
      deadline: opportunity.deadline,
      created_by_user_id: profile?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not start proposal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proposal started", description: opportunity.title });
      onCreated();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start proposal from opportunity">
      <form onSubmit={submit} className="space-y-3">
        <div className="text-[12px] text-muted-foreground border border-border rounded-md p-2.5 bg-background">
          <div className="font-medium text-foreground">{opportunity.title}</div>
          <div>{opportunity.donor?.name ?? "—"} · {opportunity.theme ?? "—"} · deadline {formatDate(opportunity.deadline)}</div>
        </div>
        <Field label="Principal Investigator (name)" required>
          <input value={pi} onChange={(e) => setPi(e.target.value)} className={inputCls} placeholder="Dr. Jane Smith" required />
        </Field>
        <Field label="Requested amount (USD)">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-border text-[12px] hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving || !pi} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Starting…" : "Start proposal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProposalDialog({ open, onClose, proposal, onSaved }: {
  open: boolean; onClose: () => void; proposal: Proposal | null; onSaved: () => void;
}) {
  const { activeOrgId, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (proposal) {
      setForm({
        title: proposal.title,
        pi_name: proposal.pi_name ?? "",
        amount_usd: proposal.amount_usd ?? "",
        stage: proposal.stage,
        status: proposal.status,
        theme: proposal.theme ?? "",
        deadline: proposal.deadline ? proposal.deadline.slice(0, 10) : "",
        awarded_amount_usd: proposal.awarded_amount_usd ?? "",
      });
    }
  }, [proposal]);

  if (!proposal) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !proposal) return;
    setSaving(true);
    const patch: any = {
      title: form.title,
      pi_name: form.pi_name || null,
      amount_usd: form.amount_usd ? Number(form.amount_usd) : null,
      stage: form.stage,
      status: form.status,
      theme: form.theme || null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      awarded_amount_usd: form.awarded_amount_usd ? Number(form.awarded_amount_usd) : null,
      submitted_at: form.status === "submitted" && !proposal.awarded_amount_usd ? new Date().toISOString() : undefined,
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    const { error } = await supabase.from("proposals").update(patch).eq("id", proposal.id);
    // Try to log an audit entry (RLS may block silently — that's fine).
    if (!error) {
      await supabase.from("audit_log").insert({
        org_id: activeOrgId,
        actor_user_id: profile?.id ?? null,
        target_kind: "proposal",
        target_id: proposal.id,
        action: "update",
        diff: { from: { status: proposal.status, stage: proposal.stage }, to: { status: form.status, stage: form.stage } },
      });
    }
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proposal updated", description: proposal.title });
      onSaved();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit proposal" wide>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title" required>
          <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Principal Investigator">
            <input value={form.pi_name || ""} onChange={(e) => setForm({ ...form, pi_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Theme">
            <input value={form.theme || ""} onChange={(e) => setForm({ ...form, theme: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Stage">
            <select value={form.stage || ""} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputCls}>
              {LIFECYCLE_STAGES.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              {Object.entries(PROPOSAL_STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </Field>
          <Field label="Deadline">
            <input type="date" value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Requested amount (USD)">
            <input type="number" value={form.amount_usd || ""} onChange={(e) => setForm({ ...form, amount_usd: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Awarded amount (USD)">
            <input type="number" value={form.awarded_amount_usd || ""} onChange={(e) => setForm({ ...form, awarded_amount_usd: e.target.value })} className={inputCls} placeholder="if awarded" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-border text-[12px] hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProposalPipeline({ proposals, loading, onEditProposal }: {
  proposals: Proposal[];
  loading: boolean;
  onEditProposal: (p: Proposal) => void;
}) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const matchQ = !q ||
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        (p.donor?.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (p.pi_name || "").toLowerCase().includes(q.toLowerCase()) ||
        (p.theme || "").toLowerCase().includes(q.toLowerCase());
      const matchStage = stage === "all" || p.stage === stage;
      return matchQ && matchStage;
    });
  }, [proposals, q, stage]);

  return (
    <SectionCard
      testid="proposal-pipeline"
      title="Proposal pipeline"
      subtitle="Active proposals — click a row to edit status, stage, and awarded amount"
      actions={
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="input-pipeline-search"
              type="search"
              placeholder="Search proposals…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-56 pl-7 pr-2 rounded-md bg-secondary border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            data-testid="select-pipeline-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-8 rounded-md bg-secondary border border-border text-[12px] px-2"
          >
            <option value="all">All stages</option>
            {LIFECYCLE_STAGES.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[12.5px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="py-2 pr-3 font-medium">Funder</th>
              <th className="py-2 pr-3 font-medium">PI</th>
              <th className="py-2 pr-3 font-medium text-right">Amount</th>
              <th className="py-2 pr-3 font-medium">Deadline</th>
              <th className="py-2 pr-3 font-medium">Stage</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={7} className="py-8 text-center text-[12px] text-muted-foreground">Loading proposals…</td></tr>
            )}
            {!loading && filtered.map((p) => {
              const stageTitle = LIFECYCLE_STAGES.find((s) => s.id === p.stage)?.title ?? p.stage;
              return (
                <tr
                  key={p.id}
                  data-testid={`pipeline-row-${p.id}`}
                  onClick={() => onEditProposal(p)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-foreground">{p.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">{p.theme ?? "—"}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-foreground/80">{p.donor?.name ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-foreground/80">{p.pi_name ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-foreground/80">
                    {p.status === "awarded" && p.awarded_amount_usd
                      ? formatUSD(p.awarded_amount_usd, { compact: true })
                      : formatUSD(p.amount_usd, { compact: true })}
                  </td>
                  <td className="py-2.5 pr-3"><DeadlineCell deadline={p.deadline} /></td>
                  <td className="py-2.5 pr-3 text-foreground/80">{stageTitle}</td>
                  <td className="py-2.5 pr-3"><ProposalStatusPill status={p.status} /></td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-[12px] text-muted-foreground">
                {proposals.length === 0 ? "No proposals yet. Convert a pursuing opportunity above to start one." : "No proposals match your filter."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ============================================================
// Page
// ============================================================

export default function Grants() {
  const { activeOrgId } = useAuth();
  const { toast } = useToast();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [loadingProps, setLoadingProps] = useState(true);
  const [convertOpp, setConvertOpp] = useState<Opportunity | null>(null);
  const [editProposal, setEditProposal] = useState<Proposal | null>(null);

  async function refresh() {
    if (!activeOrgId) return;
    setLoadingOpps(true);
    setLoadingProps(true);
    const [oppRes, propRes, donorRes] = await Promise.all([
      supabase
        .from("opportunities")
        .select("id, donor_id, title, foa_number, theme, deadline, submission_url, amount_min_usd, amount_max_usd, status, stage, description, donor:donors(id, name, type, country, website)")
        .eq("org_id", activeOrgId)
        .order("deadline", { ascending: true, nullsFirst: false }),
      supabase
        .from("proposals")
        .select("id, opportunity_id, donor_id, title, pi_name, amount_usd, stage, status, theme, deadline, awarded_amount_usd, donor:donors(id, name, type, country, website)")
        .eq("org_id", activeOrgId)
        .order("deadline", { ascending: true, nullsFirst: false }),
      supabase
        .from("donors")
        .select("id, name, type, country, website")
        .eq("org_id", activeOrgId)
        .order("name"),
    ]);
    if (oppRes.error) toast({ title: "Load error", description: oppRes.error.message, variant: "destructive" });
    if (propRes.error) toast({ title: "Load error", description: propRes.error.message, variant: "destructive" });
    setOpportunities((oppRes.data as any[]) ?? []);
    setProposals((propRes.data as any[]) ?? []);
    setDonors((donorRes.data as any[]) ?? []);
    setLoadingOpps(false);
    setLoadingProps(false);
  }

  useEffect(() => {
    if (activeOrgId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  return (
    <>
      <PageHeader
        title="Grant Administration"
        subtitle="Opportunities, screening, and the live proposal pipeline."
      />
      <div className="space-y-5">
        <UnitRoles />
        <LifecycleStages />
        <OpportunitiesTable
          opportunities={opportunities}
          donors={donors}
          loading={loadingOpps}
          onRefresh={refresh}
          onConvertToProposal={(o) => setConvertOpp(o)}
        />
        <ScreeningMatrix opportunities={opportunities} onSaved={refresh} />
        <ProposalPipeline
          proposals={proposals}
          loading={loadingProps}
          onEditProposal={(p) => setEditProposal(p)}
        />
      </div>
      <StartProposalDialog
        open={!!convertOpp}
        onClose={() => setConvertOpp(null)}
        opportunity={convertOpp}
        onCreated={refresh}
      />
      <EditProposalDialog
        open={!!editProposal}
        onClose={() => setEditProposal(null)}
        proposal={editProposal}
        onSaved={refresh}
      />
    </>
  );
}
