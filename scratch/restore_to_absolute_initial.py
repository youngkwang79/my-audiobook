# -*- coding: utf-8 -*-
"""
무림북.컴의 works 테이블에 워드프레스 동기화 도중 생성된 모든 post-wp-* 형태의 지저분한 중복글들을 싹 쓸어버리고,
로컬 scratch/ 디렉토리 내에 개별 업로드 코드로 완벽 백업 보관되어 있던 
최초 시점의 지식 칼럼 및 소설작품 등 진짜 오리지널 작품 데이터들만 100% 원본 복구(Rollback)하는 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_absolute_initial_restore():
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

    # 1. 워드프레스 동기화로 꼬인 post-wp-* 형식의 임시 글들 전체 일괄 영구 삭제
    print("\n[STEP 1] Cleansing works table of all temporary post-wp-* entries...")
    delete_url = f"{url}/rest/v1/works?id=like.post-wp-*"
    req_del = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as res_del:
            del_data = json.loads(res_del.read().decode("utf-8"))
            print(f" ==> Successfully deleted {len(del_data)} older mis-synced entry.")
    except Exception as e:
        print(f" ==> Cleanup error: {e}")

    # 2. 로컬 백업에서 지식글 2:3 표지 복원 목록 매핑 규칙
    precise_rollback_map = {
        "electricity_save": {
            "title": "여름 한전 전기요금 50% 아끼는 누진세 폭탄 피하기 꿀팁",
            "thumbnail": "/thumbnails/electricity_save_bookcover_1783018285121.jpg",
            "subtitle": "[블로그] 생활"
        },
        "hangang_pool": {
            "title": "한강공원 수영장 야간 개장 가이드: 여름밤의 시원한 탈출기",
            "thumbnail": "/thumbnails/hangang_pool_bookcover_1783026874943.jpg",
            "subtitle": "[블로그] 생활"
        },
        "micron_tech": {
            "title": "마이크론 테크놀로지 주가 전망: 2026년 HBM 공급 부족과 목표 주가 분석",
            "thumbnail": "/thumbnails/micron_tech_bookcover_1783049097918.jpg",
            "subtitle": "[블로그] 투자"
        },
        "welfare_3rd": {
            "title": "2026년 민생지원금 3차 지급일 및 신청 방법 총정리: 내 지원금 확인하기",
            "thumbnail": "/thumbnails/welfare_3rd_bookcover_1783035010741.jpg",
            "subtitle": "[블로그] 정책"
        },
        "youth_policy_expo": {
            "title": "2026 서울청년정책박람회 일정 및 프로그램 신청 방법 (DDP 개최, 청년 지원금 혜택 총정리)",
            "thumbnail": "/thumbnails/youth_policy_bookcover_1783033781934.jpg",
            "subtitle": "[블로그] 복지"
        },
        "school_violence": {
            "title": "학교폭력 대처법: 5단계 법적 대응",
            "thumbnail": "/thumbnails/school_violence_bookcover_1783079609239.jpg",
            "subtitle": "[블로그] 법률"
        },
        "school_violence_time": {
            "title": "학폭 피해자: 3년 손해배상 골든타임",
            "thumbnail": "/thumbnails/school_violence_time_bookcover_1783085981569.jpg",
            "subtitle": "[블로그] 법률"
        },
        "school_violence_legal": {
            "title": "학폭 피해자: 2대 민형사 소송 전략",
            "thumbnail": "/thumbnails/school_violence_legal_bookcover_1783107127428.jpg",
            "subtitle": "[블로그] 법률"
        },
        "hearing_aid": {
            "title": "노인 보청기 지원금 131만원 수령하는 3단계 핵심 꿀팁",
            "thumbnail": "/thumbnails/hearing_aid_bookcover_1783216529477.jpg",
            "subtitle": "[블로그] 건강"
        },
        "newlywed_housing": {
            "title": "신혼부부 공공임대주택 신청 조건 3가지 최신 소득 한도",
            "thumbnail": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
            "subtitle": "[블로그] 정책"
        },
        "voucher": {
            "title": "경영안정 바우처 신청 방법 3가지 및 자격 혜택 요약",
            "thumbnail": "/thumbnails/voucher_bookcover_1783250061587.jpg",
            "subtitle": "[블로그] 금융"
        },
        "worker_side_job": {
            "title": "직장인 부업: 3가지 무자본 머니 파이프",
            "thumbnail": "/thumbnails/worker_side_job_bookcover_1783159230006.jpg",
            "subtitle": "[블로그] 부업"
        },
        "careerup": {
            "title": "서울커리어업 구직지원금 3가지 자격 요건 및 신청 정보",
            "thumbnail": "/thumbnails/careerup_bookcover_1783372720826.jpg",
            "subtitle": "[블로그] 복지"
        },
        "irp": {
            "title": "개인형 IRP 중도해지 세금 폭탄 3가지 피하는 꿀팁",
            "thumbnail": "/thumbnails/irp_bookcover_1783402575192.jpg",
            "subtitle": "[블로그] 재테크"
        },
        "loans": {
            "title": "대환대출: 2026 정부 지원 3가지 조건",
            "thumbnail": "/thumbnails/newlywed_housing_bookcover_1783229153411.jpg",
            "subtitle": "[블로그] 대출"
        },
        "seo_writing_blogger": {
            "title": "구글 상위 노출 SEO 글쓰기 4가지 방법",
            "thumbnail": "/thumbnails/seo_writing_bookcover_1783175891417.jpg",
            "subtitle": "[블로그] IT/업무"
        },
        "seo_strategy_blogger": {
            "title": "구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략",
            "thumbnail": "/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg",
            "subtitle": "[블로그] IT/업무"
        },
        "calc-jongbuse": {
            "title": "부부 공동명의 아파트 종부세 계산기",
            "thumbnail": "/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
            "subtitle": "[계산기] 세무/절세"
        },
        "calc-brokerage": {
            "title": "부동산 중개 수수료 계산기",
            "thumbnail": "/thumbnails/broker_calc_cover_1783427287270.jpg",
            "subtitle": "[계산기] 세무/절세"
        },
        "calc-loan": {
            "title": "디딤돌 대출 복리/대출이자 상환 계산기",
            "thumbnail": "/thumbnails/loan_calc_cover_1783427271223.jpg",
            "subtitle": "[계산기] 금융/대출"
        }
    }

    # 3. scratch 폴더 내에 저장된 upload_*.py 및 register_*.js 파일들을 파싱하여
    # 마크다운 본문(description)을 온전히 수확해 UPSERT 복원 처리
    print("\n[STEP 2] Recovering full body markdowns from local python/js backups...")
    scratch_dir = "scratch"
    restored_count = 0

    for file_name in os.listdir(scratch_dir):
        # 3-1. register_*.js 파싱 (welfare_3rd, youth_policy_expo, hangang_pool, micron_tech 등)
        if file_name.startswith("register_") and file_name.endswith(".js"):
            file_path = os.path.join(scratch_dir, file_name)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            id_match = re.search(r"id:\s*['\"](.*?)['\"]", content)
            markdown_match = re.search(r"const contentMarkdown = `([\s\S]*?)`;", content)
            
            if id_match and markdown_match:
                wid = id_match.group(1).strip()
                markdown = markdown_match.group(1)
                
                # 만약 복원 대상 맵에 들어있는 글인 경우에만 100% 롤백
                if wid in precise_rollback_map:
                    details = precise_rollback_map[wid]
                    
                    work_payload = {
                        "id": wid,
                        "title": details["title"],
                        "description": markdown,
                        "thumbnail": details["thumbnail"],
                        "status": "공개",
                        "subtitle": details["subtitle"],
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

                    # Supabase UPSERT 수행
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
                            print(f" ==> [ORIGINAL JS RESTORE] ID: {wid} | Cover: {details['thumbnail']}")
                            restored_count += 1
                    except Exception as e:
                        print(f" ==> [ERROR] Failed to restore JS backup {wid}: {e}")

        # 3-2. upload_*.py 파싱 (school_violence, newlywed_housing, irp, voucher, hearing_aid 등)
        elif file_name.startswith("upload_") and file_name.endswith(".py"):
            file_path = os.path.join(scratch_dir, file_name)
            
            # 동기화 파일 및 소설파일 제외
            wid = file_name.replace("upload_", "").replace("_posts", "").replace("_wp", "").replace(".py", "")
            if wid in ["files", "generated_thumbnail", "blogger_post"]:
                continue
                
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            markdown_match = re.search(r"content_html\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)
            if not markdown_match:
                markdown_match = re.search(r"content_markdown\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)
            if not markdown_match:
                markdown_match = re.search(r"content_html\s*=\s*f?'''([\s\S]*?)'''", content)
            if not markdown_match:
                markdown_match = re.search(r"content\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", content)

            if markdown_match and wid in precise_rollback_map:
                markdown = markdown_match.group(1)
                markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown) # 본문 내 img 태그 배제 원칙 준수
                
                details = precise_rollback_map[wid]
                
                work_payload = {
                    "id": wid,
                    "title": details["title"],
                    "description": markdown_cleaned,
                    "thumbnail": details["thumbnail"],
                    "status": "공개",
                    "subtitle": details["subtitle"],
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
                        print(f" ==> [ORIGINAL PY RESTORE] ID: {wid} | Cover: {details['thumbnail']}")
                        restored_count += 1
                except Exception as e:
                    print(f" ==> [ERROR] Failed to restore PY backup {wid}: {e}")

    print(f"\n--- [ABSOLUTE INITIAL ROLLBACK PROCESS COMPLETE] ---")
    print(f"Successfully restored {restored_count} original 2:3 posts to their initial pristine state.")

if __name__ == "__main__":
    run_absolute_initial_restore()
