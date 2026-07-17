# -*- coding: utf-8 -*-
"""
무림북.컴의 works 테이블에 잘못 들어갔던 
1~4번 제품 리뷰 글(아토팜, 테팔, 리스테린, 프로쉬)들을 데이터베이스 상에서 완전히 영구 삭제(DELETE)하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_purge_product_reviews():
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
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # 삭제 대상 ID 목록 (프로쉬, 아토팜, 테팔, 리스테린 등)
    delete_targets = [
        "prosh", # 프로쉬 식기세척기 세제
        "prosh_dish_cleanser",
        "atopam", # 아토팜 탑투토 워시
        "atopam_wash",
        "tepal", # 테팔 인덕션 프라이팬
        "tepal_pan",
        "listerine", # 리스테린
        "listerine_wash"
    ]

    # 혹은 제목 키워드로 정확하게 대조하여 works 테이블에서 완벽히 삭제
    print("\n--- [START DELETING ILLEGALLY INSERTED PRODUCT REVIEWS] ---")
    
    # works 목록 조회
    query_url = f"{url}/rest/v1/works?select=id,title"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    deleted_count = 0
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                
                # 제품명 키워드가 들어있는 행 식별
                is_product_review = "프로쉬" in title or "아토팜" in title or "테팔" in title or "리스테린" in title
                
                if is_product_review or wid in delete_targets:
                    del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                    with urllib.request.urlopen(req_del) as _:
                        print(f" ==> [PURGED PRODUCT REVIEW SUCCESS] ID: {wid} | Title: '{title}'")
                        deleted_count += 1
                        
        print(f"\n--- [PRODUCT PURGE COMPLETE] ---")
        print(f"Successfully deleted {deleted_count} product review posts from murimbook.com.")
        
    except Exception as e:
        print("[ERROR] Purging failed:", e)

if __name__ == "__main__":
    run_purge_product_reviews()
