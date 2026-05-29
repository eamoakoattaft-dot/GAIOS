import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { KPI, SectionCard, StatusBadge, ProgressBar } from "@/components/ui-bits";
import { LEARNERS, ONBOARDING_STEPS } from "@/lib/data";
import {
  CheckCircle2,
  ShieldAlert,
  Search,
  ClipboardCheck,
  Users,
  HeartHandshake,
  Target,
  LockKeyhole,
  CalendarCheck,
  Globe2,
  GraduationCap,
  Video,
  MonitorPlay,
  Captions,
  GitBranch,
  WandSparkles,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RoleType = "Employee" | "Volunteer" | "Researcher" | "Partner";

const FRAMEWORK_4CS = [
  {
    name: "Compliance",
    icon: ShieldAlert,
    detail: "I-9/W-4 where applicable, COI, confidentiality, harassment prevention, safety, safeguarding, donor compliance, cybersecurity.",
  },
  {
    name: "Clarification",
    icon: Target,
    detail: "Role scope, supervisor, 30/60/90 success criteria, GAIOS access level, grant portfolio responsibilities, partner expectations.",
  },
  {
    name: "Culture",
    icon: HeartHandshake,
    detail: "CSTEM mission, STEM-for-development lens, Ghana/global partnership norms, ethical research, community respect.",
  },
  {
    name: "Connection",
    icon: Users,
    detail: "Buddy assignment, manager 1:1s, research-team introductions, partner orientation, volunteer cohort integration.",
  },
];

const CSTEM_PHASES = [
  {
    phase: "Phase 0",
    window: "Pre-Boarding • T-7 to Day 0",
    objective: "Clear administrative, role, safeguarding, and IT prerequisites before the person enters GAIOS.",
    items: [
      ["Offer/engagement agreement signed", "Employee, Volunteer, Researcher", "HR / Hiring Manager", "Signed agreement", true],
      ["Background/reference checks completed for assigned risk level", "Employee, Volunteer, Researcher", "HR", "Clearance note", true],
      ["IT access request submitted with role matrix approval", "Employee, Researcher", "Manager → IT", "Access request", true],
      ["Welcome packet sent with first-week agenda and CSTEM mission primer", "All roles", "HR / Training Coordinator", "Email record", false],
      ["Partner due-diligence intake started where applicable", "Partner", "Partnerships Officer", "Due-diligence checklist", true],
    ],
  },
  {
    phase: "Phase 1",
    window: "Orientation • Days 1–7",
    objective: "Satisfy legal/organizational requirements and create a safe, mission-aligned first week.",
    items: [
      ["I-9 and payroll/tax forms completed where applicable", "Employee, Researcher", "HR / Payroll", "HRIS record", true],
      ["Confidentiality, COI, code of conduct, data protection, and anti-fraud acknowledgments signed", "All roles", "Compliance", "Signed forms", true],
      ["MFA, password manager, acceptable use, and basic account setup completed", "Employee, Volunteer, Researcher", "IT", "Access log", true],
      ["CSTEM mission, safeguarding, reporting channels, and workplace safety orientation completed", "All roles", "Training Coordinator", "Attendance record", true],
      ["Manager/buddy introduction and first-week role clarity meeting completed", "Employee, Volunteer, Researcher", "Manager", "Check-in note", false],
    ],
  },
  {
    phase: "Phase 2",
    window: "Foundation • Days 8–30",
    objective: "Complete required training before full system, grant, procurement, or donor-data access.",
    items: [
      ["Modules 1–10 completed with final quiz ≥80%", "Employee, Volunteer, Researcher", "Training Coordinator", "LMS certificate", true],
      ["Cybersecurity awareness and incident-reporting training completed", "Employee, Volunteer, Researcher", "IT / HR", "LMS record", true],
      ["2 CFR 200 procurement, allowability, and restricted-fund training completed", "Grant-funded Employee, Researcher", "Grants Manager", "Training certificate", true],
      ["Donor compliance orientation completed for staff accessing portals or donor records", "Employee, Researcher", "Grants Manager", "Acknowledgment", true],
      ["30-day manager 1:1 and HR pulse check completed", "Employee, Volunteer, Researcher", "Manager / HR", "Check-in + survey", false],
    ],
  },
  {
    phase: "Phase 3",
    window: "Integration • Days 31–60",
    objective: "Move from basic onboarding into role performance, cross-team integration, and partner collaboration.",
    items: [
      ["30/60/90 goals confirmed with measurable role outcomes", "Employee, Researcher", "Manager", "Goal sheet", false],
      ["Advanced role training completed: grant reporting, IRB/research ethics, CRM, donor portals, or evaluation tools", "Employee, Researcher", "Program Lead", "Completion log", false],
      ["Cultural integration check-in for Ghana/global partnership norms completed", "Employee, Volunteer, Researcher, Partner", "Partnerships Officer", "Orientation note", false],
      ["60-day pulse check and retention-risk review completed", "Employee, Volunteer, Researcher", "HR", "Survey + notes", false],
    ],
  },
  {
    phase: "Phase 4",
    window: "Performance • Days 61–90+",
    objective: "Certify access, confirm performance, and set annual refreshers.",
    items: [
      ["90-day performance review completed against role benchmarks", "Employee, Researcher", "Manager + HR", "Review form", false],
      ["IT access rights audit confirms least-privilege match", "Employee, Volunteer, Researcher", "IT", "Access audit", true],
      ["COI no-change or update attestation completed", "Employee, Volunteer, Researcher", "Compliance", "COI record", true],
      ["Annual refresher calendar set for cybersecurity, safeguarding, COI, and donor compliance", "All roles", "Training Coordinator", "Training calendar", false],
      ["Full GAIOS onboarding status moved to Fully Onboarded or Renewal Due", "All roles", "HR / IT", "Dashboard status", true],
    ],
  },
];

const PARTNER_CHECKLIST = [
  "Legal entity verification, SAM.gov/debarment or equivalent screening, and sanctions/OFAC check",
  "Signed MOU, subaward, or partner agreement with roles, reporting cadence, and data-sharing limits",
  "Safeguarding, anti-fraud, anti-corruption, and conflict-of-interest acknowledgments",
  "Banking verification, responsible officer assignment, and communication protocol",
  "Cross-border data protection orientation before access to CSTEM or participant data",
  "Monitoring schedule for financial reports, site visits, corrective actions, and renewal screening",
];

const METRICS_306090 = [
  { checkpoint: "Day 30", metric: "Required training completion", target: "100%", owner: "Training Coordinator" },
  { checkpoint: "Day 30", metric: "Role clarity score", target: "≥80/100", owner: "Manager" },
  { checkpoint: "Day 60", metric: "Peer / partner integration score", target: "≥75/100", owner: "HR / Buddy" },
  { checkpoint: "Day 90", metric: "Time-to-productivity", target: "≤45 days ops / ≤90 days research", owner: "Manager" },
  { checkpoint: "Day 90", metric: "Access audit accuracy", target: "100%", owner: "IT" },
  { checkpoint: "Day 90", metric: "Retention / continuation", target: "≥85%", owner: "HR" },
];

const VIDEO_FORMATS = [
  {
    name: "AI Avatar",
    icon: Video,
    duration: "2–4 min",
    bestFor: "Welcome messages, mission, policy overview, donor-facing professionalism",
    cstemUse: "CSTEM mission, code of conduct, PSEA overview, partner welcome",
  },
  {
    name: "Screen Walkthrough",
    icon: MonitorPlay,
    duration: "3–6 min",
    bestFor: "System navigation and process demonstrations",
    cstemUse: "GAIOS access, donor tracker, COI form, CRM entry, grant document repository",
  },
  {
    name: "Motion Graphics",
    icon: WandSparkles,
    duration: "3–5 min",
    bestFor: "Rules, frameworks, diagrams, compliance decision trees",
    cstemUse: "2 CFR 200 allowability, NIST CSF, data classification, grant lifecycle",
  },
  {
    name: "Scenario Branching",
    icon: GitBranch,
    duration: "5–8 min",
    bestFor: "Judgment, ethics, safeguarding, conflicts, procurement integrity",
    cstemUse: "COI, PSEA reporting, phishing response, vendor selection, research misconduct",
  },
];

const VIDEO_TRACKS = [
  {
    track: "Organizational Onboarding",
    modules: 5,
    examples: "Mission, structure, code of conduct, acceptable use, key contacts",
    owner: "ED / HR / IT",
    format: "Avatar + motion + screen",
  },
  {
    track: "Grant & Financial Compliance",
    modules: 7,
    examples: "2 CFR 200, allowability, procurement, subrecipient monitoring, audit trail",
    owner: "Grants Manager / Finance",
    format: "Motion + scenarios",
  },
  {
    track: "IT & Digital Infrastructure",
    modules: 5,
    examples: "Cybersecurity, phishing, data classification, VPN, NIST CSF overview",
    owner: "IT Administrator",
    format: "Screen + motion + branching",
  },
  {
    track: "Research Ethics / RCR",
    modules: 5,
    examples: "RCR, misconduct, data integrity, authorship, human subjects",
    owner: "Research Director",
    format: "Avatar + branching",
  },
  {
    track: "Safeguarding, COI & Confidentiality",
    modules: 6,
    examples: "COI disclosure, organizational COI, PSEA, confidentiality, field safeguarding",
    owner: "HR / Legal / Safeguarding",
    format: "Scenario-heavy",
  },
  {
    track: "Partner / Subrecipient Onboarding",
    modules: 5,
    examples: "Partner network, subaward terms, due diligence, safeguarding, reporting",
    owner: "Partnerships / Grants",
    format: "Avatar + motion",
  },
  {
    track: "Donor Registration & Data",
    modules: 4,
    examples: "Donor registrations, CRM, receipting, donor/beneficiary data protection",
    owner: "Finance / Development / IT",
    format: "Screen + avatar",
  },
];

const VIDEO_GATES = [
  ["Needs brief", "Objective, audience, source citations, owner, and renewal cadence defined"],
  ["Script + SME review", "Script constrained to approved CSTEM policy and regulatory sources"],
  ["Legal / compliance", "Rules, donor obligations, disclaimers, and factual claims approved"],
  ["Bias / inclusion", "Avatar, scenario language, Ghana/global context, and representation reviewed"],
  ["Accessibility", "Captions, transcript, audio description, contrast, keyboard player confirmed"],
  ["AI artifact QA", "Full video watched for hallucinations, pronunciation, pacing, and visual accuracy"],
  ["Final release", "Program owner authorizes LMS publication and version archive"],
];

const VIDEO_QA = [
  "One learning objective per micro-lesson",
  "3–6 minutes target; branching scenarios may run up to 10 minutes",
  "2–3 question knowledge check immediately after each video",
  "Spaced refresher quiz scheduled at +14 days and +90 days",
  "Captions and transcript human-reviewed before launch",
  "Compressed 360p/offline option available for Ghana/global partners",
  "Version named and archived using CSTEM track/module convention",
  "Regulatory videos reviewed every 12 months or on policy change",
];

const SCRIPT_BATCH_1 = [
  {
    title: "Welcome to CSTEM Global and GAIOS",
    format: "AI avatar + brand motion",
    duration: "1:38",
    owner: "ED / Training Coordinator",
    status: "Video produced",
  },
  {
    title: "How to Access GAIOS Safely",
    format: "Screen walkthrough",
    duration: "1:47",
    owner: "IT Systems Administrator",
    status: "Video produced",
  },
  {
    title: "Conflict of Interest Basics",
    format: "Scenario branching",
    duration: "1:56",
    owner: "Compliance / Grants Manager",
    status: "Video produced",
  },
  {
    title: "Cybersecurity Core Behaviors",
    format: "Motion graphics",
    duration: "1:30",
    owner: "IT Systems Administrator",
    status: "Video produced",
  },
  {
    title: "Safeguarding and Reporting Concerns",
    format: "AI avatar + scenario",
    duration: "1:40",
    owner: "Safeguarding Lead / HR",
    status: "Video produced",
  },
];

const VIDEO_PRODUCTION_BATCHES = [
  {
    batch: "Batch 1",
    scope: "Foundational onboarding",
    modules: 5,
    minutes: "8.8 min",
    status: "Produced",
  },
  {
    batch: "Batch 2",
    scope: "Grant lifecycle, screening, concept notes, proposals, budgets",
    modules: 5,
    minutes: "6.0 min",
    status: "Produced",
  },
  {
    batch: "Batch 3",
    scope: "Budget justification, post-award, repository, data handling, phishing",
    modules: 5,
    minutes: "6.0 min",
    status: "Produced",
  },
  {
    batch: "Batch 4",
    scope: "Access reviews, continuity, RCR, research data, human subjects",
    modules: 5,
    minutes: "5.8 min",
    status: "Produced",
  },
  {
    batch: "Batch 5",
    scope: "Authorship, misconduct, confidentiality, OCI, anti-fraud",
    modules: 5,
    minutes: "5.9 min",
    status: "Produced",
  },
  {
    batch: "Batch 6",
    scope: "Respectful conduct, field safeguarding, partner readiness, monitoring, reporting",
    modules: 5,
    minutes: "6.0 min",
    status: "Produced",
  },
  {
    batch: "Batch 7",
    scope: "Cross-border collaboration, closeout, donor roadmap, registrations, CRM, certification",
    modules: 7,
    minutes: "8.5 min",
    status: "Produced",
  },
];

function FourCsFramework() {
  return (
    <SectionCard
      title="CSTEM onboarding model"
      subtitle="GAIOS adapts the 4Cs into nonprofit, grant-funded, research, volunteer, and partner onboarding"
      testid="training-4cs-framework"
    >
      <div className="grid md:grid-cols-4 gap-3">
        {FRAMEWORK_4CS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="rounded-lg border border-card-border bg-background/45 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={15} />
                </div>
                <h3 className="text-[13px] font-semibold">{item.name}</h3>
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CSTEMChecklist() {
  const [role, setRole] = useState<RoleType | "All">("All");
  const [openPhase, setOpenPhase] = useState("Phase 0");
  const filteredPhases = CSTEM_PHASES.map((phase) => ({
    ...phase,
    items: phase.items.filter((item) => role === "All" || String(item[1]).includes(role) || String(item[1]) === "All roles"),
  }));

  return (
    <SectionCard
      title="CSTEM-specific onboarding checklist"
      subtitle="Phased checklist with owners, evidence, and access gates"
      actions={
        <select
          data-testid="select-onboarding-role-filter"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleType | "All")}
          className="h-8 rounded-md bg-secondary border border-border text-[12px] px-2"
        >
          <option value="All">All roles</option>
          <option value="Employee">Employee</option>
          <option value="Volunteer">Volunteer</option>
          <option value="Researcher">Researcher</option>
          <option value="Partner">Partner</option>
        </select>
      }
      testid="cstem-onboarding-checklist"
    >
      <div className="space-y-3">
        {filteredPhases.map((phase) => {
          const open = openPhase === phase.phase;
          const gateCount = phase.items.filter((item) => item[4]).length;
          return (
            <div key={phase.phase} className="rounded-lg border border-card-border bg-background/45 overflow-hidden">
              <button
                data-testid={`button-phase-${phase.phase.replace(" ", "-")}`}
                onClick={() => setOpenPhase(open ? "" : phase.phase)}
                className="w-full text-left p-3 hover:bg-accent/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13.5px] font-semibold">{phase.phase}</h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{phase.window}</span>
                      <span className="rounded-full bg-[hsl(var(--status-warning)/0.12)] px-2 py-0.5 text-[11px] text-[hsl(var(--status-warning))]">
                        {gateCount} access gates
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-1">{phase.objective}</p>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">{phase.items.length} items</span>
                </div>
              </button>
              {open && (
                <div className="border-t border-card-border overflow-x-auto" data-testid={`phase-detail-${phase.phase.replace(" ", "-")}`}>
                  <table className="w-full min-w-[760px] text-[12px]">
                    <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3 font-medium">Checklist item</th>
                        <th className="py-2 px-3 font-medium">Applies to</th>
                        <th className="py-2 px-3 font-medium">Owner</th>
                        <th className="py-2 px-3 font-medium">Evidence</th>
                        <th className="py-2 px-3 font-medium">Gate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {phase.items.map((item) => (
                        <tr key={String(item[0])}>
                          <td className="py-2.5 px-3 font-medium text-foreground">{item[0]}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item[1]}</td>
                          <td className="py-2.5 px-3">{item[2]}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item[3]}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-[11px]",
                                item[4]
                                  ? "bg-[hsl(var(--status-warning)/0.12)] text-[hsl(var(--status-warning))]"
                                  : "bg-secondary text-secondary-foreground",
                              )}
                            >
                              {item[4] ? "Access gate" : "Track"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PartnerTrack() {
  return (
    <SectionCard
      title="Partner / subrecipient onboarding"
      subtitle="Concurrent track for Ghana and global collaborators before data, grant, or fieldwork access"
      testid="partner-onboarding-track"
    >
      <ul className="space-y-2">
        {PARTNER_CHECKLIST.map((item, index) => (
          <li key={item} className="flex gap-2 text-[12.5px] leading-snug">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Metrics306090() {
  return (
    <SectionCard title="30 / 60 / 90 onboarding metrics" subtitle="Pulse checks and performance signals for early support" testid="metrics-306090">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[12px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Checkpoint</th>
              <th className="py-2 px-3 font-medium">Metric</th>
              <th className="py-2 px-3 font-medium">Target</th>
              <th className="py-2 pl-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {METRICS_306090.map((m) => (
              <tr key={`${m.checkpoint}-${m.metric}`}>
                <td className="py-2.5 pr-3 font-semibold text-primary">{m.checkpoint}</td>
                <td className="py-2.5 px-3">{m.metric}</td>
                <td className="py-2.5 px-3 tabular-nums">{m.target}</td>
                <td className="py-2.5 pl-3 text-muted-foreground">{m.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function VideoProductionFramework() {
  return (
    <SectionCard
      title="AI training video production framework"
      subtitle="Microlearning blueprint for high-engagement CSTEM onboarding videos"
      testid="video-production-framework"
    >
      <div className="grid md:grid-cols-4 gap-3">
        {VIDEO_FORMATS.map((format) => {
          const Icon = format.icon;
          return (
            <div key={format.name} className="rounded-lg border border-card-border bg-background/45 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={15} />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] text-secondary-foreground">{format.duration}</span>
              </div>
              <h3 className="text-[13px] font-semibold">{format.name}</h3>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-1">{format.bestFor}</p>
              <p className="text-[11.5px] text-foreground/85 leading-relaxed mt-2">{format.cstemUse}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
        <p className="text-[12.5px] leading-relaxed">
          Production rule: build 3–5 micro-lessons per learning path, keep one objective per video, add a short quiz immediately after each video, and schedule refresher checks at 14 and 90 days.
        </p>
      </div>
    </SectionCard>
  );
}

function VideoTrackLibrary() {
  return (
    <SectionCard
      title="GAIOS video curriculum library"
      subtitle="37 micro-video modules across seven CSTEM training tracks"
      testid="video-track-library"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-[12px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Track</th>
              <th className="py-2 px-3 font-medium text-right">Modules</th>
              <th className="py-2 px-3 font-medium">Example topics</th>
              <th className="py-2 px-3 font-medium">Recommended format</th>
              <th className="py-2 pl-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {VIDEO_TRACKS.map((track) => (
              <tr key={track.track} data-testid={`video-track-${track.track.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                <td className="py-2.5 pr-3 font-semibold text-foreground">{track.track}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{track.modules}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{track.examples}</td>
                <td className="py-2.5 px-3">{track.format}</td>
                <td className="py-2.5 pl-3 text-muted-foreground">{track.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function VideoGovernance() {
  return (
    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-3">
      <SectionCard
        title="AI video governance gates"
        subtitle="Required approval path before any generated training video is published"
        testid="video-governance-gates"
      >
        <ol className="space-y-2">
          {VIDEO_GATES.map(([title, detail], index) => (
            <li key={title} className="flex gap-2.5 text-[12.5px] leading-snug">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <div className="font-semibold text-foreground">{title}</div>
                <div className="text-muted-foreground">{detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        title="Per-video QA checklist"
        subtitle="Minimum production evidence before LMS assignment"
        testid="video-qa-checklist"
      >
        <div className="space-y-2">
          {VIDEO_QA.map((item) => (
            <div key={item} className="flex gap-2 text-[12.5px] leading-snug">
              <FileCheck2 size={14} className="mt-0.5 shrink-0 text-[hsl(var(--status-success))]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["80%", "standard pass"],
            ["100%", "critical compliance"],
            ["12 mo", "regulatory refresh"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-card-border bg-background/45 p-2">
              <div className="text-[17px] font-semibold tabular-nums">{value}</div>
              <div className="text-[10.5px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ScriptBatchReady() {
  return (
    <SectionCard
      title="GAIOS training videos produced"
      subtitle="Full 37-video CSTEM-branded curriculum rendered with narration, captions, transcripts, and LMS-ready batch packages"
      testid="video-script-batch-ready"
    >
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        {[
          ["37", "videos produced"],
          ["7", "batch packages"],
          ["32", "new videos in this run"],
          ["47 min", "total curriculum"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-card-border bg-background/45 p-3">
            <div className="text-[20px] font-semibold tabular-nums text-primary">{value}</div>
            <div className="text-[11.5px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Batch</th>
              <th className="py-2 px-3 font-medium">Scope</th>
              <th className="py-2 px-3 font-medium text-right">Videos</th>
              <th className="py-2 px-3 font-medium">Runtime</th>
              <th className="py-2 pl-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {VIDEO_PRODUCTION_BATCHES.map((batch) => (
              <tr key={batch.batch} data-testid={`video-production-${batch.batch.toLowerCase().replace(" ", "-")}`}>
                <td className="py-2.5 pr-3 font-semibold text-foreground">{batch.batch}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{batch.scope}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{batch.modules}</td>
                <td className="py-2.5 px-3 tabular-nums">{batch.minutes}</td>
                <td className="py-2.5 pl-3">
                  <span className="rounded-full bg-[hsl(var(--status-success)/0.12)] px-2 py-1 text-[11px] text-[hsl(var(--status-success))]">
                    {batch.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Video</th>
              <th className="py-2 px-3 font-medium">Format</th>
              <th className="py-2 px-3 font-medium">Duration</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 pl-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SCRIPT_BATCH_1.map((video, index) => (
              <tr key={video.title} data-testid={`script-batch-video-${index + 1}`}>
                <td className="py-2.5 pr-3 font-semibold text-foreground">{video.title}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{video.format}</td>
                <td className="py-2.5 px-3 tabular-nums">{video.duration}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{video.owner}</td>
                <td className="py-2.5 pl-3">
                  <span className="rounded-full bg-[hsl(var(--status-success)/0.12)] px-2 py-1 text-[11px] text-[hsl(var(--status-success))]">
                    {video.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-[hsl(var(--status-warning)/0.28)] bg-[hsl(var(--status-warning)/0.08)] p-3">
        <p className="text-[12.5px] leading-relaxed">
          Next gate: CSTEM topic owners should review the produced videos for voice, policy accuracy, and role-specific examples before LMS upload. After approval, attach the SRT captions, narration transcripts, quiz questions, and completion evidence fields to the selected training platform.
        </p>
      </div>
    </SectionCard>
  );
}

function OnboardingPathway() {
  return (
    <SectionCard
      testid="onboarding-pathway"
      title="Onboarding pathway"
      subtitle="Seven steps from application to certified access"
    >
      <ol className="relative space-y-3" role="list">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.n} className="flex items-start gap-3" data-testid={`onboard-step-${s.n}`}>
            <div className="flex flex-col items-center">
              <span className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11.5px] font-semibold tabular-nums">
                {s.n}
              </span>
              {i < ONBOARDING_STEPS.length - 1 && <span className="flex-1 w-px bg-border mt-1.5 mb-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="text-[13px] font-semibold tracking-tight">{s.title}</div>
              <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function AccessRule() {
  return (
    <SectionCard
      testid="training-access-rule"
      title="Training-to-system access rule"
      subtitle="No full institutional access until all gates close"
    >
      <div className="flex items-start gap-3 rounded-md border border-[hsl(var(--status-warning)/0.3)] bg-[hsl(var(--status-warning)/0.06)] px-3.5 py-3">
        <ShieldAlert size={16} className="text-[hsl(var(--status-warning))] mt-0.5 shrink-0" />
        <div className="text-[12.5px] leading-relaxed">
          <p className="font-semibold text-foreground mb-1">All of the following must be true:</p>
          <ul className="list-disc list-inside marker:text-[hsl(var(--status-warning))] text-foreground/85 space-y-0.5">
            <li>Confidentiality agreement on file</li>
            <li>Conflict-of-interest disclosure signed</li>
            <li>MFA, acceptable-use policy, and cybersecurity awareness complete</li>
            <li>Safeguarding and reporting-channel orientation complete</li>
            <li>Modules 1–10 completed</li>
            <li>Final quiz ≥ 80%</li>
            <li>Grant/donor compliance training complete for grant-facing roles</li>
            <li>Supervisor approval logged</li>
            <li>IT administrator approval recorded</li>
          </ul>
          <p className="text-muted-foreground mt-2">Annual refresher resets the access certification clock.</p>
        </div>
      </div>
    </SectionCard>
  );
}

function LearnerRoster() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      LEARNERS.filter((l) => {
        const mq =
          !q || l.name.toLowerCase().includes(q.toLowerCase()) || l.role.toLowerCase().includes(q.toLowerCase());
        const ms = status === "all" || l.status === status;
        return mq && ms;
      }),
    [q, status],
  );

  return (
    <SectionCard
      testid="learner-roster"
      title="Learner roster"
      subtitle={`${LEARNERS.length} staff, partners, and volunteers tracked`}
      actions={
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="input-learner-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search learners…"
              className="h-8 w-56 pl-7 pr-2 rounded-md bg-secondary border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            data-testid="select-learner-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded-md bg-secondary border border-border text-[12px] px-2"
          >
            <option value="all">All statuses</option>
            <option value="Complete">Complete</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[12.5px]">
          <thead className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Learner</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Modules</th>
              <th className="py-2 pr-3 font-medium text-right">Quiz</th>
              <th className="py-2 pr-3 font-medium">Certified</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((l) => (
              <tr key={l.id} data-testid={`learner-row-${l.id}`}>
                <td className="py-2.5 pr-3 font-medium text-foreground">{l.name}</td>
                <td className="py-2.5 pr-3 text-foreground/80">{l.role}</td>
                <td className="py-2.5 pr-3 w-44">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={(l.modulesComplete / 10) * 100} tone="primary" />
                    <span className="tabular-nums text-[11.5px] text-foreground/80 shrink-0">{l.modulesComplete}/10</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {l.quizScore != null ? (
                    <span className={l.quizScore >= 80 ? "text-[hsl(var(--status-success))]" : "text-[hsl(var(--status-warning))]"}>
                      {l.quizScore}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {l.certified ? (
                    <span className="inline-flex items-center gap-1 text-[hsl(var(--status-success))] text-[12px]">
                      <CheckCircle2 size={13} /> Certified
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[12px]">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge status={l.status as any} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[12px] text-muted-foreground">
                  No learners match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default function TrainingPage() {
  const completion = Math.round((LEARNERS.filter((l) => l.certified).length / LEARNERS.length) * 100);
  return (
    <>
      <PageHeader
        title="Training & Onboarding"
        subtitle="CSTEM-specific onboarding for employees, volunteers, researchers, partners, and role-gated GAIOS access."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Certified learners" value={`${completion}%`} delta={`${LEARNERS.filter((l) => l.certified).length}/${LEARNERS.length}`} trend="up" hint="Current sample roster" testid="kpi-training-certified" />
        <KPI label="Access gates" value="12" delta="Phase 0–4" trend="flat" hint="Must clear before full access" testid="kpi-training-gates" />
        <KPI label="Role tracks" value="4" delta="E / V / R / P" trend="flat" hint="Employee, volunteer, researcher, partner" testid="kpi-training-role-tracks" />
        <KPI label="Pulse checks" value="3" delta="30 / 60 / 90" trend="up" hint="HR and manager checkpoints" testid="kpi-training-pulses" />
      </div>

      <div className="mb-5">
        <FourCsFramework />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <OnboardingPathway />
        <AccessRule />
      </div>

      <div className="mt-5">
        <CSTEMChecklist />
      </div>

      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-3 mt-5">
        <PartnerTrack />
        <Metrics306090 />
      </div>

      <div className="mt-5">
        <VideoProductionFramework />
      </div>

      <div className="mt-5">
        <VideoTrackLibrary />
      </div>

      <div className="mt-5">
        <VideoGovernance />
      </div>

      <div className="mt-5">
        <ScriptBatchReady />
      </div>

      <div className="mt-5">
        <LearnerRoster />
      </div>
    </>
  );
}
