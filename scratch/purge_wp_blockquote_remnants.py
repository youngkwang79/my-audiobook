# -*- coding: utf-8 -*-
"""
본문(description) 내에 '<blockquote>' 태그 또는 'blockquote'가 포함되어 유입된
모든 워드프레스 전용 하얀색 박스 찌꺼기 글들을 데이터베이스 works 테이블에서 완전히 영구 삭제(DELETE)하는 스크립트.
(소설 및 계산기 데이터는 100% 격리 보호)
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_purge_wp_blockquote_remnants():
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

    print("\n[STEP 1] Detecting and deleting posts with '<blockquote>' box remnants...")
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
                
                # 소설은 무조건 안전 격리
                if wid in ["yajangsingeom", "yahyelhwamyeng", "cheongun", "sogaju"]:
                    continue
                    
                # '<blockquote>' 기호 검색
                has_blockquote = "blockquote" in desc.lower() or "<blockquote>" in desc.lower()
                
                if has_blockquote:
                    print(f" ==> [DELETE TARGET DETECTED]: '{title}' (ID: {wid})")
                    print("     Reason: Found WordPress style box blockquote element.")
                    
                    del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                    with urllib.request.urlopen(req_del) as _:
                        print(f"   -> [DELETED SUCCESS] Removed ID: {wid}")
                        deleted_count += 1
                        
        print(f"\n--- [CLEANSING COMPLETE] ---")
        print(f"Successfully purged {deleted_count} remnants containing 'blockquote' from works table.")
        
    except Exception as e:
        print("[ERROR] Cleansing process failed:", e)

if __name__ == "__main__":
    run_purge_wp_blockquote_remnants()
