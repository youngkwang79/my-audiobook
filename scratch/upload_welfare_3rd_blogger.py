# -*- coding: utf-8 -*-
"""
Google Blogger API를 통해 민생지원금 3차 포스팅을 임시저장(Draft)으로 등록하는 스크립트
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
    
    cover_img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/welfare_3rd_bookcover_1783035010741.jpg"
    
    content_html = f"""
    <div style="text-align: center; margin-bottom: 24px;">
        <img src="{cover_img_url}" alt="2026년 민생지원금 3차 지급 안내 썸네일" style="max-width: 100%; height: auto; border-radius: 8px;" />
        <p style="font-size: 13px; color: #666; margin-top: 6px;">[대표 이미지] 2026년 민생지원금 3차 신청 일정 및 가구원 수별 수령액 요약</p>
    </div>
    
    <p>고물가와 고금리가 지속되면서 서민 경제의 부담을 덜어주기 위한 정부의 추가 대책을 기다리시는 분들이 많습니다. 이번 2026년 <strong>민생지원금</strong> 3차 지급은 민생 안정과 내수 활성화를 위해 추진되는 핵심 정책 중 하나입니다.</p>
    
    <p>많은 분이 가장 궁금해하시는 구체적인 지급일과 지원 금액, 그리고 대상자 기준을 놓치지 않도록 보기 쉽게 정리해 드립니다. 오늘 이 글을 끝까지 확인하시면 내가 받을 수 있는 금액과 신청 경로를 완벽하게 파악하실 수 있습니다.</p>
    
    <h3>1. 2026년 민생지원금 3차 지급일 및 주요 일정</h3>
    <p>이번 민생지원금 3차 지급은 혼잡을 방지하고 신속하게 집행하기 위해 신청 시기에 따라 순차적으로 지급될 예정입니다. 대략적인 일정은 상반기 중으로 조율 중이며, 각 지자체 및 정부 부처의 예산 배정 상황에 따라 세부 날짜가 확정됩니다.</p>
    
    <h4>📅 온라인 및 오프라인 신청 기간</h4>
    <p>현재 논의 중인 가이드라인에 따르면, 온라인 신청이 먼저 시작된 이후 오프라인 접수가 진행됩니다. 초기 신청 단계에서는 서버 과부하를 막기 위해 출생연도 끝자리에 따른 요일제(5부제)가 도입될 가능성이 매우 높습니다.</p>
    
    <p>선착순 지급은 아니지만, 예산 소진 추이에 따라 조기 마감되거나 지급 시기가 늦어질 수 있으므로 본인의 신청 요일을 미리 확인하고 첫 주에 접수하는 것을 권장합니다. 상세 자격 요건은 <a href="https://www.gov.kr" target="_blank" rel="noopener" style="font-weight: bold; color: #3b82f6; text-decoration: underline;">정부24 누리집</a>에서 미리 확인 가능합니다.</p>
    
    <h3>2. 지원 대상자 선정 기준 및 제외 대상</h3>
    <p>모든 국민에게 보편적으로 지급되었던 과거의 재난지원금과 달리, 이번 3차 민생지원금은 취약계층과 중산층 서민을 집중적으로 돕는 '선별적 지원' 기조를 유지하고 있습니다.</p>
    <ul>
      <li><strong>기초생활수급자 및 차상위계층</strong>: 별도의 소득 검증 없이 우선 지급 대상으로 분류됩니다.</li>
      <li><strong>일반 가구</strong>: 기준 중위소득 일정 비율 이하의 가구를 대상으로 하며, 세대원의 자산 규모(고가 주택, 회원권 소유 여부 등)도 함께 검증될 수 있습니다.</li>
      <li><strong>지급 제외 기준</strong>: 고소득층이나 고액 자산가의 경우 이번 지원 대상에서 제외될 수 있습니다. 또한, 최근 유사한 형태의 정부 긴급 재난 예산을 중복으로 수령했거나 세금을 체납 중인 경우 지원이 제한될 수 있으니 미리 확인이 필요합니다.</li>
    </ul>
    
    <h3>3. 민생지원금 3차 금액 및 가구원수별 수령액 요약</h3>
    <p>많은 분이 가장 궁금해하실 구체적인 지원 금액은 가구원 수에 따라 차등 지급되는 방식을 채택하고 있습니다. 가구당 최소액부터 최대액까지 설정되어 있어 1인 가구와 다인 가구 모두 합리적인 보상을 받을 수 있도록 설계되었습니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 25%;">가구원 수</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 45%;">예상 지급 금액</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 30%;">비고</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">1인 가구</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">30만 원</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">단독 세대주 기준</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">2인 가구</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">50만 원</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">부부 또는 직계존비속</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">3인 가구</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">70만 원</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">-</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">4인 가구 이상</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">100만 원</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">최대 지급 한도액</td>
        </tr>
      </tbody>
    </table>
    
    <p>위 표에 명시된 금액은 정부의 기본 안을 바탕으로 작성되었으며, 거주하시는 지자체의 자체 추가 지원금 여부에 따라 실제 수령하시는 최종 금액은 조금씩 늘어날 수 있습니다.</p>
    
    <h3>4. 신청 방법 및 지급 수단 안내</h3>
    <ul>
      <li><strong>온라인 신청 경로</strong>: 정부24 및 전용 홈페이지를 통해 공인인증서나 간편인증(카카오, 네이버 등)을 통해 본인 인증을 거친 후 신청할 수 있습니다. 모바일 앱을 이용하면 스마트폰으로도 5분 내외로 간편하게 접수가 완료됩니다.</li>
      <li><strong>오프라인 신청 경로</strong>: 주민센터 방문을 통해 온라인 이용이 어려운 고령층이나 취약계층의 경우, 신분증을 지참하여 주소지 관할 행정복지센터(주민센터)에 직접 방문하시면 직원의 안내를 받아 신청서를 접수할 수 있습니다.</li>
      <li><strong>지급 수단 선택</strong>: 지원금은 소비 진작 효과를 극대화하기 위해 신용·체크카드 포인트 충전, 모바일 지역사랑상품권, 또는 선불카드 형태로 지급됩니다. 수령 후 사용 기한(대개 지급일로부터 3~6개월)이 정해져 있으므로 기간 내에 반드시 모두 소비하셔야 소멸하지 않습니다.</li>
    </ul>
    
    <h3>5. 가계 경제 밸런스를 튜닝하는 지혜로운 저녁 2시간</h3>
    <p>주변 지인들이나 부모님 세대분들을 보면 인터넷 신청 절차가 낯설어 제때 지원금을 받지 못하고 곤란해하시는 모습을 종종 보곤 합니다. 아무래도 디지털 기기에 익숙하지 않으신 분들은 소식조차 늦게 접하시는 경우가 많은데요. 이번 3차 지급 소식이 들려오면 가족들이나 이웃 어르신들께 먼저 신청 요일을 챙겨드리고 함께 도우며 따뜻한 정을 나누고 싶다는 생각이 듭니다. 작은 지원금이지만 고물가 시대에 가계 민생 안정에 든든한 보탬이 되었으면 좋겠습니다.</p>
    
    <p>자세하고 합리적인 지출 다이어트 비법이나 자산 빌드 구조가 궁금하시다면 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ec%b5%9c%ec%a0%81%ed%99%94-%ec%82%b6%ec%9d%98-%ec%a7%88%ec%9d%84-%eb%b0%94%ea%be%b8%eb%8a%94-%ec%8b%9c%ea%b0%84-%ea%b4%80%eb%a6%ac/" target="_blank" rel="noopener" style="font-weight: bold; color: #3b82f6; text-decoration: underline;">시간관리 방법 칼럼</a>을 통해서 삶의 밸런스를 튜닝하는 팁을 얻어 가실 수 있습니다.</p>
    
    <p style="color:#9ca3af; font-size:12px;">#민생지원금 #3차민생지원금 #지급일정 #지원금액 #신청방법 #정부지원금 #취약계층지원 #서민안정대책</p>
    """
    
    post_body = {
        'kind': 'blogger#post',
        'title': "2026년 민생지원금 3차 지급일 및 신청 방법 총정리",
        'content': content_html,
        'labels': ['민생지원금', '3차민생지원금', '정부지원금', '생활정보']
    }
    
    print("Uploading draft post to Blogger...")
    post_res = service.posts().insert(blogId=blog_id, body=post_body, isDraft=True).execute()
    print(f"\n[SUCCESS] Blogger post uploaded successfully! ID: {post_res['id']}")
    print(f"Edit Link: https://www.blogger.com/blog/post/edit/{blog_id}/{post_res['id']}")

if __name__ == "__main__":
    main()
