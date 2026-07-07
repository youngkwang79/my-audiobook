# -*- coding: utf-8 -*-
"""
노인 보청기 지원 포스팅을 플랫폼별(워드프레스, 블로거, 티스토리) 관점에 맞추어 가공하여 자동 발행 및 생성하는 종합 스크립트
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
        except:
            creds = None
    return build('blogger', 'v3', credentials=creds)

def main():
    # 이미지 절대 경로 설정
    brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
    wp_cover_local = f"{brain_dir}/hearing_aid_wp_cover_1783216543758.jpg"
    wp_sub_local = f"{brain_dir}/hearing_aid_wp_sub_1783216558516.jpg"
    blogger_cover_local = f"{brain_dir}/hearing_aid_blogger_cover_1783216572350.jpg"

    # 워드프레스 미디어 업로드 및 URL 획득
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hearing_aid_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hearing_aid_wp_sub.jpg"
    blogger_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hearing_aid_blogger_cover.jpg"
    
    import mimetypes
    
    # 1. 워드프레스 대표 이미지 업로드
    if os.path.exists(wp_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="hearing_aid_wp_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_cover_local, "rb"))
        if r.status_code == 201:
            wp_cover_url = r.json()["source_url"]
            wp_cover_id = r.json()["id"]
            print(f"[WP] Uploaded cover img: {wp_cover_url}")

    # 2. 워드프레스 본문 이미지 업로드
    if os.path.exists(wp_sub_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_sub_local)
        headers = {"Content-Disposition": f'attachment; filename="hearing_aid_wp_sub.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_sub_local, "rb"))
        if r.status_code == 201:
            wp_sub_url = r.json()["source_url"]
            print(f"[WP] Uploaded sub img: {wp_sub_url}")

    # 3. 블로거용 대표 이미지 업로드
    if os.path.exists(blogger_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(blogger_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="hearing_aid_blogger_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(blogger_cover_local, "rb"))
        if r.status_code == 201:
            blogger_cover_url = r.json()["source_url"]
            print(f"[Blogger] Uploaded cover img: {blogger_cover_url}")


    # ==========================================
    # PART A. 워드프레스 글쓰기 업로드 (Rank Math 90점 기준 충족)
    # 제목 규칙: 포커스 키워드 맨 앞 배치 + 숫자 포함 20자 내외
    # ==========================================
    wp_title = "노인 보청기 지원금 131만원 수령하는 3단계 핵심 꿀팁"
    
    # 1000자 이상의 고품격 정보성 콘텐츠 구성 (키워드 밀도 보정 적용)
    wp_content = f"""
<p>부모님께서 자꾸 텔레비전 볼륨을 크게 높이시거나, 대화할 때 엉뚱한 대답을 하신다면 노인성 난청을 의심하고 <strong>노인 보청기</strong> 정부 보조금 지원 혜택을 시급히 검토해야 합니다.</p>

<p>본 포스팅에서는 보청기 구입 비용의 큰 부담을 덜어주는 보건복지부 주관 <strong>노인 보청기</strong> 131만 원 환급 제도의 지급 대상 조건과 승인율을 획득하는 초정밀 실전 신청 꿀팁을 전수해 드립니다.</p>

<hr />

<h3>📢 노인 보청기 국가지원 대상자 적격 조건 확인</h3>
<p>가장 먼저 파악해야 할 것은 보청기 보조금을 수령하기 위한 의료적 적격 요건입니다. 단순히 나이가 많다고 하여 누구나 무조건 지원금을 주는 것은 아닙니다. 반드시 보건복지부 장애인복지법상 <strong>'청각장애 등록자'</strong> 판정을 받은 국민건강보험 가입자 또는 의료급여 수급권자여야 합니다.</p>

<p>이비인후과 전문의가 상주하는 지정 병원에서 순음청력검사 3회, 청성뇌간반응검사 1회 등 총 4회의 정밀 청각 검사를 거쳐 청각 장애 등급 판정을 최종 획득하시는 것이 1단계 필수 관문입니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="노인 보청기 착용 정밀 이미지" />
</div>

