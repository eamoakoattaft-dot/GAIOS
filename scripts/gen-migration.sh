#!/bin/zsh
set -eu
cd "$(dirname "$0")/.."

# Load DATABASE_URL from .env
set -a
source .env
set +a

echo "Generating migration SQL from schema..."
npx drizzle-kit generate --name v1_foundation

echo ""
echo "Migration files:"
ls -la migrations/ 2>/dev/null || ls -la drizzle/ 2>/dev/null || echo "no migration folder"
