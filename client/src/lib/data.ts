// Seed operational data for GAIOS dashboard.

export type Status =
  | "Active"
  | "Pending"
  | "In Progress"
  | "Submitted"
  | "Under Review"
  | "Awarded"
  | "Declined"
  | "On Hold"
  | "Complete"
  | "Not Started"
  | "Blocked"
  | "Overdue";

export const STATUS_TONES: Record<Status, string> = {
  Active: "bg-[hsl(var(--status-success)/0.12)] text-[hsl(var(--status-success))]",
  Pending: "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]",
  "In Progress": "bg-[hsl(var(--status-info)/0.12)] text-[hsl(var(--status-info))]",
  Submitted: "bg-[hsl(var(--status-info)/0.12)] text-[hsl(var(--status-info))]",
  "Under Review": "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]",
  Awarded: "bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]",
  Declined: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
  "On Hold": "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]",
  Complete: "bg-[hsl(var(--status-success)/0.12)] text-[hsl(var(--status-success))]",
  "Not Started": "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]",
  Blocked: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
  Overdue: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
};

// ============================================================
// PILLAR 1 — GRANT ADMINISTRATION
// ============================================================

export type Role = {
  id: string;
  title: string;
  short: string;
  duties: string[];
};

export const ROLES: Role[] = [
  {
    id: "ed",
    title: "Executive Director / AOR",
    short: "Authorized Organizational Representative",
    duties: [
      "Final institutional approval on proposals & awards",
      "Donor submissions and signatures",
      "Partnerships and MoUs",
      "Mission alignment review",
      "Institutional representation to donors",
    ],
  },
  {
    id: "rso",
    title: "Director, Research Support Office",
    short: "RSO oversight",
    duties: [
      "Manages grant lifecycle end-to-end",
      "Owns donor registrations",
      "Builds proposal teams",
      "Ensures compliance with donor & institutional policy",
      "Maintains institutional grant calendar",
    ],
  },
  {
    id: "gm",
    title: "Grants Manager",
    short: "Operational coordination",
    duties: [
      "Tracks opportunities and timelines",
      "Manages proposal documents and donor portals",
      "Supports budget development",
      "Coordinates internal review windows",
    ],
  },
  {
    id: "fco",
    title: "Finance & Compliance Officer",
    short: "Financial integrity",
    duties: [
      "Budgets and budget justifications",
      "Financial reporting to donors",
      "Allowable / allocable cost review",
      "Internal controls and procurement records",
    ],
  },
  {
    id: "pi",
    title: "Principal Investigator / Project Lead",
    short: "Technical lead",
    duties: [
      "Technical narrative and methodology",
      "Workplan and deliverables",
      "Research design and M&E",
      "Partner technical engagement",
    ],
  },
  {
    id: "it",
    title: "IT Systems Administrator",
    short: "Platform & security",
    duties: [
      "Access provisioning and user accounts",
      "Cybersecurity controls (MFA, RBAC)",
      "Storage and backup",
      "Training platform integration",
      "Audit logs and exit checklist",
    ],
  },
  {
    id: "tc",
    title: "Training & Onboarding Coordinator",
    short: "Capability building",
    duties: [
      "Runs onboarding pathway",
      "Maintains modules and quizzes",
      "Certifies access readiness",
      "Schedules annual refreshers",
    ],
  },
];

