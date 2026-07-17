"""
Claude Haiku 원고 자동 생성기 - gemini_writer.py
뉴스 기사를 소재로 SEO 최적화된 7,000자 블로그 원고를 자동 생성합니다.

사용 모델: claude-haiku-4-5 (글 1개 약 35원, 품질 최상)
생성 방식: 3-pass (1부: 서론+H2 1~2 / 2부: H2 3~4 / 3부: H2 5~6+결론)

실행법:
    python content-factory/scripts/gemini_writer.py

필요 패키지:
    pip install anthropic requests python-dotenv
"""

import json
import os
import re
import sys
import time
import random
import hashlib
import base64
import sqlite3
from datetime import datetime

try:
    import anthropic
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("pip install anthropic requests python-dotenv")
    sys.exit(1)

# ──────────────────────────────────────────────
# 경로 설정
# ──────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR   = os.path.dirname(BASE_DIR)
DATA_DIR   = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
LOG_DIR    = os.path.join(BASE_DIR, "logs")
QUEUE_FILE = os.path.join(DATA_DIR, "news_queue.json")
ENV_FILE   = os.path.join(ROOT_DIR, ".env.local")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# ──────────────────────────────────────────────
# 환경변수 로드
# ──────────────────────────────────────────────
load_dotenv(ENV_FILE)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
WP_URL            = os.getenv("WP_URL", "").rstrip("/")
WP_USER           = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS           = os.getenv("WP_APPLICATION_PASSWORD", "")

if not ANTHROPIC_API_KEY:
    print("ANTHROPIC_API_KEY 없음. .env.local 확인하세요.")
    sys.exit(1)

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
MODEL  = "claude-haiku-4-5"

# ──────────────────────────────────────────────
# 설정
# ──────────────────────────────────────────────
MAX_PER_RUN  = 1
DELAY_MIN    = 2
DELAY_MAX    = 10

# ──────────────────────────────────────────────
# WordPress 내부 링크 수집 (실제 발행된 글)
# ──────────────────────────────────────────────
_INTERNAL_LINKS_CACHE: list = []

# ── 분야별 키워드 그룹 ──────────────────────────
TOPIC_GROUPS = {
    "금융재테크": ["금리", "투자", "주식", "채권", "환율", "예금", "적금", "ETF",
                   "펀드", "CMA", "파킹통장", "배당", "증시", "코스피", "나스닥",
                   "금융", "재테크", "자산", "포트폴리오"],
    "부업수익":   ["부업", "수익", "블로그", "유튜브", "수익화", "자동화", "부수입",
                   "프리랜서", "N잡", "사이드잡", "온라인수익"],
    "부동산":     ["부동산", "아파트", "청약", "전세", "월세", "임대", "갭투자",
                   "분양", "빌라", "오피스텔", "재건축", "재개발"],
    "절세세금":   ["절세", "세금", "연말정산", "소득공제", "부가세", "종합소득세",
                   "금투세", "상속세", "증여세", "세액공제"],
    "직장커리어": ["직장인", "취업", "이직", "연봉", "월급", "퇴직금", "실업급여",
                   "4대보험", "연차", "사직", "퇴사"],
    "AI기술":     ["AI", "인공지능", "반도체", "ChatGPT", "자동화", "IT", "테크"],
    "청년금융":   ["청년", "20대", "30대", "사회초년생", "청년도약", "청년저축",
                   "대학생", "첫월급", "신용점수"],
    "보험대출":   ["보험", "대출", "신용", "카드론", "마이너스통장", "담보대출",
                   "생명보험", "실손", "치아보험"],
}

def get_topic_group(keyword: str) -> str | None:
    """키워드가 속한 분야 그룹명 반환"""
    for group, kws in TOPIC_GROUPS.items():
        for kw in kws:
            if kw in keyword or keyword in kw:
                return group
    return None

