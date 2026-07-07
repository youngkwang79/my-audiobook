# -*- coding: utf-8 -*-
"""
구글 블로거 및 로컬 복사용 파일 내 링크를 유저의 실제 네이버 쇼핑 커넥트 개인 단축 수익 링크(https://naver.me/FDcVf6y9)로 전면 교체하는 스크립트
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
    service = get_blogger_service()
    
    # 블로그 목록 획득
    blogs_res = service.blogs().listByUser(userId='self').execute()
    if 'items' not in blogs_res or not blogs_res['items']:
        print("[ERROR] No blogs found.")
        return
    blog_id = blogs_res['items'][0]['id']
    
    # 임시글 리스트 조회
    posts_res = service.posts().list(blogId=blog_id, status='DRAFT', maxResults=100).execute()
    if 'items' not in posts_res or not posts_res['items']:
        print("[ERROR] No draft posts found.")
        return
        
    target_post = None
    for post in posts_res['items']:
        if '배도라지' in post['title'] or '기침' in post['title']:
            target_post = post
            break
            
    if not target_post:
        target_post = posts_res['items'][0] # fallback

    main_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/pear_tea_main.jpg"
    sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/pear_tea_sub.jpg"

    # 주황색 대가성 문구 HTML 정의 (글 맨 위로 갈 예정)
    disclosure_html = """
<div style="background-color: #fff9f6; border: 1.5px solid #ff7f32; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
  <p style="font-size: 17px; font-weight: 800; color: #ff5e00; margin: 0; line-height: 1.5;">
    📢 * 이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 구매 발생 시 이에 따른 소정의 수수료를 제공받습니다.
  </p>
