import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, ProgressBar, StatusBadge } from "@/components/ui-bits";
import { LAUNCH_PHASES, KPIS } from "@/lib/data";
import { CheckCircle2, Circle } from "lucide-react";

type TaskState = Record<string, Record<number, boolean>>;

// Seed: first two phases done; phase 3 partial.
const SEED: TaskState = {
  "Days 1–15": Object.fromEntries(LAUNCH_PHASES[0].tasks.map((_, i) => [i, true])),
  "Days 16–30": Object.fromEntries(LAUNCH_PHASES[1].tasks.map((_, i) => [i, true])),
  "Days 31–45": Object.fromEntries(LAUNCH_PHASES[2].tasks.map((_, i) => [i, i < 2])),
  "Days 46–60": {},
  "Days 61–75": {},
  "Days 76–90": {},
};

export default function Launch() {
  const [state, setState] = useState<TaskState>(SEED);

  const totals = useMemo(() => {
    let done = 0,
      total = 0;
    for (const phase of LAUNCH_PHASES) {
      total += phase.tasks.length;
      done += Object.values(state[phase.range] ?? {}).filter(Boolean).length;
    }
    return { done, total, pct: total ? (done / total) * 100 : 0 };
  }, [state]);

  const toggle = (range: string, i: number) =>
    setState((s) => ({ ...s, [range]: { ...s[range], [i]: !s[range]?.[i] } }));

  return (
    <>
      <PageHeader
        title="90-Day Launch Plan"
        subtitle="Six phases. Tick tasks to track GAIOS implementation progress."
        actions={
          <div className="text-[12px] text-muted-foreground" data-testid="launch-summary">
            <span className="tabular-nums text-foreground font-semibold">{totals.done}</span> of{" "}
            <span className="tabular-nums">{totals.total}</span> tasks complete
          </div>
        }
      />

      <SectionCard testid="launch-overall-progress" title="Overall progress" subtitle={`Day ${Math.round((totals.pct / 100) * 90)} of 90`}>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-semibold tabular-nums" data-testid="launch-pct">
            {totals.pct.toFixed(0)}%
          </span>
          <div className="flex-1">
            <ProgressBar value={totals.pct} tone="primary" />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
              <span>Foundation</span>
              <span>Registration</span>
              <span>Policy</span>
              <span>Training</span>
              <span>Testing</span>
              <span>Launch</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-3 mt-5">
        {LAUNCH_PHASES.map((phase, idx) => {
          const phaseDone = Object.values(state[phase.range] ?? {}).filter(Boolean).length;
          const phaseTotal = phase.tasks.length;
          const phasePct = (phaseDone / phaseTotal) * 100;
          const status =
            phasePct === 100 ? "Complete" : phasePct > 0 ? "In Progress" : "Not Started";

          return (
            <SectionCard
              key={phase.range}
              testid={`phase-card-${phase.range.replace(/\s/g, "")}`}
              title={`Phase ${idx + 1}: ${phase.title}`}
              subtitle={phase.range}
              actions={<StatusBadge status={status as any} />}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[11.5px] tabular-nums text-muted-foreground">
                  {phaseDone}/{phaseTotal}
                </span>
                <ProgressBar value={phasePct} tone={phasePct === 100 ? "success" : "primary"} />
              </div>
              <ul className="space-y-1.5" role="list">
                {phase.tasks.map((task, i) => {
                  const done = !!state[phase.range]?.[i];
                  return (
                    <li key={i}>
                      <button
                        data-testid={`task-${phase.range.replace(/\s/g, "")}-${i}`}
                        aria-pressed={done}
                        onClick={() => toggle(phase.range, i)}
                        className="w-full flex items-start gap-2.5 text-left rounded-md px-2 py-1.5 hover:bg-accent/40 transition-colors"
                      >
                        {done ? (
                          <CheckCircle2 size={14} className="text-[hsl(var(--status-success))] mt-0.5 shrink-0" />
                        ) : (
                          <Circle size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <span className={done ? "text-[12.5px] line-through text-muted-foreground" : "text-[12.5px] text-foreground"}>
                          {task}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
