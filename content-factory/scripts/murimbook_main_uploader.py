import os
import sys
import json
import glob
import re
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

sys.stdout.reconfigure(encoding='utf-8')

# ── 1. 설정 및 ENV 로드 ──
load_dotenv(".env.local")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # 관리자 권한 키 필수

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 에러: SUPABASE 환경변수가 유실되었습니다. .env.local 파일을 확인하세요.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── 2. 원고 정화 함수 (HTML 찌꺼기 문자 완전 제거) ──
def clean_html_content(content: str) -> str:
    content = re.sub(r"```html\s*", "", content, flags=re.IGNORECASE)
    content = re.sub(r"```\s*", "", content)
    content = re.sub(r"<p[^>]*>\s*📌\s*이미지\s*Alt\s*Text.*?</p>", "", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"📌\s*이미지\s*Alt\s*Text.*?\n", "", content, flags=re.IGNORECASE)
    content = re.sub(r"ALT_TEXT:\s*.*?\n", "", content, flags=re.IGNORECASE)
    content = re.sub(r"<!--\s*ALT_TEXT:\s*.*?\s*-->", "", content, flags=re.IGNORECASE)
    content = re.sub(r"\[ALT_TEXT:\s*.*?\]", "", content, flags=re.IGNORECASE)
    content = content.replace("[X]", "").replace("☒", "")
    content = re.sub(r"(독자\s*관점\s*소제목|세부\s*소제목|실전\s*적용법|주의사항/체크리스트|비교/분석|마무리|인간적\s*결론|공식\s*출처\s*링크|해시태그)\s*[\(]*[가-힣\s]*[\)]*\s*[:-]", "", content)
    content = re.sub(r"독자\s*관점\s*소제목\s*-\s*", "", content)
    return content.strip()

