# -*- coding: utf-8 -*-
"""
개인형 IRP 중도해지 포스팅 플랫폼별 일괄 처리 및 자동화 스크립트
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
    wp_cover_local = f"{brain_dir}/irp_wp_cover_1783402590912.jpg"
    wp_sub_local = f"{brain_dir}/irp_wp_sub_1783402606561.jpg"
    blogger_cover_local = f"{brain_dir}/irp_blogger_cover_1783402621920.jpg"

    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/irp_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/irp_wp_sub.jpg"
    blogger_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/irp_blogger_cover.jpg"
    
    import mimetypes
    
    # 1. 워드프레스 대표 이미지 업로드
    wp_cover_id = 0
    if os.path.exists(wp_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="irp_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_cover_local, "rb"))
        if r.status_code == 201:
            wp_cover_url = r.json()["source_url"]
            wp_cover_id = r.json()["id"]
            requests.post(f"{url}/{wp_cover_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "개인형 IRP 중도해지 세금 방어 대표 이미지",
                "caption": "연말정산 연금 세액공제 불이익 및 16.5% 해지 기타소득세 방어 요령",
                "description": "금융감독원 및 세법 기준 IRP 해지 예외 공제 조건 정리"
            })

    # 2. 워드프레스 본문 이미지 업로드
    if os.path.exists(wp_sub_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(wp_sub_local)
        headers = {"Content-Disposition": f'attachment; filename="irp_sub.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(wp_sub_local, "rb"))
        if r.status_code == 201:
            wp_sub_url = r.json()["source_url"]
            sub_id = r.json()["id"]
            requests.post(f"{url}/{sub_id}", auth=(WP_USER, WP_PASS), json={
                "alt_text": "책상 위에 놓인 돼지저금통과 세무 서류"
            })

    # 3. 블로거용 이미지 업로드
    if os.path.exists(blogger_cover_local):
        url = f"{WP_URL}/wp-json/wp/v2/media"
        mime_type, _ = mimetypes.guess_type(blogger_cover_local)
        headers = {"Content-Disposition": f'attachment; filename="irp_blogger_cover.jpg"'}
        if mime_type:
            headers["Content-Type"] = mime_type
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=open(blogger_cover_local, "rb"))
        if r.status_code == 201:
            blogger_cover_url = r.json()["source_url"]

    # ==========================================
    # PART A. 워드프레스 포스팅 (Rank Math 90점 이상)
    # 제목: 핵심 키워드 맨 앞 배치 + 20자 내외 숫자 포함
    # ==========================================
    wp_title = "개인형 IRP 중도해지 세금 폭탄 3가지 피하는 꿀팁"
    
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

    target_tags = ["개인형IRP", "중도해지", "연금저축", "세액공제"]
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
    # 키워드 '개인형 IRP 중도해지'는 과다 도배 방지를 위해 4회만 노출
    wp_content = f"""
<p>이 글에서는 연말정산 세액공제를 위해 가입했다가 급전이 필요해 깨려고 고민하시는 <strong>개인형 IRP 중도해지</strong> 시의 부득이한 세금 불이익과 자금 손실을 최소화하는 실전 우회 방법에 대해 면밀히 살펴보겠습니다. 은퇴 후 노후 자금의 소중한 울타리가 되어주는 연금저축 계좌이지만, 해지 시점에 닥쳐오는 세액 폭탄은 자영업자 및 직장인들의 큰 고민거리입니다. 🌸</p>

<hr />

<h3>📢 1. 개인형 IRP 중도해지 시 발생하는 세액 페널티 실체</h3>
<p>가장 먼저 파악해야 할 팩트는 해지할 때 윈도우가 락 걸리듯 세무 당국이 징수해 가는 기타소득세 세전 고시 세율입니다. 가입 기간 동안 직장인 연말정산을 거쳐 소득 공제를 받은 납입 원금과 계좌에서 발생한 이자 배당 운용 수익 전체에 대하여 무려 <strong>16.5%의 기타소득세</strong>가 세전 일괄 원천징수 처리됩니다.</p>

<p>특히 내가 낸 돈보다 세금 추징액이 더 커져 원금 손실을 고스란히 안아야 하는 억울한 사태를 겪게 되는 경우가 빈번합니다. 따라서 사전에 내 계좌의 실제 납입액과 공제받지 않은 금액(초과 납입금)이 있는지 홈택스를 통해 명확히 대조해 보셔야 합니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="책상 위에 놓인 돼지저금통과 세무 서류" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">[참고 이미지] 노후 자산 관리의 안정적인 은퇴 설계를 나타내는 저축 서식 이미지</p>
</div>