export type LifecycleStage = {
  id: string;
  number: number;
  title: string;
  purpose: string;
  fields?: string[];
  bullets?: string[];
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "identification",
    number: 1,
    title: "Opportunity Identification",
    purpose: "Capture every relevant donor opportunity in a single, structured intake.",
    fields: [
      "Donor name",
      "Opportunity title",
      "Funding number / FOA",
      "Submission deadline",
      "Eligibility (institution type)",
      "Geographic focus",
      "Thematic area",
      "Maximum award size",
      "Cost-share requirement",
      "Lead organization eligibility",
      "Partner requirement",
      "Submission portal",
      "Internal decision deadline",
      "Responsible staff",
      "Status",
    ],
  },
  {
    id: "screening",
    number: 2,
    title: "Opportunity Screening",
    purpose: "Score against 10 weighted criteria (1–5). Total drives the decision.",
    bullets: [
      "Mission alignment",
      "Eligibility",
      "Funding size vs. capacity",
      "Deadline feasibility",
      "Partnership requirement",
      "Compliance risk",
      "Staff capacity",
      "Budget feasibility",
      "Strategic value",
      "Likelihood of success",
    ],
  },
  {
    id: "concept",
    number: 3,
    title: "Concept Note Approval",
    purpose: "1–2 page concept note approved by ED before committing proposal effort.",
    fields: [
      "Title",
      "Problem statement",
      "Target population",
      "Geography",
      "Objectives",
      "Activities",
      "Outcomes",
      "Estimated budget",
      "Partners",
      "Donor fit",
      "Risks",
    ],
  },
  {
    id: "proposal",
    number: 4,
    title: "Proposal Development",
    purpose: "Build the full submission package against donor solicitation.",
    bullets: [
      "Technical narrative",
      "Workplan",
      "M&E plan",
      "Budget",
      "Budget justification",
      "Capacity statement",
      "CVs / biosketches",
      "Letters of support",
      "Facilities & resources",
      "Compliance attachments",
      "Board authorization (where required)",
    ],
  },
  {
    id: "review",
    number: 5,
    title: "Internal Review",
    purpose: "Five-track institutional review before submission.",
    bullets: [
      "Technical review (PI peer)",
      "Budget review (Finance)",
      "Compliance review (RSO)",
      "Institutional review (ED)",
      "Final authorization (AOR sign-off)",
    ],
  },
  {
    id: "submission",
    number: 6,
    title: "Submission",
    purpose: "Only authorized users submit. Final ED approval is mandatory.",
    bullets: [
      "Submit 24–48h before deadline",
      "Capture portal receipts",
      "Export final PDF for records",
      "Store in Active Proposals folder",
    ],
  },
  {
    id: "award",
    number: 7,
    title: "Award Setup",
    purpose: "Stand up the grant file the day notice of award arrives.",
    bullets: [
      "Create grant file",
      "Review agreement and terms",
      "Log donor deadlines and reports",
      "Budget control sheet",
      "Project code in finance system",
      "Kickoff meeting",
      "Deliverables register",
      "Compliance checklist",
    ],
  },
  {
    id: "postaward",
    number: 8,
    title: "Post-Award Management",
    purpose: "Run the project to plan with controls and audit-ready records.",
    bullets: [
      "Expense tracking",
      "Deliverables tracking",
      "Procurement records",
      "Subrecipient monitoring",
      "Timesheets",
      "Donor reports (technical + financial)",
      "Quarterly risk reviews",
      "Donor communications log",
    ],
  },
  {
    id: "closeout",
    number: 9,
    title: "Closeout",
    purpose: "Close the award cleanly and capture institutional learning.",
    bullets: [
      "Final technical report",
      "Final financial report",
      "Asset inventory",
      "Subrecipient closeout",
      "External evaluation (where applicable)",
      "Lessons learned write-up",
      "Donor closeout confirmation",
    ],
  },
];

export const SCREENING_CRITERIA = [
  { id: "mission", label: "Mission alignment" },
  { id: "eligibility", label: "Eligibility" },
  { id: "size", label: "Funding size fit" },
  { id: "deadline", label: "Deadline feasibility" },
  { id: "partnership", label: "Partnership requirement" },
  { id: "compliance", label: "Compliance risk (inverse)" },
  { id: "capacity", label: "Staff capacity" },
  { id: "budget", label: "Budget feasibility" },
  { id: "strategic", label: "Strategic value" },
  { id: "win", label: "Likelihood of success" },
] as const;

export type Proposal = {
  id: string;
  title: string;
  donor: string;
  pi: string;
  amountUSD: number;
  stage: typeof LIFECYCLE_STAGES[number]["id"];
  status: Status;
  deadline: string;
  theme: string;
};

export const PROPOSALS: Proposal[] = [
  {
    id: "P-2025-014",
    title: "Climate-Health Surveillance in Coastal Ghana",
    donor: "Wellcome",
    pi: "Dr. A. Mensah",
    amountUSD: 1_850_000,
    stage: "proposal",
    status: "In Progress",
    deadline: "2025-12-08",
    theme: "Climate-health",
  },
  {
    id: "P-2025-015",
    title: "STEM Teacher Fellows: US–Ghana Exchange",
    donor: "NSF",
    pi: "Dr. K. Owusu",
    amountUSD: 950_000,
    stage: "review",
    status: "Under Review",
    deadline: "2025-11-21",
    theme: "STEM education",
  },
  {
    id: "P-2025-016",
    title: "Public Health Research Capacity (EDCTP3)",
    donor: "EDCTP3",
    pi: "Dr. N. Boateng",
    amountUSD: 2_400_000,
    stage: "concept",
    status: "Pending",
    deadline: "2026-01-15",
    theme: "Public health",
  },
  {
    id: "P-2025-017",
    title: "AI Curriculum for Under-Resourced Schools",
    donor: "USAID",
    pi: "Dr. M. Asante",
    amountUSD: 1_200_000,
    stage: "submission",
    status: "Submitted",
    deadline: "2025-10-30",
    theme: "STEM education",
  },
  {
    id: "P-2025-018",
    title: "Maternal Mental Health in Accra Periphery",
    donor: "Wellcome",
    pi: "Dr. F. Adjei",
    amountUSD: 780_000,
    stage: "award",
    status: "Awarded",
    deadline: "2025-09-01",
    theme: "Mental health",
  },
  {
    id: "P-2025-019",
    title: "Heat-Health Early Warning Pilot",
    donor: "NIH Fogarty",
    pi: "Dr. A. Mensah",
    amountUSD: 540_000,
    stage: "identification",
    status: "Pending",
    deadline: "2026-02-12",
    theme: "Climate-health",
  },
  {
    id: "P-2025-020",
    title: "Water Quality Citizen Science (Volta Basin)",
    donor: "DANIDA",
    pi: "Dr. S. Kpodo",
    amountUSD: 670_000,
    stage: "screening",
    status: "Pending",
    deadline: "2026-03-05",
    theme: "WASH",
  },
];