<hr />

<h3>💰 지원 금액 한도 및 자부담금 비율 상세</h3>
<p>청각 장애 등록을 마치셨다면, 5년 주기로 1회당 <strong>최대 131만 원의 보청기 급여비</strong>를 돌려받을 수 있습니다. 일반 건강보험 가입자는 전체 금액의 90%인 117만 9천 원을 국민건강보험공단으로부터 지원받고, 본인은 단 10%(최대 13만 1천 원)만 자부담하면 됩니다. 차상위 계층 및 기초생활수급권자의 경우에는 본인부담금 0원인 100% 무료 전액 지원으로 국가 보청기 서비스를 받을 수 있어 큰 경제적 힘이 되어 줍니다.</p>

<hr />

<h3>🛠️ 실수 없이 원스톱 승인을 따내는 3단계 프로세스</h3>
<ol>
  <li><strong>이비인후과 보청기 처방전 발급</strong>: 지정 전문 병원에 방문하여 의사로부터 '보청기 처방전'을 우선적으로 발급받습니다.</li>
  <li><strong>보청기 구입 및 영수증 획득</strong>: 공단에 등록된 정식 판매 스토어에서 보청기를 구매한 후 세금계산서와 품질 보증 카드를 챙깁니다.</li>
  <li><strong>구입 후 1개월 검수확인서 제출</strong>: 보청기를 수령하고 1개월이 지난 시점에 다시 병원에 내원하여 보청기가 난청에 효과가 있다는 '검수확인서'를 발급받아 공단에 제출하면 영업일 기준 수일 내에 지원금이 본인 계좌로 최종 환급 환수됩니다.</li>
</ol>

<hr />

<h3>🔗 공식 신뢰 외부 링크 연계</h3>
<ul>
  <li>🏛️ <strong><a href="https://www.nhis.or.kr" target="_blank" rel="noopener noreferrer">국민건강보험공단 요양비/장애인보조기기 공식 포털</a></strong> — 노인 보청기 국가지원 급여 기준 법률 고시문과 내 거주지 주변의 보청기 정식 공인 등록 판매점 리스트를 투명하게 조회해 볼 수 있는 대한민국 공식 공단 사이트입니다.</li>
</ul>

<h3>🍵 부모님의 일상 건강을 위한 추천 꿀팁</h3>
<ul>
  <li>🌱 <strong><a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer">부모님 목 기침 관리를 위한 친환경 생분해 1+1 배도라지맥문동차 힐링 루틴</a></strong> — 난청 예방뿐만 아니라 환절기 기관지 수분 보강에 좋은 건강차 소개 글입니다.</li>
