#!/usr/bin/env python3
"""Validate and repair .env. Regenerates SESSION_SECRET if malformed.
Reports any structural issues without printing secret values."""
import re, secrets, sys
from pathlib import Path

env_path = Path("/Users/trumu/Development/GAIOS/.env")
lines = env_path.read_text().splitlines()
required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "SESSION_SECRET"]

# Parse existing values, dropping malformed lines
found = {}
malformed = []
for line in lines:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    m = re.match(r"^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$", line)
    if not m:
        malformed.append(line)
        continue
    key, val = m.group(1), m.group(2).strip()
    # Strip surrounding quotes
    if len(val) >= 2 and val[0] in "'\"" and val[-1] == val[0]:
        val = val[1:-1]
    # Reject stub values that look like unrendered shell
    if key == "SESSION_SECRET" and (val.startswith("rand") or " " in val or len(val) < 32):
        val = secrets.token_hex(32)
        print("  Regenerated SESSION_SECRET (was malformed)")
    found[key] = val

# Report missing
missing = [k for k in required if k not in found]
if missing:
    print("  MISSING:", missing)

# Validate DATABASE_URL
if "DATABASE_URL" in found:
    m = re.match(r"postgres(?:ql)?://([^:]+):([^@]*)@([^/]+)/(.+)", found["DATABASE_URL"])
    if not m:
        print("  DATABASE_URL structure invalid")
    else:
        user, pw, host, db = m.groups()
        unsafe = [c for c in "@#%?/&:" if c in pw]
        if unsafe:
            print("  DATABASE_URL password has URL-unsafe chars:", unsafe)
        if "[" in pw or "]" in pw:
            print("  DATABASE_URL password still contains placeholder brackets")
        print(f"  DATABASE_URL ok (user={user}, host={host}, db={db}, pw_len={len(pw)})")

# Rewrite cleaned .env, preserving comments
new_lines = []
kept_keys = set()
for line in lines:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        new_lines.append(line)
        continue
    m = re.match(r"^([A-Z_][A-Z0-9_]*)\s*=", line)
    if not m:
        continue  # drop malformed
    key = m.group(1)
    if key in found and key not in kept_keys:
        new_lines.append(f"{key}={found[key]}")
        kept_keys.add(key)

# Add any required keys not seen
for k in required:
    if k not in kept_keys and k in found:
        new_lines.append(f"{k}={found[k]}")
        kept_keys.add(k)

env_path.write_text("\n".join(new_lines) + "\n")

print("\nFinal .env structure:")
for idx, line in enumerate(env_path.read_text().splitlines(), 1):
    if not line or line.startswith("#"):
        print(f"  {idx}: (blank/comment)")
    elif "=" in line:
        k, v = line.split("=", 1)
        print(f"  {idx}: {k}=<len={len(v)}>")
    else:
        print(f"  {idx}: MALFORMED")
