#!/bin/zsh
# Uploads .env vars to Vercel for the GAIOS project.
# You need to paste a Vercel token when prompted (or export VERCEL_TOKEN first).
# Create a token at: https://vercel.com/account/tokens (scope: guytechs-projects)

set -eu
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd)"; exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "Create a token at https://vercel.com/account/tokens"
  echo "  Scope: guytechs-projects  |  Expiration: 1 day is fine"
  printf "Paste Vercel token: "
  read -r VERCEL_TOKEN
  export VERCEL_TOKEN
fi

PROJECT_ID="prj_TDqIkr4WWmsS0sqnhhZwQ2EofZ1y"
TEAM_ID="team_AcSfro6CpwPRomqFS9jWEXpF"

upload_var() {
  local key="$1" value="$2" type="$3"
  # delete existing
  ids=$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(' '.join(e['id'] for e in d.get('envs',[]) if e.get('key')=='$key'))")
  for id in $ids; do
    curl -sS -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" > /dev/null
  done
  # create new
  payload=$(V="$value" K="$key" T="$type" python3 -c "import json,os;print(json.dumps({'key':os.environ['K'],'value':os.environ['V'],'type':os.environ['T'],'target':['production','preview','development']}))")
  resp=$(curl -sS -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID")
  if echo "$resp" | grep -q '"error"'; then
    echo "  FAIL $key: $(echo "$resp" | python3 -c "import sys,json;print(json.load(sys.stdin)['error'].get('message','?'))")"
  else
    echo "  OK   $key uploaded"
  fi
}

# parse .env and upload each var
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  key="${line%%=*}"
  val="${line#*=}"
  val="${val#\"}"; val="${val%\"}"
  val="${val#\'}"; val="${val%\'}"
  case "$key" in
    SUPABASE_URL) type="plain" ;;
    *) type="encrypted" ;;
  esac
  upload_var "$key" "$val" "$type"
done < .env

echo ""
echo "All done. Triggering redeploy..."
curl -sS -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"gaios","gitSource":{"type":"github","repoId":"1252855600","ref":"main"},"target":"production"}' \
  "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('Deploy started:',d.get('url','error'))"
