# -*- coding: utf-8 -*-
"""
로컬 scratch/ 디렉토리의 백업 스크립트들 중
순수 마크다운(##, ### 노란색 소제목 구조 및 이미지 없음)으로 구성된 
진짜 무림북.컴 지식글 데이터들만 100% 엄선하여 Supabase works 테이블에 최종 복원(UPSERT)하는 스크립트.
(소설 데이터는 100% 격리하여 수정 배제)
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_true_markdown_restoration():
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

    print("\n[STEP 1] Scanning scratch backups for true markdown bodies...")
    scratch_dir = "scratch"
    restored_count = 0

    for file_name in os.listdir(scratch_dir):
        # 1. JS 파일 복원 (##, ### 기호 구조 파싱)
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
                
                # HTML 기계어가 들어간 잘못된 글이 아니고, 2:3 R2 표지가 있는 블로그 글인 경우 복원
                if wid in r2_exact_map and not ("<p>" in markdown):
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
                    req_ups = urllib.request.Request(
                        insert_url,
                        data=insert_data,
                        headers=headers,
                        method="POST"
                    )
                    try:
                        with urllib.request.urlopen(req_ups) as res_ups:
                            print(f" ==> [TRUE MD JS RESTORED] ID: {wid} | '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore JS {wid}: {e}")

        # 2. PY 파일 복원 (##, ### 기호 구조 파싱)
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
                
                # HTML 지저분한 글 필터링 배제
                if not ("<p>" in markdown) or (wid == "school_violence" or wid == "school_violence_legal" or wid == "school_violence_time"):
                    # 학교폭력글들의 경우 백업 파일이 HTML 포맷일 수 있어, 순수 마크다운으로 깔끔하게 디코딩 변환 후 이식
                    markdown_cleaned = re.sub(r'<[^>]+>', '', markdown) # 태그 제거 및 마크다운 형식화
                    # 개행 확보
                    markdown_cleaned = markdown_cleaned.replace("\n\n", "\n").replace("\n", "\n\n")
                    
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
                    req_ups = urllib.request.Request(
                        insert_url,
                        data=insert_data,
                        headers=headers,
                        method="POST"
                    )
                    try:
                        with urllib.request.urlopen(req_ups) as res_ups:
                            print(f" ==> [TRUE MD PY RESTORED] ID: {wid} | '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore PY {wid}: {e}")

    print(f"\n--- [PURE MARKDOWN RESTORATION COMPLETE] ---")
    print(f"Total pure markdown posts successfully restored: {restored_count}")

if __name__ == "__main__":
    run_true_markdown_restoration()
