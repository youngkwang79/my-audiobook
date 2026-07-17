"""
워드프레스 자동 업로더 — wp_auto_uploader.py
content-factory/output/ 의 생성된 원고를 읽어
WordPress REST API로 1시간 간격 예약 발행합니다.

실행법:
    python content-factory/scripts/wp_auto_uploader.py

필요 패키지:
    pip install requests python-dotenv pillow
"""

import json
import os
import base64
import re
import glob
import sys
from datetime import datetime, timedelta, timezone

# 썸네일 생성기 임포트
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from thumbnail_generator import generate_and_upload_images, insert_body_image
    THUMBNAIL_ENABLED = True
except ImportError:
    THUMBNAIL_ENABLED = False
    print("⚠️  thumbnail_generator 로드 실패 — 이미지 없이 진행")

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("❌ pip install requests python-dotenv 먼저 실행하세요.")
    exit(1)

# ──────────────────────────────────────────────
# 경로 설정
# ──────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR   = os.path.dirname(BASE_DIR)
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
LOG_DIR    = os.path.join(BASE_DIR, "logs")
ENV_FILE   = os.path.join(ROOT_DIR, ".env.local")

os.makedirs(LOG_DIR, exist_ok=True)

# ──────────────────────────────────────────────
# 환경변수 로드
# ──────────────────────────────────────────────
load_dotenv(ENV_FILE)

WP_URL      = os.getenv("WP_URL", "").rstrip("/")
WP_USER     = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS     = os.getenv("WP_APPLICATION_PASSWORD", "")

if not all([WP_URL, WP_USER, WP_PASS]):
    print("❌ .env.local 에서 WP_URL / WP_ADMIN_USERNAME / WP_APPLICATION_PASSWORD 확인하세요.")
    exit(1)

# Basic Auth 헤더
CREDENTIALS = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
HEADERS = {
    "Authorization": f"Basic {CREDENTIALS}",
    "Content-Type":  "application/json",
}

API_BASE = f"{WP_URL}/wp-json/wp/v2"

# ──────────────────────────────────────────────
# 설정
# ──────────────────────────────────────────────
INTERVAL_HOURS = 1    # 글 사이 예약 간격 (시간)
MAX_PER_RUN    = 5    # 한 번에 최대 업로드 건수

# ──────────────────────────────────────────────
# 업로드 대상 폴더 탐색
# ──────────────────────────────────────────────
def find_pending_articles() -> list:
    """status가 'generated'인 원고 폴더 목록 반환 (생성 시간 오름차순)"""
    results = []
    meta_files = sorted(glob.glob(os.path.join(OUTPUT_DIR, "*", "meta.json")))
    for meta_path in meta_files:
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        if meta.get("status") == "generated":
            results.append(meta)
    return results

# ──────────────────────────────────────────────
# HTML 원고 로드
# ──────────────────────────────────────────────
def load_html(meta: dict) -> str:
    html_path = meta.get("html_path", "")
    if not os.path.exists(html_path):
        return ""
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # ── [이중 방어] 불필요한 찌꺼기 문자 및 마크다운 필터링 ──
    # 1. ```html 이나 ``` 마크다운 백틱 코드 기호 제거
    content = re.sub(r"```html\s*", "", content, flags=re.IGNORECASE)
    content = re.sub(r"```\s*", "", content)
    
    # 2. 본문에 노출되는 "📌 이미지 Alt Text:" 및 "ALT_TEXT:" 가이드라인 문장 제거
    content = re.sub(r"<p[^>]*>\s*📌\s*이미지\s*Alt\s*Text.*?</p>", "", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"📌\s*이미지\s*Alt\s*Text.*?\n", "", content, flags=re.IGNORECASE)
    content = re.sub(r"ALT_TEXT:\s*.*?\n", "", content, flags=re.IGNORECASE)
    content = re.sub(r"<!--\s*ALT_TEXT:\s*.*?\s*-->", "", content, flags=re.IGNORECASE)
    content = re.sub(r"\[ALT_TEXT:\s*.*?\]", "", content, flags=re.IGNORECASE)
    
    # 3. 인용구 엑스박스 등 특수 문자 깨짐 보정 ( 사각형 모양 [X] 제거 )
    content = content.replace("[X]", "").replace("☒", "")
    
    # 4. 소제목 텍스트에 포함되는 프롬프트의 흔적 제거
    content = re.sub(r"(독자\s*관점\s*소제목|세부\s*소제목|실전\s*적용법|주의사항/체크리스트|비교/분석|마무리|인간적\s*결론|공식\s*출처\s*링크|해시태그)\s*[\(]*[가-힣\s]*[\)]*\s*[:-]", "", content)
    content = re.sub(r"독자\s*관점\s*소제목\s*-\s*", "", content)
    
    return content.strip()



