import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, StatusBadge, ProgressBar } from "@/components/ui-bits";
import {
  ROLES,
  LIFECYCLE_STAGES,
  SCREENING_CRITERIA,
  PROPOSALS,
} from "@/lib/data";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

function ScreeningMatrix() {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(SCREENING_CRITERIA.map((c) => [c.id, 3])),
  );
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const max = SCREENING_CRITERIA.length * 5;
  const avg = total / SCREENING_CRITERIA.length;
  const pct = (total / max) * 100;

  const decision =
    avg >= 4.2
      ? { label: "Pursue", tone: "success" as const }
      : avg >= 3.5
        ? { label: "Pursue with partner", tone: "info" as const }
        : avg >= 2.5
          ? { label: "Monitor", tone: "warning" as const }
          : { label: "Do not pursue", tone: "error" as const };

  const decisionClasses = {
    success: "bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]",
    info: "bg-[hsl(var(--status-info)/0.14)] text-[hsl(var(--status-info))]",
    warning: "bg-[hsl(var(--status-warning)/0.16)] text-[hsl(var(--status-warning))]",
    error: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
  }[decision.tone];

  return (
    <SectionCard
      testid="screening-matrix"
      title="Opportunity screening calculator"
      subtitle="Adjust each 1–5 score; recommendation updates instantly."
      actions={
        <button
          data-testid="button-reset-screening"
          className="text-[11.5px] text-muted-foreground hover:text-foreground"
          onClick={() => setScores(Object.fromEntries(SCREENING_CRITERIA.map((c) => [c.id, 3])))}
        >
          Reset
        </button>
      }
    >
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
        {SCREENING_CRITERIA.map((c) => (
          <div key={c.id} className="flex items-center gap-3" data-testid={`criterion-${c.id}`}>
            <label className="text-[12.5px] flex-1 text-foreground">{c.label}</label>
            <input
              type="range"
              min={1}
              max={5}
              value={scores[c.id]}
              onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
              className="w-28 accent-[hsl(var(--primary))]"
              data-testid={`slider-${c.id}`}
              aria-label={c.label}
            />
            <span
              className="w-5 text-[12px] tabular-nums font-semibold text-foreground text-right"
              data-testid={`score-${c.id}`}
            >
              {scores[c.id]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-border grid sm:grid-cols-3 gap-4 items-end">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold tabular-nums" data-testid="screening-total">
            {total} <span className="text-[12px] text-muted-foreground font-normal">/ {max}</span>
          </div>
          <ProgressBar value={pct} tone={decision.tone === "error" ? "error" : "primary"} />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Average</div>
          <div className="text-2xl font-semibold tabular-nums" data-testid="screening-average">
            {avg.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Recommendation
          </div>
          <span
            data-testid="screening-recommendation"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold",
              decisionClasses,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {decision.label}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

function LifecycleStages() {
  const [openId, setOpenId] = useState<string>("identification");
  return (
    <SectionCard
      testid="lifecycle-stages"
      title="Grant lifecycle SOP"
      subtitle="Nine sequential stages from opportunity to closeout"
    >
      <ol className="space-y-2" role="list">
        {LIFECYCLE_STAGES.map((s) => {
          const isOpen = openId === s.id;
          return (
            <li
              key={s.id}
              data-testid={`stage-${s.id}`}
              className="rounded-md border border-border bg-background overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? "" : s.id)}
                data-testid={`stage-toggle-${s.id}`}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover-elevate"
              >
                <span className="size-6 rounded bg-primary/10 text-primary text-[11.5px] font-semibold flex items-center justify-center tabular-nums">
                  {s.number}
                </span>
                <span className="flex-1 text-[13px] font-medium tracking-tight">{s.title}</span>
                <span className="hidden md:block text-[11.5px] text-muted-foreground truncate max-w-[42%]">
                  {s.purpose}
                </span>
                {isOpen ? (
                  <ChevronDown size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border bg-secondary/40" data-testid={`stage-detail-${s.id}`}>
                  <p className="text-[12px] text-muted-foreground mb-3">{s.purpose}</p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {(s.fields ?? s.bullets ?? []).map((item) => (
                      <div key={item} className="flex items-start gap-2 text-[12.5px]">
                        <span className="mt-1.5 size-1 rounded-full bg-primary shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

function ProposalPipeline() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");

  const filtered = useMemo(() => {
    return PROPOSALS.filter((p) => {
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.donor.toLowerCase().includes(q.toLowerCase()) ||
        p.pi.toLowerCase().includes(q.toLowerCase()) ||
        p.theme.toLowerCase().includes(q.toLowerCase());
      const matchStage = stage === "all" || p.stage === stage;
      return matchQ && matchStage;
    });
  }, [q, stage]);

  return (
    <SectionCard
      testid="proposal-pipeline"
      title="Proposal pipeline"
      subtitle="Search and filter the active proposal book"
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
            {LIFECYCLE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[12.5px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">ID</th>
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="py-2 pr-3 font-medium">Donor</th>
              <th className="py-2 pr-3 font-medium">PI</th>
              <th className="py-2 pr-3 font-medium text-right">Amount</th>
              <th className="py-2 pr-3 font-medium">Deadline</th>
              <th className="py-2 pr-3 font-medium">Stage</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => {
              const stageTitle = LIFECYCLE_STAGES.find((s) => s.id === p.stage)?.title ?? p.stage;
              return (
                <tr key={p.id} data-testid={`pipeline-row-${p.id}`}>
                  <td className="py-2.5 pr-3 tabular-nums text-foreground/80">{p.id}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-foreground">{p.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">{p.theme}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-foreground/80">{p.donor}</td>
                  <td className="py-2.5 pr-3 text-foreground/80">{p.pi}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-foreground/80">
                    ${(p.amountUSD / 1000).toFixed(0)}k
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-foreground/80">{p.deadline}</td>
                  <td className="py-2.5 pr-3 text-foreground/80">{stageTitle}</td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[12px] text-muted-foreground">
                  No proposals match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function UnitRoles() {
  return (
    <SectionCard
      testid="grant-roles"
      title="Grant Management Unit"
      subtitle="Roles and responsibilities within GAIOS"
    >
      <div className="grid md:grid-cols-2 gap-3">
        {ROLES.map((r) => (
          <div
            key={r.id}
            data-testid={`role-${r.id}`}
            className="rounded-md border border-border bg-background p-3.5"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <div className="text-[13px] font-semibold tracking-tight">{r.title}</div>
              <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{r.short}</div>
            </div>
            <ul className="space-y-1" role="list">
              {r.duties.map((d) => (
                <li key={d} className="flex items-start gap-2 text-[12.5px] text-foreground/85">
                  <span className="mt-1.5 size-1 rounded-full bg-primary shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function Grants() {
  return (
    <>
      <PageHeader
        title="Grant Administration"
        subtitle="Roles, lifecycle SOP, screening matrix, and proposal pipeline."
      />

      <div className="space-y-5">
        <UnitRoles />
        <LifecycleStages />
        <ScreeningMatrix />
        <ProposalPipeline />
      </div>
    </>
  );
}
