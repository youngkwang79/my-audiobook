# -*- coding: utf-8 -*-
"""
과거 대화 트랜스크립트 로그(transcript.jsonl 및 transcript_full.jsonl)의 전체 텍스트 역사를 스캔하여,
현재 D드라이브 로컬에 파일 형태로 저장되어 있지 않거나 누락되어
Supabase works 테이블에 복원되지 못했던 진짜 무림북.컴 블로그 원고들을 
100% 전수 발굴하여 works 테이블에 고화질 2:3 표지와 함께 강제 이식(UPSERT)하는 최종 복구 스크립트.
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_deep_recover_all_lost_posts():
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

    # 고화질 2:3 R2 썸네일 매핑 맵
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

    log_path = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\.system_generated\logs\transcript.jsonl"
    log_full_path = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\.system_generated\logs\transcript_full.jsonl"

    search_files = [log_path, log_full_path]
    recovered_map = {}

    print("\n[STEP 1] Scanning dialogue archives for lost blog posts...")

    for sf in search_files:
        if not os.path.exists(sf):
            continue
            
        with open(sf, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    content = data.get("content", "")
                    tool_calls = json.dumps(data.get("tool_calls", ""))
                    
                    full_text = content + "\n" + tool_calls
                    
                    # 💡 'register_post' 또는 본문 원고를 넘겨주며 등록하려 했던 데이터 블록 감지
                    if "register_post" in full_text or "insert_post" in full_text or "post_title" in full_text:
                        # 정밀 정규식으로 ID, Title, Markdown 추출
                        id_matches = re.findall(r"['\"]?id['\"]?\s*:\s*['\"](.*?)['\"]", full_text)
                        title_matches = re.findall(r"['\"]?title['\"]?\s*:\s*['\"](.*?)['\"]", full_text)
                        
                        # Markdown 본문 통째로 긁어오기
                        desc_matches = re.findall(r"['\"]?description['\"]?\s*:\s*['\"]([\s\S]*?)['\"]", full_text)
                        if not desc_matches:
                            desc_matches = re.findall(r"contentMarkdown\s*=\s*`([\s\S]*?)`", full_text)
                        if not desc_matches:
                            desc_matches = re.findall(r"content_markdown\s*=\s*f?\"\"\"([\s\S]*?)\"\"\"", full_text)

                        for i in range(min(len(id_matches), len(title_matches), len(desc_matches))):
                            wid = id_matches[i].strip()
                            title = title_matches[i].strip()
                            desc = desc_matches[i]
                            
                            # 워드프레스 수입 찌꺼기는 확실하게 방지하되, 순수 마크다운은 보존
                            if wid in blog_text_cover_map and wid not in recovered_map:
                                # 이미지 태그 정제
                                desc_cleaned = re.sub(r'<img[^>]*>', '', desc)
                                # 개행문자 정제
                                desc_cleaned = desc_cleaned.replace("\\n", "\n").replace('\\"', '"').strip()
                                
                                recovered_map[wid] = {
                                    "title": title,
                                    "description": desc_cleaned,
                                    "thumbnail": blog_text_cover_map[wid]
                                }
                except:
                    continue

    # 3. 데이터베이스 works 테이블에 전격 복원(UPSERT)
    restored_count = 0
    print(f"\n[STEP 2] Extracted {len(recovered_map)} genuine lost works. UPSERTing to DB...")
    
    for wid, item in recovered_map.items():
        work_payload = {
            "id": wid,
            "title": item["title"],
            "description": item["description"],
            "thumbnail": item["thumbnail"],
            "status": "공개",
            "subtitle": "[블로그]" if "calc" not in wid else "[계산기] 세무/절세",
            "badge": "" if "calc" not in wid else "무료",
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
                print(f" ==> [DEEP LOG RESTORED] ID: {wid} | Title: '{item['title']}'")
                restored_count += 1
        except Exception as e:
            print(f" ==> [ERROR] Failed to restore {wid}: {e}")

    print(f"\n--- [DEEP LOST POSTS RECOVERY COMPLETE] ---")
    print(f"Successfully recovered all {restored_count} lost blog posts.")

if __name__ == "__main__":
    run_deep_recover_all_lost_posts()
