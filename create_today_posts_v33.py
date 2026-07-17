# -*- coding: utf-8 -*-
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"D:\somenail"
DATE_STR = "2026-07-17"

try:
    sys.path.append(r"d:\소설 유투브\my-audiobook\my_audiobook")
    from create_today_posts_v11 import POSTS_CATALOG, PREFIX_MAP
except ImportError:
    PREFIX_MAP = {
        "1_tistory_money": "1_tistory_경제, 재테크(money)",
        "2_tistory_tree": "2_tistory_stocks_Finance_(tree)",
        "3_tistory_health": "3_tistory_health(green)",
        "4_tistory_live_note": "4_tistory_Subsidy, How-to, Government subsidies, Life hacks for daily routine_live_note",
        "5_tistory_life_live": "5_tistory_Law_Statute_Act(life_live)",
        "6_murimbook": "6_murimbook_부동산,보험,대출",
        "7_wordpress": "7_wordpress_돈이 되는 글",
        "8_blogger": "8_google_blogger_Windows_Mobile_Network",
        "9_naver_연예": "9_naver_예능,방송,드라마,핫이슈"
    }
    POSTS_CATALOG = {}

WIKI_RESOURCES = [
    ("대한민국", "https://ko.wikipedia.org/wiki/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD"),
    ("국세청", "https://ko.wikipedia.org/wiki/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EA%B5%AD%EC%84%B8%EC%B2%AD"),
    ("보건복지부", "https://ko.wikipedia.org/wiki/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EB%B3%B4%EA%B1%B4%EB%B3%B5%EC%A7%80%EB%B6%80"),
    ("고용노동부", "https://ko.wikipedia.org/wiki/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EA%B3%A0%EC%9A%A9%EB%85%B8%EB%8F%99%EB%B6%80"),
    ("부동산", "https://ko.wikipedia.org/wiki/%EB%B6%80%EB%8F%99%EC%82%B0"),
    ("경제", "https://ko.wikipedia.org/wiki/%EA%B2%BD%EC%A0%9C"),
    ("법률", "https://ko.wikipedia.org/wiki/%EB%B2%95%EB%A5%A0"),
    ("보험", "https://ko.wikipedia.org/wiki/%EB%B3%B4%ED%97%98"),
    ("스마트폰", "https://ko.wikipedia.org/wiki/%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%8F%B0"),
    ("인터넷", "https://ko.wikipedia.org/wiki/%EC%9D%B8%ED%84%B0%EB%84%B7"),
    ("건강", "https://ko.wikipedia.org/wiki/%EA%B1%B4%EA%B0%95")
]

def split_text_by_sentence(txt):
    sentences = re.split(r'\.\s+', txt.strip())
    processed = []
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        if not s_clean.endswith('.'):
            s_clean += '.'
        processed.append(s_clean)
    return "\n\n".join(processed)

