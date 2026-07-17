# -*- coding: utf-8 -*-
import os
import pickle
import json
import requests
import mimetypes
import datetime
from googleapiclient.discovery import build
import pandas as pd

# Load env variables
WP_URL = ""
WP_USER = ""
WP_PASS = ""
SUPABASE_URL = ""
SUPABASE_KEY = ""
BLOGGER_CLIENT_ID = ""
BLOGGER_CLIENT_SECRET = ""
BLOGGER_BLOG_ID = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                parts = line.split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip().replace('"', '').replace("'", "")
                if k == "WP_URL":
                    WP_URL = v
                elif k == "WP_ADMIN_USERNAME":
                    WP_USER = v
                elif k == "WP_APPLICATION_PASSWORD":
                    WP_PASS = v
                elif k == "NEXT_PUBLIC_SUPABASE_URL":
                    SUPABASE_URL = v
                elif k == "SUPABASE_SERVICE_ROLE_KEY":
                    SUPABASE_KEY = v
                elif k == "BLOGGER_CLIENT_ID":
                    BLOGGER_CLIENT_ID = v
                elif k == "BLOGGER_CLIENT_SECRET":
                    BLOGGER_CLIENT_SECRET = v
                elif k == "BLOGGER_BLOG_ID":
                    BLOGGER_BLOG_ID = v

# Setup Blogger service
def get_blogger_service():
    token_path = 'scratch/blogger_token.pickle'
    with open(token_path, 'rb') as token:
        creds = pickle.load(token)
    return build('blogger', 'v3', credentials=creds)

def upload_to_wp_media(file_path):
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
        return r.json()["source_url"]
    else:
        print(f"Failed to upload {os.path.basename(file_path)}: Status {r.status_code}")
        return None

def check_duplicate_in_supabase(prod_id):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    url = f"{SUPABASE_URL}/rest/v1/works?id=eq.{prod_id}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            return len(data) > 0
    except Exception as e:
        print(f"Supabase check failed for {prod_id}: {e}")
    return False