</div>
"""

    main_img_html = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{main_url}" alt="순수한집 배도라지맥문동차" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #888; margin-top: 6px;">[참고 이미지] 목 관리가 절실한 분들이 매일 아침 찾는 국산 원재료 순수 맥문동차</p>
</div>
"""

    sub_img_html = f"""
<div style="text-align: center; margin-top: 24px; margin-bottom: 24px;">
  <img src="{sub_url}" alt="생분해 PLA 필터 티백" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #888; margin-top: 6px;">[참고 이미지] 100도씨 뜨거운 물에도 미세플라스틱 걱정 없는 옥수수 전분 친환경 티백망</p>
</div>
"""

    # 🔴 [유저의 실제 쇼핑 커넥트 링크를 적용한 CTA 라운드 버튼 디자인]
    # target_url을 https://naver.me/FDcVf6y9 로 치환
    cta_button_html = """
<div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
  <a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer" 
     style="display: inline-block; background: linear-gradient(135deg, #d92d20 0%, #b41d12 100%); color: white; padding: 18px 45px; border-radius: 50px; font-weight: 900; font-size: 20px; text-decoration: none; box-shadow: 0 6px 20px rgba(217, 45, 32, 0.4); border: 2px solid #f04438; transition: transform 0.2s; letter-spacing: -0.5px;">
     🔥 [순수한집] 배도라지맥문동차 한정 혜택 받기 🔗
  </a>
</div>
"""

    # 최종 본문 HTML (링크 주소를 naver.me 단축주소로 전면 적용)
    content_html = f"""
<div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.8; color: #333; font-size: 16px; padding: 10px;">

{disclosure_html}

<p style="font-size: 20px; font-weight: 800; color: #d9381e; margin-bottom: 20px;">
  혹시 오늘 아침, 침 삼킬 때 목구멍이 쩍 찢어지는 고통에 인상을 찌푸리며 잠에서 깨진 않으셨나요?
</p>

<p>
  물 한 모금 넘기는 것조차 두려워 날카로운 유리조각을 삼키는 듯한 이 칼칼함.<br>
  목이 답답해 억지로 "큼큼" 기침을 해보지만, 돌아오는 건 가슴 속까지 저려오는 메마른 통증뿐입니다.
</p>

<p>
  매일 마스크를 쓰고 가습기를 하루 종일 틀어놓아도,<br>
  지긋지긋한 건조함은 끈질기게 목덜미를 갉아먹습니다.
</p>

<p style="font-weight: 700; color: #1e824c; font-size: 18px; margin-top: 25px; border-left: 4px solid #1e824c; padding-left: 10px;">
  "도대체 언제까지 이 고통을 방치하실 건가요?"
</p>

<p>
  달디단 시중의 배즙은 끈적한 당분 때문에 마신 후 입안이 텁텁해지고 혈당 걱정만 안겨줍니다.<br>
  그렇다고 약재로 달인 쓴 도라지즙은 냄새만 맡아도 헛구역질이 나 장기 복용은 꿈도 못 꾸죠.
</p>

<p>
  여기에, 목을 가장 혹사시키는 전문 낭독가와 성우들이<br>
  <strong>소리소문없이 박스째 쟁여두고 마시는 숨겨진 비밀 비방</strong>이 있습니다.
</p>

{main_img_html}

<p style="font-size: 22px; font-weight: 900; color: #111; margin-top: 30px; letter-spacing: -1px;">
  왜 수많은 목 통증 환자들이 결국 이 차로 종착할까요?
</p>

<p>
  단순히 물에 도라지를 좀 섞은 일반 차가 아닙니다.<br>
  기관지 점막에 <strong>'마르지 않는 깊은 샘물'</strong>을 파주는 핵심 영초, <span style="background-color: #ffe9a3; font-weight: bold; color: #d9381e; padding: 2px 5px;">국산 맥문동(麥門冬)</span>이 가미되었기 때문입니다.
</p>

<p>
  도라지의 사포닌이 목의 염증 찌꺼기를 깨끗하게 씻어내면,<br>
  맥문동의 차오르는 진액 성분이 메마른 성대 점막을 실크처럼 부드럽게 코팅합니다.<br>
  여기에 천연 국산 배의 은은한 단맛이 아린 맛을 부드럽게 감싸 쥐어, <strong>단 한 잔만으로 목 구멍 깊은 곳까지 촉촉한 안도감</strong>을 안겨줍니다.
</p>

<p style="font-size: 18px; font-weight: 800; color: #d9381e; margin-top: 30px;">
  ⚠️ 단, 아쉽게도 일 년 내내 무제한 공급할 수 있는 제품이 아닙니다.
</p>

<p>
  신선한 최상급 국산 배와 도라지, 그리고 엄격하게 선별한 소량의 수제 맥문동 원재료 수급 한계로 인하여<br>
  <strong>이번 시즌 한정 수량만 로스팅되어 출시된 한정판 패키지</strong>입니다.
</p>

<p>
  현재 입소문이 퍼지면서 건강 관련 커뮤니티와 맘카페에서 공동구매 대란이 일어나,<br>
  <strong>준비된 원료 재고 소진 시 다음 로스팅 일정까지 수개월 이상 장기 품절 대기를 겪으셔야 할 만큼 희소성이 극에 달한 상황입니다.</strong>
</p>

{sub_img_html}

<p style="font-size: 20px; font-weight: 800; color: #2e4053; margin-top: 25px;">
  뜨거운 물에 녹아 나오는 미세플라스틱의 공포로부터의 해방
</p>

<p>
  목에 좋은 차를 우려 마시려다 뜨거운 티백에서 방출되는 유해물질을 함께 마시고 계셨을지도 모릅니다.<br>
  순수한집은 석유화학 섬유망을 단 1%도 섞지 않고, 옥수수 전분에서 추출한 <strong>100% 생분해성 친환경 PLA 삼각 필터</strong>를 채택했습니다.
</p>

<p>
  아무리 뜨거운 끓는 물을 사정없이 부어도 환경호르몬 유출 걱정이 절대 없으며,<br>
  넓은 피라미드 공간 안에서 원물이 360도로 힘차게 회전하며 깊은 황금빛 수분을 뿜어냅니다.
</p>

<p style="font-weight: 700; color: #d9381e; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #d9381e; padding-bottom: 8px;">
  망설이는 순간에도 오늘 준비된 수량은 빠르게 소진되고 있습니다.
</p>

<p>
  내일 아침에도 또다시 목이 찢어지는 듯한 고통에 신음하며 억지로 침을 삼키는 고통스러운 하루를 반복하실 건가요?<br>
  아니면 지금 맑고 구수한 온기를 한 잔 마시며 편안하고 상쾌한 목소리로 아침을 시작하실 건가요?
</p>

<p>
  기회는 지금뿐입니다. 나를 위한, 그리고 밤새 마른 기침을 토해내는 내 소중한 가족의 호흡기를 위한 일생일대의 편안한 투자를 더 이상 미루지 마세요.
</p>

{cta_button_html}

</div>
"""

    post_body = {
        "title": "아침마다 기침하느라 깨는 분들만 보세요. 배도라지차 정착하게 된 찐 후기",
        "content": content_html,
        "published": target_post.get("published"),
        "status": "DRAFT",
        "labels": ["배도라지차", "건강리뷰", "쇼핑추천"]
    }
    
    print("Updating draft post on Google Blogger with User's URL...")
    r_update = service.posts().update(
        blogId=blog_id, 
        postId=target_post["id"], 
        body=post_body
    ).execute()
    
    # 복사용 로컬 텍스트 파일 업데이트
    asset_folder = "naver_post_assets"
    post_file = os.path.join(asset_folder, "naver_review_post.txt")
    
    clean_text = f"""[제목]
아침마다 기침하느라 깨는 분들만 보세요. 배도라지차 정착하게 된 찐 후기

---

📢 * 이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 구매 발생 시 이에 따른 소정의 수수료를 제공받습니다.
(※ 이 문구는 공정위 규정에 맞추어 본문 맨 위에 가장 크게 노출되도록 주황색 서식과 함께 복사해 가세요!)

---

혹시 오늘 아침, 침 삼킬 때 목구멍이 쩍 찢어지는 고통에 인상을 찌푸리며 잠에서 깨진 않으셨나요?

물 한 모금 넘기는 것조차 두려워 날카로운 유리조각을 삼키는 듯한 이 칼칼함.
목이 답답해 억지로 "큼큼" 기침을 해보지만, 돌아오는 건 가슴 속까지 저려오는 메마른 통증뿐입니다.

매일 마스크를 쓰고 가습기를 하루 종일 틀어놓아도,
지긋지긋한 건조함은 끈질기게 목덜미를 갉아먹습니다.

"도대체 언제까지 이 고통을 방치하실 건가요?"

달디단 시중의 배즙은 끈적한 당분 때문에 마신 후 입안이 텁텁해지고 혈당 걱정만 안겨줍니다.
그렇다고 약재로 달인 쓴 도라지즙은 냄새만 맡아도 헛구역질이 나 장기 복용은 꿈도 못 꾸죠.

여기에, 목을 가장 혹사시키는 전문 낭독가와 성우들이
소리소문없이 박스째 쟁여두고 마시는 숨겨진 비밀 비방이 있습니다.

[이 자리에 다운로드된 'key_detail_1.jpg' 또는 'product_main.jpg' 이미지를 배치해 주세요!]

왜 수많은 목 통증 환자들이 결국 이 차로 종착할까요?

단심히 물에 도라지를 좀 섞은 일반 차가 아닙니다.
기관지 점막에 '마르지 않는 깊은 샘물'을 파주는 핵심 영초, [국산 맥문동]이 가미되었기 때문입니다.

도라지의 사포닌이 목의 염증 찌꺼기를 깨끗하게 씻어내면,
맥문동의 차오르는 진액 성분이 메마른 성대 점막을 실크처럼 부드럽게 코팅합니다.
여기에 천연 국산 배의 은은한 단맛이 아린 맛을 부드럽게 감싸 쥐어, 단 한 잔만으로 목 구멍 깊은 곳까지 촉촉한 안도감을 안겨줍니다.

⚠️ 단, 아쉽게도 일 년 내내 무제한 공급할 수 있는 제품이 아닙니다.

신선한 최상급 국산 배와 도라지, 그리고 엄격하게 선별한 소량의 수제 맥문동 원재료 수급 한계로 인하여
이번 시즌 한정 수량만 로스팅되어 출시된 한정판 패키지입니다.

현재 입소문이 퍼지면서 건강 관련 커뮤니티와 맘카페에서 공동구매 대란이 일어나,
준비된 원료 재고 소진 시 다음 로스팅 일정까지 수개월 이상 장기 품절 대기를 겪으셔야 할 만큼 희소성이 극에 달한 상황입니다.

[이 자리에 다운로드된 'key_detail_2.jpg' 또는 'product_sub.jpg' 이미지를 배치해 주세요!]

뜨거운 물에 녹아 나오는 미세플라스틱의 공포로부터의 해방

목에 좋은 차를 우려 마시려다 뜨거운 티백에서 방출되는 유해물질을 함께 마시고 계셨을지도 모릅니다.
순수한집은 석유화학 섬유망을 단 1%도 섞지 않고, 옥수수 전분에서 추출한 100% 생분해성 친환경 PLA 삼각 필터를 채택했습니다.

아무리 뜨거운 끓는 물을 사정없이 부어도 환경호르몬 유출 걱정이 절대 없으며,
넓은 피라미드 공간 안에서 원물이 360도로 힘차게 회전하며 깊은 황금빛 수분을 뿜어냅니다.

망설이는 순간에도 오늘 준비된 수량은 빠르게 소진되고 있습니다.

내일 아침에도 또다시 목이 찢어지는 듯한 고통에 신음하며 억지로 침을 삼키는 고통스러운 하루를 반복하실 건가요?
아니면 지금 맑고 구수한 온기를 한 잔 마시며 편안하고 상쾌한 목소리로 아침을 시작하실 건가요?

기회는 지금뿐입니다. 나를 위한, 그리고 밤새 마른 기침을 토해내는 내 소중한 가족의 호흡기를 위한 일생일대의 편안한 투자를 더 이상 미루지 마세요.

🔥 [순수한집] 배도라지맥문동차 한정 혜택 받기 🔗
https://naver.me/FDcVf6y9
(※ 이 링크 영역은 네이버 에디터에 붙여넣고 엔터를 치면 멋진 라운드 버튼 또는 카드 링크박스로 자동 이식됩니다.)

#배도라지맥문동차 #도라지차 #기관지에좋은차 #배도라지차 #순수한집 #네이버쇼핑커넥트 #환절기목관리 #전통차추천
"""
    with open(post_file, "w", encoding="utf-8") as f:
        f.write(clean_text)
        
    print(f"\n[SUCCESS] Blogger post updated with User's target URL!")
    print(f"Blogger URL: {r_update.get('url')}")

if __name__ == "__main__":
    main()
