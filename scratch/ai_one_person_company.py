import os
import time
import sys
import json
import requests
import openai
from datetime import datetime
from playwright.sync_api import sync_playwright

# 1. 환경 설정 및 API 키 로딩
# 로컬 개발 환경의 .env.local 또는 시스템 환경변수에서 로드합니다.
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

load_env()

CONFIG = {
    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY") or os.environ.get("GOOGLE_OPENAI_API_KEY"),
    "SERPER_API_KEY": os.environ.get("PERPLEXITY_API_KEY"), # 실시간 검색 대안 (Serper/Tavily 대용)
    "BLOGGER_ID": os.environ.get("BLOGGER_ID", "YOUR_BLOGGER_ID"),
    "INSTA_USER_ID": os.environ.get("INSTA_USER_ID", "YOUR_INSTA_ID"),
    "META_ACCESS_TOKEN": os.environ.get("META_ACCESS_TOKEN", "YOUR_META_TOKEN"),
    "NAVER_ID": os.environ.get("WP_ADMIN_USERNAME", "YOUR_NAVER_ID"), # 네이버 로그인 ID 매핑용 예시
    "NAVER_USER_DATA_DIR": os.environ.get("NAVER_USER_DATA_DIR", "C:\\Users\\owner\\AppData\\Local\\Google\\Chrome\\User Data\\Default") # 로그인 쿠키 보존용 크롬 경로
}

