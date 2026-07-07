# -*- coding: utf-8 -*-
"""
소상공인 경영안정 바우처 포스팅 플랫폼별 일괄 처리 및 자동화 스크립트
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
    wp_cover_local = f"{brain_dir}/voucher_wp_cover_1783250079667.jpg"
    wp_sub_local = f"{brain_dir}/voucher_wp_sub_1783250096076.jpg"
    blogger_cover_local = f"{brain_dir}/voucher_blogger_cover_1783250111716.jpg"

    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/voucher_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/voucher_wp_sub.jpg"
    blogger_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/voucher_blogger_cover.jpg"
    
    import mimetypes
    
    # 1. 워드프레스 대표 이미지 업로드
    wp_cover_id = 0
    if os.path.exists(wp_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="voucher_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_cover_local, "rb"))
        if r.status_code == 201:
            wp_cover_url = r.json()["source_url"]
            wp_cover_id = r.json()["id"]
            requests.post(f"{url}/{wp_cover_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "소상공인 경영안정 바우처 대표 이미지",
                "caption": "정부 지원 소상공인 경영안정 바우처 신청 요건 및 혜택 요약",
                "description": "중소벤처기업부와 소상공인시장진흥공단이 주관하는 지원 사업 안내"
            })

    # 2. 워드프레스 본문 이미지 업로드
    if os.path.exists(wp_sub_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_sub_local)
        headers = {"Content-Disposition": f'attachment; filename="voucher_sub.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_sub_local, "rb"))
        if r.status_code == 201:
            wp_sub_url = r.json()["source_url"]
            sub_id = r.json()["id"]
            requests.post(f"{url}/{sub_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "사무실 데스크 위에 놓인 재정 문서와 계산기 이미지"
            })

    # 3. 블로거용 이미지 업로드
    if os.path.exists(blogger_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(blogger_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="voucher_blogger_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(blogger_cover_local, "rb"))
        if r.status_code == 201:
            blogger_cover_url = r.json()["source_url"]

    # ==========================================
    # PART A. 워드프레스 포스팅 (Rank Math 90점 이상)
    # 제목: 핵심 키워드 맨 앞 배치 + 20자 내외 숫자 포함
    # ==========================================
    wp_title = "경영안정 바우처 신청 방법 3가지 및 자격 혜택 요약"
    
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

    target_tags = ["경영안정바우처", "소상공인지원금", "정부지원", "창업정보"]
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
    # 키워드 '경영안정 바우처'는 과다 도배 방지를 위해 4회만 노출
    wp_content = f"""
<p>내 가게를 운영하는 수많은 자영업자분들에게 예기치 못한 매출 하락이나 원자재 가격 상승은 일상의 큰 한숨이자 극복하기 버거운 높은 장벽이 되곤 합니다. 중소벤처기업부가 주관하는 <strong>경영안정 바우처</strong> 제도는 이러한 자금난을 해소해 주는 든든한 소방수 역할을 자처하고 있습니다.</p>

<p>본 가이드 포스팅에서는 소상공인의 실질적인 위기 극복을 지원하는 2026년 <strong>경영안정 바우처</strong> 신규 지원 대상 조건과 한도 금액 및 청구 요령 꿀팁을 상세하게 정리해 드립니다. 🌸</p>

<hr />

<h3>📢 1. 경영안정 바우처 신청 자격 및 대상자 범위</h3>
<p>가장 먼저 파악해야 할 핵심 요건은 내가 이 정식 지원 사업의 수혜 대상 요건에 충족하는지 검토하는 것입니다. 지원 대상은 기본적으로 소상공인기본법상 소상공인 요건을 갖춘 상시 근로자 5인 미만(제조업, 광업, 건설업, 운수업은 10인 미만)의 개인 또는 법인 사업자입니다.</p>

