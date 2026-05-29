import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { KPI, ProgressBar, SectionCard, StatusBadge } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
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
  MailCheck,
  MessageSquareText,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

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

type AgentTask = {
  id: string;
  agentId: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  due: string;
  state: "Queued" | "Drafting" | "Needs Review" | "Approved";
};

const AGENTS: Agent[] = [
  {
    id: "grant-manager",
    name: "AI Grant Manager",
    operatingRole: "Opportunity intake, screening, proposal workflow",
    status: "Active",
    readiness: 86,
    owner: "Grants Manager",
    cadence: "Daily pipeline review",
    icon: FileSearch,
    mission:
      "Keeps CSTEM’s grant pipeline moving by monitoring opportunities, creating workplans, checking proposal readiness, and escalating deadline risk.",
    responsibilities: [
      "Searches and classifies grant opportunities by donor, theme, geography, eligibility, and deadline",
      "Pre-fills the opportunity screening matrix and recommends Pursue, Partner, Monitor, or Do Not Pursue",
      "Generates proposal calendars, document checklists, internal review packets, and submission-readiness summaries",
      "Flags overdue concept notes, missing letters of support, budget-review gaps, and donor portal risks",
    ],
    tools: ["Opportunity tracker", "Proposal pipeline", "Screening matrix", "Compliance calendar"],
    humanApprovals: ["Pursue decision", "Budget approval", "Final submission", "Partner commitment"],
  },
  {
    id: "donor-registration",
    name: "AI Donor Registration Assistant",
    operatingRole: "SAM.gov, Grants.gov, eRA, EU PIC, donor portal readiness",
    status: "Active",
    readiness: 78,
    owner: "Director, RSO",
    cadence: "Weekly registration control check",
    icon: ClipboardCheck,
    mission:
      "Maintains donor registration readiness by tracking portal status, renewal dates, missing entity records, and required institutional documents.",
    responsibilities: [
      "Maintains SAM.gov, Grants.gov, eRA Commons, EU PIC, USAID, Wellcome, EDCTP, DANIDA, and CAGE/NCAGE tracker records",
      "Creates renewal reminders and quarterly access-review lists",
      "Builds document packs for legal name, EIN, authorized official, banking, policies, and capability statements",
      "Escalates registration blockers to the responsible officer",
    ],
    tools: ["Donor tracker", "Document repository", "Portal-role register", "Renewal calendar"],
    humanApprovals: ["Entity registration submission", "Banking changes", "Authorized representative changes"],
  },
  {
    id: "compliance",
    name: "AI Compliance Monitor",
    operatingRole: "Internal controls, audit readiness, award obligations",
    status: "In Progress",
    readiness: 72,
    owner: "Finance & Compliance Officer",
    cadence: "Twice-weekly exception review",
    icon: ShieldCheck,
    mission:
      "Reviews operational records for missing approvals, unresolved risk items, and audit-readiness gaps before they become donor findings.",
    responsibilities: [
      "Checks proposal files for COI, confidentiality, internal approvals, budget review, and final authorization",
      "Monitors award reporting deadlines, procurement evidence, subrecipient documentation, and closeout files",
      "Produces exception reports for overdue compliance tasks",
      "Maintains an audit-readiness evidence checklist by project code",
    ],
    tools: ["Compliance deadlines", "Audit records", "Budget control sheets", "Closeout checklist"],
    humanApprovals: ["Compliance certification", "Financial report submission", "Policy exceptions"],
  },
  {
    id: "training",
    name: "AI Training Coordinator",
    operatingRole: "Onboarding, module completion, access eligibility",
    status: "Active",
    readiness: 81,
    owner: "Training & Onboarding Coordinator",
    cadence: "Daily learner-status sync",
    icon: GraduationCap,
    mission:
      "Guides staff, volunteers, researchers, and partners through required GAIOS training before full system access is granted.",
    responsibilities: [
      "Tracks modules 1–10, quiz scores, certificates, refresher dates, and pending access approvals",
      "Generates learner nudges and supervisor escalation lists",
      "Prepares role-based onboarding paths for volunteers, PIs, finance, partners, and board members",
      "Recommends access readiness only after all conditions are met",
    ],
    tools: ["Curriculum", "Learner roster", "Training evidence", "Access approval queue"],
    humanApprovals: ["Final access approval", "Training waiver", "Role assignment"],
  },
  {
    id: "document-controller",
    name: "AI Document Controller",
    operatingRole: "Repository hygiene, naming conventions, version control",
    status: "Pending",
    readiness: 64,
    owner: "IT Systems Administrator",
    cadence: "Nightly repository scan",
    icon: FileText,
    mission:
      "Keeps GAIOS document folders orderly, searchable, and audit-ready through naming checks, missing-file detection, and version-control discipline.",
    responsibilities: [
      "Checks proposal and award folders against required file lists",
      "Flags duplicate, outdated, or incorrectly named documents",
      "Creates document indexes by donor, opportunity, project code, and award year",
      "Prepares closeout file completeness reports",
    ],
    tools: ["Document repository", "Templates", "Audit records", "Board approvals"],
    humanApprovals: ["Document deletion", "Record retention exceptions", "External sharing"],
  },
  {
    id: "proposal",
    name: "AI Proposal Development Assistant",
    operatingRole: "Concept notes, outlines, narratives, biosketch support",
    status: "In Progress",
    readiness: 74,
    owner: "Principal Investigator / Project Lead",
    cadence: "On-demand during proposal cycles",
    icon: MessageSquareText,
    mission:
      "Accelerates proposal drafting by preparing structured first drafts, donor-specific outlines, biosketch summaries, and capacity statements for human review.",
    responsibilities: [
      "Drafts concept notes, LOIs, proposal outlines, organizational capacity statements, and non-final narrative sections",
      "Adapts content to donor instructions, page limits, review criteria, and required attachments",
      "Builds biosketch and CV summaries from approved source material",
      "Prepares reviewer comment matrices and revision checklists",
    ],
    tools: ["Concept note template", "Proposal checklist", "Biosketch template", "Donor instructions"],
    humanApprovals: ["Technical claims", "Final narrative", "Partner representations", "Submission package"],
  },
];

