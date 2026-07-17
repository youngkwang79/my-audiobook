# -*- coding: utf-8 -*-
"""
소설 작품들은 단 한줄도 건드리지 않고 완전히 배제(Exclude)한 채,
오직 블로그/계산기 지식 칼럼 포스트들만 선별하여 
고유 2:3 세로형 명품 책 표지 썸네일 경로를 복원하는 블로그 전용 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_blog_only_cover_restoration():
    url = ""
    service_key = ""

    # Credentials 로드
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    parts = line.strip().split("=", 1)
                    k = parts[0].strip()
                    v = parts[1].strip()
                    if k == "NEXT_PUBLIC_SUPABASE_URL":
                        url = v
                    elif k == "SUPABASE_SERVICE_ROLE_KEY":
                        service_key = v

    if not url or not service_key:
        print("[ERROR] Credentials missing!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }

    # 💡 [블로그 지식글용 고유 2:3 명품 썸네일 초정밀 매핑 테이블]
    # 소설 키워드는 원천 차단 소거 완료
    precise_blog_map = {
        "부부 공동명의 아파트 종부세 계산기": "/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
        "부동산 중개 수수료 계산기": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "디딤돌 대출 복리/대출이자 상환 계산기": "/thumbnails/loan_calc_cover_1783427271223.jpg",
        "개인형 IRP 중도해지": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "상속세 면제 한도": "/thumbnails/inheritance_tax_bookcover_1783402150688.jpg",
        "전기세 절약 꿀팁": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "노인 보청기 및 보행기": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        "신혼부부 공공임대주택": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "학교폭력 대처법 및 법적 대응": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭 피해자: 3년 손해배상": "/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "학폭 피해자: 2대 민형사": "/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        "경영안정 바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "디딤돌 대출 맞벌이 부부": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "부동산 중개보수 요율표": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "구글 상위 노출 SEO 글쓰기 4가지": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        "구글 검색 상위 노출 7가지": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "직장인 웰빙 시간관리": "/thumbnails/time_management_bookcover_1783009842330.jpg",
        "한강공원 수영장 야간": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        "마이크론 테크놀로지 주가": "/thumbnails/micron_tech_bookcover_1783049097918.jpg"
    }

    # 1. 모든 작품 목록 페치
    print("\n[STEP 1] Fetching works entries (excluding novels)...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail,subtitle"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works total in DB.")
            
            patched_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                subtitle = w.get("subtitle", "")
                current_thumb = w.get("thumbnail", "")
                
                # 💡 [소설 원천 차단 조건]
                # ID가 post-wp- 로 시작하거나 subtitle이 [블로그] 또는 [계산기]인 경우에만 정비 진행
                is_blog_post = "post-wp-" in wid or "blog" in wid or "welfare_3rd" in wid or "youth_policy" in wid or "micron_tech" in wid or "hangang_pool" in wid
                is_calc = "calc-" in wid or "calculator" in wid
                
                if is_blog_post or is_calc:
                    # 정밀 매칭 검사
                    matched_cover = ""
                    for kw, cover_url in precise_blog_map.items():
                        if kw in title:
                            matched_cover = cover_url
                            break
                            
                    if matched_cover and current_thumb != matched_cover:
                        update_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        payload = json.dumps({
                            "thumbnail": matched_cover
                        }).encode("utf-8")
                        
                        req_patch = urllib.request.Request(
                            update_url,
                            data=payload,
                            headers=headers,
                            method="PATCH"
                        )
                        with urllib.request.urlopen(req_patch) as _:
                            print(f" ==> [BLOG COVER RESTORED] Title: '{title}' -> Cover: '{matched_cover}'")
                            patched_count += 1
                else:
                    # 소설 연재물 등은 절대 건드리지 않고 바이패스
                    continue
                        
            print(f"\n--- [BLOG ONLY COVER RESTORE COMPLETE] ---")
            print(f"Successfully restored {patched_count} blog post(s) to their exact original covers.")
            
    except Exception as e:
        print("[ERROR] Restoration failed:", e)

if __name__ == "__main__":
    run_blog_only_cover_restoration()
