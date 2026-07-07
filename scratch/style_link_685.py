# -*- coding: utf-8 -*-
"""
마이크론 포스트 685의 시간관리 링크를 파란색 밑줄 스타일로 교체
"""

import sys
import re
import requests
sys.stdout.reconfigure(encoding='utf-8')

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

CORRECT_URL = "https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/"

POST_ID = 685

r = requests.get(
    f"{WP_URL}/wp-json/wp/v2/posts/{POST_ID}",
    auth=(WP_USER, WP_PASS),
    params={"context": "edit"}
)
post = r.json()
content = post['content'].get('raw', post['content']['rendered'])
status = post['status']

print(f"제목: {post['title']['rendered']}")
print(f"상태: {status}")

# 현재 시간관리 링크 앵커 태그 전체를 찾기
anchor_pattern = re.compile(r'<a\s[^>]*href="' + re.escape(CORRECT_URL) + r'"[^>]*>(.*?)</a>', re.DOTALL)
matches = list(anchor_pattern.finditer(content))

print(f"\n시간관리 링크 앵커 발견: {len(matches)}개")
for m in matches:
    print(f"  원본: {m.group(0)[:150]}")

# 파란색 밑줄 스타일로 교체
STYLED_LINK = f'<a href="{CORRECT_URL}" title="직장인 시간관리 공부법 집중력 향상 비결" style="color:#2563eb; text-decoration:underline; font-weight:bold;" target="_self" rel="noopener">시간관리와 집중력 향상 칼럼</a>'

# 기존 앵커 태그를 새 스타일로 교체
new_content = content
for m in matches:
    old_anchor = m.group(0)
    new_content = new_content.replace(old_anchor, STYLED_LINK)
    print(f"\n교체 완료:")
    print(f"  이전: {old_anchor[:100]}...")
    print(f"  이후: {STYLED_LINK}")

if new_content != content:
    update_r = requests.post(
        f"{WP_URL}/wp-json/wp/v2/posts/{POST_ID}",
        auth=(WP_USER, WP_PASS),
        json={"content": new_content, "status": status}
    )
    if update_r.status_code == 200:
        print(f"\n[SUCCESS] 포스트 {POST_ID} 링크 스타일 적용 완료!")
        # 검증
        verify = requests.get(f"{WP_URL}/wp-json/wp/v2/posts/{POST_ID}", auth=(WP_USER, WP_PASS))
        rendered = verify.json()['content']['rendered']
        if CORRECT_URL in rendered and 'color:#2563eb' in rendered:
            print("[VERIFIED] 파란색 링크 적용 확인됨!")
        else:
            print("[WARN] 적용 검증 필요")
    else:
        print(f"[ERROR] 업데이트 실패: {update_r.status_code}")
        print(update_r.text[:300])
else:
    print("\n변경할 앵커 태그를 찾지 못했습니다. 원문 전체에서 시간관리 링크 문자열 검색 중...")
    # URL이 있는 위치를 찾아서 앞뒤 200자 출력
    idx = content.find(CORRECT_URL)
    if idx >= 0:
        snippet = content[max(0, idx-100):idx+300]
        print(f"URL 주변 텍스트:\n{snippet}")
    else:
        print("URL을 찾지 못했습니다.")
