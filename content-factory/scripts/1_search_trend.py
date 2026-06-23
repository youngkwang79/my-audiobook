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
    
    response = None
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
            
        try:
            return json.loads(content)
        except Exception as je:
            print(f"[⚠️] Perplexity 결과를 JSON으로 파싱하는데 실패했습니다. Gemini를 통해 자동 강제 복구를 진행합니다. 에러: {je}")
            google_key = os.environ.get("GOOGLE_PAID_API_KEY") or os.environ.get("GOOGLE_OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            recovered = format_with_gemini(content, google_key)
            if recovered:
                return recovered
            raise je
    except Exception as e:
        print(f"Perplexity API 호출 실패: {e}")
        if response:
            print("Response:", response.text)
        sys.exit(1)

def format_with_gemini(raw_text, api_key):
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        
        prompt = (
            "다음 텍스트를 분석하여 아래 요구되는 JSON 포맷으로 반드시 파싱/변환하여 출력해줘. 다른 텍스트 설명 없이 순수 JSON만 반환해.\n\n"
            f"[원본 텍스트]:\n{raw_text}\n\n"
            "JSON 구조:\n"
            "{\n"
            "  \"trends\": [\n"
            "    {\n"
            "      \"keyword\": \"Adsense-optimized keyword combination (WordPress version)\",\n"
            "      \"intent\": \"informational / transactional\",\n"
            "      \"search_intent_description\": \"Detailed explanation of search intent\",\n"
            "      \"content_gap_reason\": \"Why existing results need optimization\",\n"
            "      \"suggested_title\": \"A highly clickable, emotionally hooky title in Korean\",\n"
            "      \"combo_type\": \"wordpress\",\n"
            "      \"top_rank_post_summary\": \"Detailed summary of the #1 ranking post's content, structure, key numeric facts, and logical flow that we will rewrite/spin.\"\n"
            "    },\n"
            "    {\n"
            "      \"keyword\": \"A different Adsense-optimized keyword combination (Blogger version)\",\n"
            "      \"intent\": \"informational / transactional\",\n"
            "      \"search_intent_description\": \"Detailed explanation of search intent\",\n"
            "      \"content_gap_reason\": \"Why existing results need optimization\",\n"
            "      \"suggested_title\": \"A different highly clickable title in Korean\",\n"
            "      \"combo_type\": \"blogger\",\n"
            "      \"top_rank_post_summary\": \"Detailed summary of the #1 ranking post's content, structure, key numeric facts, and logical flow for this second keyword combination.\"\n"
            "    }\n"
            "  ]\n"
            "}"
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
            return json.loads(cleaned)
    except Exception as ge:
        print(f"Gemini를 통한 JSON 강제 복구 실패: {ge}")
    return None

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
