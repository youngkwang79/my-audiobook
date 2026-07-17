# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import json
import os
import re

# RSS 피드 설정 (실시간 연합뉴스 경제 속보, 매일경제 IT, 테크크런치 등)
RSS_FEEDS = {
    "yna_eco": "https://www.yna.co.kr/rss/economy.xml",       # 연합뉴스 경제 속보 (부동산, 정책, 금융 등 고단가 정보)
    "mk_it": "https://www.mk.co.kr/rss/30100041/",            # 매일경제 IT/과학 (AI, 가전, IT 디바이스 트렌드)
    "techcrunch": "https://techcrunch.com/feed/"             # 테크크런치 글로벌 IT 트렌드
}

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data/published_news.json")

def init_db():
    db_dir = os.path.dirname(DB_FILE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)

def load_published_urls():
    init_db()
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:
        return set()

def save_published_url(url):
    init_db()
    urls = list(load_published_urls())
    if url not in urls:
        urls.append(url)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(urls, f, ensure_ascii=False, indent=4)

def clean_html(text):
    if not text:
        return ""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).strip()

def fetch_latest_news():
    published_urls = load_published_urls()
    news_items = []
    
    import datetime
    from email.utils import parsedate_to_datetime
    
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for source, url in RSS_FEEDS.items():
        print(f"[INFO] RSS 수집 중: {source} ({url})")
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                print(f"[WARNING] RSS 응답 실패 (코드 {response.status_code}): {url}")
                continue
                
            soup = BeautifulSoup(response.content, "xml")
            items = soup.find_all("item")
            
            for item in items:
                title = item.find("title").text if item.find("title") else ""
                link = item.find("link").text if item.find("link") else ""
                desc = item.find("description").text if item.find("description") else ""
                pub_date_tag = item.find("pubDate")
                
                title = clean_html(title)
                desc = clean_html(desc)
                
                if not link or link in published_urls:
                    continue
                
                # 24시간 이내 속보 필터링 적용 (시간적 신선도 보장)
                if pub_date_tag:
                    try:
                        pub_time = parsedate_to_datetime(pub_date_tag.text)
                        # 타임존이 없는 naive datetime의 경우 timezone 추가
                        if pub_time.tzinfo is None:
                            pub_time = pub_time.replace(tzinfo=datetime.timezone.utc)
                        
                        time_diff = now_utc - pub_time
                        if time_diff.total_seconds() > 86400: # 86,400초 = 24시간
                            # 24시간을 초과한 오래된 기사는 수집 대상에서 과감히 제외
                            continue
                    except Exception as date_err:
                        print(f"[WARNING] 기사 날짜 파싱 실패 (건너뜀): {date_err}")
                    
                news_items.append({
                    "source": source,
                    "title": title,
                    "link": link,
                    "description": desc
                })
        except Exception as e:
            print(f"[ERROR] RSS 파싱 오류 ({source}): {e}")
            
    print(f"[SUCCESS] 24시간 내 미발행 새 뉴스 총 {len(news_items)}건 수집 완료.")
    return news_items

if __name__ == "__main__":
    items = fetch_latest_news()
    if items:
        print("최근 수집 뉴스 샘플:")
        print(f"제목: {items[0]['title']}")
        print(f"링크: {items[0]['link']}")
        print(f"설명: {items[0]['description']}")
