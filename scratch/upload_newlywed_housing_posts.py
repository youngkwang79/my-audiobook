# -*- coding: utf-8 -*-
"""
신혼부부 공공임대주택 포스팅 플랫폼별 일괄 처리 및 자동화 스크립트
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
    brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
    wp_cover_local = f"{brain_dir}/newlywed_housing_wp_cover_1783229203051.jpg"
    wp_sub_local = f"{brain_dir}/newlywed_housing_wp_sub_1783229219254.jpg"
    blogger_cover_local = f"{brain_dir}/newlywed_housing_blogger_cover_1783229235359.jpg"

    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/newlywed_housing_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/newlywed_housing_wp_sub.jpg"
    blogger_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/newlywed_housing_blogger_cover.jpg"
    
    import mimetypes
    
    # 1. 워드프레스 대표 이미지 업로드
    wp_cover_id = 0
    if os.path.exists(wp_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="newlywed_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_cover_local, "rb"))
        if r.status_code == 201:
            wp_cover_url = r.json()["source_url"]
            wp_cover_id = r.json()["id"]
            # Alt 및 설명 지정
            requests.post(f"{url}/{wp_cover_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "신혼부부 공공임대주택 혜택 총정리 대표 이미지",
                "caption": "정부 지원 신혼부부 주거 복지 자금 한도 및 소득 조건 요약",
                "description": "국토교통부와 LH가 주관하는 신혼부부 임대주택 신청 방법 가이드"
            })

    # 2. 워드프레스 본문 이미지 업로드
    if os.path.exists(wp_sub_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_sub_local)
        headers = {"Content-Disposition": f'attachment; filename="newlywed_sub.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_sub_local, "rb"))
        if r.status_code == 201:
            wp_sub_url = r.json()["source_url"]
            sub_id = r.json()["id"]
            requests.post(f"{url}/{sub_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "신혼집 아파트 열쇠와 주택 모형 정밀 이미지"
            })

    # 3. 블로거용 이미지 업로드
    if os.path.exists(blogger_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(blogger_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="newlywed_blogger_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(blogger_cover_local, "rb"))
        if r.status_code == 201:
            blogger_cover_url = r.json()["source_url"]

    # ==========================================
    # PART A. 워드프레스 포스팅 (Rank Math 90점 이상)
    # 제목: 핵심 키워드 맨 앞 배치 + 20자 내외 숫자 포함
    # ==========================================
    wp_title = "신혼부부 공공임대주택 신청 조건 3가지 최신 소득 한도"
    
    # 카테고리 3개 확보 및 ID 매핑 ("실버복지", "정부지원금", "건강정보" 등 기존 ID 활용)
    target_cats = ["금융/재테크", "정부지원금", "강제 꿀팁"]
    cat_ids = []
    for cat_name in target_cats:
        r_check = requests.get(f"{WP_URL}/wp-json/wp/v2/categories?search={cat_name}", auth=(WP_USER, WP_PASS))
        if r_check.status_code == 200 and r_check.json():
            cat_ids.append(r_check.json()[0]["id"])
        else:
            r_create = requests.post(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), json={"name": cat_name})
            if r_create.status_code == 201:
                cat_ids.append(r_create.json()["id"])

    # 태그 매핑
    target_tags = ["신혼부부임대주택", "공공임대", "정부지원금", "청년정책"]
    tag_ids = []
    for tag_name in target_tags:
        r_check = requests.get(f"{WP_URL}/wp-json/wp/v2/tags?search={tag_name}", auth=(WP_USER, WP_PASS))
        if r_check.status_code == 200 and r_check.json():
            tag_ids.append(r_check.json()[0]["id"])
        else:
            r_create = requests.post(f"{WP_URL}/wp-json/wp/v2/tags", auth=(WP_USER, WP_PASS), json={"name": tag_name})
            if r_create.status_code == 201:
                tag_ids.append(r_create.json()["id"])

    # 600단어 이상(한글 2500자) Rank Math 충족 대형 원고 조립
    # 키워드 '신혼부부 공공임대주택'은 과다 도배 방지를 위해 전체 4회만 깔끔히 노출
    wp_content = f"""
<p>내 집 마련의 꿈을 꾸기 시작한 파릇파릇한 신생 가구들에게 주거 안정을 도모해 주는 보금자리는 결혼 생활의 가장 튼튼한 뿌리이자 마중물이 되어 줍니다. <strong>신혼부부 공공임대주택</strong> 제도는 고공 행진하는 집값 속에서 실질적인 기회의 문을 열어 줍니다.</p>

<p>본 가이드 포스팅에서는 LH공사와 지방 도시공사가 주관하는 <strong>신혼부부 공공임대주택</strong> 제도의 2026년 최신 개정 소득 조건과 청약 당첨 확률을 극대화하는 실전 3단계 꿀팁을 상세히 전해 드립니다. 🌸</p>

<hr />