# ──────────────────────────────────────────────
# 제목 추출 (H1, 또는 H2, 또는 meta 백업 기반)
# ──────────────────────────────────────────────
def extract_title(html: str, meta: dict) -> str:
    # 1. H1 태그 매칭 시도
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if match:
        title = re.sub(r"<[^>]+>", "", match.group(1)).strip()
        # 찌꺼기 기사 제목이 들어있는 경우 강제 필터링 후 백업 루틴으로 넘김
        if "재테크 박람회" not in title and len(title) > 8:
            return title[:100]

    # 2. H1이 없고 첫 번째 H2가 있다면 H2의 텍스트를 제목 후보로 활용
    match_h2 = re.search(r"<h2[^>]*>(.*?)</h2>", html, re.IGNORECASE | re.DOTALL)
    if match_h2:
        title = re.sub(r"<[^>]+>", "", match_h2.group(1)).strip()
        title = re.sub(r"^[0-9\.\s]+", "", title)
        if "재테크 박람회" not in title and len(title) > 8:
            return title[:100]

    # 3. 최후 백업: 구형 제목 결합을 원천 배제하고 포커스 키워드 단독형 명품 제목으로만 조립
    focus_kw = meta.get("focus_keyword", "재테크")
    import random
    suffixes = [" 관련 2026 기준 핵심 가이드 및 신청 방법", " 속 실용적인 혜택과 주의사항 총정리", " 할 때 꼭 알아야 할 필수 체크리스트 꿀팁"]
    return f"{focus_kw}{random.choice(suffixes)}"


# ──────────────────────────────────────────────
# 메타 설명 추출 (첫 <p> 태그에서 150자)
# ──────────────────────────────────────────────
def extract_excerpt(html: str) -> str:
    match = re.search(r"<p[^>]*>(.*?)</p>", html, re.IGNORECASE | re.DOTALL)
    if match:
        text = re.sub(r"<[^>]+>", "", match.group(1)).strip()
        return text[:150]
    return ""

# ──────────────────────────────────────────────
# 해시태그 → 워드프레스 태그 생성/조회
# ──────────────────────────────────────────────
def get_or_create_tags(keywords: list) -> list:
    tag_ids = []
    for kw in keywords[:8]:
        kw = kw.strip()
        if not kw:
            continue
        # 태그 검색
        r = requests.get(
            f"{API_BASE}/tags",
            headers=HEADERS,
            params={"search": kw, "per_page": 1},
            timeout=10,
        )
        if r.status_code == 200 and r.json():
            tag_ids.append(r.json()[0]["id"])
        else:
            # 태그 새로 생성
            r2 = requests.post(
                f"{API_BASE}/tags",
                headers=HEADERS,
                json={"name": kw},
                timeout=10,
            )
            if r2.status_code in (200, 201):
                tag_ids.append(r2.json()["id"])
    return tag_ids