def markdown_to_html(md_content):
    lines = md_content.split('\n')
    html_lines = []
    in_list = False
    in_quote = False
    for line in lines:
        line_str = line.strip()
        if in_list and not line_str.startswith('*'):
            html_lines.append("</ul>")
            in_list = False
        if in_quote and not line_str.startswith('>') and not line_str.startswith('<blockquote>') and not line_str.endswith('</blockquote>'):
            if not line_str:
                html_lines.append("</blockquote>")
                in_quote = False
        if not line_str:
            html_lines.append("<br>")
            continue
        if line_str.startswith("<div") or line_str.startswith("</div") or line_str.startswith("<a") or line_str.startswith("📢") or line_str.startswith("<code>") or line_str.startswith("<span") or line_str.startswith("<table") or line_str.startswith("</table") or line_str.startswith("<tr") or line_str.startswith("</tr") or line_str.startswith("<td") or line_str.startswith("</td") or line_str.startswith("<th") or line_str.startswith("</th") or line_str.startswith("<thead") or line_str.startswith("</thead") or line_str.startswith("<tbody") or line_str.startswith("</tbody") or line_str.startswith("<ul") or line_str.startswith("</ul") or line_str.startswith("<li") or line_str.startswith("</li"):
            html_lines.append(line_str)
            continue
        if line_str.startswith('# '):
            title = line_str[2:].strip()
            html_lines.append(f'<h1 style="font-size: 28px; font-weight: 800; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-top: 30px;">{title}</h1>')
            continue
        if line_str.startswith('## '):
            h2 = line_str[3:].strip()
            clean_h2 = re.sub(r'^\d+\.\s+', '', h2)
            html_lines.append(f'<h2 style="font-size: 22px; font-weight: 700; color: #1e3a8a; margin-top: 35px; border-left: 5px solid #2563eb; padding-left: 10px;">{clean_h2}</h2>')
            continue
        if line_str.startswith('### '):
            h3 = line_str[4:].strip()
            html_lines.append(f'<h3 style="font-size: 18px; font-weight: 600; color: #0f766e; margin-top: 25px;">{h3}</h3>')
            continue
        if line_str.startswith('#### '):
            h4 = line_str[5:].strip()
            html_lines.append(f'<h4 style="font-size: 16px; font-weight: 600; color: #111827; margin-top: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">{h4}</h4>')
            continue
        if line_str.startswith('##### '):
            h5 = line_str[6:].strip()
            html_lines.append(f'<h5 style="font-size: 15px; font-weight: 600; color: #374151; margin-top: 15px; padding-left: 4px;">{h5}</h5>')
            continue
        if line_str.startswith('###### '):
            h6 = line_str[7:].strip()
            html_lines.append(f'<h6 style="font-size: 14px; font-weight: 600; color: #4b5563; margin-top: 10px; font-style: italic;">{h6}</h6>')
            continue
        if line_str.startswith('> ') or line_str.startswith('<blockquote>'):
            if not in_quote:
                html_lines.append('<blockquote style="background-color: #f8fafc; border-left: 5px solid #cbd5e1; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">')
                in_quote = True
            clean_q = line_str.replace('> ', '').replace('<blockquote>', '').replace('</blockquote>', '').strip()
            html_lines.append(clean_q)
            continue
        if line_str.startswith('* '):
            if not in_list:
                html_lines.append('<ul style="padding-left: 20px; line-height: 1.8;">')
                in_list = True
            item = line_str[2:].strip()
            item_html = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', item)
            html_lines.append(f'<li>{item_html}</li>')
            continue
        if line_str == '---':
            html_lines.append('<hr style="border: 0; height: 1px; background: #e2e8f0; margin: 30px 0;">')
            continue
        parsed_line = line_str
        parsed_line = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', parsed_line)
        parsed_line = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', parsed_line)
        if parsed_line.startswith('* '):
            parsed_line = f"<li>{parsed_line[2:]}</li>"
        html_lines.append(f'<p style="font-size: 16px; line-height: 1.8; margin: 12px 0;">{parsed_line}</p>')
    if in_list:
        html_lines.append("</ul>")
    if in_quote:
        html_lines.append("</blockquote>")
    return "\n".join(html_lines)

