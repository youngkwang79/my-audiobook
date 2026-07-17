# -*- coding: utf-8 -*-
"""
D드라이브 로컬 scratch/ 폴더 내에 실물 파일(*.md)로 백업 보관되어 있던 
오리지널 21대 블로그 칼럼 본문 전문을 100% 날것 그대로 로드하여,
Supabase works 테이블에 고화질 2:3 R2 썸네일 표지와 함께 복원(UPSERT)하는 최종 마스터 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_raw_markdown_restoration():
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

    # 💡 21대 오리지널 백업 파일명 대조 및 수동 썸네일 매핑 정의
    original_files_spec = {
        "backup_apateugongsigagyeg15eogbubugon.md": {
            "id": "apateugongsigagyeg15eogbubugon",
            "title": "아파트 공시가격 15억 부부 공동명의 단독명의 종부세 모의 연산 비교, 나에게 유리한 선택은?",
            "thumbnail": "https://r2.murimbook.com/thumbnails/apateugongsigagyeg15eogbubugon_1783433756015.jpg"
        },
        "backup_bubugongdongmyenguijongbusegor.md": {
            "id": "bubugongdongmyenguijongbusegor",
            "title": "부부 공동명의 종부세 고령자 장기보유 세액공제 중복 적용 유불리 분석 및 절세 가이드",
            "thumbnail": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg"
        },
        "backup_1jutaeggongdongmyenguijongbuse.md": {
            "id": "1jutaeggongdongmyenguijongbuse",
            "title": "1주택 공동명의 종부세 9월 홈택스 특례 신청 절차와 주의사항 가이드",
            "thumbnail": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg"
        },
        "backup_loans.md": {
            "id": "loans",
            "title": "대환대출: 2026 정부 지원 3가지 조건",
            "thumbnail": "https://r2.murimbook.com/thumbnails/newlywed_housing_bookcover_1783229153411.jpg"
        },
        "backup_hearing_aid.md": {
            "id": "hearing_aid",
            "title": "노인 보청기 지원금 131만원 수령하는 3단계 핵심 꿀팁",
            "thumbnail": "https://r2.murimbook.com/thumbnails/hearing_aid_bookcover_1783216529477.jpg"
        },
        "backup_newlywed_housing.md": {
            "id": "newlywed_housing",
            "title": "신혼부부 공공임대주택 신청 조건 3가지 최신 소득 한도",
            "thumbnail": "https://r2.murimbook.com/thumbnails/newlywed_housing_bookcover_1783229153411.jpg"
        },
        "backup_voucher.md": {
            "id": "voucher",
            "title": "경영안정 바우처 신청 방법 3가지 및 자격 혜택 요약",
            "thumbnail": "https://r2.murimbook.com/thumbnails/voucher_bookcover_1783250061587.jpg"
        },
        "backup_careerup.md": {
            "id": "careerup",
            "title": "서울커리어업 구직지원금 3가지 자격 요건 및 신청 정보",
            "thumbnail": "https://r2.murimbook.com/thumbnails/careerup_bookcover_1783372720826.jpg"
        },
        "backup_irp.md": {
            "id": "irp",
            "title": "개인형 IRP 중도해지 세금 폭탄 3가지 피하는 꿀팁",
            "thumbnail": "https://r2.murimbook.com/thumbnails/irp_bookcover_1783402575192.jpg"
        },
        "backup_electricity_save.md": {
            "id": "electricity_save",
            "title": "전기세 절약 3대 비법: 고정지출 획기적 축소",
            "thumbnail": "https://r2.murimbook.com/thumbnails/electricity_save_bookcover_1783018285121.jpg"
        },
        "backup_hangang_pool.md": {
            "id": "hangang_pool",
            "title": "한강공원 수영장 야간개장 7월일정",
            "thumbnail": "https://r2.murimbook.com/thumbnails/hangang_pool_bookcover_1783026874943.jpg"
        },
        "backup_time_management.md": {
            "id": "time_management",
            "title": "시간 관리 비법: 하루 24시간 48시간처럼 쪼개어 사는 3단계 실천 로드맵",
            "thumbnail": "https://r2.murimbook.com/thumbnails/time_management_bookcover_1783009842330.jpg"
        },
        "backup_school_violence.md": {
            "id": "school_violence",
            "title": "학교폭력 대처법: 5단계 법적 대응",
            "thumbnail": "https://r2.murimbook.com/thumbnails/school_violence_bookcover_1783079609239.jpg"
        },
        "backup_school_violence_time.md": {
            "id": "school_violence_time",
            "title": "학폭 피해자: 3년 손해배상 골든타임",
            "thumbnail": "https://r2.murimbook.com/thumbnails/school_violence_time_bookcover_1783085981569.jpg"
        },
        "backup_school_violence_legal.md": {
            "id": "school_violence_legal",
            "title": "학폭 피해자: 2대 민형사 소송 전략",
            "thumbnail": "https://r2.murimbook.com/thumbnails/school_violence_legal_bookcover_1783107127428.jpg"
        },
        "backup_seo_writing_blogger.md": {
            "id": "seo_writing_blogger",
            "title": "구글 상위 노출 SEO 글쓰기 4가지 방법",
            "thumbnail": "https://r2.murimbook.com/thumbnails/seo_writing_bookcover_1783175891417.jpg"
        },
        "backup_seo_strategy_blogger.md": {
            "id": "seo_strategy_blogger",
            "title": "구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략",
            "thumbnail": "https://r2.murimbook.com/thumbnails/google_seo_strategy_bookcover_1783176761779.jpg"
        },
        "backup_welfare_3rd.md": {
            "id": "welfare_3rd",
            "title": "민생지원금 3차 지급일정",
            "thumbnail": "https://r2.murimbook.com/thumbnails/welfare_3rd_bookcover_1783035010741.jpg"
        },
        "backup_worker_side_job.md": {
            "id": "worker_side_job",
            "title": "직장인 부업: 3가지 무자본 머니 파이프",
            "thumbnail": "https://r2.murimbook.com/thumbnails/worker_side_job_bookcover_1783159230006.jpg"
        },
        "backup_youth_policy_expo.md": {
            "id": "youth_policy_expo",
            "title": "2026 서울청년정책박람회 일정 및 프로그램 신청 방법 (DDP 개최, 청년 지원금 혜택 총정리)",
            "thumbnail": "https://r2.murimbook.com/thumbnails/youth_policy_bookcover_1783033781934.jpg"
        },
        "backup_micron_tech.md": {
            "id": "micron_tech",
            "title": "마이크론 테크놀로지 주가전망",
            "thumbnail": "https://r2.murimbook.com/thumbnails/micron_tech_bookcover_1783049097918.jpg"
        }
    }

    # 💡 세무/금융 계산기 3종 사양
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

    scratch_dir = "scratch"
    restored_count = 0

    print("\n[STEP 1] Loading raw backup markdown files from hard drive and restoring...")
    
    for filename, spec in original_files_spec.items():
        file_path = os.path.join(scratch_dir, filename)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                raw_markdown = f.read()

            # HTML 및 이미지 태그 정제
            markdown_cleaned = re.sub(r'<img[^>]*>', '', raw_markdown)
            
            work_payload = {
                "id": spec["id"],
                "title": spec["title"],
                "description": markdown_cleaned,
                "thumbnail": spec["thumbnail"],
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
                    print(f" ==> [RAW MD RESTORED SUCCESS] ID: {spec['id']} | Title: '{spec['title']}'")
                    restored_count += 1
            except Exception as e:
                print(f" ==> [ERROR] Failed to restore {spec['id']}: {e}")
        else:
            print(f"  -> [WARNING] Backup file missing: {file_path}")

    # 3. 계산기 3종 복원
    print("\n[STEP 2] Restoring 3 calculators...")
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

    print(f"\n--- [RAW MD RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} target blog/calc items unconditionally.")

if __name__ == "__main__":
    run_raw_markdown_restoration()
