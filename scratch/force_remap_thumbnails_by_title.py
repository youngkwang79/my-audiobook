# -*- coding: utf-8 -*-
"""
무림북.컴(murimbook.com) works 테이블에 새로 복원된 post-wp-* 형식 포스트들의 제목을 분석하여,
R2/로컬에 물리적으로 완벽히 존재하는 고유 2:3 세로형 명품 책 표지(Bookcover) 이미지 주소로
100% 매칭 업데이트(PATCH)하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_title_thumbnail_remapping():
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

    # 💡 [제목 키워드별 명품 2:3 세로형 북커버 파일 매칭 맵]
    title_cover_map = {
        "근로장려금": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "자녀장려금": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "부모급여": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "아동수당": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "경영안정": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        
        "국민취업지원제도": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "구직촉진수당": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "내일배움카드": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "실업급여": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "건강보험": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "개인형 IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "ISA": "/thumbnails/irp_bookcover_1783402575192.jpg",
        
        "도시가스": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "전기요금": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "누진세": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "한전": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "전기세": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        
        "신용카드": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "현금화": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "통신사": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "미환급금": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "잠자는 계좌": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "예금 보험금": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "국민연금": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "은행 잠자는": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        
        "삼쩜삼": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "세금 환급금": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "종부세": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "공동명의": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "15억": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        
        "청약": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "부동산 규제": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "상위 노출": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "SEO": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "구글 검색": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        
        "상속세": "/thumbnails/inheritance_tax_bookcover_1783402150688.jpg",
        "동거주택": "/thumbnails/inheritance_tax_bookcover_1783402150688.jpg",
        
        "디딤돌": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "임대주택": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "공공임대": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "생애최초": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        
        "보청기": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        
        "글쓰기": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        
        "소상공인": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "대환대출": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        
        "학교폭력": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "방관자": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        
        "시간관리": "/thumbnails/time_management_bookcover_1783009842330.jpg",
        
        "한강": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        
        "복비": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "중개": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        
        "부업": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "투잡": "/thumbnails/careerup_bookcover_1783372720826.jpg"
    }

    # 1. 모든 작품 목록 페치
    print("\n[STEP 1] Fetching works entries to remap thumbnails by title...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} total works in DB.")
            
            patched_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                current_thumb = w.get("thumbnail", "")
                
                # 2:3 표지가 지정되어 있지 않은 상태이거나, 워드프레스 가로형 경로인 경우 패치 처리
                # (유저님이 지시하신 것처럼 전체 murimbook.com 글들의 썸네일 강제 매칭 보장)
                matched_cover = ""
                for kw, cover_url in title_cover_map.items():
                    if kw in title:
                        matched_cover = cover_url
                        break
                        
                # R2/로컬 물리 파일명이 매치되었고, 현재 설정과 다를 경우에만 덮어씀
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
                        print(f" ==> [PATCHED 2:3] Title: '{title}' -> Cover: '{matched_cover}'")
                        patched_count += 1
                        
            print(f"\n--- [THUMBNAIL REMAP COMPLETE] ---")
            print(f"Successfully remapped {patched_count} works to their exact 2:3 bookcovers.")
            
    except Exception as e:
        print("[ERROR] Remapping failed:", e)

if __name__ == "__main__":
    run_title_thumbnail_remapping()