</ul>
"""

    wp_payload = {
        "title": wp_title,
        "content": wp_content,
        "status": "draft", # 임시글로 업로드
        "featured_media": wp_cover_id,
        "categories": [3, 4], # 가상의 복수 카테고리 설정
        "tags": ["노인보청기", "보청기지원금", "정부지원", "청각장애"]
    }
    
    r_wp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", auth=(WP_USER, WP_PASS), json=wp_payload)
    if r_wp.status_code == 201:
        print(f"[WP SUCCESS] Draft post created: ID {r_wp.json()['id']}")


    # ==========================================
    # PART B. 구글 블로거 1시간 예약 자동 발행 (다른 시각/다른 제목)
    # 정보 전달성 위주, 16:9 이미지 및 캡션 포함
    # ==========================================
    blogger_service = get_blogger_service()
    
    # 블로그 목록 획득하여 blog_id 정의
    blogs_res = blogger_service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    
    blogger_title = "부모님 귀가 안 들리실 때 꼭 신청해야 하는 정부 복지 자금 131만원 정리"
    
    blogger_content = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_cover_url}" alt="노부부의 즐거운 일상 일러스트" style="width:100%; max-width:650px; height:auto; border-radius:12px;" />
  <p style="font-size:13px; color:#666; margin-top:8px;">[이미지 설명] 난청 예방과 보청기 지원 혜택을 통해 온 가족의 웃음소리를 되찾은 행복한 노부부의 일상</p>
</div>

<p>안녕하세요! 소중한 가족의 건강과 따뜻한 실버 라이프를 디자인해 드리는 힐링 매니저입니다. 🌱</p>

<p>어느 날부터인가 부모님과 대화할 때 목소리를 큰 소리로 질러야만 겨우 소통이 되고, 텔레비전 볼륨이 온 집안을 흔들 만큼 커져서 깜짝 놀라신 경험이 있으실 텐데요. 노화로 인한 청력 감퇴는 우울증이나 치매 위험도를 크게 높이기 때문에 절대 방치해서는 안 되는 중요한 질환입니다. 😢</p>

<p>다행히 국가에서는 어르신들의 청력 보존을 돕기 위해 <strong>노인 보청기</strong> 구입 비용을 최대 131만 원까지 지원해 주는 복지 제도를 운영하고 있습니다. 오늘은 부모님의 청력을 살리고 가계 부담을 덜어주는 보청기 급여비 제도의 핵심 꿀팁을 예쁘게 전해 드릴게요! ✨</p>

<hr />

<h3 style="color:#e67e22;">🛡️ 청각장애 등록 조건과 보청기 신청 요건 팩트체크</h3>
<p>노인 보청기 국가지원금 혜택을 얻으려면 가장 먼저 <strong>청각장애 등록</strong> 과정을 거쳐야 합니다. 만 65세 이상 노인장기요양등급 소지 여부와 별개로, 이비인후과 전문의 진단을 통해 최종 장애인 복지 카드(청각장애)를 발급받으신 가구여야만 건강보험공단의 지원을 든든하게 받으실 수 있습니다. 등급 판정에는 정밀 이비인후과 청력 검사가 필수적으로 진행됩니다.</p>

<h3 style="color:#27ae60;">💰 부담금 0원부터! 취약계층 특별 지원책</h3>
<p>기본 보조금 한도액은 131만 원으로 책정되어 있습니다. 일반 건강보험 대상자는 90%인 117만 9천 원을 고스란히 환급받아 본인은 단 13만 1천 원의 비용만 부담하시면 됩니다. 특히 <strong>기초생활수급자 및 차상위 계층 어르신</strong>의 경우에는 본인부담금이 100% 면제되는 '자부담 0원' 혜택으로 고급 보청기 서비스를 완전히 지원받으실 수 있습니다. ✨</p>

<hr />

<h4 style="color:#2980b9;">🏛️ 국가 보조기기 공식 포털</h4>
<ul>
  <li>👉 <strong><a href="https://www.nhis.or.kr" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">국민건강보험공단 공식 보조기기 정보 센터 바로가기</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(보청기 환급 청구 서류 다운로드 및 우리 동네 공인 보청기 가격 고시 확인이 가능한 정부 공인 공단 포털 사이트입니다.)</span></li>
</ul>

<h4 style="color:#27ae60;">🍵 환절기 부모님 폐·기관지 건강 추천 꿀팁</h4>
<ul>
  <li>👉 <strong><a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer" style="color:#27ae60; font-weight:bold; text-decoration:underline;">부모님 환절기 마른기침을 보듬어줄 1+1 맥문동 배도라지차 정보</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(귀 건강만큼 소중한 연세 많으신 어르신들의 메마른 기관지 수분 코팅과 폐 건강을 위해 옥수수 생분해 필터로 안심하고 매일 물처럼 마실 수 있는 구수한 천연 영초 차 추천 가이드입니다.)</span></li>
</ul>
"""

    blogger_payload = {
        "title": blogger_title,
        "content": blogger_content,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["노인보청기", "정부지원금", "효도선물"]
    }
    
    r_blogger = blogger_service.posts().insert(blogId=blog_id, body=blogger_payload, isDraft=False).execute()
    print(f"[Blogger SUCCESS] Scheduled post ID: {r_blogger.get('id')}")

if __name__ == "__main__":
    main()
