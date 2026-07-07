# -*- coding: utf-8 -*-
"""
마이크론 테크놀로지 WP 포스트 업데이트:
1. 외부 신뢰 링크 2개 추가 (마이크론 공식사이트, Yahoo Finance)
2. 본문 글자수 확인 및 보완
3. Rank Math SEO 보강
"""

import requests

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
POST_ID = 685

# 현재 포스트 가져오기
r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts/{POST_ID}", auth=(WP_USER, WP_PASS))
post = r.json()
current_content = post['content']['raw'] if 'raw' in post['content'] else post['content']['rendered']

print("현재 포스트 상태:")
print(f"  상태: {post['status']}")
print(f"  제목: {post['title']['rendered']}")
print(f"  태그: {post['tags']}")
print(f"  카테고리: {post['categories']}")
print(f"  대표이미지: {post['featured_media']}")
print(f"  글자수(단어): {len(current_content.split())}")
print("\n현재 콘텐츠 길이(바이트):", len(current_content.encode('utf-8')))
