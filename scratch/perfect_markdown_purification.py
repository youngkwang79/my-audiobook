# -*- coding: utf-8 -*-
"""
본문(description)이 순수 마크다운(##, ### 등 노란색 소제목 구조)으로 작성되어 있지 않고,
<p>, <hr /> 등 지저분한 HTML 태그들로 도배되어 있는 워드프레스 이식 글들을 
100% 엄격하게 감지하여 데이터베이스 works 테이블에서 완전히 일괄 삭제(DELETE)하는 스크립트.
(소설은 100% 보호 배제)
"""

import os
import json
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_markdown_purification():
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

    # 1. 모든 작품 목록 페치
    print("\n[STEP 1] Querying works entries to detect non-markdown HTML posts...")
    query_url = f"{url}/rest/v1/works?select=id,title,description"
    req_query = urllib.request.Request(query_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req_query) as res:
            works_list = json.loads(res.read().decode("utf-8"))
            print(f" ==> Found {len(works_list)} entries total in DB.")
            
            deleted_count = 0
            retained_count = 0
            
            for w in works_list:
                wid = w["id"]
                title = w["title"]
                description = w.get("description", "")
                
                # 💡 [소설 데이터는 무조건 100% 바이패스 패스]
                is_novel = wid in ["yajangsingeom", "yahyelhwamyeng", "cheongun", "sogaju"]
                if is_novel:
                    retained_count += 1
                    continue
                
                # 💡 [블로그 지식글 필터링 조건]
                # 본문에 <p> 혹은 <hr /> 등의 HTML 태그가 존재하면 워드프레스 찌꺼기 글로 판정하여 삭제
                # 진짜 무림북 글은 순수 마크다운(##, ###, > [!IMPORTANT] 등)으로만 기록되어 있습니다.
                has_html_tags = "<p>" in description or "<p " in description or "<hr" in description or "style=" in description
                
                # 또는 마크다운 소제목 표식(### 나 ##)이 전혀 들어있지 않은 불성실한 글도 삭제 대상
                has_no_headings = "### " not in description and "## " not in description
                
                # 블로그 포스트 중에서만 선별 처리
                is_blog_post = "post-wp-" in wid or "calc" in wid or wid in ["careerup", "electricity_save", "hangang_pool", "hearing_aid", "irp", "loans", "micron_tech", "newlywed_housing", "school_violence", "school_violence_legal", "school_violence_time", "so_sang_gong_in_loan", "voucher", "welfare_3rd", "worker_side_job", "tomorrow_card"]
                
                if is_blog_post:
                    if has_html_tags or has_no_headings:
                        print(f" ==> [DELETE TARGE DETECTED]: '{title}' (ID: {wid})")
                        if has_html_tags:
                            print("     Reason: Found HTML tags (<p>, <hr>, style) instead of pure Markdown.")
                        if has_no_headings:
                            print("     Reason: Missing yellow subheadings (## or ###).")
                            
                        # DELETE API 전송
                        del_url = f"{url}/rest/v1/works?id=eq.{wid}"
                        req_del = urllib.request.Request(del_url, headers=headers, method="DELETE")
                        with urllib.request.urlopen(req_del) as _:
                            print(f"   -> [DELETED] Removed ID: {wid}")
                            deleted_count += 1
                    else:
                        print(f"  -> [RETAINED PURE MD]: '{title}' (Yellow Subheading Verified - ID: {wid})")
                        retained_count += 1
                else:
                    retained_count += 1
                    
            print(f"\n--- [MARKDOWN PURIFICATION PROCESS COMPLETE] ---")
            print(f"Successfully deleted {deleted_count} non-markdown blog post(s).")
            print(f"Retained {retained_count} true markdown post(s).")
            
    except Exception as e:
        print("[ERROR] Purification failed:", e)

if __name__ == "__main__":
    run_markdown_purification()
