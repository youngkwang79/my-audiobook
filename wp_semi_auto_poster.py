# -*- coding: utf-8 -*-
"""
워드프레스 반자동 포스팅 프로그램 (쿠팡 크롤링 기반 초안 작성기)
API 키 없이 쿠팡 상품 정보를 긁어와 워드프레스에 임시저장 글로 올립니다.
"""

import requests
from bs4 import BeautifulSoup
import json
import time

# ==========================================
# 1. 워드프레스 접속 정보 설정
# ==========================================
WP_URL = "https://your-wordpress-site.com"  # 내 워드프레스 주소
WP_USER = "your_username"                   # 워드프레스 로그인 아이디
WP_APP_PW = "xxxx xxxx xxxx xxxx"           # 발급받은 애플리케이션 비밀번호 (16자리)

# ==========================================
# 2. 쿠팡 웹 크롤링 함수 (API 키 불필요)
# ==========================================
def crawl_coupang_products(keyword):
    """
    쿠팡 검색 페이지에서 직접 상품 이름, 가격, 이미지 주소를 크롤링합니다.
    쿠팡의 차단 정책을 피하기 위해 브라우저 헤더 정보를 상세히 설정합니다.
    """
    print(f"🔄 쿠팡에서 [{keyword}] 관련 인기 상품을 수집하고 있습니다...")
    
    url = f"https://www.coupang.com/np/search?q={keyword}&channel=user"
    
    # 봇 차단 방지를 위한 브라우저 모방 헤더 설정
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Connection": "keep-alive"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"❌ 쿠팡 접속에 실패했습니다. (상태코드: {response.status_code})")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 쿠팡 검색 결과 상품 리스트 아이템 추출
        items = soup.select('li.search-product')
        products = []
        rank = 1
        
        for item in items[:5]:  # 상위 5개 상품만 수집
            name_el = item.select_one('div.name')
            price_el = item.select_one('strong.price-value')
            img_el = item.select_one('img.search-product-wrap-img')
            
            if name_el and price_el:
                name = name_el.text.strip()
                price = price_el.text.strip() + "원"
                
                # 이미지 주소 추출 (지연 로딩 대응)
                img_url = ""
                if img_el:
                    img_url = img_el.get('data-img-src') or img_el.get('src')
                    if img_url and img_url.startswith('//'):
                        img_url = "https:" + img_url
                
                products.append({
                    "rank": rank,
                    "name": name,
                    "price": price,
                    "image": img_url,
                    "spec": "가성비 우수 / 소비자 평점 상위권 / 로켓배송 가능"
                })
                rank += 1
                
        print(f"✅ 성공적으로 {len(products)}개의 상품 정보를 수집했습니다.")
        return products
        
    except Exception as e:
        print(f"⚠️ 크롤링 오류 발생: {e}")
        return []

