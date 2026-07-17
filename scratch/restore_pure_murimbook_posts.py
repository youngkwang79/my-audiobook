# -*- coding: utf-8 -*-
"""
1. blog.murimbook.com 워드프레스 API에서 모든 글 목록(status=any)을 긁어옴
2. 이 중 본문(content) 내부에 '<img>' 태그가 절대 존재하지 않는 순수 글들만 선별
3. 선별한 순수 글들의 썸네일을 2:3 세로형 북커버로 매핑하여 murimbook.com works 테이블에 status='공개'로 복원 삽입
"""

import os
import json
import base64
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_pure_restoration():
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

    # 1. 워드프레스에서 대용량 50개 글 페치 (status=any)
    print("\n[STEP 1] Fetching large posts pool from WordPress for pure restore...")
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any&per_page=60&_embed"
    
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
            print(f" ==> Retrieved {len(wp_posts)} posts total.")
    except Exception as e:
        print("[ERROR] WP fetch failed:", e)
        return

    # 2:3 책 표지 하드코딩 매핑 맵
    bookcover_map = {
        "종부세": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "15억": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "공동명의": "/thumbnails/jongbuse_bookcover_1783408998316.jpg",
        "상속세": "/thumbnails/inheritance_tax_bookcover_1783402150688.jpg",
        "IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "개인형 IRP": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "국민연금": "/thumbnails/national_pension_bookcover_1783402097098.jpg",
        "디딤돌": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "신혼부부": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "부모급여": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "아동수당": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "보청기": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        "글쓰기": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        "SEO": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "상위 노출": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "소상공인": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "대환대출": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "학교폭력": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "학폭": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "방관자": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "마이크론": "/thumbnails/micron_tech_bookcover_1783049097918.jpg",
        "시간관리": "/thumbnails/time_management_bookcover_1783009842330.jpg",
        "한강": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        "전기요금": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "누진세": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "재테크": "/thumbnails/savings_calculator_cover.jpg",
        "복비": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "중개": "/thumbnails/broker_calc_cover_1783427287270.jpg",
        "투잡": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "부업": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "청약": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        "청년형 ISA": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "바우처": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "경영안정": "/thumbnails/voucher_bookcover_1783250061587.jpg"
    }

    # 2. 본문에 <img> 태그가 없고 + 2:3 표지 매핑이 가능한 진짜 무림북 글만 선별
    print("\n[STEP 2] Filtering pure 2:3 bookcover posts...")
    pure_restored_count = 0

    for idx, post in enumerate(wp_posts):
        wp_title = post.get("title", {}).get("rendered", "")
        wp_content = post.get("content", {}).get("rendered", "")
        status = post.get("status", "publish")
        
        # 본문에 이미지 태그가 들어간 워드프레스용 글은 배제
        if "<img" in wp_content or "&lt;img" in wp_content:
            continue
            
        # 제목 매칭을 통한 2:3 썸네일 검증
        matched_cover = ""
        for kw, cover_url in bookcover_map.items():
            if kw in wp_title:
                matched_cover = cover_url
                break
                
        if matched_cover:
            # 2:3 표지가 지정된 진짜 무림북 글
            slug = f"post-wp-{post.get('id', idx)}"
            
            # 원래 워드프레스 발행 일자 GMT
            original_date = post.get("date_gmt", "")
            if original_date and "0000" not in original_date:
                scheduled_iso = f"{original_date}+00:00"
            else:
                scheduled_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # 화면 노출 상태값 결정: future 상태였던 글들은 '공개예정', 이미 발행 완료(publish)된 글들은 '공개'로 동기화
            work_status = "공개예정" if status == "future" else "공개"

            work_payload = {
                "id": slug,
                "title": wp_title,
                "description": wp_content,
                "thumbnail": matched_cover,
                "status": work_status,
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
                        print(f" ==> [{pure_restored_count + 1}] RESTORED PURE POST: {wp_title} (Cover: {matched_cover}, Status: {work_status})")
                        pure_restored_count += 1
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
                            print(f" ==> [{pure_restored_count + 1}] RE-RESTORED PURE (UPSERT): {wp_title}")
                            pure_restored_count += 1
                except Exception as ex:
                    print(f" ==> [ERROR] Failed to restore pure post {wp_title}: {ex}")

    print(f"\n--- [PURE RESTORATION COMPLETE] ---")
    print(f"Total pure 2:3 posts successfully restored to murimbook.com: {pure_restored_count}")

if __name__ == "__main__":
    run_pure_restoration()
