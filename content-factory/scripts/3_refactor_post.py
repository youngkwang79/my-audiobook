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
        "- 마지막 트윗 형식: 본문 요약 내용 바로 아랫줄에 글 주제와 밀접하게 연관된 대표 해시태그 5개를 배치하고(예: #태그1 #태그2 #태그3 #태그4 #태그5), 그 바로 아랫줄에 블로그 주소인 blog.murimbook.com 을 아웃링크 CTA로 명확히 기재하라. (예: 해시태그 적고 한 줄 아래에 주소만 단독 표기)\n"
        "- 각 트윗(포스트)마다 글자 수 제한(한글 500자 내외)을 절대 넘지 않도록 500자 이하로 확실히 맞추어 핵심을 조화롭게 분리할 것.\n"
        "- 말투: 광고처럼 딱딱하게 쓰지 말고, 친한 친구나 지인에게 메신저로 꿀팁을 알려주듯이 아주 편안하고 친근한 말투(반말이나 해요체 혼용)를 사용하라. (예: '이거 모르면 진짜 손해임ㅋㅋ', '내가 꿀팁 하나 알려줄게!')\n"
        "- 스레드 구분: 딱딱한 '1/', '2/' 대신에 각 트윗을 빈 줄 2개(\\n\\n)로 확실히 구분하라. 이모지를 적절히 섞어 써도 좋다.\n"
        "- 중요: 인트로(예: '스레드를 작성해볼게요', '소개합니다' 등), 아웃트로, 구분선(---)을 비롯한 다른 잡설이나 설명은 절대로 적지 마라. 복사해서 바로 트위터에 올릴 수 있는 순수 스레드 내용만 즉시 출력하라."
    )
    print("🐦 X(트위터) 스레드 작성 중...")
    x_thread = call_llm(x_prompt, claude_key, openai_key, gemini_key)
    if x_thread:
        # 잡설 제거를 위해 앞뒤 공백만 제거
        clean_thread = x_thread.strip()
        
        with open(os.path.join(target_dir, "x_thread.txt"), "w", encoding="utf-8") as f:
            f.write(clean_thread)
            
    # 4. 구글 블로그(Blogger) 전용 스핀(Spin) 원고 가공
    blogger_prompt = (
        "너는 SEO 전문가이자 블로그 트래픽 유입 전문가다.\n"
        "다음 [블로그 본문]을 바탕으로, 구글 블로그(Blogger)에 업로드할 약 1000자 분량의 '스핀(Spin) 원고'를 작성하라.\n\n"
        f"[블로그 본문]:\n{blog_content}\n\n"
        "작성 지침:\n"
        "- 원본과 똑같은 문장이 하나도 없도록 어휘와 문장 구조를 완전히 새롭게 재작성하라 (유사 문서 페널티 방지).\n"
        "- 구글 블로그에서 바로 예쁘게 보이도록 HTML 태그(<p>, <br>, <strong>, <h3> 등)를 사용하여 단락을 구분하라.\n"
        "- 서론에서 독자의 강력한 호기심을 유발하고, 핵심 정보의 일부만 맛보기로 제공하라.\n"
        "- 마지막 문단에는 반드시 '이 글의 전체 내용과 핵심 꿀팁은 아래 공식 블로그에서 확인하세요!'라는 뉘앙스의 안내 문구를 적어라.\n"
        "- (주의: 실제 클릭되는 백링크 <a> 태그는 여기서 넣지 말고, 안내 텍스트만 작성하라. 백링크와 이미지는 n8n에서 동적으로 추가될 것이다.)\n"
        "- Markdown 백틱 기호(```html) 없이 순수한 HTML 코드 텍스트만 바로 출력하라."
    )
    print("📝 구글 블로그용 스핀(Spin) 원고 작성 중...")
    blogger_post = call_llm(blogger_prompt, claude_key, openai_key, gemini_key)
    if blogger_post:
        clean_blogger = blogger_post.replace("```html", "").replace("```", "").strip()
        with open(os.path.join(target_dir, "blogger_post.txt"), "w", encoding="utf-8") as f:
            f.write(clean_blogger)

    # 5. 페이스북 & 인스타그램용 캡션(글밥) 가공
    sns_caption_prompt = (
        "너는 페이스북과 인스타그램의 도달률과 참여도를 극대화하는 전문 SNS 마케터다.\n"
        "다음 [블로그 본문]을 바탕으로, 카드뉴스나 릴스(숏폼) 영상 업로드 시 본문에 함께 작성할 '페이스북/인스타 특유의 매력적인 캡션(글밥)'을 작성하라.\n\n"
        f"[블로그 본문]:\n{blog_content}\n\n"
        "작성 지침:\n"
        "- 첫 줄: 호기심을 유발하는 자극적이거나 공감대를 형성하는 한 줄 카피 (이모지 필수 포함).\n"
        "- 본문: 가독성이 좋게 이모지를 적절히 섞어 3~4개의 핵심 포인트로 나누어 줄바꿈을 깔끔하게 하라.\n"
        "- 어조: 친근하면서도 정보를 명확히 제공하는 톤앤매너 (~해요, ~세요 처럼 친근한 존댓말로 통일).\n"
        "- 끝맺음: '더 자세한 꿀팁과 전체 내용은 프로필 링크(또는 블로그 blog.murimbook.com)에서 확인해보세요!' 라는 아웃링크 CTA 문구를 명확히 작성.\n"
        "- 해시태그: 맨 마지막 줄에 관련도 높은 인기 해시태그를 10개 이상 작성하라. (예: #반도체 #투자 #재테크...)\n"
        "- 불필요한 인사말이나 부가 설명('작성한 캡션입니다' 등)은 완전히 제외하고 오직 페이스북/인스타에 바로 복사 붙여넣기할 순수 캡션 내용만 즉시 출력하라."
    )
    print("📱 페이스북/인스타용 캡션(글밥) 작성 중...")
    sns_caption = call_llm(sns_caption_prompt, claude_key, openai_key, gemini_key)
    if sns_caption:
        clean_caption = sns_caption.strip()
        with open(os.path.join(target_dir, "sns_caption.txt"), "w", encoding="utf-8") as f:
            f.write(clean_caption)
            
    print(f"\n✅ '{args.dir}' 플랫폼 리팩토링 산출물이 모두 저장되었습니다!")
    print(f"📁 대상 폴더: {target_dir}")

if __name__ == "__main__":
    main()
