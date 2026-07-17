# -*- coding: utf-8 -*-
"""
로컬 scratch/ 백업 폴더 내 모든 python/js 스크립트 파일들의 본문을 전수 텍스트 스캔하여,
본문 내부에 '집 공부와 일상을 더 풍요롭게 만드는 꿀템 추천' 문구가 실제로 포함되어 작성된 
진짜 무림북.컴 지식글들만 100% 정확하게 감지하여 works 테이블에 고화질 R2 썸네일과 함께 UPSERT 복원하는 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_specific_tail_restoration():
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

    # 고유 R2 썸네일 매핑 테이블
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

    scratch_dir = "scratch"
    restored_count = 0
    target_tail_phrase = "풍요롭게 만드는 꿀템 추천"

    print("\n[STEP 1] Scanning and identifying backups containing the target tail block...")

    for file_name in os.listdir(scratch_dir):
        # 1. JS 파일 복원
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
                
                # 꿀템 추천 블록이 들어있는 경우에만 UPSERT
                if target_tail_phrase in markdown and wid in r2_exact_map:
                    cover = r2_exact_map[wid]
                    
                    work_payload = {
                        "id": wid,
                        "title": title,
                        "description": markdown,
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
                            print(f" ==> [RESTORED JS TARGET] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore JS {wid}: {e}")

        # 2. PY 파일 복원
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
                
                # 꿀템 추천 블록이 들어있는 경우에만 UPSERT
                if target_tail_phrase in markdown_cleaned:
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
                            print(f" ==> [RESTORED PY TARGET] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore PY {wid}: {e}")

    print(f"\n--- [SPECIFIC TAIL POSTS RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} target posts containing the exact block.")

if __name__ == "__main__":
    run_specific_tail_restoration()
