import requests
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from api_key_loader import get_api_key
except ImportError:
    def get_api_key(key_name):
        return os.environ.get(key_name)

WP_URL = get_api_key("WP_URL") or "https://blog.murimbook.com"
WP_USER = get_api_key("WP_ADMIN_USERNAME") or "murimbook"
WP_APP_PW = get_api_key("WP_APPLICATION_PASSWORD")

# 방금 등록된 포스트 ID 1697 상세 조회
url = f"{WP_URL}/wp-json/wp/v2/posts/1697"

response = requests.get(url, auth=(WP_USER, WP_APP_PW))
if response.status_code == 200:
    data = response.json()
    title = data.get("title", {}).get("rendered", "")
    content = data.get("content", {}).get("rendered", "")
    meta = data.get("meta", {})
    
    print("Post Title:", title)
    print("Rank Math Focus Keyword:", meta.get("rank_math_focus_keyword"))
    print("Rank Math Description:", meta.get("rank_math_description"))

    
    char_count = len(content) # 공백 포함 글자 수
    char_no_space = len(content.replace(" ", "").replace("\n", "").replace("\r", "")) # 공백 제외 글자 수
    word_count = len(content.split()) # 단어 수
    
    print("Post Title:", title)
    print("Character Count (With spaces):", char_count)
    print("Character Count (Without spaces):", char_no_space)
    print("Word Count:", word_count)
    
    # 뼈대 검증
    has_toc = "Table of Contents" in content or "목차" in content or "href=\"#section" in content
    has_bold = "<strong" in content or "<b>" in content
    has_link = "namu.wiki" in content or "wikipedia.org" in content
    has_gov_link = "korea.kr" in content or ".go.kr" in content
    
    print("Has TOC:", has_toc)
    print("Has Bold tags:", has_bold)
    print("Has External wiki links:", has_link)
    print("Has Official Government link:", has_gov_link)
    
    # 본문 첫 300자 출력해보기
    print("\n--- CONTENT PREVIEW (First 500 chars) ---")
    print(content[:500])
else:
    print("Failed to fetch post. Code:", response.status_code)