<hr />

<h3>💰 2. 16.5% 기타소득세를 피하는 3가지 예외 요건 (5.5% 저율과세)</h3>
<p>세법에서는 개인의 불가피한 경제적 위기 상황으로 인해 <strong>개인형 IRP 중도해지</strong>를 단행할 수밖에 없는 특별한 사유에 대해서는 페널티를 대폭 감면하여 <strong>3.3%~5.5%의 낮은 연금소득세</strong>로 특별 처우해 줍니다.</p>

<ul>
  <li><strong>개인 회생 및 파산 선고</strong>: 법원으로부터 공식 선고를 받은 경우 부득이한 사유로 인정됩니다.</li>
  <li><strong>3개월 이상의 장기 요양</strong>: 본인 또는 부양가족의 질병 부상으로 인한 치료비 지출이 있는 경우 의료비 한도 내에서 감면됩니다. 🏥</li>
  <li><strong>천재지변 및 해외 이주</strong>: 이민이나 천재지변 피해 확인서를 제출할 시 공제 혜택이 적용됩니다.</li>
</ul>

<hr />

<h3>🛠️ 3. 해지하지 않고 자금을 융통하는 2대 실전 대안</h3>
<ol>
  <li><strong>연금저축 담보 대출 활용</strong>: 계좌를 깨는 대신, 내가 적립한 금액의 최대 50%~60% 범위 내에서 저금리로 계좌 담보 자금을 실행받아 연금 혜택은 유지하고 급전을 안전하게 확보합니다.</li>
  <li><strong>부득이한 사유 신고서 제출</strong>: 일반 해지를 진행하기 전, 반드시 은행 지점에 방문하여 '부득이한 사유에 의한 연금외수령 신고서'와 함께 진단서 또는 파산 결정문을 사전에 업로드 제출해야 합니다. 🚀</li>
</ol>

<hr />

<h3>🏛️ 공식 공인 신뢰 연금 포털 가이드</h3>
<ul>
  <li>👉 <strong><a href="https://www.fss.or.kr" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">금융감독원 파인 통합연금포털 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(내 가입 금융사들의 IRP 적립금 현황을 한눈에 모니터링하고 해지 세액 사전 계산을 원스톱으로 제공하는 금융 감독 기관 포털입니다.)</span></li>
</ul>

