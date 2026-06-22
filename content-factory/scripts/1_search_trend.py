import os
import sys
import json
import argparse
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

def load_prompt_template():
    template_path = os.path.join(os.path.dirname(__file__), "../config/templates/prompt_templates.json")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            templates = json.load(f)
            return templates.get("search_trend", {}).get("system_prompt", "")
    return ""

def load_high_cpc_seeds():
    seeds_path = os.path.join(os.path.dirname(__file__), "../data/high_cpc_seeds.json")
    if os.path.exists(seeds_path):
        with open(seeds_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def fetch_perplexity_trends(query):
    api_key = os.environ.get("PERPLEXITY_API_KEY")
    if not api_key:
        print("⚠️ Error: PERPLEXITY_API_KEY가 .env.local에 설정되어 있지 않습니다.")
        sys.exit(1)
        
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 설정 분리된 고품질 프롬프트 템플릿 로딩
    system_prompt = load_prompt_template()
    if not system_prompt:
        print("⚠️ Warning: 프롬프트 템플릿 로딩 실패, 기본 프롬프트 사용.")
        system_prompt = "You are a professional SEO analyst. Find 3 high-value, low-competition long-tail keywords for the topic."
    
    # 금융/재테크 고단가 씨앗 정보 로드
    seeds_data = load_high_cpc_seeds()
    seeds_str = json.dumps(seeds_data, ensure_ascii=False)
    
    user_message = (
        f"Topic: '{query}'\n"
        f"Refer to the following high CPC/RPM category database to prioritize financially profitable search intent:\n"
        f"{seeds_str}\n\n"
        f"Please analyze real-time search trends and generate 3 long-tail keyword suggestions optimized for Google Adsense monetization (focusing on high CPC, transactional/informational search intents like comparisons, conditions, and saving guides)."
    )
    
    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.2
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        content = data['choices'][0]['message']['content'].strip()
        
        # 마크다운 블록 파싱 제거
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Perplexity API 호출 실패: {e}")
        if 'response' in locals() and response:
            print("Response:", response.text)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Perplexity API 활용 롱테일 트렌드 분석")
    parser.add_argument("--query", type=str, required=True, help="분석하고자 하는 대주제 키워드")
    args = parser.parse_args()
    
    load_env()
    
    print(f"🔍 '{args.query}'에 대해 Perplexity 실시간 검색 엔진으로 롱테일 키워드 분석을 시작합니다...")
    result = fetch_perplexity_trends(args.query)
    
    # 출력 및 저장
    output_dir = os.path.join(os.path.dirname(__file__), "../output")
    os.makedirs(output_dir, exist_ok=True)
    
    sanitized_query = "".join(x for x in args.query if x.isalnum() or x in " -_").strip().replace(" ", "_")
    output_path = os.path.join(output_dir, f"trends_{sanitized_query}.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ 분석이 완료되었습니다!")
    print(f"📁 결과 저장 경로: {output_path}")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
