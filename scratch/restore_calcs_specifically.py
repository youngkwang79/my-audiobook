# -*- coding: utf-8 -*-
"""
1~4번 (종부세 계산기, 수수료 계산기, 대출 계산기, 민생지원금 3차) 글에 대해서만
유저님이 지정하신 원래의 개별 전용 썸네일과 본래의 세부 설정 데이터로 정확하게 교정 원상복구하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_calcs_specific_patch():
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

    # 💡 1~4번 글의 고유 규격과 썸네일
    calcs_spec = {
        "calc-jongbuse": {
            "title": "부부 공동명의 아파트 종부세 계산기",
            "thumbnail": "/thumbnails/jongbuse_calc_cover_1783427256565.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "status": "연재중"
        },
        "calc-brokerage": {
            "title": "부동산 중개 수수료 계산기",
            "thumbnail": "/thumbnails/broker_calc_cover_1783427287270.jpg",
            "subtitle": "[계산기] 세무/절세",
            "badge": "무료",
            "status": "연재중"
        },
        "calc-loan": {
            "title": "디딤돌 대출 복리/대출이자 상환 계산기",
            "thumbnail": "/thumbnails/loan_calc_cover_1783427271223.jpg",
            "subtitle": "[계산기] 금융/대출",
            "badge": "무료",
            "status": "연재중"
        },
        "welfare_3rd": {
            "title": "2026년 민생지원금 3차 지급일 및 신청 방법 총정리: 내 지원금 확인하기",
            "thumbnail": "/thumbnails/welfare_3rd_bookcover_1783035010741.jpg",
            "subtitle": "[블로그] 정책",
            "badge": "",
            "status": "공개"
        }
    }

    print("\n--- [START INDIVIDUAL PATCH FOR 1-4 ENTRIES] ---")
    patched_count = 0

    for wid, details in calcs_spec.items():
        update_url = f"{url}/rest/v1/works?id=eq.{wid}"
        payload = json.dumps({
            "title": details["title"],
            "thumbnail": details["thumbnail"],
            "subtitle": details["subtitle"],
            "badge": details["badge"],
            "status": details["status"]
        }).encode("utf-8")

        req = urllib.request.Request(
            update_url,
            data=payload,
            headers=headers,
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(req) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                if res_data:
                    print(f" ==> [PATCH SUCCESS] ID: {wid} | Cover: {details['thumbnail']}")
                    patched_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to patch ID {wid}: {e}")

    print(f"\n--- [1-4 PATCH PROCESS COMPLETE] ---")
    print(f"Successfully recovered {patched_count} entries to their correct state.")

if __name__ == "__main__":
    run_calcs_specific_patch()
