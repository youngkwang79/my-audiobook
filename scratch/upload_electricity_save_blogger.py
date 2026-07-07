# -*- coding: utf-8 -*-
"""
Google Blogger API를 통해 전기세 절약 글을 임시저장(Draft)으로 등록하는 스크립트 (데스크톱 앱 플로우)
"""

import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# 구글 API 스코프 설정 (Blogger API 쓰기 권한)
SCOPES = ['https://www.googleapis.com/auth/blogger']

# 환경 변수 로드
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

# OAuth2 클라이언트 정보 구조 조립
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
    
    # 만약 기존에 잘못 저장된 토큰이 있다면 삭제하여 초기화 유도
    if os.path.exists(token_path):
        try:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
            # 만약 기존 토큰이 다른 클라이언트 정보용이었다면 유효성 확인 중 에러가 날 수 있으므로 체크
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

    print("Connecting to Google Blogger API...")
    try:
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
        
        title = "전기세 절약 꿀팁: 누진세 구간 방어 요령과 가계 비용 통제"
        
        content_html = """
        <p>여름과 겨울철만 되면 가정 경제를 위협하는 주범이 있습니다. 바로 급격히 늘어나는 전기 요금 고지서입니다. 특히 한국의 주택용 전기 요금은 쓰면 쓸수록 단가가 가파르게 상승하는 '누진세 단계'가 적용되기 때문에, 효율적인 전력 통제가 수반되지 않으면 순식간에 요금 폭탄을 맞이하게 됩니다. 이번 글에서는 가계 예산을 지키는 핵심적인 전기 요금 절감 가이드를 상세히 설명해 드립니다.</p>
        
        <h3>1. 대기전력(Standby Power) 누출 격파하기</h3>
        <p>대부분의 가정이 간과하는 사실 중 하나는, 전자제품의 전원을 꺼두어도 콘센트가 연결되어 있다면 미세한 전류가 지속해서 소모된다는 점입니다. 이를 '대기전력'이라 부르며, 한 가정이 소비하는 총전력의 약 10%를 차지합니다.</p>
        <ul>
          <li><strong>스마트 제어 멀티탭 도입</strong>: 개별 차단 스위치가 내장된 멀티탭을 사용하는 것이 가장 현실적인 해법입니다. 특히 취침 전이나 장시간 외출 시 메인 스위치를 한 번 눌러 전력을 일괄 차단하는 습관을 들이세요.</li>
          <li><strong>대기전력 다소비 기기 관리</strong>: TV 셋톱박스, 컴퓨터 본체, 공유기 등은 가전 중에서도 대기전력이 매우 높습니다. 셋톱박스의 경우 일반 TV 작동 소비전력의 약 80%에 달하는 대기전력을 소모하므로 사용하지 않을 때는 콘센트를 꼭 분리하는 것이 이롭습니다.</li>
        </ul>
        
        <h3>2. 주요 가전기기 가동 최적화</h3>
        <p>모든 가전제품은 작동 원리를 이해하고 조작하면 가동 전류를 효과적으로 낮출 수 있습니다.</p>
        <ul>
          <li><strong>인버터형 에어컨 효율 가동</strong>: 에어컨을 가동할 때는 처음에 강풍으로 빠르게 설정 온도까지 내려 컴프레서의 강도 높은 가동 시간을 줄인 뒤, 적정 온도로 약하게 켜두는 편이 좋습니다.</li>
          <li><strong>냉장실과 냉동실 비율 제어</strong>: 냉장고 내부의 냉기 순환을 원활하게 하기 위해 냉장실은 용량의 60%만 채우는 것이 최적입니다. 반면 냉동실은 차가운 냉기가 서로 보존될 수 있도록 꽉 채워두는 것이 컴프레서 작동 빈도를 줄여 전기를 절약해 줍니다.</li>
        </ul>
        
        <h3>3. 세금 감면 및 정부 절약 환급 제도 활용</h3>
        <p>지자체나 정부에서 주관하는 공인 환급 혜택을 찾아 챙기는 것도 쏠쏠한 재테크입니다.</p>
        <ul>
          <li><strong>탄소중립 포인트 에너지 가입</strong>: 전기, 가스, 수도 사용량을 최근 2년 평균 대비 5% 이상 절감했을 경우, 절감 비율에 따라 현금성 포인트를 돌려받을 수 있는 환경부 국가 혜택 제도입니다.</li>
          <li><strong>고효율 가전 구매 환급</strong>: 다자녀 가구, 대가족, 장애인 등 한전 복지할인 대상 가구라면 1등급 고효율 가전을 구매할 때 구매 비용의 일정 비율(10~20%)을 국가에서 환급해 주므로 반드시 신청하십시오.</li>
        </ul>
        
        <p>더 상세하고 유용한 공과금 다이어트나 자산 관리 비법은 <a href="https://www.murimbook.com" target="_blank" style="font-weight: bold; color: #535cff; text-decoration: underline;">무림북 오디오북 웹 사이트</a>에서 편리하게 알아보실 수 있으며, 부를 이룩한 리더들의 생활 루틴을 배우고 싶다면 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%82%bc%ec%84%b1-%ec%9d%b4%eb%b3%91%ec%b2%a0-%ed%9a%8c%ec%9e%a5%ec%9d%b4-%ea%bf%b0%eb%9a%ab%ec%96%b4-%eb%b3%b8-%eb%b6%80%ec%9e%90-%ec%8a%b5%ea%b4%80/" target="_blank" style="font-weight: bold; color: #535cff; text-decoration: underline;">삼성 이병철 회장 부자 습관 칼럼</a>도 함께 일독해보시기를 추천드립니다.</p>
        
        <p>에너지를 현명하게 사용하는 일은 소소한 지출을 아껴 목돈을 만드는 초석이 됩니다. 오늘 쓰지 않는 빈 콘센트를 물리적으로 분리하는 실천부터 함께 시작해 보시는 건 어떨까요?</p>
        <p style="color:#9ca3af; font-size:12px;">#전기세절약 #난방비절약 #고정지출줄이기 #에너지절약 #가계부 #생활비다이어트 #소비습관</p>
        """
        
        print("Uploading draft post to Blogger...")
        post_body = {
            'kind': 'blogger#post',
            'title': title,
            'content': content_html,
            'labels': ['전기세 절약', '에너지 절약', '생활정보']
        }
        
        post_res = service.posts().insert(blogId=blog_id, body=post_body, isDraft=True).execute()
        
        print("\n[SUCCESS] Blogger post uploaded successfully as DRAFT!")
        print(f"Post ID: {post_res['id']}")
        print(f"Edit Link: https://www.blogger.com/blog/post/edit/{blog_id}/{post_res['id']}")
        
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    main()
