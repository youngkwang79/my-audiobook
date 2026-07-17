# -*- coding: utf-8 -*-
"""
자동 스크립트로 워드프레스에 업로드되었으나 
실수로 휴지통으로 이동되었던 9시, 10시, 11시, 12시 타임라인 예약글들을 복원하는 스크립트
"""

import os
import json
import base64
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

def restore_wp_auto_posts():
    wp_user = ""
    wp_pass = ""

    # Credentials 로드
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    parts = line.strip().split("=", 1)
                    k = parts[0].strip()
                    v = parts[1].strip()
                    if k == "WP_ADMIN_USERNAME":
                        wp_user = v
                    elif k == "WP_APPLICATION_PASSWORD":
                        wp_pass = v

    if not wp_user or not wp_pass:
        print("[ERROR] Credentials missing!")
        return

    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    # 자동 스크립트로 올렸던 글 ID와 목표 복원 시간대 매핑
    restore_targets = [
        {"id": 1352, "status": "future", "date": "2026-07-12T00:00:09"}, # 대출 규제
        {"id": 1349, "status": "future", "date": "2026-07-11T23:00:09"}, # 반도체 레버리지
        {"id": 1346, "status": "future", "date": "2026-07-11T22:00:09"}, # 증권박물관
        {"id": 1343, "status": "future", "date": "2026-07-11T21:00:09"}  # 예탁금 증시 전망
    ]

    print("\n--- [START RESTORING AUTO-GENERATED WP POSTS FROM TRASH] ---")

    for target in restore_targets:
        pid = target["id"]
        restore_url = f"https://blog.murimbook.com/wp-json/wp/v2/posts/{pid}"
        
        # draft 상태로 임시 복구 요청
        patch_payload = json.dumps({
            "status": "draft"
        }).encode("utf-8")
        
        req_restore = urllib.request.Request(
            restore_url,
            data=patch_payload,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Authorization": f"Basic {encoded_auth}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req_restore) as res:
                restored_post = json.loads(res.read().decode("utf-8"))
                print(f" ==> Recovered from Trash to Draft: ID {pid}")
                
                # 'future' 상태 및 시간 업데이트
                future_payload = json.dumps({
                    "status": "future",
                    "date": target["date"]
                }).encode("utf-8")
                
                req_future = urllib.request.Request(
                    restore_url,
                    data=future_payload,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Authorization": f"Basic {encoded_auth}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                
                with urllib.request.urlopen(req_future) as res_f:
                    final_post = json.loads(res_f.read().decode("utf-8"))
                    print(f" ==> Status set back to FUTURE: '{final_post['title']['rendered']}'")
                    print(f"     -> Restored Local Date: {final_post['date']}")
        except Exception as e:
            # 직접 업데이트
            try:
                future_payload = json.dumps({
                    "status": "future",
                    "date": target["date"]
                }).encode("utf-8")
                req_future = urllib.request.Request(
                    restore_url,
                    data=future_payload,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Authorization": f"Basic {encoded_auth}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req_future) as res_f:
                    final_post = json.loads(res_f.read().decode("utf-8"))
                    print(f" ==> [DIRECT] Restored to FUTURE: '{final_post['title']['rendered']}'")
            except Exception as ex:
                print(f" ==> [ERROR] Failed to restore ID {pid}: {e} / {ex}")

    print("\n--- [AUTO-POST RESTORATION PROCESS COMPLETE] ---")

if __name__ == "__main__":
    restore_wp_auto_posts()
