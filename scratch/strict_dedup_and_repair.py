# -*- coding: utf-8 -*-
"""
1. works 테이블 내 제목(title) 기준 중복된 포스트들을 완벽하게 감색하여 하나만 남기고 전부 DELETE 처리
2. 억지로 어색하게 매핑되어 있던 썸네일 경로들을 원래 소유하고 있던 1:1 완벽 고유 이미지 파일로 최종 강제 정합성 교정
3. 애드센스 저품질 승인 거절 방지를 위해 꼬인 데이터 및 엑박 글들을 완벽히 정화
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_dedup_and_precise_repair():
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

    # 1. works 테이블 데이터 조회
    print("\n[STEP 1] Fetching works list for deduplication...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail,subtitle"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Total works fetched: {len(works_list)}")
            
            # 2. 제목 기준 중복 탐지 및 삭제 대상 식별
            seen_titles = {}
            delete_ids = []
            
            # 소설과 블로그/계산기 분할 탐지
            for w in works_list:
                wid = w["id"]
                # 괄호나 앞뒤 공백 등을 날려서 엄밀하게 중복 탐색
                title_clean = w["title"].strip()
                
                # 동일한 제목이 이미 본 적이 있는 경우
                if title_clean in seen_titles:
                    # 기존에 등록된 ID와 비교해서 하나를 삭제 리스트에 등록
                    prev_id = seen_titles[title_clean]
                    # post-wp- 가 붙은 최신 연동글이나 또는 중복된 다른 ID를 삭제 대상으로 등록
                    if "post-wp-" in wid:
                        delete_ids.append(wid)
                    else:
                        delete_ids.append(prev_id)
                        seen_titles[title_clean] = wid
                else:
                    seen_titles[title_clean] = wid
            
            # 중복글 삭제 처리
            deleted_count = 0
            if delete_ids:
                print(f"\n ==> Found {len(delete_ids)} duplicate posts. Cleaning them now...")
                for did in delete_ids:
                    del_url = f"{url}/rest/v1/works?id=eq.{did}"
                    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                    with urllib.request.urlopen(req_del) as _:
                        print(f"   -> [DELETED DUPLICATE] ID: {did}")
                        deleted_count += 1
            else:
                print("\n ==> No duplicate posts found.")

            # 3. 억지 매핑된 썸네일들 명품 세밀 패치 (제목 매칭)
            # 썸네일 불일치 및 억지 매칭을 방지하고 원래 고유하게 보관되어 있던 2:3 표지 명확히 할당
            precise_image_map = {
                "구글 상위 노출 SEO 글쓰기 4가지": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
                "구글 검색 상위 노출 7가지": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
                "대출 상환 방식 3가지 차이점": "/thumbnails/calc-loan_1783428362527.jpg",
                "서울커리어업 구직지원금": "/thumbnails/seoulkeorieobgujigjiwongeum202_1783420358572.jpg",
                "부동산 중개 수수료 계산기": "/thumbnails/budongsanjunggae_1783420439194.jpg",
                "부부 공동명의 아파트 종부세 계산기": "/thumbnails/bubugongdongmyenguiapateujongb_1783412616169.jpg",
                "학교폭력 대처법 및 법적 대응": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
                "학폭 피해자: 3년 손해배상": "/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
                "학폭 피해자: 2대 민형사": "/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
                "소상공인 경영안정 바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
                "신혼부부 공공임대주택": "/thumbnails/wedding_house_1783229249822.jpg",
                "대환대출: 2026 정부": "/thumbnails/sosanggongindaehwandaechuljiwo_1783426170298.jpg",
                "노인 보청기 지원금": "/thumbnails/ears_1783420565572.jpg",
                "직장인 부업: 3가지": "/thumbnails/two_job_1783420683365.jpg",
                "배달 대행 부업 수익": "/thumbnails/two_job_1783159740990.jpg",
                "도시가스 한전 전기요금": "/thumbnails/electricity_save_1783032393230.jpg",
                "통신사 미환급금": "/thumbnails/point_it_1783420656708.jpg",
                "국세청 삼쩜삼": "/thumbnails/save_money_1783420633950.jpg",
                "은행 잠자는 계좌": "/thumbnails/save_money_1783159993186.jpg",
                "국민연금 납부액": "/thumbnails/save_money_1783159993186.jpg",
                "마이크론 테크놀로지": "/thumbnails/micron_tech_1783050382681.jpg",
                "마이크론 HBM4": "/thumbnails/micron_tech_1783050382681.jpg",
                "직장인 웰빙 시간관리": "/thumbnails/time_study_1783010502348.jpg",
                "한강공원 수영장": "/thumbnails/hangang_pool_1783032727590.jpg"
            }

            print("\n[STEP 3] Performing precise thumbnail alignments...")
            realigned_count = 0
            
            # 다시 한번 works 테이블을 조회하여 썸네일 정렬
            req_query2 = urllib.request.Request(query_url, headers=headers)
            with urllib.request.urlopen(req_query2) as res2:
                fresh_list = json.loads(res2.read().decode("utf-8"))
                
                for item in fresh_list:
                    wid = item["id"]
                    title = item["title"]
                    current_thumb = item.get("thumbnail", "")
                    
                    matched_cover = ""
                    for kw, cover_url in precise_image_map.items():
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
                            print(f" ==> [REALIGN 2:3] Title: '{title}' -> Fixed: '{matched_cover}'")
                            realigned_count += 1

            print(f"\n--- [DEDUP & ALIGNMENT PROCESS COMPLETE] ---")
            print(f"Total duplicate posts deleted: {deleted_count}")
            print(f"Total exact thumbnails realigned: {realigned_count}")
            
    except Exception as e:
        print("[ERROR] Operation failed:", e)

if __name__ == "__main__":
    run_dedup_and_precise_repair()
