# -*- coding: utf-8 -*-
"""
처음의 화려하고 풍성한 이모티콘 감성 가독성 레이아웃을 100% 되살린 국민내일배움카드 예약 포스팅 갱신 스크립트
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
    service = get_blogger_service()
    
    blogs_res = service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    # 아까 등록했던 글을 찾아서 업데이트하기 위해 리스트 조회
    posts_res = service.posts().list(blogId=blog_id, status='SCHEDULED', maxResults=10).execute()
    
    target_post = None
    if 'items' in posts_res:
        for post in posts_res['items']:
            if '내일배움카드' in post['title']:
                target_post = post
                break
                
    if not target_post:
        print("[WARN] Scheduled post not found, inserting a new one.")

    blogger_img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/tomorrow_card_blogger_cover.jpg"
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")

    # 🌸 [처음의 예쁘고 풍성하며 이모티콘 가득한 감성 서식으로 완전히 재창조된 HTML 원고]
    content_html = f"""
<div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.9; color: #2c3e50; font-size: 16px; padding: 10px;">

<div style="text-align: center; margin-bottom: 28px;">
  <img src="{blogger_img_url}" alt="국민내일배움카드 혜택 요점 정리" style="width: 100%; max-width: 650px; height: auto; border-radius: 15px; box-shadow: 0 6px 18px rgba(0,0,0,0.12);" />
  <p style="font-size: 13px; color: #7f8c8d; margin-top: 10px; font-style: italic;">💡 배움의 가치를 실현하는 2026년 국민내일배움카드 종합 가이드북</p>
</div>

<p>안녕하세요! 오늘도 더 멋진 내일의 커리어를 꿈꾸며 치열하게 달려가고 계신 이웃님들~ 🌸</p>

<p>새해가 되면 많은 분들이 직장 업무 역량 향상이나 은퇴 설계, 혹은 완전히 새로운 분야로의 전업을 계획하시곤 하죠.<br>
하지만 배움의 열정만큼이나 만만치 않은 교육비 고지서를 받아들면 한숨부터 푹 나오는 게 현실이잖아요. 😢</p>

<p>그래서 오늘은 국가가 우리의 든든한 날개가 되어 최대 500만 원까지 배움의 여정을 아낌없이 현금처럼 지원해 주는 <strong>'2026년 최신 개정 국민내일배움카드'</strong>에 대해 이야기해보려고 해요. 신청 꿀팁과 한도 보강 조건까지 예쁘게 정리해 드릴 테니 꼭 집중해서 챙겨가세요! 🌱</p>

<hr style="border: 0; height: 1px; background: #eee; margin: 25px 0;" />

<h3 style="color: #27ae60; font-size: 20px; border-left: 5px solid #2cc36b; padding-left: 12px; margin-bottom: 15px;">
  ✨ 국비지원 혜택, 2026년엔 도대체 얼마나 늘어났을까요?
</h3>

<p>가장 먼저 와닿는 건 역시 지원금 한도겠죠? 기본적으로 <strong>개인당 300만 원의 훈련비</strong>가 든든하게 장전되어 지급됩니다! 💳</p>

<p>여기에 멈추지 않고, 개인의 소득 수준이나 고용 환경 조건(예: 비정규직, 저소득층 등)에 따라 <strong>최대 200만 원의 보조 한도가 추가로 얹어져 총 500만 원</strong>의 배움 혜택을 싹 다 챙기실 수 있답니다.</p>

<ul>
  <li>🌱 <strong>훈련비 자부담 면제 꿀팁</strong>: 신기술 핵심 분야(빅데이터, AI 개발, 메타버스 등)에 개설된 <strong>K-디지털 트레이닝 과정</strong>은 내가 내는 돈이 10%도 아닌 무려 <strong>0원(100% 국비 무료)</strong>으로 진행되는 과정이 무진장 많으니 놓치면 진짜 나만 손해겠죠? 😱</li>
  <li>🎁 <strong>소소한 보너스 훈련수당</strong>: 월 140시간 이상의 장기 교육 과정을 차근차근 이수하실 경우, 한 달 최대 11만 6천 원의 훈련 장려금이 내 계좌로 쏙쏙 꽂혀 생활비 보탬까지 쏠쏠하게 받아 가실 수 있어요!</li>
</ul>

