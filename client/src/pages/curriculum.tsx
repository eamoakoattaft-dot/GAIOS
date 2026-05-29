import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/ui-bits";
import { COMPLETION_EVIDENCE, MODULES, VIDEO_PLAN, Module } from "@/lib/data";
import { BookOpen, Clapperboard, X, ChevronRight, CheckCircle2 } from "lucide-react";

function ModuleCard({ m, onOpen }: { m: Module; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      data-testid={`module-card-${m.n}`}
      className="text-left rounded-lg border border-card-border bg-card p-4 hover:border-primary/50 transition-colors flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-md bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center tabular-nums">
            {m.n}
          </span>
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Module</span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground" />
      </div>
      <h3 className="text-[13.5px] font-semibold tracking-tight leading-snug">{m.title}</h3>
      <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2">{m.objectives[0]}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {m.topics.slice(0, 3).map((t) => (
          <span key={t} className="text-[10.5px] rounded bg-secondary text-foreground/70 px-1.5 py-0.5">
            {t}
          </span>
        ))}
        {m.topics.length > 3 && (
          <span className="text-[10.5px] text-muted-foreground">+{m.topics.length - 3}</span>
        )}
      </div>
    </button>
  );
}

function ModuleModal({ m, onClose }: { m: Module; onClose: () => void }) {
  return (
    <div
      data-testid="module-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card border border-card-border rounded-lg max-w-2xl w-full max-h-[88dvh] overflow-y-auto scroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-card-border sticky top-0 bg-card">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center justify-center tabular-nums">
              {m.n}
            </span>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Module {m.n}</div>
              <h2 className="text-[14px] font-semibold tracking-tight">{m.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-module"
            aria-label="Close module"
            className="p-1.5 rounded-md hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-[12.5px]">
          <section>
            <h3 className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">Learning objectives</h3>
            <ul className="space-y-1" role="list">
              {m.objectives.map((o) => (
                <li key={o} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-primary mt-0.5 shrink-0" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">Topics covered</h3>
            <div className="flex flex-wrap gap-1.5">
              {m.topics.map((t) => (
                <span key={t} className="rounded-md bg-secondary px-2 py-1 text-[11.5px]">
                  {t}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">Assignment</h3>
            <p className="rounded-md border border-primary/15 bg-primary/5 p-3 text-foreground/85 leading-snug">
              {m.assignment}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Curriculum() {
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  return (
    <>
      <PageHeader
        title="10-Module Curriculum"
        subtitle="Foundational training every CSTEM Global member completes before full system access."
        actions={
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <BookOpen size={14} />
            <span>10 modules • 10 assignments • final quiz ≥ 80%</span>
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="modules-grid">
        {MODULES.map((m) => (
          <ModuleCard key={m.n} m={m} onOpen={() => setActiveModule(m)} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-3 mt-6">
        <SectionCard
          testid="video-plan"
          title="Per-module video production plan"
          subtitle="Repeatable structure for every animated module"
          actions={
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clapperboard size={13} /> ~7–10 min total
            </span>
          }
        >
          <ul className="space-y-1.5" role="list">
            {VIDEO_PLAN.map((v) => (
              <li
                key={v.segment}
                data-testid={`video-segment-${v.segment.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
              >
                <span className="text-[12.5px] font-medium">{v.segment}</span>
                <span className="text-[11.5px] tabular-nums text-muted-foreground">{v.duration}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-border text-[11.5px] text-muted-foreground leading-snug">
            <strong className="text-foreground font-semibold">Tools:</strong> Vyond, Powtoon, Canva Video, Articulate
            360. Delivery on TalentLMS or Moodle.
          </div>
        </SectionCard>

        <SectionCard
          testid="completion-evidence"
          title="Module completion evidence"
          subtitle="Captured per learner, per module"
        >
          <ul className="space-y-1.5" role="list">
            {COMPLETION_EVIDENCE.map((e) => (
              <li
                key={e}
                data-testid={`completion-evidence-${e.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-[12.5px]"
              >
                <CheckCircle2 size={13} className="text-primary shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {activeModule && <ModuleModal m={activeModule} onClose={() => setActiveModule(null)} />}
    </>
  );
}
