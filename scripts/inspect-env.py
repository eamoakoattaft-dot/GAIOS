import base64, json, re, sys
with open("/Users/trumu/Development/GAIOS/.env") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        role = "not-a-jwt"
        if v.startswith("eyJ"):
            try:
                parts = v.split(".")
                if len(parts) >= 2:
                    payload_b64 = parts[1]
                    padding = "=" * (-len(payload_b64) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
                    role = payload.get("role", "no-role-in-payload")
            except Exception as e:
                role = "decode-error: " + str(e)
        print(k, "len=", len(v), "first6=", v[:6], "role=", role)