# ==========================================
# 3. 워드프레스용 본문 HTML 조립 함수
# ==========================================
def generate_html_post(keyword, products):
    """
    크롤링한 상품 정보를 가지고 워드프레스 포스팅용 예쁜 HTML 뼈대를 만듭니다.
    수익 링크가 들어갈 자리는 뚜렷하게 표시합니다.
    """
    html = f"<p>안녕하세요! 오늘 소개해드릴 상품은 많은 분들이 즐겨찾으시는 <strong>가장 인기 있는 '{keyword}' TOP 5</strong> 추천 제품 정보입니다.</p>"
    html += "<p>상품들의 상세 스펙과 실제 판매 가격을 한눈에 표로 비교해 보시고, 마음에 드는 상품 아래의 <strong>[구매 링크]</strong>를 꼭 수정해서 사용해 보세요!</p><br/>"
    
    # 비교 표 테이블 구성
    html += """
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #ddd; font-family: sans-serif;">
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
          <th style="padding: 12px; border: 1px solid #ddd; width: 60px;">순위</th>
          <th style="padding: 12px; border: 1px solid #ddd;">상품명</th>
          <th style="padding: 12px; border: 1px solid #ddd; width: 100px;">판매가격</th>
          <th style="padding: 12px; border: 1px solid #ddd;">수익 링크 넣는 곳</th>
        </tr>
      </thead>
      <tbody>
    """
    
    for item in products:
        html += f"""
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #ff3366; text-align: center;">{item['rank']}위</td>
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #222;">{item['name']}</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #ff3366; font-weight: bold;">{item['price']}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
            <div style="background-color: #ffd43b; color: #111; padding: 6px; border: 1px dashed #e28743; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ⚠️ [파트너스 링크 붙여넣기]
            </div>
          </td>
        </tr>
        """
    html += "</tbody></table><br/>"
    
    # 개별 상품 디테일 카드 구성
    html += "<h3>🔒 각 순위별 대표 상세 사양</h3>"
    for item in products:
        html += f"""
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 24px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif;">
          <h4 style="margin-top: 0; color: #111827; font-size: 16px;">⭐ {item['rank']}위 - {item['name']}</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 120px; text-align: center;">
              <img src="{item['image']}" alt="{item['name']}" style="width: 100%; max-width: 160px; border-radius: 8px; border: 1px solid #f3f4f6;" />
            </div>
            <div style="flex: 2; min-width: 240px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #111827;">실시간 할인가: <span style="color: #ff3366;">{item['price']}</span></p>
                <p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>요약 특징:</strong> {item['spec']}</p>
                <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">* 파트너스 활동을 통해 수수료를 제공받을 수 있음</p>
              </div>
              <div style="margin-top: 14px;">
                <div style="background-color: #ffd43b; color: #111; padding: 10px; border: 1.5px dashed #d97706; border-radius: 6px; font-weight: bold; font-size: 12px; text-align: center; cursor: pointer;">
                  👉 에디터에서 이곳에 내 쿠팡 파트너스 [보러가기] 링크 주소를 입력하세요.
                </div>
              </div>
            </div>
          </div>
        </div>
        """
    return html

# ==========================================
# 4. 워드프레스 REST API 발행 기능
# ==========================================
def upload_to_wordpress(title, content):
    """
    작성된 포스팅을 워드프레스에 임시글(draft) 상태로 업로드합니다.
    """
    headers = {
        "Content-Type": "application/json"
    }
    
    post_data = {
        "title": title,
        "content": content,
        "status": "draft"  # 승인 전 수동 검수를 위해 반드시 임시글(draft)로 업로드합니다.
    }
    
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    
    try:
        response = requests.post(
            url,
            auth=(WP_USER, WP_APP_PW),
            headers=headers,
            data=json.dumps(post_data)
        )
        
        if response.status_code == 201:
            print("\n🎉 워드프레스 임시글 작성 성공!")
            print("👉 워드프레스 관리자 화면의 [글] 메뉴에서 확인 후 수익 링크만 바꾸어 발행하세요.")
            print(f"👉 수정할 포스트 링크: {response.json().get('link')}")
        else:
            print(f"\n❌ 워드프레스 업로드 실패 (상태코드: {response.status_code})")
            print(response.text)
            
    except Exception as e:
        print(f"\n⚠️ 워드프레스 서버 연결 실패: {e}")

# ==========================================
# 5. 메인 실행 제어
# ==========================================
if __name__ == "__main__":
    # 1. 원하는 자동 포스팅 대상 키워드 입력
    keyword = "무선 가습기"
    
    # 2. 쿠팡 크롤링 진행
    products = crawl_coupang_products(keyword)
    
    if products:
        # 3. HTML 글 조합
        post_title = f"2026년 인기 {keyword} 추천 순위 TOP 5 스펙 비교"
        post_html = generate_html_post(keyword, products)
        
        # 4. 워드프레스 자동 임시글 등록
        upload_to_wordpress(post_title, post_html)
    else:
        print("❌ 상품 정보가 비어있어 포스팅 작성을 취소합니다.")