def register_in_supabase(prod_id, title, thumbnail):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    url = f"{SUPABASE_URL}/rest/v1/works"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {
        "id": prod_id,
        "title": title,
        "description": f"{title} 리뷰 및 분석 포스팅",
        "thumbnail": thumbnail,
        "subtitle": "[블로그]",
        "status": "공개예정",
        "total_episodes": 1,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    try:
        r = requests.post(url, headers=headers, json=payload)
        if r.status_code in [200, 201]:
            print(f"Successfully registered {prod_id} in Supabase DB!")
        else:
            print(f"Failed to register {prod_id} in Supabase: {r.status_code} {r.text}")
    except Exception as e:
        print(f"Supabase registration error: {e}")

def main():
    service = get_blogger_service()
    
    # Target Products Details
    products = [
        {
            "id": "prod_listerine_750",
            "name": "리스테린 토탈케어 마일드 750ml 4개",
            "original_price": "32,000원",
            "special_price": "23,900원",
            "image_file": "listerine_cover_1783478449299.jpg",
            "features": "무알코올 순한 맛, 6가지 구강 케어 효과, 충치예방 및 입냄새 제거 12시간 지속",
            "keywords": ["리스테린", "가글추천", "리스테린토탈케어", "구강세정제"]
        },
        {
            "id": "prod_nutrena_organic_6",
            "name": "뉴트리나 리얼오가닉 캣 6.5kg (고양이 사료)",
            "original_price": "45,000원",
            "special_price": "34,800원",
            "image_file": "nutrena_cat_food_cover_1783478463945.jpg",
            "features": "USDA 유기농 인증 원료 사용, 헤어볼 배출 도움, 알레르기 예방 및 눈물 개선 프리미엄 사료",
            "keywords": ["고양이사료", "유기농사료", "뉴트리나사료", "헤어볼사료"]
        },
        {
            "id": "prod_tefal_pan_24",
            "name": "테팔 파워글라이드 프라이팬 24cm",
            "original_price": "39,000원",
            "special_price": "26,500원",
            "image_file": "tefal_frying_pan_cover_1783478481827.jpg",
            "features": "테팔 열센서 탑재, 파워글라이드 논스틱 코팅, 인덕션 제외 모든 열원 호환, 높은 내구성",
            "keywords": ["테팔프라이팬", "후라이팬추천", "논스틱프라이팬", "주방용품"]
        },
        {
            "id": "prod_atopalm_wash_460",
            "name": "아토팜 탑투토 워시 460ml",
            "original_price": "29,000원",
            "special_price": "19,500원",
            "image_file": "atopalm_wash_cover_1783478495718.jpg",
            "features": "약산성 포뮬러, 독자개발 MLE 피부장벽 기술, 머리부터 발끝까지 올인원 케어, 자극지수 0.00",
            "keywords": ["아기바스앤샴푸", "아토팜워시", "탑투토워시", "신생아바디워시"]
        },
        {
            "id": "prod_frosch_detergent_3",
            "name": "프로쉬 식기세척기 세제 베이킹소다 30개입 3개",
            "original_price": "42,000원",
            "special_price": "29,900원",
            "image_file": "frosch_detergent_cover_1783478509062.jpg",
            "features": "베이킹소다 함유 강력 세척, 린스 일체형 올인원 탭, 에코라벨 친환경 인증, 물얼룩 방지",
            "keywords": ["식기세척기세제", "프로쉬식세제", "친환경식세제", "식세제추천"]
        }
    ]

    base_time = datetime.datetime.utcnow()
    processed_count = 0
    catalog_data = []

    for idx, p in enumerate(products):
        print(f"\nProcessing product: {p['name']}...")
        
        # Check duplicate
        if check_duplicate_in_supabase(p['id']):
            print(f"Product {p['name']} is already registered in DB. Skipping.")
            continue

        # Upload image to WP
        img_local_path = os.path.join("D:/somenail", p['image_file'])
        hosted_img_url = upload_to_wp_media(img_local_path)
        if not hosted_img_url:
            hosted_img_url = "https://blog.murimbook.com/wp-content/uploads/2026/07/" + p['image_file']

        # Schedule time (1 hour intervals)
        post_time = base_time + datetime.timedelta(hours=idx + 1)
        post_time_str = post_time.strftime("%Y-%m-%dT%H:%M:%S")

        # ----------------------------------------------------
        # 1. WordPress Version (Technical / High-Conversion)
        # ----------------------------------------------------
        wp_title = f"{p['name'].split('(')[0]} 솔직 후기 및 장단점 기술적 분석"
        
        wp_html = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{hosted_img_url}" alt="{p['name']}" style="width: 100%; max-width: 650px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
  <p style="font-size: 13px; color: #666; margin-top: 6px; font-weight: bold;">[대표 이미지] {p['name']} 실제 활용 시연 및 패키지 레이아웃</p>
</div>

<p>소비자의 합리적인 선택을 돕기 위해, 오늘은 시장에서 뜨거운 호평을 받고 있는 <strong>{p['name']}</strong> 제품의 핵심 메커니즘과 실사용 장단점을 면밀히 분석해 드립니다. 광고성 멘트를 완전히 배제하고 오직 <strong>기술적인 성능(Specs)과 경제적 메리트</strong>에 집중하여 평가를 정리했습니다.</p>

<hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />

<h2>1. 핵심 성능 분석 및 독점 기술 요약</h2>
<ul>
  <li><strong>뛰어난 성능적 강점</strong>: {p['features']}</li>
  <li><strong>높은 만족도 수치</strong>: 구매 고객 평점 기준 <strong>4.8점대 이상</strong>을 기록하며 사용 편의성 측면에서 뛰어난 신뢰를 확보하고 있습니다.</li>
</ul>

<hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />

<h2>2. 경제성 비교 및 가격 혜택표</h2>
<p>유통 마진을 최소화한 파트너스 채널 최종 혜택가 정보입니다. 정가 대비 <strong>압도적인 특가 할인</strong>이 적용되었습니다.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
  <thead>
    <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
      <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">구분</th>
      <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">가격 정보</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">정상 소비자가</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;"><del>{p['original_price']}</del></td>
    </tr>
    <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">최종 온라인 특가</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold; color: #222;">{p['special_price']}</td>
    </tr>
  </tbody>
</table>

<hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />

<h2>3. 최저가 즉시 구매 안내</h2>
<p>제품의 정품 여부와 빠른 배송을 보장하는 네이버/쿠팡 공식 셀러 페이지로 이동하여 안전하게 최저가 혜택을 챙기실 수 있습니다.</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="[여기에 제휴 링크를 입력하세요]" target="_blank" style="display: inline-block; width: 100%; max-width: 600px; padding: 18px 0; background-color: #ff2a5f; color: #ffffff; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 15px rgba(255,42,95,0.35); text-align: center;">
    👉 {p['name'].split('(')[0]} 최저가 할인가 확인하고 구매하기 👈
  </a>
</div>

<p style="font-size: 11px; color: #9ca3af; text-align: center;">이 포스팅은 파트너스 활동의 일환으로, 구매 발생 시 소정의 수수료를 제공받을 수 있습니다.</p>
"""

        # Upload to WP
        wp_headers = {"Content-Type": "application/json"}
        wp_payload = {
            "title": wp_title,
            "content": wp_html,
            "status": "future",
            "date": post_time_str
        }
        wp_res = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", auth=(WP_USER, WP_PASS), headers=wp_headers, json=wp_payload)
        if wp_res.status_code == 201:
            print(f"Scheduled on WP for {post_time_str}!")
        else:
            print(f"WP upload failed for {p['name']}: {wp_res.status_code}")

        # ----------------------------------------------------
        # 2. Google Blogger Version (Friendly / Naver Blog Copy-Paste)
        # ----------------------------------------------------
        blogger_title = f"{p['name'].split('(')[0]} 내돈내산 추천 후기! 완전 꿀템이네요 💖"
        
        blogger_html = f"""
<div style="text-align: center; margin-bottom: 24px;">
  <img src="{hosted_img_url}" alt="{p['name']}" style="width: 100%; max-width: 650px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
  <p style="font-size: 13px; color: #666; margin-top: 6px; font-weight: bold;">[네이버 블로그 전용 썸네일] {p['name']} 실제 개봉 및 사용 예시</p>
</div>

<p>안녕하세요 이웃님들! 😊 오늘은 제가 최근에 써보고 완전히 반해버린 <strong>{p['name']}</strong> 제품 후기를 가져왔어요! 그동안 이 제품 살까 말까 고민하셨던 분들 참 많으시죠? 제가 직접 사용해보면서 느꼈던 찐 매력들을 친근하게 정리해 드릴게요! 💕</p>

<p>진짜 써보니까 삶의 질이 수직 상승하더라구요! <strong>{p['features']}</strong> 같은 장점들이 일상에서 정말 체감이 컸어요!</p>

<hr />

<h3>✨ 제가 꼽아본 가장 매력적인 장점 세 가지!</h3>
<ul>
  <li><strong>완벽한 실용성</strong>: 일상에서 번거로웠던 점을 한 번에 정리해 줘서 매번 감탄하며 쓰고 있답니다.</li>
  <li><strong>믿을 수 있는 품질</strong>: 마감 상태도 견고하고 오래 써도 끄떡없을 만큼 품질이 확실해요!</li>
  <li><strong>가성비 최고 혜택</strong>: 정상가 {p['original_price']} 제품인데 지금 특가로 무려 <strong>{p['special_price']}</strong>에 데려올 수 있다는 사실! 😍</li>
</ul>

<hr />

<p>이 좋은 기회 놓치면 너무 아깝잖아요! 아래 빨간색 버튼을 콕 누르시면 정품 보장은 물론이고 가장 안전하고 저렴하게 구매할 수 있는 특가 스토어로 바로 이동하실 수 있어요! 👇</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="[여기에 제휴 링크를 입력하세요]" target="_blank" style="display: inline-block; width: 100%; max-width: 600px; padding: 18px 0; background-color: #ff2a5f; color: #ffffff; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 15px rgba(255,42,95,0.35); text-align: center;">
    👉 {p['name'].split('(')[0]} 최저가 혜택 구경하러 가기 👈
  </a>
</div>

<p style="font-size: 11px; color: #9ca3af; text-align: center;">이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다.</p>
"""
        
        blogger_payload = {
            "kind": "blogger#post",
            "blog": {"id": BLOGGER_BLOG_ID},
            "title": blogger_title,
            "content": blogger_html,
            "status": "DRAFT",
            "labels": p['keywords']
        }
        
        try:
            r_blogger = service.posts().insert(blogId=BLOGGER_BLOG_ID, body=blogger_payload, isDraft=True).execute()
            print(f"Uploaded Blogger Draft successfully! ID: {r_blogger.get('id')}")
        except Exception as e:
            print(f"Blogger upload failed for {p['name']}: {e}")

        # Register in Supabase
        register_in_supabase(p['id'], p['name'], f"/thumbnails/{p['image_file']}")
        
        # Append to catalog
        catalog_data.append({
            "상품명": p['name'],
            "정상가": p['original_price'],
            "특가": p['special_price'],
            "핵심스펙": p['features'],
            "제휴링크": "[여기에 제휴 링크를 입력하세요]"
        })
        processed_count += 1

    # 3. Save Excel Catalog
    if catalog_data:
        df = pd.DataFrame(catalog_data)
        excel_path = "D:/somenail/product_catalog.xlsx"
        df.to_excel(excel_path, index=False)
        print(f"\n[SUCCESS] Excel catalog saved successfully to {excel_path}!")

if __name__ == '__main__':
    main()