// ============================================================
// PILLAR 2 — IT / DIGITAL INFRASTRUCTURE
// ============================================================

export const ACCESS_CATEGORIES = [
  "Executive Leadership",
  "RSO Staff",
  "Finance",
  "PIs",
  "Project Staff",
  "Volunteers",
  "External Partners",
  "Board Members",
  "Donor Reviewers",
] as const;

export const REPOSITORY_FOLDERS = [
  { name: "Governance Documents", desc: "Charter, bylaws, board minutes, policies" },
  { name: "Donor Registrations", desc: "SAM, Grants.gov, eRA Commons, EU PIC, etc." },
  { name: "Grant Opportunities", desc: "Active solicitations under review" },
  { name: "Proposal Development", desc: "Drafts, workplans, budgets per opportunity" },
  { name: "Active Awards", desc: "Award agreements, deliverables, reports" },
  { name: "Closed Awards", desc: "Archived projects, final reports, lessons" },
  { name: "Partner Documents", desc: "MoUs, due diligence, subrecipient packets" },
  { name: "Compliance Policies", desc: "COI, anti-fraud, data protection, ethics" },
  { name: "Training & Onboarding", desc: "Modules, quizzes, certificates" },
  { name: "Templates & Forms", desc: "Reusable proposal & operational forms" },
  { name: "Audit Records", desc: "Internal & external audit trails" },
  { name: "Board Approvals", desc: "Signed authorizations" },
];

export type Permission = "Full" | "Edit" | "View" | "Module-Only" | "None";

export const ACCESS_MATRIX: Array<{
  resource: string;
  rights: Record<string, Permission>;
}> = [
  {
    resource: "Governance Documents",
    rights: { ED: "Full", RSO: "Edit", Finance: "View", PIs: "View", Project: "View", Volunteers: "None", Partners: "None", Board: "View", IT: "Full" },
  },
  {
    resource: "Donor Registrations",
    rights: { ED: "Full", RSO: "Edit", Finance: "Edit", PIs: "View", Project: "None", Volunteers: "None", Partners: "None", Board: "View", IT: "Full" },
  },
  {
    resource: "Grant Opportunities",
    rights: { ED: "Edit", RSO: "Edit", Finance: "View", PIs: "Edit", Project: "View", Volunteers: "None", Partners: "View", Board: "View", IT: "Full" },
  },
  {
    resource: "Proposal Development",
    rights: { ED: "Edit", RSO: "Edit", Finance: "Edit", PIs: "Edit", Project: "Edit", Volunteers: "None", Partners: "View", Board: "View", IT: "Full" },
  },
  {
    resource: "Active Awards",
    rights: { ED: "Edit", RSO: "Edit", Finance: "Edit", PIs: "Edit", Project: "Edit", Volunteers: "None", Partners: "View", Board: "View", IT: "Full" },
  },
  {
    resource: "Financial Records",
    rights: { ED: "Edit", RSO: "View", Finance: "Full", PIs: "View", Project: "None", Volunteers: "None", Partners: "None", Board: "View", IT: "Full" },
  },
  {
    resource: "Training Modules",
    rights: { ED: "View", RSO: "Edit", Finance: "View", PIs: "View", Project: "View", Volunteers: "Module-Only", Partners: "Module-Only", Board: "View", IT: "Full" },
  },
  {
    resource: "Partner Documents",
    rights: { ED: "Edit", RSO: "Edit", Finance: "View", PIs: "View", Project: "None", Volunteers: "None", Partners: "View", Board: "View", IT: "Full" },
  },
  {
    resource: "Audit Records",
    rights: { ED: "View", RSO: "Edit", Finance: "Edit", PIs: "None", Project: "None", Volunteers: "None", Partners: "None", Board: "View", IT: "Full" },
  },
];

export const ACCESS_GROUPS = ["ED", "RSO", "Finance", "PIs", "Project", "Volunteers", "Partners", "Board", "IT"];

