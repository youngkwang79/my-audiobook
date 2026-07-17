# -*- coding: utf-8 -*-
"""
무림북.컴(murimbook.com) 진짜 오리지널 글만 100% 온전히 가려내어 복원하는 최종 완성형 마스터 스크립트:
1. 작성자: murimbook이 명시되어 있거나 이모티콘(🏠, 💡, 🔗, ⚠️, 📌)이 포함된 마크다운 글 복원.
2. 단, 본문 내에 워드프레스 잔재 마커([참고 이미지], {img_html}, {sub_img_html}, blockquote)가 단 하나라도 들어있는 글은 엄격하게 필터링 배제(삭제).
3. 21대 타겟 지식글에 대해 '[블로그]' 텍스트 로고가 박힌 전용 2:3 표지 썸네일을 씌워 works 테이블에 강제 복원(UPSERT).
4. 소설 연재작은 100% 무조건 보존 격리.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_absolute_ultimate_restore():
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

    # '[블로그]' 텍스트 로고가 정합된 진짜 오리지널 2:3 표지 썸네일 맵
    blog_text_cover_map = {
        "welfare_3rd": "https://r2.murimbook.com/thumbnails/welfare_3rd_bookcover_1783035010741.jpg",
        "youth_policy_expo": "https://r2.murimbook.com/thumbnails/youth_policy_bookcover_1783033781934.jpg",
        "micron_tech": "https://r2.murimbook.com/thumbnails/micron_tech_bookcover_1783049097918.jpg",
        "hangang_pool": "https://r2.murimbook.com/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
        "electricity_save": "https://r2.murimbook.com/thumbnails/electricity_save_bookcover_1783018285121.jpg",
        "time_management": "https://r2.murimbook.com/thumbnails/time_management_bookcover_1783009842330.jpg",
        
        "school_violence": "https://r2.murimbook.com/thumbnails/school_violence_bookcover_1783079609239.jpg",
        "school_violence_time": "https://r2.murimbook.com/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
        "school_violence_legal": "https://r2.murimbook.com/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
        
        "hearing_aid": "https://r2.murimbook.com/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
        "newlywed_housing": "https://r2.murimbook.com/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        "voucher": "https://r2.murimbook.com/thumbnails/voucher_bookcover_1783250061587.jpg",
        "worker_side_job": "https://r2.murimbook.com/thumbnails/worker_side_job_bookcover_1783159230006.jpg",
        "careerup": "https://r2.murimbook.com/thumbnails/careerup_bookcover_1783372720826.jpg",
        "irp": "https://r2.murimbook.com/thumbnails/irp_bookcover_1783402575192.jpg",
        "loans": "https://r2.murimbook.com/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
        
        "seo_writing_blogger": "https://r2.murimbook.com/thumbnails/seo_writing_bookcover_1783175891417.jpg",
        "seo_strategy_blogger": "https://r2.murimbook.com/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
        
        "calc-jongbuse": "https://r2.murimbook.com/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
        "calc-brokerage": "https://r2.murimbook.com/thumbnails/broker_calc_cover_1783427287270.jpg",
        "calc-loan": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg"
    }

    scratch_dir = "scratch"
    restored_count = 0

    print("\n[STEP 1] Performing absolute ultimate restoration from backups...")

    for file_name in os.listdir(scratch_dir):
        # JS 파일 복원
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
                
                # 워드프레스 마커들 단 하나도 포함 안 됐는지 엄격 검증
                has_wp_remnants = "[참고 이미지]" in markdown or "[참고 이미지" in markdown or "{img_html}" in markdown or "{sub_img_html}" in markdown or "blockquote" in markdown.lower()
                
                # '작성자: murimbook' 또는 '작성자 : murimbook'이거나 이모티콘이 들어있는 진짜 무림북 글만 선별
                is_genuine = ("murimbook" in markdown.lower()) or any(emo in markdown for emo in ["🏠", "💡", "🔗", "⚠️", "📌"])
                
                if wid in blog_text_cover_map and is_genuine and (not has_wp_remnants):
                    cover = blog_text_cover_map[wid]
                    
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
                            print(f" ==> [ULTIMATE JS RESTORE] ID: {wid} | Title: '{title}' -> Restored!")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore JS {wid}: {e}")

        # PY 파일 복원
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

            if title_match and markdown_match and wid in blog_text_cover_map:
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 이미지 태그 제거
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
                # 워드프레스 마커들 단 하나도 포함 안 됐는지 엄격 검증
                has_wp_remnants = "[참고 이미지]" in markdown_cleaned or "[참고 이미지" in markdown_cleaned or "{img_html}" in markdown_cleaned or "{sub_img_html}" in markdown_cleaned or "blockquote" in markdown_cleaned.lower()
                
                is_genuine = ("murimbook" in markdown_cleaned.lower()) or any(emo in markdown_cleaned for emo in ["🏠", "💡", "🔗", "⚠️", "📌"])
                
                if is_genuine and (not has_wp_remnants):
                    cover = blog_text_cover_map[wid]
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
                            print(f" ==> [ULTIMATE PY RESTORE] ID: {wid} | Title: '{title}' -> Restored!")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore PY {wid}: {e}")

    print(f"\n--- [ABSOLUTE ULTIMATE RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} target posts unconditionally.")

if __name__ == "__main__":
    run_absolute_ultimate_restore()
