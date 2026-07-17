# -*- coding: utf-8 -*-
"""
유저님이 지정하신 최신 8개 글을 워드프레스에서 긁어와서
정확한 2:3 비율의 책 표지 썸네일 경로를 매핑하고, 
각각 현재 시각 기준 1시간 ~ 8시간 뒤 순차적 예약 발행 상태로 Supabase DB에 강제 주입하는 스크립트.
"""

import os
import json
import datetime
import base64
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_specific_8_restore():
    url = ""
    service_key = ""
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
                    if k == "NEXT_PUBLIC_SUPABASE_URL":
                        url = v
                    elif k == "SUPABASE_SERVICE_ROLE_KEY":
                        service_key = v
                    elif k == "WP_ADMIN_USERNAME":
                        wp_user = v
                    elif k == "WP_APPLICATION_PASSWORD":
                        wp_pass = v

    if not url or not service_key or not wp_user or not wp_pass:
        print("[ERROR] Credentials missing!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    # 1. 워드프레스의 모든 글 80개 페치 (status=any,trash,draft 전체 검색)
    print("\n[STEP 1] Fetching WordPress posts pool for specific 8...")
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any,trash,draft,future,private,publish&per_page=80&_embed"
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    wp_posts = []
    try:
        with urllib.request.urlopen(req_wp) as res:
            wp_posts = json.loads(res.read().decode("utf-8"))
            print(f" ==> Successfully retrieved {len(wp_posts)} posts.")
    except Exception as e:
        print("[ERROR] WP fetch failed:", e)
        return

    # 2. 타깃 8종 제목 키워드 및 지정 시간간격(시간 뒤), 2:3 표지 썸네일 매핑 정의
    target_8_specs = [
        {
            "keyword": "근로장려금 자녀장려금",
            "hours_delay": 1,
            "cover": "/thumbnails/voucher_bookcover_1783250061587.jpg"
        },
        {
            "keyword": "국민취업지원제도 1유형",
            "hours_delay": 2,
            "cover": "/thumbnails/irp_bookcover_1783402575192.jpg"
        },
        {
            "keyword": "도시가스 한전 전기요금",
            "hours_delay": 3,
            "cover": "/thumbnails/electricity_save_bookcover_1783018285121.jpg"
        },
        {
            "keyword": "여신금융협회 신용카드 포인트",
            "hours_delay": 4,
            "cover": "/thumbnails/national_pension_bookcover_1783402097098.jpg"
        },
        {
            "keyword": "통신사 미환급금 조회로",
            "hours_delay": 5,
            "cover": "/thumbnails/national_pension_bookcover_1783402097098.jpg"
        },
        {
            "keyword": "국세청 삼쩜삼 숨은 세금",
            "hours_delay": 6,
            "cover": "/thumbnails/jongbuse_bookcover_1783408998316.jpg"
        },
        {
            "keyword": "부동산 규제 개정으로",
            "hours_delay": 7,
            "cover": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"
        },
        {
            "keyword": "냉감 침구",
            "hours_delay": 8,
            "cover": "/thumbnails/pear_balloon_flower_tea_main_1783182189888.jpg"
        }
    ]

    # 3. works 테이블에 1시간 간격 예약 발행 상태(status='공개예정')로 주입
    print("\n[STEP 2] Inserting the specific 8 posts with correct 2:3 covers and schedule...")
    base_time = datetime.datetime.now(datetime.timezone.utc)
    restored_count = 0

    for spec in target_8_specs:
        key = spec["keyword"]
        hours = spec["hours_delay"]
        cover_url = spec["cover"]
        
        matched_post = None
        for p in wp_posts:
            wp_title = p.get("title", {}).get("rendered", "").strip()
            if key in wp_title:
                matched_post = p
                break
                
        if matched_post:
            wp_title = matched_post.get("title", {}).get("rendered", "")
            wp_content = matched_post.get("content", {}).get("rendered", "")
            
            # 💡 중복 꼬임을 전면 차단하기 위해 유니크한 post-wp-[ID] 값으로 강제 고정
            slug = f"post-wp-{matched_post.get('id')}"
            
            # 순차적 예약 발행 일자 강제 설정
            scheduled_time = base_time + datetime.timedelta(hours=hours)
            scheduled_iso = scheduled_time.strftime("%Y-%m-%dT%H:%M:%S+00:00")

            work_payload = {
                "id": slug,
                "title": wp_title,
                "description": wp_content,
                "thumbnail": cover_url, # 2:3 완벽 책 표지 주소 지정
                "status": "공개예정",   # 예약 상태 지정
                "subtitle": "[블로그]",
                "badge": "",
                "episode_count": 0,
                "total_episodes": 50,
                "free_episodes": 10,
                "exclusive": True,
                "featured": True,
                "views": 0,
                "play_count": 0,
                "is_membership_only": False,
                "last_voice": None,
                "last_pitch": None,
                "last_rate": None,
                "created_at": scheduled_iso
            }

            # Supabase UPSERT 수행
            insert_url = f"{url}/rest/v1/works"
            insert_data = json.dumps(work_payload).encode("utf-8")
            
            upsert_headers = headers.copy()
            upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
            
            req_ups = urllib.request.Request(
                insert_url,
                data=insert_data,
                headers=upsert_headers,
                method="POST"
            )
            try:
                with urllib.request.urlopen(req_ups) as res_ups:
                    res_payload = json.loads(res_ups.read().decode("utf-8"))
                    if res_payload:
                        print(f" ==> [SPECIFIC RESTORE SUCCESS] ID: {slug} | '{wp_title}'")
                        print(f"     -> Scheduled Time: {scheduled_iso}")
                        print(f"     -> Cover Path: {cover_url}")
                        restored_count += 1
            except Exception as e:
                print(f" ==> [ERROR] Failed to restore specific post {wp_title}: {e}")
        else:
            print(f" ==> [WARNING] specific post keyword '{key}' not found in WordPress pool!")

    print(f"\n--- [SPECIFIC 8 RESTORE COMPLETE] ---")
    print(f"Successfully restored {restored_count} target posts with correct 2:3 covers and schedule.")

if __name__ == "__main__":
    run_specific_8_restore()
