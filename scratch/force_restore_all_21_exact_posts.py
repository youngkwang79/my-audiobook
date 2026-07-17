# -*- coding: utf-8 -*-
"""
워드프레스 겹침 여부에 상관없이,
무림북.컴 메인 사이트에 존재해야만 하는 진짜 오리지널 지식글 21종 전체 목록을 확정하여,
고화질 R2 2:3 세로형 표지와 함께 Supabase works 테이블에 무조건 강제 복원(UPSERT)하는 스크립트.
(소설 데이터 4종은 철저히 보호)
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_unconditional_21_force_restore():
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

    # 💡 [무림북.컴 메인에 무조건 있어야 하는 21대 정식 칼럼/계산기 R2 썸네일 맵]
    unconditional_restoration_targets = {
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

    # 1. 21개 오리지널 글 백업 스토어 순회 복원
    scratch_dir = "scratch"
    restored_count = 0

    print("\n[STEP 1] Unconditionally restoring all 21 key target posts to live DB...")

    for file_name in os.listdir(scratch_dir):
        # 1-1. JS 파일 복원
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
                
                # 강제 복원 타겟 목록에 들어있으면 무조건 업서트
                if wid in unconditional_restoration_targets:
                    cover = unconditional_restoration_targets[wid]
                    
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
                            print(f" ==> [FORCE RESTORE SUCCESS] ID: {wid} | Title: '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] JS Force Restore failed for {wid}: {e}")

        # 1-2. PY 파일 복원
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

            if title_match and markdown_match and wid in unconditional_restoration_targets:
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 이미지 태그 제거
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
                cover = unconditional_restoration_targets[wid]
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
                        print(f" ==> [FORCE RESTORE SUCCESS] ID: {wid} | Title: '{title}'")
                        restored_count += 1
                except Exception as e:
                    print(f" ==> [ERROR] PY Force Restore failed for {wid}: {e}")

    # 2. works 테이블에 남아있는 post-wp- 형태의 지저분한 글만 최종 삭제 처리
    print("\n[STEP 2] Removing any remaining temporary post-wp- sync garbage...")
    del_wp_url = f"{url}/rest/v1/works?id=like.post-wp-*"
    req_del_wp = urllib.request.Request(del_wp_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del_wp) as res_del:
            del_data = json.loads(res_del.read().decode("utf-8"))
            print(f" ==> Purged {len(del_data)} temporary post-wp- metadata entries.")
    except Exception as e:
        print(f" ==> Post-wp cleanup skip: {e}")

    print(f"\n--- [FORCE 21 TARGETS RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} target posts unconditionally.")

if __name__ == "__main__":
    run_unconditional_21_force_restore()
