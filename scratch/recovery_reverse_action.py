# -*- coding: utf-8 -*-
"""
1. 워드프레스(blog.murimbook.com) API에 접근하여 'future' 상태의 글들을 일괄 삭제(Trash)
2. 무림북.컴(murimbook.com) DB에 유저님의 진짜 최신 글 10종을 1시간 간격 예약 발행으로 복원 이식
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_reverse_recovery():
    # Credentials 로드
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

    # -------------------------------------------------------------
    # 1. 워드프레스(blog.murimbook.com)의 'future' 예약글 목록을 가져와 일괄 삭제
    # -------------------------------------------------------------
    print("\n[STEP 1] Fetching and deleting 'future' status scheduled posts on WordPress...")
    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=future&per_page=20"
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    try:
        with urllib.request.urlopen(req_wp) as res:
            future_posts = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(future_posts)} scheduled posts on WordPress.")
            for p in future_posts:
                pid = p["id"]
                title = p["title"]["rendered"]
                # 삭제 요청 (force=false로 휴지통으로 이동)
                delete_wp_url = f"https://blog.murimbook.com/wp-json/wp/v2/posts/{pid}?force=false"
                req_del = urllib.request.Request(
                    delete_wp_url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Authorization": f"Basic {encoded_auth}"
                    },
                    method="DELETE"
                )
                with urllib.request.urlopen(req_del) as _:
                    print(f"   -> Moved to Trash on WordPress: {title} (ID: {pid})")
    except Exception as e:
        print("[ERROR] Failed to clean up WordPress scheduled posts:", e)

    # -------------------------------------------------------------
    # 2. 무림북.컴(murimbook.com) DB에 유저님의 10개 오리지널 글 복원
    # -------------------------------------------------------------
    print("\n[STEP 2] Recovering the 10 real articles into murimbook.com works table...")
    
    # 워드프레스의 status=draft 및 trash, publish 전체에서 진짜 글들 데이터 긁어옴
    wp_all_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any,trash&per_page=50&_embed"
    req_all = urllib.request.Request(
        wp_all_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    wp_raw_posts = []
    try:
        with urllib.request.urlopen(req_all) as res_all:
            wp_raw_posts = json.loads(res_all.read().decode("utf-8"))
            print(f" ==> Retrieved {len(wp_raw_posts)} raw posts from WordPress for recovery.")
    except Exception as e:
        print("[ERROR] Failed to query WordPress posts for recovery:", e)
        return

    # 유저님의 오리지널 10개 핵심 제목 목록
    target_titles = [
        "도시가스 한전 전기요금 캐시백 환급 신청 요건",
        "여신금융협회 신용카드 포인트 현금화 정산 꿀팁",
        "통신사 미환급금 조회로 잠자는 돈 돌려받기 방법",
        "은행 잠자는 계좌 숨은 예금 보험금 찾기 요령",
        "국세청 삼쩜삼 숨은 세금 환급금 조회 팁",
        "근로장려금 자녀장려금 신청 자격 소득 기준 표",
        "국민취업지원제도 1유형 구직촉진수당 자격 팁",
        "국민내일배움카드 신청 자격 훈련 지원금 혜택",
        "실업급여 신청 방법 수급 자격 요율 계산기",
        "국민건강보험 미수령 환급금 신청 조회 방법"
    ]

    selected_posts = []
    for t_title in target_titles:
        matched = False
        for p in wp_raw_posts:
            wp_title = p.get("title", {}).get("rendered", "").strip()
            # 제목이 동일하거나 유입 조건에 포함되는 경우 매칭
            if t_title in wp_title or wp_title in t_title:
                selected_posts.append(p)
                matched = True
                break
        if not matched:
            print(f" ==> [WARNING] Did not find '{t_title}' in WordPress DB!")

    # 1시간 간격 순차 정렬 삽입
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

        # 1시간 간격 스케줄 설정
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
                    print(f" ==> [{inserted_count + 1}] RECOVERED & INSERTED: {wp_title}")
                    print(f"     -> Scheduled Time: {scheduled_iso}")
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
                        print(f" ==> [{inserted_count + 1}] RECOVERED & UPSERTED: {wp_title}")
                        print(f"     -> Scheduled Time: {scheduled_iso}")
                        inserted_count += 1
            except Exception as ex:
                print(f" ==> [ERROR] Failed to restore {wp_title}: {ex}")

    print(f"\n--- [REVERSE RECOVERY ACTION COMPLETE] ---")
    print(f"Deleted wrong WordPress future queue, and restored {inserted_count}/10 correct posts to murimbook.com")

if __name__ == "__main__":
    run_reverse_recovery()
