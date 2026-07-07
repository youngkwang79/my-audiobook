# -*- coding: utf-8 -*-
"""
서울커리어업 구직지원금 포스팅 플랫폼별 일괄 처리 및 자동화 스크립트
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
    wp_cover_local = f"{brain_dir}/careerup_wp_cover_1783372741743.jpg"
    wp_sub_local = f"{brain_dir}/careerup_wp_sub_1783372757345.jpg"
    blogger_cover_local = f"{brain_dir}/careerup_blogger_cover_1783372774396.jpg"

    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/careerup_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/careerup_wp_sub.jpg"
    blogger_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/careerup_blogger_cover.jpg"
    
    import mimetypes
    
    # 1. 워드프레스 대표 이미지 업로드
    wp_cover_id = 0
    if os.path.exists(wp_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="careerup_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_cover_local, "rb"))
        if r.status_code == 201:
            wp_cover_url = r.json()["source_url"]
            wp_cover_id = r.json()["id"]
            requests.post(f"{url}/{wp_cover_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "서울커리어업 구직지원금 대표 이미지",
                "caption": "서울시 청년들의 구직을 돕는 서울커리어업 구직지원금 안내",
                "description": "서울시가 주관하는 구직 청년 실무 훈련 및 지원금 제도 요약"
            })

    # 2. 워드프레스 본문 이미지 업로드
    if os.path.exists(wp_sub_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_sub_local)
        headers = {"Content-Disposition": f'attachment; filename="careerup_sub.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_sub_local, "rb"))
        if r.status_code == 201:
            wp_sub_url = r.json()["source_url"]
            sub_id = r.json()["id"]
            requests.post(f"{url}/{sub_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "사무실 책상에 놓인 노트북과 커피"
            })

    # 3. 블로거용 이미지 업로드
    if os.path.exists(blogger_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(blogger_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="careerup_blogger_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(blogger_cover_local, "rb"))
        if r.status_code == 201:
            blogger_cover_url = r.json()["source_url"]

    # ==========================================
    # PART A. 워드프레스 포스팅 (Rank Math 90점 이상)
    # 제목: 핵심 키워드 맨 앞 배치 + 20자 내외 숫자 포함
    # ==========================================
    wp_title = "서울커리어업 구직지원금 3가지 자격 요건 및 신청 정보"
    
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

    target_tags = ["서울커리어업", "구직지원금", "청년정책", "취업지원"]
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
    # 키워드 '서울커리어업 구직지원금'은 과다 도배 방지를 위해 4회만 노출
    wp_content = f"""
<p>취업 한파 속에서 고군분투하며 커리어를 쌓기 위해 치열한 하루를 보내는 청년 구직자들에게 실무 역량을 다지고 재정적 안정을 더해주는 정부의 복지 정책은 가뭄의 단비와 같습니다. 서울특별시가 주관하는 <strong>서울커리어업 구직지원금</strong> 제도는 취업 준비 과정에서의 큰 부담을 덜어주는 특급 구직 사다리입니다.</p>

<p>본 가이드 포스팅에서는 청년들의 경쟁력 강화를 도모하는 2026년 <strong>서울커리어업 구직지원금</strong> 지원 조건 및 일정 정보와 가점을 올리는 실전 꿀팁을 상세하게 정리해 드립니다. 🌸</p>

<hr />

<h3>📢 1. 서울커리어업 구직지원금 신청 자격 및 선발 기준</h3>
<p>가장 먼저 파악해야 할 핵심 요건은 내가 이 사업의 수혜 대상 요건에 해당하는지 꼼꼼히 확인하는 것입니다. 기본적으로 신청일 기준 만 19세 이상 만 34세 이하의 미취업 청년으로서, 주민등록상 서울특별시에 거주하고 있어야 자격이 주어집니다.</p>

