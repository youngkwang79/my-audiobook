# -*- coding: utf-8 -*-
"""
Google Blogger API를 통해 한강공원 수영장 야간 개장 글을 임시저장(Draft)으로 등록하는 스크립트
"""

import os
import pickle
import requests
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/blogger']

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
        except Exception:
            creds = None
            os.remove(token_path)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
        
        if not creds:
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
            
    return build('blogger', 'v3', credentials=creds)

def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("[ERROR] Missing BLOGGER_CLIENT_ID or BLOGGER_CLIENT_SECRET in .env.local")
        return

    service = get_blogger_service()
    
    blogs_res = service.blogs().listByUser(userId='self').execute()
    blog = blogs_res['items'][0]
    blog_id = blog['id']
    
    # 썸네일 이미지 및 설명 캡션 포함 (Blogger API용 이미지 HTML 탑재)
    cover_img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hangang_pool_wp_cover_1783026889056-1.jpg"
    
    # Blogger 전용 변환 원고 (정보 전달/테크니컬 관점)
    content_html = f"""
    <div style="text-align: center; margin-bottom: 24px;">
        <img src="{cover_img_url}" alt="2026 한강공원 야간 수영장 개장 안내 썸네일" style="max-width: 100%; height: auto; border-radius: 8px;" />
        <p style="font-size: 13px; color: #666; margin-top: 6px;">[대표 이미지] 2026 한강 야간 물놀이장 운영 구역 안내 썸네일</p>
    </div>
    
    <p>여름철 본격적인 무더위와 열대야가 시작되면서 <strong>한강공원 수영장</strong>의 야간 개장 스펙 및 이용 프로세스를 분석해 보았습니다. 서울 도심지 한가운데에서 한강변 야경을 바라보며 선선하게 밤 수영을 즐길 수 있어, 주말은 물론 평일 퇴근 후 단기 리프레시 코스로 각광받는 시설입니다.</p>
    
    <h3>1. 2026 한강공원 수영장 야간 운영 스펙 분석</h3>
    <p>올해 한강 야간 개장은 시민 편의 및 도심 열대야 방지를 위해 주간 가동 시간에 이어 밤 연장 형태로 가동되며 상세 사양은 다음과 같습니다.</p>
    <ul>
      <li><strong>운영 기간</strong>: **2026년 7월 3일부터 8월 30일까지** 약 두 달간 가동됩니다.</li>
      <li><strong>야간 가동 시간</strong>: **매일 18:00 ~ 20:00**로, 기존 주간 마감 이후 2시간 동안 연장 오픈합니다.</li>
      <li><strong>대상 시설</strong>: **뚝섬공원, 여의도공원 야외수영장** 및 **잠실, 난지 물놀이장** 총 4개 구역입니다.</li>
    </ul>
    
    <p>수질 청정도 기준이나 우천 시 방류 관련 기상 변동 요인에 따라 실시간 개장 현황이 달라질 수 있습니다. 방문 전 공식 채널인 <a href="https://hangang.seoul.go.kr" target="_blank" rel="noopener" style="font-weight: bold; color: #3b82f6; text-decoration: underline;">한강사업본부 홈페이지</a>에서 운영 상황을 반드시 사전 서치하시기 바랍니다.</p>
    
    <h3>2. 안전한 밤 수영을 위한 필수 세팅 요령</h3>
    <ul>
      <li><strong>체온 손실 방지 의류 지참</strong>: 일몰 이후 한강 변은 초속 수 미터의 대류풍이 불어 물 밖으로 노출되었을 때 체온이 빠르게 저하됩니다. 감기를 예방할 수 있는 대형 비치 타월이나 걸칠 수 있는 아우터 준비가 필수적입니다.</li>
      <li><strong>법정 요금 감면 자격 서류 준비</strong>: 다둥이 행복카드, 국가보훈, 장애인 등 한강공원 체육시설 조례에 명시된 입장 혜택 대상자는 증빙 증서나 신분증을 반드시 지참해 현장 요금 다이어트를 실천하십시오.</li>
      <li><strong>사전 예약 상황 체크</strong>: 주말 밤 타임은 쾌적성이 낮아질 수 있으므로, 예매처인 <a href="https://yeyak.seoul.go.kr" target="_blank" rel="noopener" style="font-weight: bold; color: #3b82f6; text-decoration: underline;">서울시 공공서비스 예약 시스템</a>을 통해 방문 예정 일자의 잔여 티켓 상태를 모니터링하여 평일 코스로 타겟팅하는 것을 제안합니다.</li>
    </ul>
    
    <h3>3. 고정 일상 관리에 연계한 밤 시간 튜닝</h3>
    <p>저녁 퇴근 후 유휴 2시간을 효율적으로 배치하는 것은 피로 누적을 방지하고 일상을 영리하게 리드하는 핵심 시간 기술입니다. 일상 속 시간 프로세스 튜닝에 관심이 있으시다면 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ec%b5%9c%ec%a0%81%ed%99%94-%ec%82%b6%ec%9d%98-%ec%a7%88%ec%9d%84-%eb%b0%94%ea%be%b8%eb%8a%94-%ec%8b%9c%ea%b0%84-%ea%b4%80%eb%a6%ac/" target="_blank" rel="noopener" style="font-weight: bold; color: #3b82f6; text-decoration: underline;">시간관리 방법 칼럼</a>을 함께 참고해 지혜로운 저녁 활용 루틴을 설계해 보시길 바랍니다.</p>
    
    <p style="color:#9ca3af; font-size:12px;">#한강공원수영장 #야간개장 #서울물놀이 #뚝섬수영장 #여의도물놀이 #여름휴가 #열대야극복 #서울가볼만한곳</p>
    """
    
    post_body = {
        'kind': 'blogger#post',
        'title': "한강공원 수영장 야간 개장 7월 일정 및 이용 가이드",
        'content': content_html,
        'labels': ['한강공원 수영장', '야간 개장', '서울 물놀이', '여행정보']
    }
    
    print("Uploading draft post to Blogger...")
    post_res = service.posts().insert(blogId=blog_id, body=post_body, isDraft=True).execute()
    print(f"\n[SUCCESS] Blogger post uploaded successfully! ID: {post_res['id']}")
    print(f"Edit Link: https://www.blogger.com/blog/post/edit/{blog_id}/{post_res['id']}")

if __name__ == "__main__":
    main()
