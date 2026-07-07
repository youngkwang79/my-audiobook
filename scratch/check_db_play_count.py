# -*- coding: utf-8 -*-
import requests

env_path = ".env.local"
supabase_url = ""
supabase_key = ""

if os := __import__("os"):
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=" , 1)
                    if k.strip() == "NEXT_PUBLIC_SUPABASE_URL":
                        supabase_url = v.strip().strip('"').strip("'")
                    elif k.strip() == "NEXT_PUBLIC_SUPABASE_ANON_KEY":
                        supabase_key = v.strip().strip('"').strip("'")

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

# works 테이블 컬럼 확인 및 play_count 조회
r = requests.get(
    f"{supabase_url}/rest/v1/works?select=id,title,subtitle,views,play_count",
    headers=headers
)

if r.status_code == 200:
    works = r.json()
    for w in works:
        subtitle = w.get("subtitle") or ""
        if "[블로그]" in subtitle or "[공지사항]" in subtitle:
            print(f"제목: {w['title']}")
            print(f"  views: {w['views']}")
            print(f"  play_count: {w['play_count']}")
else:
    print("에러:", r.status_code, r.text)
