import os
import sys
import json
import argparse
import requests
from google import genai
from google.genai import types

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

def call_llm(prompt, claude_key, openai_key, gemini_key):
    if claude_key:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": claude_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 3000,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            return response.json()['content'][0]['text']
        except Exception as e:
            print(f"Claude API 호출 실패: {e}")

    if openai_key:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            print(f"OpenAI API 호출 실패: {e}")

    if gemini_key:
        try:
            client = genai.Client(api_key=gemini_key)
            config = types.GenerateContentConfig(temperature=0.3)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=config
            )
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"Gemini API 호출 실패: {e}")

    return None

def main():
    parser = argparse.ArgumentParser(description="블로그 마크다운 글을 멀티 플랫폼 포맷으로 리팩토링")
    parser.add_argument("--dir", type=str, required=True, help="블로그 마크다운 파일(blog_post.md)이 있는 키워드 폴더명")
    args = parser.parse_args()
    
    load_env()
    
    claude_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GOOGLE_PAID_API_KEY") or os.environ.get("GOOGLE_OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if not claude_key and not openai_key and not gemini_key:
        print("⚠️ Error: ANTHROPIC_API_KEY, OPENAI_API_KEY 또는 GOOGLE_API_KEY가 .env.local에 필요합니다.")
        sys.exit(1)
        
    target_dir = os.path.join(os.path.dirname(__file__), f"../output/{args.dir}")
    post_path = os.path.join(target_dir, "blog_post.md")
    
    if not os.path.exists(post_path):
        print(f"❌ '{post_path}' 파일을 찾을 수 없습니다.")
        sys.exit(1)
        
    with open(post_path, "r", encoding="utf-8") as f:
        blog_content = f.read()
        
    print(f"🔄 '{args.dir}' 블로그 마크다운 포스트 리팩토링을 가동합니다...")
    
    # 1. 쇼츠 대본 가공
    shorts_prompt = (
        "너는 인스타그램 릴스, 유튜브 쇼츠, 틱톡의 조회수를 떡상시키는 숏폼 콘텐츠 크리에이터다.\n"
        "다음 [블로그 본문]을 요약 및 가공하여 45초 내외의 흥미진진한 유튜브 쇼츠 대본을 작성하라.\n\n"
        f"[블로그 본문]:\n{blog_content}\n\n"
        "작성 공식:\n"
        "- [화면 가이드]와 [나레이션]을 분리해서 작성하라.\n"
        "- 0~3초: 호기심을 유발하는 Hook 문장.\n"
        "- 3~15초: 공감하는 문제 상황 제시.\n"
        "- 15~40초: 누구나 바로 따라 할 수 있는 초간단 핵심 해결 방법 1가지.\n"
        "- 40~45초: 상세 코드는 고정 댓글 링크의 블로그로 오라는 CTA.\n"
        "- 대본은 한국어로 작성하되 신나고 에너지 넘치는 톤을 유지하라."
    )
    print("🎥 쇼츠 대본 생성 중...")
    shorts_script = call_llm(shorts_prompt, claude_key, openai_key, gemini_key)
    if shorts_script:
        with open(os.path.join(target_dir, "shorts_script.txt"), "w", encoding="utf-8") as f:
            f.write(shorts_script)
            
    # 2. 카드뉴스 가공
    card_prompt = (
        "너는 인스타그램 카드뉴스를 제작하는 비주얼 콘텐츠 디자이너다.\n"
        "다음 [블로그 본문]을 5장의 카드뉴스 카피 및 기획안 형태로 가공하라. 결과는 아래 JSON 구조로만 출력하라.\n\n"
        "{\n"
        "  \"cards\": [\n"
        "    {\"slide\": 1, \"title\": \"표지 제목(도발적이고 직관적)\", \"visual_desc\": \"배경 및 비주얼 이미지 추천 설명\"},\n"
        "    {\"slide\": 2, \"title\": \"소주제\", \"content\": \"본문 2~3줄 요약\", \"visual_desc\": \"비주얼 매치 가이드\"},\n"
        "    {\"slide\": 3, \"title\": \"해결법 1\", \"content\": \"직관적 설명\", \"visual_desc\": \"비주얼 매치 가이드\"},\n"
        "    {\"slide\": 4, \"title\": \"해결법 2\", \"content\": \"직관적 설명\", \"visual_desc\": \"비주얼 매치 가이드\"},\n"
        "    {\"slide\": 5, \"title\": \"마무리 및 CTA\", \"content\": \"팔로우 유도 및 프로필 링크 블로그 방문\", \"visual_desc\": \"비주얼 매치 가이드\"}\n"
        "  ]\n"
        "}\n\n"
        f"[블로그 본문]:\n{blog_content}\n\n"
        "출력 시 JSON 규격을 정확히 지켜 마크다운 백틱 없이 순수 JSON 텍스트로만 반환하라."
    )
    print("🖼️ 카드뉴스 기획안 생성 중...")
    card_json = call_llm(card_prompt, claude_key, openai_key, gemini_key)
    if card_json:
        # 백틱 기호 정비
        clean_json = card_json.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(clean_json)
            with open(os.path.join(target_dir, "card_news.json"), "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
        except Exception as je:
            print("카드뉴스 JSON 파싱 실패, 텍스트 파일로 저장합니다.")
            with open(os.path.join(target_dir, "card_news_raw.txt"), "w", encoding="utf-8") as f:
                f.write(card_json)
                
    # 3. X(트위터) 스레드 가공
    x_prompt = (
        "너는 X(구 트위터)에서 유용한 정보성 쓰레드를 작성하는 테크 인플루언서다.\n"
        "다음 [블로그 본문]을 바탕으로, 리트윗을 유도하고 조회수가 잘 나올 수 있는 4~5개 트윗으로 연동된 스레드 타래를 작성하라.\n\n"
        f"[블로그 본문]:\n{blog_content}\n\n"
        "지침:\n"
        "- 1번 트윗: 클릭을 누르게 만드는 고통 공감/흥미 유발 오프닝.\n"
        "- 2~4번 트윗: 원인 요약 및 핵심 해결책(텍스트나 심플 코드로 쉽게 카피 가능하게).\n"
        "- 마지막 트윗: 상세 내용과 전체 해결 코드는 내 블로그 링크(예: [블로그 링크])에서 확인하라는 아웃링크 CTA.\n"
        "- 각 트윗마다 글자 수 제한(한글 140자 내외)에 걸리지 않도록 핵심만 간결하게 분리할 것.\n"
        "- 번호(1/, 2/...) 형식으로 표기하라.\n"
        "- 중요: 인트로(예: '스레드를 작성해볼게요', '소개합니다' 등), 아웃트로, 구분선(---)을 비롯한 다른 잡설이나 설명은 절대로 적지 마라. 복사해서 바로 트위터에 올릴 수 있는 순수 스레드 내용(1/, 2/...)만 즉시 출력하라."
    )
    print("🐦 X(트위터) 스레드 작성 중...")
    x_thread = call_llm(x_prompt, claude_key, openai_key, gemini_key)
    if x_thread:
        # 혹시 AI가 잡설을 붙였을 경우를 대비해 스레드 번호 시작 지점부터 잘라내는 후처리
        clean_thread = x_thread.strip()
        # "1/" 또는 "1/5" 같은 패턴으로 시작하는 곳 이전의 텍스트가 있다면 제거
        import re
        start_match = re.search(r'(1/\d+|1/\s)', clean_thread)
        if start_match:
            clean_thread = clean_thread[start_match.start():]
        
        with open(os.path.join(target_dir, "x_thread.txt"), "w", encoding="utf-8") as f:
            f.write(clean_thread)
            
    print(f"\n✅ '{args.dir}' 플랫폼 리팩토링 산출물이 모두 저장되었습니다!")
    print(f"📁 대상 폴더: {target_dir}")

if __name__ == "__main__":
    main()
