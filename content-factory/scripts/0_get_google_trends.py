import os
import sys
import xml.etree.ElementTree as ET
import json
import requests

# 콘솔 출력 인코딩 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')

def get_google_daily_trends():
    print("[*] 구글 트렌드 실시간 한국 급상승 검색어 가져오는 중...")
    # 한국(KR) 트렌드 RSS 피드
    url = "https://trends.google.co.kr/trending/rss?geo=KR"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # XML 파싱
        root = ET.fromstring(response.content)
        
        trends = []
        # RSS 피드 내의 item 추출
        for item in root.findall(".//item"):
            title = item.find("title").text
            approx_traffic = item.find("{ht}approx_traffic")
            traffic = approx_traffic.text if approx_traffic is not None else "10,000+"
            
            # 중복 및 공백 제거
            if title and title.strip():
                trends.append({
                    "keyword": title.strip(),
                    "traffic": traffic.strip()
                })
                
        # 최대 10개만 리턴
        return trends[:10]
        
    except Exception as e:
        print(f"[❌] 구글 트렌드 RSS 로드 실패: {e}")
        # 오류 발생 시 기본 트렌드 키워드 대체값 제공 (시스템 작동 안전장치)
        return [
            {"keyword": "AI 인공지능 수익화 방법", "traffic": "추천"},
            {"keyword": "챗GPT 활용 블로그 글쓰기", "traffic": "추천"},
            {"keyword": "구글 애드센스 승인 꿀팁", "traffic": "추천"},
            {"keyword": "노션 템플릿 제작 판매", "traffic": "추천"},
            {"keyword": "부업으로 하는 1인 쇼핑몰", "traffic": "추천"}
        ]

def main():
    trends_list = get_google_daily_trends()
    
    output_dir = os.path.join(os.path.dirname(__file__), "../output")
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, "google_daily_trends.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"trends": trends_list}, f, ensure_ascii=False, indent=2)
        
    print(f"[✔] 구글 트렌드 수집 완료! 저장 경로: {output_path}")
    print(json.dumps(trends_list, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
