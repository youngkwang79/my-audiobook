# -*- coding: utf-8 -*-
"""
유저님이 정의해주신 무림북.컴(murimbook.com) 진짜 글의 판정 철칙 기준:
1. '작성자 : murimbook' 또는 '작성자: murimbook' 글은 100% 복원
2. '작성자 : sun_writer' 또는 'sun-writer' 글 중:
   - 본문에 <img> 태그가 없고,
   - 소제목(##, ###) 마크다운 노란색 강조가 존재하고,
   - <blockquote> 나 박스 요소가 없는 정갈한 순수 마크다운 글만 복원
3. 이 기준에 맞지 않는 꼬인 워드프레스 수입 글들은 works 테이블에서 완전 삭제
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_perfect_split_restore():
    url = ""
    service_key = ""

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

    if not url or not service_key:
        print("[ERROR] Credentials missing!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }

    # 진짜 R2 2:3 세로형 고화질 썸네일 맵
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

    # 1. 현존하는 works 목록을 돌며 조건에 맞지 않는 불순물 글 일체 선제 거름(DELETE)
    print("\n[STEP 1] Cleansing works table based on strict author & markdown rules...")
    query_url = f"{url}/rest/v1/works?select=id,title,description"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                desc = w.get("description", "")
                
                # 소설은 무조건 통과 보존
                if wid in ["yajangsingeom", "yahyelhwamyeng", "cheongun", "sogaju"]:
                    continue
                
                is_blog = "post-wp-" in wid or "calc" in wid or wid in r2_exact_map
                
                if is_blog:
                    # '작성자: murimbook' 여부
                    is_murimbook_author = ("작성자: murimbook" in desc) or ("작성자 : murimbook" in desc)
                    
                    # '작성자: sun-writer' 여부
                    is_sun_writer = ("sun_writer" in desc) or ("sun-writer" in desc)
                    
                    # sun-writer 필터 규칙: 이미지 없고, 소제목 노란색(##/###) 있고, 박스(<blockquote> 또는 css box)가 없는 경우 보존
                    has_img = "<img" in desc
                    has_headings = "## " in desc or "### " in desc
                    has_box = "<blockquote>" in desc or "⚠️" in desc or "📌" in desc or "border:" in desc
                    
                    is_valid_sun_writer = is_sun_writer and (not has_img) and has_headings and (not has_box)
                    
                    # 둘 다 속하지 않는 글은 삭제 대상으로 확정
                    if not (is_murimbook_author or is_valid_sun_writer):
                        print(f" ==> [PURGING NON-QUALIFIED]: '{title}' (ID: {wid})")
                        del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                        with urllib.request.urlopen(req_del) as _:
                            print(f"   -> [DELETED SUCCESS] Removed ID: {wid}")

    except Exception as e:
        print("[ERROR] Step 1 Purge Failed:", e)

    # 2. 로컬 백업에서 조건에 정확히 부합하는 오리지널 무림북 글만 발라내어 UPSERT 복원
    print("\n[STEP 2] Restoring only true murimbook.com posts from scratch backups...")
    scratch_dir = "scratch"
    restored_count = 0

    for file_name in os.listdir(scratch_dir):
        # JS 파일 백업 검사
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
                
                if wid in r2_exact_map:
                    is_murimbook_author = ("작성자: murimbook" in markdown) or ("작성자 : murimbook" in markdown)
                    is_sun_writer = ("sun_writer" in markdown) or ("sun-writer" in markdown)
                    
                    has_img = "<img" in markdown
                    has_headings = "## " in markdown or "### " in markdown
                    has_box = "<blockquote>" in markdown or "⚠️" in markdown or "📌" in markdown
                    
                    is_valid_sun_writer = is_sun_writer and (not has_img) and has_headings and (not has_box)
                    
                    if is_murimbook_author or is_valid_sun_writer:
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
                                print(f" ==> [RESTORED JS] ID: {wid} | Title: '{title}'")
                                restored_count += 1
                        except Exception as e:
                            print(f" ==> [ERROR] JS restoration failed: {e}")

        # PY 파일 백업 검사
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
                
                # 이미지 태그 우선 제거 정제
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
                is_murimbook_author = ("작성자: murimbook" in markdown_cleaned) or ("작성자 : murimbook" in markdown_cleaned)
                is_sun_writer = ("sun_writer" in markdown_cleaned) or ("sun-writer" in markdown_cleaned)
                
                has_headings = "## " in markdown_cleaned or "### " in markdown_cleaned
                has_box = "<blockquote>" in markdown_cleaned or "⚠️" in markdown_cleaned or "📌" in markdown_cleaned
                
                is_valid_sun_writer = is_sun_writer and has_headings and (not has_box)
                
                if is_murimbook_author or is_valid_sun_writer:
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
                            print(f" ==> [RESTORED PY] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] PY restoration failed: {e}")

    print(f"\n--- [PERFECT SPLIT RESTORATION COMPLETE] ---")
    print(f"Total authentic murimbook.com posts restored/retained: {restored_count}")

if __name__ == "__main__":
    run_perfect_split_restore()