def make_slug(keyword: str) -> str:
    """포커스 키워드 → URL 슬러그 변환"""
    import unicodedata
    slug = keyword.strip().lower()
    slug = re.sub(r"[\s]+", "-", slug)          # 공백 → 하이픈
    slug = re.sub(r"[^\w\-가-힣]", "", slug)    # 특수문자 제거
    return slug[:60]


def build_seo_title(title: str, focus_kw: str) -> str:
    """Rank Math SEO 제목: 2026년, 기술 용어 억지 접합을 완전 배제하고, 사람들이 실제로 구글 검색창에 치는 완성형 롱테일 키워드 제목으로 리턴"""
    if not focus_kw:
        return title[:60]
    
    # 1. 2026년이나 학술식 수식어가 강제 접착되는 것을 필터링
    clean_title = re.sub(r"^[^\w가-힣]+", "", title).strip()
    clean_title = clean_title.replace("2026년", "").replace("2026 ", "").strip()
    
    # 2. 사람들이 실제로 구글에 치는 실전 질문/해결형 롱테일 템플릿 매칭
    import random
    templates = [
        f"{focus_kw} 조건 및 이자 혜택 극대화하는 신청 꿀팁",
        f"{focus_kw} 굴리기, 예금 대신 안정적으로 수익 내는 법",
        f"{focus_kw} 실제 수익률과 가입 전 꼭 확인해야 할 체크리스트",
        f"{focus_kw} 신청 자격 및 나에게 맞는 금융 상품 고르는 방법",
        f"{focus_kw} 금리 우대 비교 및 숨겨진 혜택 찾아 받기"
    ]
    
    # 이미 타이틀 자체가 자연스럽게 구성되어 있다면 그대로 쓰고, 어색하면 구글 검색형 템플릿으로 리턴
    if "박람회" in clean_title or "개인화" in clean_title or len(clean_title) < 10:
        return random.choice(templates)[:60]
        
    return clean_title[:60]


def build_meta_desc(html: str, focus_kw: str) -> str:
    """메타 설명 160자 — 포커스 키워드가 무조건 가장 처음에 시작하도록 강제 선언"""
    # 1. 본문 단락에서 포커스 키워드를 포함하는 문장 탐색
    paras = re.findall(r"<p[^>]*>(.*?)</p>", html, re.IGNORECASE | re.DOTALL)
    matched_text = ""
    for p in paras:
        text = re.sub(r"<[^>]+>", "", p).strip()
        if focus_kw in text and len(text) > 40:
            matched_text = text
            break
            
    # 2. 매칭되는 단락이 있으면, 해당 단락 내용 앞에 포커스 키워드를 자연스럽게 명시하여 시작
    if matched_text:
        # 포커스 키워드로 시작하지 않는 경우 강제 삽입
        if not matched_text.startswith(focus_kw):
            desc = f"{focus_kw} 관련 핵심 가이드: {matched_text}"
        else:
            desc = matched_text
        return desc[:157] + "..."
        
    # 3. 매칭 실패 시 기본 템플릿 사용
    return f"{focus_kw}에 대해 반드시 알아야 할 핵심 정보와 구체적인 적용 방법을 단계별로 상세히 정리해 드립니다."



