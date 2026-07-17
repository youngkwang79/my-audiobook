# -*- coding: utf-8 -*-
"""
무림북.컴 works 테이블에서 방금 워드프레스 동기화로 인해 새로 삽입된 글들 중 
2:3 표지 매핑에 실패했거나 여전히 가로형 워드프레스(uploads/wp-content 등) 경로를 
가지고 있는 원치 않는 최신 글들을 일괄 식별해 삭제(DELETE) 처리하는 스크립트
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_cleanup_wp_extra():
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

    # 1. works 테이블의 모든 레코드 조회
    print("\n[STEP 1] Querying all works entries to detect non-2:3 imported posts...")
    query_url = f"{url}/rest/v1/works?select=id,title,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works total.")
            
            deleted_count = 0
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                thumb = w.get("thumbnail", "")
                
                # 💡 [필터링 조건]
                # ID가 post-wp- 로 시작하고, 썸네일 경로가 여전히 워드프레스uploads 이미지이거나 
                # 또는 2:3 복원 조견표에 부합하지 않아 복구되지 않고 남아있는 불필요한 글 삭제
                if "post-wp-" in wid:
                    # 2:3 표지인 /thumbnails/ 형식으로 변환되지 못하고 여전히 uploads/wp-content 가 포함되어 있는 경우
                    if "uploads" in thumb or "wp-content" in thumb or "google_seo_strategy" in thumb:
                        print(f" ==> Detecting newly imported unwanted post: '{title}' (ID: {wid})")
                        
                        # 삭제 API 호출
                        del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                        with urllib.request.urlopen(req_del) as _:
                            print(f"   -> [DELETED SUCCESS] Removed ID {wid} from works table.")
                            deleted_count += 1
                            
            print(f"\n--- [CLEANUP COMPLETE] ---")
            print(f"Successfully removed {deleted_count} unwanted extra post(s).")
            
    except Exception as e:
        print("[ERROR] Cleanup failed:", e)

if __name__ == "__main__":
    run_cleanup_wp_extra()