<p>또한, 최종 학력 졸업(중퇴·수료) 후 2년이 경과하지 않은 상태여야 하며, 고용보험 가입 여부를 대조하여 주 30시간 미만의 단기 근로자인 경우에도 미취업 청년 범주에 소속되어 신청서를 접수할 수 있습니다. 가구당 소득이 중위소득 150% 이하 조건도 만족해야 하므로, 건강보험료 납부확인서를 미리 떼어 검토해 보셔야 합니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="사무실 책상에 놓인 노트북과 커피" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">[참고 이미지] 새로운 커리어 도약을 위해 매일 학습을 지속하는 청년의 홈 오피스</p>
</div>

<hr />

<h3>💰 2. 지원 한도 금액 및 사용처 요령</h3>
<p>최종 선정이 완료되시면, 구직을 돕는 인턴십 참여 및 실무 교육 이수 조건과 연동되어 <strong>매월 50만 원씩 최대 6개월간 총 300만 원의 구직 자금</strong>을 바우처 형식으로 지급받게 됩니다.</p>

<p>해당 자금은 도서 구입비, 취업 준비를 위한 자격증 접수 수수료, 면접 복장 구입비, 인턴십 출퇴근 교통비 등으로 유용하게 쓰실 수 있습니다. 또한, 인턴십 참여 기간 중 지급받는 실무 수당 등과 결합하여 한층 안정적인 구직 몰입 환경을 갖출 수 있습니다. 자산 초과나 소득 기준 오차로 부적격 처리를 받지 않기 위해, 사전에 복비나 금융 계획을 꼼꼼하게 설계해 두시길 권해 드립니다.</p>

<hr />

<h3>🛠️ 3. 실패 없는 지원금 수령 3단계 프로세스</h3>
<ol>
  <li><strong>서울청년포털 가입</strong>: 청년 몽땅 정보통 포털에 접속하여 회원가입을 마칩니다.</li>
  <li><strong>구직활동 계획서 작성</strong>: 나의 커리어업 계획을 구체적이고 성실하게 기록하여 파일 업로드합니다.</li>
  <li><strong>인턴 참여 및 보고서 제출</strong>: 배정된 공인 실무 기업에 참여하고, 월별 활동 보고서를 작성해 제출하시면 바우처가 활성화됩니다. 🚀</li>
</ol>

<hr />

<h3>🏛️ 공식 공인 신뢰 외부 사이트 가이드</h3>
<ul>
  <li>👉 <strong><a href="https://youth.seoul.go.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">서울청년포털 청년 몽땅 정보통 공식 포털 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(서울커리어업을 비롯한 청년 수당, 청년 주거 복지 혜택 공고를 한눈에 모니터링하고 즉각 안전하게 접수할 수 있는 공식 시정 정보 포털입니다.)</span></li>
</ul>