<h3>📢 1. 신혼부부 공공임대주택 신청 자격 및 대상 조건 팩트</h3>
<p>가장 먼저 파악해야 할 핵심 요건은 지원 자격 분류에 해당하는 신청 대상 적격 여부입니다. 법령상 '신혼부부'란 혼인 신고일 기준 <strong>7년 이내인 가구</strong> 또는 <strong>예비 신혼부부</strong>(입주 전까지 혼인 사실 증명 필요), 그리고 6세 이하의 자녀를 둔 한부모 가족이 대상에 해당합니다.</p>

<p>또한, 무주택 세대 구성원 요건을 반드시 충족해야 합니다. 부부 중 단 한 사람이라도 주택을 소유하고 있다면 즉시 청약 적격 심사에서 반려되므로 사전에 등기부등본 및 건축물 대장을 꼼꼼하게 대조하여 완벽한 무주택 상태를 확인하시는 것이 중요합니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="신혼집 아파트 열쇠와 주택 모형 정밀 이미지" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">[참고 이미지] 주거 안정과 행복한 가정을 설계하는 미래의 신혼집 보금자리</p>
</div>

<hr />

<h3>💰 2. 2026년 최신 개정 소득 수준 및 자산 보유 한도 상세</h3>
<p>공공 청약 당첨의 성패를 가르는 것은 세전 연 소득 수준과 자산 한도 범위입니다. 2026년 개정안에 따라 전년도 도시근로자 가구당 월평균 소득의 120% 이하(맞벌이 가구는 140% 이하)로 기준이 현실화되었습니다. 소득 외에도 세대가 보유한 부동산, 자동차, 금융 예금을 합산한 총 자산이 약 3억 4천5백만 원 이하(자동차 가액 3천7백만 원 이하)여야만 통과될 수 있습니다.</p>

<p>해당 자산 기준을 미세하게 초과하여 당첨 부적격 처리를 받아 평생 한 번뿐인 청약 기회를 날리시는 안타까운 사태를 방지하기 위해, 사전에 복비 계산이나 대출 이자 상환 시뮬레이션을 통해 재정 계획을 빈틈없이 수립해 두셔야 합니다. 자산 기준은 입주 공고일 당일의 공시가격 및 공단 장부 가액을 기준으로 엄격히 책정됩니다.</p>

<hr />

<h3>🛠️ 3. 실패 없는 청약 가점 확보를 위한 3단계 프로세스</h3>
<ol>
  <li><strong>청약 통장 납입 횟수 확보</strong>: 최소 24회 이상 매달 꾸준히 연체 없이 납입하여 1순위 자격을 기본적으로 취득해 둡니다.</li>
  <li><strong>가점 요인 정밀 분석</strong>: 해당 거주 지역에서의 거주 기간, 미성년 자녀 수, 혼인 기간 등을 정확히 대조하여 우선 공급 기회를 확보합니다.</li>
  <li><strong>입주 대기 신청서 작성</strong>: 마이홈 포털 및 LH 청약플러스를 통해 공고 일정을 캘린더에 상시 모니터링하여 접수합니다. 🚀</li>
</ol>

<hr />

<h3>🏛️ 공식 공인 신뢰 외부 사이트 가이드</h3>
<ul>
  <li>👉 <strong><a href="https://www.lh.or.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">LH 한국토지주택공사 공식 청약플러스 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(신혼부부 공공주택 모집 공고문을 확인하고, 인터넷 청약 신청서를 다이렉트로 안전하게 접수할 수 있는 공인 정부 포털입니다.)</span></li>
</ul>

