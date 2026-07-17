# -*- coding: utf-8 -*-
"""
유저님이 지정하신 10개 진짜 최신글에 대해 본문 내 이미지 여부 필터를 생략하고,
강제적으로 2:3 세로형 책 표지를 정확하게 씌워 works 테이블에 1시간 간격 예약 발행으로 긴급 이식 복원
"""

import os
import json
import datetime
import base64
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_forced_10_restore():
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

    # 1. 워드프레스에서 글 60개 페치 (status=any,trash)
    print("\n[STEP 1] Fetching WordPress posts pool for forced 10...")
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any,trash&per_page=60&_embed"
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

    # 2. 타깃 10종 리스트 정의 및 2:3 명품 썸네일 매핑
    target_map = {
        "도시가스 한전 전기요금 캐시백": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "여신금융협회 신용카드 포인트": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "통신사 미환급금 조회로": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "은행 잠자는 계좌": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "국세청 삼쩜삼 숨은 세금": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "근로장려금 자녀장려금": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "국민취업지원제도 1유형": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "국민내일배움카드 신청": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "실업급여 신청 방법": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "국민건강보험 미수령": "/thumbnails/irp_bookcover_1783402575192.jpg"
    }

    # 3. 1시간 간격 순차 정렬로 works 테이블에 복원 삽입
    print("\n[STEP 2] Inserting/Restoring target 10 posts with 2:3 bookcovers...")
    base_time = datetime.datetime.now(datetime.timezone.utc)
    inserted_count = 0

    for title_key, cover_url in target_map.items():
        matched_post = None
        for p in wp_posts:
            wp_title = p.get("title", {}).get("rendered", "").strip()
            if title_key in wp_title or wp_title in title_key:
                matched_post = p
                break
        
        if matched_post:
            wp_title = matched_post.get("title", {}).get("rendered", "")
            wp_content = matched_post.get("content", {}).get("rendered", "")
            slug = f"post-wp-{matched_post.get('id', inserted_count)}"
            
            # 1시간 간격 스케줄 설정
            scheduled_time = base_time + datetime.timedelta(hours=inserted_count + 1)
            scheduled_iso = scheduled_time.strftime("%Y-%m-%dT%H:%M:%S+00:00")

            work_payload = {
                "id": slug,
                "title": wp_title,
                "description": wp_content,
                "thumbnail": cover_url, # 2:3 명품 세로 커버 강제 지정
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
                        print(f" ==> [{inserted_count + 1}] RESTORED: {wp_title}")
                        print(f"     -> Scheduled Time: {scheduled_iso}")
                        inserted_count += 1
            except Exception as e:
                # 중복 대비 UPSERT
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
                            print(f" ==> [{inserted_count + 1}] RE-RESTORED (UPSERT): {wp_title}")
                            print(f"     -> Scheduled Time: {scheduled_iso}")
                            inserted_count += 1
                except Exception as ex:
                    print(f" ==> [ERROR] Failed to restore {wp_title}: {e} / {ex}")
        else:
            print(f" ==> [WARNING] Title containing '{title_key}' not found in WordPress pool!")

    print(f"\n--- [FORCED 10 RESTORE COMPLETE] ---")
    print(f"Successfully restored {inserted_count} target posts with correct 2:3 covers.")

if __name__ == "__main__":
    run_forced_10_restore()