<p>또한, 매출액 하락이 객관적인 서류(부가가치세과세표준증명 등)로 입증되는 경영 위기 기업이나 관할 지자체로부터 재해 피해 확인증을 발급받은 피해 소상공인이 최우선적으로 1순위 자격을 획득하게 됩니다. 유흥이나 도박 등 사행성 업종 및 일부 전문직 업종은 대상에서 철저하게 제외되므로 사전에 업종 코드를 대조해 보셔야 합니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="사무실 데스크 위에 놓인 재정 문서와 계산기 이미지" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">[참고 이미지] 정밀한 재정 데이터 분석을 통해 소상공인 자금 흐름을 설계하는 워크스페이스</p>
</div>

<hr />

<h3>💰 2. 지원 한도 금액 및 사용처(가이드라인)</h3>
<p>성공적으로 대상에 선정되시면 세대 및 업체당 최대 400만 원 한도의 혜택을 지원받게 되며, 이 중 90%는 정부가 국비로 직접 대납하고 자영업자 본인은 오직 10%의 본인부담금만 입금하시면 사업 자금을 정상 집행하실 수 있어 부담이 극히 적습니다.</p>

<p>발급된 자금은 가게의 재기 및 매출 회복을 위한 마케팅 광고 대행비, 매장 내 노후화된 키오스크나 포스(POS) 시스템 등 디지털 기기 도입비, 전문 경영 컨설팅 자문비, 법률/세무 행정 대행 수수료 등으로 매우 광범위하게 사용이 가능합니다. 다만 임대료 납부나 단순 인건비성 지출 등 목적에 부합하지 않는 용도로 부정 사용하실 경우, 전액 환수 조치와 더불어 가산금이 부과되므로 사전에 규정을 확실히 익히셔야 합니다.</p>

<hr />

<h3>🛠️ 3. 실패 없는 바우처 신청 3단계 프로세스</h3>
<ol>
  <li><strong>온라인 회원가입</strong>: 소상공인마당 및 중소기업 통합 관리시스템 포털에 회원가입을 완료합니다.</li>
  <li><strong>증빙 서류 일체 첨부</strong>: 매출 감소를 입증할 수 있는 국세청 소득 증명서와 사업자등록증명 서류를 디지털 업로드합니다.</li>
  <li><strong>선정 통보 및 본인부담금 납부</strong>: 공단 심사를 거쳐 승인 문자를 받으시면 지정 전용 계좌로 자부담금 10%를 송금하여 바우처 포인트를 정상 활성화시킵니다. 🚀</li>
</ol>

<hr />

<h3>🏛️ 공식 공인 신뢰 외부 사이트 가이드</h3>
<ul>
  <li>👉 <strong><a href="https://www.semas.or.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">소상공인시장진흥공단 공식 지원 포털 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(경영안정 자금 공고문을 실시간으로 확인하고, 각종 정부 융자 및 바우처 신청서를 원격으로 안전하게 접수할 수 있는 정부 공인 공식 포털입니다.)</span></li>
</ul>