<h3>🏠 내일의 주거 성장을 위한 유용한 부동산 팁 (내부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.murimbook.com/%eb%b6%80%eb%8f%99%ec%82%b0-%ec%a4%91%ea%b0%9c%eb%b3%b4%ec%88%98-%ea%b3%84%ec%82%b0%ea%b8%b0-%eb%88%84%ea%b5%ac%eb%82%98-%ec%82%ac%ec%9a%a9-%ea%b0%80%eb%8a%a5-100-%eb%ac%b4%eb%a3%8c/" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">누구나 100% 무료로 계산해보는 부동산 복비(중개보수) 계산기 사용법</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(신혼집 계약 시 나도 모르게 더 내게 되는 복비 덤탱이를 방지하고 법정 요율에 맞추어 정확하게 수수료를 계산해 주는 무림북 전용 무료 서비스입니다.)</span></li>
</ul>

<h3>🍵 입주 공부하느라 목마른 신혼부부 추천 힐링글</h3>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224336757499" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">환절기 메마르고 건조한 부모님 마른기침을 보듬어줄 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(가족의 건강한 숨결을 지키기 위해 미세플라스틱 우려 없는 생분해 삼각 티백으로 안심하고 매일 물처럼 마실 수 있는 웰빙 전통차 가이드입니다.)</span></li>
</ul>
"""

    meta_fields = {
        "_rank_math_focus_keyword": "신혼부부 공공임대주택",
        "_rank_math_description": "신혼부부 공공임대주택 자격 조건 3가지와 2026년 최신 소득 수준 및 자산 한도를 분석하고 청약 당첨 확률을 극대화하는 신청 꿀팁을 Rank Math SEO 기준에 맞추어 완벽 가이드합니다.",
        "_rank_math_title": "신혼부부 공공임대주택 신청 조건 3가지 최신 소득 한도"
    }

    # 워드프레스 임시글 작성 요청
    wp_payload = {
        "title": wp_title,
        "content": wp_content,
        "status": "draft",
        "featured_media": wp_cover_id,
        "categories": cat_ids,
        "tags": tag_ids,
        "meta": meta_fields
    }
    
    r_wp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", auth=(WP_USER, WP_PASS), json=wp_payload)
    if r_wp.status_code == 201:
        wp_post_id = r_wp.json()["id"]
        print(f"[WP SUCCESS] Newlywed post created: ID {wp_post_id}")
        
    # ==========================================
    # PART B. 구글 블로거 1시간 예약 자동 발행 (다른 시각/다른 관점)
    # ==========================================
    blogger_service = get_blogger_service()
    blogs_res = blogger_service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    
    blogger_title = "행복한 결혼 생활을 그리는 예비부부 필수 복지 LH 혜택 꼼꼼 정보"
    
    blogger_content = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_cover_url}" alt="행복하게 이사하는 예비부부 일러스트" style="width:100%; max-width:650px; height:auto; border-radius:12px;" />
  <p style="font-size:13px; color:#666; margin-top:8px;">[이미지 설명] 정부 주거 혜택을 통해 안락하고 화목한 신혼 보금자리를 마련한 행복한 예비부부</p>
</div>

<p>안녕하세요! 오늘 하루도 소중한 사람과의 따뜻하고 건강한 미래를 차곡차곡 조각해 나가는 힐링 라이프 매니저입니다. 🌱</p>

<p>평생을 따로 살아온 두 사람이 만나 하나의 가정을 이룬다는 것은 엄청난 축복이자 설레는 모험이죠.<br>
하지만 양가 부모님의 보탬 없이 오롯이 스스로의 힘으로 높은 전세나 매매 비용을 대기에는 숨이 턱 막히는 게 현실이잖아요. 😢</p>

<p>그래서 오늘은 주거 안정의 가장 든든한 날개가 되어줄 <strong>'LH 신혼부부 공공주택'</strong>의 핵심 꿀팁을 예쁘게 전해 드릴게요! ✨</p>

<hr />

<h3 style="color:#e67e22;">🛡️ 1순위 자격 요건과 예비 신혼부부 입주 조항</h3>
<p>LH 청약에서 가장 유익한 조항은 꼭 혼인 신고를 마친 상태가 아니어도 신청이 가능하다는 점입니다. 입주 전까지만 혼인 사실을 입증할 수 있는 <strong>예비 부부</strong> 역시 당당히 1순위 요건으로 신청서를 제출할 수 있습니다. 혼인 기간 7년 이내인 경우에도 마찬가지로 혜택을 든든하게 받으실 수 있으니 걱정할 필요가 없답니다.</p>

<h3 style="color:#27ae60;">💰 보증금 최대 90% 지원의 뛰어난 가성비</h3>
<p>공공임대 유형은 시중 아파트 시세의 30%에서 50% 수준의 아주 저렴한 임대료 조건으로 최대 20년까지 마음 편히 살 수 있어 주거 불안정을 한 방에 해소해 줍니다. 🎁</p>

<hr />

<h4 style="color:#2980b9;">🏛️ 공식 국가 청약 포털</h4>
<ul>
  <li>👉 <strong><a href="https://www.lh.or.kr" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">LH 한국토지주택공사 공식 청약플러스 사이트</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(신혼부부 모집 공고문을 확인하고, 인터넷 청약 신청서를 간편하게 접수할 수 있는 공식 기관 포털입니다.)</span></li>
</ul>

<h4 style="color:#27ae60;">🍵 환절기 예비부부의 지친 숨결을 보듬어주는 힐링글</h4>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224336757499" target="_blank" rel="noopener noreferrer" style="color:#27ae60; font-weight:bold; text-decoration:underline;">마른기침을 보듬어줄 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(신혼집 청약 공부하느라 목이 칼칼하고 기침이 날 때, 미세플라스틱 우려 없는 생분해 옥수수 필터로 안심하고 함께 마실 수 있는 웰빙 전통차 가이드입니다.)</span></li>
</ul>
"""

    blogger_payload = {
        "title": blogger_title,
        "content": blogger_content,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["신혼부부임대주택", "청년정책", "LH청약"]
    }
    
    r_blogger = blogger_service.posts().insert(blogId=blog_id, body=blogger_payload, isDraft=False).execute()
    print(f"[Blogger SUCCESS] Scheduled post ID: {r_blogger.get('id')}")

if __name__ == "__main__":
    main()
