# -*- coding: utf-8 -*-
"""
무림북.컴 works 테이블에 등록된 30여 개 지식 글들의 썸네일(thumbnail)을
원래 무림북 전용 2:3 세로형 책 표지(Bookcover) 이미지 주소로 강제 원상복구 패치하는 스크립트.
로컬에 저장된 register_* / upload_* 스크립트들의 파일명과 매칭 테이블을 기반으로 자동 매칭 복구.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_bookcover_remapping():
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

    # 💡 [정밀한 2:3 책 표지 하드코딩 매핑 맵 정의]
    # 각 지식글 제목 키워드에 해당하는 2:3 세로형 명품 R2/로컬 썸네일 이미지 파일명 매칭
    bookcover_map = {
        "종부세": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "15억": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "공동명의": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "상속세": "/thumbnails/inheritance_tax_bookcover_1783402150688.jpg",
        "IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "개인형 IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "국민연금": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "디딤돌": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "신혼부부": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "부모급여": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "아동수당": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "보청기": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        "글쓰기": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        "SEO": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "상위 노출": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "소상공인": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "대환대출": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "학교폭력": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "방관자": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "마이크론": "/thumbnails/micron_tech_bookcover_1783049097918.jpg",
        "시간관리": "/thumbnails/time_management_bookcover_1783009842330.jpg",
        "한강": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        "전기요금": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "누진세": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "재테크": "/thumbnails/savings_calculator_cover.jpg",
        "복비": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "중개": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "투잡": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "부업": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "청약": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "청년형 ISA": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "경영안정": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "식기세척기": "/thumbnails/pear_balloon_flower_tea_main_1783182189888.jpg",
        "아토팜": "/thumbnails/pear_balloon_flower_tea_main_1783182189888.jpg",
        "테팔": "/thumbnails/pear_balloon_flower_tea_main_1783182189888.jpg",
        "리스테린": "/thumbnails/pear_balloon_flower_tea_main_1783182189888.jpg",
        "천년 만에": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "소가주가": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "탑클래스": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "천군": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "다시 태어난": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "마도 천재": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "은둔 고수": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "마신 강림": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "신검 무장": "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "야장신검": "/thumbnails/yajangsingeom_1781671858468.png",
        "야열화명": "/thumbnails/yahyelhwamyeng_1781694131609.png"
    }

    # 1. works 테이블의 모든 레코드 조회
    print("\n[STEP 1] Fetching works records to check thumbnail format...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works in database.")
            
            updated_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                current_thumb = w.get("thumbnail", "")
                
                # 가로형 워드프레스 이미지이거나 기본 이미지인 경우
                if "uploads" in current_thumb or "wp-content" in current_thumb or "google_seo" in current_thumb:
                    # 제목 키워드별 세로형 표지 매칭 검색
                    matched_cover = ""
                    for kw, cover_url in bookcover_map.items():
                        if kw in title:
                            matched_cover = cover_url
                            break
                    
                    if matched_cover:
                        # 2:3 세로형 썸네일 업데이트 전송
                        update_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        payload = json.dumps({
                            "thumbnail": matched_cover
                        }).encode("utf-8")
                        
                        req_up = urllib.request.Request(
                            update_url,
                            data=payload,
                            headers=headers,
                            method="PATCH"
                        )
                        with urllib.request.urlopen(req_up) as _:
                            print(f" ==> [UPDATED 2:3] '{title}' -> {matched_cover}")
                            updated_count += 1
            
            print(f"\n--- [REMAP COMPLETE] ---")
            print(f"Successfully remapped {updated_count} posts back to 2:3 bookcovers.")
            
    except Exception as e:
        print("[ERROR] Remapping failed:", e)

if __name__ == "__main__":
    run_bookcover_remapping()
