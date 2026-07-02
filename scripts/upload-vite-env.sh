#!/usr/bin/env bash
# Push VITE_SUPABASE_* env vars to Vercel (production, preview, development).
# Requires: `vercel login` already done, or VERCEL_TOKEN in your env.
set -euo pipefail

cd "$(dirname "$0")/.."

URL="https://mxixvyvigajojyrabpfe.supabase.co"
KEY="sb_publishable_ZdCynKWNXtE0xA7GMwY0kA_xyKV9AY_"

for env in production preview development; do
  echo ">>> $env"
  # Remove old value if it exists, ignore error if not
  npx vercel env rm VITE_SUPABASE_URL "$env" --yes 2>/dev/null || true
  npx vercel env rm VITE_SUPABASE_ANON_KEY "$env" --yes 2>/dev/null || true

  # Add fresh
  printf "%s" "$URL" | npx vercel env add VITE_SUPABASE_URL "$env"
  printf "%s" "$KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY "$env"
done

echo "Done. Redeploy to pick up the new vars: npx vercel --prod"
