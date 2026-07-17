"""
실시간 롱테일 키워드 발굴기 — keyword_researcher.py

소스:
  1. Google Trends (pytrends) — 실시간 트렌딩 + 연관 쿼리
  2. Google 자동완성 API     — 사람들이 실제 치는 롱테일
  3. Daum(카카오) 자동완성   — 국내 롱테일 검색어

결과:
  → content-factory/data/longtail_keywords.json 저장
  → news_crawler.py, gemini_writer.py 에서 우선 활용

실행법:
    python content-factory/scripts/keyword_researcher.py
"""

import json
import os
import time
import re
import requests
import sqlite3
from datetime import datetime
from urllib.parse import quote

try:
    from pytrends.request import TrendReq
    PYTRENDS_OK = True
except ImportError:
    print("⚠️  pytrends 없음 — pip install pytrends")
    PYTRENDS_OK = False

# ──────────────────────────────────────────────
# 경로 설정 및 env.local 로드
# ──────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.path.join(BASE_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "longtail_keywords.json")
os.makedirs(DATA_DIR, exist_ok=True)

def load_env():
    possible_paths = [
        os.path.join(BASE_DIR, "../.env.local"),
        os.path.join(BASE_DIR, ".env.local"),
        os.path.abspath(".env.local"),
        os.path.abspath("../.env.local")
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")
            break

# 환경변수 로딩 실행
load_env()

# ──────────────────────────────────────────────
# 시드 키워드 (블로그 주제 중심)
# ──────────────────────────────────────────────
SEED_KEYWORDS = [
    "금리", "재테크", "부업", "투자", "적금", "예금",
    "주식", "ETF", "부동산", "절세", "연말정산",
    "청년도약계좌", "청년저축", "직장인", "대출",
    "신용점수", "보험", "ISA계좌", "CMA통장",
]

# ──────────────────────────────────────────────
# 1. Google 자동완성 (롱테일 핵심)
# ──────────────────────────────────────────────
def google_autocomplete(keyword: str) -> list[str]:
    """구글 자동완성으로 롱테일 키워드 수집"""
    suffixes = ["", " 방법", " 조건", " 추천", " 순위", " 비교",
                " 2026", " 신청", " 장단점", " 주의사항"]
    results = []
    for suffix in suffixes:
        query = keyword + suffix
        url = (
            f"https://suggestqueries.google.com/complete/search"
            f"?q={quote(query)}&hl=ko&gl=KR&client=firefox"
        )
        try:
            r = requests.get(url, timeout=5,
                             headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                data = r.json()
                if len(data) > 1 and isinstance(data[1], list):
                    for suggestion in data[1]:
                        if len(suggestion) >= 8 and keyword in suggestion:
                            results.append(suggestion.strip())
            time.sleep(0.3)
        except Exception:
            pass
    return list(set(results))


# ──────────────────────────────────────────────
# 2. Daum(카카오) 자동완성
# ──────────────────────────────────────────────
def daum_autocomplete(keyword: str) -> list[str]:
    """Daum 자동완성으로 국내 롱테일 키워드 수집"""
    url = f"https://suggest.daum.net/suggest?q={quote(keyword)}&mod=json"
    results = []
    try:
        r = requests.get(url, timeout=5,
                         headers={"User-Agent": "Mozilla/5.0",
                                  "Referer": "https://www.daum.net"})
        if r.status_code == 200:
            data = r.json()
            # Daum 응답 형식: {"q": [...], ...}
            for key in ["q", "items", "suggestions"]:
                if key in data:
                    items = data[key]
                    if isinstance(items, list):
                        for item in items:
                            word = item if isinstance(item, str) else item.get("word", "")
                            if word and len(word) >= 6 and keyword in word:
                                results.append(word.strip())
    except Exception:
        pass
    return list(set(results))


# ──────────────────────────────────────────────
# 3. Google Trends — 실시간 트렌딩 + 연관 쿼리
# ──────────────────────────────────────────────
def google_trends_realtime() -> list[str]:
    """한국 실시간 트렌딩 검색어 (구글 트렌드 차단 시 Perplexity API로 백업 수집)"""
    pplx_key = os.getenv("PERPLEXITY_API_KEY")
    if pplx_key:
        try:
            print("  [Perplexity 실시간 백업] 구글 트렌드를 대체할 실시간 경제 롱테일 키워드 탐색 중...")
            url = "https://api.perplexity.ai/chat/completions"
            headers = {
                "Authorization": f"Bearer {pplx_key.strip()}",
                "Content-Type": "application/json"
            }
            # Perplexity의 표준 및 안정 모델인 'sonar'로 셋팅
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "user",
                        "content": "현재 한국 포털 및 구글에서 검색량이 급상승 중인 실시간 금융, 재테크, 2026 정부 정책 관련 구체적인 롱테일 키워드 15개를 콤마(,)로만 구분해서 나열해줘. 설명은 절대 생략하고 단어들만 콤마로 나열해줘. (예: 2026년 청년도약계좌 신청 조건, 소상공인 대환대출 조건 등)"
                    }
                ],
                "temperature": 0.2
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                # 마크다운 찌꺼기나 줄바꿈 제거
                text_clean = re.sub(r"[*`_#\-]", "", text)
                keywords = [k.strip() for k in text_clean.split(",") if len(k.strip()) >= 5]
                if keywords:
                    print(f"  [Perplexity 성공] 실시간 키워드 {len(keywords)}개 발굴 완료!")
                    return keywords
            else:
                print(f"  [Perplexity HTTP 에러]: {resp.status_code} ({resp.text[:100]})")
        except Exception as e:
            print(f"  [Perplexity 실시간 탐색 실패]: {e}")

    if not PYTRENDS_OK:
        return []
    try:
        pt = TrendReq(hl="ko-KR", tz=540, timeout=(10, 25))
        df = pt.trending_searches(pn="south_korea")
        return df[0].tolist()[:20]
    except Exception as e:
        # Trends 404 등의 에러는 조용히 넘김 (이미 Perplexity에서 시도했으므로)
        return []


