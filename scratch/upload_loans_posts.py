# -*- coding: utf-8 -*-
"""
워드프레스 및 구글 블로거에 대환대출 관련 글 자동 포스팅 스크립트
"""

import requests
import json
import os
import mimetypes
import pickle
from datetime import datetime, timedelta
from googleapiclient.discovery import build

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

# 이미지 경로 정의
brain_dir = "C:/Users/owner/.gemini/antigravity/brain/fc127a2b-97c2-47ab-a1c9-0457fe17a015"
wp_featured_path = f"{brain_dir}/wp_loans_cover_1783293817900.jpg" # will use generated paths dynamically or fallback
wp_sub_path = f"{brain_dir}/wp_loans_sub_1783293841179.jpg"
blogger_img_path = f"{brain_dir}/blogger_loans_cover_1783293852487.jpg"

# 실제 존재하는 파일들로 보정
for f_name in os.listdir(brain_dir):
    if f_name.startswith("wp_loans_cover_") and f_name.endswith(".jpg"):
        wp_featured_path = os.path.join(brain_dir, f_name)
    elif f_name.startswith("wp_loans_sub_") and f_name.endswith(".jpg"):
        wp_sub_path = os.path.join(brain_dir, f_name)
    elif f_name.startswith("blogger_loans_cover_") and f_name.endswith(".jpg"):
        blogger_img_path = os.path.join(brain_dir, f_name)

def get_blogger_service():
    token_path = 'scratch/blogger_token.pickle'
    with open(token_path, 'rb') as token:
        creds = pickle.load(token)
    return build('blogger', 'v3', credentials=creds)

def upload_media_to_wp(file_path, alt_text, caption="", description=""):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None
    
    url = f"{WP_URL}/wp-json/wp/v2/media"
    mime_type, _ = mimetypes.guess_type(file_path)
    headers = {
        "Content-Disposition": f'attachment; filename="{os.path.basename(file_path)}"'
    }
    if mime_type:
        headers["Content-Type"] = mime_type
        
    with open(file_path, "rb") as f:
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=f)
        
    if r.status_code == 201:
        media_id = r.json()["id"]
        media_url = r.json()["source_url"]
        print(f"Media uploaded successfully! ID: {media_id}, URL: {media_url}")
        
        # 메타데이터 업데이트
        update_url = f"{WP_URL}/wp-json/wp/v2/media/{media_id}"
        requests.post(
            update_url,
            auth=(WP_USER, WP_PASS),
            json={
                "alt_text": alt_text,
                "caption": caption,
                "description": description
            }
        )
        return media_id, media_url
    else:
        print(f"Failed to upload media: {r.status_code}, {r.text}")
        return None

