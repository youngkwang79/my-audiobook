# -*- coding: utf-8 -*-
"""
1. Supabase works 테이블에서 잘못 들어간 post-wp-* 글들 전체를 일괄 삭제
2. 워드프레스 관리자 API 인증(Basic Auth)을 사용해 '임시글(Draft)' 상태의 진짜 6개 글 데이터를 긁어옴
3. 긁어온 6개 글을 1시간 간격 순차적 예약 발행으로 works 테이블에 삽입
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_draft_sync():
    url = ""
    service_key = ""
    wp_url = ""
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
                    elif k == "WP_URL":
                        wp_url = v
                    elif k == "WP_ADMIN_USERNAME":
                        wp_user = v
                    elif k == "WP_APPLICATION_PASSWORD":
                        wp_pass = v

    if not url or not service_key or not wp_user or not wp_pass:
        print("[ERROR] Credentials missing in .env.local!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # -------------------------------------------------------------
    # STEP 1: 잘못 들어간 post-wp-* 형태의 예약 포스트들 완전 롤백 삭제
    # -------------------------------------------------------------
    print("\n[STEP 1] Rolling back previously mis-synced WordPress posts...")
    delete_url = f"{url}/rest/v1/works?id=like.post-wp-*"
    req_del = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as res_del:
            del_data = json.loads(res_del.read().decode("utf-8"))
            print(f" ==> Successfully deleted {len(del_data)} mis-synced post(s).")
    except Exception as e:
        print(f" ==> Rollback deletion error: {e}")

    # -------------------------------------------------------------
    # STEP 2: 워드프레스 BASIC 인증을 실어 '임시글(draft)' 6개 페치
    # -------------------------------------------------------------
    print("\n[STEP 2] Fetching DRAFT posts from WordPress using Basic Authentication...")
    
    # WP API Credentials 인코딩
    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    # status=draft 주입하여 임시 보관글만 정밀 수집
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=draft&per_page=10&_embed"
    
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    posts_data = []
    try:
        with urllib.request.urlopen(req_wp) as res_wp:
            posts_data = json.loads(res_wp.read().decode("utf-8"))
            print(f" ==> Successfully fetched {len(posts_data)} draft post(s) from WordPress.")
    except Exception as e:
        print(f"[ERROR] Failed to fetch draft posts: {e}")
        return

    if not posts_data:
        print("[WARNING] No draft posts found in WordPress. Please ensure they are in 'Draft' status.")
        return

    # -------------------------------------------------------------
    # STEP 3: 1시간 간격 예약 발행으로 Supabase works 테이블에 정밀 삽입
    # -------------------------------------------------------------
    print("\n[STEP 3] Inserting true draft posts with 1-hour schedule interval...")
    
    base_time = datetime.datetime.now(datetime.timezone.utc)
    inserted_count = 0

    for idx, post in enumerate(posts_data):
        wp_title = post.get("title", {}).get("rendered", "")
        wp_content = post.get("content", {}).get("rendered", "")
        
        slug = f"post-wp-{post.get('id', idx)}"
        
        # 썸네일 탐색
        featured_media_url = ""
        embedded = post.get("_embedded", {})
        if "wp:featuredmedia" in embedded and len(embedded["wp:featuredmedia"]) > 0:
            featured_media_url = embedded["wp:featuredmedia"][0].get("source_url", "")
        
        if not featured_media_url:
            featured_media_url = "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"

        # 1시간 단위 순차 시간
        scheduled_time = base_time + datetime.timedelta(hours=idx + 1)
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
                    print(f" ==> [{idx + 1}/{len(posts_data)}] INSERTED: {wp_title} (ID: {slug})")
                    print(f"     -> Scheduled: {scheduled_iso}")
                    inserted_count += 1
        except Exception as e:
            # 중복 발생 대비 UPSERT
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
                        print(f" ==> [{idx + 1}/{len(posts_data)}] UPSERTED: {wp_title} (ID: {slug})")
                        inserted_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to insert/upsert {wp_title}: {ex}")

    print(f"\n--- [SYNC PROCESS COMPLETE] ---")
    print(f"Total synchronized & scheduled real posts: {inserted_count}/{len(posts_data)}")

if __name__ == "__main__":
    run_draft_sync()
