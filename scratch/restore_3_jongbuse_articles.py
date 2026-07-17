# -*- coding: utf-8 -*-
"""
유저님이 캡처해서 주신 3대 종부세 절세 칼럼
(apateugongsigagyeg15eogbubugon, bubugongdongmyenguijongbusegor, 1jutaeggongdongmyenguijongbuse)을
고화질 R2 2:3 세로형 표지와 함께 Supabase works 테이블에 무조건 100% 복원(UPSERT)하는 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_3_jongbuse_articles_restoration():
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

    # 💡 3대 종부세 칼럼 R2 썸네일 매핑 정보
    jongbuse_specs = {
        "apateugongsigagyeg15eogbubugon": {
            "title": "아파트 공시가격 15억 부부 공동명의 단독명의 종부세 모의 연산 비교, 나에게 유리한 선택은?",
            "thumbnail": "https://r2.murimbook.com/thumbnails/apateugongsigagyeg15eogbubugon_1783433756015.jpg",
            "subtitle": "[블로그]",
            "backup_file": "backup_apateugongsigagyeg15eogbubugon.md"
        },
        "bubugongdongmyenguijongbusegor": {
            "title": "부부 공동명의 종부세 고령자 장기보유 세액공제 중복 적용 유불리 분석 및 절세 가이드",
            "thumbnail": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg",
            "subtitle": "[블로그]",
            "backup_file": "backup_bubugongdongmyenguijongbusegor.md"
        },
        "1jutaeggongdongmyenguijongbuse": {
            "title": "1주택 공동명의 종부세 9월 홈택스 특례 신청 절차와 주의사항 가이드",
            "thumbnail": "https://r2.murimbook.com/thumbnails/bubugongdongmyenguiapateujongb_1783420207148.jpg",
            "subtitle": "[블로그]",
            "backup_file": "backup_1jutaeggongdongmyenguijongbuse.md"
        }
    }

    scratch_dir = "scratch"
    restored_count = 0

    print("\n[STEP 1] Loading and restoring 3 major 종부세 tax articles...")

    for wid, spec in jongbuse_specs.items():
        file_path = os.path.join(scratch_dir, spec["backup_file"])
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                markdown = f.read()

            # 이미지 태그 제거
            markdown_cleaned = re.sub(r'<img[^>]*>', '', markdown)

            work_payload = {
                "id": wid,
                "title": spec["title"],
                "description": markdown_cleaned,
                "thumbnail": spec["thumbnail"],
                "status": "공개",
                "subtitle": spec["subtitle"],
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
                    print(f" ==> [RESTORED TAX POST] ID: {wid} | Title: '{spec['title']}'")
                    restored_count += 1
            except Exception as e:
                print(f" ==> [ERROR] Failed to restore {wid}: {e}")
        else:
            print(f"  -> [WARNING] Backup file not found: {file_path}")

    print(f"\n--- [3 JONGBUSE ARTICLES RESTORATION COMPLETE] ---")
    print(f"Successfully restored all {restored_count} tax posts.")

if __name__ == "__main__":
    run_3_jongbuse_articles_restoration()