const TASKS: AgentTask[] = [
  {
    id: "t1",
    agentId: "grant-manager",
    title: "Score USAID AI Curriculum opportunity and generate pursue memo",
    priority: "High",
    due: "2025-10-24",
    state: "Needs Review",
  },
  {
    id: "t2",
    agentId: "donor-registration",
    title: "Prepare SAM.gov renewal evidence checklist",
    priority: "High",
    due: "2025-10-29",
    state: "Drafting",
  },
  {
    id: "t3",
    agentId: "compliance",
    title: "Flag proposal files missing COI and budget-review signoff",
    priority: "Medium",
    due: "2025-11-01",
    state: "Queued",
  },
  {
    id: "t4",
    agentId: "training",
    title: "Notify learners below 80% quiz threshold and prepare access hold list",
    priority: "Medium",
    due: "2025-11-04",
    state: "Approved",
  },
  {
    id: "t5",
    agentId: "document-controller",
    title: "Audit Active Awards folder against required award setup package",
    priority: "Low",
    due: "2025-11-08",
    state: "Queued",
  },
  {
    id: "t6",
    agentId: "proposal",
    title: "Draft Wellcome climate-health concept note outline for PI review",
    priority: "High",
    due: "2025-11-12",
    state: "Drafting",
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
    text: "Every agent recommendation should preserve inputs, source documents, reviewer comments, timestamps, and the human approver of record.",
  },
  {
    title: "Escalation over autonomy",
    icon: BellRing,
    text: "When confidence is low, donor rules conflict, or a deadline is at risk, the agent escalates to the responsible officer instead of acting alone.",
  },
];

const IMPLEMENTATION_STEPS = [
  "Confirm AI agent charter and approval boundaries with CSTEM leadership",
  "Map each agent to one system owner, one data source, and one escalation path",
  "Connect safe read-only sources first: opportunity tracker, donor tracker, curriculum, templates, and compliance calendar",
  "Pilot AI Grant Manager on opportunity screening before enabling donor registration or compliance automation",
  "Add connector-backed workflows later for Gmail, Google Drive, Slack, Notion/Airtable, or donor opportunity feeds",
];

function priorityTone(priority: AgentTask["priority"]) {
  if (priority === "High") return "text-[hsl(var(--status-error))]";
  if (priority === "Medium") return "text-[hsl(var(--status-warning))]";
  return "text-muted-foreground";
}

