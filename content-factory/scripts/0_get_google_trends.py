import os
import sys
import xml.etree.ElementTree as ET
import json
import requests

# 콘솔 출력 인코딩 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')

def load_env():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '../../.env.local'),
        os.path.join(os.path.dirname(__file__), '../.env.local'),
        os.path.abspath('.env.local'),
        os.path.abspath('../.env.local')
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")
            break

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
            {"keyword": "금융 절세 전략 이월공제", "traffic": "추천"},
            {"keyword": "파킹통장 금리 비교", "traffic": "추천"},
            {"keyword": "청년도약계좌 가입 조건", "traffic": "추천"},
            {"keyword": "정부 소상공인 지원금 신청", "traffic": "추천"},
            {"keyword": "신용점수 올리는 법", "traffic": "추천"}
        ]

def analyze_with_gemini(trends, api_key):
    if not api_key:
        print("[*] API 키 누락으로 AI 고수익 분석을 건너뜁니다.")
        for t in trends:
            t["profit_rating"] = "Medium"
            t["profit_reason"] = "일반 인기 상승 트렌드 키워드"
            t["monetization_angle"] = "트래픽 유입 확보를 우선 목표로 하는 작성 권장"
        return trends

    try:
        print("[🤖] Gemini를 활용한 고수익 애드센스 단가 분석을 시작합니다...")
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        
        prompt = (
            "You are a professional Google AdSense optimization consultant.\n"
            "Analyze the following 10 real-time Korean search terms for their AdSense profitability potential "
            "(i.e., whether they trigger high CPC/RPM ads like financial products, credit cards, loans, insurance, tech gear, real estate, taxes, government aids, or expensive services).\n\n"
            f"Keywords list:\n{json.dumps(trends, ensure_ascii=False)}\n\n"
            "For each keyword, return the original keyword, a traffic value, and add three new fields:\n"
            "- \"profit_rating\": strictly one of \"High\", \"Medium\", or \"Low\"\n"
            "- \"profit_reason\": a brief, friendly explanation in Korean of why it gets this rating (e.g., '대출/금융 키워드로 고단가 광고가 매칭됩니다', '일반 인물/이슈로 광고 단가가 비교적 낮습니다')\n"
            "- \"monetization_angle\": a brief recommendation in Korean on how a blogger should angle the post to attract high-paying ads (e.g., '단순 소개보다 조건/이자율 비교 표를 포함하여 작성하는 것이 유리합니다')\n\n"
            "Return a JSON object with the following structure:\n"
            "{\n"
            "  \"trends\": [\n"
            "    {\n"
            "      \"keyword\": \"...\",\n"
            "      \"traffic\": \"...\",\n"
            "      \"profit_rating\": \"High/Medium/Low\",\n"
            "      \"profit_reason\": \"...\",\n"
            "      \"monetization_angle\": \"...\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Return ONLY the raw JSON block without markdown formatting."
        )
        
        config = types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json"
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=config
        )
        
        if response and response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            return json.loads(cleaned)["trends"]
    except Exception as e:
        print(f"[⚠️] Gemini 분석 과정 실패: {e}. 기본 등급으로 설정합니다.")
    
    # Fallback
    for t in trends:
        t["profit_rating"] = "Medium"
        t["profit_reason"] = "인기 상승 트렌드 키워드"
        t["monetization_angle"] = "트랙픽 유입 확보를 목표로 하는 글쓰기 권장"
    return trends

def main():
    load_env()
    google_key = os.environ.get("GOOGLE_PAID_API_KEY") or os.environ.get("GOOGLE_OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    trends_list = get_google_daily_trends()
    enriched_trends = analyze_with_gemini(trends_list, google_key)
    
    output_dir = os.path.join(os.path.dirname(__file__), "../output")
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, "google_daily_trends.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"trends": enriched_trends}, f, ensure_ascii=False, indent=2)
        
    print(f"[✔] 구글 트렌드 및 AI 고수익 분석 완료! 저장 경로: {output_path}")
    print(json.dumps(enriched_trends, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
