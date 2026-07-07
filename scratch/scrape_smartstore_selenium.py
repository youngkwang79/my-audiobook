# -*- coding: utf-8 -*-
"""
셀레늄(Selenium)을 이용한 네이버 스마트스토어 상세페이지 텍스트 크롤링 매크로 (보안 우회 보완판)
"""

import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def crawl_details_via_selenium():
    url = "https://smartstore.naver.com/sunsuhouse/products/8560153668"
    print(f"[INFO] Initializing Chrome browser for: {url}")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 창 숨기기
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # 실제 사람 브라우저처럼 보이게 하기 위한 다이내믹 UA 설정
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        driver.get(url)
        time.sleep(5)  # 네이버 스마트스토어의 풍부한 스크립트 렌더링 완벽 대기
        
        # 1. 제목(Title) 추출 시도 (여러 셀렉터 대응)
        title = ""
        title_selectors = [
            "h3[class*='_22ttubw25Y']",
            "h3",
            "div.prod_title",
            "h2"
        ]
        for sel in title_selectors:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                if el and el.text.strip():
                    title = el.text.strip()
                    break
            except:
                continue
                
        if not title:
            title = driver.title # 브라우저 탭 타이틀로 대체
            
        print(f"[SUCCESS] Target Title Found: {title}")
        
        # 2. 본문 설명 영역 전체 텍스트 추출 시도 (스마트스토어의 핵심 영역들 포괄)
        details_text = ""
        body_selectors = [
            "div#INTRODUCE",
            "div.se-viewer",
            "div[class*='detail_description']",
            "div.detail_area",
            "body"
        ]
        
        for sel in body_selectors:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                text = el.text.strip()
                if text and len(text) > 100: # 의미 있는 길이 확보 시 채택
                    details_text = text
                    print(f"[SUCCESS] Scraped via selector: {sel} ({len(text)} characters)")
                    break
            except:
                continue
        
        # 3. 만약 iframe(상세설명 별도 프레임)이 껴있을 경우의 우회 처리
        if not details_text or len(details_text) < 200:
            try:
                iframes = driver.find_elements(By.TAG_NAME, "iframe")
                for iframe in iframes:
                    driver.switch_to.frame(iframe)
                    iframe_text = driver.find_element(By.TAG_NAME, "body").text.strip()
                    if len(iframe_text) > 200:
                        details_text = iframe_text
                        print(f"[SUCCESS] Scraped details from iframe ({len(iframe_text)} characters)")
                        break
                    driver.switch_to.default_content()
            except Exception as iframe_err:
                print(f"[WARN] Iframe extraction skipped: {iframe_err}")
        
        # 4. 파일 저장
        asset_folder = "naver_post_assets"
        os.makedirs(asset_folder, exist_ok=True)
        out_path = os.path.join(asset_folder, "naver_raw_crawled_details.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"=== 상품명: {title} ===\n")
            f.write(f"=== 수집 주소: {url} ===\n\n")
            f.write(details_text)
            
        print(f"[SUCCESS] Saved detailed raw text data to {out_path}")
        
    except Exception as e:
        print(f"[ERROR] Selenium extraction failed: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    crawl_details_via_selenium()
