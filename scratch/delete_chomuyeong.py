# -*- coding: utf-8 -*-
"""
ID에 공백이 섞여있어 이전에 스킵되었던 마지막 1개 소설 'Myeolsaguirim Chomuyeong'을
Supabase works 테이블에서 URL 인코딩을 통해 100% 깔끔하게 저격 삭제(DELETE)하는 최종 마무리 스크립트.
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_delete_chomuyeong():
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

    # 공백 문자를 '%20'으로 안전하게 인코딩 처리
    target_id_encoded = urllib.parse.quote("Myeolsaguirim Chomuyeong")
    del_url = f"{url}/rest/v1/works?id=eq.{target_id_encoded}"

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    }

    req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as _:
            print(f" ==> [LAST NOVEL PURGED] ID: 'Myeolsaguirim Chomuyeong' has been completely deleted!")
    except Exception as e:
        print(f" ==> [ERROR] Failed to delete: {e}")

if __name__ == "__main__":
    run_delete_chomuyeong()
