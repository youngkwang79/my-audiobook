# -*- coding: utf-8 -*-
import os
import requests
import json
import re

# Load env variables
WP_URL = ""
WP_USER = ""
WP_PASS = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                parts = line.split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip().replace('"', '').replace("'", "")
                if k == "WP_URL":
                    WP_URL = v
                elif k == "WP_ADMIN_USERNAME":
                    WP_USER = v
                elif k == "WP_APPLICATION_PASSWORD":
                    WP_PASS = v

def main():
    if not WP_URL or not WP_USER or not WP_PASS:
        print("Missing WordPress credentials.")
        return

    # Fetch recently created posts (published posts)
    url = f"{WP_URL}/wp-json/wp/v2/posts?status=publish&per_page=10"
    r = requests.get(url, auth=(WP_USER, WP_PASS))
    if r.status_code != 200:
        print(f"Failed to fetch posts: {r.status_code}")
        return

    posts = r.json()
    print(f"Found {len(posts)} scheduled posts to optimize.")

    # Target product mapping for keyword injection
    keyword_map = {
        "리스테린": {
            "keyword": "리스테린 토탈케어 마일드",
            "ext_link": "https://www.listerine.co.kr",
            "ext_text": "리스테린 한국 공식 홈페이지 구강 건강 가이드라인"
        },
        "뉴트리나": {
            "keyword": "뉴트리나 리얼오가닉 캣",
            "ext_link": "http://www.nutrena.co.kr",
            "ext_text": "뉴트리나 공식 펫푸드 영양 학회 자료실"
        },
        "테팔": {
            "keyword": "테팔 파워글라이드 프라이팬",
            "ext_link": "https://www.tefal.co.kr",
            "ext_text": "Tefal 테팔 코리아 공식 품질 보증 센터 사양서"
        },
        "아토팜": {
            "keyword": "아토팜 탑투토 워시",
            "ext_link": "https://www.atopalm.co.kr",
            "ext_text": "아토팜 피부장벽 MLE 공식 임상 시험 리포트"
        },
        "프로쉬": {
            "keyword": "프로쉬 식기세척기 세제",
            "ext_link": "https://www.frosch.co.kr",
            "ext_text": "프로쉬 코리아 공식 환경 친화 기준 고시 정보"
        }
    }

    for p in posts:
        post_id = p["id"]
        title = p["title"]["rendered"]
        content = p["content"]["rendered"]
        
        # Find which product matching this post
        matched_key = None
        for key in keyword_map:
            if key in title:
                matched_key = key
                break
                
        if not matched_key:
            print(f"Post '{title}' did not match any target product for optimization.")
            continue
            
        info = keyword_map[matched_key]
        focus_keyword = info["keyword"]
        
        print(f"\nOptimizing Post ID {post_id}: '{title}'")
        print(f"Target Focus Keyword: {focus_keyword}")

        # 1. Modify Content HTML to insert Focus Keyword into H2/H3
        # Replace first H2 with focus keyword
        updated_content = content
        if "<h2>1. 핵심 성능 분석 및 독점 기술 요약</h2>" in updated_content:
            updated_content = updated_content.replace(
                "<h2>1. 핵심 성능 분석 및 독점 기술 요약</h2>",
                f"<h2>1. {focus_keyword} 핵심 성능 분석 및 독점 기술 요약</h2>"
            )
        elif "<h2>1. " not in updated_content:
            # Fallback regex replace for first H2
            updated_content = re.sub(r'<h2>1\.\s*(.*?)</h2>', f'<h2>1. {focus_keyword} \\1</h2>', updated_content, count=1)

        # 2. Ensure External DoFollow link is present
        ext_link_html = f'<p>🔍 <strong>상세 기술 출처 및 정보</strong>: <a href="{info["ext_link"]}" target="_blank" rel="noopener">{info["ext_text"]}</a>를 참고하시면 더욱 유익합니다.</p>'
        if info["ext_link"] not in updated_content:
            # Inject before the final disclaimer/disclaimer boundary
            if "<hr" in updated_content:
                parts = updated_content.split("<hr")
                # Insert before the last <hr> (usually holds tags/disclaimer)
                parts[-2] = parts[-2] + "\n" + ext_link_html + "\n"
                updated_content = "<hr".join(parts)
            else:
                updated_content += "\n" + ext_link_html

        # 3. Ensure Internal link is present
        # Link to other post on the site (e.g., blog main or a popular post like welfare/brokerage)
        internal_link_html = '<p>💡 <strong>부자습관과 효율적인 가계 자산 관리 팁</strong>: 무림북 블로그의 <a href="https://blog.murimbook.com" target="_blank">삼성 이병철 회장 부자 습관 칼럼 및 세금 절세 가이드</a>도 함께 살펴보시면 가정 재정에 큰 도움이 됩니다.</p>'
        if "https://blog.murimbook.com" not in updated_content:
            if "<hr" in updated_content:
                parts = updated_content.split("<hr")
                parts[-2] = parts[-2] + "\n" + internal_link_html + "\n"
                updated_content = "<hr".join(parts)
            else:
                updated_content += "\n" + internal_link_html

        # 4. Update the Post in WordPress with meta parameters
        update_url = f"{WP_URL}/wp-json/wp/v2/posts/{post_id}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "content": updated_content,
            "meta": {
                "rank_math_focus_keyword": focus_keyword
            }
        }
        
        # Rank math focus keyword update via REST API meta
        r_update = requests.post(update_url, auth=(WP_USER, WP_PASS), headers=headers, json=payload)
        if r_update.status_code == 200:
            print(f"[SUCCESS] Post {post_id} Rank Math SEO updated and optimized!")
        else:
            print(f"[FAILED] Failed to update post {post_id}: {r_update.status_code}")
            print(r_update.text)

if __name__ == '__main__':
    main()
