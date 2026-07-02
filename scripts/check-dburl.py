import re
with open("/Users/trumu/Development/GAIOS/.env") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            url = line.split("=",1)[1].strip().strip('"').strip("'")
            m = re.match(r"postgres(?:ql)?://([^:]+):([^@]+)@([^/]+)/(.+)", url)
            if m:
                user, pw, host, db = m.groups()
                placeholder = ("YOUR-PASSWORD" in pw) or ("[" in pw) or ("]" in pw)
                print("user:", user)
                print("password: len=", len(pw), " looks_like_placeholder=", placeholder)
                print("host:", host)
                print("db:", db)
            else:
                print("URL format not recognized")
            break