<h3>🚶‍♂️ 내 가게 운영 자금과 대출 상환을 돕는 유용한 팁 (내부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.murimbook.com/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-100-%eb%ac%b4%eb%a3%8c/" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">내 가게 대출 이자 상환 부담을 줄여주는 무료 대출 이자 계산기 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(경영안정 기금 융자 실행 전, 매달 납부해야 할 이자와 원금을 원리금 균등분할 방식으로 정확하게 미리 모의 연산해 주는 무림북 전용 무료 금융 서비스입니다.)</span></li>
</ul>

<h3>🍵 경영 악화 스트레스로 목이 타는 사장님을 위한 건강 제안</h3>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224336757499" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">환절기 메마르고 건조한 사장님 마른기침을 보듬어줄 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(밤낮으로 가게 일에 치여 건조해진 목을 위해 미세플라스틱 우려 없는 친환경 티백으로 매일 편안하게 물처럼 마실 수 있는 웰빙 전통차 가이드입니다.)</span></li>
</ul>
"""

    meta_fields = {
        "_rank_math_focus_keyword": "경영안정 바우처",
        "_rank_math_description": "경영안정 바우처 신청 방법과 지원 자격 조건 3가지 및 최대 400만 원 정부 혜택 한도를 Rank Math SEO 기준 600단어 이상 조건에 맞추어 완벽하게 가이드합니다.",
        "_rank_math_title": "경영안정 바우처 신청 방법 3가지 및 자격 혜택 요약"
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
        print(f"[WP SUCCESS] Voucher post created: ID {wp_post_id}")
        
    # ==========================================
    # PART B. 구글 블로거 1시간 예약 자동 발행 (다른 시각/다른 관점)
    # ==========================================
    blogger_service = get_blogger_service()
    blogs_res = blogger_service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    
    blogger_title = "어려운 골목 상권 자영업자 사장님들을 위한 비상 탈출 복지 혜택 정리"
    
    blogger_content = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_cover_url}" alt="가게를 운영하는 소상공인 일러스트" style="width:100%; max-width:650px; height:auto; border-radius:12px;" />
  <p style="font-size:13px; color:#666; margin-top:8px;">[이미지 설명] 정부 경영 보조금을 통해 힘차게 매장을 재오픈하고 웃음 짓는 골목 상점 대표님</p>
</div>

<p>안녕하세요! 오늘 하루도 온 힘을 다해 일터를 지켜내고 계시는 이 땅의 모든 소중한 사장님들의 든든한 파트너 웰빙 비서입니다. 🌱</p>

<p>요즘 물가도 오르고 손님들 지갑도 굳게 닫혀서 매장 월세 낼 날만 다가오면 가슴이 철렁 내려앉으시죠. 😭<br>
열심히 노력해도 혼자서는 극복하기 힘든 혹독한 시기입니다.</p>

<p>이럴 때 자영업자의 든든한 마중물이 되어줄 <strong>'경영안정 국비 바우처'</strong> 정책 자금 혜택을 꼼꼼하게 알려드릴게요! ✨</p>

<hr />

<h3 style="color:#e67e22;">🎁 사장님 본인부담금 단 10%의 매력</h3>
<p>이 제도는 정부가 무려 **90%의 사업비**를 대납해 주기 때문에, 단 10%의 자부담금만 내시면 간판 교체나 매장 키오스크 설치, 세무 행정 수수료 대행 등 경영 효율화 혜택을 최대 400만 원까지 알차게 챙기실 수 있어 사장님들의 한숨을 즉시 덜어줍니다.</p>

<h3 style="color:#27ae60;">🚶‍♂️ 자격 대상 요건 핵심 정리</h3>
<p>가게를 운영 중이신 상시 임직원 5인 미만의 영세 소상공인이라면 누구나 문을 두드려 신청하실 수 있으며, 매출 하락세를 입증할 수 있는 국세청 자료만 첨부하시면 손쉽게 심사를 통과하실 수 있습니다.</p>

<hr />

<h4 style="color:#2980b9;">🏛️ 공식 국가 소상공인 포털</h4>
<ul>
  <li>👉 <strong><a href="https://www.semas.or.kr" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">소상공인시장진흥공단 공식 포털 바로가기</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(국가 지원 사업 공고를 자세히 확인하고, 인터넷 청약 신청서를 다이렉트로 안전하게 접수할 수 있는 공식 사이트입니다.)</span></li>
</ul>

<h4 style="color:#27ae60;">🍵 환절기 매장 운영에 목마른 사장님을 위한 힐링 제안</h4>
<ul>
  <li>👉 <strong><a href="https://blog.naver.com/murimbook/224336757499" target="_blank" rel="noopener noreferrer" style="color:#27ae60; font-weight:bold; text-decoration:underline;">기침과 목 통증을 보듬어줄 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(매장에서 말을 많이 하시거나 스트레스로 목이 붓고 칼칼할 때, 미세플라스틱 걱정 없이 매일 물 대신 건강하게 마시는 수분 코팅 웰빙 차 가이드입니다.)</span></li>
</ul>
"""

    blogger_payload = {
        "title": blogger_title,
        "content": blogger_content,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["경영안정바우처", "소상공인지원금", "정책자금"]
    }
    
    r_blogger = blogger_service.posts().insert(blogId=blog_id, body=blogger_payload, isDraft=False).execute()
    print(f"[Blogger SUCCESS] Scheduled post ID: {r_blogger.get('id')}")

if __name__ == "__main__":
    main()