<hr style="border: 0; height: 1px; background: #eee; margin: 25px 0;" />

<h3 style="color: #2980b9; font-size: 20px; border-left: 5px solid #3498db; padding-left: 12px; margin-bottom: 15px;">
  💻 단 5분 만에 방구석에서 뚝딱 신청하는 스마트 로직!
</h3>

<p>예전처럼 귀찮게 동사무소나 고용센터를 직접 방문하며 줄 서서 대기할 필요가 전혀 없답니다! 🏠<br>
우리의 스마트폰이나 PC 하나만 있으면 고용노동부 공식 플랫폼인 <strong>HRD-Net</strong>을 거쳐 침대 위에서도 누워서 손가락 터치 몇 번으로 손쉽게 신청서를 접수할 수 있어요.</p>

<p style="background-color: #f7f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #bdc3c7; font-size: 15px;">
  💡 <strong>여기서 잠깐! 신속 발급을 보장하는 반려 우회 꿀팁:</strong><br>
  신청서를 작성하실 때 향후 수강하고 싶은 국비 과정 하나를 미리 콕 찝어 기재해 주세요.<br>
  단순한 취미나 흥미 위주의 기록보다, 구체적으로 직무 능력을 길러 이직이나 취업에 활용하겠다는 확고한 배움의 목적을 보여줄 때 반려 없이 승인 프로세스가 눈부시게 빨라진답니다! 🚀
</p>

<hr style="border: 0; height: 1px; background: #eee; margin: 25px 0;" />

<h4 style="color: #e67e22; font-size: 17px; margin-bottom: 10px;">🏛️ 꼭 체크하고 방문해야 할 공인 정부 포털 사이트</h4>
<p style="margin-left: 10px;">
  👉 <strong><a href="https://www.hrd.go.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">고용노동부 직업훈련 포털 HRD-Net 공식 홈페이지 바로가기</a></strong><br>
  <span style="font-size: 13.5px; color: #7f8c8d;">(내일배움카드의 온라인 신청 발급부터 내 거주지 주변의 개설 과목 수강 후기를 투명하게 조회해 볼 수 있는 고용노동부 국가지원 직업훈련 종합 허브입니다.)</span>
</p>

<h4 style="color: #27ae60; font-size: 17px; margin-top: 20px; margin-bottom: 10px;">🍵 건강한 배움 생활을 돕는 이웃 추천 힐링글</h4>
<p style="margin-left: 10px;">
  👉 <strong><a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">늦은 밤 공부하느라 메마르고 기침 나는 목에 촉촉함을 안겨주는 1+1 배도라지맥문동차 루틴</a></strong><br>
  <span style="font-size: 13.5px; color: #7f8c8d;">(밤새 인터넷 강의를 시청하며 국비 공부를 열심히 하다 보면 목이 따끔따끔 갈라지기 쉬운데요, 화학 성분 없는 친환경 삼각 티백으로 안심하고 내 목의 온기를 보듬어줄 수 있는 촉촉한 수분 힐링차 소개입니다.)</span>
</p>

<hr style="border: 0; height: 1px; background: #eee; margin: 25px 0;" />

<p>미루기만 했던 내 삶의 멋진 터닝포인트, 국가가 쥐어주는 든든한 500만 원 배움 지원금 혜택을 마중물 삼아 오늘 당장 시작해 보시는 것은 어떨까요? 😊</p>

<p>언제나 이웃님들의 열정 가득한 앞날을 뜨겁게 응원하며, 오늘 정보가 마음 한구석에 조그만 도움이 되셨다면 따뜻한 공감의 하트와 덧글로 서로의 도전을 격려해 주세요! 💚</p>

</div>
"""

    post_body = {
        "title": "2026년 국민내일배움카드 신청방법 꿀팁 총정리!",
        "content": content_html,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["국민내일배움카드", "정부지원", "자기계발"]
    }
    
    if target_post:
        print("Updating scheduled post to rich emotional design...")
        r_res = service.posts().update(blogId=blog_id, postId=target_post['id'], body=post_body).execute()
    else:
        print("Inserting brand new rich emotional post...")
        r_res = service.posts().insert(blogId=blog_id, body=post_body, isDraft=False).execute()
        
    print(f"[SUCCESS] Rich emotional post updated on Google Blogger!")

if __name__ == "__main__":
    main()