# ──────────────────────────────────────────────
# 키워드 품질 필터
# ──────────────────────────────────────────────
EXCLUDE_PATTERNS = [
    r"^.{1,4}$",        # 너무 짧음
    r"뉴스$", r"속보$", # 뉴스성 제외
    r"사망$", r"사고$", # 사건사고 제외
    r"연예$", r"스포츠$",
    r"^\d+$",           # 숫자만
    r"없습니다$", r"않아$", r"나열할", r"목록이", r"검색 결과", r"포털 및 구글",  # AI 거절/설명 문구 차단
    r"불가능합니다", r"오정보를", r"제공되지", r"확인할 수", r"\[\d+\]" # AI 거절 및 출처 주석 낙인 차단
]

ACTION_BOOST = ["방법", "조건", "추천", "비교", "순위", "신청",
                "장단점", "주의", "가이드", "후기", "2026", "2025"]

def score_keyword(kw: str) -> int:
    """키워드 SEO 가치 점수 (높을수록 좋음 - 복합 롱테일 우대)"""
    # 1. 35자 초과 장문(설명 문장) 또는 너무 짧고 공백 없는 1차원 단어 배제
    if len(kw.strip()) >= 35:
        return -1
    if len(kw.strip()) < 5 and " " not in kw:
        return -1
        
    score = 0
    # 단어 내에 공백이 1개 이상 포함되어 있는 복합 롱테일 키워드에 큰 가중치 부여
    if " " in kw.strip():
        score += 4
        
    # 길이 점수 (8~25자 롱테일 최적)
    if 8 <= len(kw) <= 25:
        score += 3
    elif 6 <= len(kw) <= 30:
        score += 1
        
    # 행동 및 목적어 키워드 포함 시 보너스
    for action in ACTION_BOOST:
        if action in kw:
            score += 2
            
    # 제외 패턴 체크
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, kw):
            return -1
            
    return score



def filter_keywords(keywords: list[str], min_score: int = 2) -> list[str]:
    scored = [(kw, score_keyword(kw)) for kw in keywords]
    scored = [(kw, s) for kw, s in scored if s >= min_score]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [kw for kw, _ in scored]


# ──────────────────────────────────────────────
# 기존 저장 데이터 로드
# ──────────────────────────────────────────────
def load_existing() -> dict:
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"keywords": [], "updated_at": ""}


