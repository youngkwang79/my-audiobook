# -*- coding: utf-8 -*-
"""
워드프레스 100% 완전 자동화 포스팅 프로그램 (표 내부 글씨색 고대비 보정 버전)
비교 요약 표의 흰색 칸 배경 위에서 상품명과 가격 글씨가 흰색으로 묻혀 보이지 않는 현상을 해결하기 위해,
표 내부의 모든 셀(td)에 텍스트 색상(color: #111827 !important)을 검은색으로 강력히 강제 지정했습니다.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import sys
import os

# 셀레니움 라이브러리
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ==========================================
# 1. 워드프레스 접속 정보 설정 (.env.local 자동 파싱)
# ==========================================
WP_URL = "https://your-wordpress-site.com"  
WP_USER = "your_username"                   
WP_APP_PW = "xxxx xxxx xxxx xxxx"           

# .env.local 파일에서 로그인 키 자동 로드
env_path = ".env.local"
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    parts = line.split("=", 1)
                    key = parts[0].strip()
                    val = parts[1].strip()
                    if key == "WP_URL":
                        WP_URL = val
                    elif key == "WP_ADMIN_USERNAME":
                        WP_USER = val
                    elif key == "WP_APPLICATION_PASSWORD":
                        WP_APP_PW = val
    except Exception as e:
        print(f"⚠️ {env_path} 로딩 실패: {e}")

# ==========================================
# 2. 쿠팡 단축 링크 리디렉션 주소 획득 함수
# ==========================================
def resolve_short_url(short_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        response = requests.head(short_url, headers=headers, allow_redirects=True, timeout=10)
        final_url = response.url
        final_url = final_url.replace("http://", "https://")
        print(f"🔗 링크 분석 완료: {short_url} ➔ {final_url.split('?')[0]}")
        return final_url
    except Exception as e:
        print(f"⚠️ 링크 분석 실패 ({short_url}): {e}")
        return short_url.replace("http://", "https://")

# ==========================================
# 3. 셀레니움 스텔스 브라우저 기반 상품 정보 수집 함수 (WAF 완벽 우회)
# ==========================================
def scrape_coupang_with_selenium(url):
    options = webdriver.ChromeOptions()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1024,768')
    options.add_argument('lang=ko_KR')
    
    driver = None
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            """
        })
        
        driver.get(url)
        wait = WebDriverWait(driver, 10)
        
        wait.until(lambda d: d.title and "Access Denied" not in d.title)
        raw_title = driver.title
        product_name = raw_title.replace("쿠팡!", "").replace("-", "").strip()
        
        price = "가격 정보는 링크를 참조하세요."
        try:
            price_el = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".price-value, .total-price"))
            )
            if price_el and price_el.text.strip():
                price = price_el.text.strip()
                if not price.endswith("원"):
                    price += "원"
        except Exception as pe:
            print(f"⚠️ 가격 요소 로딩 실패: {pe}")
                
        image_url = ""
        try:
            img_el = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "img.prod-image-detail__main-img, #repImage"))
            )
            if img_el:
                src = img_el.get_attribute('src')
                if src:
                    image_url = src
        except Exception as ie:
            print(f"⚠️ 이미지 요소 로딩 실패: {ie}")
                
        return {
            "name": product_name,
            "price": price,
            "image": image_url,
            "spec": "쿠팡에서 가장 많은 선택을 받은 고품질 보증 베스트 인기 상품입니다."
        }
    except Exception as e:
        print(f"❌ 셀레니움 스텔스 수집 중 실패: {e}")
        return None
    finally:
        if driver:
            driver.quit()

# ==========================================
# 4. 다나와 키워드 기반 상품 정보 크롤링 함수
# ==========================================
def crawl_shopping_products(keyword, limit=5):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Connection": "keep-alive"
    }
    url = f"https://search.danawa.com/dsearch.php?query={keyword}"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        items = soup.select('.prod_item')
        products = []
        rank = 1
        
        for item in items:
            if 'ad_product' in item.get('class', []):
                continue
            name_el = item.select_one('.prod_name a')
            price_el = item.select_one('.price_sect a strong')
            img_el = item.select_one('.thumb_image img')
            spec_el = item.select_one('.spec_list')
            
            if name_el and price_el:
                name = name_el.text.strip()
                price = price_el.text.strip() + "원"
                
                img_url = ""
                if img_el:
                    img_url = img_el.get('data-original') or img_el.get('src')
                    if img_url and img_url.startswith('//'):
                        img_url = "https:" + img_url
                
                spec = "가성비가 탁월하고 구매자 평점이 매우 우수한 인기 상품입니다."
                if spec_el:
                    spec = spec_el.text.strip().replace("\t", "").replace("\n", " ")
                    spec = " ".join(spec.split())
                    if len(spec) > 130:
                        spec = spec[:127] + "..."
                
                products.append({
                    "rank": rank,
                    "name": name,
                    "price": price,
                    "image": img_url,
                    "spec": spec
                })
                rank += 1
                if rank > limit:
                    break
        return products
    except Exception as e:
        print(f"⚠️ [{keyword}] 크롤링 중 오류 발생: {e}")
        return []