<h3>📱 취업 준비를 든든하게 받쳐줄 무선 이어폰 특가 정보 (외부 제휴 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224337660556" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">취업 준비 인강 시청 필수품인 필립스 무선이어폰 TAT1109 특가 소식 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(외부 소음을 지우고 구직 정보 인강 및 유튜브 면접 가이드를 온전히 귓속에 밀착 몰입하게 돕는 가성비 무선 이어폰 리뷰 글입니다.)</span></li>
</ul>

<h3>🚶‍♂️ 내 소득 관리와 재정을 돕는 유용한 팁 (내부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.murimbook.com/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-%eb%ac%b4%eb%a3%8c/" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">생활 안정을 돕는 무림북 무료 대출 이자 계산기 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(정부 청년 융자나 긴급 생계비 마련을 위한 대출 실행 전, 원리금 균등분할 방식으로 매월 나갈 자금을 계산해 주는 무료 서비스입니다.)</span></li>
</ul>
"""

    meta_fields = {
        "_rank_math_focus_keyword": "서울커리어업 구직지원금",
        "_rank_math_description": "서울커리어업 구직지원금 신청 자격요건 3가지와 매월 50만 원씩 최대 6개월 동안 총 300만 원을 수령하는 실전 가이드를 Rank Math SEO 기준에 맞추어 정리합니다.",
        "_rank_math_title": "서울커리어업 구직지원금 3가지 자격 요건 및 신청 정보"
    }

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
        print(f"[WP SUCCESS] CareerUp post created: ID {wp_post_id}")
        
    # ==========================================
    # PART B. 구글 블로거 1시간 예약 자동 발행 (다른 시각/다른 관점)
    # ==========================================
    blogger_service = get_blogger_service()
    blogs_res = blogger_service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    
    blogger_title = "취업 한파 속에 웅크린 청년들이 꼭 챙겨야 할 서울시 핵심 용돈 정보"
    
    blogger_content = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_cover_url}" alt="출근하는 청년 일러스트" style="width:100%; max-width:650px; height:auto; border-radius:12px;" />
  <p style="font-size:13px; color:#666; margin-top:8px;">[이미지 설명] 서울시 구직 훈련을 거쳐 멋지게 출근길을 걷는 청년 구직자</p>
</div>

<p>안녕하세요! 오늘 하루도 소중한 나의 꿈을 향해 묵묵히 나아가고 있는 멋진 청년들을 위한 든든한 가이드 웰빙 매니저입니다. 🌱</p>

<p>졸업은 했는데 아직 마땅한 일자리를 찾지 못해 부모님 눈치 보이고, 도서관 책값이나 학원비 내기가 갈수록 버거워지는 시기를 지나고 계시나요. 😭</p>

<p>그래서 오늘은 나의 커리어 가치를 2배 이상 쑥쑥 키우며 통장 잔고 걱정 없이 구직에만 몰입할 수 있도록 돕는 <strong>'서울시 청년 구직 훈련금'</strong>의 유용한 정보를 전해 드릴게요! ✨</p>

<hr />

<h3 style="color:#e67e22;">🎁 매월 50만 원씩 최대 6개월 든든한 혜택</h3>
<p>이 지원 사업은 실무 교육과 인턴십 참여를 조건으로 청년들에게 **월 50만 원씩 최대 300만 원**까지 아낌없이 재정 지원을 해줍니다. 덕분에 부담스러운 책값과 인터넷 강의 비용 걱정을 크게 덜 수 있습니다.</p>

<h3 style="color:#27ae60;">🚶‍♂️ 자격 요건과 소득 기준 핵심</h3>
<p>주민등록상 서울특별시에 살고 있는 만 19세에서 34세 이하의 청년 중, 최종 학력을 이수한 지 2년이 넘지 않고 중위소득 150% 이하의 세대 요건을 갖추면 신청 문턱을 넘을 수 있습니다.</p>

<hr />

<h4 style="color:#2980b9;">🏛️ 공식 서울청년 정보통</h4>
<ul>
  <li>👉 <strong><a href="https://youth.seoul.go.kr" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">서울청년포털 청년 몽땅 정보통 바로가기</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(서울커리어업을 비롯한 청년 복지 공고를 한눈에 파악하고 접수할 수 있는 시정 공식 포털입니다.)</span></li>
</ul>

<h4 style="color:#27ae60;">🎧 취업 준비 학습에 몰입을 돕는 가성비 무선 이어폰 특가</h4>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224337660556" target="_blank" rel="noopener noreferrer" style="color:#27ae60; font-weight:bold; text-decoration:underline;">인터넷 강의 장시간 청취에 귀가 편안한 필립스 TAT1109 특가 리뷰 소식</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(외부 소음을 줄이고 취업 꿀팁 및 강의를 밀도 있게 들을 수 있는 편안한 착용감의 무선 이어폰 정보입니다.)</span></li>
</ul>
"""

    blogger_payload = {
        "title": blogger_title,
        "content": blogger_content,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["서울커리어업", "구직지원금", "청년정책"]
    }
    
    r_blogger = blogger_service.posts().insert(blogId=blog_id, body=blogger_payload, isDraft=False).execute()
    print(f"[Blogger SUCCESS] Scheduled post ID: {r_blogger.get('id')}")

if __name__ == "__main__":
    main()
