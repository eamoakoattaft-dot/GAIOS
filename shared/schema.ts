// GAIOS v1 database schema (Supabase Postgres via Drizzle).
//
// Design notes:
// - `org_id` on every domain table so we can flip on multi-tenant later without a migration.
// - We use Supabase Auth for users. `profiles` mirrors `auth.users` so we can
//   join and enrich (display name, avatar) without querying the auth schema.
// - `memberships` maps a user to an org + role. This is what RLS checks read from.
// - `audit_log` captures actor + target + JSON diff for compliance.
// - Roles come from your existing ROLES constant (client/src/lib/data.ts).

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  date,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

// 8 roles from client/src/lib/data.ts ROLES constant.
export const roleEnum = pgEnum("role", [
  "ed",           // Executive Director / AOR
  "rso",          // Director, Research Support Office
  "gm",           // Grants Manager
  "fco",          // Finance & Compliance Officer
  "pi",           // Principal Investigator
  "reviewer",     // Reviewer / Advisor
  "compliance",   // Compliance Officer
  "board",        // Board Observer
]);

// Lifecycle stage from LIFECYCLE_STAGES (id keys).
export const lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "identification",
  "screening",
  "concept",
  "proposal",
  "review",
  "submission",
  "award",
  "postaward",
  "closeout",
]);

export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "open",
  "screening",
  "pursuing",
  "declined",
  "closed",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "not_started",
  "in_progress",
  "under_review",
  "submitted",
  "awarded",
  "declined",
  "on_hold",
  "withdrawn",
]);

export const donorRegStatusEnum = pgEnum("donor_reg_status", [
  "not_registered",
  "in_progress",
  "registered",
  "expiring_soon",
  "expired",
  "rejected",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "complete",
  "blocked",
  "overdue",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "pending",   // invited, not yet accepted
  "active",
  "suspended",
]);

// ============================================================
// TENANCY & IDENTITY
// ============================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Mirror of auth.users so we can join without crossing schemas.
// The `id` matches auth.users.id (Supabase user UUID).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // FK to auth.users.id (managed by Supabase)
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    invitedByUserId: uuid("invited_by_user_id").references(() => profiles.id),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userOrgUnique: uniqueIndex("memberships_user_org_unique").on(t.userId, t.orgId),
    orgIdx: index("memberships_org_idx").on(t.orgId),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull(),
    token: text("token").notNull().unique(), // random URL-safe token
    invitedByUserId: uuid("invited_by_user_id").notNull().references(() => profiles.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgEmailIdx: index("invitations_org_email_idx").on(t.orgId, t.email),
  }),
);

// ============================================================
// DONORS
// ============================================================

export const donors = pgTable(
  "donors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type"), // e.g. "Federal", "Foundation", "Corporate", "Bilateral"
    country: text("country"),
    website: text("website"),
    portalUrl: text("portal_url"),
    tags: text("tags").array(),
    contact: jsonb("contact").$type<{
      primary?: { name?: string; email?: string; phone?: string; title?: string };
      technical?: { name?: string; email?: string };
    }>(),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("donors_org_idx").on(t.orgId),
    nameIdx: index("donors_name_idx").on(t.name),
  }),
);

export const donorRegistrations = pgTable(
  "donor_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    donorId: uuid("donor_id").notNull().references(() => donors.id, { onDelete: "cascade" }),
    status: donorRegStatusEnum("status").notNull().default("not_registered"),
    accountRef: text("account_ref"),          // donor-side account id / vendor #
    registeredAt: date("registered_at"),
    expiresAt: date("expires_at"),
    requiredDocs: jsonb("required_docs").$type<
      Array<{ name: string; provided: boolean; url?: string }>
    >(),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgDonorIdx: index("donor_reg_org_donor_idx").on(t.orgId, t.donorId),
    expiresIdx: index("donor_reg_expires_idx").on(t.expiresAt),
  }),
);

// ============================================================
// OPPORTUNITIES, SCREENING, PROPOSALS
// ============================================================

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    donorId: uuid("donor_id").references(() => donors.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    foaNumber: text("foa_number"),          // Funding number / FOA
    theme: text("theme"),
    deadline: timestamp("deadline", { withTimezone: true }),
    submissionUrl: text("submission_url"),
    amountMinUsd: numeric("amount_min_usd", { precision: 14, scale: 2 }),
    amountMaxUsd: numeric("amount_max_usd", { precision: 14, scale: 2 }),
    status: opportunityStatusEnum("status").notNull().default("open"),
    stage: lifecycleStageEnum("stage").notNull().default("identification"),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id),
    description: text("description"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("opportunities_org_idx").on(t.orgId),
    deadlineIdx: index("opportunities_deadline_idx").on(t.deadline),
    stageIdx: index("opportunities_stage_idx").on(t.stage),
  }),
);

