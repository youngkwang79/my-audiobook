import os
import sys
import json
import argparse
import sqlite3
from google import genai

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
            return templates.get("generate_blog", {}).get("system_prompt", "")
    return ""

def get_existing_posts_for_linking():
    db_path = os.path.join(os.path.dirname(__file__), "../data/history.db")
    posts = []
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT keyword, post_url FROM post_history WHERE post_url IS NOT NULL LIMIT 100")
            posts = [{"keyword": row[0], "url": row[1]} for row in cursor.fetchall()]
            conn.close()
        except Exception as e:
            print(f"[*] 이전 포스트 히스토리 로드 실패: {e}")
    return posts

def generate_with_claude(system_prompt, user_prompt, api_key):
    import requests
    import time
    import json
    
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    data = {
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 8192,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt}
        ]
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=120)
            if response.status_code == 200:
                result = response.json()
                return result['content'][0]['text']
            else:
                print(f"Claude API 호출 실패 (상태 코드 {response.status_code}): {response.text}")
                if attempt < max_retries - 1:
                    time.sleep(3)
                else:
                    return None
        except Exception as e:
            print(f"Claude API 예외 발생 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(3)
            else:
                return None
    return None

# Google-GenAI SDK 활용한 우회 생성기
def generate_with_gemini_sdk(system_prompt, user_prompt, api_key):
    import time
    max_retries = 3
    for attempt in range(max_retries):
        try:
            client = genai.Client(api_key=api_key)
            combined_prompt = f"{system_prompt}\n\n[User Request]\n{user_prompt}"
            
            from google.genai import types
            config = types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=combined_prompt,
                config=config
            )
            
            if response and response.text:
                return response.text
            return None
        except Exception as e:
            print(f"Gemini SDK 호출 실패 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(3)
            else:
                return None
    return None

def fallback_regex_parse(raw_text):
    import re
    data = {}
    
    # Extract title
    title_match = re.search(r'"title"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if title_match:
        data["title"] = title_match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
        
    # Extract meta_description
    meta_match = re.search(r'"meta_description"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if meta_match:
        data["meta_description"] = meta_match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
        
    # Extract slug
    slug_match = re.search(r'"slug"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if slug_match:
        data["slug"] = slug_match.group(1).strip()
        
    # Extract tags
    tags_match = re.search(r'"tags"\s*:\s*\[(.*?)\]', raw_text, re.DOTALL)
    if tags_match:
        tags_str = tags_match.group(1)
        data["tags"] = [t.strip().strip('"\'') for t in tags_str.split(",") if t.strip()]
        
    # Extract json_ld
    json_ld_match = re.search(r'"json_ld"\s*:\s*(\{.*?\})', raw_text, re.DOTALL)
    if json_ld_match:
        try:
            data["json_ld"] = json.loads(json_ld_match.group(1), strict=False)
        except:
            pass
            
    # Extract content_markdown safely (try bounded match first, then greedy fallback)
    # 1st attempt: try properly bounded JSON extraction (e.g., ends with "}  or }\n```)
    bounded_match = re.search(r'"content_markdown"\s*:\s*"(.*?)(?<!\\)"\s*[\},]', raw_text, re.DOTALL)
    if bounded_match:
        content_str = bounded_match.group(1).strip()
    else:
        # 2nd attempt: greedy match to end-of-string (for truncated responses)
        greedy_match = re.search(r'"content_markdown"\s*:\s*"(.*)', raw_text, re.DOTALL)
        if greedy_match:
            content_str = greedy_match.group(1).strip()
            # Remove trailing markdown fences
            if content_str.endswith("```"):
                content_str = content_str[:-3].strip()
            # Remove trailing closing JSON artifacts like "} or "}
            content_str = re.sub(r'"\s*\}\s*$', '', content_str)
            content_str = re.sub(r'"\s*,\s*"json_ld".*$', '', content_str, flags=re.DOTALL)
            if content_str.endswith('"') and not content_str.endswith('\\"'):
                content_str = content_str[:-1]
        else:
            content_str = None

    if content_str is not None:
        # Remove any duplicate content: if the model accidentally appended the raw markdown
        # again after the JSON closes, truncate at the second occurrence of a markdown H1 heading.
        # Heuristic: look for a second `# ` heading that starts from a newline after the first 500 chars.
        raw_content_decoded = content_str.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
        dup_match = re.search(r'\n# .+\n', raw_content_decoded[500:])
        if dup_match:
            raw_content_decoded = raw_content_decoded[:500 + dup_match.start()]
        data["content_markdown"] = raw_content_decoded
        
    return data

def repair_json_string(raw_text):
    import re
    cleaned = raw_text.strip()
    
    # 1. Clean markdown fences
    json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group(1).strip()
    else:
        brace_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if brace_match:
            cleaned = brace_match.group(0).strip()
            
    # 2. Fix missing commas between double-quoted values (e.g., in array: "val1" "val2")
    cleaned = re.sub(r'"\s+"', '", "', cleaned)
            
    # 2. Temporarily extract content_markdown to avoid messing it up
    content_pattern = r'"content_markdown"\s*:\s*"(.*)"\s*\}\s*$'
    content_match = re.search(content_pattern, cleaned, re.DOTALL)
    if not content_match:
        content_pattern = r'"content_markdown"\s*:\s*"(.*)"'
        content_match = re.search(content_pattern, cleaned, re.DOTALL)
        
    content_str = None
    if content_match:
        content_str = content_match.group(1)
        cleaned = cleaned.replace(content_str, "__CONTENT_MARKDOWN_PLACEHOLDER__")
        
    # 3. Escape double quotes in other string fields
    keys = ["title", "meta_description", "slug"]
    for key in keys:
        pattern = r'"' + key + r'"\s*:\s*"(.*?)"\s*(,\s*"|\}\s*$)'
        match = re.search(pattern, cleaned, re.DOTALL)
        if match:
            val = match.group(1)
            escaped_val = re.sub(r'(?<!\\)"', r'\"', val)
            cleaned = cleaned.replace(f'"{val}"', f'"{escaped_val}"')
            
    # 4. Put content_markdown back with escaped internal quotes
    if content_str is not None:
        escaped_content = re.sub(r'(?<!\\)"', r'\"', content_str)
        cleaned = cleaned.replace("__CONTENT_MARKDOWN_PLACEHOLDER__", escaped_content)
        
    return cleaned

def main():
    parser = argparse.ArgumentParser(description="AI 기반 SEO 블로그 글 자동 생성")
    parser.add_argument("--keyword", type=str, required=True, help="작성하고자 하는 핵심 롱테일 키워드")
    parser.add_argument("--title", type=str, required=False, help="추천 제목 (옵션)")
    parser.add_argument("--extra_fact", type=str, required=False, help="작성 시 참고해야 할 구체적인 팩트 수치나 타겟 URL (옵션)")
    parser.add_argument("--top_rank_post_summary", type=str, required=False, help="참고 및 가공할 최상단 노출 블로그 글의 본문/요약본 (옵션)")
    args = parser.parse_args()
    
    load_env()
    
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    google_key = os.environ.get("GOOGLE_PAID_API_KEY") or os.environ.get("GOOGLE_OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if not (anthropic_key or google_key):
        print("⚠️ Error: ANTHROPIC_API_KEY 또는 GOOGLE_PAID_API_KEY가 .env.local에 필요합니다.")
        sys.exit(1)
        
    title = args.title if args.title else f"{args.keyword}에 대한 상세 해결 가이드"
    
    system_prompt = load_prompt_template()
    if not system_prompt:
        print("⚠️ Error: prompt_templates.json 로드 실패.")
        sys.exit(1)
        
    existing_posts = get_existing_posts_for_linking()
    existing_posts_str = json.dumps(existing_posts, ensure_ascii=False) if existing_posts else "None"
    
    extra_fact_text = f"\n\n[🔥 CRITICAL FACT / TARGET URL TO INCLUDE]:\n{args.extra_fact}\nIMPORTANT: You must base your writing on the above fact or URL primarily." if args.extra_fact else ""
    
    spin_reference = ""
    if args.top_rank_post_summary:
        spin_reference = (
            f"\n\n[상위 노출 블로그 글 참고 자료 (구조 및 핵심 내용)]:\n{args.top_rank_post_summary}\n"
            f"CRITICAL: 상기 노출 중인 최상단 글의 논리 구조, 소주제 흐름, 그리고 핵심 팩트 정보를 철저히 참고하여 작성하십시오. "
            f"단, 검색 엔진의 유사 문서 판정을 피하기 위해 문장 구조와 단어 선택을 100% 새롭게 재작성(Spin/Rewrite)해야 하며, 똑같은 문장이 하나도 없어야 합니다."
        )
        
    user_prompt = (
        f"[Target Keyword]: {args.keyword}\n"
        f"[Suggested Title]: {title}{extra_fact_text}{spin_reference}\n\n"
        f"[Existing Posts for Internal Linking Reference]:\n{existing_posts_str}\n\n"
        f"Please write a highly relevant post in Korean. If you find keywords from the 'Existing Posts' list naturally in your content, wrap them with anchor links like: [Keyword](Existing Post URL)."
    )
    
    print(f"✍️ 키워드 '{args.keyword}'로 고수익 블로그 포스트 생성을 시작합니다...")
    
    raw_response = None
    # 클로드 임시 비활성화 (제미나이 2.5 플래시 바로 사용)
    # if anthropic_key:
    #     print("🤖 Anthropic Claude (claude-3-5-sonnet-20240620) 모델로 생성을 시도합니다...")
    #     raw_response = generate_with_claude(system_prompt, user_prompt, anthropic_key)
        
    if not raw_response:
        if google_key:
            print("🤖 Google Gemini SDK (gemini-2.5-flash) 모델로 생성을 시작합니다...")
            raw_response = generate_with_gemini_sdk(system_prompt, user_prompt, google_key)
        elif anthropic_key:
            print("🤖 Anthropic Claude (claude-3-5-sonnet-20240620) 모델로 생성을 시도합니다...")
            raw_response = generate_with_claude(system_prompt, user_prompt, anthropic_key)
        else:
            print("❌ 콘텐츠 생성에 최종 실패했습니다. API 키가 지정되지 않았습니다.")
            sys.exit(1)
            
    if not raw_response:
        print("❌ 콘텐츠 생성에 최종 실패했습니다. API 키나 크레딧 상태를 점검하세요.")
        sys.exit(1)
        
    try:
        import re
        cleaned_response = raw_response.strip()
        
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', cleaned_response, re.DOTALL)
        if json_match:
            cleaned_response = json_match.group(1).strip()
        else:
            brace_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
            if brace_match:
                cleaned_response = brace_match.group(0).strip()
                
        # Apply automatic JSON string repair before parsing
        repaired_json = repair_json_string(cleaned_response)
        try:
            parsed_data = json.loads(repaired_json, strict=False)
        except Exception as json_err:
            print(f"[*] json.loads 실패, 정규식을 통한 Fallback 파싱을 진행합니다: {json_err}")
            parsed_data = fallback_regex_parse(raw_response)
            if not parsed_data.get("content_markdown"):
                raise json_err
    except Exception as e:
        print(f"❌ 생성된 결과의 JSON 파싱 실패: {e}")
        print("Raw Response:", raw_response)
        sys.exit(1)
        
    sanitized_keyword = "".join(x for x in args.keyword if x.isalnum() or x in " -_").strip().replace(" ", "_")
    output_dir = os.path.join(os.path.dirname(__file__), f"../output/{sanitized_keyword}")
    os.makedirs(output_dir, exist_ok=True)
    
    content_md = parsed_data.get("content_markdown", "")
    json_ld_data = parsed_data.get("json_ld", None)

    post_path = os.path.join(output_dir, "blog_post.md")
    with open(post_path, "w", encoding="utf-8") as f:
        f.write(content_md)
        
    seo_path = os.path.join(output_dir, "seo_meta.json")
    seo_meta = {
        "title": parsed_data.get("title", title),
        "meta_description": parsed_data.get("meta_description", ""),
        "slug": parsed_data.get("slug", sanitized_keyword.lower().replace("_", "-")),
        "tags": parsed_data.get("tags", []),
        "json_ld": json_ld_data or {}
    }
    with open(seo_path, "w", encoding="utf-8") as f:
        json.dump(seo_meta, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ 블로그 글과 SEO 메타데이터가 성공적으로 생성되었습니다!")
    print(f"📁 블로그 포스트 저장 경로: {post_path}")
    print(f"📁 SEO 메타데이터 저장 경로: {seo_path}")

if __name__ == "__main__":
    main()
