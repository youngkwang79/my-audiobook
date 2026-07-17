# -*- coding: utf-8 -*-
"""
Supabase works 테이블에 기생 중복으로 섞여있는 불순물 글 5종
(stop_stop, wedding_house, tomarrow_study, gaeinhye, google_top)을 
완전히 영구 삭제(DELETE)하여 원형의 깨끗한 포트폴리오만 남기는 최종 청소 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_final_database_cleansing():
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

    # ❌ 명백하게 제거 대상인 5대 기생 중복 ID
    garbage_ids = [
        "stop_stop",         # 중복 학폭 글
        "wedding_house",     # 중복 신혼부부 글
        "tomarrow_study",    # 중복 내일배움카드 글
        "gaeinhye",          # 중복 IRP 글
        "google_top"         # 중복 구글 SEO 글
    ]

    print("\n--- [START FINAL DATABASE CLEANSE FOR 5 GARBAGES] ---")
    deleted_count = 0

    for gid in garbage_ids:
        del_url = f"{url}/rest/v1/works?id=eq.{gid}"
        req = urllib.request.Request(
            del_url,
            headers=headers,
            method="DELETE"
        )
        try:
            with urllib.request.urlopen(req) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                if res_data:
                    print(f" ==> [CLEANSED GARBAGE SUCCESS] Purged ID: '{gid}'")
                    deleted_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to purge ID {gid}: {e}")

    print(f"\n--- [FINAL DATABASE CLEANSING PROCESS COMPLETE] ---")
    print(f"Successfully cleaned {deleted_count} redundant entries from murimbook.com.")

if __name__ == "__main__":
    run_final_database_cleansing()
