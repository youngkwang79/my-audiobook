# -*- coding: utf-8 -*-
"""
유저님이 지정하신 진짜 10대 알맹이 포스트를 WordPress (draft 및 future 상태)로부터 
정밀 선별 추출하여 무림북 works DB에 1시간 간격 순차 정렬로 완전 강착
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_perfect_10_sync():
    url = ""
    service_key = ""
    wp_user = ""
    wp_pass = ""

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

    # 1. 기존 post-wp-* 청소
    print("\n[STEP 1] Cleansing Supabase post-wp-* works entries...")
    delete_url = f"{url}/rest/v1/works?id=like.post-wp-*"
    req_del = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as _:
            print(" ==> Cleaned older entries successfully.")
    except Exception as e:
        print(f" ==> Clean error: {e}")

    # 2. WP API status=any (draft, future, publish, trash 모두 긁어옴)
    print("\n[STEP 2] Querying all WordPress posts to filter perfect 10...")
    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    # 30개 글 한꺼번에 조회하여 필터링
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any&per_page=30&_embed"
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    posts = []
    try:
        with urllib.request.urlopen(req_wp) as res:
            posts = json.loads(res.read().decode("utf-8"))
            print(f" ==> Retrieved {len(posts)} total posts from WP raw.")
    except Exception as e:
        print(f"[ERROR] WP query failed: {e}")
        return

    # 유저님이 원하신 10개 글 키워드 정의
    target_keywords = [
        "도시가스 한전 전기요금",
        "신용카드 포인트 현금화",
        "통신사 미환급금",
        "은행 잠자는 계좌",
        "삼쩜삼 숨은 세금",
        "근로장려금 자녀장려금",
        "국민취업지원제도",
        "국민내일배움카드",
        "실업급여 신청",
        "국민건강보험 미수령"
    ]

    selected_posts = []
    for title_kw in target_keywords:
        matched = False
        for p in posts:
            wp_title = p.get("title", {}).get("rendered", "")
            if title_kw in wp_title:
                selected_posts.append(p)
                matched = True
                break
        if not matched:
            print(f" ==> [WARNING] Title containing '{title_kw}' not found in WP list!")

    print(f"\n[STEP 3] Re-scheduling {len(selected_posts)} filtered posts into Supabase works table...")
    base_time = datetime.datetime.now(datetime.timezone.utc)
    inserted_count = 0

    for idx, post in enumerate(selected_posts):
        wp_title = post.get("title", {}).get("rendered", "")
        wp_content = post.get("content", {}).get("rendered", "")
        
        slug = f"post-wp-{post.get('id', idx)}"
        
        # 썸네일
        featured_media_url = ""
        embedded = post.get("_embedded", {})
        if "wp:featuredmedia" in embedded and len(embedded["wp:featuredmedia"]) > 0:
            featured_media_url = embedded["wp:featuredmedia"][0].get("source_url", "")
        
        if not featured_media_url:
            featured_media_url = "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"

        # 1시간 간격 순차 예약
        scheduled_time = base_time + datetime.timedelta(hours=inserted_count + 1)
        scheduled_iso = scheduled_time.strftime("%Y-%m-%dT%H:%M:%S+00:00")

        work_payload = {
            "id": slug,
            "title": wp_title,
            "description": wp_content,
            "thumbnail": featured_media_url,
            "status": "공개예정",
            "subtitle": "[블로그]",
            "badge": "",
            "created_at": scheduled_iso,
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
            "last_rate": None
        }

        # Supabase INSERT
        insert_url = f"{url}/rest/v1/works"
        insert_data = json.dumps(work_payload).encode("utf-8")
        req_ins = urllib.request.Request(
            insert_url,
            data=insert_data,
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req_ins) as res_ins:
                res_payload = json.loads(res_ins.read().decode("utf-8"))
                if res_payload:
                    print(f" ==> [{inserted_count + 1}] INSERTED: {wp_title} (ID: {slug})")
                    print(f"     -> Scheduled: {scheduled_iso}")
                    inserted_count += 1
        except Exception as e:
            try:
                upsert_headers = headers.copy()
                upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
                req_ups = urllib.request.Request(
                    insert_url,
                    data=insert_data,
                    headers=upsert_headers,
                    method="POST"
                )
                with urllib.request.urlopen(req_ups) as res_ups:
                    res_payload = json.loads(res_ups.read().decode("utf-8"))
                    if res_payload:
                        print(f" ==> [{inserted_count + 1}] UPSERTED: {wp_title} (ID: {slug})")
                        print(f"     -> Scheduled: {scheduled_iso}")
                        inserted_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to insert {wp_title}: {ex}")

    print(f"\n--- [PERFECT 10 SYNC COMPLETE] ---")
    print(f"Successfully synchronized {inserted_count} real articles to murimbook.com")

if __name__ == "__main__":
    run_perfect_10_sync()
