# -*- coding: utf-8 -*-
"""
무림북.컴(murimbook.com) works 테이블에 예약 대기 중(status='공개예정')인 7개 글을
즉시 노출 상태(status='공개') 및 현재 시간으로 강제 패치하여 홈페이지 상에 즉각 부활시키는 스크립트.
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def force_publish_7_posts():
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

    # 강제 즉시 공개 타깃 글 ID 목록
    target_ids = [
        "post-wp-1337", # 근로장려금
        "post-wp-1335", # 구직촉진수당
        "post-wp-1404", # 도시가스 캐시백
        "post-wp-1402", # 신용카드 포인트
        "post-wp-1400", # 통신사 미환급금
        "post-wp-1396", # 국세청 삼쩜삼
        "post-wp-1225"  # 부동산 청약
    ]

    print("\n--- [START FORCING STATUS TO PUBLISH ON MURIMBOOK.COM] ---")
    current_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    success_count = 0

    for pid in target_ids:
        patch_url = f"{url}/rest/v1/works?id=eq.{pid}"
        payload = json.dumps({
            "status": "공개",            # 즉시 홈페이지 메인 노출 상태 전환
            "created_at": current_time_iso # 현재 타임라인으로 노출 시점 조정
        }).encode("utf-8")

        req = urllib.request.Request(
            patch_url,
            data=payload,
            headers=headers,
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(req) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                if res_data:
                    print(f" ==> [FORCE PUBLISHED SUCCESS] ID: {pid} | Title: '{res_data[0]['title']}'")
                    success_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to patch ID {pid}: {e}")

    print(f"\n--- [FORCE PUBLISH PROCESS COMPLETE] ---")
    print(f"Successfully published {success_count} posts to murimbook.com works table.")

if __name__ == "__main__":
    force_publish_7_posts()
