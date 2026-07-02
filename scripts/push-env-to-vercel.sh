#!/bin/zsh
# Reads .env in the GAIOS folder and pushes each var to Vercel
# for production, preview, and development targets.
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd)"
  exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "ERROR: Set VERCEL_TOKEN in your shell first."
  echo "  export VERCEL_TOKEN='...'"
  exit 1
fi

PROJECT_ID="prj_TDqIkr4WWmsS0sqnhhZwQ2EofZ1y"
TEAM_ID="team_AcSfro6CpwPRomqFS9jWEXpF"

# Vars we want to upload (name : type)
declare -A VAR_TYPE
VAR_TYPE[SUPABASE_URL]="plain"
VAR_TYPE[SUPABASE_ANON_KEY]="encrypted"
VAR_TYPE[SUPABASE_SERVICE_ROLE_KEY]="encrypted"
VAR_TYPE[DATABASE_URL]="encrypted"
VAR_TYPE[SESSION_SECRET]="encrypted"

# Load .env into associative array without echoing
declare -A VALS
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*) continue ;;
  esac
  key="${line%%=*}"
  val="${line#*=}"
  # strip surrounding quotes if any
  val="${val#\"}"; val="${val%\"}"
  val="${val#\'}"; val="${val%\'}"
  VALS[$key]="$val"
done < .env

for key in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DATABASE_URL SESSION_SECRET; do
  if [ -z "${VALS[$key]:-}" ]; then
    echo "SKIP: $key not in .env"
    continue
  fi
  type="${VAR_TYPE[$key]}"

  # Delete existing var (idempotent)
  existing=$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);
matches=[e['id'] for e in d.get('envs',[]) if e.get('key')=='$key']
print(' '.join(matches))")
  for id in $existing; do
    curl -sS -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" > /dev/null
  done

  # Create new var
  payload=$(python3 -c "
import json,os
print(json.dumps({
  'key': '$key',
  'value': os.environ['V'],
  'type': '$type',
  'target': ['production','preview','development']
}))" V="${VALS[$key]}")

  resp=$(curl -sS -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID")
  echo "$resp" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d:
    print('  FAIL $key:', d['error'].get('message'))
else:
    print('  OK   $key uploaded')
"
done

echo ""
echo "Done. Now trigger a redeploy from Vercel or push a commit."
