# -*- coding: utf-8 -*-
"""
로컬 scratch/ 디렉토리에 백업 보관되어 있는 register_*.js 개별 등록 파일들을 직접 파싱하여
원래의 진짜 무림북 ID, 2:3 표지 썸네일, 본문 마크다운 전체를 100% 정합성 있게 works DB에 
강제 복원(UPSERT) 처리하는 최종 명품 복원 스크립트.
(학교폭력 가해자 등 누락되었던 2:3 오리지널 글 전체 완벽 심폐소생)
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_and_restore_original_files():
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

    # 1. 중복 꼬인 post-wp-* 형태의 임시 글들 전체 일괄 선삭제
    print("\n[STEP 1] Cleansing previous temporary post-wp-* entries from Supabase...")
    delete_url = f"{url}/rest/v1/works?id=like.post-wp-*"
    req_del = urllib.request.Request(delete_url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req_del) as res_del:
            del_data = json.loads(res_del.read().decode("utf-8"))
            print(f" ==> Successfully deleted {len(del_data)} older mis-synced entry.")
    except Exception as e:
        print(f" ==> Cleanup error: {e}")

    # 2. scratch 폴더 내 register_*.js 파일들을 탐색 및 복원 파싱
    print("\n[STEP 2] Parsing register_*.js backup files for original works data...")
    scratch_dir = "scratch"
    files = os.listdir(scratch_dir)
    
    restored_count = 0
    for file_name in files:
        if file_name.startswith("register_") and file_name.endswith(".js"):
            file_path = os.path.join(scratch_dir, file_name)
            print(f"  -> Processing backup file: {file_name}")
            
            with open(file_path, "r", encoding="utf-8") as f:
                js_content = f.read()
                
            # 정규식을 이용해 work = { ... } 구조 및 contentMarkdown 문자열 파출
            # 1. contentMarkdown 추출
            markdown_match = re.search(r"const contentMarkdown = `([\s\S]*?)`;", js_content)
            # 2. work 객체 속성 추출
            id_match = re.search(r"id:\s*['\"](.*?)['\"]", js_content)
            title_match = re.search(r"title:\s*['\"](.*?)['\"]", js_content)
            thumb_match = re.search(r"thumbnail:\s*['\"](.*?)['\"]", js_content)
            sub_match = re.search(r"subtitle:\s*['\"](.*?)['\"]", js_content)
            
            if markdown_match and id_match and title_match and thumb_match:
                wid = id_match.group(1).strip()
                title = title_match.group(1).strip()
                markdown = markdown_match.group(1)
                thumb = thumb_match.group(1).strip()
                sub = sub_match.group(1).strip() if sub_match else "[블로그]"
                
                # DB works 테이블용 페일로드 조립
                work_payload = {
                    "id": wid,
                    "title": title,
                    "description": markdown,
                    "thumbnail": thumb, # 2:3 완벽 물리 표지
                    "status": "공개",   # 즉시 노출
                    "subtitle": sub,
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
                        res_payload = json.loads(res_ups.read().decode("utf-8"))
                        if res_payload:
                            print(f" ==> [SUCCESS RESTORE] ID: {wid} | '{title}'")
                            print(f"     -> 2:3 Cover Path: {thumb}")
                            restored_count += 1
                except Exception as e:
                    print(f" ==> [ERROR] Failed to restore {title}: {e}")

    print(f"\n--- [NATIVE BACKUP RESTORE COMPLETE] ---")
    print(f"Successfully restored {restored_count} original 2:3 works entries from scratch backups.")

if __name__ == "__main__":
    parse_and_restore_original_files()
