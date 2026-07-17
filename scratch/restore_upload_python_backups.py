# -*- coding: utf-8 -*-
"""
scratch/ 폴더 내에 백업 보관된 upload_*.py 파일들에서
title, content_html, featured_img_path 변수 등을 정밀하게 정규식 파싱하여
원래의 진짜 무림북 ID, 2:3 표지 썸네일, 본문 내용을 추출해 Supabase works 테이블에 복원(UPSERT)하는 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_and_restore_python_uploads():
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
        "Prefer": "return=representation"
    }

    # 파일별 2:3 북커버 강제 매핑 테이블
    strict_covers = {
        "school_violence": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "school_violence_time": "/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "school_violence_legal": "/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        "welfare_3rd": "/thumbnails/welfare_3rd_bookcover_1783035010741.jpg",
        "youth_policy": "/thumbnails/youth_policy_bookcover_1783033781934.jpg",
        "electricity_save": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "hangang_pool": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        "micron_tech": "/thumbnails/micron_tech_bookcover_1783049097918.jpg",
        "so_sang_gong_in_loan": "/thumbnails/so_sang_gong_in_loan_bookcover_1783122497050.jpg",
        "tomorrow_card": "/thumbnails/tomorrow_card_bookcover_1783209181547.jpg",
        "hearing_aid": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        "newlywed_housing": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "voucher": "/thumbnails/voucher_bookcover_1783250061587.jpg",
        "worker_side_job": "/thumbnails/worker_side_job_bookcover_1783159230006.jpg",
        "careerup": "/thumbnails/careerup_bookcover_1783372720826.jpg",
        "irp": "/thumbnails/irp_bookcover_1783402575192.jpg",
        "loans": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "seo_writing": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        "seo_strategy": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"
    }

    scratch_dir = "scratch"
    files = os.listdir(scratch_dir)
    
    restored_count = 0
    for file_name in files:
        if file_name.startswith("upload_") and file_name.endswith(".py"):
            file_path = os.path.join(scratch_dir, file_name)
            
            with open(file_path, "r", encoding="utf-8") as f:
                py_content = f.read()
                
            # ID 값 추출
            wid = file_name.replace("upload_", "").replace("_posts", "").replace("_wp", "").replace(".py", "")
            
            # 동기화 파일 제외
            if wid in ["files", "generated_thumbnail", "blogger_post"]:
                continue
                
            # 1. 제목 변수 파싱
            title = ""
            title_match = re.search(r"title\s*=\s*['\"](.*?)['\"]", py_content)
            if title_match:
                title = title_match.group(1).strip()
            else:
                title_match = re.search(r"post_title\s*=\s*['\"](.*?)['\"]", py_content)
                if title_match:
                    title = title_match.group(1).strip()

            # 2. 본문 변수 파싱
            markdown = ""
            markdown_match = re.search(r"content_html\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", py_content)
            if not markdown_match:
                markdown_match = re.search(r"content_markdown\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", py_content)
            if not markdown_match:
                markdown_match = re.search(r"content_html\s*=\s*f?'''([\s\S]*?)'''", py_content)
            if not markdown_match:
                markdown_match = re.search(r"content\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", py_content)
                
            if markdown_match:
                markdown = markdown_match.group(1)

            # R2 및 로컬 2:3 표지 경로 자동 매칭
            thumb = strict_covers.get(wid, f"/thumbnails/{wid}_bookcover.jpg")

            if title and markdown:
                # 💡 본문 중간의 워드프레스용 임시 R2 sub_image 가 들어간 img 태그들은 무림북 본문 가이드라인에 의거해 
                # 깨짐 방지를 위해 제거하거나 대체 텍스트로 보정합니다.
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
                work_payload = {
                    "id": wid,
                    "title": title,
                    "description": markdown_cleaned, # 순수 텍스트 본문 원칙 준수
                    "thumbnail": thumb,              # 2:3 완벽 책 표지
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

                # Supabase UPSERT
                insert_url = f"{url}/rest/v1/works"
                insert_data = json.dumps(work_payload).encode("utf-8")
                
                upsert_headers = headers.copy()
                upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
                
                req_ups = urllib.request.Request(
                    insert_url,
                    data=insert_data,
                    headers=upsert_headers,
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req_ups) as res_ups:
                        res_payload = json.loads(res_ups.read().decode("utf-8"))
                        if res_payload:
                            print(f" ==> [PYTHON RESTORE SUCCESS] ID: {wid} | '{title}'")
                            print(f"     -> Cover Path: {thumb}")
                            restored_count += 1
                except Exception as e:
                    print(f" ==> [ERROR] Failed to restore Python backup {title}: {e}")

    print(f"\n--- [PYTHON BACKUP RESTORE COMPLETE] ---")
    print(f"Successfully restored {restored_count} original posts from Python backups with 2:3 covers.")

if __name__ == "__main__":
    parse_and_restore_python_uploads()