# ==========================================
# 5. 워드프레스용 본문 HTML 조립 함수 (순정 구텐베르크 대응)
# ==========================================
def generate_gutenberg_native_blocks(keyword_display, products, is_url_mode=False):
    markup = ""

    # 1. 안내 Paragraph 블록
    markup += "<!-- wp:paragraph -->\n"
    markup += f"<p>안녕하세요! 오늘 소개해드릴 정보는 많은 구매자분들이 직접 검증하고 만족하신 <strong>엄선 추천 인기 '{keyword_display}' TOP {len(products)}</strong> 비교 정보입니다.</p>\n"
    markup += "<!-- /wp:paragraph -->\n\n"
    
    markup += "<!-- wp:paragraph -->\n"
    markup += "<p>아래 목록을 보시고 마음에 드는 상품의 할인가 확인 버튼을 클릭하여 쇼핑을 즐겨보세요!</p>\n"
    markup += "<!-- /wp:paragraph -->\n\n"

    # 2. 순정 테이블 블록 (모든 td 셀의 글씨색을 검은색 #111827 !important 로 고정)
    markup += """<!-- wp:table {"className":"is-style-stripes"} -->
<figure class="wp-block-table is-style-stripes"><table class="has-fixed-layout"><thead><tr><th style="color: #111827 !important; background-color: #f3f4f6 !important; font-weight: bold; text-align: center;">순위</th><th style="color: #111827 !important; background-color: #f3f4f6 !important; font-weight: bold;">상품명</th><th style="color: #111827 !important; background-color: #f3f4f6 !important; font-weight: bold; text-align: center;">판매 가격</th><th style="color: #111827 !important; background-color: #f3f4f6 !important; font-weight: bold; text-align: center;">할인가 링크</th></tr></thead><tbody>"""
    
    for item in products:
        link_target = item.get('partner_link', '#')
        
        if not is_url_mode:
            link_html = """
            <div style="background-color: #ffd43b !important; color: #0b0f19 !important; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
              ⚠️ [링크 교체]
            </div>
            """
        else:
            link_html = f'<a href="{link_target}" target="_blank" rel="noopener noreferrer" style="background-color: #ffd43b !important; color: #0b0f19 !important; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 11px; display: inline-block;">할인가 확인 ➔</a>'
            
        markup += f"""<tr>
          <td style="color: #111827 !important; text-align: center; font-weight: bold;">{item['rank']}위</td>
          <td style="color: #111827 !important; font-weight: bold;">{item['name']}</td>
          <td style="color: #e11d48 !important; font-weight: bold; text-align: right;">{item['price']}</td>
          <td style="color: #111827 !important; text-align: center;">{link_html}</td>
        </tr>"""
        
    markup += """</tbody></table></figure>
<!-- /wp:table -->\n\n"""

    # 구분선 추가
    markup += "<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>\n<!-- /wp:separator -->\n\n"

    # 3. 개별 순정 블록 리스트 생성
    for item in products:
        link_target = item.get('partner_link', '#')
        
        # 1) 순위 제목
        markup += f"<!-- wp:heading {{\"level\":4}} -->\n"
        markup += f"<h4 class=\"wp-block-heading\">🔥 {item['rank']}위 - {item['name']}</h4>\n"
        markup += "<!-- /wp:heading -->\n\n"

        # 2) 순정 이미지 블록
        markup += "<!-- wp:image {\"sizeSlug\":\"large\",\"linkDestination\":\"none\"} -->\n"
        markup += f"<figure class=\"wp-block-image size-large\"><img src=\"{item['image']}\" alt=\"{item['name']}\"/></figure>\n"
        markup += "<!-- /wp:image -->\n\n"

        # 3) 실시간 가격 설명
        markup += "<!-- wp:paragraph -->\n"
        markup += f"<p>💰 <strong>실시간 할인가:</strong> {item['price']}</p>\n"
        markup += "<!-- /wp:paragraph -->\n\n"

        # 4) 상세 스펙 설명
        markup += "<!-- wp:paragraph -->\n"
        markup += f"<p>⚙️ <strong>핵심 사양 및 특징:</strong> {item['spec']}</p>\n"
        markup += "<!-- /wp:paragraph -->\n\n"

        # 5) 링크용 버튼 블록
        markup += "<!-- wp:buttons -->\n"
        markup += "<div class=\"wp-block-buttons\"><!-- wp:button {\"style\":{\"border\":{\"radius\":\"8px\"}}} -->\n"
        markup += f"<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{link_target}\" style=\"background-color: #ffd43b !important; color: #0b0f19 !important; border-radius:8px !important; font-weight: bold !important; padding: 12px 24px !important; display: inline-block !important; text-decoration: none !important;\">👉 쿠팡에서 실시간 할인가 및 리뷰 보기 ➔</a></div>\n"
        markup += "<!-- /wp:button --></div>\n"
        markup += "<!-- /wp:buttons -->\n\n"

        # 구분선 추가
        markup += "<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>\n<!-- /wp:separator -->\n\n"

    # 4. 최하단 공정위 고정 문구
    markup += "<!-- wp:paragraph {\"align\":\"center\",\"textColor\":\"contrast\",\"fontSize\":\"small\"} -->\n"
    markup += "<p class=\"has-text-align-center has-contrast-color has-text-color has-small-font-size\">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>\n"
    markup += "<!-- /wp:paragraph -->\n"

    return markup