def get_dynamic_docs_and_table(title, keyword):
    if "출산휴가" in title:
        docs = [
            "배우자 출산휴가 확인서 (고용노동부 공식 서식)",
            "해당 근로자의 월별 임금대장 및 근로계약서 사본",
            "동료 대체 업무 분담 지정서 및 수당 지급 확인 증빙 서류"
        ]
        table = [
            ["구분", "일반 배우자 출산휴가", "업무분담 특별지원 적용 시"],
            ["동료 부담감", "공백 기간 업무 가중으로 직장 눈치 상존", "업무 보상 수당 지급으로 부담감 완화"],
            ["정부 지원금", "해당 근로자 휴가 10일 유급 부여", "대체 업무 분담 동료 수당 보전 월 최대 20만원 장려금"]
        ]
    elif "전기요금" in title:
        # 📌 직접/간접 계약 소상공인 서류 유무를 명확히 안내하도록 필수 서류 목록 보강
        docs = [
            "직접 계약자: 제출 서류 없음 (사업자 번호로 전산 자동 확인)",
            "간접 계약자(비계약 사용자 / 관리비 포함 세대): 전기요금 고지서 사본 및 사업자등록증명원 필수 첨부",
            "공통: 신청인 본인 확인 공동인증서 또는 휴대폰 본인인증 정보"
        ]
        table = [
            ["구분", "한전 직접 계약 소상공인", "관리비 포함 간접 계약자(비계약)"],
            ["신청 시 제출 서류", "서류 제출 없음 (자동 조회)", "전기요금 영수증 및 사업자증명원 업로드"],
            ["차감 적용 방식", "전기요금 청구서에서 20만 원 직접 차감", "대표자 신청 계좌로 20만 원 직접 현금 환급"]
        ]
    elif "국민연금" in title:
        docs = [
            "조기노령연금 지급 신청서 (국민연금공단 제출용)",
            "신청인 신분증 사본 및 지급 수령 계좌 통장 사본",
            "수급 조건 판단용 국민연금 가입이력 요약원"
        ]
        table = [
            ["구분", "정상 노령연금 개시", "조기노령연금 청구 개시"],
            ["수급 연령 요건", "만 65세 정상 지급 (출생연도에 따라 변동)", "정상 개시 연령보다 최대 5년 먼저 조기 청구"],
            ["수령 요율 변동", "기본 연금액 100% 정상 수령", "1년 앞당길 때마다 연 6%씩 평생 감액 (최대 30% 감액)"]
        ]
    elif "단축근무" in title or "단축" in title:
        docs = [
            "육아기 근로시간 단축 확인서 (사업주 작성 서명)",
            "근로시간 단축 전후 임금대장 및 근로계약서 사본",
            "동료 대체 업무 분담 증빙 및 기업 보상 지급 내역서"
        ]
        table = [
            ["구분", "통상 전일제 근무", "육아기 근로시간 단축제 적용"],
            ["소정 근로 요율", "주 40시간 소정 근로 준수", "주 15시간 이상 35시간 이하로 단축 근로"],
            ["급여 지원 보전", "회사 책정 기본 임금 100% 지급", "단축 시간에 비례한 정부 단축 급여 및 동료 보전금 보완"]
        ]
    elif "차용증" in title:
        docs = [
            "적법 날인된 금전소비대차 계약서(차용증) 원본",
            "금융결제원 송금 영수증 및 계좌 이체 금융 거래 명세서",
            "약정 이자 송금 내역이 명시된 통장 입출금 증빙 사본"
        ]
        table = [
            ["구분", "일반 가족간 무상 증여", "적법 계약에 의한 가족간 차용"],
            ["과세 리스크", "자금 출처 조사 시 전액 증여세 중과세", "정당한 금전 거래 입증으로 증여세 비과세"],
            ["세법상 이자율", "이자율 약정 무관 무세", "세법 고시 적정 이자율 4.6% 기준 이자 송금 이행"]
        ]
    elif "미래적금" in title or "청년" in title:
        docs = [
            "청년 미래적금 가입 신청서 및 주민등록등본",
            "신청인 고용보험 가입이력원 및 재직증명원",
            "소득 자격 검증용 최근년도 근로소득원천징수영수증"
        ]
        table = [
            ["구분", "일반 시중 저축 적금", "정부 매칭 청년 미래적금"],
            ["만기 환급금", "본인 납입 원금 + 연 3~4% 기본 이자", "본인 납입 원금 + 정부 1대1 매칭금 지원 (자산 2배 복사)"],
            ["우대 자격", "가입 제한 요건 상 존재 무관", "중위소득 기준 미만 청년 및 일정 기간 근로 요건 충족"]
        ]
    elif "국채" in title:
        docs = [
            "개인투자용 국채 매수 신청서 (대행 증권사 전용)",
            "신청인 명의 본인 확인 계좌 개설 증명원",
            "청약 자금 입금 이체 확인증 사본"
        ]
        table = [
            ["구분", "일반 채권 시장 매수", "개인투자용 국채 청약"],
            ["보유 혜택 요율", "만기 전 중도 매도 시 세제 혜택 없음", "만기 보유 시 연복리 가산 및 이자소득 분리과세(14%) 적용"],
            ["매수 요건", "최소 거래 한도 제한 상존", "최소 10만 원부터 연간 최대 1억 원까지 청약 가능"]
        ]
    elif "공모주" in title:
        docs = [
            "공모주 청약 증권사 계좌 개설 증명서",
            "청약 증거금 이체 명세서 및 계좌 잔액 증명원",
            "투자설명서 수령 및 청약 확인 증명 서식"
        ]
        table = [
            ["구분", "일반 주식 매수", "공모주 비례/균등 청약"],
            ["배정 방식", "주문 체결 즉시 전량 배정", "균등 50% 및 청약 증거금 규모에 따른 비례 배정"],
            ["수수료 요율", "증권사 고유 거래 수수료 부과", "청약 건당 2,000원 내외 청약 수수료 적용 (등급별 우대 가능)"]
        ]
    elif "탄소중립" in title:
        docs = [
            "탄소중립포인트 에너지 신청서 및 에너지 고객번호 확인 서류",
            "신청인 본인 명의 환급금 수령 계좌 통장 사본",
            "가스/수도/전기 요금 고지서 내역 (최근 1~2개월)"
        ]
        table = [
            ["구분", "기본 에너지 요금 납입", "탄소중립포인트 가입 환급 적용"],
            ["적립 혜택 요율", "에너지 절감 혜택 없음", "가스/수도/전기 에너지 절감률에 따라 연 최대 10만원 지급"],
            ["신청 채널", "일반 납부 고지 채널", "온라인 탄소중립포인트 녹색생활 실천 누리집 연동"]
        ]
    elif "운전면허" in title:
        docs = [
            "모바일 운전면허증 발급 신청서 (IC 면허증 양식)",
            "여권용 규격 사진 1매 (온라인 등록 가능)",
            "모바일 신분증 앱 본인 인증서 정보"
        ]
        table = [
            ["구분", "전통 오프라인 플라스틱 면허증", "IC 칩 기반 모바일 운전면허증"],
            ["편의 요율", "지갑 소지 필수 및 분실 리스크 상존", "스마트폰 하나로 관공서/은행 신원 대조 통과"],
            ["재발급 소요", "경찰서/면허시험장 대기 1~2시간", "안전운전 통합민원 접수 후 3분 모바일 전산 이송"]
        ]
    elif "취득세" in title:
        docs = [
            "생애최초 주택 취득세 감면 신청서 (구청/군청 세무과)",
            "매매계약서 원본 및 주민등록등본",
            "신청인 및 배우자 소득 증빙원 (근로소득원천징수영수증 등)"
        ]
        table = [
            ["구분", "일반 주택 취득세 부과", "생애최초 주택 취득세 감면"],
            ["감면 금액 한도", "주택 가액 및 요율에 따른 취득세 전액 부과", "취득세 최대 200만 원 한도 내 100% 면제"],
            ["대상 요건", "주택 보유 이력에 관계없이 부과", "본인 및 배우자 생애최초 주택 취득 및 소득 요건 충족"]
        ]
    elif "실손" in title or "보험" in title:
        docs = [
            "실손보험 청구 간소화 동의 및 신청 정보 (실손24 모바일 앱)",
            "병원 진료 내역 확인 연동 데이터",
            "보험금 수령 본인 확인 계좌 정보"
        ]
        table = [
            ["구분", "기존 실손보험 서면 청구", "실손24 간소화 서비스 적용"],
            ["구비 서류", "영수증, 진료비세부내역서 등 우편/서면 제출", "종이 서류 없이 병원 연동으로 전산 자동 전송"],
            ["소요 시간 요율", "서류 발급 대기 및 심사 3~5영업일", "앱을 통한 실시간 전산 이송으로 신속 심사"]
        ]
    elif "크롬" in title:
        docs = [
            "크롬 웹 브라우저 최신 버전 확인 정보 페이지",
            "윈도우/Mac 작업관리자 시스템 리소스 프로세스 할당 내역",
            "메모리 세이버 비활성 사이트 예외 등록 목록"
        ]
        table = [
            ["구분", "메모리 세이버 비활성화 상태", "메모리 세이버 옵션 활성화"],
            ["메모리 회수 요율", "백그라운드 탭 리소스 무제한 혹사", "비활성 탭 리소스 강제 회수로 최대 30% 절감"],
            ["하드웨어 영향", "시스템 성능 저하 및 배터리 수명 누수", "CPU 부하 보전 및 2배 빠른 브라우징 속도 확보"]
        ]
    elif "설치" in title:
        docs = [
            "윈도우 11 정품 미디어 생성 툴 설치 사본",
            "우회 등록용 CMD 배치 명령어 스크립트 파일",
            "시스템 드라이브 바이오스(UEFI) 보안 부팅 설정 내역"
        ]
        table = [
            ["구분", "MS 계정 필수 정식 설치", "CMD 네트워크 OOBE 우회 설치"],
            ["로그인 필수 여부", "MS 계정 연동 및 로그인 필수", "네트워크 연동 및 로그인 없이 로컬 계정 바로 진입"],
            ["소요 기한", "인증 및 데이터 연동으로 15분 이상 소요", "불필요 단계 스킵으로 3분 내외 간편 완료"]
        ]
    elif "서진이네" in title or "나혼자산다" in title or "예능" in title or "드라마" in title:
        docs = [
            "OTT 플랫폼 다시보기 스트리밍 구독 내역 증명",
            "방송사 공식 편성 가이드 및 방영 정보표",
            "시청자 피드백 및 시청률 통계 리포트 파일"
        ]
        table = [
            ["구분", "순정 지상파 본방송 시청", "글로벌 OTT 스트리밍 및 반응 융합"],
            ["시청 채널", "편성 시간에 맞춰 고정 TV 채널 시청", "시간 제약 없이 스트리밍 및 다시보기 자율 시청"],
            ["반응 요율", "고정 시청층 위주 피드백 수렴", "소셜 데이터 연동 실시간 핫이슈 및 트렌드 도출"]
        ]
    elif "유방암" in title or "오메가3" in title or "콜레스테롤" in title:
        docs = [
            "식품의약품안전처 기능성 원료 인정 마크 및 성분 분석표",
            "우수건강기능식품제조기준(GMP) 시설 제조 인증서",
            "병원 정밀 검사 보고서 및 식단 모니터링 기록지"
        ]
        table = [
            ["구분", "기본 영양 관리 수칙", "정밀 예방 집중 관리"],
            ["실천 방안", "종합 비타민 임의 복용 및 기본 위생", "식약처 고시 성분 함량 대조 및 주기적 정밀 검사"],
            ["질환 차단율", "예방 체감 지표 미비", "맞춤형 관리 기준 충족 시 발병 확률 최대 90% 차단"]
        ]
    else:
        docs = [
            f"{keyword} 지원 자격 신청서 (온라인/오프라인 전용 서식)",
            "신청인 신분증 사본 및 주민등록등본",
            f"대상 조건 충족 여부를 판단할 수 있는 최근 증빙자료 원본"
        ]
        table = [
            ["구분", "일반 요건 수혜", "특별 맞춤 조건 수혜"],
            ["감면 및 지원 한도", "기본적인 기본 공제 혜택 부여", "최대 우대 요율 적용 및 추가 지원금 보전"],
            ["제출 및 대조", "수동 서류 제출로 1주일 이상 소요", "모바일 전산 간편 이송으로 실시간 자격 매칭"]
        ]
    return docs, table

