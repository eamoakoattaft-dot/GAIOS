#!/bin/zsh
# Fixes Supabase version pin so it works on Node 20 (Vercel Hobby plan cap).
set -eu
cd "$(dirname "$0")/.."
echo "Removing old lockfile and node_modules for supabase-js..."
npm install @supabase/supabase-js@~2.49.4 --save --no-audit --no-fund
echo ""
echo "Committing..."
git add package.json package-lock.json
git commit -m "Pin @supabase/supabase-js to 2.49.x for Node 20 compatibility"
git push origin main
echo ""
echo "Vercel will auto-deploy. Watch: https://vercel.com/guytechs-projects/gaios/deployments"