<h3>🚶‍♂️ 긴급 자금 계획 전 상환 이자를 모의 연산해 보는 팁 (내부 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://blog.murimbook.com/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-%eb%ac%b4%eb%a3%8c/" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">내 가게 대출 이자 상환 부담을 줄여주는 무료 대출 이자 계산기 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(IRP 해지 전, 담보 융자 실행에 따른 매월 상환 원금과 이자 금액을 원리금 균등 방식으로 즉시 정밀 계산해 주는 무림북 전용 무료 서비스입니다.)</span></li>
</ul>

<h3>🍵 급전 문제로 속이 까맣게 타고 목이 마를 때 힐링 음료 (외부 브릿지 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224336757499&navType=by" target="_blank" rel="noopener noreferrer" style="color: #27ae60; font-weight: bold; text-decoration: underline;">스트레스로 답답한 목을 맑고 편안하게 씻어줄 순수한집 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(가슴이 답답하고 목이 칼칼하게 타들어 갈 때, 안심 티백망으로 은은하게 매일 물처럼 마시며 숨통을 보듬어 주는 웰빙 차 요령입니다.)</span></li>
</ul>

<h3>🎧 퇴근길 지친 귓속에 나만의 힐링을 주는 아이템 (외부 제휴 링크)</h3>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224337660556&navType=by" target="_blank" rel="noopener noreferrer" style="color: #2980b9; font-weight: bold; text-decoration: underline;">귀의 피로를 사뿐히 덜어주는 필립스 TAT1109 무선이어폰 특가 바로가기</a></strong><br>
  <span style="font-size:13.5px; color:#7f8c8d;">(주변 소음을 줄이고 조용히 클래식이나 오디오북 콘텐츠에 몰입할 수 있도록 돕는 인체공학적 무선 이어폰 특가 정보입니다.)</span></li>
</ul>
"""

    meta_fields = {
        "_rank_math_focus_keyword": "개인형 IRP 중도해지",
        "_rank_math_description": "개인형 IRP 중도해지 시 발생하는 16.5% 세금 폭탄을 피하는 법과 3가지 합법적 우회 및 담보 대출 대안을 Rank Math SEO 기준에 맞추어 완벽 가이드합니다.",
        "_rank_math_title": "개인형 IRP 중도해지 세금 폭탄 3가지 피하는 꿀팁"
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
        print(f"[WP SUCCESS] IRP post created: ID {wp_post_id}")
        
    # ==========================================
    # PART B. 구글 블로거 1시간 예약 자동 발행 (다른 시각/다른 관점)
    # ==========================================
    blogger_service = get_blogger_service()
    blogs_res = blogger_service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    target_time = datetime.now() + timedelta(hours=1)
    published_iso = target_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    
    blogger_title = "연말정산 꿀 세액공제 퇴직연금 급전 필요할 때 깨지 마세요"
    
    blogger_content = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_cover_url}" alt="연금 계좌 잔액을 보며 웃는 직장인" style="width:100%; max-width:650px; height:auto; border-radius:12px;" />
  <p style="font-size:13px; color:#666; margin-top:8px;">[이미지 설명] 똑똑한 연금 자금 설계로 큰돈을 세이브하고 안도하는 든든한 직장인 사장님</p>
</div>

<p>이 글에서는 연말정산 절세 혜택을 챙기기 위해 가입했던 소중한 은퇴 자산 퇴직연금을 급전 사정 때문에 깰지 망설이시는 자영업자 직장인분들을 위해, 16.5%의 무거운 세무 페널티 부담을 획기적으로 덜어내는 **'퇴직 연금 세제 방어 팁'**을 면밀히 살펴보겠습니다. 🌸</p>

<h3 style="color:#e67e22;">🛡️ 16.5% 기타소득세의 막대한 손실</h3>
<p>단순히 돈이 필요해 계좌를 파쇄해 버리면 내가 받은 절세 혜택보다 원천징수 떼가는 세금이 훨씬 많아져 엄청난 자산 가치 하락을 초래하므로 절대로 서두르시면 안 됩니다.</p>

<h3 style="color:#27ae60;">🚶‍♂️ 자부담 없이 이자를 아끼는 담보 융자 대안</h3>
<p>적립한 원금을 고스란히 담보로 잡아 저리로 이자 상환을 돌릴 수 있는 계좌 대출 금융 우회로가 시중 대형 은행마다 잘 갖추어져 있습니다. 계좌 만기 비과세 혜택은 100% 지키면서 급전을 융통하는 똑똑한 비결입니다. 🎁</p>

<hr />

<h4 style="color:#2980b9;">🏛️ 공식 국가 연금 포털 사이트</h4>
<ul>
  <li>👉 <strong><a href="https://www.fss.or.kr" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">금융감독원 파인 통합연금포털 바로가기</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(내 노후 적립금과 중도해지 시 불이익을 모바일 화면으로 신속 계산해 주는 국가 사이트입니다.)</span></li>
</ul>

<h4 style="color:#27ae60;">🍵 돈 문제로 속 타고 답답할 때 목을 맑게 다스려주는 차</h4>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224336757499&navType=by" target="_blank" rel="noopener noreferrer" style="color:#27ae60; font-weight:bold; text-decoration:underline;">목 통증과 기침을 부드럽게 지워줄 순수한집 1+1 배도라지맥문동차 힐링 루틴</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(자금 걱정으로 마르고 칼칼해진 목 점막 수분 장벽을 편안하게 코팅해 주는 웰빙 차 가이드 정보입니다.)</span></li>
</ul>

<h4 style="color:#2980b9;">🎧 취업 및 재테크 인강 집중력을 올리는 스마트 템</h4>
<ul>
  <li>👉 <strong><a href="https://m.blog.naver.com/PostView.naver?blogId=murimbook&logNo=224337660556&navType=by" target="_blank" rel="noopener noreferrer" style="color:#2980b9; font-weight:bold; text-decoration:underline;">장시간 인강 수강용 필립스 TAT1109 무선이어폰 특가 바로가기</a></strong><br>
  <span style="font-size:13px; color:#7f8c8d;">(외부 소음을 줄이고 재테크 정보나 강의를 조용히 귓속에 밀착 몰입하게 돕는 인체공학적 무선 이어폰 정보입니다.)</span></li>
</ul>
"""

    blogger_payload = {
        "title": blogger_title,
        "content": blogger_content,
        "published": published_iso,
        "status": "SCHEDULED",
        "labels": ["개인형IRP", "중도해지", "연금저축"]
    }
    
    r_blogger = blogger_service.posts().insert(blogId=blog_id, body=blogger_payload, isDraft=False).execute()
    print(f"[Blogger SUCCESS] Scheduled post ID: {r_blogger.get('id')}")

if __name__ == "__main__":
    main()
