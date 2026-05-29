import { PageHeader } from "@/components/layout";
import { KPI, ProgressBar, SectionCard, StatusBadge } from "@/components/ui-bits";
import {
  KPIS,
  LAUNCH_PHASES,
  PROPOSALS,
  UPCOMING_DEADLINES,
  DONOR_REGISTRATIONS,
} from "@/lib/data";
import { Link } from "wouter";
import {
  CalendarClock,
  CircleDot,
  FileSpreadsheet,
  GraduationCap,
  Bot,
  ServerCog,
  ChevronRight,
} from "lucide-react";

const pillarHealth = [
  {
    icon: FileSpreadsheet,
    name: "Grant Administration",
    score: 64,
    tone: "warning" as const,
    note: "7 active opportunities • 4 proposals in development",
    href: "/grants",
  },
  {
    icon: ServerCog,
    name: "IT & Digital Infrastructure",
    score: 78,
    tone: "info" as const,
    note: "5 layers configured • access review due Nov 8",
    href: "/it",
  },
  {
    icon: GraduationCap,
    name: "Training & Onboarding",
    score: 52,
    tone: "primary" as const,
    note: "5 of 10 staff certified • 10 modules drafted",
    href: "/training",
  },
  {
    icon: Bot,
    name: "AI Agents",
    score: 76,
    tone: "primary" as const,
    note: "6 supervised agents • Grant Manager pilot ready",
    href: "/agents",
  },
];

