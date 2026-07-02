#!/bin/zsh
set -eu
cd "$(dirname "$0")/.."

set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set. Check .env"
  exit 1
fi

echo "==> Applying 0000_v1_foundation.sql (tables + enums + indexes)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0000_v1_foundation.sql

echo ""
echo "==> Applying 0001_supabase_setup.sql (auth trigger + FKs + RLS)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0001_supabase_setup.sql

echo ""
echo "==> Verifying tables:"
psql "$DATABASE_URL" -c "\dt public.*"

echo ""
echo "==> Verifying RLS enabled:"
psql "$DATABASE_URL" -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

echo ""
echo "Done."
