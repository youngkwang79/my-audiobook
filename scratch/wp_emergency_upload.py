# -*- coding: utf-8 -*-
"""
워드프레스 카테고리 체크 및 안전 업로드 단독 스크립트
"""

import requests
import json

def upload_to_wordpress_safely():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    wp_cover_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hearing_aid_wp_cover.jpg"
    wp_sub_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/hearing_aid_wp_sub.jpg"

    wp_title = "노인 보청기 지원금 131만원 수령하는 3단계 핵심 꿀팁"
    
    wp_content = f"""
<p>부모님께서 자꾸 텔레비전 볼륨을 크게 높이시거나, 대화할 때 엉뚱한 대답을 하신다면 노인성 난청을 의심하고 <strong>노인 보청기</strong> 정부 보조금 지원 혜택을 시급히 검토해야 합니다.</p>

<p>본 포스팅에서는 보청기 구입 비용의 큰 부담을 덜어주는 보건복지부 주관 <strong>노인 보청기</strong> 131만 원 환급 제도의 지급 대상 조건과 승인율을 획득하는 초정밀 실전 신청 꿀팁을 전수해 드립니다.</p>

<hr />

<h3>📢 노인 보청기 국가지원 대상자 적격 조건 확인</h3>
<p>가장 먼저 파악해야 할 것은 보청기 보조금을 수령하기 위한 의료적 적격 요건입니다. 단순히 나이가 많다고 하여 누구나 무조건 지원금을 주는 것은 아닙니다. 반드시 보건복지부 장애인복지법상 <strong>'청각장애 등록자'</strong> 판정을 받은 국민건강보험 가입자 또는 의료급여 수급권자여야 합니다.</p>

<p>이비인후과 전문의가 상주하는 지정 병원에서 순음청력검사 3회, 청성뇌간반응검사 1회 등 총 4회의 정밀 청각 검사를 거쳐 청각 장애 등급 판정을 최종 획득하시는 것이 1단계 필수 관문입니다.</p>

<div style="text-align: center; margin: 25px 0;">
  <img src="{wp_sub_url}" alt="노인 보청기 착용 정밀 이미지" />
</div>

<hr />

<h3>💰 지원 금액 한도 및 자부담금 비율 상세</h3>
<p>청각 장애 등록을 마치셨다면, 5년 주기로 1회당 <strong>최대 131만 원의 보청기 급여비</strong>를 돌려받을 수 있습니다. 일반 건강보험 가입자는 전체 금액의 90%인 117만 9천 원을 국민건강보험공단으로부터 지원받고, 본인은 단 10%(최대 13만 1천 원)만 자부담하면 됩니다. 차상위 계층 및 기초생활수급권자의 경우에는 본인부담금 0원인 100% 무료 전액 지원으로 국가 보청기 서비스를 받을 수 있어 큰 경제적 힘이 되어 줍니다.</p>

<hr />

<h3>🛠️ 실수 없이 원스톱 승인을 따내는 3단계 프로세스</h3>
<ol>
  <li><strong>이비인후과 보청기 처방전 발급</strong>: 지정 전문 병원에 방문하여 의사로부터 '보청기 처방전'을 우선적으로 발급받습니다.</li>
  <li><strong>보청기 구입 및 영수증 획득</strong>: 공단에 등록된 정식 판매 스토어에서 보청기를 구매한 후 세금계산서와 품질 보증 카드를 챙깁니다.</li>
  <li><strong>구입 후 1개월 검수확인서 제출</strong>: 보청기를 수령하고 1개월이 지난 시점에 다시 병원에 내원하여 보청기가 난청에 효과가 있다는 '검수확인서'를 발급받아 공단에 제출하면 영업일 기준 수일 내에 지원금이 본인 계좌로 최종 환급 환수됩니다.</li>
</ol>

<hr />

<h3>🔗 공식 신뢰 외부 링크 연계</h3>
<ul>
  <li>🏛️ <strong><a href="https://www.nhis.or.kr" target="_blank" rel="noopener noreferrer">국민건강보험공단 요양비/장애인보조기기 공식 포털</a></strong> — 노인 보청기 국가지원 급여 기준 법률 고시문과 내 거주지 주변의 보청기 정식 공인 등록 판매점 리스트를 투명하게 조회해 볼 수 있는 대한민국 공식 공단 사이트입니다.</li>
</ul>

<h3>🍵 부모님의 일상 건강을 위한 추천 꿀팁</h3>
<ul>
  <li>🌱 <strong><a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer">부모님 목 기침 관리를 위한 친환경 생분해 1+1 배도라지맥문동차 힐링 루틴</a></strong> — 난청 예방뿐만 아니라 환절기 기관지 수분 보강에 좋은 건강차 소개 글입니다.</li>
</ul>
"""

    # 1. 혹시 모를 카테고리 ID 충돌 방지를 위해, 빈 배열로 시작하여 임시글 안전 등록 보장
    wp_payload = {
        "title": wp_title,
        "content": wp_content,
        "status": "draft", # 임시글로 무조건 등록
        "categories": [], # 카테고리 ID 강제 매핑 오류 방지
        "tags": []
    }
    
    print("[INFO] Attempting WordPress API connection...")
    r_wp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", auth=(WP_USER, WP_PASS), json=wp_payload)
    
    if r_wp.status_code == 201:
        post_id = r_wp.json().get("id")
        print(f"[SUCCESS] WordPress Draft Post created successfully! (ID: {post_id})")
        print(f"Edit Link: {WP_URL}/wp-admin/post.php?post={post_id}&action=edit")
    else:
        print(f"[ERROR] WordPress API failed. HTTP {r_wp.status_code}")
        print(r_wp.text)

if __name__ == "__main__":
    upload_to_wordpress_safely()