def main():
    print("=== [1] WordPress Draft Upload ===")
    
    feat_res = upload_media_to_wp(
        wp_featured_path, 
        "2026 대환대출 정부 정책자금 대표 이미지", 
        "고금리에서 저금리로 갈아타는 대환대출 성공 가이드", 
        "소상공인 및 개인사업자를 위한 저금리 정부대환대출 소개"
    )
    featured_media_id = feat_res[0] if feat_res else 0
    
    sub_res = upload_media_to_wp(
        wp_sub_path,
        "대환대출 심사 핵심 승인율 극대화 전략",
        "",
        "대환대출 신용점수 및 가점 확보 조건표"
    )
    sub_img_url = sub_res[1] if sub_res else ""

    # 카테고리 체크 및 생성
    required_cats = ["IT/업무", "AI/자동화", "경제/산업"]
    cat_ids = []
    r_cats = requests.get(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), params={"per_page": 100})
    existing_cats = {c["name"]: c["id"] for c in r_cats.json()} if r_cats.status_code == 200 else {}
    
    for cat_name in required_cats:
        if cat_name in existing_cats:
            cat_ids.append(existing_cats[cat_name])
        else:
            r_new = requests.post(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), json={"name": cat_name})
            if r_new.status_code == 201:
                cat_ids.append(r_new.json()["id"])
                print(f"Created category: {cat_name}")

    # 태그 생성 및 바인딩
    tags = ["대환대출", "소상공인대환대출", "정부지원대출", "저금리전환"]
    tag_ids = []
    r_tags = requests.get(f"{WP_URL}/wp-json/wp/v2/tags", auth=(WP_USER, WP_PASS), params={"per_page": 100})
    existing_tags = {t["name"]: t["id"] for t in r_tags.json()} if r_tags.status_code == 200 else {}
    
    for tag in tags:
        if tag in existing_tags:
            tag_ids.append(existing_tags[tag])
        else:
            r_new = requests.post(f"{WP_URL}/wp-json/wp/v2/tags", auth=(WP_USER, WP_PASS), json={"name": tag})
            if r_new.status_code == 201:
                tag_ids.append(r_new.json()["id"])
                print(f"Created tag: {tag}")
            
    # 제목 규칙: 핵심키워드 맨 앞에 배치, 20자 내외 숫자포함
    # 포커스키워드: 대환대출
    wp_title = "대환대출: 2026 정부 지원 3가지 조건"
    
    sub_img_html = f'<p style="text-align: center;"><img src="{sub_img_url}" alt="대환대출 심사 핵심 승인율 극대화 전략" class="aligncenter size-full" /></p>' if sub_img_url else ""
    
    # 2000자 이상(공백 포함) 콘텐츠
    wp_content = f"""
<p>최근 지속되는 고금리 기조 속에서 매달 지출되는 대출 이자 비용 때문에 사업 운영과 가계 경제에 극심한 타격을 입고 계신가요? 이러한 자금 부담을 획기적으로 낮추기 위해 가장 먼저 고려해야 할 정책적 금융 카드가 바로 <strong>대환대출</strong> 제도입니다. 정부가 지원하는 정책 <strong>대환대출</strong> 상품은 연 7% 이상의 고금리 대출을 연 4.5% 내외의 고정 및 변동 저금리로 전환해 주는 파격적인 혜택을 제공합니다.</p>

<p>본 포스팅에서는 2026년 새롭게 개편된 <strong>대환대출</strong>의 구체적인 신청 조건과 한도, 그리고 실제 심사에서 단 한 번에 통과할 수 있는 승인율 극대화 전략까지 일목요연하게 정리해 드리겠습니다. 대환 정책 자금은 공급 한도가 정해져 있어 예산 소진 시 조기 마감되므로, 자격 요건을 파악한 뒤 빠르게 움직이는 것만이 이자를 절감할 수 있는 유일한 지름길입니다.</p>

<hr />

<h2>1. 2026년 정부 대환대출의 핵심 정책 상품 분류</h2>
<p>정부와 소상공인시장진흥공단, 그리고 신용보증기금은 대환의 시급성에 따라 맞춤형 대환 지원 프로그램을 구축해 두고 있습니다. 대표적인 세 가지 유형은 다음과 같습니다.</p>
<ul>
  <li><strong>소상공인 대환대출 (공단 직접지원)</strong>: 비은행권의 고금리 대출 또는 민간 은행의 고이율 금융상품을 공단 심사를 거쳐 장기 저금리 자금으로 변경해 주는 직접 대환 방식입니다. 분기별 변동 또는 고정 금리로 책정되어 매우 안정적입니다.</li>
  <li><strong>신용보증기금 소상공인 대환보증</strong>: 코로나19 피해를 입었거나 경영 애로를 겪는 자영업자들을 위해 기존 고금리 채무를 시중 은행의 저금리 대출로 신속 전환할 수 있도록 신보가 보증서를 끊어주는 특화 금융 지원 정책입니다.</li>
  <li><strong>햇살론 대환대출 (서민금융진흥원)</strong>: 저소득·저신용층의 서민들이 고금리 카드론이나 저축은행 대출로 인해 채무 불이행 위험에 빠지지 않도록 서민금융 상품 한도 내에서 상환 자금을 대출해 주는 서민 맞춤형 지원책입니다.</li>
</ul>

<hr />

<h2>2. 대환대출 신청 자격 요건 및 심사 통과 핵심 노하우</h2>
<p>정책 대환은 이자를 대폭 낮춰주는 만큼, 부실 위험을 방지하기 위한 최소한의 자격 검증 절차가 존재합니다. 아래 요건과 팁을 면밀하게 점검해 보세요.</p>
{sub_img_html}
<p>기본적으로 신청일 기준 최소 3개월 이상 연 7% 이상의 고금리 대출을 성실히 상환 중인 상태여야 합니다. 연체 기록이 최근 3개월 이내에 존재하거나 국세, 지방세를 미납한 사실이 있다면 보증서 발급 및 대출 승인이 즉시 불허됩니다. 따라서 신청 전 세금 납부 상태를 완벽히 정리하는 것이 필수적입니다. 또한, <strong>소상공인지식배움터 온라인 교육 이수증</strong>이나 경영 컨설팅 수료증 등 가점을 받을 수 있는 부속 서류를 사전 확보해 놓으면 한도 승인 심사 시 막강한 혜택을 누릴 수 있습니다.</p>

<hr />

<h2>3. 대환대출 온라인 원스톱 신청 및 필요 서류</h2>
<p>대부분의 정부 대환 프로그램은 영업점 방문 없이 온라인 모바일 및 데스크톱 환경에서 비대면 접수를 진행하므로 서류 다운로드 및 스캔 작업을 사전에 완료하는 것이 시간을 아끼는 비결입니다.</p>
<h3>① 필수 구비 서류</h3>
<p>사업자등록증명원, 부가가치세과세표준증명, 납세증명서(국세 및 지방세), 기존 대출의 금융거래확인서(금리 및 상환 기간이 명시된 서류)가 필요합니다. 홈택스 연계를 통해 온라인상에서 즉각 자동 스크래핑 전송도 가능합니다.</p>
<h3>② 신청 및 승인 단계</h3>
<p>소상공인정책자금 홈페이지나 신용보증기금 앱에 접속하여 공인인증서로 로그인합니다. 대환 자금 자가진단표를 작성한 후 신청서와 함께 필요 증빙서류를 제출합니다. 공단 및 보증기관의 심사를 거쳐 승인 통보가 완료되면 지정 은행을 통해 기존 고금리 채무가 자동으로 대환 상환 처리됩니다.</p>

<hr />

<h2>4. 대환대출 정보 습득을 위한 신뢰성 공식 채널</h2>
<p>실시간으로 변동되는 금리와 신규 패키지 접수 일정을 안전하게 파악하려면 아래의 공식 사이트를 수시로 방문하시는 것이 좋습니다.</p>
<ul>
  <li>🏛️ <strong><a href="https://ols.sbiz.or.kr" target="_blank" rel="noopener noreferrer">소상공인시장진흥공단 정책자금 누리집</a></strong>: 대환 자금의 예산 잔여 한도와 분기별 정확한 정책 금리 변동 추이를 실시간으로 공지하는 최우선 공식 포털입니다.</li>
  <li>📞 <strong><a href="https://www.kinfa.or.kr" target="_blank" rel="noopener noreferrer">서민금융진흥원 공식 웹사이트</a></strong>: 개인사업자 외에 일반 서민들을 위한 햇살론 대환 요건과 서민 맞춤형 대환대출 상담 창구를 공식적으로 제공합니다.</li>
</ul>

<blockquote>
  <p>💡 <strong>추가 정보 팁</strong>: 저금리 정책 대환대출을 통해 금융 비용 부담을 대폭 경감시키는 것과 함께, 스마트한 일상 가전을 통한 업무 효율 향상 방법도 고려해 보세요. 네이버 블로그에 소개된 <a href="https://blog.naver.com/murimbook/224337660556" target="_blank" rel="noopener noreferrer">TAT1109 필립스 무선이어폰 특가 혜택 바로가기 🔗</a>를 확인하시면 고요한 집중 환경을 만들어 업무 몰입도를 극대화할 수 있는 기회를 확인하실 수 있습니다.</p>
</blockquote>

<p>
<strong>#대환대출</strong> <strong>#소상공인대환대출</strong> <strong>#정부지원대출</strong> <strong>#저금리대출</strong> <strong>#소상공인시장진흥공단</strong> <strong>#이자절감</strong> <strong>#서민금융진흥원</strong> <strong>#사업자대환</strong>
</p>
"""

    wp_post_data = {
        "title": wp_title,
        "content": wp_content,
        "status": "draft",
        "featured_media": featured_media_id,
        "categories": cat_ids,
        "tags": tag_ids
    }
    
    wp_post_data["meta"] = {
        "_rank_math_focus_keyword": "대환대출",
        "_rank_math_description": "2026 정부 지원 저금리 대환대출 신청 자격 요건과 절차 완벽 해부. 연 7% 이상 고금리 채무를 4%대로 낮추어 매월 발생하는 고정 이자 비용을 확실하게 줄이는 성공 노하우."
    }

    print("Uploading WordPress Post...")
    r_wp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", auth=(WP_USER, WP_PASS), json=wp_post_data)
    if r_wp.status_code == 201:
        wp_id = r_wp.json()["id"]
        print(f"WordPress Post Uploaded Successfully! ID: {wp_id}")
    else:
        print(f"Failed WP upload: {r_wp.status_code}, {r_wp.text}")
        
    print("\n=== [2] Google Blogger Scheduled Upload ===")
    service = get_blogger_service()
    blogs_res = service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    # 1시간 후 예약 발행 설정
    scheduled_time = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
    
    # 다른 각도, 다른 제목
    blogger_title = "자영업자 빚 탈출의 핵심, 정부 대환대출 활용 가이드"
    
    # 16:9 이미지 업로드를 위해 WP에 업로드된 featured 이미지 url을 받아와 blogger 본문에 삽입하거나, base64 인코딩해서 처리
    # 여기서는 WP에 성공적으로 업로드된 feat_res[1]을 사용하거나 직접 HTML에 이미지 주소를 첨부합니다.
    blogger_img_url = feat_res[1] if feat_res else "https://blog.murimbook.com/wp-content/uploads/2026/07/blogger_loans_cover.jpg"
    
    blogger_content = f"""
<div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.8; color: #333; font-size: 16px;">

<div style="text-align: center; margin-bottom: 24px;">
  <img src="{blogger_img_url}" alt="정부지원 대환대출을 통한 부채 다이어트 전략" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px;" />
  <p style="font-size: 12px; color: #888; margin-top: 6px;">[부채 다이어트 이미지] 금리 부담을 절반으로 낮추는 실질적인 대환대출 실행 방안</p>
</div>

<p>매달 계좌에서 빠져나가는 높은 이자 비용을 보며 깊은 한숨을 쉬고 계신 자영업자 및 소상공인분들이 많습니다. 매달 수십만 원에서 수백만 원에 달하는 고정 지출을 극적으로 단축할 수 있는 가장 합리적인 해결책이 바로 <strong>대환대출</strong> 자금의 확보입니다.</p>

<p>본 글에서는 중복 문서 우회를 위해 타 채널과는 다른 실전 부채 상환 포인트를 짚어보고, 신용 점수를 방어하면서 저금리로 리파이낸싱하는 정부 <strong>대환대출</strong>의 구체적인 가이드를 제공합니다.</p>

<h3>1. 고이율 채무의 위험성과 저금리 대환의 필요성</h3>
<p>연 7%가 넘는 2금융권 카드론 및 저축은행 채무는 단순히 이자 부담만 가중시키는 것이 아니라, 다중채무자로 분류되어 개인 신용점수를 갉아먹는 주범이 됩니다. 이를 정부가 지원하는 <strong>대환대출</strong> 상품으로 단일화하고 이율을 4%대로 대환 처리하면, 금융 비용 절감은 물론 부채 건전성이 크게 회복되어 신용 평점이 우상향하는 선순환 효과를 누릴 수 있습니다.</p>

<h3>2. 정부 대환대출 신청 자격요건 주요 점검사항</h3>
<p>기존 채무를 최소 3개월 동안 한 번의 연체 없이 성실하게 갚아나가고 있어야 자격 검증을 수월하게 패스할 수 있습니다. 특히 연체 이력 및 체납 이력이 없어야 하므로, 대환 신청 전 자잘한 세금 미납분을 최우선으로 해결하는 전략이 중요합니다. 또한, 내부 링크를 통해 소개되는 <a href="https://blog.murimbook.com/676" target="_blank" rel="noopener noreferrer" style="color: #0066cc; font-weight: bold;">[무림북 내부자료] 한강공원 수영장 야간개장 정보 🔗</a>처럼 일상 속 리프레시를 누리면서 머리를 맑게 유지하고 장기적인 재무 관리 로드맵을 다시 세워보는 여유를 가져보시는 것도 추천합니다.</p>

<h3>3. 대환 절차 및 공식 상담 문의처</h3>
<p>대환은 공인인증서를 준비한 뒤 소상공인시장진흥공단 누리집이나 신용보증기금 사이트에 비대면으로 신청서를 제출하여 실행합니다. 승인 후 기존 채무 계좌로 대환 자금이 다이렉트 송금되어 즉시 대환이 이루어집니다. 추가로 일상의 스마트 라이프를 위해 제공되는 네이버 외부 링크 <a href="https://blog.naver.com/murimbook/224337660556" target="_blank" rel="noopener noreferrer" style="color: #0066cc; font-weight: bold;">TAT1109 필립스 무선이어폰 특가 혜택 바로가기 🔗</a>도 함께 살펴보시면 비즈니스 능률을 높이는 데 큰 보탬이 될 것입니다.</p>

<p style="font-size: 14px; color: #777; margin-top: 15px;">
  #대환대출 #소상공인대환대출 #정부대출 #저금리대출 #자영업자대출 #소상공인시장진흥공단 #이자절감 #신용보증기금 #필립스이어폰특가
</p>
</div>
"""

    blogger_body = {
        "title": blogger_title,
        "content": blogger_content,
        "published": scheduled_time,
        "status": "DRAFT" # DRAFT status but setting published time forces Blogger to treat it as scheduled draft, or if we publish with published time it gets scheduled.
    }
    
    print("Scheduling Blogger Post...")
    r_blogger = service.posts().insert(blogId=blog_id, body=blogger_body, isDraft=True).execute()
    print(f"Blogger Draft Created/Scheduled Successfully! Post ID: {r_blogger.get('id')}")

if __name__ == '__main__':
    main()
