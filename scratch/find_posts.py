# -*- coding: utf-8 -*-
import sys
import requests
sys.stdout.reconfigure(encoding='utf-8')

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

for keyword in ["한강", "민생지원금", "마이크론"]:
    r = requests.get(
        f"{WP_URL}/wp-json/wp/v2/posts",
        auth=(WP_USER, WP_PASS),
        params={"search": keyword, "per_page": 5, "status": "any"}
    )
    for p in r.json():
        print(f"[{keyword}] ID={p['id']} | 상태={p['status']} | 제목={p['title']['rendered']}")
