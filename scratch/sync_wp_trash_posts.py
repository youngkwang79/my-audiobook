# -*- coding: utf-8 -*-
"""
누락된 '국민내일배움카드' 및 '실업급여 신청' 글을 
WordPress 검색 API를 통해 강제로 찾아서 Supabase works 테이블에 이어 채우는 보완 스크립트
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_recovery_sync():
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

    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    # 1. 현재 DB 예약 리스트 확인
    print("\n[STEP 1] Checking existing scheduled queue length...")
    encoded_status = urllib.parse.quote("공개예정")
    query_url = f"{url}/rest/v1/works?status=eq.{encoded_status}&order=created_at.desc"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    base_time = datetime.datetime.now(datetime.timezone.utc)
    existing_count = 0
    try:
        with urllib.request.urlopen(req_query) as res_q:
            q_data = json.loads(res_q.read().decode("utf-8"))
            existing_count = len(q_data)
            print(f" ==> Found {existing_count} scheduled posts in DB.")
            if q_data:
                last_time_str = q_data[0].get("created_at", "")
                if last_time_str:
                    last_time_str_clean = last_time_str.split("+")[0]
                    base_time = datetime.datetime.fromisoformat(last_time_str_clean).replace(tzinfo=datetime.timezone.utc)
                    print(f" ==> Last schedule: {base_time.isoformat()}")
    except Exception as e:
        print(f" ==> Failed to query DB: {e}")

    # 2. 누락된 2개 단어 정밀 검색
    search_queries = ["내일배움", "실업급여"]
    recovered_posts = []

    print("\n[STEP 2] Searching missing keywords on WordPress...")
    for sq in search_queries:
        encoded_sq = urllib.parse.quote(sq)
        # status=any로 휴지통이나 드래프트 전부 검사
        wp_api_url = f"https://blog.murimbook.com/wp-json/wp/v2/posts?status=any&search={encoded_sq}&_embed"
        
        req_wp = urllib.request.Request(
            wp_api_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Authorization": f"Basic {encoded_auth}"
            }
        )
        
        try:
            with urllib.request.urlopen(req_wp) as res:
                results = json.loads(res.read().decode("utf-8"))
                if results:
                    print(f" ==> Found match for '{sq}': {results[0]['title']['rendered']}")
                    recovered_posts.append(results[0])
                else:
                    print(f" ==> [WARNING] No match found for: '{sq}'")
        except Exception as e:
            print(f" ==> [ERROR] Failed to query search for {sq}: {e}")

    # 3. 누락된 글들을 이어서 1시간 간격으로 이식
    print("\n[STEP 3] Inserting recovered posts into Supabase works table...")
    inserted_count = 0

    for idx, post in enumerate(recovered_posts):
        wp_title = post.get("title", {}).get("rendered", "")
        wp_content = post.get("content", {}).get("rendered", "")
        slug = f"post-wp-{post.get('id', idx)}"
        
        featured_media_url = ""
        embedded = post.get("_embedded", {})
        if "wp:featuredmedia" in embedded and len(embedded["wp:featuredmedia"]) > 0:
            featured_media_url = embedded["wp:featuredmedia"][0].get("source_url", "")
        
        if not featured_media_url:
            featured_media_url = "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"

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
                    print(f" ==> [{idx + 1}] INSERTED: {wp_title} (ID: {slug})")
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
                        print(f" ==> [{idx + 1}] UPSERTED: {wp_title} (ID: {slug})")
                        print(f"     -> Scheduled: {scheduled_iso}")
                        inserted_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to insert {wp_title}: {ex}")

    print(f"\n--- [RECOVERY SYNC COMPLETE] ---")
    print(f"Added {inserted_count} missing posts.")

if __name__ == "__main__":
    run_recovery_sync()