# ──────────────────────────────────────────────
# 워드프레스 포스트 업로드
# ──────────────────────────────────────────────
def upload_post(meta: dict, html: str, scheduled_time: datetime) -> dict | None:
    title    = extract_title(html, meta)
    keywords = meta.get("keywords", [])
    
    # ── [핵심 개선] meta.json에 최종 저장된 롱테일 포커스 키워드 최우선 활용 ──
    focus_kw = meta.get("focus_keyword", "")
    if not focus_kw and keywords:
        focus_kw = keywords[0]
    if not focus_kw:
        focus_kw = "재테크"


    # ── Rank Math SEO 스니펫 구성 ──────────────
    seo_title   = build_seo_title(title, focus_kw)
    meta_desc   = build_meta_desc(html, focus_kw)
    post_slug   = make_slug(focus_kw) if focus_kw else ""
    excerpt     = meta_desc[:150]

    print(f"  [키워드] 포커스 키워드: {focus_kw}")
    print(f"  [제목] SEO 제목: {seo_title}")
    print(f"  [메타] 메타 설명: {meta_desc[:60]}...")

    # 예약 발행 시간
    date_str = scheduled_time.strftime("%Y-%m-%dT%H:%M:%S")

    # 태그 ID 조회/생성
    tag_ids = get_or_create_tags(keywords)

    payload = {
        "title":   seo_title,          # 기존 title 대신 포커스 키워드가 맨 앞인 seo_title 사용!
        "content": html,
        "excerpt": excerpt,
        "status":  "future",
        "date":    date_str,
        "tags":    tag_ids,
        "slug":    post_slug,
        "meta": {
            "rank_math_focus_keyword":  focus_kw,
            "rank_math_title":          seo_title,
            "rank_math_description":    meta_desc,
            "rank_math_robots":         ["index", "follow"],
            "rank_math_rich_snippet":   "article",
        },
        "comment_status": "open",
        "ping_status":    "open",
    }

    # ── 이미지 자동 생성 & 업로드 ──────────────
    if THUMBNAIL_ENABLED and focus_kw:
        print(f"  [이미지] 이미지 자동 생성 중...")
        img_result = generate_and_upload_images(
            title        = title,
            focus_kw     = focus_kw,
            post_date_str= scheduled_time.strftime("%Y%m%d%H%M%S"),
        )
        # 대표 이미지 설정
        if img_result.get("featured_media_id"):
            payload["featured_media"] = img_result["featured_media_id"]
            print(f"  [이미지] 대표 이미지 ID: {img_result['featured_media_id']}")

        # 본문 중간 이미지 삽입
        if img_result.get("body_image_html"):
            payload["content"] = insert_body_image(html, img_result["body_image_html"])
            print(f"  🖼️  본문 중간 이미지 삽입 완료")

    try:
        r = requests.post(
            f"{API_BASE}/posts",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )
        if r.status_code in (200, 201):
            return r.json()
        else:
            print(f"   ❌ WP 오류 {r.status_code}: {r.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ 요청 오류: {e}")
        return None

# ──────────────────────────────────────────────
# meta.json 상태 업데이트
# ──────────────────────────────────────────────
def mark_uploaded(meta: dict, wp_post: dict, scheduled_time: datetime):
    meta["status"]        = "uploaded"
    meta["wp_post_id"]    = wp_post.get("id")
    meta["wp_post_url"]   = wp_post.get("link", "")
    meta["scheduled_at"]  = scheduled_time.isoformat()
    meta["uploaded_at"]   = datetime.now().isoformat()

    meta_path = meta.get("html_path", "").replace("post.html", "meta.json")
    if meta_path and os.path.exists(meta_path):
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

# ──────────────────────────────────────────────
# 로그
# ──────────────────────────────────────────────
def write_log(message: str):
    log_path = os.path.join(LOG_DIR, f"uploader_{datetime.now().strftime('%Y%m%d')}.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {message}\n")

