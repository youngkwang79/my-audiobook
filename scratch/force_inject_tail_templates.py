# -*- coding: utf-8 -*-
"""
유저님이 주신 디딤돌대출 전용 꿀템 추천 및 해시태그 블록:
---
집 공부와 일상을 더 풍요롭게 만드는 꿀템 추천
바쁜 일상 속 목 건강 챙기기: 디딤돌 대출 서류를 준비하고 바쁜 집 마련 일정 중에는 따뜻한 배도라지차, 맥문동으로 편안하게 목 관리하는 순수한집!으로 환절기 목 건강과 컨디션을 챙겨보세요.
이동하면서 오디오로 스마트하게 공부하기: 출퇴근 시간이나 은행 대기 시간에 편안한 착용감의 필립스 무선이어폰으로 정책 가이드 오디오북이나 유튜브 영상을 귀로 들으면 훨씬 빠르고 효율적으로 내 집 마련을 준비할 수 있습니다.
#디딤돌대출 #맞벌이부부 #부부합산소득 #비과세소득 #주택도시기금 #원천징수영수증 #내집마련 #대출소득기준
---
이 블록 전체를 디딤돌 대출 및 금융 관련 3대 글(calc-loan, loans, newlywed_housing) 본문 최하단에 
100% 강제 주입하여 works 테이블에 갱신(UPSERT)하는 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_force_inject_tails():
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
        "Content-Type": "application/json"
    }

    # 💡 [주입할 꿀템 추천 및 해시태그 템플릿 명세]
    tail_template = """

---

### 🏠 집 공부와 일상을 더 풍요롭게 만드는 꿀템 추천
* **바쁜 일상 속 목 건강 챙기기**: 디딤돌 대출 서류를 준비하고 바쁜 집 마련 일정 중에는 따뜻한 배도라지차, 맥문동으로 편안하게 목 관리하는 **[순수한집!](https://smartstore.naver.com)**으로 환절기 목 건강과 컨디션을 챙겨보세요.
* **이동하면서 오디오로 스마트하게 공부하기**: 출퇴근 시간이나 은행 대기 시간에 편안한 착용감의 **필립스 무선이어폰**으로 정책 가이드 오디오북이나 유튜브 영상을 귀로 들으면 훨씬 빠르고 효율적으로 내 집 마련을 준비할 수 있습니다.

#디딤돌대출, #맞벌이부부, #부부합산소득, #비과세소득, #주택도시기금, #원천징수영수증, #내집마련, #대출소득기준"""

    # 주입 대상 글 ID 목록
    target_ids = ["calc-loan", "loans", "newlywed_housing"]

    print("\n[STEP 1] Fetching target posts and injecting honey recommendations...")
    
    for wid in target_ids:
        query_url = f"{url}/rest/v1/works?id=eq.{wid}&select=title,description"
        req_get = urllib.request.Request(query_url, headers=headers)
        
        try:
            with urllib.request.urlopen(req_get) as res:
                data = json.loads(res.read().decode("utf-8"))
                if data:
                    title = data[0]["title"]
                    desc = data[0]["description"]
                    
                    # 이미 꼬리말이 붙어있는지 확인 후, 안 붙어있을 때만 이식
                    if "풍요롭게 만드는 꿀템 추천" not in desc:
                        updated_desc = desc.strip() + tail_template
                        
                        # PATCH 업데이트 실행
                        patch_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        payload = json.dumps({"description": updated_desc}).encode("utf-8")
                        req_patch = urllib.request.Request(patch_url, data=payload, headers=headers, method="PATCH")
                        
                        with urllib.request.urlopen(req_patch) as _:
                            print(f" ==> [INJECT SUCCESS] ID: {wid} | Title: '{title}' -> Tail injected!")
                    else:
                        print(f"  -> ID: {wid} | Title: '{title}' -> Already has tail. Skipped.")
                else:
                    print(f"  -> [WARNING] ID {wid} not found in DB.")
        except Exception as e:
            print(f"  -> [ERROR] Failed on ID {wid}: {e}")

    print("\n--- [TAIL INJECTION COMPLETE] ---")

if __name__ == "__main__":
    run_force_inject_tails()
