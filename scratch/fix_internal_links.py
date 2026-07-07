# -*- coding: utf-8 -*-
"""
3개 포스트에서 잘못된 직장인 시간관리/공부법 링크를 올바른 URL로 교체
"""

import requests
import re

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

CORRECT_LINK = "https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/"

# 검색할 키워드로 포스트 찾기
search_keywords = [
    "한강",
    "민생지원금",
    "마이크론"
]

print("=== 포스트 검색 중 ===\n")

found_posts = []

for keyword in search_keywords:
    r = requests.get(
        f"{WP_URL}/wp-json/wp/v2/posts",
        auth=(WP_USER, WP_PASS),
        params={"search": keyword, "per_page": 5, "status": "any"}
    )
    posts = r.json()
    for p in posts:
        print(f"[{keyword}] ID: {p['id']} | 제목: {p['title']['rendered']} | 상태: {p['status']}")
        found_posts.append({
            "keyword": keyword,
            "id": p["id"],
            "title": p["title"]["rendered"],
            "status": p["status"]
        })
    print()

print(f"\n총 {len(found_posts)}개 포스트 발견")
