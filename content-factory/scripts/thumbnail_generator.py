"""
썸네일 자동 생성기 — thumbnail_generator.py
Pollinations.ai (완전 무료, API 키 불필요) 로 이미지 생성 후
WordPress 미디어 라이브러리에 업로드합니다.

생성 이미지:
  1. 대표 이미지 (Featured Image) — 16:9 (1280×720)
  2. 본문 중간 이미지 (Body Image) — 4:3 (960×720)

실행법:
    python content-factory/scripts/thumbnail_generator.py

필요 패키지:
    pip install requests pillow python-dotenv
"""

import os
import io
import re
import time
import base64
import requests
from pathlib import Path
from urllib.parse import quote
from datetime import datetime

try:
    from PIL import Image
    from dotenv import load_dotenv
except ImportError:
    print("❌ pip install pillow python-dotenv 먼저 실행하세요.")
    exit(1)

# ──────────────────────────────────────────────
# 경로 / 환경변수
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
ENV_FILE = os.path.join(ROOT_DIR, ".env.local")

load_dotenv(ENV_FILE)
WP_URL  = os.getenv("WP_URL", "").rstrip("/")
WP_USER = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS = os.getenv("WP_APPLICATION_PASSWORD", "")

CREDENTIALS = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
WP_HEADERS  = {"Authorization": f"Basic {CREDENTIALS}"}
API_BASE    = f"{WP_URL}/wp-json/wp/v2"

# ──────────────────────────────────────────────
# 이미지 프롬프트 생성 (영어 — Pollinations 성능 최적화)
# ──────────────────────────────────────────────
KW_TRANSLATE = {
    "재테크": "personal finance investment",
    "부업": "side job income",
    "금리": "interest rate finance",
    "투자": "stock investment",
    "주식": "stock market",
    "부동산": "real estate property",
    "절세": "tax saving",
    "직장인": "office worker salary",
    "AI": "artificial intelligence technology",
    "인공지능": "artificial intelligence",
    "반도체": "semiconductor chip technology",
    "환율": "currency exchange rate",
    "청년": "young adult lifestyle",
    "적금": "savings account bank",
    "수익": "profit income money",
}

def keyword_to_english(kw: str) -> str:
    return KW_TRANSLATE.get(kw, kw)


def build_image_prompt(title: str, focus_kw: str, is_body: bool = False) -> str:
    # 1. 시드 키워드 영어 매핑
    kw_en = keyword_to_english(focus_kw)

    # 2. 제목 속의 핵심 유추 단어 분석 (간단한 영문 번역 맵 매칭)
    theme_clues = []
    
    # 융합 매칭 단어들
    vocab_map = {
        "포럼": "business forum, meeting, conference",
        "창업": "startups, business launch, entrepreneurship",
        "반도체": "semiconductor computer microchip technology",
        "금리": "interest rate chart, banking finance",
        "청년": "young energetic professionals, team",
        "부업": "side job, home office work, laptop earning",
        "재테크": "wealth management, growth asset stock chart",
        "주식": "stock trading screen, bull market graph",
        "부동산": "modern building property, smart city architecture",
        "AI": "futuristic artificial intelligence robot brain neural network",
        "인공지능": "advanced smart technology machine learning graphic",
        "적금": "savings jar, piggy bank, bank safety vault",
        "대출": "loan credit agreement, financial security",
        "보험": "safety shield protection concept, life insurance illustration",
        "카드": "credit card, secure online mobile payment concept",
        "헬륨": "helium chemical element tank, industry gas tech",
        "수출": "cargo ship shipping containers, global trade logistics",
    }

    # 제목에서 단어 단서 수집
    for ko_word, en_word in vocab_map.items():
        if ko_word in title:
            theme_clues.append(en_word)

    # 매칭되는 단서가 없으면 기본값 적용
    if not theme_clues:
        theme_clues.append(f"{kw_en} concept")

    # 묘사 융합
    clue_desc = ", ".join(theme_clues)

    if is_body:
        # 본문 중간 이미지는 글래스모피즘 효과가 융합된 세련된 현대적 인포그래픽 플랫 일러스트
        return (
            f"premium minimalist glassmorphism flat vector illustration representing {clue_desc}, "
            f"futuristic finance dashboard style, clean pastel gradients background, "
            f"no text, no letters, no human faces closeups, professional corporate high-tech look, "
            f"ultra high resolution, 4k, clean composition"
        )
    else:
        # 대표 이미지는 블로그 썸네일로서 눈길을 끄는 아늑한 책 표지 목업/감성 실사 사진
        return (
            f"a cozy study room table with an elegant minimalist book cover mockup, "
            f"representing {clue_desc}, warm natural lighting, aesthetic interior scene, "
            f"98% realistic photo with 2% soft warm illustration touch, "
            f"no text, no letters, no watermark, highly detailed, editorial photography, 8k"
        )


