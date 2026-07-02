# GAIOS Handoff

Last updated: July 2, 2026
Owner: Emmanuel Amoako-Atta (eamoakoatta.ft@gmail.com)
Organization: CSTEM Global (nonprofit)

Read this first when picking up a new chat.

## What GAIOS is

GAIOS = Grant Administration & Impact Operations System. Web platform for CSTEM Global (2–10 team members) to manage grants, donors, proposals, and the grant lifecycle. Long-term: multi-tenant SaaS with AI agents. Current phase: real MVP.

## Key facts

| Thing | Value |
|---|---|
| Live app | https://gaios.cstemglobal.org |
| Vercel project | `gaios` in team `guytechs-projects` (`prj_TDqIkr4WWmsS0sqnhhZwQ2EofZ1y`) |
| Vercel team ID | `team_AcSfro6CpwPRomqFS9jWEXpF` |
| GitHub repo | https://github.com/eamoakoattaft-dot/GAIOS (main) |
| Local path | `/Users/trumu/Development/GAIOS` |
| Supabase project ref | `mxixvyvigajojyrabpfe` |
| Supabase URL | https://mxixvyvigajojyrabpfe.supabase.co |
| DB host (pooler) | `aws-1-us-west-2.pooler.supabase.com:6543`, user `postgres.mxixvyvigajojyrabpfe` |

## Stack

React 18 + Vite + TypeScript · wouter (hash routing) · shadcn/ui + Tailwind · @tanstack/react-query · Supabase (Auth + Postgres + Storage) · Drizzle ORM · Vercel hosting

## Environment variables

Client — `client/.env.local` + Vercel:
```
VITE_SUPABASE_URL=https://mxixvyvigajojyrabpfe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_
```

Server — root `.env` + Vercel:
```
DATABASE_URL=<postgres pooler URL from Supabase>
SESSION_SECRET=<32-byte hex, stable>
```

## Database (Supabase)

Migrations applied via Supabase MCP connector on July 1, 2026:
- `migrations/0000_v1_foundation.sql` — 13 tables, 7 enums, indexes, FKs
- `migrations/0001_supabase_setup.sql` — profiles→auth.users FK, `on_auth_user_created` trigger, 3 RLS helper functions, RLS on all tables, 21 policies

13 tables (all RLS-enabled, tenant-scoped by `org_id`):
`organizations, profiles, memberships, invitations, donors, donor_registrations, opportunities, screenings, proposals, proposal_files, tasks, notifications, audit_log`

Enums: `role` (ed/rso/gm/fco/pi/reviewer/compliance/board — 8), `lifecycle_stage` (9: identification→closeout), `opportunity_status`, `proposal_status`, `donor_reg_status`, `task_status`, `membership_status`

RLS helpers (SECURITY DEFINER): `is_org_member(uuid)`, `org_role(uuid)`, `is_org_admin(uuid)` (ed/rso only)

Policies: members read own org data + write donors/opportunities/proposals/tasks/files. Admins (ed/rso) manage invitations/memberships/org. Users edit own profile + notifications. `audit_log`: members read, service_role inserts.

Trigger: `on_auth_user_created` auto-creates a `profiles` row on signup.

## Repo layout

```
GAIOS/
├── client/.env.local
├── client/src/
│   ├── App.tsx                     Router + AuthProvider + ProtectedApp
│   ├── components/
│   │   ├── layout.tsx
│   │   ├── protected-route.tsx     <ProtectedApp> gate
│   │   └── ui/
│   ├── lib/
│   │   ├── auth-context.tsx        AuthProvider, useAuth(), useHasRole()
│   │   ├── data.ts                 1054 lines MOCK data
│   │   └── supabase.ts
│   └── pages/
│       ├── overview.tsx            mock
│       ├── grants.tsx              mock
│       ├── donors.tsx              mock
│       ├── login.tsx               REAL auth
│       ├── signup.tsx              REAL auth
│       ├── no-org.tsx              fallback
│       └── ...
├── server/routes.ts                /api/health only
├── server/storage.ts               Drizzle db handle
├── shared/schema.ts                SOURCE OF TRUTH
├── migrations/                     0000 + 0001 APPLIED
├── scripts/upload-vite-env.sh
└── HANDOFF.md
```

