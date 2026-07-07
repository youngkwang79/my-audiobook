# -*- coding: utf-8 -*-
"""
구글 블로거 자동 예약 포스팅 스크립트 - 구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략 (1시간 뒤 예약 발행)
"""

import os
import pickle
import requests
from datetime import datetime, timedelta
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/blogger']

# .env.local 환경변수 읽기
CLIENT_ID = ""
CLIENT_SECRET = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if k == "BLOGGER_CLIENT_ID":
                    CLIENT_ID = v
                elif k == "BLOGGER_CLIENT_SECRET":
                    CLIENT_SECRET = v

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    }
}

def get_blogger_service():
    creds = None
    token_path = 'scratch/blogger_token.pickle'
    
    if os.path.exists(token_path):
        try:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
            if creds and hasattr(creds, 'client_id') and creds.client_id != CLIENT_ID:
                creds = None
                os.remove(token_path)
                print("Re-initializing token due to client ID mismatch.")
        except Exception:
            creds = None
            os.remove(token_path)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                print("Refreshing Blogger API Access Token...")
                creds.refresh(Request())
            except Exception:
                creds = None
        
        if not creds:
            print("Initializing Google OAuth2 Flow. Redirecting to browser...")
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
            
    return build('blogger', 'v3', credentials=creds)

def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("[ERROR] Missing BLOGGER_CLIENT_ID or BLOGGER_CLIENT_SECRET in .env.local")
        return

    # 이미지 서버 업로드 및 절대경로 획득
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
    featured_img_local = f"{brain_dir}/google_seo_strategy_blogger_cover_1783176773947.jpg"
    
    img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/google_seo_strategy_blogger_cover_1783176773947.jpg"
    
    if os.path.exists(featured_img_local):
        import mimetypes
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(featured_img_local)
        headers = {
            "Content-Disposition": f'attachment; filename="{os.path.basename(featured_img_local)}"'
        }
        if mime_type:
            headers["Content-Type"] = mime_type
        with open(featured_img_local, "rb") as f:
            r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=f)
        if r.status_code == 201:
            img_url = r.json()["source_url"]
            print(f"Blogger thumb uploaded to WP Media Server! URL: {img_url}")

    # 제목: 핵심 키워드 맨 앞
    title = "구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략"
    
    # 캡션(Caption) 태그 필수 동봉 규칙 준수 및 이미지 소스 정의
    img_html = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{img_url}" alt="구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략과 핵심 꿀팁" style="width: 100%; max-width: 650px; height: auto; border-radius: 8px;" />
  <p style="font-size: 13px; color: #666; margin-top: 6px;">[대표 이미지 설명] 구글 알고리즘 최적화를 위한 7가지 테크니컬 SEO 글쓰기 가이드</p>
</div>
"""

    content_html = f"""
{img_html}

<p>구글 검색엔진 알고리즘은 해마다 고도화되고 있으며, 단순 정보 나열이 아닌 독창적이고 사용자 경험을 반영한 콘텐츠를 우대합니다. 구글 봇의 핵심 크롤링 메커니즘을 저격하고 노출을 확보하기 위해서는 <strong>구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략과 핵심 꿀팁</strong>을 정확하게 가이드라인에 맞추어 수행해야 합니다.</p>

<hr />

<h3>전략 1: 타겟 키워드의 1문단 전략적 위치 배정</h3>
<p>구글 봇이 페이지에 접속할 때 읽는 핵심 수집 우선 구역은 상위 200단어 이내입니다. 따라서 타겟 포커스 키워드는 <strong>가장 첫 단락(Introduction) 도입부에 자연스럽게 굵은 볼드체로 최소 1회 삽입</strong>되는 것이 최상의 가독성 점수를 획득합니다.</p>

<h3>전략 2: 모바일 로딩 효율과 반응형 최적화</h3>
<p>구글은 모바일 우선 색인(Mobile-First Indexing)을 적용합니다. 
웹페이지 내 이미지에 반드시 <strong>적절한 Alt 대체 텍스트(Alt Text)와 친절한 설명문(Caption) 태그를 동봉</strong>하여, 브라우저가 이미지를 로드하지 못하는 저속 네트워크 환경에서도 문서의 의미를 파악하도록 돕는 배려가 필요합니다.</p>

