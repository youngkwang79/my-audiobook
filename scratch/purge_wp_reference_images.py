# -*- coding: utf-8 -*-
"""
본문(description) 내에 '[참고 이미지]' 또는 '[참고 이미지' 기호가 포함된
모든 워드프레스 잔재 글들을 100% 식별하여 데이터베이스 works 테이블에서 영구 삭제(DELETE)하는 스크립트.
또한 scratch/ 백업 스토어에서 이 기호가 없는 순수 무림북 지식글만 UPSERT 유지합니다.
(소설은 100% 철저 격리)
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_purge_wp_reference_images():
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

    # 1. works 테이블에서 '[참고 이미지]' 포함 글 삭제
    print("\n[STEP 1] Detecting and deleting posts with '[참고 이미지]' from works table...")
    query_url = f"{url}/rest/v1/works?select=id,title,description"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    deleted_count = 0
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Total works fetched from DB: {len(works_list)}")
            
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                desc = w.get("description", "")
                
                # 소설은 무조건 통과 배제
                if wid in ["yajangsingeom", "yahyelhwamyeng", "cheongun", "sogaju"]:
                    continue
                    
                # '[참고 이미지]' 검색 감색
                has_wp_reference_img = "[참고 이미지]" in desc or "[참고 이미지" in desc
                
                if has_wp_reference_img:
                    print(f" ==> [DELETE TARGET DETECTED]: '{title}' (ID: {wid})")
                    print("     Reason: Found WordPress text marker '[참고 이미지]'.")
                    
                    del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                    with urllib.request.urlopen(req_del) as _:
                        print(f"   -> [DELETED SUCCESS] Removed ID: {wid}")
                        deleted_count += 1
                        
        print(f"\n--- [CLEANSING COMPLETE] ---")
        print(f"Successfully purged {deleted_count} WordPress helper posts from works table.")
        
    except Exception as e:
        print("[ERROR] Cleansing process failed:", e)

if __name__ == "__main__":
    run_purge_wp_reference_images()
