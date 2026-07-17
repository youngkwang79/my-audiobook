# -*- coding: utf-8 -*-
"""
1. blog.murimbook.com 워드프레스 API에서 status=publish(발행 완료된 글) 전체 약 40개를 Fetch
2. 이 중 무림북 도움되는글에 속하는 기존 진짜 글들을 긁어와 원래 발행일(date_gmt) 그대로 
   works 테이블에 status='공개'로 복원 이식
3. status='공개예정'인 10개 예약글 대기열은 훼손 없이 그대로 유지
"""

import os
import json
import base64
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_emergency_restore():
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

    # 1. 워드프레스의 모든 공개된 글(status=publish) 50개 페치
    print("\n[STEP 1] Fetching all 'publish' posts from WordPress...")
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=publish&per_page=50&_embed"
    
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
            print(f" ==> Fetched {len(wp_posts)} published post(s) from WordPress.")
    except Exception as e:
        print("[ERROR] Failed to fetch publish posts:", e)
        return

    # 제외 대상 목록 (레버리지, 증권박물관, 냉감 침구 등 예약글 셋에 포함되었던 임시 키워드 필터링)
    excluded_keywords = ["레버리지", "증권박물관", "가족 경제"]

    # 2. works 테이블에 status='공개' 형태로 이식
    print("\n[STEP 2] Inserting/Restoring existing posts to murimbook.com works table...")
    restored_count = 0

    for idx, post in enumerate(wp_posts):
        wp_title = post.get("title", {}).get("rendered", "")
        
        # 제외 키워드 매칭
        should_exclude = False
        for kw in excluded_keywords:
            if kw in wp_title:
                should_exclude = True
                break
        if should_exclude:
            print(f"  -> Skipping draft-specific keyword: {wp_title}")
            continue

        wp_content = post.get("content", {}).get("rendered", "")
        slug = f"post-wp-{post.get('id', idx)}"
        
        # 썸네일
        featured_media_url = ""
        embedded = post.get("_embedded", {})
        if "wp:featuredmedia" in embedded and len(embedded["wp:featuredmedia"]) > 0:
            featured_media_url = embedded["wp:featuredmedia"][0].get("source_url", "")
        
        if not featured_media_url:
            featured_media_url = "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"

        # 원래 워드프레스 발행 일자 GMT 유지 (timestamptz 형식화)
        original_date = post.get("date_gmt", "")
        if original_date:
            scheduled_iso = f"{original_date}+00:00"
        else:
            scheduled_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        work_payload = {
            "id": slug,
            "title": wp_title,
            "description": wp_content,
            "thumbnail": featured_media_url,
            "status": "공개", # 화면에 즉시 노출되도록 '공개' 지정
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
                    print(f" ==> [{restored_count + 1}] RESTORED: {wp_title} (Date: {scheduled_iso})")
                    restored_count += 1
        except Exception as e:
            # 중복 ID의 경우 UPSERT 처리
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
                        print(f" ==> [{restored_count + 1}] UPSERTED: {wp_title} (Date: {scheduled_iso})")
                        restored_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to restore {wp_title}: {ex}")

    print(f"\n--- [EMERGENCY RESTORATION COMPLETE] ---")
    print(f"Total published posts restored to murimbook.com works table: {restored_count}")

if __name__ == "__main__":
    run_emergency_restore()