def get_internal_links() -> list:
    """WP REST API로 최근 발행글 URL 목록 가져오기 (캐시)"""
    global _INTERNAL_LINKS_CACHE
    if _INTERNAL_LINKS_CACHE:
        return _INTERNAL_LINKS_CACHE
    if not all([WP_URL, WP_USER, WP_PASS]):
        return []
    try:
        cred = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
        r = requests.get(
            f"{WP_URL}/wp-json/wp/v2/posts",
            headers={"Authorization": f"Basic {cred}"},
            params={"per_page": 30, "status": "publish", "orderby": "date"},
            timeout=10,
        )
        if r.status_code == 200:
            _INTERNAL_LINKS_CACHE = [
                {
                    "title": re.sub(r"<[^>]+>", "", p.get("title", {}).get("rendered", "")),
                    "url":   p.get("link", ""),
                }
                for p in r.json() if p.get("link")
            ]
            print(f"  [내부링크] {len(_INTERNAL_LINKS_CACHE)}개 발행글 로드")
    except Exception as e:
        print(f"  [내부링크] 로드 실패: {e}")
    return _INTERNAL_LINKS_CACHE


def pick_internal_links(main_kw: str, keywords: list, n: int = 2) -> list:
    """
    같은 분야 키워드 매칭 우선 → 없으면 최근글 fallback
    """
    all_links = get_internal_links()
    if not all_links:
        return []

    # 현재 글의 분야 파악
    my_group = None
    for kw in [main_kw] + keywords:
        my_group = get_topic_group(kw)
        if my_group:
            break

    if my_group:
        group_kws = TOPIC_GROUPS[my_group]
        # 같은 분야 글 필터 (제목에 분야 키워드 포함)
        same_field = [
            lk for lk in all_links
            if any(kw in lk["title"] for kw in group_kws)
        ]
        if len(same_field) >= n:
            picked = random.sample(same_field, n)
            print(f"  [내부링크] [{my_group}] 분야 매칭 {len(same_field)}개 중 {n}개 선택")
            return picked
        elif same_field:
            # 같은 분야 글이 n개 미만이면 있는 것 + 최근글로 채움
            rest = [lk for lk in all_links if lk not in same_field]
            picked = same_field + random.sample(rest, min(n - len(same_field), len(rest)))
            print(f"  [내부링크] [{my_group}] 분야 {len(same_field)}개 + 최근글 혼합")
            return picked[:n]

    # 분야 매칭 실패 → 최근글 fallback
    print(f"  [내부링크] 분야 미매칭 -> 최근글 {n}개 선택")
    return random.sample(all_links, min(n, len(all_links)))




# ──────────────────────────────────────────────
# Claude API 단일 호출
# ──────────────────────────────────────────────
def call_claude(prompt: str) -> str | None:
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=8096,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text
    except Exception as e:
        print(f"  [Claude 오류] {e}")
        return None


