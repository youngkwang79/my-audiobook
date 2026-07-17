# -*- coding: utf-8 -*-
"""
워드프레스 휴지통에 들어간 4대 핵심 예약글들을 다시 'future' 상태로 
복원시키고 원래의 예약 시간대로 돌려놓는 스크립트
"""

import os
import json
import base64
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

def restore_wp_future_posts():
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

    # 복원 대상 워드프레스 ID 및 원래 매핑 시간
    # (한국 시간 기준으로 원래 예약되어 있던 시각 그대로 강제 지정)
    restore_targets = [
        {"id": 1404, "status": "future", "date": "2026-07-12T02:00:00"}, # 도시가스 요금
        {"id": 1402, "status": "future", "date": "2026-07-12T01:00:00"}, # 신용카드
        {"id": 1400, "status": "future", "date": "2026-07-12T00:00:00"}, # 통신사
        {"id": 1398, "status": "future", "date": "2026-07-11T23:00:00"}  # 은행 예금
    ]

    print("\n--- [START RESTORING WP RESERVATIONS FROM TRASH] ---")

    for target in restore_targets:
        pid = target["id"]
        # 1. 휴지통에서 일반 복원 처리 (상태를 다시 draft 상태로 임시 복원함)
        restore_url = f"https://blog.murimbook.com/wp-json/wp/v2/posts/{pid}"
        
        # draft 상태로 복구 요청 보냄
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
                print(f" ==> [STEP 1] Recovered from Trash to Draft: ID {pid}")
                
                # 2. 상태를 다시 'future' 예약 상태 및 지정 시간으로 변경 업데이트
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
                    print(f" ==> [STEP 2] Status set back to FUTURE: '{final_post['title']['rendered']}'")
                    print(f"     -> Restored Local Date: {final_post['date']}")
        except Exception as e:
            # 만약 이미 휴지통이 아니라면 즉시 status=future 업데이트 바로 시도
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

    print("\n--- [RESTORATION PROCESS COMPLETE] ---")

if __name__ == "__main__":
    restore_wp_future_posts()
