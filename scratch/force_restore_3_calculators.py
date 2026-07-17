# -*- coding: utf-8 -*-
"""
계산기 3종 (종부세 계산기, 중개 수수료 계산기, 대출 계산기)의 
메타데이터(R2 고유 썸네일, 연재중 상태, 무료 배지 등)를 데이터베이스 works 테이블에 100% 무조건 복원(UPSERT)하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_forced_calculators_restoration():
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

    # 💡 [정확한 계산기 3종 메타 데이터 명세]
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

    print("\n[STEP 1] Restoring 3 calculators to works table...")
    restored_count = 0

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
            "last_rate": None
        }

        insert_url = f"{url}/rest/v1/works"
        insert_data = json.dumps(work_payload).encode("utf-8")
        req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req_ups) as _:
                print(f" ==> [CALC RESTORED] ID: {calc['id']} | Title: '{calc['title']}'")
                restored_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to restore calculator {calc['id']}: {e}")

    print(f"\n--- [3 CALCULATORS RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} calculators to works table.")

if __name__ == "__main__":
    run_forced_calculators_restoration()
