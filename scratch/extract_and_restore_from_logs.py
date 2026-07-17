# -*- coding: utf-8 -*-
"""
과거 대화 트랜스크립트 전체를 줄 단위로 전수 스캔하되,
'디딤돌' 단어와 '배도라지차', '이어폰' 단어가 본문 내에 동시에 출현하는 
진짜 오리지널 무림북 원고를 100% 온전히 발굴해서 복원하는 마스터 구출 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_log_cross_match_restoration():
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

    r2_exact_map = {
        "loans": "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg",
        "newlywed_housing": "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg",
        "calc-loan": "https://r2.murimbook.com/thumbnails/loan_calc_cover_1783427271223.jpg",
        "welfare_3rd": "https://r2.murimbook.com/thumbnails/welfare_3rd_1783036018542.jpg",
        "careerup": "https://r2.murimbook.com/thumbnails/seoulkeorieobgujigjiwongeum202_1783420358572.jpg",
        "hearing_aid": "https://r2.murimbook.com/thumbnails/ears_1783390545388.jpg",
        "irp": "https://r2.murimbook.com/thumbnails/gaeinhye_1783406520606.jpg",
        "voucher": "https://r2.murimbook.com/thumbnails/voucher_bookcover_1783250061587.jpg"
    }

    log_path = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\.system_generated\logs\transcript.jsonl"
    log_full_path = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\.system_generated\logs\transcript_full.jsonl"

    search_files = [log_path, log_full_path]
    restored_count = 0

    print("\n[STEP 1] Performing triple-keyword cross scanning on logs...")

    for sf in search_files:
        if not os.path.exists(sf):
            continue
            
        with open(sf, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f, 1):
                try:
                    data = json.loads(line)
                    content = data.get("content", "")
                    tool_calls = json.dumps(data.get("tool_calls", ""))
                    
                    full_block = content + "\n" + tool_calls
                    
                    # 💡 삼중 단어 교차 매칭 검사
                    has_didimdol = "디딤돌" in full_block
                    has_tea = "배도라지차" in full_block or "배도라지" in full_block
                    has_earphone = "이어폰" in full_block or "필립스" in full_block
                    
                    if has_didimdol and has_tea and has_earphone:
                        # 대화 내용 내에서 마크다운 형태로 생성된 원본 본문을 정교하게 파싱해 냄
                        title_match = re.search(r"##\s*\[(.*?)\]", full_block)
                        if not title_match:
                            title_match = re.search(r"제목\s*:\s*(.*?)\n", full_block)
                            
                        if title_match:
                            title = title_match.group(1).strip().replace("[NEW]", "").strip()
                            
                            # ID 매칭
                            matched_id = None
                            if "디딤돌" in title or "대환대출" in title:
                                matched_id = "loans"
                            elif "신혼부부" in title:
                                matched_id = "newlywed_housing"
                            elif "보청기" in title:
                                matched_id = "hearing_aid"
                            elif "IRP" in title:
                                matched_id = "irp"
                            elif "바우처" in title:
                                matched_id = "voucher"
                            elif "커리어업" in title:
                                matched_id = "careerup"
                            elif "민생지원금" in title:
                                matched_id = "welfare_3rd"
                                
                            if matched_id:
                                body_start = full_block.find(title)
                                if body_start == -1:
                                    body_start = full_block.lower().find("작성자")
                                    
                                if body_start != -1:
                                    body_text = full_block[body_start:].strip()
                                    body_cleaned = body_text.replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"')
                                    # <img> 태그 제거
                                    body_cleaned = re.sub(r'<img[^>]*>', '', body_cleaned)
                                    
                                    cover = r2_exact_map.get(matched_id, "https://r2.murimbook.com/thumbnails/wedding_house_1783229249822.jpg")
                                    
                                    work_payload = {
                                        "id": matched_id,
                                        "title": title,
                                        "description": body_cleaned,
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
                                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                                    }

                                    insert_url = f"{url}/rest/v1/works"
                                    insert_data = json.dumps(work_payload).encode("utf-8")
                                    req_ups = urllib.request.Request(insert_url, data=insert_data, headers=headers, method="POST")
                                    try:
                                        with urllib.request.urlopen(req_ups) as _:
                                            print(f" ==> [CROSS MATCH SUCCESS] ID: {matched_id} | Title: '{title}' Restored!")
                                            restored_count += 1
                                    except Exception as e:
                                        print(f" ==> [ERROR] Failed to upsert: {e}")
                except Exception as e:
                    continue

    print(f"\n--- [CROSS MATCH LOG EXTRACTION COMPLETE] ---")
    print(f"Successfully restored {restored_count} target posts containing the exact block.")

if __name__ == "__main__":
    run_log_cross_match_restoration()
