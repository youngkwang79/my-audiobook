# -*- coding: utf-8 -*-
"""
works 테이블에서 1개 레코드를 영어 쿼리(limit=1)로만 안전하게 가져와 
컬럼 목록과 데이터 타입을 확인하는 진단 스크립트 (한글 인코딩 배제)
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect_schema():
    url = ""
    key = ""
    
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

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    }

    # 단순 limit=1 영어 주소 쿼리
    query_url = f"{url}/rest/v1/works?limit=1"
    req = urllib.request.Request(query_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data:
                print("[SCHEMA INSPECT SUCCESS] Found Sample Record:")
                print(json.dumps(data[0], ensure_ascii=False, indent=2))
            else:
                print("[WARNING] No record found in works table.")
    except Exception as e:
        print(f"[ERROR] Failed to query schema: {e}")

if __name__ == "__main__":
    inspect_schema()