# ── 3. 로컬 파일과 워드프레스 기존 5개에 대응되는 총 10개 원고 정보 정의 ──
# (기 발행/예약된 5개와 로컬 대기 5개를 묶어 총 10개 포스트를 생성 및 매칭)
post_list = [
    # ── [예약 1~5번] 현재 시간 기준 +1시간부터 +5시간 뒤까지 순차 배치 ──
    {
        "id": "post_government_loan_regulation_policy",
        "folder_pattern": "시장_혼돈_키우는__정책실장_입",
        "focus_kw": "정부 대출 규제 정책",
        "title": "정부 대출 규제 정책 | 부동산 시장 혼란 속 직장인 한도 비교 전략",
        "intro": "정부 대출 규제 정책은 최근 부동산 자산 시장의 향방을 가르는 가장 뜨거운 주제입니다. 이 글을 통해 시시각각 변화하는 규제 흐름 속에서 직장인들이 최선의 대출 한도를 확보하고 비교하는 실전 전략을 명확하게 제시해 드립니다.",
        "hour_offset": 1
    },
    {
        "id": "post_us_semiconductor_leverage_etf",
        "folder_pattern": "반도체주_떨어졌다고요__3배로_베팅",
        "focus_kw": "미국 반도체 레버리지",
        "title": "미국 반도체 레버리지 | 3배 ETF 고위험 투자의 장단점 분석",
        "intro": "미국 반도체 레버리지 투자는 최근 고수익을 노리는 서학개미들 사이에서 폭발적인 관심을 받고 있습니다. 고수익의 이면에 숨겨진 3배 레버리지 ETF의 치명적인 리스크와 장단점 분석을 통해 안전한 자산 관리 비법을 공유합니다.",
        "hour_offset": 2
    },
    {
        "id": "post_family_economy_education_museum",
        "folder_pattern": "한국예탁결제원_증권박물관_인기",
        "focus_kw": "가족 경제 교육 추천",
        "title": "가족 경제 교육 추천 | 증권박물관 실물 전시를 활용한 문해력 공부법",
        "intro": "가족 경제 교육 추천 장소로 손꼽히는 증권박물관은 자녀의 조기 경제 관념을 심어주기에 최적의 공간입니다. 실물 증권 전시물을 살펴보며 아이들의 금융 문해력을 쉽고 재미있게 키워줄 수 있는 구체적인 홈스쿨링 공부법을 정리했습니다.",
        "hour_offset": 3
    },
    {
        "id": "post_investor_deposit_market_forecast",
        "folder_pattern": "개미들__실탄__떨어졌나",
        "focus_kw": "투자자 예탁금 증시 전망",
        "title": "투자자 예탁금 증시 전망 | 주식 실탄 감소가 자산 시장에 미치는 파장",
        "intro": "투자자 예탁금 증시 전망은 향후 주식 시장의 반등 여부를 예측하는 중요한 선행 지표입니다. 개인 투자자들의 실탄이 감소함에 따라 향후 자산 시장에 미칠 파장과 포트폴리오 대응 요령을 정밀히 짚어봅니다.",
        "hour_offset": 4
    },
    {
        "id": "post_ai_semiconductor_technology_trends",
        "folder_pattern": "백화점_아래_반도체_요람",
        "focus_kw": "AI 반도체 기술 트렌드",
        "title": "AI 반도체 기술 트렌드 | 카이스트 동탄 사이언스 허브 연구 현황 가이드",
        "intro": "AI 반도체 기술 트렌드는 미래 디지털 경제 패권을 좌우할 핵심 기술 분야입니다. 동탄 롯데백화점 지하에 위치한 카이스트 사이언스 허브의 4개년 성과와 핵심 연구 현황 가이드를 통해 최첨단 IT 산업의 흐름을 조명합니다.",
        "hour_offset": 5
    },
    # ── [발행 6~10번] 현재 시간 기준 +6시간부터 +10시간 뒤까지 순차 배치 ──
    {
        "id": "post_card_point_cashback",
        "folder_pattern": "카드_포인트_현금화",
        "focus_kw": "카드 포인트 계좌입금",
        "title": "카드 포인트 계좌입금 | 여신금융협회 통합 조회 및 즉시 현금화 방법",
        "intro": "카드 포인트 계좌입금 방법은 잠자고 있는 카드 포인트를 한 번에 찾아 현금으로 돌려받을 수 있는 매우 간편하고 유익한 제도입니다. 카드사별 조회를 일일이 할 필요 없이 통합 계좌입금 신청법을 안내합니다.",
        "hour_offset": 6
    },
    {
        "id": "post_telecom_refund_inquiry",
        "folder_pattern": "통신사_미환급금_조회",
        "focus_kw": "통신사 미환급금 조회",
        "title": "통신사 미환급금 조회 | SKT KT LGU+ 미수령 통신비 돌려받는 요령",
        "intro": "통신사 미환급금 조회 제도를 활용하면 해지나 통신 요금 중복 납부로 인해 묵혀둔 미수령 통신비를 즉시 정산받을 수 있습니다. 누락 없이 100% 돌려받는 안전하고 유익한 조회 요령을 전해드립니다.",
        "hour_offset": 7
    },
    {
        "id": "post_samjeomsam_tax_refund",
        "folder_pattern": "삼쩜삼_환급금_조회",
        "focus_kw": "삼쩜삼 환급금 조회",
        "title": "삼쩜삼 환급금 조회 | 국세청 홈택스 기한후신고 세금 돌려받기 팁",
        "intro": "삼쩜삼 환급금 조회 서비스를 통해 지난 5년간 누락되었던 종합소득세 숨은 환급 세금을 안전하게 환급받으실 수 있습니다. 기한 후 신고 시 수수료를 절감하고 홈택스에서 직접 신청해 환원받는 요령을 알아봅니다.",
        "hour_offset": 8
    },
    {
        "id": "post_hidden_bank_deposit_refund",
        "folder_pattern": "은행_잠자는_계좌",
        "focus_kw": "숨은 예금 찾기 요령",
        "title": "숨은 예금 찾기 요령 | 내 계좌 한눈에 잠자는 휴면 예금 조회 방법",
        "intro": "숨은 예금 찾기 요령을 통해 오랫동안 잊고 지낸 휴면 예금과 숨어 있는 보험금을 한 번에 통합 조회할 수 있습니다. 서민금융진흥원 및 내 계좌 한눈에 서비스를 활용한 정산 팁을 공유합니다.",
        "hour_offset": 9
    },
    {
        "id": "post_work_incentive_qualification",
        "folder_pattern": "근로장려금_자녀장려금",
        "focus_kw": "근로장려금 소득 자격",
        "title": "근로장려금 소득 자격 | 2026 자녀장려금 지급일 및 신청 기준 표",
        "intro": "근로장려금 소득 자격 기준은 저소득 근로자 가구의 실질 자립을 지원하기 위해 설계된 장려 세제 혜택 요건입니다. 가구 구성원별 단독, 홑벌이, 맞벌이 소득 한도 기준 표와 자녀장려금 신청 절차를 총정리합니다.",
        "hour_offset": 10
    }
]

