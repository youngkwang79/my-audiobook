# -*- coding: utf-8 -*-
import requests
import re

r = requests.get(
    'https://blog.murimbook.com/wp-json/wp/v2/posts/685',
    auth=('murimbook', '8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm')
)
post = r.json()
content = post['content']['rendered']
links = re.findall(r'href="([^"]+)"', content)
print("=== 링크 목록 ===")
for l in links:
    print(l)
print("\n=== 외부 링크만 ===")
for l in links:
    if 'murimbook' not in l:
        print(l)
print("\n=== 포커스 키워드 빈도 ===")
print("마이크론 테크놀로지:", content.count("마이크론 테크놀로지"))
print("마이크론:", content.count("마이크론"))
print("총 단어수 (공백기준):", len(content.split()))
print("글 상태:", post['status'])
print("대표이미지 ID:", post['featured_media'])
print("태그:", post['tags'])
print("카테고리:", post['categories'])
print("제목:", post['title']['rendered'])