# ──────────────────────────────────────────────
# 원고 생성 (3-pass)
# ──────────────────────────────────────────────
def generate_article(item: dict) -> str | None:
    """뉴스를 소재로 3-pass 방식 7,000자 SEO 블로그 원고 생성"""
    title    = item["title"]
    summary  = item.get("summary", "")
    keywords = item.get("keywords", [])
    
    # ── [핵심 개선] 롱테일 키워드 우선 탐색 ──
    main_kw = "재테크"  # 기본값
    longtail_file = os.path.join(DATA_DIR, "longtail_keywords.json")
    
    # 기사 제목이나 기사 키워드 목록에서 롱테일 키워드 매칭
    if os.path.exists(longtail_file):
        try:
            with open(longtail_file, "r", encoding="utf-8") as f:
                lt_data = json.load(f)
            lt_list = lt_data.get("keywords", [])
            # 매칭 정확도 향상을 위해 길이가 긴 키워드부터 순차 탐색
            lt_list.sort(key=len, reverse=True)
            for lk in lt_list:
                # 롱테일 키워드 자체(lk)가 기사 제목에 들어있거나,
                # 기사 키워드들(AI, 반도체 등)이 롱테일 키워드의 구성 부분 요소인 경우 교차 매칭 성공 판정
                title_clean = title.replace(" ", "")
                lk_clean = lk.replace(" ", "")
                
                # 1. 띄어쓰기 뺀 제목 대조
                if lk_clean in title_clean:
                    main_kw = lk
                    break
                    
                # 2. 기사 개별 키워드 조합 대조 (예: 'AI' 와 '반도체'가 모두 'AI 반도체 기술 트렌드'에 포함될 때)
                matched_sub_kws = [sub_kw for sub_kw in keywords if sub_kw.strip() and sub_kw.strip() in lk]
                if len(matched_sub_kws) >= 2 or (len(matched_sub_kws) >= 1 and len(matched_sub_kws[0]) >= 3):
                    main_kw = lk
                    break
        except Exception as e:
            print(f"  [키워드 매칭 오류]: {e}")
            
    # 매칭 실패 시 원래 기사 키워드 목록에서 가장 긴 단어 사용
    if (main_kw == "재테크" or len(main_kw) < 4) and keywords:
        # 가장 긴 단어 찾기
        longest_kw = max(keywords, key=len)
        if len(longest_kw) >= 3:
            main_kw = longest_kw
        
    # 저장할 메타 정보에 최종 판정된 복합 롱테일 main_kw 주입
    item["focus_keyword"] = main_kw

    kw_str   = ", ".join(keywords[:5]) if keywords else "재테크, 부업, 수익"

    # ── 외부 링크 (실제 작동 보장) ──────────────

    ext_namu = f"https://namu.wiki/w/{main_kw}"
    ext_wiki = f"https://ko.wikipedia.org/wiki/{main_kw}"

    # ── 내부 링크 (WP 실제 발행글 - 같은 분야 우선) ──
    int_links = pick_internal_links(main_kw, keywords, n=2)
    if int_links:
        int_link_block = "\n".join(
            f'  - <a href="{lk["url"]}" title="{lk["title"]}">{lk["title"]}</a>'
            for lk in int_links
        )
    else:
        int_link_block = "  - (내부링크 추후 연결 예정)"

    # ── 삼위일체 키워드 조합을 위한 연관어/롱테일 수집 ──
    # 메인 키워드 기반으로 뻗어 나갈 수 있는 연관 어구 목록 정의
    related_keywords = [k for k in keywords if k != main_kw][:3]
    related_str = ", ".join(related_keywords) if related_keywords else "관련주, 전망, 혜택"
    
    # 클릭을 유발하는 고효율 행동 롱테일 접사 후보들
    longtail_suffixes = "신청하는 방법, 꿀팁 3가지, 지원금 받는 법, 2026 기준 총정리, 필수 체크리스트"

    base = f"""[참고용 실시간 팩트 사전 (Fact Book)]
{summary}
[1. 실시간 포커스 키워드] {main_kw}
[2. 연관 검색어 후보] {related_str}
[3. 권장 롱테일 접사] {longtail_suffixes}"""

    SEO_RULES = f"""
[SEO 필수 규칙]
1. [핵심] 팩트북 사전은 글감의 통계/수치 데이터를 정확하게 인용하기 위한 도구일 뿐이다. 절대로 박람회나 특정 기사의 문맥을 기계적으로 따라 쓰지 말 것. 본래의 [실시간 포커스 키워드] "{main_kw}" 자체에 집중하여 100% 새롭게 지식과 정보 칼럼으로 창작할 것.
2. 제목(H1)의 삼위일체 결합 공식 의무 준수:
   - 반드시 **[1. 실시간 포커스 키워드]**로 제목을 시작할 것.
   - 중간에는 **[2. 연관 검색어]**를 자연스럽게 이어 붙일 것.
   - 마지막은 **[3. 권장 롱테일 접사]** 중 하나를 결합하여 한 문장으로 끝마칠 것.
   - 절대로 원본 뉴스나 박람회 관련 찌꺼기 제목을 도용하지 말고 완전 창작할 것. (25자 내외)
3. [삭제됨 - 소제목 내 연관검색어 강제 주입 지침 배제]
4. 문장 2줄 이내, 단락 3~4줄마다 줄바꿈
5. 핵심 문장 <strong> 태그 강조
6. [금지어 가드]: 본문이나 제목에 "대한민국 재테크 박람회", "박람회", "기자", "르포", "현장입니다", "개최되어" 와 같은 신문사/전시회 관련 찌꺼기 단어와 어휘를 일절 사용 금지. 오직 100% 정보성 생활 꿀팁 지식으로 가독성 있게 풀어쓸 것.
7. <img> 태그 절대 금지
8. [삭제됨 - 본문 내 키워드 강제 주입 지침 배제]
9. 외부 링크 2개 반드시 본문 중간에 자연스럽게 삽입 (정확한 URL 사용):
   - 나무위키: <a href="{ext_namu}" target="_blank" rel="noopener">{main_kw} - 나무위키</a>
   - 위키백과: <a href="{ext_wiki}" target="_blank" rel="noopener">{main_kw} - 위키백과</a>
10. 순수 HTML만 출력 (html/body 태그 제외, 규칙 설명 절대 포함 금지)
11. [초반 키워드 노출]: 포스트 본문 극초반(서론의 첫 번째 문단, 처음 100자 이내)에 포커스 키워드 "{main_kw}"가 명확하고 자연스럽게 1회 이상 무조건 포함되도록 문장을 설계하여 도입부를 시작할 것."""


    # ── PASS 1: 서론 + 목차 + H2 1~2 ──────
    p1 = call_claude(f"""SEO 블로그 전문 작가로서 아래 뉴스를 소재로 독자 중심 블로그 원고 [1부]를 작성하세요.

{base}
{SEO_RULES}

[1부 작성 범위 - 기초 개념 및 도입 통계]
[절대 주의 1] <h1> 태그를 작성하지 마세요. (본문 내 H1 중복 제거)
[절대 주의 2] 답변 앞뒤에 ```html 이나 ``` 같은 마크다운 코드 블록 선언 기호를 절대 포함하지 마세요. 오직 순수 HTML 태그와 본문 텍스트만 리턴해야 합니다.
[절대 주의 3] 본문 제목에 "독자 관점 소제목", "세부 소제목", "실전 적용법" 같은 프롬프트 지시어 단어 레이블을 절대로 포함하지 마세요. 사람이 직접 쓴 자연스러운 제목이어야 합니다.
[절대 주의 4] 본문에 "📌 이미지 Alt Text:" 나 유사한 수동 안내용 텍스트 가이드를 절대 삽입하지 마세요.
[절대 주의 5] [중복 방지] 제공된 팩트북 사전 내용 중 오직 도입부용 기본 통계 및 현상 설명 수치만 제한적으로 인용하세요. 2부와 3부에서 쓰일 세제 혜택 분석이나 실전 체크리스트 등은 1부에서 절대 다루지 마세요.

[단락 1] 서론 <p> 2~3문장 이내 (핵심만 명확하고 강력하게 작성)
   - 첫 문장은 반드시 메인 키워드 "{main_kw}"로 시작할 것 (예: "{main_kw}은/는 최근 가장 주목받는 주제로...")
   - 첫 100자 이내에 이 글에서 다룰 핵심 요지와 해결책을 <strong> 태그를 사용하여 강력하고 직관적으로 선언할 것

[단락 2] <div class="toc"><strong>[목차]</strong><ul>
   - H2 소제목 6개 앵커 링크 (예: <li><a href="#sec1">소제목 텍스트</a></li> 형식으로 실제 작동하도록 링크 연결)
   </ul></div>

[단락 3] <h2 id="sec1">포커스 키워드와 연관어가 결합된 매끄러운 한글 H2 제목</h2>
   <h3>세부 소제목</h3><p>200자 내외 + 나무위키 링크 자연 삽입</p>
   <h3>세부 소제목</h3><p>200자 내외</p>

[단락 4] <h2 id="sec2">구체적인 혜택과 대상을 풀어낸 실전 꿀팁 H2 제목</h2>
   <h3>세부 소제목</h3><p>200자 내외</p>
   <h3>세부 소제목</h3><p>200자 내외</p>



지금 바로 [1부] 작성 (반드시 공백 포함 한글 1,800자 이내로 콤팩트하고 간결하게 분량을 제한할 것):""")

    if not p1:
        return None
    print(f"    1부: {len(p1):,}자")
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    # ── PASS 2: H2 3~4 ──────────────────────────
    p2 = call_claude(f"""SEO 블로그 원고 [2부]를 작성하세요. (뉴스 소재 -> 독자 실용 분석 계속)

{base}
{SEO_RULES}

[2부 작성 범위 - 세부 비교/세율/금리/정책 분석]
[절대 주의 1] 답변 앞뒤에 ```html 이나 ``` 같은 마크다운 코드 블록 선언 기호를 절대 포함하지 마세요. 오직 순수 HTML 태그와 본문 텍스트만 리턴해야 합니다.
[절대 주의 2] 제목이나 본문에 "독자 관점 소제목", "세부 소제목" 같은 지시어 단어 레이블을 절대로 포함하지 마세요.
[절대 주의 3] 인용구(blockquote) 내부에 깨지기 쉬운 [X] 나 사각형 등의 특수 아이콘 기호를 절대 삽입하지 마세요. 텍스트로만 깔끔하게 인용구를 채우세요.
[절대 주의 4] [중복 방지] 1부에서 다뤘던 단순 기본 개념이나 인트로 통계를 또다시 길게 반복하여 우려먹는 행위를 강력히 금지합니다. 오직 구체적인 금융 상품 비교, 이자율 혜택, 세금 혜택 등 깊이 있는 실무 비교 정보만 가공하여 서술하세요. 3부용 체크리스트는 여기서 다루지 마세요.

[단락 5] <h2 id="sec3">통계 수치와 공인 데이터를 활용한 비교 분석 H2 제목</h2>
   <h3>세부 소제목</h3><p>200자 내외 + 위키백과 링크 자연 삽입</p>
   <h3>세부 소제목</h3><p>200자 내외</p>
   <blockquote>핵심 인사이트 인용구</blockquote>

[단락 6] <h2 id="sec4">실패 없는 실전 적용 및 체크리스트 H2 제목</h2>
   <h3>세부 소제목</h3><p>200자 내외</p>
   <h3>세부 소제목</h3><p>200자 내외</p>
   <hr>

지금 바로 [2부] 작성 (반드시 공백 포함 한글 1,800자 이내로 콤팩트하고 간결하게 분량을 제한할 것):""")

    if not p2:
        return p1
    print(f"    2부: {len(p2):,}자")
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    # ── PASS 3: H2 5~6 + 결론 + 링크 + 해시태그 ─
    int_link_html = "\n".join(
        f'<li><a href="{lk["url"]}" title="{lk["title"]}">{lk["title"]}</a></li>'
        for lk in int_links
    ) if int_links else ""

    part3_prompt = f"""SEO Blog Post [Part 3 - Ending]를 작성하세요.

{base}
{SEO_RULES}

[3부 작성 범위 - 실전 실행 지침 및 최종 결론]
[절대 주의 1] 답변 앞뒤에 ```html 이나 ``` 같은 마크다운 코드 블록 선언 기호를 절대 포함하지 마세요. 오직 순수 HTML 태그와 본문 텍스트만 리턴해야 합니다.
[절대 주의 2] 제목이나 본문에 "독자 관점 소제목", "세부 소제목", "마무리", "인간적 결론" 같은 지시어 단어 레이블을 절대로 포함하지 마세요.
[절대 주의 3] [중복 방지] 1부와 2부에서 주야장천 다룬 '변동성 통계', '해외 자산 성장 2.3배' 같은 수치들을 3부에서 또다시 구구절절 반복 서술하는 쓰레기 패턴을 100% 원천 금지합니다. 오직 실전에서 즉시 챙겨야 할 서류 준비물, 상담 체크리스트, 향후 행동 100일 캘린더 등 순수한 액션 플랜과 결론에만 집중하여 완전히 새로운 내용으로 채우세요.

[단락 7] <h2 id="sec5">지금 당장 실행 가능한 핵심 실전 지침 H2 제목</h2>
   <h3>세부 소제목</h3><p>200자 내외</p>
   <h3>세부 소제목</h3><p>200자 내외</p>

[단락 8] <h2 id="sec6">오늘의 핵심 3줄 요약 및 독자 액션 제안 H2 제목</h2>
   <p>300자 내외, "{main_kw}" 포함</p>

[단락 9] 인간적 결론 <p>
   - AI 느낌 없이 실제 경험담처럼 2~3줄
   - "작성자 주:" 같은 기계적 수식어 절대 금지

[단락 10] 관련 글 내부 링크 (아래 실제 URL 그대로 사용):
<p>함께 읽으면 도움이 되는 글:</p>
<ul>
{int_link_html if int_link_html else "<li>관련 칼럼 준비 중</li>"}
</ul>

[단락 11] 공식 출처 링크 <p>
   - 정부/공공기관 실제 작동 URL 1~2개 + 안내 문구
   - 예: 금융감독원(https://www.fss.or.kr), 한국은행(https://www.bok.or.kr) 등 주제에 맞는 곳

[단락 12] 해시태그 <p>
   - # 없이 키워드 8개 쉼표 구분 (맨 마지막 줄)

지금 바로 [3부] 작성 (반드시 공백 포함 한글 2,000자 이내로 콤팩트하고 간결하게 분량을 최종 제한할 것)"""

    p3 = call_claude(part3_prompt)

    if not p3:
        return p1 + "\n\n" + p2
    print(f"    3부: {len(p3):,}자")

    return p1.strip() + "\n\n" + p2.strip() + "\n\n" + p3.strip()


