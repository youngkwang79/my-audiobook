# -*- coding: utf-8 -*-
"""
Supabase 실시간 works 테이블의 현재 모든 등록 데이터(ID, 제목, 썸네일 주소, 상태 등)를
직접 쿼리하여 콘솔에 100% 투명하게 출력해 주는 검증용 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_live_database():
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

    # works 테이블의 현재 등록 현황 페치
    query_url = f"{url}/rest/v1/works?select=id,title,status,thumbnail,subtitle&order=id.asc"
    req = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as res:
            works = json.loads(res.read().decode("utf-8"))
            print(f"\n=======================================================")
            print(f"      [SUPABASE LIVE DB works TABLE CURRENT STATUS]")
            print(f"        Total Works Registered in DB: {len(works)}")
            print(f"=======================================================")
            
            for idx, w in enumerate(works, 1):
                wid = w["id"]
                title = w["title"]
                status = w.get("status", "N/A")
                thumb = w.get("thumbnail", "N/A")
                subtitle = w.get("subtitle", "N/A")
                
                print(f"[{idx:02d}] ID: {wid}")
                print(f"     Title: '{title}'")
                print(f"     Status: {status} | Subtitle: {subtitle}")
                print(f"     Thumbnail: {thumb}")
                print(f"-------------------------------------------------------")
                
            print(f"=======================================================\n")
            
    except Exception as e:
        print("[ERROR] Live DB check failed:", e)

if __name__ == "__main__":
    check_live_database()
