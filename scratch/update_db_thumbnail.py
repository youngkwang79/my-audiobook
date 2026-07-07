# -*- coding: utf-8 -*-
"""
Supabase REST API를 직접 호출하여 종부세 포스트의 썸네일 경로를 Cloudflare R2 주소로 갱신하는 라이브러리 프리(Library-free) 스크립트
"""

import os
import json
import urllib.request
import urllib.parse

def update_thumbnail_via_rest_api():
    url = ""
    key = ""
    
    # 1. 환경 변수 파일 로드 (.env.local)
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
                    elif k == "NEXT_PUBLIC_SUPABASE_ANON_KEY":
                        key = v

    if not url or not key:
        print("[ERROR] Supabase credentials not found!")
        return

    # 2. '부부 공동명의'가 포함된 포스트 조회
    target_title_encoded = urllib.parse.quote("%부부 공동명의%")
    query_url = f"{url}/rest/v1/works?title=ilike.{target_title_encoded}&select=id,title"
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    req_select = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_select) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data:
                for post in data:
                    pid = post["id"]
                    ptitle = post["title"]
                    print(f"[FOUND] ID: {pid} | Title: {ptitle}")
                    
                    # 3. 썸네일 업데이트 실행
                    patch_url = f"{url}/rest/v1/works?id=eq.{pid}"
                    patch_data = json.dumps({
                        "thumbnail": "https://r2.murimbook.com/thumbnails/jongbuse_bookcover_1783408998316.jpg"
                    }).encode("utf-8")
                    
                    req_patch = urllib.request.Request(
                        patch_url, 
                        data=patch_data, 
                        headers=headers, 
                        method="PATCH"
                    )
                    
                    with urllib.request.urlopen(req_patch) as patch_res:
                        patch_result = patch_res.read().decode("utf-8")
                        print(f"[SUCCESS] Forcibly updated thumbnail for '{ptitle}' to Cloudflare R2 path!")
            else:
                print("[WARNING] Target post not found via REST API!")
    except Exception as e:
        print(f"[ERROR] API failure: {e}")

if __name__ == "__main__":
    update_thumbnail_via_rest_api()