// Scored screening for an opportunity.
export const screenings = pgTable(
  "screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
    // scores: { mission: 1..5, eligibility: 1..5, ... } — keys match SCREENING_CRITERIA ids
    scores: jsonb("scores").$type<Record<string, number>>().notNull(),
    total: integer("total").notNull(),
    average: numeric("average", { precision: 4, scale: 2 }).notNull(),
    decision: text("decision").notNull(),        // "Pursue" | "Pursue with partner" | "Monitor" | "Do not pursue"
    rationale: text("rationale"),
    scoredByUserId: uuid("scored_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    opportunityIdx: index("screenings_opp_idx").on(t.opportunityId),
  }),
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "set null" }),
    donorId: uuid("donor_id").references(() => donors.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    piUserId: uuid("pi_user_id").references(() => profiles.id),
    piName: text("pi_name"),                     // fallback if PI is external
    amountUsd: numeric("amount_usd", { precision: 14, scale: 2 }),
    stage: lifecycleStageEnum("stage").notNull().default("concept"),
    status: proposalStatusEnum("status").notNull().default("in_progress"),
    theme: text("theme"),
    deadline: timestamp("deadline", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    awardedAmountUsd: numeric("awarded_amount_usd", { precision: 14, scale: 2 }),
    awardedAt: date("awarded_at"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("proposals_org_idx").on(t.orgId),
    stageIdx: index("proposals_stage_idx").on(t.stage),
    deadlineIdx: index("proposals_deadline_idx").on(t.deadline),
  }),
);

// Files uploaded against a proposal (or donor registration if used generically later).
export const proposalFiles = pgTable(
  "proposal_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(), // Supabase Storage object key
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    kind: text("kind"),                          // "narrative", "budget", "loi", "mou", "attachment"
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    proposalIdx: index("proposal_files_proposal_idx").on(t.proposalId),
  }),
);

// ============================================================
// TASKS & NOTIFICATIONS
// ============================================================

// Generic task attached to any subject (opportunity, proposal, donor_registration, etc).
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    subjectKind: text("subject_kind").notNull(), // "opportunity" | "proposal" | "donor_registration" | "general"
    subjectId: uuid("subject_id"),
    title: text("title").notNull(),
    description: text("description"),
    assigneeUserId: uuid("assignee_user_id").references(() => profiles.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatusEnum("status").notNull().default("pending"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("tasks_org_idx").on(t.orgId),
    assigneeDueIdx: index("tasks_assignee_due_idx").on(t.assigneeUserId, t.dueAt),
    subjectIdx: index("tasks_subject_idx").on(t.subjectKind, t.subjectId),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),                // "deadline_soon" | "proposal_status_changed" | "invite" | ...
    title: text("title").notNull(),
    body: text("body"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    url: text("url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId, t.readAt),
  }),
);

// ============================================================
// AUDIT LOG
// ============================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),            // "create" | "update" | "delete" | "status_change" | "login" | ...
    targetKind: text("target_kind").notNull(),   // "opportunity" | "proposal" | "donor" | ...
    targetId: uuid("target_id"),
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgAtIdx: index("audit_log_org_at_idx").on(t.orgId, t.at),
    targetIdx: index("audit_log_target_idx").on(t.targetKind, t.targetId),
  }),
);

// ============================================================
// RELATIONS (for drizzle query API)
// ============================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  donors: many(donors),
  opportunities: many(opportunities),
  proposals: many(proposals),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(profiles, { fields: [memberships.userId], references: [profiles.id] }),
  org: one(organizations, { fields: [memberships.orgId], references: [organizations.id] }),
}));

export const donorsRelations = relations(donors, ({ one, many }) => ({
  org: one(organizations, { fields: [donors.orgId], references: [organizations.id] }),
  registrations: many(donorRegistrations),
  opportunities: many(opportunities),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  org: one(organizations, { fields: [opportunities.orgId], references: [organizations.id] }),
  donor: one(donors, { fields: [opportunities.donorId], references: [donors.id] }),
  owner: one(profiles, { fields: [opportunities.ownerUserId], references: [profiles.id] }),
  screenings: many(screenings),
  proposals: many(proposals),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  org: one(organizations, { fields: [proposals.orgId], references: [organizations.id] }),
  opportunity: one(opportunities, { fields: [proposals.opportunityId], references: [opportunities.id] }),
  donor: one(donors, { fields: [proposals.donorId], references: [donors.id] }),
  pi: one(profiles, { fields: [proposals.piUserId], references: [profiles.id] }),
  files: many(proposalFiles),
}));

// ============================================================
// ZOD INSERT SCHEMAS (for validation at API boundary)
// ============================================================

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  slug: true,
  logoUrl: true,
});

export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScreeningSchema = createInsertSchema(screenings).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================
// INFERRED TYPES
// ============================================================

export type Organization = typeof organizations.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Donor = typeof donors.$inferSelect;
export type DonorRegistration = typeof donorRegistrations.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type Screening = typeof screenings.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type ProposalFile = typeof proposalFiles.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;

export type Role = (typeof roleEnum.enumValues)[number];
export type LifecycleStageId = (typeof lifecycleStageEnum.enumValues)[number];