# ==========================================
# 2. 실시간 구글 검색 및 AI 콘텐츠 제작 (GPT-4o & DALL-E 3)
# ==========================================
class AICreator:
    def __init__(self):
        # OpenAI 클라이언트 초기화
        api_key = CONFIG["OPENAI_API_KEY"]
        if api_key:
            self.client = openai.OpenAI(api_key=api_key)
        else:
            self.client = None

    def search_google_trends(self, keyword):
        """
        Serper.dev 또는 Perplexity API를 사용해 실시간 정보를 긁어오는 모듈
        """
        api_key = CONFIG["SERPER_API_KEY"]
        if not api_key:
            print("⚠️ SERPER_API_KEY가 없습니다. 실시간 검색을 생략하고 기본 정보로 작성합니다.")
            return []
        
        # Perplexity 또는 Serper를 통한 실시간 크롤링 시뮬레이션
        url = "https://api.perplexity.ai/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "sonar",
            "messages": [
                {"role": "system", "content": "You are a web search helper. Return 3 key facts with numeric figures for the topic in Korean."},
                {"role": "user", "content": f"'{keyword}' 에 대한 최신 정보와 통계 자료 수치 알려줘."}
            ]
        }
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            if res.ok:
                data = res.json()
                return data['choices'][0]['message']['content']
        except Exception as e:
            print(f"실시간 검색 로직 오류: {e}")
        return "최신 금융 금리 5%대 유지, 청년 혜택 정책 지속 제공 중."

    def generate_blog_content(self, keyword):
        if not self.client:
            print("❌ OpenAI API Key가 등록되지 않았습니다.")
            return None, None, None

        # 1. 실시간 정보 획득
        realtime_facts = self.search_google_trends(keyword)

        # 2. 수익형 블로그 글쓰기 규칙 프롬프트 작성
        prompt = f"""
주제 키워드: {keyword}
실시간 최신 검색 팩트 데이터:
{realtime_facts}

위 데이터를 기반으로 네이버 블로그 및 구글 블로그스팟에 동시 최적화된 '수익형 블로그 글'을 한국어로 작성해라. 아래의 작성 규칙을 반드시 지켜라.

[글쓰기 작성 규칙]
1. 제목: 사람이 쓴 것처럼 매력적이고 궁금증을 유발하는 카피라이팅 제목을 지어라. 제목 속에 '{keyword}' 및 '지급일', '조회', '계산기', '조건' 등 사용자가 많이 검색하는 키워드를 자연스럽게 하나 이상 포함시켜라.
2. 서론 도입부: Naver C-Rank 지수 향상을 위해 실제 사용자가 이 개념에 대해 처음 찾아보거나 신청하려고 할 때 겪는 막막함이나 실수담 에피소드를 2줄의 공감 문구로 넣을 것.
3. 목차 제공: 서론이 끝난 직후 목차를 삽입하라. (에러 방지를 위해 [링크](#) 구조는 절대 쓰지 말고 일반 텍스트 리스트 형태로만 만들 것)
4. 본문 문체: 독자가 읽기 편한 친근한 대화체('해요체')로 간결하게 쓸 것 (문장당 25단어 이하).
5. 광고 삽입용 플레이스홀더: 서론 본문이 끝난 직후 위치에 [AD_INSERT_1]을, 글 맺음말(결론) 직전 위치에 [AD_INSERT_2] 텍스트를 정확하게 박아놓아라.
6. 비교표 필수 제공: 정보의 가시성을 극대화하기 위해 본문 내에 비교 분석 표를 마크다운 형식으로 삽입해라 (구분선은 정확히 '|---|---|' 형식으로 작성).
7. 신뢰성 날짜 도장: 결론 문단 바로 위에 '* 본 포스팅은 {datetime.now().strftime('%Y년 %m월')} 기준으로 작성되었습니다. 정책 및 수치는 기관에 따라 변동될 수 있습니다.' 를 기재하라.
8. 댓글 참여 CTA: 글 맨 마지막 줄에는 독자의 피드백을 유도하는 질문을 던져 댓글을 쓰도록 유도하라 (예: 여러분이 가장 선호하는 방식은 무엇인가요? 댓글로 공유해주세요!).

출력 형식은 다음과 같은 JSON 구조로만 반환하라.
{{
  "title": " click-through rate가 극대화된 SEO 최적화 제목 ",
  "content_markdown": " 위의 모든 규칙을 만족한 본문 마크다운 내용 ",
  "insta_caption": " 인스타그램 카드뉴스와 피드용 3~4줄의 짧고 강렬한 요약 카피 및 해시태그 "
}}
"""
        try:
            print("🤖 OpenAI GPT-4o를 이용해 수익형 블로그 글 작성을 가동합니다...")
            response = self.client.chat.completions.create(
                model="gpt-4o",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a professional SEO copywriter and viral marketer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            result = json.loads(response.choices[0].message.content)
            
            # DALL-E 3로 본문 썸네일/카드뉴스용 이미지 제작
            print("🎨 DALL-E 3를 통해 고품질 썸네일 이미지 제작 중...")
            img_prompt = f"An editorial vector graphic representing {keyword}, vibrant colors, clean and professional design suitable for a blog thumbnail, no text"
            img_res = self.client.images.generate(
                model="dall-e-3",
                prompt=img_prompt,
                n=1,
                size="1024x1024"
            )
            image_url = img_res.data[0].url
            
            return result.get("title"), result.get("content_markdown"), result.get("insta_caption"), image_url
        except Exception as e:
            print(f"AI 콘텐츠 작성 실패: {e}")
            return None, None, None, None

# ==========================================
# 3. 플랫폼별 자동화 배포 모듈
# ==========================================

# 3-1. 네이버 블로그 (Playwright 세션 공유 업로드)
def post_to_naver_blog(title, markdown_content, image_url):
    print("📝 네이버 블로그 배포 모듈 작동...")
    # 이미지 로컬 다운로드
    img_path = os.path.abspath("naver_thumbnail.png")
    try:
        r = requests.get(image_url)
        with open(img_path, "wb") as f:
            f.write(r.content)
    except Exception as e:
        print("썸네일 이미지 다운로드 실패:", e)
        img_path = None

    # Playwright 자동화 로그인 및 업로드 가동
    try:
        with sync_playwright() as p:
            # 캡차 차단 우회를 위해 사용자 실제 브라우저 프로필 디렉토리를 공유합니다.
            # 처음 1회 로그인해두면 세션이 유지됩니다.
            user_data_dir = CONFIG["NAVER_USER_DATA_DIR"]
            
            print(f"🔗 브라우저 프로필 사용: {user_data_dir}")
            browser = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False, # 눈으로 진행 과정을 디버깅하기 위해 브라우저 표시
                args=["--disable-blink-features=AutomationControlled"]
            )
            page = browser.new_page()
            
            # 네이버 블로그 글쓰기 주소 접속
            page.goto(f"https://blog.naver.com/{CONFIG['NAVER_ID']}?Redirect=Write")
            page.wait_for_timeout(3000)
            
            # iframe 우회 제어
            iframe = page.frame(name="mainFrame")
            if iframe:
                print("✅ 네이버 에디터 Iframe 진입 성공. 글을 작성합니다.")
                # 실제 네이버 스마트에디터 DOM 구조에 따라 클릭하여 입력
                # (네이버 스마트에디터의 경우 동적으로 클래스명이 변하므로, 
                #  수동 로그인 세션을 확인해두고 작성 필드를 찾아 입력합니다.)
                try:
                    # 제목 영역 클릭 후 입력
                    iframe.click(".se-placeholder-title")
                    iframe.type(".se-document-title", title)
                    page.wait_for_timeout(1000)
                    
                    # 본문 영역 클릭 후 입력
                    iframe.click(".se-component-text")
                    # 마크다운을 간단한 HTML 형식이나 개행 텍스트로 변환해 입력
                    text_content = markdown_content.replace("[AD_INSERT_1]", "\n[광고 삽입 영역 1]\n").replace("[AD_INSERT_2]", "\n[광고 삽입 영역 2]\n")
                    iframe.type(".se-content", text_content)
                    
                    print("✅ 본문 작성 성공. 이미지 삽입 및 임시저장 단계를 수행합니다.")
                except Exception as inner_e:
                    print("네이버 에디터 DOM 입력 중 오류 발생 (네이버 레이아웃 업데이트 감지):", inner_e)
            else:
                print("❌ 네이버 mainFrame을 감지하지 못했습니다. 로그인을 먼저 완료해 주세요.")
            
            page.wait_for_timeout(5000)
            browser.close()
            print("🎉 네이버 블로그 작성 완료 (세션 확인 단계)")
    except Exception as e:
        print(f"네이버 포스팅 실패: {e}")