# ──────────────────────────────────────────────
# Pollinations.ai 이미지 다운로드 (완전 무료)
# ──────────────────────────────────────────────
def fetch_image(prompt: str, width: int, height: int, retries: int = 3) -> bytes | None:
    encoded = quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true&seed={int(time.time())}"
    for attempt in range(retries):
        try:
            print(f"   🎨 이미지 생성 중... ({width}×{height})")
            r = requests.get(url, timeout=90)
            if r.status_code == 200 and len(r.content) > 5000:
                return r.content
            print(f"   ⚠️  재시도 {attempt+1}/{retries}")
            time.sleep(3)
        except Exception as e:
            print(f"   ❌ 오류: {e}")
            time.sleep(3)
    return None

# ──────────────────────────────────────────────
# 이미지 압축 (500KB 이하)
# ──────────────────────────────────────────────
def compress_image(image_bytes: bytes, max_kb: int = 480) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    quality = 90
    while quality >= 40:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        size_kb = buf.tell() / 1024
        if size_kb <= max_kb:
            print(f"   ✅ 압축 완료: {size_kb:.0f}KB (quality={quality})")
            return buf.getvalue()
        quality -= 10
    # 최후 수단: 리사이즈
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=60, optimize=True)
    return buf.getvalue()

# ──────────────────────────────────────────────
# WordPress 미디어 업로드
# ──────────────────────────────────────────────
def upload_to_wp_media(
    image_bytes: bytes,
    filename: str,
    alt_text: str,
    caption: str,
    description: str,
) -> dict | None:
    """WordPress REST API로 이미지 업로드 후 미디어 ID 반환"""
    import re as _re
    # 파일명에서 한국어/특수문자 제거 (latin-1 인코딩 오류 방지)
    safe_filename = _re.sub(r"[^\w\-.]", "_", filename)
    safe_filename = _re.sub(r"_+", "_", safe_filename)

    upload_headers = {
        **WP_HEADERS,
        "Content-Type": "image/jpeg",
        "Content-Disposition": f"attachment; filename={safe_filename}",
    }
    try:
        # 1단계: 이미지 업로드
        r = requests.post(
            f"{API_BASE}/media",
            headers=upload_headers,
            data=image_bytes,
            timeout=60,
        )
        if r.status_code not in (200, 201):
            print(f"   ❌ 미디어 업로드 실패 ({r.status_code}): {r.text[:200]}")
            return None

        media = r.json()
        media_id = media["id"]

        # 2단계: alt/캡션/설명 업데이트
        r2 = requests.post(
            f"{API_BASE}/media/{media_id}",
            headers={**WP_HEADERS, "Content-Type": "application/json"},
            json={
                "alt_text":    alt_text,
                "caption":     caption,
                "description": description,
            },
            timeout=30,
        )
        if r2.status_code in (200, 201):
            print(f"   ✅ 미디어 업로드 완료! ID: {media_id}")
            print(f"      Alt: {alt_text}")
            print(f"      캡션: {caption}")
        return r2.json() if r2.status_code in (200, 201) else media

    except Exception as e:
        print(f"   ❌ 업로드 오류: {e}")
        return None

