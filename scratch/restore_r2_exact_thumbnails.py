# -*- coding: utf-8 -*-
"""
무림북.컴의 블로그/계산기 포스트들에 대해
D드라이브 이전 및 에러 발생 이전, 원래 DB에 정확하게 할당되어 고화질로 로드되던 
진짜 오리지널 R2 클라우드 썸네일 URL 주소들로 100% 완벽 복원하는 스크립트.
(소설 데이터는 100% 철저 격리 제외)
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_r2_thumbnail_restoration():
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

    # 💡 [원래 데이터베이스에 들어있던 최상의 명품 R2 2:3 세로형 썸네일 매핑 딕셔너리]
    r2_exact_map = {
        "신혼부부": "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg",
        "디딤돌 대출 맞벌이 부부": "https://r2.murimbook.com/thumbnails/didimdol_1783420336874.jpg",
        "생애최초 주택구입": "https://r2.murimbook.com/thumbnails/didimdol_1783420336874.jpg",
        
        "국민내일배움": "https://r2.murimbook.com/thumbnails/gaeinhye_1783406520606.jpg",
        
        "노인 보청기": "https://r2.murimbook.com/thumbnails/ears_1783390545388.jpg",
        
        "구글 상위": "https://r2.murimbook.com/thumbnails/google_top_1783176096690.jpg",
        "구글 검색": "https://r2.murimbook.com/thumbnails/google_top_1783420605408.jpg",
        
        "소상공인 저금리 대출": "https://r2.murimbook.com/thumbnails/2026%eb%85%84%20%ec%86%8c%ec%83%81%ea%b3%b5%ec%9d%b8%20%ec%a0%80%ea%b8%88%eb%a6%ac%20%e3%85%81%ec%b6%9c%20100%25_1783159890701.jpg",
        "소상공인 대출": "https://r2.murimbook.com/thumbnails/2026%eb%85%84%20%ec%86%8c%ec%83%81%ea%b3%b5%ec%9d%b8%20%ec%a0%80%ea%b8%88%eb%a6%ac%20%e3%85%81%ec%b6%9c%20100%25_1783159890701.jpg",
        "소상공인 정책자금": "https://r2.murimbook.com/thumbnails/2026%eb%85%84%20%ec%86%8c%ec%83%81%ea%b3%b5%ec%9d%b8%20%ec%a0%80%ea%b8%88%eb%a6%ac%20%e3%85%81%ec%b6%9c%20100%25_1783159890701.jpg",
        
        "부부 공동명의 아파트 종부세 계산기": "https://r2.murimbook.com/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
        "부부 공동명의 종부세 고령자": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg",
        "1주택 공동명의 종부세": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg",
        "아파트 공시가격 15억": "https://r2.murimbook.com/thumbnails/apateugongsigagyeg15eogbubugon_1783433756015.jpg",
        
        "부동산 중개 수수료 계산기": "https://r2.murimbook.com/thumbnails/broker_calc_cover_1783427287270.jpg",
        "부동산 중개보수 요율표": "https://r2.murimbook.com/thumbnails/budongsanjunggae_1783420439194.jpg",
        
        "대출 상환 방식 3가지": "https://r2.murimbook.com/thumbnails/daechulsanghwan_1783420387482.jpg",
        "디딤돌 대출 복리/대출이자": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg",
        
        "서울커리어업 구직지원금": "https://r2.murimbook.com/thumbnails/seoulkeorieobgujigjiwongeum202_1783420358572.jpg",
        
        "학교폭력 대처법 및 법적": "https://r2.murimbook.com/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭 피해자: 3년": "https://r2.murimbook.com/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "학폭 피해자: 2대": "https://r2.murimbook.com/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        
        "도시가스 한전 전기요금": "https://r2.murimbook.com/thumbnails/electricity_save_1783032393230.jpg",
        "여름 한전 전기요금": "https://r2.murimbook.com/thumbnails/electricity_save_1783032393230.jpg",
        "전기세 절약 꿀팁": "https://r2.murimbook.com/thumbnails/electricity_save_1783032393230.jpg",
        
        "배달 대행 부업 수익": "https://r2.murimbook.com/thumbnails/two_job_1783159740990.jpg",
        "직장인 부업: 3가지": "https://r2.murimbook.com/thumbnails/two_job_1783420683365.jpg",
        
        "개인형 IRP 중도해지": "https://r2.murimbook.com/thumbnails/gaeinhye_1783406520606.jpg",
        "마이크론 테크놀로지 주가": "https://r2.murimbook.com/thumbnails/micron_tech_1783050382681.jpg",
        "직장인 웰빙 시간관리": "https://r2.murimbook.com/thumbnails/time_study_1783010502348.jpg",
        "한강공원 수영장 야간": "https://r2.murimbook.com/thumbnails/hangang_pool_1783032727590.jpg",
        "2026년 민생지원금 3차": "https://r2.murimbook.com/thumbnails/welfare_3rd_1783036018542.jpg",
        "2026 서울청년정책박람회": "https://r2.murimbook.com/thumbnails/youth_policy_expo_1783035998422.jpg",
        "경영안정 바우처": "https://r2.murimbook.com/thumbnails/voucher_bookcover_1783250061587.jpg"
    }

    # 1. 모든 작품 목록 페치
    print("\n[STEP 1] Fetching works entries from Supabase...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works total in DB.")
            
            patched_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                current_thumb = w.get("thumbnail", "")
                
                # 소설 연재물들은 롤백에서 철저 격리 제외
                is_blog_or_calc = "post-wp-" in wid or "calc" in wid or wid in ["careerup", "electricity_save", "hangang_pool", "hearing_aid", "irp", "loans", "micron_tech", "newlywed_housing", "school_violence", "school_violence_legal", "school_violence_time", "so_sang_gong_in_loan", "voucher", "welfare_3rd", "worker_side_job", "tomorrow_card"]
                
                if is_blog_or_calc:
                    matched_r2 = ""
                    for kw, cover_url in r2_exact_map.items():
                        if kw in title:
                            matched_r2 = cover_url
                            break
                            
                    if matched_r2 and current_thumb != matched_r2:
                        update_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        payload = json.dumps({
                            "thumbnail": matched_r2
                        }).encode("utf-8")
                        
                        req_patch = urllib.request.Request(
                            update_url,
                            data=payload,
                            headers=headers,
                            method="PATCH"
                        )
                        with urllib.request.urlopen(req_patch) as _:
                            print(f" ==> [R2 RESTORE SUCCESS] Title: '{title}' ===> Cover URL: '{matched_r2}'")
                            patched_count += 1
                            
            print(f"\n--- [R2 ORIGINAL THUMBNAIL RESTORE COMPLETE] ---")
            print(f"Successfully recovered {patched_count} original R2 2:3 covers.")
            
    except Exception as e:
        print("[ERROR] R2 Restoration failed:", e)

if __name__ == "__main__":
    run_r2_thumbnail_restoration()