# ==========================================
# 6. 워드프레스 REST API 발행 기능
# ==========================================
def upload_to_wordpress(title, content):
    headers = {
        "Content-Type": "application/json"
    }
    post_data = {
        "title": title,
        "content": content,
        "status": "draft"  
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
            print("\n🎉 워드프레스 100% 자동 발행 성공!")
            print(f"👉 수정할 포스트 링크: {response.json().get('link')}")
        else:
            print(f"\n❌ 워드프레스 업로드 실패 (상태코드: {response.status_code})")
            print(response.text)
    except Exception as e:
        print(f"\n⚠️ 워드프레스 서버 연결 실패: {e}")

# ==========================================
# 7. 메인 실행 제어 (하이브리드 분기)
# ==========================================
if __name__ == "__main__":
    urls_file = "urls.txt"
    keywords_file = "keywords.txt"
    products = []
    is_url_mode = False
    
    # 1단계: urls.txt 파일이 존재하고 안에 내용이 있는지 체크
    if os.path.exists(urls_file):
        try:
            with open(urls_file, "r", encoding="utf-8") as f:
                urls = [line.strip() for line in f if line.strip() and line.strip().startswith("http")]
            if urls:
                is_url_mode = True
                print(f"📄 '{urls_file}' 감지! 쿠팡 스텔스 크롤링을 실행합니다. (총 {len(urls)}개)")
                
                rank = 1
                for short_url in urls[:5]:
                    print(f"\n--- [{rank}위 상품 수집 중] ---")
                    real_url = resolve_short_url(short_url)
                    item_data = scrape_coupang_with_selenium(real_url)
                    if item_data:
                        item_data['rank'] = rank
                        item_data['partner_link'] = short_url
                        products.append(item_data)
                        rank += 1
                    else:
                        print(f"⚠️ [{short_url}] 수집 실패로 건너뜁니다.")
                    time.sleep(1)
                keyword_display = "여름 추천 상품"
                post_title = "실시간 베스트 추천 상품 TOP 5 상세 비교"
        except Exception as e:
            print(f"⚠️ urls.txt 읽기 실패: {e}")
            
    # 2단계: URL 모드가 작동하지 않았고, keywords.txt 파일이 존재할 경우
    if not products and os.path.exists(keywords_file):
        try:
            with open(keywords_file, "r", encoding="utf-8") as f:
                kws = [line.strip() for line in f if line.strip()]
            if kws:
                print(f"📄 '{keywords_file}' 감지! 다나와 안전 키워드 모드를 실행합니다. (총 {len(kws)}개)")
                
                rank = 1
                for kw in kws[:5]:
                    print(f"🔍 [{kw}] 검색 중...")
                    single_item = crawl_shopping_products(kw, limit=1)
                    if single_item:
                        item_data = single_item[0]
                        item_data['rank'] = rank
                        products.append(item_data)
                        rank += 1
                    else:
                        print(f"⚠️ [{kw}] 검색 결과가 없어 제외되었습니다.")
                    time.sleep(1)
                keyword_display = "인기 추천 상품"
                post_title = "엄선 추천 인기 브랜드 상품 TOP 5 상세 비교"
        except Exception as e:
            print(f"⚠️ keywords.txt 읽기 실패: {e}")
            
    # 3단계: 둘 다 데이터가 없으면 기본 키워드로 일괄 수집
    if not products:
        keyword = "무선 가습기"
        print(f"ℹ️ 활성화된 텍스트 파일이 없어 기본 키워드 [{keyword}]로 일괄 수집을 시작합니다.")
        products = crawl_shopping_products(keyword, limit=5)
        keyword_display = keyword
        post_title = f"2026년 인기 {keyword} 추천 순위 TOP 5 비교"
        
    # 최종 결과 워드프레스 업로드
    if products:
        post_html = generate_gutenberg_native_blocks(keyword_display if 'keyword_display' in locals() else "추천 상품", products, is_url_mode=is_url_mode)
        upload_to_wordpress(post_title, post_html)
    else:
        print("❌ 유효한 상품 정보가 없어 워드프레스 업로드를 중단합니다.")