export const TRAINING_PLATFORMS = [
  { name: "Moodle", note: "Open-source LMS, full SCORM support, self-hosted" },
  { name: "TalentLMS", note: "Cloud LMS, fast setup, certificate workflows" },
  { name: "LearnDash", note: "WordPress LMS, content monetization options" },
  { name: "Google Classroom", note: "Free, lightweight, basic LMS" },
  { name: "Articulate 360", note: "Authoring suite for SCORM modules" },
  { name: "Vyond / Powtoon / Canva Video", note: "Short instructional videos" },
];

export const SECURITY_CHECKLIST = [
  { item: "Multi-factor authentication (MFA) enforced", category: "Identity" },
  { item: "Strong password policy (16+ chars, rotation)", category: "Identity" },
  { item: "Role-based access control (RBAC)", category: "Identity" },
  { item: "Quarterly access review", category: "Governance" },
  { item: "Annual cybersecurity training", category: "Training" },
  { item: "Automated daily backups + offsite copy", category: "Resilience" },
  { item: "Audit logs retained for 12+ months", category: "Compliance" },
  { item: "Version control on all proposal documents", category: "Compliance" },
  { item: "Exit checklist (account deprovisioning)", category: "Identity" },
  { item: "Confidentiality agreement on file", category: "Governance" },
];

// ============================================================
// PILLAR 3 — TRAINING / ONBOARDING
// ============================================================

export const ONBOARDING_STEPS = [
  {
    n: 1,
    title: "Application & Role Assignment",
    detail: "Name, email, role, department, supervisor, country, project assignment, access level requested.",
  },
  {
    n: 2,
    title: "Confidentiality & Ethics Agreement",
    detail: "Confidentiality, conflict-of-interest disclosure, data protection, grant compliance acknowledgment, anti-fraud/anti-corruption acknowledgment.",
  },
  {
    n: 3,
    title: "Complete 10 Training Modules",
    detail: "Self-paced video + reading + assignment per module. Tracked via LMS.",
  },
  {
    n: 4,
    title: "Final Assessment",
    detail: "Recommended passing score: 80%.",
  },
  {
    n: 5,
    title: "Access Approval",
    detail: "Training Coordinator → Director RSO → IT Administrator.",
  },
  {
    n: 6,
    title: "Account Creation",
    detail: "IT provisions accounts and assigns role-based permissions.",
  },
  {
    n: 7,
    title: "Annual Refresher",
    detail: "Renewal modules, COI re-disclosure, access re-certification.",
  },
];

export type LearnerStatus = "Complete" | "In Progress" | "Not Started" | "Pending";

export const LEARNERS: Array<{
  id: string;
  name: string;
  role: string;
  modulesComplete: number;
  quizScore: number | null;
  certified: boolean;
  status: LearnerStatus;
}> = [
  { id: "L-001", name: "Akosua Mensah", role: "PI — Climate-Health", modulesComplete: 10, quizScore: 94, certified: true, status: "Complete" },
  { id: "L-002", name: "Kwame Owusu", role: "PI — STEM Education", modulesComplete: 10, quizScore: 88, certified: true, status: "Complete" },
  { id: "L-003", name: "Nana Boateng", role: "Research Director", modulesComplete: 10, quizScore: 92, certified: true, status: "Complete" },
  { id: "L-004", name: "Mariama Asante", role: "Grants Manager", modulesComplete: 9, quizScore: null, certified: false, status: "In Progress" },
  { id: "L-005", name: "Felicia Adjei", role: "Project Staff", modulesComplete: 7, quizScore: null, certified: false, status: "In Progress" },
  { id: "L-006", name: "Sena Kpodo", role: "Finance Officer", modulesComplete: 10, quizScore: 76, certified: false, status: "Pending" },
  { id: "L-007", name: "John Lartey", role: "IT Administrator", modulesComplete: 10, quizScore: 96, certified: true, status: "Complete" },
  { id: "L-008", name: "Esi Tetteh", role: "Volunteer", modulesComplete: 3, quizScore: null, certified: false, status: "In Progress" },
  { id: "L-009", name: "Daniel Quao", role: "Partner — Ohio State U.", modulesComplete: 0, quizScore: null, certified: false, status: "Not Started" },
  { id: "L-010", name: "Grace Anim", role: "Onboarding Coordinator", modulesComplete: 10, quizScore: 98, certified: true, status: "Complete" },
];

// ============================================================
// DONOR REGISTRATION TRACKER
// ============================================================

export type DonorRegStatus = "Active" | "Pending" | "In Progress" | "Renewal Due" | "Not Started" | "Blocked" | "Complete";

export type DonorRegistration = {
  id: string;
  step: number;
  system: string;
  purpose: string;
  required: string;
  status: DonorRegStatus;
  officer: string;
  renewal: string;
  action: "Checklist" | "Step-by-step guide" | "Guide";
  dependencies?: string[];
  roadmapNote?: string;
  externalUrl?: string;
  sop?: string[];
  notes?: string;
};