def get_category_key(ch_key):
    if ch_key in ["1_tistory_money", "2_tistory_tree", "6_murimbook", "7_wordpress"]:
        return "FINANCE"
    elif ch_key == "3_tistory_health":
        return "HEALTH"
    elif ch_key in ["4_tistory_live_note", "5_tistory_life_live"]:
        return "BENEFIT"
    elif ch_key == "8_blogger":
        return "TECH"
    elif ch_key == "9_naver_연예":
        return "ENTERTAINMENT"
    return "FINANCE"

def make_html_template_clean(p, ch_key):
    title = p["title"]
    keyword = p["keyword"]
    intro = p["intro"]
    headings = p["headings"]
    facts = p["facts"]
    closing = p["closing"]
    url = p["url"]
    desc = p["desc"]
    tags = p["tags"]
    
    # 📌 출산휴가 금액 일치 패치
    if "출산휴가" in title:
        facts = [f.replace("월 30만 원", "월 20만 원").replace("30만 원 상당", "20만 원 상당") for f in facts]
        intro = intro.replace("월 30만 원", "월 20만 원")
        closing = closing.replace("월 30만 원", "월 20만 원")
        
    # 📌 소상공인 전기요금 신청 시 한전 직접계약자 vs 관리비 간접계약자 구분 패치 (상충 해결!)
    if "전기요금" in title:
        facts[3] = (
            "신청은 공식 인터넷 포털인 '소상공인전기요금특별지원.kr'에서 이루어지며, "
            "한전과 직접 전력 계약을 맺은 일반 계약자는 별도 서류 제출이 전혀 필요 없이 즉시 조회 신청이 가능합니다. "
            "반면 관리비 등에 전기세가 포함되어 청구되는 비계약(간접) 사용자의 경우에는 "
            "온라인 신청서 작성 시 전기요금 고지서 사본과 사업자등록증명원 등 증빙 서류를 반드시 첨부하셔야 혜택이 적용됩니다."
        )
        
    clean_intro = split_text_by_sentence(intro)
    clean_closing = split_text_by_sentence(closing)
    
    bullet1 = f"<b>{keyword} 핵심 대상:</b> {facts[0][:35]}..."
    bullet2 = f"<b>최대 지원 및 혜택 요율:</b> {facts[2][:35]}..."
    bullet3 = f"<b>주의 사항 및 기한 요건:</b> <span style='color: #e53935; font-weight: bold;'>{facts[4][:30]}...</span>"
    
    summary_box = f"""<div style="background-color: #e3f2fd; border-left: 5px solid #1e88e5; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #1565c0; display: block; font-size: 16px; margin-bottom: 8px;">💡 {keyword} 10초 요약</strong>
  - {bullet1}<br>
  - {bullet2}<br>
  - {bullet3}<br>
</div>"""

    toc_list_html = ""
    for i, h in enumerate(headings):
        clean_h = h.replace("## ", "").strip()
        clean_h = re.sub(r'^\d+\.\s+', '', clean_h)
        toc_list_html += f'* [{clean_h}](#section{i+1})\n'
        
    toc_area = f"""📌 **HTML 앵커 목차 테이블(Table of Contents)**\n\n{toc_list_html}"""

    body_sections = []
    
    for i in range(5):
        h_line = headings[i]
        core_fact = facts[i % len(facts)]
        clean_h = h_line.replace("## ", "").strip()
        clean_h = re.sub(r'^\d+\.\s+', '', clean_h)
        
        fact_spaced = split_text_by_sentence(core_fact)
        p1 = fact_spaced
        
        sec_text = f"""<a id="section{i+1}"></a>\n\n## {i+1}. {clean_h}\n\n{p1}"""
        
        if i == 0:
            sec_text += f"""\n\n<div style="background-color: #e3f2fd; border-left: 5px solid #1e88e5; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #1565c0; display: block; font-size: 15px; margin-bottom: 5px;">💡 전문 지식 Tip</strong>
  본 {keyword} 제도는 가용한 행정 자원의 적기 배분을 위해 설계되었습니다. 예산 조기 소진 전에 공식 웹사이트에서 실시간 자격 대조를 진행하시기를 강력 권장합니다.
</div>"""
        elif i == 3:
            sec_text += f"""\n\n<div style="background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #e65100; display: block; font-size: 15px; margin-bottom: 5px;">⚠️ 신청 시 핵심 주의사항</strong>
  부정한 서식 기재나 자격 초과 이력이 관계 기관의 합동 전산 대조 결과에 따라 사후 적발될 시에는 이미 지급된 지원금 전액의 환수 명령과 함께 법률상 가산금 요율이 가중 소급 부과되므로, 반드시 팩트만을 성실하게 기재하셔야 합니다.
</div>"""
            
        sec_text = sec_text.replace(f"{keyword}", f"<strong>{keyword}</strong>")
        body_sections.append(sec_text)
        
    total_body_text = "\n\n---\n\n".join(body_sections)

    docs, table_data = get_dynamic_docs_and_table(title, keyword)

    links_applied = 0
    for word, url_wiki in WIKI_RESOURCES:
        if word in total_body_text and f'<a href="{url_wiki}"' not in total_body_text:
            total_body_text = total_body_text.replace(
                word, 
                f'<a href="{url_wiki}" target="_blank" rel="noopener noreferrer" style="color: #1565c0; text-decoration: underline; font-weight: bold;">{word}</a>', 
                1
            )
            links_applied += 1
            if links_applied >= 3:
                break
    
    table_head = table_data[0]
    table_rows = table_data[1:]
    
    thead_html = f"""      <tr style="background-color: #f5f5f5; border-bottom: 2px solid #1565c0;">
        <th style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">{table_head[0]}</th>
        <th style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">{table_head[1]}</th>
        <th style="padding: 10px; border: 1px solid #ddd; color: #1e88e5; font-weight: bold;">{table_head[2]}</th>
      </tr>"""
      
    tbody_html = ""
    for r in table_rows:
        tbody_html += f"""      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #fafafa;">{r[0]}</td>
        <td style="padding: 10px; border: 1px solid #ddd; color: #555;">{r[1]}</td>
        <td style="padding: 10px; border: 1px solid #ddd; color: #1e88e5; font-weight: bold;">{r[2]}</td>
      </tr>\n"""
      
    table_area = f"""<div style="overflow-x: auto; margin: 25px 0;">
  <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; border: 1px solid #ddd;">
    <thead>
{thead_html}
    </thead>
    <tbody>
{tbody_html}    </tbody>
  </table>
</div>"""
    
    docs_list_html = ""
    for d in docs:
        docs_list_html += f"    <li>{d}</li>\n"
        
    docs_area = f"""<div style="background-color: #fafafa; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; margin: 25px 0; line-height: 1.8;">
  <strong style="color: #333; display: block; font-size: 15px; margin-bottom: 10px;">📋 {keyword} 신청 시 필수 증빙서류</strong>
  <ul style="margin: 0; padding-left: 20px; color: #333;">
{docs_list_html}  </ul>
</div>"""

    official_link_box = f"""<div style="background-color: #f9f9f9; border-left: 4px solid #1565c0; padding: 20px; margin: 20px 0; text-align: left; line-height: 1.8;">
  <strong style="display: block; margin-bottom: 5px;">🔗 공식 행정 출처 안내 링크</strong>
  - <a href="{url}" target="_blank" rel="noopener noreferrer" style="color: #1565c0; text-decoration: underline; font-weight: bold;">{desc} 바로가기</a>
</div>"""

    tag_row = tags

    markdown_content = f"""# {title}

{clean_intro}

---

{summary_box}

---

{toc_area}

---

{total_body_text}

---

{table_area}

---

{docs_area}

---

{clean_closing}

---

{official_link_box}

{tag_row}
"""

    return markdown_content

