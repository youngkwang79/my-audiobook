# -*- coding: utf-8 -*-
import sys
import requests
sys.stdout.reconfigure(encoding='utf-8')

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

# 페이지 2, 3까지 검색 (30~90번째 최신 포스트)
for page in [2, 3, 4]:
    r = requests.get(
        f"{WP_URL}/wp-json/wp/v2/posts",
        auth=(WP_USER, WP_PASS),
        params={"per_page": 30, "status": "any", "orderby": "date", "order": "desc", "page": page}
    )
    posts = r.json()
    if isinstance(posts, list):
        for p in posts:
            title = p['title']['rendered']
            if any(kw in title for kw in ["민생", "지원금", "보조금", "수당"]):
                print(f"ID={p['id']} | 상태={p['status']} | {title}")

# 직접 검색어로도 시도
print("\n--- 직접 검색 ---")
for kw in ["2026년 민생", "3차 지급", "민생지원"]:
    r = requests.get(
        f"{WP_URL}/wp-json/wp/v2/posts",
        auth=(WP_USER, WP_PASS),
        params={"search": kw, "per_page": 5, "status": "any"}
    )
    if isinstance(r.json(), list):
        for p in r.json():
            print(f"[{kw}] ID={p['id']} | 상태={p['status']} | {p['title']['rendered']}")