# ──────────────────────────────────────────────
# 메인 함수 — 외부에서 호출
# ──────────────────────────────────────────────
def generate_and_upload_images(
    title: str,
    focus_kw: str,
    post_date_str: str = "",
) -> dict:
    """
    대표 이미지 + 본문 중간 이미지를 생성하고 WP에 업로드.

    Returns:
        {
          "featured_media_id": int | None,
          "body_image_html":   str,   # <figure> 태그 HTML
        }
    """
    result = {"featured_media_id": None, "body_image_html": ""}
    timestamp = post_date_str or datetime.now().strftime("%Y%m%d%H%M%S")
    import random as _rand
    uid = _rand.randint(1000, 9999)

    # ── 1. 대표 이미지 (16:9, 1280×720) ──────────────
    print("\n  [이미지] 대표 이미지 생성 중...")
    featured_prompt = build_image_prompt(title, focus_kw, is_body=False)
    featured_bytes  = fetch_image(featured_prompt, width=1280, height=720)

    if featured_bytes:
        featured_bytes = compress_image(featured_bytes)
        filename_f = f"featured_{timestamp}_{uid}.jpg"          # 영문+숫자만
        alt_f      = focus_kw                                    # Rank Math 100% 일치 매칭
        caption_f  = f"{focus_kw} — {title[:40]}"
        desc_f     = f"{focus_kw}에 대한 핵심 정보를 담은 대표 썸네일 이미지입니다."

        media = upload_to_wp_media(featured_bytes, filename_f, alt_f, caption_f, desc_f)
        if media:
            result["featured_media_id"] = media["id"]
    else:
        print("  [경고] 대표 이미지 생성 실패")

    time.sleep(2)

    # ── 2. 본문 중간 이미지 (4:3, 960×720) ──────────
    print("\n  [이미지] 본문 중간 이미지 생성 중...")
    body_prompt = build_image_prompt(title, focus_kw, is_body=True)
    body_bytes  = fetch_image(body_prompt, width=960, height=720)

    if body_bytes:
        body_bytes = compress_image(body_bytes)
        filename_b = f"body_{timestamp}_{uid + 1}.jpg"          # 영문+숫자만
        alt_b      = focus_kw                                    # Rank Math 100% 일치 매칭
        caption_b  = f"{focus_kw} 핵심 포인트 정리"
        desc_b     = f"{focus_kw}의 주요 개념을 시각적으로 정리한 이미지입니다."

        media_b = upload_to_wp_media(body_bytes, filename_b, alt_b, caption_b, desc_b)
        if media_b:
            img_url = media_b.get("source_url", "")
            # WordPress <figure> 블록 HTML
            result["body_image_html"] = f"""
<figure class="wp-block-image size-large">
  <img src="{img_url}" alt="{alt_b}" title="{focus_kw}"/>
  <figcaption>{caption_b}</figcaption>
</figure>
"""

    else:
        print("  [경고] 본문 이미지 생성 실패")

    return result


def insert_body_image(html: str, body_image_html: str) -> str:
    """본문 HTML 중간 지점에 이미지 삽입"""
    if not body_image_html:
        return html
    # H2 태그 목록 찾기
    h2_positions = [m.start() for m in re.finditer(r"<h2", html, re.IGNORECASE)]
    if len(h2_positions) >= 3:
        # 3번째 H2 앞에 삽입
        insert_pos = h2_positions[2]
        return html[:insert_pos] + body_image_html + "\n" + html[insert_pos:]
    elif len(h2_positions) >= 2:
        insert_pos = h2_positions[1]
        return html[:insert_pos] + body_image_html + "\n" + html[insert_pos:]
    else:
        # H2가 없으면 중간에 삽입
        mid = len(html) // 2
        return html[:mid] + body_image_html + html[mid:]


# ──────────────────────────────────────────────
# 단독 실행 테스트
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  🎨 썸네일 생성기 테스트")
    print("=" * 50)
    result = generate_and_upload_images(
        title    = "금리 인하 수혜주 투자 전략",
        focus_kw = "금리",
    )
    print(f"\n대표 이미지 ID: {result['featured_media_id']}")
    print(f"본문 이미지 HTML: {result['body_image_html'][:100]}...")