export const DONOR_REGISTRATIONS: DonorRegistration[] = [
  {
    id: "institutional-file",
    step: 1,
    system: "Institutional registration file",
    purpose: "Master readiness packet for every donor portal and due-diligence request.",
    required: "EIN · bylaws · board resolution · grants@cstemglobal.org · all policy docs.",
    status: "Not Started",
    officer: "Executive Director / Grants Manager",
    renewal: "Quarterly document review",
    action: "Checklist",
    dependencies: [],
    roadmapNote: "Build once, reuse across SAM.gov, USAID, EU, Wellcome, DANIDA, and partner due diligence.",
    sop: [
      "Create official grants@cstemglobal.org inbox and backup access owner",
      "Collect EIN letter, bylaws, incorporation records, board resolution, and authorized-official record",
      "Assemble policy set: finance, procurement, COI, data protection, safeguarding, anti-fraud, anti-trafficking",
      "Create a legal-name and address consistency sheet for every donor portal",
      "Store the file in GAIOS under Donor Registrations / Institutional Registration File",
    ],
    notes: "This is the readiness foundation. Several donor registrations can start without it, but the file prevents inconsistent legal, governance, and policy records.",
  },
  {
    id: "sam",
    step: 2,
    system: "SAM.gov",
    purpose: "UEI registration required for all U.S. federal grants.",
    required: "EIN, legal name, bank info, authorized official, Login.gov account.",
    status: "Not Started",
    officer: "Executive Director / Grants Manager",
    renewal: "Annual",
    action: "Step-by-step guide",
    dependencies: ["Institutional registration file"],
    roadmapNote: "Start here for U.S. federal readiness. Grants.gov, eRA Commons, USAID, and CAGE depend on SAM/UEI.",
    externalUrl: "https://sam.gov/content/entity-registration",
    sop: [
      "Confirm legal entity name matches IRS records",
      "Obtain EIN and bank account verification letter",
      "Designate Entity Administrator and authorized signer",
      "Submit SAM.gov registration; UEI is issued at completion",
      "Set 12-month renewal reminder",
    ],
    notes: "SAM is the entry point for every U.S. federal registration. UEI replaces the old DUNS number.",
  },
  {
    id: "grantsgov",
    step: 3,
    system: "Grants.gov",
    purpose: "Federal grant submissions portal.",
    required: "Active SAM.gov registration and UEI.",
    status: "Blocked",
    officer: "Grants Manager",
    renewal: "Quarterly access review",
    action: "Guide",
    dependencies: ["SAM.gov — UEI registration"],
    roadmapNote: "Blocked until SAM.gov is active and the EBiz Point of Contact can assign Authorized Organization Representative roles.",
    externalUrl: "https://www.grants.gov/applicants/applicant-registration",
    sop: [
      "Register E-Business Point of Contact (EBiz POC) in SAM",
      "Have EBiz POC authorize AOR (Authorized Org Rep)",
      "Each PI registers an Individual Account",
      "Use Workspace for collaborative submissions",
    ],
  },
  {
    id: "era",
    step: 4,
    system: "eRA Commons",
    purpose: "NIH submissions and post-award management.",
    required: "SAM/UEI and Signing Official role.",
    status: "Blocked",
    officer: "Director, RSO",
    renewal: "Annual",
    action: "Guide",
    dependencies: ["SAM.gov — UEI registration", "Grants.gov"],
    roadmapNote: "Blocked until SAM/UEI exists. The institutional account must be created by an official authorized to legally bind CSTEM Global.",
    externalUrl: "https://public.era.nih.gov/commons/",
    sop: [
      "Signing Official requests new institutional account via eRA",
      "Provide UEI, institutional profile, and authorized signer",
      "Add accounts for PIs, AOs, ASSTs",
      "Link to Grants.gov Workspace for NIH submissions",
    ],
    notes: "eRA Commons requires the UEI and an Authorized Business Official — start with SAM.gov.",
  },
  {
    id: "cage",
    step: 5,
    system: "CAGE / NCAGE",
    purpose: "Entity identification for federal and foreign systems.",
    required: "CAGE via SAM for U.S. entity; NCAGE for CSTEM-Ghana affiliate.",
    status: "Blocked",
    officer: "Grants Manager",
    renewal: "Annual",
    action: "Guide",
    dependencies: ["SAM.gov — UEI registration"],
    roadmapNote: "U.S. CAGE should be issued through SAM.gov. If CSTEM-Ghana registers separately, plan an NCAGE path.",
    notes: "CAGE is issued automatically by SAM for U.S. entities; NCAGE is the international equivalent.",
  },
  {
    id: "usaid",
    step: 6,
    system: "USAID partner readiness",
    purpose: "Development and humanitarian funding readiness.",
    required: "Capability statement, anti-trafficking policy, safeguarding and compliance package.",
    status: "Not Started",
    officer: "Executive Director / Compliance Officer",
    renewal: "Per opportunity",
    action: "Guide",
    dependencies: ["Institutional registration file", "SAM.gov — UEI registration"],
    roadmapNote: "Best initial strategy: prepare as a subrecipient or consortium partner while building audited financial history.",
    externalUrl: "https://sam.gov/content/entity-registration",
    sop: [
      "Maintain active SAM and current UEI",
      "Prepare organizational capability statement",
      "Prepare anti-trafficking, safeguarding, procurement, COI, and financial management policies",
      "Assemble compliance package and partner due-diligence responses",
      "Decide prime vs. subrecipient strategy per opportunity",
    ],
  },
  {
    id: "eu-pic",
    step: 7,
    system: "EU Funding & Tenders Portal (PIC)",
    purpose: "EU grants and Horizon Europe participation with 9-digit Participant ID.",
    required: "EU Login account, legal entity data, validation documents; independent of SAM.",
    status: "Not Started",
    officer: "Grants Manager",
    renewal: "Annual",
    action: "Guide",
    dependencies: ["Institutional registration file"],
    roadmapNote: "Independent of SAM.gov. Completion creates the PIC used by Horizon Europe and EDCTP3.",
    externalUrl: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/how-to-participate/participant-register",
    sop: [
      "Create EU Login account for institutional contact",
      "Search for an existing CSTEM Global legal entity record",
      "Register legal entity in Participant Register",
      "Upload legal entity supporting documents",
      "Receive and store the 9-digit Participant Identification Code",
    ],
  },
  {
    id: "edctp",
    step: 8,
    system: "EDCTP / Global Health EDCTP3",
    purpose: "Africa-centered global health and research-capacity funding.",
    required: "EU PIC, Horizon Europe alignment, African consortium partners.",
    status: "Not Started",
    officer: "Research Director",
    renewal: "Per call",
    action: "Guide",
    dependencies: ["EU Funding & Tenders Portal (PIC)", "Research partner roster"],
    roadmapNote: "Prepare partner map early. EDCTP applications are strongly consortium and Africa-research-capacity oriented.",
    externalUrl: "https://www.global-health-edctp3.europa.eu/funding-opportunities_en",
    sop: [
      "Confirm institutional PIC active",
      "Identify African and European partners",
      "Prepare ethics, data-management, and community-engagement documents",
      "Map call thematic priorities to CSTEM research portfolio",
      "Submit through the EU-linked call process",
    ],
  },
  {
    id: "wellcome",
    step: 9,
    system: "Wellcome Trust",
    purpose: "Health, climate-health, infectious disease, and mental health research.",
    required: "Institutional profile, research capacity, ethics and safeguarding statements.",
    status: "Not Started",
    officer: "Research Director",
    renewal: "Per opportunity",
    action: "Guide",
    dependencies: ["Institutional registration file", "Research ethics statement"],
    roadmapNote: "Position CSTEM where sustainability, health, climate, and communities intersect.",
    externalUrl: "https://wellcome.org/grant-funding",
    sop: [
      "Create Wellcome organizational profile",
      "Document research capacity and prior outputs",
      "Prepare ethics, safeguarding, and data-sharing statements",
      "Identify eligible lead partner or host PI for each scheme",
      "Submit preliminary application per scheme",
    ],
  },
  {
    id: "danida",
    step: 10,
    system: "DANIDA (Denmark)",
    purpose: "Partnership-based development research with development outcomes focus.",
    required: "Danish institution, partner due diligence, selected-country alignment.",
    status: "Not Started",
    officer: "Partnerships Officer",
    renewal: "Per call",
    action: "Guide",
    dependencies: ["Institutional registration file", "Danish partner"],
    roadmapNote: "Plan partnership cultivation before the call. A Danish institution is typically central to the application path.",
    externalUrl: "https://dfcentre.com/research/calls/",
    sop: [
      "Identify eligible Danish lead institution",
      "Complete partner due-diligence questionnaire",
      "Align with Danida thematic windows and selected countries",
      "Prepare development outcomes and capacity-strengthening rationale",
      "Submit through Danida Fellowship Centre call portal",
    ],
  },
];