def save_keywords(new_keywords: list[str], source_map: dict):
    # ── 1. DB에서 과거에 이미 원고 작성을 완료한 키워드 목록 긁어오기 ──
    used_keywords = set()
    db_path = os.path.join(DATA_DIR, "history.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            # 이미 발행 완료되었거나 작성된 키워드 조회
            cursor.execute("SELECT keyword FROM post_history")
            rows = cursor.fetchall()
            used_keywords = {row[0].strip() for row in rows if row[0]}
            conn.close()
            
            # 임시 락 파일 used_keywords.txt 버퍼 키워드 목록 추가 병합 (실시간 크로스 검증)
            lock_file = os.path.join(DATA_DIR, "used_keywords.txt")
            if os.path.exists(lock_file):
                with open(lock_file, "r", encoding="utf-8") as lf:
                    for line in lf:
                        if line.strip():
                            used_keywords.add(line.strip())
                            
            print(f"  [DB/임시버퍼 중복 검증] 총 {len(used_keywords)}개 사용 완료된 키워드 제외 처리 진행")
        except Exception as e:
            print(f"  [DB 중복 검증 경고] 히스토리 조회 실패: {e}")

    existing = load_existing()
    old_set  = set(existing.get("keywords", []))
    
    raw_merged = old_set | set(new_keywords)
    
    # ── 2. [핵심] 이미 발행에 써먹은 키워드는 최종 목록에서 원천 배제 ──
    filtered_merged = [kw for kw in raw_merged if kw.strip() not in used_keywords]
    filtered_merged.sort()

    output = {
        "keywords":    filtered_merged,
        "count":       len(filtered_merged),
        "new_added":   len(set(new_keywords) - old_set - used_keywords),
        "source_map":  source_map,
        "updated_at":  datetime.now().isoformat(),
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    return output


# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  실시간 롱테일 키워드 발굴기")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 55)

    all_keywords = []
    source_map   = {}

    # ── 1. Google Trends 실시간 트렌딩 ──────────
    print("\n[1/3] Google Trends 실시간 트렌딩...")
    trending = google_trends_realtime()
    print(f"  트렌딩 {len(trending)}개: {trending[:5]}")
    
    # 발굴된 키워드를 즉시 수집 리스트에 추가 (2차 중복 발굴 딜레이 제거)
    for kw in trending:
        all_keywords.append(kw)
        source_map[kw] = {"source": "google_trends", "longtails": [kw]}

    # ── 2. [핵심] 실시간 트렌드가 충분히 수집되었다면 시드 자동완성은 건너뜀 ──
    if len(all_keywords) >= 10:
        print("\n[수집 완료] 실시간 트렌드 키워드를 성공적으로 발굴하여 자동완성을 스킵합니다!")
    else:
        # ── 3. Google 자동완성 (시드 키워드 백업) ────────
        print(f"\n[2/3] Google 자동완성 ({len(SEED_KEYWORDS)}개 시드)...")
        for kw in SEED_KEYWORDS:
            suggestions = google_autocomplete(kw)
            filtered    = filter_keywords(suggestions, min_score=2)
            all_keywords.extend(filtered)
            if filtered:
                source_map[kw] = {"source": "google_autocomplete", "longtails": filtered[:3]}
                print(f"  [{kw}] → {filtered[:3]}")
            time.sleep(0.5)

        # ── 4. Daum(카카오) 자동완성 (백업) ─────────────────
        print(f"\n[3/3] Daum(카카오) 자동완성...")
        for kw in SEED_KEYWORDS[:10]:
            daum_results = daum_autocomplete(kw)
            filtered     = filter_keywords(daum_results, min_score=1)
            all_keywords.extend(filtered)
            if filtered:
                print(f"  [{kw}] Daum → {filtered[:2]}")
            time.sleep(0.3)

    # ── 최종 필터 + 저장 ────────────────────────
    final = filter_keywords(list(set(all_keywords)), min_score=2)
    result = save_keywords(final, source_map)

    print("\n" + "=" * 55)
    print(f"  완료!")
    print(f"  총 롱테일 키워드: {result['count']}개")
    print(f"  신규 추가: {result['new_added']}개")
    print(f"  저장: {OUTPUT_FILE}")
    print("=" * 55)

    # 상위 10개 미리보기
    print("\n  [상위 키워드 미리보기]:")
    for kw in result["keywords"][:10]:
        print(f"    - {kw}")


if __name__ == "__main__":
    main()
