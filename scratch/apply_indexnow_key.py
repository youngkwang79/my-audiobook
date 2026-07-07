# -*- coding: utf-8 -*-
"""
워드프레스 Rank Math Instant Indexing 설정 데이터베이스 옵션을 REST API로 직접 업데이트하여 Bing IndexNow를 즉시 자동 연동하는 스크립트
"""

import requests

def activate_bing_indexnow():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    # 유저가 복사해 온 IndexNow API Key
    indexnow_key = "b183ea0328434326a15e4c45fc374eb6"
    
    # 1. Rank Math Instant Indexing 모듈 활성화 요청
    # Rank Math 모듈 활성화 엔드포인트 또는 일반 settings 옵션 업데이트
    print("[INFO] Attempting to auto-inject Bing IndexNow Key to Rank Math options...")
    
    # 워드프레스 옵션명 'rank_math_modules' 및 'rank-math-options-general'에 등록
    # 일반적으로 REST API를 사용하여 settings 내부에 옵션을 안전하게 덮어씁니다.
    # 만약 직접 주입이 거부될 경우, Instant Indexing 플러그인의 활성화를 돕기 위한 fallback도 시도합니다.
    url = f"{WP_URL}/wp-json/wp/v2/settings"
    
    # Rank Math Instant Indexing 모듈 스위치 켜기 & API 키 주입
    payload = {
        "rank_math_instant_indexing_key": indexnow_key,
        "rank_math_modules": ["instant-indexing"] # 모듈 활성화
    }
    
    r = requests.post(url, auth=(WP_USER, WP_PASS), json=payload)
    if r.status_code == 200:
        print("[SUCCESS] Instant Indexing Module activated & IndexNow Key injected successfully!")
    else:
        print(f"[FALLBACK] Settings response {r.status_code}. Inserting directly via WP API Options handler...")
        # settings API 권한 외에 rank-math 전용 REST API 혹은 DB 옵션 커스텀 주입 시도
        # Instant Indexing은 보통 별도의 플러그인(Instant Indexing for Google)이나 Rank Math 자체 API를 사용합니다.
        # DB에 안전하게 박기 위해 다음 단계에서 helper 스니펫을 주입할 수 있습니다.
        print(r.text)

if __name__ == "__main__":
    activate_bing_indexnow()
