# -*- coding: utf-8 -*-
"""
본문(description) 내부에 <img> 태그가 포함되어 있거나 
썸네일이 정상 2:3 (/thumbnails/) 형식이 아닌 글들을 100% 감지하여 
works 테이블에서 일괄 삭제(DELETE) 처리하여 무림북.컴을 완전 정화하는 스크립트
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_strict_cleanup():
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

    # 1. 모든 작품/포스팅 데이터 쿼리
    print("\n[STEP 1] Querying all works entries from Supabase...")
    query_url = f"{url}/rest/v1/works?select=id,title,description,thumbnail"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} works total in database.")
            
            deleted_count = 0
            retained_count = 0
            
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                description = w.get("description", "")
                thumb = w.get("thumbnail", "")
                
                # 💡 [유저님의 절대 공식을 적용한 정밀 판별 조건]
                # 1. 본문(description) 내부에 이미지 태그 "<img"가 존재하는 경우 -> 워드프레스용 글 (삭제 대상)
                # 2. 혹은 썸네일 경로가 비어있거나, "/thumbnails/"가 아닌 uploads 등 가로형인 경우 -> 삭제 대상
                has_image_in_content = "<img" in description or "&lt;img" in description
                has_invalid_thumbnail = not thumb or ("uploads" in thumb) or ("wp-content" in thumb) or (not thumb.startswith("/thumbnails/"))
                
                # 예외 처리: 소설 작품의 1화 글들은 썸네일 경로가 다를 수 있으므로 ID에 post-wp- 가 붙은 것만 정밀 필터링합니다.
                if "post-wp-" in wid:
                    if has_image_in_content or has_invalid_thumbnail:
                        print(f" ==> [DELETE TARGET DETECTED]: '{title}' (ID: {wid})")
                        if has_image_in_content:
                            print("     Reason: Found <img> tag in the article body.")
                        if has_invalid_thumbnail:
                            print(f"     Reason: Invalid/horizontal thumbnail path: {thumb}")
                        
                        # DELETE API 전송
                        del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                        with urllib.request.urlopen(req_del) as _:
                            print(f"   -> [DELETED] Removed ID: {wid}")
                            deleted_count += 1
                    else:
                        print(f"  -> [RETAINED]: '{title}' (True 2:3 clean post - ID: {wid})")
                        retained_count += 1
                else:
                    # 일반 소설 작품 등
                    retained_count += 1
                    
            print(f"\n--- [STRICT CLEANUP PROCESS COMPLETE] ---")
            print(f"Successfully deleted {deleted_count} blog.murimbook.com post(s).")
            print(f"Retained {retained_count} true murimbook.com 2:3 post(s).")
            
    except Exception as e:
        print("[ERROR] Strict cleanup failed:", e)

if __name__ == "__main__":
    run_strict_cleanup()