# ──────────────────────────────────────────────
# 파일 저장
# ──────────────────────────────────────────────
def save_article(item: dict, html: str) -> str:
    title_slug = re.sub(r"[^\w가-힣]", "_", item["title"])[:50]
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder     = os.path.join(OUTPUT_DIR, f"{timestamp}_{title_slug}")
    os.makedirs(folder, exist_ok=True)

    html_path = os.path.join(folder, "post.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    meta = {
        "source_title":  item["title"],
        "source_url":    item.get("url", ""),
        "focus_keyword": item.get("focus_keyword", "재테크"),
        "keywords":      item.get("keywords", []),
        "html_path":     html_path,
        "char_count":    len(html),
        "status":        "generated",
        "created_at":    datetime.now().isoformat(),
    }

    with open(os.path.join(folder, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return folder


# ──────────────────────────────────────────────
# 뉴스 큐 로드
# ──────────────────────────────────────────────
def load_queue() -> list:
    if not os.path.exists(QUEUE_FILE):
        return []
    with open(QUEUE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    # news_crawler.py가 dict {"articles":[...]} 또는 list [...] 형식으로 저장
    articles = data if isinstance(data, list) else data.get("articles", [])
    return [item for item in articles if item.get("status") == "pending"]


def mark_done(item: dict):
    if not os.path.exists(QUEUE_FILE):
        return
    with open(QUEUE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    articles = data if isinstance(data, list) else data.get("articles", [])
    for art in articles:
        if art.get("url_hash") == item.get("url_hash"):
            art["status"] = "done"
            break
    # 원래 형식 그대로 저장
    save_data = articles if isinstance(data, list) else data
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(save_data, f, ensure_ascii=False, indent=2)


# ──────────────────────────────────────────────
# 로그
# ──────────────────────────────────────────────
def write_log(msg: str):
    log_path = os.path.join(LOG_DIR, f"writer_{datetime.now().strftime('%Y%m%d')}.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")


# ──────────────────────────────────────────────
# 팩트 기반 가상 기사 조립기 (뉴스 기사 부재 시 Perplexity 연동 폴백)
# ──────────────────────────────────────────────
def build_virtual_articles_from_trends(max_count: int = 5) -> list[dict]:
    virtual_items = []
    longtail_file = os.path.join(DATA_DIR, "longtail_keywords.json")
    db_path = os.path.join(DATA_DIR, "history.db")
    
    if not os.path.exists(longtail_file):
        return []
        
    try:
        with open(longtail_file, "r", encoding="utf-8") as f:
            lt_data = json.load(f)
        lt_list = lt_data.get("keywords", [])
        
        # 1. 이미 써먹은 키워드 필터링
        used_keywords = set()
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT keyword FROM post_history")
            used_keywords = {row[0].strip() for row in cursor.fetchall() if row[0]}
            conn.close()
            
        fresh_kws = [kw for kw in lt_list if kw.strip() not in used_keywords]
        if not fresh_kws:
            print("  [알림] 새로 쓸 수 있는 신선한 실시간 롱테일 키워드가 존재하지 않습니다.")
            return []
            
        pplx_key = os.getenv("PERPLEXITY_API_KEY")
        if not pplx_key:
            print("  [경고] PERPLEXITY_API_KEY 미설정 — 실시간 팩트 조회를 건너뜁니다.")
            return []
            
        # 상위 타겟 개수만큼 팩트 수집 가동
        target_kws = fresh_kws[:max_count]
        print(f"  [하이브리드 팩트 수집] 총 {len(target_kws)}개 롱테일 키워드에 대한 실시간 Web Search 진행...")
        
        for kw in target_kws:
            print(f"    - '{kw}' 실시간 정보 팩트 검색 중...")
            url = "https://api.perplexity.ai/chat/completions"
            headers = {
                "Authorization": f"Bearer {pplx_key.strip()}",
                "Content-Type": "application/json"
            }
            # 이 키워드의 최신 수치 및 규격을 팩트로 긁어옴
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "user",
                        "content": f"한국 내 주요 포털 및 구글 경제 뉴스 채널에서 현재 '{kw}'와 밀접하게 연계된 최신 언론 보도 기사 최소 5개 이상과 정부 부처 공지사항을 다방면으로 고속 추적하여 핵심 내용을 융합해줘. 특히 신청 자격 요건, 대상 기준, 적용 금리 변동폭, 최대 혜택 한도 액수, 세부 신청 기간 일정 등 실제 수치 데이터(구체적인 숫자 데이터 필수)를 아주 상세하고 풍부하게 취합하여 하나의 논리적인 종합 팩트북 텍스트로 자세하게 대답해줘."
                    }
                ],
                "temperature": 0.2
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                fact_summary = resp.json()["choices"][0]["message"]["content"]
                # 가상 기사 조립
                h = hashlib.md5(kw.encode()).hexdigest()
                virtual_items.append({
                    "id": h,
                    "url_hash": h,
                    "source": "실시간_팩트_발굴",
                    "title": f"{kw} 실시간 정보 총정리",
                    "summary": fact_summary,
                    "url": f"https://blog.murimbook.com/virtual-{h}",
                    "keywords": [kw, "재테크", "정부정책", "꿀팁"],
                    "focus_keyword": kw,
                    "status": "pending"
                })
                time.sleep(1)
            else:
                print(f"      [경고] Perplexity 에러 ({resp.status_code})")
    except Exception as e:
        print(f"  [경고] 가상 기사 조립 오류: {e}")
        
    return virtual_items


# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  Claude Haiku 원고 자동 생성기 시작")
    print(f"  실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  최대 생성: {MAX_PER_RUN}건 / 회")
    print("=" * 55)

    # WP 내부 링크 미리 수집
    get_internal_links()

    # ── [전면 개편] 크롤러 의존성을 걷어내고 실시간 롱테일 웹 팩트 수집으로 직행 ──
    print("  [알림] [하이브리드 다방면 웹 융합 모드] 실시간 롱테일 키워드로 구글/포털의 다방면 기사 및 공지사항 팩트를 조사합니다.")
    pending = build_virtual_articles_from_trends(max_count=MAX_PER_RUN)
    if not pending:
        print("  실시간 롱테일 팩트 수집 실패. 중단됩니다.")
        return

    targets = pending[:MAX_PER_RUN]
    success, fail = 0, 0

    for i, item in enumerate(targets, 1):
        print(f"\n[{i}/{len(targets)}] 원고 생성 중...")
        print(f"  제목: {item['title'][:60]}")
        print(f"  키워드: {', '.join(item.get('keywords', []))}")

        html = generate_article(item)
        if html:
            folder = save_article(item, html)
            mark_done(item)
            folder_name = os.path.basename(folder)
            print(f"  완료! ({len(html):,}자) -> {folder_name}/")
            write_log(f"완료 | {len(html)}자 | {item['title'][:40]}")
            success += 1
        else:
            print(f"  실패!")
            write_log(f"실패 | {item['title'][:40]}")
            fail += 1

        if i < len(targets):
            delay = random.randint(10, 20)
            print(f"  다음 생성까지 {delay}초 대기...")
            time.sleep(delay)

    print("\n" + "=" * 55)
    print(f"  원고 생성 완료!")
    print(f"  성공: {success}건 | 실패: {fail}건")
    print(f"  저장 위치: {OUTPUT_DIR}")
    print("=" * 55)
    print("\n  다음 단계: python content-factory/scripts/wp_auto_uploader.py")


if __name__ == "__main__":
    main()
