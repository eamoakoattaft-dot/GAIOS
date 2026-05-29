import { Fragment, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { KPI, ProgressBar, SectionCard, StatusBadge } from "@/components/ui-bits";
import { DONOR_REGISTRATIONS } from "@/lib/data";
import { ChevronDown, ChevronRight, ExternalLink, Search, Info, LockKeyhole, Route, CalendarClock, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Donors() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string>("");
  const [mode, setMode] = useState<"roadmap" | "table">("roadmap");

  const filtered = useMemo(
    () =>
      DONOR_REGISTRATIONS.filter(
        (d) =>
          !q ||
          d.system.toLowerCase().includes(q.toLowerCase()) ||
          d.purpose.toLowerCase().includes(q.toLowerCase()) ||
          d.officer.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  const notStarted = DONOR_REGISTRATIONS.filter((d) => d.status === "Not Started").length;
  const blocked = DONOR_REGISTRATIONS.filter((d) => d.status === "Blocked").length;
  const complete = DONOR_REGISTRATIONS.filter((d) => d.status === "Active" || d.status === "Complete").length;
  const readiness = Math.round((complete / DONOR_REGISTRATIONS.length) * 100);

  return (
    <>
      <PageHeader
        title="Donor Registration & Renewal Roadmap"
        subtitle="Sequenced registration path for CSTEM Global donor systems, dependencies, renewals, blocked steps, and SOP guides."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-donor-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search systems, officers…"
                className="h-8 w-72 pl-7 pr-2 rounded-md bg-secondary border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex rounded-md border border-border bg-secondary p-0.5">
              <button
                data-testid="button-roadmap-mode"
                onClick={() => setMode("roadmap")}
                className={cn("h-7 px-2.5 rounded text-[11.5px]", mode === "roadmap" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                Roadmap
              </button>
              <button
                data-testid="button-table-mode"
                onClick={() => setMode("table")}
                className={cn("h-7 px-2.5 rounded text-[11.5px]", mode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                Table
              </button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Roadmap steps" value={DONOR_REGISTRATIONS.length} delta="10 sequenced" trend="flat" hint="Institutional file through DANIDA" testid="kpi-donor-roadmap-steps" />
        <KPI label="Not started" value={notStarted} delta="start now" trend="flat" hint="Includes SAM, USAID, EU PIC" testid="kpi-donor-not-started" />
        <KPI label="Blocked" value={blocked} delta="dependency gates" trend="down" hint="Usually waiting on SAM/UEI or PIC" testid="kpi-donor-blocked" />
        <KPI label="Registration readiness" value={`${readiness}%`} delta="foundation phase" trend="flat" hint="Moves as statuses become active" testid="kpi-donor-readiness" />
      </div>

      <div className="grid lg:grid-cols-[1fr_0.72fr] gap-3 mt-5">
        <SectionCard title="Critical path" subtitle="Start with the institutional file, then unlock U.S. federal and international systems" testid="donor-critical-path">
          <div className="space-y-3">
            {["Institutional registration file", "SAM.gov", "Grants.gov", "eRA Commons", "CAGE / NCAGE"].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold">{label}</span>
                    {index > 1 && <span className="text-[10.5px] text-[hsl(var(--status-error))]">blocked until prior step</span>}
                  </div>
                  <ProgressBar value={(index + 1) * 20} tone={index > 1 ? "warning" : "primary"} testid={`critical-path-${index}`} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Roadmap logic" subtitle="How GAIOS should manage renewals" testid="donor-roadmap-logic">
          <div className="space-y-3">
            {[
              { icon: ClipboardCheck, title: "Checklist first", text: "Create one institutional registration file that feeds every portal and due-diligence request." },
              { icon: LockKeyhole, title: "Blocked means dependency", text: "Grants.gov, eRA Commons, and CAGE remain blocked until SAM.gov and UEI are active." },
              { icon: CalendarClock, title: "Renewal calendar", text: "Annual registrations need reminders 90, 60, and 30 days before expiration." },
              { icon: Route, title: "International branch", text: "EU PIC unlocks EDCTP3; Danish partnerships unlock DANIDA readiness." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-2.5">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </div>
                  <div>
                    <h3 className="text-[12.5px] font-semibold">{item.title}</h3>
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        testid="donor-tracker"
        title={mode === "roadmap" ? "Registration roadmap" : "Master donor tracker"}
        subtitle={`${filtered.length} systems • ${blocked} blocked • ${notStarted} not started`}
      >
        {mode === "roadmap" ? (
          <div className="space-y-3">
            {filtered.map((d) => {
              const isOpen = openId === d.id;
              return (
                <div key={d.id} data-testid={`donor-roadmap-step-${d.id}`} className="rounded-lg border border-card-border bg-background/45 overflow-hidden">
                  <button
                    onClick={() => setOpenId(isOpen ? "" : d.id)}
                    className="w-full text-left p-3.5 hover:bg-accent/35"
                    data-testid={`donor-roadmap-toggle-${d.id}`}
                  >
                    <div className="grid md:grid-cols-[44px_1fr_auto] gap-3 md:items-center">
                      <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[13px] font-semibold tabular-nums">
                        {d.step}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13.5px] font-semibold tracking-tight">{d.system}</h3>
                          <StatusBadge status={d.status as any} testid={`donor-roadmap-status-${d.id}`} />
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{d.action}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-1">{d.required}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                        <span>{d.renewal}</span>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-card-border bg-card/60 p-4" data-testid={`donor-roadmap-detail-${d.id}`}>
                      <div className="grid lg:grid-cols-[1fr_0.75fr] gap-4">
                        <div>
                          {d.roadmapNote && (
                            <div className="flex items-start gap-2 mb-3 text-[12px] text-foreground/85 bg-primary/5 border border-primary/15 rounded-md p-2.5">
                              <Info size={13} className="text-primary mt-0.5 shrink-0" />
                              <span>{d.roadmapNote}</span>
                            </div>
                          )}
                          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Guide steps</div>
                          <ol className="space-y-1.5 list-decimal list-inside marker:text-primary marker:font-semibold">
                            {(d.sop ?? []).map((step, i) => (
                              <li key={i} className="text-[12.5px] text-foreground/85">{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="rounded-lg border border-card-border bg-background/45 p-3">
                          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">Controls</div>
                          <div className="space-y-2 text-[12px]">
                            <div><span className="text-muted-foreground">Responsible:</span> {d.officer}</div>
                            <div><span className="text-muted-foreground">Renewal:</span> {d.renewal}</div>
                            <div>
                              <span className="text-muted-foreground">Dependencies:</span>{" "}
                              {d.dependencies && d.dependencies.length > 0 ? d.dependencies.join(" · ") : "None"}
                            </div>
                          </div>
                          {d.externalUrl && (
                            <a
                              href={d.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`donor-roadmap-link-${d.id}`}
                              className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-primary hover:underline"
                            >
                              <ExternalLink size={12} />
                              Open guide resource
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium w-6"></th>
                <th className="py-2 pr-3 font-medium">Step</th>
                <th className="py-2 pr-3 font-medium">Donor / System</th>
                <th className="py-2 pr-3 font-medium">Purpose</th>
                <th className="py-2 pr-3 font-medium">Required before</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Responsible</th>
                <th className="py-2 pr-3 font-medium">Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => {
                const isOpen = openId === d.id;
                return (
                  <Fragment key={d.id}>
                    <tr
                      data-testid={`donor-row-${d.id}`}
                      className="hover:bg-accent/40 cursor-pointer"
                      onClick={() => setOpenId(isOpen ? "" : d.id)}
                    >
                      <td className="py-2.5 pr-1">
                        <button
                          data-testid={`donor-toggle-${d.id}`}
                          aria-expanded={isOpen}
                          aria-label={`Toggle ${d.system} details`}
                          className="p-0.5"
                        >
                          {isOpen ? (
                            <ChevronDown size={13} className="text-muted-foreground" />
                          ) : (
                            <ChevronRight size={13} className="text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums font-semibold">{d.step}</td>
                      <td className="py-2.5 pr-3 font-semibold text-foreground">{d.system}</td>
                      <td className="py-2.5 pr-3 text-foreground/85">{d.purpose}</td>
                      <td className="py-2.5 pr-3 text-foreground/80">{d.required}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={d.status as any} testid={`donor-status-${d.id}`} />
                      </td>
                      <td className="py-2.5 pr-3 text-foreground/80">{d.officer}</td>
                      <td className="py-2.5 pr-3 text-foreground/80">{d.renewal}</td>
                    </tr>
                    {isOpen && (
                      <tr data-testid={`donor-detail-${d.id}`} className="bg-secondary/50">
                        <td></td>
                        <td colSpan={7} className="py-4 pr-4">
                          {d.notes && (
                            <div className="flex items-start gap-2 mb-3 text-[12px] text-foreground/85 bg-primary/5 border border-primary/15 rounded-md p-2.5">
                              <Info size={13} className="text-primary mt-0.5 shrink-0" />
                              <span>{d.notes}</span>
                            </div>
                          )}
                          {d.sop && d.sop.length > 0 && (
                            <div>
                              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
                                SOP steps
                              </div>
                              <ol className="space-y-1.5 list-decimal list-inside marker:text-primary marker:font-semibold">
                                {d.sop.map((step, i) => (
                                  <li key={i} className="text-[12.5px] text-foreground/85">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {d.externalUrl && (
                            <a
                              href={d.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`donor-link-${d.id}`}
                              className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-primary hover:underline"
                            >
                              <ExternalLink size={12} />
                              Open external resource
                            </a>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </SectionCard>

      {/* Operational notes */}
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        <SectionCard testid="donor-note-sam" title="SAM.gov is the gateway" subtitle="Anchor of U.S. federal registrations">
          <p className="text-[12.5px] text-foreground/85 leading-relaxed">
            Begin every U.S. federal registration with SAM.gov. The Unique Entity Identifier (UEI) issued there is
            required for Grants.gov, eRA Commons, USAID, and most other federal systems. SAM also issues the CAGE code
            automatically for U.S. entities.
          </p>
        </SectionCard>
        <SectionCard testid="donor-note-era" title="eRA Commons needs UEI + signing official" subtitle="NIH submissions">
          <p className="text-[12.5px] text-foreground/85 leading-relaxed">
            eRA Commons institutional access requires an active UEI and a designated authorized business official.
            Without both, NIH submissions cannot route through Grants.gov Workspace into eRA.
          </p>
        </SectionCard>
        <SectionCard testid="donor-note-eu" title="EU Participant Register → PIC" subtitle="Horizon Europe & EDCTP3">
          <p className="text-[12.5px] text-foreground/85 leading-relaxed">
            CSTEM Global registers its legal entity in the EU Participant Register. Completion issues a Participant
            Identification Code (PIC) used across Horizon Europe, EDCTP3, and other EU funding programs.
          </p>
        </SectionCard>
        <SectionCard testid="donor-note-cage" title="CAGE / NCAGE" subtitle="Entity codes for federal & foreign systems">
          <p className="text-[12.5px] text-foreground/85 leading-relaxed">
            CAGE is U.S.-domestic and issued automatically by SAM. NCAGE is the NATO-issued international equivalent
            required when registering non-U.S. entities into U.S. federal systems.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
