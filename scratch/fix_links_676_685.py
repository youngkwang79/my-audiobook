# -*- coding: utf-8 -*-
"""
WP 포스트 676(한강), 685(마이크론)에서 잘못된 '직장인 시간관리 공부법' 링크를 
올바른 URL로 교체하는 스크립트
"""

import sys
import re
import requests
sys.stdout.reconfigure(encoding='utf-8')

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

CORRECT_URL = "https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/"

POST_IDS = [676, 685]

# 시간관리/공부법 관련 키워드로 잘못된 링크 패턴 찾기
TIME_MGMT_PATTERNS = [
    r'시간관리',
    r'시간 관리',
    r'공부법',
    r'집중력',
    r'직장인.*공부',
    r'효율.*공부',
]

for post_id in POST_IDS:
    print(f"\n{'='*50}")
    print(f"포스트 ID: {post_id} 처리 중...")
    
    r = requests.get(
        f"{WP_URL}/wp-json/wp/v2/posts/{post_id}",
        auth=(WP_USER, WP_PASS),
        params={"context": "edit"}  # raw content 가져오기
    )
    post = r.json()
    title = post['title']['rendered']
    status = post['status']
    
    # raw 콘텐츠 가져오기
    content = post['content'].get('raw', post['content']['rendered'])
    print(f"제목: {title}")
    print(f"상태: {status}")
    
    # 현재 href 링크 목록 확인
    all_links = re.findall(r'href="([^"]+)"', content)
    internal_links = [l for l in all_links if 'murimbook' in l]
    print(f"\n현재 내부 링크 ({len(internal_links)}개):")
    for l in internal_links:
        print(f"  {l}")
    
    # 시간관리/공부법 관련 잘못된 링크 찾기
    # 패턴: href="..." 중에서 '시간관리', '공부법' 등의 앵커 텍스트를 가진 링크
    # 또는 URL 자체에 시차, 시간, 공부 등이 포함된 경우
    time_mgmt_links = []
    for l in internal_links:
        # URL에 시간관리 관련 키워드가 있는 경우
        if any(kw in l for kw in ['시차', '시간관리', '공부법', '집중력', '%ec%8b%9c%ec%b0%a8', '%ec%8b%9c%ea%b0%84']):
            time_mgmt_links.append(l)
    
    # 링크 텍스트로 찾기 (앵커 태그 전체)
    anchor_pattern = re.compile(r'<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.DOTALL)
    for match in anchor_pattern.finditer(content):
        href = match.group(1)
        text = re.sub(r'<[^>]+>', '', match.group(2)).strip()
        if any(kw in text for kw in ['시간관리', '시간 관리', '공부법', '집중력', '직장인']):
            print(f"\n시간관리 관련 앵커 텍스트 발견:")
            print(f"  텍스트: {text}")
            print(f"  현재 URL: {href}")
            if href not in time_mgmt_links:
                time_mgmt_links.append(href)
    
    if not time_mgmt_links:
        # 링크 텍스트에서 못 찾았으면 시차적화 URL 패턴도 확인
        for l in internal_links:
            if l not in [CORRECT_URL] and 'murimbook' in l:
                # 알려진 다른 칼럼 URL이 아닌 것들
                if all(known not in l for known in ['부자습관', 'ddp', '마이크론', '수영장', '박람회', '민생', '저축', '부가세', '비야디']):
                    time_mgmt_links.append(l)
        
        if time_mgmt_links:
            print(f"\n의심되는 링크들 (알 수 없는 URL):")
            for l in time_mgmt_links:
                print(f"  {l}")
    
    print(f"\n교체 대상 링크: {len(time_mgmt_links)}개")
    
    if time_mgmt_links:
        new_content = content
        for wrong_url in time_mgmt_links:
            if wrong_url != CORRECT_URL:
                count = new_content.count(wrong_url)
                new_content = new_content.replace(wrong_url, CORRECT_URL)
                print(f"  교체: {wrong_url} -> {count}회 교체됨")
        
        if new_content != content:
            update_r = requests.post(
                f"{WP_URL}/wp-json/wp/v2/posts/{post_id}",
                auth=(WP_USER, WP_PASS),
                json={"content": new_content, "status": status}
            )
            if update_r.status_code == 200:
                print(f"\n[SUCCESS] 포스트 {post_id} 링크 교체 완료!")
            else:
                print(f"\n[ERROR] 업데이트 실패: {update_r.status_code}")
        else:
            print("  변경할 내용 없음 (이미 올바른 링크이거나 시간관리 링크가 없음)")
    else:
        print("  시간관리 관련 링크를 찾지 못했습니다.")
        print("  모든 내부 링크를 다시 확인해주세요.")
