#!/bin/zsh
# Uses curl for HTTPS (avoids Python SSL cert issues on macOS).
set -eu
cd "$(dirname "$0")/.."

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "Create a token at https://vercel.com/account/tokens (scope: guytechs-projects)"
  echo "DO NOT paste it into any AI chat — just here in Terminal."
  printf "Paste Vercel token: "
  read -rs VERCEL_TOKEN
  echo ""
  export VERCEL_TOKEN
fi

PROJECT_ID="prj_TDqIkr4WWmsS0sqnhhZwQ2EofZ1y"
TEAM_ID="team_AcSfro6CpwPRomqFS9jWEXpF"

# Parse .env into a temp JSON file (so JWT special chars are handled)
python3 - <<'PYEOF' > /tmp/gaios-envs.json
import json, os
result = {}
with open(".env") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        result[k.strip()] = v.strip().strip('"').strip("'")
print(json.dumps(result))
PYEOF

# Get existing envs
EXISTING=$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID")

for key in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DATABASE_URL SESSION_SECRET; do
  # Delete any existing entries for this key
  ids=$(echo "$EXISTING" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(' '.join(e['id'] for e in d.get('envs',[]) if e.get('key')=='$key'))
")
  for id in $ids; do
    curl -sS -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" > /dev/null
  done

  # Build payload with correct value via python (safe JSON encoding)
  type_val="encrypted"
  [ "$key" = "SUPABASE_URL" ] && type_val="plain"

  payload=$(K="$key" T="$type_val" python3 -c "
import json,os,sys
envs = json.load(open('/tmp/gaios-envs.json'))
key = os.environ['K']
if key not in envs:
    sys.exit(99)
print(json.dumps({
  'key': key,
  'value': envs[key],
  'type': os.environ['T'],
  'target': ['production','preview','development']
}))
") || { echo "  SKIP $key: not in .env"; continue; }

  resp=$(curl -sS -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID")

  if echo "$resp" | grep -q '"error"'; then
    msg=$(echo "$resp" | python3 -c "import sys,json;print(json.load(sys.stdin)['error'].get('message','?'))")
    echo "  FAIL $key: $msg"
  else
    valuelen=$(python3 -c "import json;print(len(json.load(open('/tmp/gaios-envs.json')).get('$key','')))")
    echo "  OK   $key uploaded (len=$valuelen)"
  fi
done

rm -f /tmp/gaios-envs.json

echo ""
echo "Triggering redeploy..."
curl -sS -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"gaios","gitSource":{"type":"github","repoId":"1252855600","ref":"main"},"target":"production"}' \
  "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('Deploy started:',d.get('url') or d.get('error'))"