// ============================================================
// CURRICULUM — 10 MODULES
// ============================================================

export type Module = {
  n: number;
  title: string;
  objectives: string[];
  topics: string[];
  assignment: string;
};

export const MODULES: Module[] = [
  {
    n: 1,
    title: "Introduction to CSTEM Global & GAIOS",
    objectives: [
      "Understand the CSTEM Global mission",
      "Know GAIOS pillars and structure",
      "Identify your role and responsibilities",
    ],
    topics: ["Mission & values", "System purpose", "Three pillars", "Role overview", "RSO function", "Lifecycle overview", "Access rules", "Ethics", "Acknowledgment form"],
    assignment: "Sign the GAIOS acknowledgment form and submit role-fit reflection (250 words).",
  },
  {
    n: 2,
    title: "Donor Registration & Institutional Readiness",
    objectives: [
      "Map the donor registration landscape",
      "Identify what CSTEM must hold to be eligible",
      "Read the donor tracker",
    ],
    topics: ["SAM.gov / UEI", "Grants.gov", "eRA Commons", "EU PIC", "USAID", "Wellcome", "DANIDA", "EDCTP", "Legal name consistency", "Donor profiles", "Tracker walkthrough"],
    assignment: "Build a mock donor-registration checklist for one assigned donor.",
  },
  {
    n: 3,
    title: "Identifying Funding Opportunities",
    objectives: [
      "Use major opportunity databases",
      "Apply mission-fit and eligibility filters",
    ],
    topics: ["Grants.gov", "NIH", "EU portal", "USAID", "Foundations", "Mission alignment", "Eligibility", "Deadlines"],
    assignment: "Enter one new opportunity into the GAIOS opportunity tracker.",
  },
  {
    n: 4,
    title: "Concept Notes & Letters of Intent",
    objectives: [
      "Draft a clear, fundable concept note",
      "Convert a concept into an LOI",
    ],
    topics: ["Problem statement", "Objectives", "Theory of change", "Geography", "Beneficiaries", "Estimated budget", "Donor alignment", "LOI structure"],
    assignment: "Write a one-page concept note for a CSTEM-relevant problem.",
  },
  {
    n: 5,
    title: "Proposal Narrative Development",
    objectives: [
      "Structure a full proposal narrative",
      "Tie methods to outcomes",
    ],
    topics: ["Executive summary", "Need statement", "Goals & objectives", "Methods", "Workplan", "Outcomes", "Sustainability", "Capacity statement"],
    assignment: "Draft a proposal outline (≥ 4 sections) for an active opportunity.",
  },
  {
    n: 6,
    title: "Biosketches, CVs & Personnel Documents",
    objectives: [
      "Produce donor-compliant biosketches",
      "Manage key personnel records",
    ],
    topics: ["NIH biosketch", "Donor CV formats", "Roles", "Key personnel", "Consultants", "COI"],
    assignment: "Produce one donor-ready biosketch or CV (NIH or EU format).",
  },
  {
    n: 7,
    title: "Budget Development",
    objectives: [
      "Build a defensible budget from scratch",
      "Apply donor cost categories",
    ],
    topics: ["Personnel", "Fringe", "Consultants", "Travel", "Equipment", "Supplies", "Participant support", "Subawards", "Indirect", "Cost share"],
    assignment: "Build a simple budget (Excel) for a $250k 24-month project.",
  },
  {
    n: 8,
    title: "Budget Justification & Financial Compliance",
    objectives: [
      "Justify every cost line",
      "Apply 2 CFR 200 cost principles",
    ],
    topics: ["Allowable", "Allocable", "Reasonable", "Consistent treatment", "Budget narrative", "Documentation", "Procurement support"],
    assignment: "Write a budget justification matched to your Module 7 budget.",
  },
  {
    n: 9,
    title: "Online Submission Systems",
    objectives: [
      "Submit through major donor portals",
      "Run a clean submission discipline",
    ],
    topics: ["Grants.gov Workspace", "eRA Commons", "EU portal", "USAID portals", "Wellcome systems", "File naming", "Receipts", "Deadline discipline"],
    assignment: "Complete a mock submission checklist for one donor system.",
  },
  {
    n: 10,
    title: "Post-Award Management, Reporting & Closeout",
    objectives: [
      "Stand up an award post-notice",
      "Build a compliance calendar",
    ],
    topics: ["Award review", "Kickoff", "Reporting calendar", "Financial tracking", "Subrecipient monitoring", "Donor communication", "Audit readiness", "Closeout"],
    assignment: "Build a 12-month compliance calendar for a hypothetical $1M USAID award.",
  },
];

