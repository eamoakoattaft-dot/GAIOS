# Supabase — Deployed State

Snapshot of the Supabase backend that powers GAIOS Grant Manager.

- **Project ref**: `mxixvyvigajojyrabpfe`
- **URL**: `https://mxixvyvigajojyrabpfe.supabase.co`
- **Anon (publishable) key**: `sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_`
- **Demo org id**: `b333f317-68b4-4f11-b053-0d8116e3335c` (CSTEM Global)

Everything under this folder is generated from the current live database and can be redeployed onto a fresh Supabase project.

## Layout

```
supabase/
├── README.md
├── functions/
│   ├── send-invite/            (Model A signup / team invite)
│   ├── sync-grants-gov/        (v2 — chains hydrate + score)
│   ├── sync-sam-gov/           (v1 — no-op unless SAM_GOV_API_KEY set)
│   ├── hydrate-grants-gov-details/ (v1 — enriches descriptions + $ ranges)
│   └── score-opportunities/    (v3 rules-v3 — fit_summary + deadline_bucket)
└── migrations/
    ├── 0003_agents_schema.sql       (external_opportunities, agent_* tables, RPC)
    ├── 0004_fiscal_sponsors.sql     (fiscal_sponsors table)
    ├── 0005_pg_cron.sql             (recurring jobs)
    ├── 0006_seed_scoring_config.sql (CSTEM keywords/agencies/NAICS)
    └── 0007_seed_fiscal_sponsors.sql (12 seeded sponsors)
```

Migrations `0000`–`0002` live in the repo root `migrations/` directory (v1 foundation + RLS + `it` role setup) and must be applied first.

## Redeploy on a fresh Supabase project

### 1. Extensions

Enable in Dashboard → Database → Extensions:

- `pgcrypto` (usually on by default — used for `gen_random_uuid()`)
- `pg_cron` (required for `0005_pg_cron.sql`)
- `pg_net` (required for `0005_pg_cron.sql`)

### 2. Apply base migrations (from repo root)

```bash
supabase db push --db-url "$DB_URL"
```

Or run the SQL files in order:

```
migrations/0000_v1_foundation.sql
migrations/0001_supabase_setup.sql
migrations/0002_add_it_role_and_org_setup.sql
supabase/migrations/0003_agents_schema.sql
supabase/migrations/0004_fiscal_sponsors.sql
supabase/migrations/0005_pg_cron.sql
supabase/migrations/0006_seed_scoring_config.sql
supabase/migrations/0007_seed_fiscal_sponsors.sql
```

`0003` depends on tables from `0000` (`organizations`, `opportunities`, `audit_log`, `opportunity_status` enum).

### 3. Deploy edge functions

```bash
supabase functions deploy sync-grants-gov            --no-verify-jwt
supabase functions deploy sync-sam-gov               --no-verify-jwt
supabase functions deploy hydrate-grants-gov-details --no-verify-jwt
supabase functions deploy score-opportunities        --no-verify-jwt
supabase functions deploy send-invite
```

`--no-verify-jwt` is required for the ingest/score functions because pg_cron calls them anonymously with only the publishable key.

### 4. Set function secrets

Only one secret is optional right now:

```bash
supabase secrets set SAM_GOV_API_KEY=<your key>
```

Without it, `sync-sam-gov` records a `skipped` sync run and returns cleanly. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase.

### 5. Kick things off manually (optional)

```bash
curl -X POST \
  -H "content-type: application/json" \
  -H "apikey: sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_" \
  https://<project>.supabase.co/functions/v1/sync-grants-gov \
  -d '{}'
```

The scheduler will then take over on the schedule from `0005_pg_cron.sql`:

| Job                       | Schedule (UTC)      | What it does                                     |
|---------------------------|---------------------|--------------------------------------------------|
| `gaios-sync-grants-gov`   | `5 */6 * * *`       | Fetch + upsert Grants.gov, then chain hydrate+score |
| `gaios-sync-sam-gov`      | `15 */6 * * *`      | Fetch + upsert SAM.gov (skips if key not set)    |
| `gaios-score-opps`        | `30 * * * *`        | Score new rows (skips rows already at `rules-v3`)|
| `gaios-hydrate-backfill`  | `45 3 * * *`        | Pull descriptions for anything still missing     |

## Notes

- All RLS is pinned to the demo org via `public.is_demo_org(org_id)`. Before productionizing for real orgs, rewrite the `_demo_*` policies to check the caller's `auth.uid()` → membership.
- The `apikey` embedded in `0005_pg_cron.sql` is the publishable (anon) key — safe to commit. It is **not** the service role key.
- Scoring is fully rule-based (`rules-v3`). No LLM cost. `scorer_version` is part of the unique key on `agent_recommendations`, so bumping the version transparently re-scores everything on the next `score-opportunities` run.
