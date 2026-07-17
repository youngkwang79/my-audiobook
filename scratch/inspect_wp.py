# -*- coding: utf-8 -*-
"""
blog.murimbook.com의 최근 10개 글 상태(status)와 발행 예정 시각을 조회하여 
무엇이 예약글 상태로 바뀌었는지 파악하는 검증 스크립트
"""

import os
import json
import urllib.request
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect_wp_posts():
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

    # 모든 상태(status=any)의 최신 15개 포스트 파악
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any&per_page=15"
    
    req = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            posts = json.loads(res.read().decode("utf-8"))
            print(f"[FOUND] Found {len(posts)} posts in WordPress total.")
            for p in posts:
                print(f" - ID: {p['id']}")
                print(f"   Title: {p['title']['rendered']}")
                print(f"   Status: {p['status']}")
                print(f"   Date (Local): {p['date']}")
                print(f"   Date UTC: {p['date_gmt']}")
    except Exception as e:
        print("[ERROR] Failed to query WordPress:", e)

if __name__ == "__main__":
    inspect_wp_posts()