<h3>전략 3: 연관 핵심 문서와의 내부 순환 링크(Internal Link) 연계</h3>
<p>웹사이트 내부의 구조적 연결은 크롤러 예산을 세이브합니다. 
무림북 사이트 내에 미리 연재되어 있는 높은 수준의 관련 칼럼(예: <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼">시간관리 집중력 향상 노하우</a>)을 자연스럽게 링크로 추천하여, 체류시간 상승과 크롤링 심층 순환을 달성해야 합니다.</p>

<h3>전략 4: 공인된 외부 출처(Outbound Link) 레퍼런스 첨부</h3>
<p>글의 전문성과 사실관계 검증 지표인 E-E-A-T를 확보하려면, 공신력 있는 외부 출처 정보를 포함하는 아웃바운드 링크 배치를 추천합니다. 구글의 가이드라인에 부합하는 양질의 테크니컬 문서를 인용함으로써 정보의 완결성을 100% 극대화할 수 있습니다.</p>

<hr />

<p>더 깊이 있는 테크니컬 SEO 가이드와 구글 봇 수집 기준은 공식 정보원 자료를 참조하시기 바랍니다:</p>
<ul>
  <li>📊 <strong><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko" target="_blank" rel="noopener noreferrer">구글 공식 개발자 센터 - 구글 검색엔진 최적화(SEO) 기본 가이드</a></strong> — 검색 로봇의 크롤링 원리와 상위 노출을 위한 문서 설계 가이드 공식 매뉴얼입니다.</li>
</ul>

<blockquote>
<p>💡 <strong>구글 검색 상위 노출 7가지 실전 SEO 글쓰기 전략</strong>의 본질은 사용자와 검색 로봇 모두에게 명확한 가시성과 신뢰도를 제공하는 구조적 안정성에 있습니다.</p>
</blockquote>

<p>#구글상위노출 #SEO글쓰기 #검색엔진최적화 #시맨틱태그 #내부링크 #EEAT #구글봇크롤링 #구글서치콘솔</p>
"""

    print("Connecting to Google Blogger API...")
    service = get_blogger_service()
    
    print("Retrieving blog list...")
    blogs_res = service.blogs().listByUser(userId='self').execute()
    if 'items' not in blogs_res or not blogs_res['items']:
        print("[ERROR] No blogs found for this user account.")
        return
        
    blog = blogs_res['items'][0]
    blog_id = blog['id']
    blog_name = blog['name']
    print(f"Target Blog Found: {blog_name} (ID: {blog_id})")

    # 1시간 뒤로 예약 시간 설정 (ISO 8601 포맷: YYYY-MM-DDTHH:MM:SS+09:00 형식)
    # 현재 시각(KST)에서 1시간 뒤 계산
    kst_now = datetime.utcnow() + timedelta(hours=9) # KST
    publish_time = kst_now + timedelta(hours=1)
    
    # 포맷 구성
    published_str = publish_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    print(f"Scheduling post for: {published_str} (KST, 1 hour later)")

    post_body = {
        "kind": "blogger#post",
        "blog": {"id": blog_id},
        "title": title,
        "content": content_html,
        "published": published_str, # 예약 시간 등록
        "status": "SCHEDULED", # 예약 발행 상태 지정
        "labels": ["SEO", "블로그운영", "구글노출"]
    }
    
    print("Uploading scheduled post to Google Blogger...")
    r_post = service.posts().insert(blogId=blog_id, body=post_body, isDraft=False).execute()
    
    post_id = r_post.get("id")
    post_url = r_post.get("url")
    print(f"\n[SUCCESS] Blogger post created successfully and SCHEDULED!")
    print(f"Post ID: {post_id}")
    print(f"Blogger Post URL: {post_url}")

if __name__ == "__main__":
    main()