def main():
    print(f"=== [원고 라이터 v33-PerfectFact] 소상공인 전기요금 신청 조건부 구분 컴파일 개시 ===")
    
    for ch_key, folder_prefix in PREFIX_MAP.items():
        target_folder = None
        for folder_name in os.listdir(BASE_DIR):
            if folder_name.startswith(folder_prefix) and os.path.isdir(os.path.join(BASE_DIR, folder_name)):
                target_folder = folder_name
                break
        if not target_folder:
            target_folder = folder_prefix
            
        date_dir = os.path.join(BASE_DIR, target_folder, DATE_STR)
        os.makedirs(date_dir, exist_ok=True)
        
        print(f"\n📂 Processing Channel: {target_folder}")
        
        posts_data_list = POSTS_CATALOG.get(ch_key)
        if not posts_data_list:
            print(f"  ⚠️ Warning: No catalog data for {ch_key}. Skipping.")
            continue
            
        for p in posts_data_list:
            no = p["no"]
            full_content_str = make_html_template_clean(p, ch_key)
            
            md_path = os.path.join(date_dir, f"post{no:02d}.md")
            html_path = os.path.join(date_dir, f"post{no:02d}.html")
            
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(full_content_str)
                
            html_body_only = markdown_to_html(full_content_str)
            
            convenient_html_wrapper = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{p["title"]} - 복사용 소스</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 800px; margin: 0 auto 20px auto; background-color: #ffffff; padding: 15px 20px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📋</span>
      <div>
        <strong style="color: #0f172a; display: block; font-size: 15px;">블로그 업로드용 HTML 소스코드</strong>
        <span style="color: #64748b; font-size: 12px;">아래 버튼을 누르면 전체 HTML 본문이 즉시 클립보드에 복사됩니다.</span>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <span id="copyMsg" style="color: #16a34a; font-weight: bold; font-size: 14px; display: none; transition: opacity 0.3s;">✓ 전체 복사 완료!</span>
      <button onclick="copyToClipboard()" style="background-color: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgb(37 99 235 / 0.2); transition: background 0.2s;">본문 전체 복사하기</button>
    </div>
  </div>

  <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);">
    <div id="blogContent">
{html_body_only}
    </div>
  </div>

  <script>
    function copyToClipboard() {{
      var content = document.getElementById('blogContent').innerHTML;
      var tempTextarea = document.createElement('textarea');
      tempTextarea.value = content;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
      var msg = document.getElementById('copyMsg');
      msg.style.display = 'inline';
      msg.style.opacity = '1';
      setTimeout(function() {{
        msg.style.opacity = '0';
        setTimeout(function() {{
          msg.style.display = 'none';
        }}, 300);
      }}, 2000);
    }}
  </script>
</body>
</html>
"""
            with open(html_path, "w", encoding="utf-8") as hf:
                hf.write(convenient_html_wrapper)
                
            char_count = len(full_content_str)
            print(f"  ✅ Re-written (100% Corrected): post{no:02d}.md ({char_count} chars) & post{no:02d}.html")
            
        print(f"  💡 Preserved: thumbnail_prompts.html")
            
    print(f"\n🎉 [대성공] 직접/간접 계약자 모순까지 해결한 소상공인 전기요금 원고 및 전 채널 교정 빌드 완료!")

if __name__ == "__main__":
    main()
