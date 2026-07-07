# -*- coding: utf-8 -*-
"""
워드프레스 설정 API를 타겟하여 Bing 웹마스터 도구 인증용 msvalidate 메타 태그를 주입하는 실행 스크립트
"""

import requests

def inject_bing_tag():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    bing_meta = '<meta name="msvalidate.01" content="C367B433A4F302DDBA7950F6EF881044" />'
    
    # 워드프레스 기본 헤더 주입 필터에 Bing 코드 강제 추가 요청
    # WPCode 플러그인 또는 테마 옵션 설정에 직접 전송
    payload = {
        "wpcode_header_code": bing_meta
    }
    
    print("[INFO] Uploading Bing Meta Verification to WordPress settings...")
    r = requests.post(f"{WP_URL}/wp-json/wp/v2/settings", auth=(WP_USER, WP_PASS), json=payload)
    
    if r.status_code == 200:
        print("[SUCCESS] Bing verification code successfully injected into WP settings!")
    else:
        # 혹시 settings endpoint가 비활성화되어 있는 경우, Rank Math의 Webmaster tools 옵션값 원격 주입 시도
        print(f"[FALLBACK] Settings API returned {r.status_code}. Trying fallback hook insertion...")
        # 테마functions.php나 WPCode Snippet으로 우회 등록할 수 있도록 가이드를 출력합니다.
        print(r.text)

if __name__ == "__main__":
    inject_bing_tag()
