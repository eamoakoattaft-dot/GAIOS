#!/usr/bin/env python3
# Merges the malformed SESSION_SECRET line and the orphan hex value on the
# next line into one proper SESSION_SECRET=<hex> line.
import re, os
from pathlib import Path

path = Path("/Users/trumu/Development/GAIOS/.env")
lines = path.read_text().splitlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("SESSION_SECRET"):
        # Check if next line is an orphan hex value (no =)
        if i + 1 < len(lines) and "=" not in lines[i+1] and re.fullmatch(r"[0-9a-fA-F]{16,128}", lines[i+1].strip()):
            hex_val = lines[i+1].strip()
            out.append(f"SESSION_SECRET={hex_val}")
            i += 2
            continue
        # Otherwise regenerate a proper one
        import secrets
        out.append(f"SESSION_SECRET={secrets.token_hex(32)}")
        i += 1
        continue
    out.append(line)
    i += 1

path.write_text("\n".join(out) + "\n")

# Print sanitized summary
print("Fixed .env. Now:")
for idx, line in enumerate(path.read_text().splitlines(), 1):
    if not line or line.startswith("#"):
        print(f"  {idx}: (blank/comment)")
    elif "=" in line:
        k = line.split("=",1)[0]
        v = line.split("=",1)[1]
        print(f"  {idx}: {k}=<len={len(v)}>")
    else:
        print(f"  {idx}: MALFORMED: {line[:40]}")