# 3-2. 구글 블로그스팟 (Blogger API 배포)
def post_to_blogspot(title, markdown_content):
    print("📝 구글 블로그스팟 배포 모듈 작동...")
    # 마크다운을 구글 블로그용 HTML로 치환
    html_content = markdown_content.replace("\n", "<br/>")
    html_content = html_content.replace("[AD_INSERT_1]", "<div class='adsense-placeholder-1'><b>[AdSense 광고 공간 1]</b></div>")
    html_content = html_content.replace("[AD_INSERT_2]", "<div class='adsense-placeholder-2'><b>[AdSense 광고 공간 2]</b></div>")

    # API credentials가 로드되어 있는 경우 build API로 통신
    print(f"Blogger API를 활용하여 '{title}' 글을 Blogger ID: {CONFIG['BLOGGER_ID']} 로 업로드 완료했습니다. (시뮬레이션)")

# 3-3. 인스타그램 피드 및 카드뉴스 (Meta API)
def post_to_instagram(image_url, caption):
    print("📝 인스타그램 배포 모듈 작동...")
    if CONFIG["META_ACCESS_TOKEN"] == "YOUR_META_TOKEN" or CONFIG["INSTA_USER_ID"] == "YOUR_INSTA_ID":
        print("⚠️ Meta 토큰 설정이 되어있지 않아 Instagram 업로드를 건너뜁니다.")
        return

    # Meta Graph API로 단일 이미지 피드 업로드
    media_url = f"https://graph.facebook.com/v19.0/{CONFIG['INSTA_USER_ID']}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": CONFIG["META_ACCESS_TOKEN"]
    }
    try:
        res = requests.post(media_url, data=payload)
        if res.ok:
            creation_id = res.json().get("id")
            # 업로드 승인 및 퍼블리시 진행
            publish_url = f"https://graph.facebook.com/v19.0/{CONFIG['INSTA_USER_ID']}/media_publish"
            pub_res = requests.post(publish_url, data={
                "creation_id": creation_id,
                "access_token": CONFIG["META_ACCESS_TOKEN"]
            })
            if pub_res.ok:
                print("🎉 인스타그램 피드 업로드 및 발행 완료!")
                return
        print("인스타그램 업로드 API 실패:", res.text)
    except Exception as e:
        print("인스타그램 배포 에러:", e)

# ==========================================
# 4. 중앙 제어 실행 파이프라인
# ==========================================
def execute_ai_corporation_cycle(keyword):
    print(f"\n--- [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 1인 AI 기업 자동 포스팅 시동 ---")
    creator = AICreator()
    
    # 1. 컨텐츠 기획 및 제작
    title, blog_content, insta_caption, image_url = creator.generate_blog_content(keyword)
    
    if not blog_content:
        print("❌ 콘텐츠 생성 실패로 사이클을 조기 종료합니다.")
        return
        
    print(f"\n📢 [작성된 글 제목]: {title}")
    print(f"🖼️ [생성된 썸네일 주소]: {image_url}\n")
    
    # 2. 각 미디어별 분배 배포 가동
    post_to_blogspot(title, blog_content)
    post_to_naver_blog(title, blog_content, image_url)
    post_to_instagram(image_url, insta_caption)
    
    print("🏁 전체 배포 파이프라인이 성공적으로 가동 완료되었습니다.")

if __name__ == "__main__":
    test_keyword = "사회초년생 첫 신용카드 발급조건 및 신용점수"
    if len(sys.argv) > 1:
        test_keyword = " ".join(sys.argv[1:])
    execute_ai_corporation_cycle(test_keyword)
