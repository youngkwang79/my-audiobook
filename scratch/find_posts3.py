# -*- coding: utf-8 -*-
import sys
import requests
sys.stdout.reconfigure(encoding='utf-8')

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

# 최근 30개 포스트를 모두 가져와서 민생 관련 찾기
r = requests.get(
    f"{WP_URL}/wp-json/wp/v2/posts",
    auth=(WP_USER, WP_PASS),
    params={"per_page": 30, "status": "any", "orderby": "date", "order": "desc"}
)
posts = r.json()
print(f"총 {len(posts)}개 포스트 조회됨\n")
for p in posts:
    title = p['title']['rendered']
    if any(kw in title for kw in ["민생", "지원금", "수당", "보조", "한강", "마이크론", "수영"]):
        print(f"ID={p['id']} | 상태={p['status']} | {title}")