## Auth flow

1. `<AuthProvider>` → `supabase.auth.getSession()`
2. No session → `<LoginPage>`
3. Signup → email confirm → `handle_new_user()` creates profile
4. Session cached in `localStorage` (`gaios-auth`)
5. Session but no memberships → `<NoOrgPage>`
6. Session + memberships → `<AppLayout>`, active org in `gaios-active-org`

Exports:
```ts
useAuth() -> { loading, session, user, profile, memberships, activeOrgId, activeRole,
               setActiveOrgId, signInWithPassword, signUpWithPassword,
               signInWithGoogle, signOut, refresh }
useHasRole('ed', 'rso') -> boolean
```

## Google OAuth setup required

- Supabase → Auth → URL Configuration: Site URL = `https://gaios.cstemglobal.org`; Redirect URLs = `https://gaios.cstemglobal.org/`, `http://localhost:5000/`
- Auth → Providers → Google: paste Client ID + Secret from Google Cloud Console

## Roadmap

| # | Task | Status |
|---|---|---|
| 1 | v1 data model + Drizzle schema | done |
| 2 | Supabase migrations applied | done |
| 3 | Supabase Auth wired | done |
| 4 | Login/signup pages | done |
| 5 | RLS policies | done |
| 6 | Team invite flow | NEXT |
| 7 | Protected routes | done |
| 8 | Role-based UI | hook exists, UI not gated |

REAL: auth, profiles, all 13 tables + RLS (empty), `/api/health`
MOCK: overview, grants, donors, IT, training, curriculum, agents, templates, launch (all read `client/src/lib/data.ts`)

Migration order: Overview → Donors → Grants → Proposals → Tasks → Notifications.

## Invite flow (Task #6, up next)

- First user has 0 memberships → `<NoOrgPage>`. Need "Create your organization" flow that creates org + `membership(role=ed)`.
- `/invite` page for admins → email + role → creates `invitations` row with token + 7-day expiry
- Send email (Resend free tier or Supabase built-in)
- `/accept-invite?token=xxx` → creates `memberships` row
- Wire `useHasRole()` into admin sidebar items, Invite button, delete/edit gates.

## Gotchas

- `pc bash` in Comet is scoped away from `.git` and `.env` — commits + env writes must be done in Terminal
- Vercel API not reachable from sandbox — use `scripts/upload-vite-env.sh` locally
- Legacy `scripts/apply-migrations.sh` deprecated — use Supabase MCP `apply_migration` from chat
- `server/storage.ts` just exports `db` — add data-access methods as modules get wired

## Security TODO

1. DB password `Wegoblowsoon1@` was pasted in chat — reset in Supabase, update Vercel `DATABASE_URL`
2. Two Vercel tokens pasted earlier — revoke at vercel.com/account/tokens

## Connectors in use

| Connector | Status | Use |
|---|---|---|
| supabase | connected | Migrations, SQL, project mgmt (direct from chat) |
| vercel | connected | bash + `api_credentials=["vercel"]` |
| github | connected | `gh` CLI + `api_credentials=["github"]` |
| pc | connected | User's Mac (Qua's MacBook Neo) |
| gcal, finance | connected | Unused for this project |

## Design decisions locked

- Tier 1 real MVP, not SaaS yet, not AI-first
- Multi-tenant from day 1 (`org_id` on every table, RLS)
- 8 roles, 9 lifecycle stages match CSTEM Global workflow
- Free-tier only (Supabase free + Vercel hobby + Resend free)
- Hash routing (simpler Vercel config)
- Page-by-page migration keeps mockup demoable

## Owner

Emmanuel Amoako-Atta (Qua) — Corpus Christi, TX. US Air Force logistics + CSTEM Global grant admin + full-stack dev. America/New_York. Advanced technical.