export const VIDEO_PLAN = [
  { segment: "Opening title", duration: "10 sec" },
  { segment: "Learning objectives", duration: "30 sec" },
  { segment: "Main teaching", duration: "4–6 min" },
  { segment: "CSTEM example", duration: "1–2 min" },
  { segment: "Key reminder", duration: "30 sec" },
  { segment: "Quiz instructions", duration: "20 sec" },
];

export const COMPLETION_EVIDENCE = [
  "Watch percentage (≥ 95%)",
  "Quiz score (≥ 80%)",
  "Module certificate issued",
  "Completion date logged",
  "Access approved by (name)",
  "Renewal date set",
];

// ============================================================
// FORMS & TEMPLATES
// ============================================================

export const TEMPLATES = [
  { name: "Donor Registration Form", category: "Donor" },
  { name: "Grant Opportunity Screening Form", category: "Lifecycle" },
  { name: "Concept Note Template", category: "Lifecycle" },
  { name: "Proposal Development Checklist", category: "Lifecycle" },
  { name: "Internal Proposal Approval Form", category: "Governance" },
  { name: "Budget Template", category: "Finance" },
  { name: "Budget Justification Template", category: "Finance" },
  { name: "Letter of Support Template", category: "Partnerships" },
  { name: "Biosketch Template", category: "Personnel" },
  { name: "Facilities & Resources Template", category: "Personnel" },
  { name: "Subrecipient Assessment Form", category: "Partnerships" },
  { name: "Conflict of Interest Disclosure", category: "Governance" },
  { name: "Confidentiality Agreement", category: "Governance" },
  { name: "Data Access Request Form", category: "IT" },
  { name: "Grant Closeout Checklist", category: "Lifecycle" },
  { name: "Training Completion Certificate", category: "Training" },
  { name: "IT Access Approval Form", category: "IT" },
];

