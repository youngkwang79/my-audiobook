# -*- coding: utf-8 -*-
"""
구글 블로거 자동 포스팅 스크립트 - 구글 상위 노출 SEO 글쓰기 4가지 방법 (중복 문서 피하기 변환 적용)
"""

import os
import pickle
import requests
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
    featured_img_local = f"{brain_dir}/seo_writing_blogger_cover_1783175909717.jpg"
    
    img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/seo_writing_blogger_cover_1783175909717.jpg"
    
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
    title = "구글 상위 노출 SEO 글쓰기 4가지 방법"
    
    # 캡션(Caption) 태그 필수 동봉 규칙 준수 및 이미지 소스 정의
    img_html = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{img_url}" alt="구글 상위 노출 SEO 글쓰기 4가지 방법" style="width: 100%; max-width: 650px; height: auto; border-radius: 8px;" />
  <p style="font-size: 13px; color: #666; margin-top: 6px;">[대표 이미지 설명] 검색 로봇이 선호하는 구글 상위 노출 SEO 글쓰기 핵심 4단계 가이드 라인 요약본</p>
</div>
"""

    content_html = f"""
{img_html}

<p>구글 검색 로봇(Googlebot)의 색인 및 랭킹 알고리즘은 사용자의 이탈률(Bounce Rate)과 정보의 고유 가치(Unique Value)를 기술적으로 정밀 분석하여 검색 결과 순위를 부여합니다. 구글 상위에 포스팅을 안착시키려면 감성적인 글쓰기보다 <strong>구글 상위 노출 SEO 글쓰기 4가지 방법</strong>을 크롤러 친화형 규칙에 맞춰 작성하는 기술적 접근이 요구됩니다.</p>

<hr />

<h3>방법 1: 타겟 키워드의 배치 최적화 및 적정 밀도 유지</h3>
<p>구글의 자연어 처리 인공지능(BERT 및 MUM)은 문서의 핵심 뼈대를 최상단 구조에서 먼저 파악합니다. 따라서 포커스 키워드는 <strong>반드시 제목(H1)의 맨 앞부분과 본문 첫 150단어(약 2~3줄) 이내에 1회 이상 등장</strong>해야 합니다. 또한, 전체 텍스트 수 대비 키워드가 차지하는 비중(키워드 밀도)은 <strong>1%에서 1.5% 수준이 가장 안정적</strong>이며, 3%를 초과하는 과도한 반복은 봇의 스팸 필터에 걸려 색인 제외 처리가 됨을 유의해야 합니다.</p>

<h3>방법 2: 시맨틱 태그 구조화(H1, H2, H3) 및 계층화</h3>
<p>구글 검색엔진 로봇은 HTML 문서의 H태그 순서대로 구조를 분석합니다. 
웹페이지의 대제목(H1)은 단 1개만 존재해야 하며, 본문의 소제목들은 H2 태그로 묶고 그 하위 항목들은 H3 태그로 계층을 논리적으로 나눠야 합니다. 이 계층을 어기고 H3 뒤에 갑자기 H2가 나오거나 스타일 시트만으로 글씨를 크게 키우는 작성 방식은 크롤러에게 최악의 점수를 받게 되므로 삼가야 합니다.</p>

<h3>방법 3: 내부 순환 링크(Internal Link)를 활용한 크롤링 효율 증가</h3>
<p>구글 봇은 링크를 타고 끊임없이 웹사이트를 탐색합니다. 블로그 내 관련성이 높은 다른 포스팅의 주소를 본문에 링크로 엮어두면 <strong>로봇이 사이트를 돌아다니는 크롤링 예산(Crawl Budget)의 효율이 극대화</strong>됩니다. 독자가 다른 글도 이어서 보게 함으로써 평균 체류 시간을 상승시켜 도메인 점수를 올리는 지름길입니다.</p>

<h3>방법 4: 외부 신뢰 출처(Outbound Link) 및 인용 활용</h3>
<p>구글은 공신력 있는 외부 출처를 참고하여 가치 있는 정보를 정돈해 둔 문서를 매우 우수하게 평가합니다. 공공기관 법령 사이트나 글로벌 공식 레퍼런스 사이트로 연결되는 <strong>외부 링크(rel="noopener noreferrer" 속성 지정 필수)를 1개 이상 배치</strong>하면 구글 봇에게 사실 기반(E-E-A-T)의 정보성 포스팅이라는 신뢰를 제공할 수 있습니다.</p>

<hr />

<p>소중한 지식의 검색 상위 노출을 꾀하기 위해, 구글 공식 지침도 참고해 보시길 권장합니다:</p>
<ul>
  <li>📊 <strong><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko" target="_blank" rel="noopener noreferrer">구글 개발자 센터 - 구글 검색엔진 최적화(SEO) 기본 가이드</a></strong> — 검색 로봇의 크롤링 및 인덱싱 원리, 제목 태그 구성 가이드라인을 제공하는 구글 공식 매뉴얼입니다.</li>
</ul>

<blockquote>
<p>💡 <strong>구글 상위 노출 SEO 글쓰기</strong>의 궁극적인 정답은 검색 로봇이 내 글의 맥락과 가치를 아무런 에러 없이 100% 명확하게 파악할 수 있도록 '정돈된 구조화'를 제공하는 데 있습니다.</p>
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

    post_body = {
        "kind": "blogger#post",
        "blog": {"id": blog_id},
        "title": title,
        "content": content_html,
        "status": "DRAFT", # 임시 저장글로 자동 업로드
        "labels": ["SEO", "블로그운영", "구글노출"]
    }
    
    print("Uploading draft post to Google Blogger...")
    r_post = service.posts().insert(blogId=blog_id, body=post_body).execute()
    
    post_id = r_post.get("id")
    post_url = r_post.get("url")
    print(f"\n[SUCCESS] Blogger post created successfully as DRAFT!")
    print(f"Post ID: {post_id}")
    print(f"Blogger Post URL: {post_url}")

if __name__ == "__main__":
    main()
