# -*- coding: utf-8 -*-
"""
무림북.컴의 엑박(Broken Image)이 뜨는 모든 블로그 칼럼 포스트들에 대해
실제 public/thumbnails/ 에 저장된 2:3 세로형 이미지 파일명으로 정교하게 일대일 매칭 수정하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_exact_image_repair():
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

    # 💡 [실제 존재하는 파일명 기준 - 초정밀 수동 매핑 사전]
    exact_repair_map = {
        "소상공인 경영안정 바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "경영안정 바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        
        "신혼부부 공공임대": "/thumbnails/wedding_house_1783229249822.jpg",
        "디딤돌 대출 맞벌이 부부": "/thumbnails/didimdol_1783390291839.jpg",
        "생애최초 주택구입": "/thumbnails/didimdol_1783390291839.jpg",
        "대환대출: 2026 정부": "/thumbnails/sosanggongindaehwandaechuljiwo_1783426170298.jpg",
        
        "국민내일배움카드": "/thumbnails/tomarrow_study_1783209907165.jpg",
        "국민취업지원제도 1유형": "/thumbnails/tomarrow_study_1783420548001.jpg",
        "실업급여 신청 방법": "/thumbnails/tomarrow_study_1783209907165.jpg",
        "국민건강보험 미수령": "/thumbnails/tomarrow_study_1783209907165.jpg",
        
        "노인 보청기 및 보행기": "/thumbnails/ears_1783390545388.jpg",
        "노인 보청기 지원금": "/thumbnails/ears_1783420565572.jpg",
        
        "배달 대행 부업 수익": "/thumbnails/two_job_1783159740990.jpg",
        "직장인 부업: 3가지": "/thumbnails/two_job_1783420683365.jpg",
        "서울커리어업 구직지원금": "/thumbnails/seoulkeorieobgujigjiwongeum202_1783373337896.jpg",
        
        "부부 공동명의 종부세 고령자": "/thumbnails/bubugongdongmyenguijongbusegor_1783433897422.jpg",
        "부부 공동명의 아파트 종부세": "/thumbnails/bubugongdongmyenguiapateujongb_1783412616169.jpg",
        "1주택 공동명의 종부세": "/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg",
        "아파트 공시가격 15억": "/thumbnails/apateugongsigagyeg15eogbubugon_1783433756015.jpg",
        
        "도시가스 한전 전기요금": "/thumbnails/electricity_save_1783032393230.jpg",
        "여름 한전 전기요금": "/thumbnails/electricity_save_1783032393230.jpg",
        "전기세 절약 꿀팁": "/thumbnails/electricity_save_1783032393230.jpg",
        "전기세 절약 3대": "/thumbnails/electricity_save_1783032393230.jpg",
        
        "여신금융협회 신용카드 포인트": "/thumbnails/point_it_1783177160218.jpg",
        "통신사 미환급금": "/thumbnails/point_it_1783420656708.jpg",
        "국세청 삼쩜삼": "/thumbnails/save_money_1783420633950.jpg",
        "은행 잠자는 계좌": "/thumbnails/save_money_1783159993186.jpg",
        "국민연금 납부액": "/thumbnails/save_money_1783159993186.jpg",
        
        "학교폭력 대처법 및 법적": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭 피해자: 3년": "/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "학폭 피해자: 2대": "/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        
        "2026 현행 부동산": "/thumbnails/budongsanjunggae_1783337164306.jpg",
        "부동산 중개 수수료": "/thumbnails/budongsanjunggae_1783420439194.jpg",
        "부동산 복비": "/thumbnails/budongsanjunggae_1783420439194.jpg",
        
        "소상공인 대환대출": "/thumbnails/sosanggongin_1783251400695.jpg",
        "소상공인 정책자금": "/thumbnails/sosanggongin_money_1783420457478.jpg",
        
        "구글 상위 노출 SEO": "/thumbnails/google_top_1783176096690.jpg",
        "구글 검색 상위 노출 7가지": "/thumbnails/google_top_1783420605408.jpg",
        
        "마이크론 테크놀로지": "/thumbnails/micron_tech_1783050382681.jpg",
        "마이크론 HBM4": "/thumbnails/micron_tech_1783050382681.jpg",
        
        "직장인 웰빙 시간관리": "/thumbnails/time_study_1783010502348.jpg",
        "한강공원 수영장": "/thumbnails/hangang_pool_1783032727590.jpg"
    }

    # 1. 모든 작품 목록 페치
    print("\n[STEP 1] Fetching works entries to perform exact cover repair...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works in DB.")
            
            patched_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                current_thumb = w.get("thumbnail", "")
                
                # 소설 연재작은 제외 (ID에 post-wp- 나 특정 명칭이 섞인 블로그 글만 패치)
                is_blog_or_calc = "post-wp-" in wid or "calc" in wid or wid in ["careerup", "electricity_save", "hangang_pool", "hearing_aid", "irp", "loans", "micron_tech", "newlywed_housing", "school_violence", "school_violence_legal", "school_violence_time", "so_sang_gong_in_loan", "voucher", "welfare_3rd", "worker_side_job", "tomorrow_card"]
                
                if is_blog_or_calc:
                    matched_cover = ""
                    for kw, cover_url in exact_repair_map.items():
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
                            print(f" ==> [REPAIRED IMAGE] Title: '{title}' -> Cover: '{matched_cover}'")
                            patched_count += 1
                            
            print(f"\n--- [EXACT IMAGE REPAIR COMPLETE] ---")
            print(f"Successfully repaired {patched_count} blog post images.")
            
    except Exception as e:
        print("[ERROR] Repair failed:", e)

if __name__ == "__main__":
    run_exact_image_repair()