// ============================================================
// 90-DAY LAUNCH
// ============================================================

export type Phase = {
  range: string;
  title: string;
  tasks: string[];
};

export const LAUNCH_PHASES: Phase[] = [
  {
    range: "Days 1–15",
    title: "Foundation",
    tasks: [
      "Approve GAIOS scope and structure with board",
      "Confirm Executive Director / AOR designation",
      "Stand up Research Support Office",
      "Inventory legal entity data (EIN, legal name, banking)",
      "Select primary document repository platform",
      "Draft governance pack (charter, COI, data protection)",
    ],
  },
  {
    range: "Days 16–30",
    title: "Registration",
    tasks: [
      "Submit SAM.gov registration; obtain UEI",
      "Register Grants.gov AOR and EBiz POC",
      "Open eRA Commons institutional account",
      "Start EU Participant Register / PIC application",
      "Initiate Wellcome, DANIDA, EDCTP organizational profiles",
      "Confirm CAGE/NCAGE coverage",
    ],
  },
  {
    range: "Days 31–45",
    title: "Policy & Templates",
    tasks: [
      "Publish 17 forms & templates (see Templates page)",
      "Approve internal proposal-approval workflow",
      "Approve subrecipient monitoring policy",
      "Lock budget template and indirect-cost policy",
      "Issue Confidentiality & COI agreements org-wide",
    ],
  },
  {
    range: "Days 46–60",
    title: "Training Buildout",
    tasks: [
      "Author 10-module curriculum (text + video)",
      "Produce videos using Vyond / Powtoon / Canva",
      "Configure LMS (Moodle or TalentLMS)",
      "Build module quizzes (≥ 80% pass)",
      "Pilot modules with 3 staff and revise",
    ],
  },
  {
    range: "Days 61–75",
    title: "System Testing",
    tasks: [
      "Run end-to-end mock proposal cycle",
      "Test access provisioning and revocation",
      "Test backup and restore",
      "Run cybersecurity tabletop exercise",
      "Verify all SOP attachments and links",
    ],
  },
  {
    range: "Days 76–90",
    title: "Launch",
    tasks: [
      "Roll training to all staff and key partners",
      "Issue access credentials per certification",
      "Activate live opportunity intake",
      "Publish board-approved GAIOS handbook",
      "Hold launch briefing and donor announcement",
    ],
  },
];

// ============================================================
// DEADLINES
// ============================================================

export const UPCOMING_DEADLINES = [
  { date: "2025-10-30", item: "USAID AI Curriculum submission", type: "Submission", urgency: "high" },
  { date: "2025-11-08", item: "Quarterly access review", type: "Compliance", urgency: "med" },
  { date: "2025-11-21", item: "NSF STEM Teacher Fellows — final internal review", type: "Review", urgency: "high" },
  { date: "2025-12-08", item: "Wellcome Climate-Health submission", type: "Submission", urgency: "high" },
  { date: "2025-12-15", item: "Annual cybersecurity training due", type: "Training", urgency: "med" },
  { date: "2026-01-15", item: "EDCTP3 concept note approval", type: "Concept", urgency: "med" },
  { date: "2026-01-31", item: "SAM.gov renewal", type: "Registration", urgency: "high" },
];

// ============================================================
// KPI / SUMMARY
// ============================================================

export const KPIS = {
  donorRegistrations: { total: DONOR_REGISTRATIONS.length, active: 0, pending: DONOR_REGISTRATIONS.length },
  activeProposals: PROPOSALS.filter((p) => ["proposal", "review", "submission", "concept", "screening", "identification"].includes(p.stage)).length,
  awarded: PROPOSALS.filter((p) => p.status === "Awarded" || p.stage === "award" || p.stage === "postaward").length,
  opportunities: 23,
  trainingCompletion: Math.round((LEARNERS.filter((l) => l.status === "Complete").length / LEARNERS.length) * 100),
  complianceTasks: { open: 4, due: 7 },
  auditReadiness: 72,
  launchProgress: 38,
};
