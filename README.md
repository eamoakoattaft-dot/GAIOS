# GAIOS

Grant Administration & Impact Operations System for CSTEM Global.

Production-ready web platform to manage grants, donors, proposals, and the full grant lifecycle for nonprofit teams.

- Live app: https://gaios.cstemglobal.org
- State & handoff doc: see [HANDOFF.md](./HANDOFF.md)

## Getting started

```bash
git clone https://github.com/eamoakoattaft-dot/GAIOS.git
cd GAIOS
npm install
cp .env.example .env

cat > client/.env.local <<EOF
VITE_SUPABASE_URL=https://mxixvyvigajojyrabpfe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_
EOF

npm run dev
```

## Stack

React 18 + Vite + TypeScript · Tailwind + shadcn/ui · wouter · @tanstack/react-query · Supabase (Auth + Postgres + Storage) · Drizzle ORM · Vercel

## Auth

Supabase Auth (email/password + Google OAuth). RLS enforces multi-tenant isolation on all 13 tables. See [HANDOFF.md](./HANDOFF.md) for architecture and roadmap.

## License

Private — CSTEM Global.
