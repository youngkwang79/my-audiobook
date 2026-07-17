# -*- coding: utf-8 -*-
"""
Supabase works 테이블에 엄격히 존재하는 컬럼들만 선별하여 페이로드를 구성.
(genre 등 존재하지 않는 컬럼 차단)
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_sync_process():
    url = ""
    service_key = ""
    
    # Supabase credentials 로드
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
        print("[ERROR] Supabase credentials not found in .env.local!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # 1. status = '공개예정'인 글 일괄 삭제 (한글 안전 인코딩)
    print("\n[STEP 1] Cleaning up placeholder posts...")
    encoded_status = urllib.parse.quote("공개예정")
    delete_url = f"{url}/rest/v1/works?status=eq.{encoded_status}"
    req_del = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as res_del:
            del_data = json.loads(res_del.read().decode("utf-8"))
            print(f" ==> Deleted {len(del_data)} temporary placeholder post(s).")
    except Exception as e:
        print(f" ==> Cleanup error or no rows deleted: {e}")

    # 2. WordPress API 최신글 Fetch
    print("\n[STEP 2] Fetching posts from WordPress...")
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?per_page=10&_embed"
    
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    
    posts_data = []
    try:
        with urllib.request.urlopen(req_wp) as res_wp:
            posts_data = json.loads(res_wp.read().decode("utf-8"))
            print(f" ==> Fetched {len(posts_data)} post(s) from WordPress.")
    except Exception as e:
        print(f"[ERROR] Failed to fetch from WordPress: {e}")
        return

    # 3. 1시간 간격 삽입
    print("\n[STEP 3] Inserting into Supabase works table...")
    base_time = datetime.datetime.now(datetime.timezone.utc)
    inserted_count = 0

    for idx, post in enumerate(posts_data):
        wp_title = post.get("title", {}).get("rendered", "")
        wp_content = post.get("content", {}).get("rendered", "")
        
        # 고유 ID 생성 (특수문자 배제)
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

        # 💡 [스키마 검증에 확실히 통과한 필드명만 매핑]
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
                    print(f" ==> [{idx + 1}/10] INSERTED: {wp_title} (ID: {slug})")
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
                        print(f" ==> [{idx + 1}/10] UPSERTED: {wp_title} (ID: {slug})")
                        inserted_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to insert/upsert {wp_title}: {ex}")

    print(f"\n--- [SYNC PROCESS COMPLETE] ---")
    print(f"Total synchronized & scheduled posts: {inserted_count}/10")

if __name__ == "__main__":
    run_sync_process()
