# -*- coding: utf-8 -*-
"""
로컬 scratch/ 폴더에 실제로 파일로 보관되어 존재하는 모든 마크다운(*.md) 원고 파일들을 
실시간으로 전수 자동 스캔하여, Supabase works 테이블에 
고화질 2:3 R2 썸네일 표지와 함께 복원(UPSERT)하는 최종 마스터 동적 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_dynamic_markdown_restoration():
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

    # 💡 고화질 2:3 표지 썸네일 매핑 딕셔너리
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

    print("\n[STEP 1] Scanning scratch/ for all markdown files and restoring dynamically...")
    
    for filename in os.listdir(scratch_dir):
        if filename.endswith(".md"):
            file_path = os.path.join(scratch_dir, filename)
            
            # 파일명으로부터 ID 추출 (예: 'backup_loans.md' -> 'loans', 'loans.md' -> 'loans')
            wid = filename.replace(".md", "")
            wid = re.sub(r"^backup_", "", wid)
            
            with open(file_path, "r", encoding="utf-8") as f:
                raw_markdown = f.read()

            # 첫 줄 근처에서 제목(H1, #) 추출 시도
            title = None
            title_match = re.search(r"^#\s+(.*)", raw_markdown, re.MULTILINE)
            if title_match:
                title = title_match.group(1).strip()
            else:
                # 제목을 못 찾으면 파일명을 이쁘게 가공해서 대체
                title = wid.replace("_", " ").title()

            # 이미지 태그 정제
            markdown_cleaned = re.sub(r'<img[^>]*>', '', raw_markdown)
            
            # 썸네일 자동 매핑
            cover = blog_text_cover_map.get(wid, "https://r2.murimbook.com/thumbnails/newlywed_housing_bookcover_1783229153411.jpg")
            
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
                    print(f" ==> [DYNAMIC RESTORED] ID: {wid} | Title: '{title}'")
                    restored_count += 1
            except Exception as e:
                print(f" ==> [ERROR] Failed to restore {wid}: {e}")

    # 3. 계산기 3종 강제 복원
    print("\n[STEP 2] Restoring 3 calculators...")
    calculators_data = [
        {
            "id": "calc-jongbuse",
            "title": "부부 공동명의 아파트 종부세 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "description": "2026년 최신 세법 개정안을 반영한 부부 공동명의 종합부동산세(종부세) 절세 계산기입니다."
        },
        {
            "id": "calc-brokerage",
            "title": "부동산 중개 수수료 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/broker_calc_cover_1783427287270.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "description": "전세, 월세, 매매 계약 유형별 및 주택 종류별 부동산 중개 수수료(복비) 상한율과 부가세를 정확하게 계산해 줍니다."
        },
        {
            "id": "calc-loan",
            "title": "디딤돌 대출 복리/대출이자 상환 계산기",
            "thumbnail": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg",
            "subtitle": "[계산기] 금융/대출",
            "badge": "무료",
            "description": "원금균등, 원리금균등, 만기일시 상환 방식별 대출 총 이자액과 월 상환금을 시뮬레이션해 줍니다."
        }
    ]

    for calc in calculators_data:
        work_payload = {
            "id": calc["id"],
            "title": calc["title"],
            "description": calc["description"],
            "thumbnail": calc["thumbnail"],
            "status": "공개",
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
                print(f" ==> [CALC RESTORED SUCCESS] ID: {calc['id']}")
                restored_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to restore calc {calc['id']}: {e}")

    print(f"\n--- [DYNAMIC MD RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} blog/calc items unconditionally.")

if __name__ == "__main__":
    run_dynamic_markdown_restoration()
