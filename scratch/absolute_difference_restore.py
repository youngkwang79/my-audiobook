# -*- coding: utf-8 -*-
"""
유저님이 정의해주신 우주 최강 차집합 매칭 공식:
1. blog.murimbook.com (워드프레스) API에서 모든 글 제목 목록을 실시간으로 수집.
2. works 테이블에 들어가 있는 글 중, 워드프레스 제목 목록에 겹쳐서 들어간 불순물 글들은 일괄 자동 삭제(DELETE).
3. 로컬 백업(scratch/) 내 모든 글 중, 워드프레스 제목 목록에 존재하지 않는 진짜 murimbook.com 오리지널 글들만 고유 R2 2:3 표지로 UPSERT 복원.
4. 소설 연재물 데이터는 100% 격리하여 수정 배제.
"""

import os
import re
import json
import base64
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_absolute_difference_restore():
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
        "Prefer": "resolution=merge-duplicates,return=representation"
    }

    # 1. blog.murimbook.com (워드프레스) 글 제목 풀 수집 (status=any,trash,draft 등 모든 글 포함 100개 확보)
    print("\n[STEP 1] Fetching WordPress (blog.murimbook.com) post titles pool...")
    auth_str = f"{wp_user}:{wp_pass}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    wp_titles = set()
    wp_api_url = "https://blog.murimbook.com/wp-json/wp/v2/posts?status=any,trash,draft&per_page=100"
    req_wp = urllib.request.Request(
        wp_api_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Authorization": f"Basic {encoded_auth}"
        }
    )
    
    try:
        with urllib.request.urlopen(req_wp) as res:
            wp_posts = json.loads(res.read().decode("utf-8"))
            for p in wp_posts:
                raw_title = p.get("title", {}).get("rendered", "").strip()
                # HTML 엔티티 복원 및 공백 정규화
                cleaned_title = urllib.parse.unquote(raw_title).replace("&#8211;", "-").replace("&nbsp;", " ")
                wp_titles.add(cleaned_title)
            print(f" ==> Found {len(wp_titles)} total titles on blog.murimbook.com.")
    except Exception as e:
        print("[ERROR] WP fetch failed:", e)
        return

    # 진짜 2:3 세로형 고화질 R2 대표 표지 매핑 사전
    r2_exact_map = {
        "welfare_3rd": "https://r2.murimbook.com/thumbnails/welfare_3rd_1783036018542.jpg",
        "youth_policy_expo": "https://r2.murimbook.com/thumbnails/youth_policy_expo_1783035998422.jpg",
        "micron_tech": "https://r2.murimbook.com/thumbnails/micron_tech_1783050382681.jpg",
        "hangang_pool": "https://r2.murimbook.com/thumbnails/hangang_pool_1783032727590.jpg",
        "electricity_save": "https://r2.murimbook.com/thumbnails/electricity_save_1783032393230.jpg",
        "time_management": "https://r2.murimbook.com/thumbnails/time_study_1783010502348.jpg",
        
        "school_violence": "https://r2.murimbook.com/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "school_violence_time": "https://r2.murimbook.com/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "school_violence_legal": "https://r2.murimbook.com/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        
        "hearing_aid": "https://r2.murimbook.com/thumbnails/ears_1783390545388.jpg",
        "newlywed_housing": "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg",
        "voucher": "https://r2.murimbook.com/thumbnails/voucher_bookcover_1783250061587.jpg",
        "worker_side_job": "https://r2.murimbook.com/thumbnails/two_job_1783420683365.jpg",
        "careerup": "https://r2.murimbook.com/thumbnails/seoulkeorieobgujigjiwongeum202_1783420358572.jpg",
        "irp": "https://r2.murimbook.com/thumbnails/gaeinhye_1783406520606.jpg",
        "loans": "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg",
        
        "seo_writing_blogger": "https://r2.murimbook.com/thumbnails/google_top_1783176096690.jpg",
        "seo_strategy_blogger": "https://r2.murimbook.com/thumbnails/google_top_1783420605408.jpg",
        "calc-jongbuse": "https://r2.murimbook.com/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
        "calc-brokerage": "https://r2.murimbook.com/thumbnails/broker_calc_cover_1783427287270.jpg",
        "calc-loan": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg"
    }

    # 2. works 테이블을 돌며 워드프레스 제목에 겹치는 블로그 글 영구 소거
    print("\n[STEP 2] Removing overlap posts that belong to blog.murimbook.com...")
    query_url = f"{url}/rest/v1/works?select=id,title"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            
            for w in works_list:
                wid = w["id"]
                title = w["title"].strip()
                
                # 소설 예외 처리
                if wid in ["yajangsingeom", "yahyelhwamyeng", "cheongun", "sogaju"]:
                    continue
                
                # 워드프레스 제목 풀에 정확히 포함되거나 키워드가 겹치는 글 식별해 삭제
                is_wp_post = title in wp_titles or any(title in wpt for wpt in wp_titles) or "post-wp-" in wid
                
                if is_wp_post:
                    print(f" ==> [DELETE OVERLAP POST]: '{title}' (ID: {wid})")
                    del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                    with urllib.request.urlopen(req_del) as _:
                        print(f"   -> [DELETED SUCCESS] Removed ID: {wid}")
    except Exception as e:
        print("[ERROR] Step 2 cleanup failed:", e)

    # 3. 로컬 scratch/ 백업 스크립트 중 워드프레스 제목 리스트에 없는 진짜 murimbook.com 오리지널 글만 UPSERT 복원
    print("\n[STEP 3] Restoring pure murimbook.com distinct posts from local backups...")
    scratch_dir = "scratch"
    restored_count = 0

    for file_name in os.listdir(scratch_dir):
        # 3-1. JS 파일 복원
        if file_name.startswith("register_") and file_name.endswith(".js"):
            file_path = os.path.join(scratch_dir, file_name)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            id_match = re.search(r"id:\s*['\"](.*?)['\"]", content)
            title_match = re.search(r"title:\s*['\"](.*?)['\"]", content)
            markdown_match = re.search(r"const contentMarkdown = `([\s\S]*?)`;", content)
            
            if id_match and markdown_match and title_match:
                wid = id_match.group(1).strip()
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 워드프레스 풀에 없고 r2_exact_map에 있는 고유 글인 경우만 복원
                is_pure_murimbook = (title not in wp_titles) and (not any(title in wpt for wpt in wp_titles))
                
                if wid in r2_exact_map and is_pure_murimbook:
                    cover = r2_exact_map[wid]
                    
                    work_payload = {
                        "id": wid,
                        "title": title,
                        "description": markdown,
                        "thumbnail": cover,
                        "status": "공개",
                        "subtitle": "[블로그]" if "calc" not in wid else "[계산기] 세무/절세",
                        "badge": "" if "calc" not in wid else "무료",
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
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    }

                    insert_url = f"{url}/rest/v1/works"
                    insert_data = json.dumps(work_payload).encode("utf-8")
                    req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
                    try:
                        with urllib.request.urlopen(req_ups) as _:
                            print(f" ==> [RESTORED PURE JS] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] JS restoration failed: {e}")

        # 3-2. PY 파일 복원
        elif file_name.startswith("upload_") and file_name.endswith(".py"):
            file_path = os.path.join(scratch_dir, file_name)
            wid = file_name.replace("upload_", "").replace("_posts", "").replace("_wp", "").replace(".py", "")
            
            if wid in ["files", "generated_thumbnail", "blogger_post"]:
                continue
                
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            title_match = re.search(r"title\s*=\s*['\"](.*?)['\"]", content)
            if not title_match:
                title_match = re.search(r"post_title\s*=\s*['\"](.*?)['\"]", content)

            markdown_match = re.search(r"content_html\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)
            if not markdown_match:
                markdown_match = re.search(r"content_markdown\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)
            if not markdown_match:
                markdown_match = re.search(r"content_html\s*=\s*f?'''([\s\S]*?)'''", content)
            if not markdown_match:
                markdown_match = re.search(r"content\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)

            if title_match and markdown_match and wid in r2_exact_map:
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 이미지 태그 제거
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
                # 워드프레스 풀에 없는 오리지널 글만 복원
                is_pure_murimbook = (title not in wp_titles) and (not any(title in wpt for wpt in wp_titles))
                
                if is_pure_murimbook:
                    cover = r2_exact_map[wid]
                    
                    work_payload = {
                        "id": wid,
                        "title": title,
                        "description": markdown_cleaned,
                        "thumbnail": cover,
                        "status": "공개",
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
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    }

                    insert_url = f"{url}/rest/v1/works"
                    insert_data = json.dumps(work_payload).encode("utf-8")
                    req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
                    try:
                        with urllib.request.urlopen(req_ups) as _:
                            print(f" ==> [RESTORED PURE PY] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] PY restoration failed: {e}")

    print(f"\n--- [ABSOLUTE DIFFERENCE RESTORATION COMPLETE] ---")
    print(f"Successfully restored {restored_count} pure distinct murimbook.com posts.")

if __name__ == "__main__":
    run_absolute_difference_restore()