export default function Agents() {
  const [selectedAgentId, setSelectedAgentId] = useState("grant-manager");
  const [showApproved, setShowApproved] = useState(true);
  const selectedAgent = AGENTS.find((agent) => agent.id === selectedAgentId) ?? AGENTS[0];
  const filteredTasks = useMemo(
    () => TASKS.filter((task) => (showApproved ? true : task.state !== "Approved")),
    [showApproved],
  );

  const activeAgents = AGENTS.filter((agent) => agent.status === "Active").length;
  const reviewTasks = TASKS.filter((task) => task.state === "Needs Review").length;
  const averageReadiness = Math.round(AGENTS.reduce((sum, agent) => sum + agent.readiness, 0) / AGENTS.length);

  return (
    <>
      <PageHeader
        title="AI Agents"
        subtitle="Supervised AI assistants for GAIOS operations. Agents prepare, check, remind, and recommend; CSTEM staff approve, submit, sign, and certify."
        actions={
          <div className="flex gap-2 text-[12px]" data-testid="agents-actions">
            <button
              data-testid="button-agent-charter"
              className="px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-accent"
            >
              Agent charter
            </button>
            <button
              data-testid="button-pilot-grant-manager"
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              Pilot Grant Manager
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="agent-kpi-grid">
        <KPI label="Agent roles" value={AGENTS.length} delta={`${activeAgents} active`} trend="up" testid="kpi-agent-roles" />
        <KPI label="Readiness" value={`${averageReadiness}%`} delta="+ pilot" trend="up" hint="Average configured controls" testid="kpi-agent-readiness" />
        <KPI label="Needs review" value={reviewTasks} delta="human gate" trend="flat" hint="No autonomous approval" testid="kpi-agent-review" />
        <KPI label="Tasks queued" value={TASKS.length} delta="6 workflows" trend="up" hint="Grant, donor, compliance, training" testid="kpi-agent-tasks" />
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-3 mt-6">
        <SectionCard
          title="Agent roster"
          subtitle="Role-specific assistants mapped to CSTEM owners and approval boundaries"
          testid="card-agent-roster"
        >
          <div className="grid md:grid-cols-2 gap-3">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              const active = agent.id === selectedAgent.id;
              return (
                <button
                  key={agent.id}
                  data-testid={`agent-card-${agent.id}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-colors",
                    active
                      ? "border-primary bg-primary/7"
                      : "border-card-border bg-background/40 hover:border-primary/35",
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
                    <span className="tabular-nums">{agent.readiness}% ready</span>
                  </div>
                  <ProgressBar value={agent.readiness} tone={agent.status === "Pending" ? "warning" : "primary"} testid={`agent-progress-${agent.id}`} />
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedAgent.name}
          subtitle={`${selectedAgent.owner} owner • ${selectedAgent.cadence}`}
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

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-3 mt-6">
        <SectionCard
          title="Supervision controls"
          subtitle="Guardrails for safe grant, donor, compliance, and training automation"
          testid="card-agent-controls"
        >
          <div className="grid sm:grid-cols-2 gap-3">
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

        <SectionCard
          title="Agent work queue"
          subtitle="Illustrative tasks routed to AI agents with human review gates"
          actions={
            <button
              data-testid="button-toggle-approved-tasks"
              onClick={() => setShowApproved((value) => !value)}
              className="text-[11.5px] text-primary hover:underline"
            >
              {showApproved ? "Hide approved" : "Show approved"}
            </button>
          }
          testid="card-agent-queue"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Task</th>
                  <th className="py-2 px-3 font-medium">Agent</th>
                  <th className="py-2 px-3 font-medium">Due</th>
                  <th className="py-2 px-3 font-medium">Priority</th>
                  <th className="py-2 pl-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const agent = AGENTS.find((item) => item.id === task.agentId);
                  return (
                    <tr key={task.id} data-testid={`agent-task-${task.id}`}>
                      <td className="py-2.5 pr-3 font-medium text-foreground">{task.title}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{agent?.name}</td>
                      <td className="py-2.5 px-3 tabular-nums">{task.due}</td>
                      <td className={cn("py-2.5 px-3 font-semibold", priorityTone(task.priority))}>{task.priority}</td>
                      <td className="py-2.5 pl-3">
                        <span className="rounded-full bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">{task.state}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-6">
        <SectionCard title="AI Grant Manager pilot" subtitle="Recommended first agent to activate" className="lg:col-span-2" testid="card-grant-manager-pilot">
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: "Reads", value: "Opportunity tracker, donor instructions, deadlines", icon: FileSearch },
              { label: "Produces", value: "Pursue memo, timeline, checklist, risk flags", icon: MailCheck },
              { label: "Escalates", value: "Eligibility gaps, budget risk, late reviews", icon: AlertTriangle },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-card-border bg-background/45 p-3">
                  <Icon size={16} className="text-primary mb-2" />
                  <h3 className="text-[12.5px] font-semibold">{item.label}</h3>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-1">{item.value}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-[hsl(var(--status-warning)/0.28)] bg-[hsl(var(--status-warning)/0.08)] p-3">
            <p className="text-[12.5px] leading-relaxed text-foreground">
              Recommended boundary: the AI Grant Manager may prepare a complete internal pursue packet, but the Director RSO and Executive Director must approve whether CSTEM pursues, partners, or declines the opportunity.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Deployment sequence" subtitle="Start supervised, then connect systems" testid="card-agent-sequence">
          <ol className="space-y-2">
            {IMPLEMENTATION_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2 text-[12.5px] leading-snug">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

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
    </>
  );
}