export default function Overview() {
  const submittedThisQuarter = PROPOSALS.filter((p) =>
    ["submission", "review", "award", "postaward"].includes(p.stage),
  ).length;

  return (
    <>
      <PageHeader
        title="Executive Overview"
        subtitle="Single pane on grant administration, IT infrastructure, and training readiness across CSTEM Global."
        actions={
          <div className="flex gap-2 text-[12px]" data-testid="overview-quick-filters">
            <button
              data-testid="filter-quarter"
              className="px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-accent"
            >
              This quarter
            </button>
            <button
              data-testid="filter-ytd"
              className="px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-accent"
            >
              Year to date
            </button>
            <button
              data-testid="filter-export"
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              Export brief
            </button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="kpi-grid">
        <KPI
          testid="kpi-donor-registrations"
          label="Donor registrations"
          value={`0 / ${KPIS.donorRegistrations.total}`}
          delta={`${KPIS.donorRegistrations.pending} pending`}
          trend="flat"
          hint="SAM, Grants.gov, eRA, EU PIC, USAID, +"
        />
        <KPI
          testid="kpi-opportunities"
          label="Grant opportunities"
          value={KPIS.opportunities}
          delta="+5 wk"
          trend="up"
          hint="Tracked in opportunity register"
        />
        <KPI
          testid="kpi-active-proposals"
          label="Active proposals"
          value={KPIS.activeProposals}
          delta="2 due ≤ 30d"
          trend="up"
        />
        <KPI
          testid="kpi-training-completion"
          label="Training completion"
          value={`${KPIS.trainingCompletion}%`}
          delta="+12%"
          trend="up"
          hint="Modules 1–10 across staff"
        />
        <KPI
          testid="kpi-compliance-tasks"
          label="Compliance tasks"
          value={`${KPIS.complianceTasks.open} open`}
          delta={`${KPIS.complianceTasks.due} due 30d`}
          trend="down"
        />
        <KPI
          testid="kpi-audit-readiness"
          label="Audit readiness"
          value={`${KPIS.auditReadiness}%`}
          delta="+6%"
          trend="up"
          hint="Internal audit checklist"
        />
        <KPI
          testid="kpi-launch-progress"
          label="90-day launch"
          value={`${KPIS.launchProgress}%`}
          delta="Day 34 / 90"
          trend="up"
        />
        <KPI
          testid="kpi-submitted"
          label="Submitted YTD"
          value={submittedThisQuarter}
          delta="3 awarded"
          trend="up"
        />
      </div>

      {/* Pillar health */}
      <div className="grid lg:grid-cols-4 gap-3 mt-6">
        {pillarHealth.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.name}
              href={p.href}
              data-testid={`pillar-card-${p.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="rounded-lg border border-card-border bg-card p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  <h3 className="text-[13px] font-semibold tracking-tight">{p.name}</h3>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">{p.score}</span>
                <span className="text-[11px] text-muted-foreground">/ 100 readiness</span>
              </div>
              <ProgressBar value={p.score} tone={p.tone} testid={`pillar-progress-${p.name.split(" ")[0].toLowerCase()}`} />
              <p className="text-[11.5px] text-muted-foreground leading-snug">{p.note}</p>
            </Link>
          );
        })}
      </div>

      {/* Deadlines + 90-day */}
      <div className="grid lg:grid-cols-5 gap-3 mt-6">
        <SectionCard
          testid="card-deadlines"
          className="lg:col-span-3"
          title="Upcoming deadlines"
          subtitle="Compliance calendar — next 90 days"
          actions={
            <button
              data-testid="button-view-all-deadlines"
              className="text-[11.5px] text-primary hover:underline"
            >
              View all
            </button>
          }
        >
          <ul className="divide-y divide-border" role="list">
            {UPCOMING_DEADLINES.map((d) => (
              <li
                key={d.item}
                className="flex items-center gap-3 py-2.5"
                data-testid={`deadline-${d.item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`}
              >
                <div className="size-8 rounded-md bg-secondary text-foreground/70 flex items-center justify-center shrink-0">
                  <CalendarClock size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground truncate">{d.item}</div>
                  <div className="text-[11px] text-muted-foreground">{d.type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] tabular-nums font-medium text-foreground">{d.date}</div>
                  <div
                    className={
                      "text-[10.5px] uppercase tracking-wider " +
                      (d.urgency === "high"
                        ? "text-[hsl(var(--status-error))]"
                        : "text-[hsl(var(--status-warning))]")
                    }
                  >
                    {d.urgency === "high" ? "High" : "Medium"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          testid="card-launch-progress"
          className="lg:col-span-2"
          title="90-day implementation"
          subtitle={`Day 34 of 90 • ${KPIS.launchProgress}% complete`}
          actions={
            <Link
              href="/launch"
              data-testid="link-launch-detail"
              className="text-[11.5px] text-primary hover:underline"
            >
              Plan
            </Link>
          }
        >
          <ol className="space-y-3" role="list">
            {LAUNCH_PHASES.map((phase, i) => {
              const status =
                i === 0 ? "Complete" : i === 1 ? "Complete" : i === 2 ? "In Progress" : "Not Started";
              return (
                <li key={phase.range} className="flex items-start gap-3" data-testid={`launch-phase-${phase.range.replace(/\s/g, "")}`}>
                  <div className="mt-1.5">
                    <CircleDot
                      size={12}
                      className={
                        status === "Complete"
                          ? "text-[hsl(var(--status-success))]"
                          : status === "In Progress"
                            ? "text-[hsl(var(--status-warning))]"
                            : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12.5px] font-medium tracking-tight">{phase.title}</div>
                      <StatusBadge status={status as any} />
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">{phase.range}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </div>

      {/* Recent proposals + donor reg snapshot */}
      <div className="grid lg:grid-cols-5 gap-3 mt-6">
        <SectionCard
          testid="card-recent-proposals"
          className="lg:col-span-3"
          title="Active proposal pipeline"
          subtitle="Click to drill in"
          actions={
            <Link href="/grants" className="text-[11.5px] text-primary hover:underline" data-testid="link-pipeline-detail">
              Pipeline
            </Link>
          }
        >
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Proposal</th>
                  <th className="py-2 pr-3 font-medium">Donor</th>
                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROPOSALS.slice(0, 6).map((p) => (
                  <tr key={p.id} data-testid={`row-proposal-${p.id}`}>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-foreground truncate max-w-[260px]">{p.title}</div>
                      <div className="text-[10.5px] text-muted-foreground">{p.id} • {p.theme}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-foreground/80">{p.donor}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-foreground/80">
                      ${(p.amountUSD / 1000).toFixed(0)}k
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={p.status} testid={`status-proposal-${p.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          testid="card-donor-snapshot"
          className="lg:col-span-2"
          title="Donor registration snapshot"
          subtitle="Master tracker — top 5"
          actions={
            <Link href="/donors" className="text-[11.5px] text-primary hover:underline" data-testid="link-donors-detail">
              Open tracker
            </Link>
          }
        >
          <ul className="divide-y divide-border" role="list">
            {DONOR_REGISTRATIONS.slice(0, 5).map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between gap-3" data-testid={`donor-snapshot-${d.id}`}>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{d.system}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{d.officer}</div>
                </div>
                <StatusBadge status={d.status as any} />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