print("=== 📚 무림북 메인 홈페이지 DB (Supabase) 10개 도움되는글 직접 적재 시작 ===")

# 한국 표준시(KST, UTC+9) 기준으로 예약 시각 설정
KST = timezone(timedelta(hours=9))
base_now = datetime.now(KST)

for post in post_list:
    pid = post["id"]
    
    # 1. 로컬 post.html 원본 파일 찾기 (기존 폴더 매칭)
    pattern = f"content-factory/output/*{post['folder_pattern']}*/post.html"
    matched_files = glob.glob(pattern)
    
    # 만약 기존 카드 포인트나 환급금 같은 글은 백업 경로(과거 폴더 또는 wp uploader 캐시 폴더)에서 탐색 시도
    if not matched_files:
        # 광범위하게 캐시된 html 파일이 존재하는지 2차 탐색
        pattern_fallback = f"content-factory/output/**/*{post['folder_pattern']}*/**/*.html"
        matched_files = glob.glob(pattern_fallback, recursive=True)
        
    if not matched_files:
        # 정적인 기사 본문이 로컬에 없으면 기본 서론 본문으로 임시 복원 조치
        content_html = f"<p><strong>{post['focus_kw']}</strong> — {post['intro']}</p><p>세부 정보 준비 중입니다. 본문을 확인하려면 나중에 다시 접속해주세요.</p>"
        print(f"  ⚠️  [{pid}] 로컬 HTML 원본 없음 -> 임시 기본 템플릿 사용")
    else:
        with open(matched_files[0], "r", encoding="utf-8") as f:
            content_html = clean_html_content(f.read())
            print(f"  ✔ [{pid}] 로컬 파일 로드 완료: {os.path.basename(matched_files[0])}")

    # 2. 이미지 썸네일 경로 셋팅
    # R2 버킷 및 도메인 기반 경로 매핑
    thumbnail_url = f"https://image.murimbook.com/works/{pid}.jpg"
    
    # 3. 예약 날짜 및 시간 계산 (+1시간, +2시간 ...)
    scheduled_time = base_now + timedelta(hours=post["hour_offset"])
    scheduled_iso = scheduled_time.isoformat()
    
    # 도움되는글 작품 데이터 조립
    work_payload = {
        "id": pid,
        "title": post["title"],
        "description": content_html, # 무림북 메인 도움되는글은 description 필드에 본문이 통째로 들어감
        "subtitle": "[블로그]", # 도움되는글 분류를 위해 필수 포함
        "genre": "블로그",
        "status": "공개예정", # 예약 상태
        "thumbnail_url": thumbnail_url,
        "total_episodes": 1,
        "free_episodes": 1,
        "episode_count": 1,
        "badge": "추천",
        "created_at": scheduled_iso
    }
    
    # 4. Supabase DB에 Works upsert 날리기 (있으면 수정, 없으면 삽입)
    try:
        res = supabase.table("works").upsert(work_payload).execute()
        print(f"  ✅ [성공] {post['hour_offset']}시간 뒤 예약 -> ID: {pid} ({post['title'][:25]}...)")
        print(f"     - 예약 발행 시각: {scheduled_time.strftime('%Y-%m-%d %H:%M:%S')} (KST)")
    except Exception as e:
        print(f"  ❌ [실패] ID: {pid} -> 에러: {e}")

print("\n=== 무림북 메인 홈페이지 10개 예약글 이식 완료! ===")