# ──────────────────────────────────────────────
# WP 연결 테스트
# ──────────────────────────────────────────────
def test_connection() -> bool:
    try:
        r = requests.get(f"{API_BASE}/users/me", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            name = r.json().get("name", "unknown")
            print(f"   [연결 성공] WP 연결 성공! 사용자: {name}")
            return True
            print(f"   [인증 실패] ({r.status_code}) — 앱 비밀번호 확인하세요.")
            return False
    except Exception as e:
        print(f"   [연결 오류]: {e}")
        return False

# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  [업로드 시작] 워드프레스 자동 업로더 시작")
    print(f"  실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  대상 사이트: {WP_URL}")
    print(f"  예약 간격: {INTERVAL_HOURS}시간")
    print("=" * 55)

    # 연결 테스트
    print("\n[연결 확인] 워드프레스 연결 확인 중...")
    if not test_connection():
        return

    # 업로드 대상 탐색
    articles = find_pending_articles()
    print(f"\n[대기 원고] 업로드 대기 원고: {len(articles)}건")

    if not articles:
        print("[알림] 업로드할 원고가 없습니다. gemini_writer.py 먼저 실행하세요.")
        return

    targets = articles[:MAX_PER_RUN]

    # ── 워드프레스에서 가장 마지막 발행/예약 시간 찾기 ──
    latest_time = None
    try:
        # publish(발행됨) 및 future(예약됨) 상태의 가장 최신 글 1개 조회
        r = requests.get(
            f"{API_BASE}/posts",
            headers=HEADERS,
            params={"per_page": 1, "status": "publish,future", "orderby": "date", "order": "desc"},
            timeout=10,
        )
        if r.status_code == 200 and r.json():
            post_date_str = r.json()[0].get("date")  # 예: "2026-07-11T09:05:00"
            if post_date_str:
                latest_time = datetime.strptime(post_date_str, "%Y-%m-%dT%H:%M:%S")
                print(f"  [최신글 시간 감지]: {latest_time.strftime('%Y-%m-%d %H:%M')}")
    except Exception as e:
        print(f"  [경고] WP 최신 글 시간 조회 실패 (현재 기준 진행): {e}")

    now = datetime.now()
    
    # 예약 기준점 잡기
    if latest_time and latest_time > now:
        base_start_time = latest_time + timedelta(hours=INTERVAL_HOURS)
        print(f"  [알림] 기존 예약 글 뒤에 이어서 예약합니다. 시작 시간: {base_start_time.strftime('%Y-%m-%d %H:%M')}")
    else:
        base_start_time = now + timedelta(minutes=5)
        print(f"  [알림] 현재 대기 중인 예약이 없습니다. 즉시 예약 시작: {base_start_time.strftime('%Y-%m-%d %H:%M')}")

    success = 0
    fail    = 0

    for i, meta in enumerate(targets, 0):
        scheduled = base_start_time + timedelta(hours=INTERVAL_HOURS * i)
        print(f"\n[{i+1}/{len(targets)}] 업로드 중...")
        print(f"  제목: {meta.get('source_title', '')[:50]}")
        print(f"  예약: {scheduled.strftime('%Y-%m-%d %H:%M')} (기준시각+{INTERVAL_HOURS * i}시간)")


        html = load_html(meta)
        if not html:
            print(f"  [실패] HTML 파일 없음: {meta.get('html_path')}")
            fail += 1
            continue

        wp_post = upload_post(meta, html, scheduled)

        if wp_post:
            mark_uploaded(meta, wp_post, scheduled)
            post_id  = wp_post.get("id")
            post_url = wp_post.get("link", "")
            print(f"  [완료] 예약 완료! ID: {post_id}")
            print(f"  [링크] URL: {post_url}")
            write_log(f"업로드완료 | ID:{post_id} | 예약:{scheduled.strftime('%H:%M')} | {meta.get('source_title','')[:30]}")
            success += 1
        else:
            fail += 1
            write_log(f"업로드실패 | {meta.get('source_title','')[:30]}")

    print("\n" + "=" * 55)
    print(f"  [완료] 업로드 완료!")
    print(f"  성공: {success}건 | 실패: {fail}건")
    if success > 0:
        first_time = now + timedelta(hours=INTERVAL_HOURS)
        last_time  = now + timedelta(hours=INTERVAL_HOURS * success)
        print(f"  첫 발행: {first_time.strftime('%Y-%m-%d %H:%M')}")
        print(f"  마지막:  {last_time.strftime('%Y-%m-%d %H:%M')}")
    print("=" * 55)

if __name__ == "__main__":
    main()
