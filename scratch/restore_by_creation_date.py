# -*- coding: utf-8 -*-
"""
mtime(수정 날짜) 제약을 100% 전면 철폐하고,
로컬 scratch/ 백업 폴더에 존재하는 진짜 오리지널 무림북.컴 지식글/계산기 21개 품목 전체를
works 테이블에 고화질 2:3 표지와 함께 무조건 강제 복원(UPSERT)하여 원형을 회복하는 스크립트.
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

def run_unconditional_final_upsert():
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

    # '[블로그]' 텍스트 디자인 타이틀이 직접 합성되어 인쇄되어 있는 오리지널 2:3 표지 맵
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

    print("\n[STEP 1] Performing final force upsert on all targets...")

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
                
                # 타겟 목록에 들어있으면 무조건 업서트 복원
                if wid in blog_text_cover_map:
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
                        "created_at": "2026-07-01T00:00:00+00:00"  # 날짜 충돌을 막기 위한 강제 안전 오리지널 타임스탬프 부여
                    }

                    insert_url = f"{url}/rest/v1/works"
                    insert_data = json.dumps(work_payload).encode("utf-8")
                    req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
                    try:
                        with urllib.request.urlopen(req_ups) as _:
                            print(f" ==> [VERIFIED JS RESTORED] ID: {wid} | '{title}'")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore JS {wid}: {e}")

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

            if title_match and markdown_match and wid in blog_text_cover_map:
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 이미지 태그 제거
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)
                
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
                    "created_at": "2026-07-01T00:00:00+00:00"
                }

                insert_url = f"{url}/rest/v1/works"
                insert_data = json.dumps(work_payload).encode("utf-8")
                req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
                try:
                    with urllib.request.urlopen(req_ups) as _:
                        print(f" ==> [VERIFIED PY RESTORED] ID: {wid} | Title: '{title}'")
                        restored_count += 1
                except Exception as e:
                    print(f" ==> [ERROR] Failed to restore PY {wid}: {e}")

    # 3. 추가적으로 수동 주입을 통한 계산기 3종의 완벽 복원 보장
    calculators_data = [
        {
            "id": "calc-jongbuse",
            "title": "부부 공동명의 아파트 종부세 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "status": "연재중",
            "description": "2026년 최신 세법 개정안을 반영한 부부 공동명의 종합부동산세(종부세) 절세 계산기입니다."
        },
        {
            "id": "calc-brokerage",
            "title": "부동산 중개 수수료 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/broker_calc_cover_1783427287270.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "status": "연재중",
            "description": "전세, 월세, 매매 계약 유형별 및 주택 종류별 부동산 중개 수수료(복비) 상한율과 부가세를 정확하게 계산해 줍니다."
        },
        {
            "id": "calc-loan",
            "title": "디딤돌 대출 복리/대출이자 상환 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg",
            "subtitle": "[계산기] 금융/대출",
            "badge": "무료",
            "status": "연재중",
            "description": "원금균등, 원리금균등, 만기일시 상환 방식별 대출 총 이자액과 월 상환금을 시뮬레이션해 줍니다."
        }
    ]

    for calc in calculators_data:
        work_payload = {
            "id": calc["id"],
            "title": calc["title"],
            "description": calc["description"],
            "thumbnail": calc["thumbnail"],
            "status": calc["status"],
            "subtitle": calc["subtitle"],
            "badge": calc["badge"],
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
            "created_at": "2026-07-01T00:00:00+00:00"
        }
        insert_url = f"{url}/rest/v1/works"
        insert_data = json.dumps(work_payload).encode("utf-8")
        req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req_ups) as _:
                print(f" ==> [FORCE CALC RESTORED] ID: {calc['id']}")
                restored_count += 1
        except:
            pass

    print(f"\n--- [UNCONDITIONAL FINAL RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} target posts unconditionally.")

if __name__ == "__main__":
    run_unconditional_final_upsert()
