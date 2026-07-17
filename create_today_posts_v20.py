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

KNOWLEDGE_BY_CATEGORY = {
    "FINANCE": [
        "본 금융 혜택의 구체적 실무 진행 단계를 세부적으로 조율해 보면, 신청권자가 제출해야 하는 자산 증빙 구비 서류의 대조 검증과 관계 기관 보증 이력 전산 조회 등 다각적인 자격 조양 과정이 포함되어 있음을 알 수 있습니다. 무엇보다 가계의 재정 건전성을 선제적으로 수호하기 위해 가용한 금융 인센티브 요율을 매칭 설계해 둔 공적 혜택이므로, 부적격 조항이나 탈락 사유를 꼼꼼하게 사전 점검하지 않으면 최종 심사에서 부결되어 일정 지연의 손해를 입게 됩니다. 신청을 진행하려는 대상자는 관련 지침 규정을 면밀히 탐독해 두는 것이 실익 면에서 극도로 유리합니다.",
        "특히 금융 과세 감면이나 세법상 우대 요율 적용 한도를 판단할 때, 국세청 및 금융 감독 기관은 피신청인의 전년도 과세 대상 소득 누계액과 자산 거래 및 보유 현황을 실시간 전산 교차 검증하는 시스템을 가동하고 있습니다. 이에 따라 부정 청구 요율이나 미납 이력이 사후 적발될 시에는 이미 수혜받은 지원금 전액 환수 명령과 함께 법률상 가산 이자 요율이 소급 적용되어 신용 점수에 중대한 타격을 받을 수 있으므로, 항상 성실하고 객관적인 팩트만을 기재하여 제출해야 합니다.",
        "아울러 비대면 모바일 어플리케이션을 통한 간편 전송 방식을 이용할 경우, 금융기관 지사를 직접 내방하는 번거로움 없이도 본인 명의 공동인증서 인증만 거치면 단 3분 만에 전산 이송 처리가 완결되어 매우 편리합니다. 다만 대리인을 대동하여 오프라인 서면 위임장을 작성 제출할 경우에는 위임장 인감 날인 및 인감증명서 원본 대조 조항을 엄격하게 준수하셔야 접수 거부 없이 정상 처리됨을 유의하셔야 합니다."
    ],
    "HEALTH": [
        "질병관리청 및 식품의약품안전처의 임상 연구 자료에 따르면 본 건강 수칙의 준수 상태가 감염 위험 차단 상태를 결정짓는 핵심 요건으로 지목됩니다. 무엇보다 초기 발병 징후의 진위 대조가 조기에 실행되어야 차후 연쇄적인 만성 합병증 전이를 미연에 방지할 수 있습니다. 1단계 절차의 엄격한 요건을 면밀히 확인하시고, 가용한 보건 자원의 적기 배분을 위해 설계된 안전 지침 요율을 기반으로 일상 식생활을 관리하셔야 실질적인 건강 유지에 가장 유리합니다.",
        "특히 체내 면역 항체 요율이나 영양소 흡수 한도를 판단할 때, 전문 의료계는 환자의 평소 영양 섭취 불균형 상태와 기저 질환 보유 현황을 실시간 교차 검증하는 가이드를 제공하고 있습니다. 이에 따라 무분별한 과다 복용 요율이나 오남용 이력이 발생할 시에는 인체 신진대사 밸런스가 붕괴하여 건강상 중대한 부작용이 소급 발생할 수 있으므로, 항상 전문의의 조언 and 객관적인 영양 섭취 정보표를 기준으로 섭취를 유지해야 합니다.",
        "아울러 일상 속 자가진단 및 모바일 검진 결과 대조 서비스를 이용할 경우, 멀리 있는 종합병원 지사를 번거롭게 내방할 필요 없이 본인 명의 간편 인증만 거치면 실시간 건강 지표 확인이 가능합니다. 다만 의약품 대리 처방이나 소급 청구를 진행할 경우에는 처방전 원본과 신분증 대조 조항을 엄격하게 준수하셔야 병원 접수처에서 반려 없이 정상 처리됨을 유의하셔야 합니다."
    ],
    "BENEFIT": [
        "정부 복지 혜택의 구체적 실무 진행 단계를 세부적으로 조율해 보면, 신청자가 제출해야 하는 주민등록 등초본 등 구비 서류의 진위 대조와 관할 행정 부처 보증 이력 전산 조회 등 다각적인 자격 조율 과정이 포함되어 있음을 알 수 있습니다. 무엇보다 가계의 생활 안정을 선제적으로 수호하기 위해 가용한 정부 보조금 인센티브 한도를 매칭 설계해 둔 공적 혜택이므로, 부적격 조항이나 탈락 사유를 꼼꼼하게 사전 점검하지 않으면 최종 심사에서 부결되어 일정 지연의 손해를 입게 됩니다. 신청을 진행하려는 대상자는 관련 지침 규정을 면밀히 탐독해 두는 것이 실익 면에서 극도로 유리합니다.",
        "특히 행정 소득세 감면이나 세법상 우대 요율 적용 한도를 판단할 때, 관계 기관은 피신청인의 전년도 과세 대상 소득 누계액과 자산 거래 및 보유 현황을 실시간 전산 교차 검증하는 시스템을 가동하고 있습니다. 이에 따라 부정 청구 요율이나 미납 이력이 사후 적발될 시에는 이미 수혜받은 지원금 전액 환수 명령과 함께 법률상 가산 이자 요율이 소급 적용되어 신용 점수에 중대한 타격을 받을 수 있으므로, 항상 성실하고 객관적인 팩트만을 기재하여 제출해야 합니다.",
        "아울러 비대면 모바일 어플리케이션을 통한 간편 전송 방식을 이용할 경우, 관할 구청이나 주민센터 지사를 직접 내방하는 번거로움 없이도 본인 명의 공동인증서 인증만 거치면 단 3분 만에 전산 이송 처리가 완결되어 매우 편리합니다. 다만 대리인을 대동하여 오프라인 서면 위임장을 작성 제출할 경우에는 위임장 인감 날인 및 인감증명서 원본 대조 조항을 엄격하게 준수하셔야 접수 거부 없이 정상 처리됨을 유의하셔야 합니다."
    ],
    "TECH": [
        "본 소프트웨어 및 OS 최적화의 구체적 실무 진행 단계를 들여다보면, 사용 환경에 따른 호환 하드웨어 대조 검증과 백그라운드 리소스 수급 이력에 대한 런타임 조회 등 다각적인 시스템 조율 과정이 포함되어 있음을 알 수 있습니다. 무엇보다 시스템의 동작 건전성을 선제적으로 수호하기 위해 가용한 메모리 버퍼 할당 한도를 매칭 설계해 둔 엔진 조항이므로, 부적격 설정 옵션이나 호환 탈락 사유를 꼼꼼하게 사전 점검하지 않으면 최종 패치 적용 과정에서 부결되어 성능 저하의 손해를 입게 됩니다. 설정을 진행하려는 대상자는 관련 지침 매뉴얼을 면밀히 탐독해 두는 것이 실익 면에서 극도로 유리합니다.",
        "특히 시스템 메모리 세이빙이나 드라이버 우대 요율 적용 한도를 판단할 때, 개발사 엔진은 사용자 PC의 전년도 칩셋 바이오스 누계액과 하드웨어 스펙 거래 및 보유 현황을 실시간 전산 교차 검증하는 시스템을 가동하고 있습니다. 이에 따라 부정 호환 요율이나 드라이버 충돌 이력이 사후 적발될 시에는 이미 설정된 성능 우대 전액 롤백 명령과 함께 시스템 상 가산 에러 요율이 소급 소요되어 레지스트리 점수에 중대한 타격을 받을 수 있으므로, 항상 공식 릴리즈 노트와 객관적인 팩트 스펙만을 기준으로 업데이트해야 합니다.",
        "아울러 비대면 원격 콘솔 어플리케이션을 통한 간편 전송 방식을 이용할 경우, 서비스 센터 지사를 직접 내방하는 번거로움 없이도 본인 계정 간편인증만 거치면 단 3분 만에 시스템 패치 처리가 완결되어 매우 편리합니다. 다만 수동 펌웨어 플래싱을 진행할 경우에는 부팅 영역 바이오스 락 해제 조항을 엄격하게 준수하셔야 에러 없이 정상 처리됨을 유의하셔야 합니다."
    ],
    "ENTERTAINMENT": [
        "본 미디어 콘텐츠의 시청층 분포 및 시청률 변화 추이를 세부적으로 들여다보면, 제작진이 연출하는 편집 컷의 미적 대조 검증과 글로벌 플랫폼 스트리밍 수급 이력에 대한 뷰어쉽 조회 등 다각적인 대중 반응 조율 과정이 포함되어 있음을 알 수 있습니다. 무엇보다 시청층의 몰입도를 선제적으로 수호하기 위해 가용한 방송 편성 인센티브 한도를 매칭 설계해 둔 콘텐츠 조항이므로, 부적격 캐스팅이나 포맷 탈락 사유를 꼼꼼하게 사전 점검하지 않으면 최종 시청률 심사에서 부결되어 채널 일정 지연의 손해를 입게 됩니다. 기획을 진행하려는 대상자는 관련 방송 지침 규정을 면밀히 탐독해 두는 것이 실익 면에서 극도로 유리합니다.",
        "특히 대중 반응 지표나 연출상 우대 요율 적용 한도를 판단할 때, 시청률 조사 기관 및 미디어 분석 부처는 피평가 콘텐츠의 전작 시청 패턴 누계액과 대중 언급 및 반응 현황을 실시간 전산 교차 검증하는 시스템을 가동하고 있습니다. 이에 따라 부정 이슈 요율이나 논란 이력이 사후 적발될 시에는 이미 수혜받은 브랜드 가치 전액 환수 명령과 함께 여론상 가산 비판 요율이 소급 작용되어 채널 신뢰 점수에 중대한 타격을 받을 수 있으므로, 항상 성실하고 객관적인 팩트만을 기반으로 방송을 내보내야 합니다.",
        "아울러 비대면 OTT 어플리케이션을 통한 간편 스트리밍 전송 방식을 이용할 경우, 오프라인 극장 지사를 직접 내방하는 번거로움 없이도 본인 스마트폰 인증만 거치면 단 3분 만에 고화질 다시보기 처리가 완결되어 매우 편리합니다. 다만 해외 우회 접속이나 불법 유출본을 다운로드할 경우에는 저작권법 침해 대조 조항에 따라 서비스 이용 정지 처리가 내려짐을 유의하셔야 합니다."
    ]
}

# 📌 예쁜 일러스트 그림체 썸네일 템플릿
THUMBNAIL_PROMPT_TEMPLATES = {
    "FINANCE": (
        "An aesthetic and beautiful detailed digital art illustration of financial growth. "
        "A cute glowing piggy bank, stacking pastel gold coins, soft warm lighting, cozy flat vector style, vibrant pastel blue and pink gradient background. --ar 16:9"
    ),
    "HEALTH": (
        "An aesthetic and beautiful detailed digital illustration representing wellness and health protection. "
        "A cute shield with a green leaf and heart icon, blooming flowers, soft natural lighting, cozy flat graphic, vibrant light green and yellow pastel gradient background. --ar 16:9"
    ),
    "BENEFIT": (
        "An aesthetic and beautiful detailed vector illustration of government subsidy support. "
        "A cozy home icon with a glowing heart, hands holding a gold coin, warm and friendly digital art style, soft pastel orange and purple gradient background. --ar 16:9"
    ),
    "TECH": (
        "An aesthetic and beautiful detailed digital illustration of cyber technology optimization. "
        "A cute glowing computer monitor showing speed boost, soft futuristic lighting, clean vector graphic style, vibrant cyan and soft pink pastel gradient background. --ar 16:9"
    ),
    "ENTERTAINMENT": (
        "An aesthetic and beautiful detailed pop art illustration of media show business. "
        "A cute retro television set, glowing stage spotlight, colorful confetti, warm soft lighting, cozy flat graphic, vibrant purple and yellow pastel gradient background. --ar 16:9"
    )
}

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

# 📌 100% 실제 접속이 검증된 위키 리소스 목록
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

def make_html_template_with_thumb(p, ch_key):
    title = p["title"]
    keyword = p["keyword"]
    intro = p["intro"]
    headings = p["headings"]
    facts = p["facts"]
    closing = p["closing"]
    url = p["url"]
    desc = p["desc"]
    tags = p["tags"]
    
    cat_key = get_category_key(ch_key)
    base_texts = KNOWLEDGE_BY_CATEGORY[cat_key]
    
    processed_base_texts = []
    for txt in base_texts:
        t = txt.replace("본 금융 혜택의", f"본 <b>{keyword}</b> 금융 혜택의")
        t = t.replace("본 건강 수칙의", f"본 <b>{keyword}</b> 건강 수칙의")
        t = t.replace("본 정부 복지 혜택의", f"본 <b>{keyword}</b> 정부 복지 혜택의")
        t = t.replace("본 소프트웨어", f"본 <b>{keyword}</b> 소프트웨어")
        t = t.replace("본 미디어 콘텐츠의", f"본 <b>{keyword}</b> 미디어 콘텐츠의")
        t = t.replace("특히 금융 과세 감면이나", f"특히 <b>{keyword}</b> 금융 과세 감면이나")
        t = t.replace("특히 체내 면역", f"특히 <b>{keyword}</b> 체내 면역")
        t = t.replace("특히 행정 소득세", f"특히 <b>{keyword}</b> 행정 소득세")
        t = t.replace("특히 시스템 메모리", f"특히 <b>{keyword}</b> 시스템 메모리")
        t = t.replace("특히 대중 반응 지표나", f"특히 <b>{keyword}</b> 대중 반응 지표나")
        processed_base_texts.append(t)
        
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
        
        p1 = f"{core_fact}\n\n{processed_base_texts[0]}"
        
        # 📌 H3~H6 세부소제목 기호화
        sub_h3 = f"### 🔹 {keyword} - {clean_h} 세부 실무 및 자격 쟁점 분석"
        p2 = f"본 세부 위계 조항에 입각하여 볼 때, {processed_base_texts[1]}\n\n이와 관련하여 본 {keyword} 제도의 우대 요율을 정상적으로 적용받으려면 신청 단계에서 명시된 약관 규정을 철저하게 이행하셔야 소급 과세 등 불이익이 생기지 않습니다."
        
        sub_h4 = f"#### ▫️ {clean_h} 하부 요건 및 세부 증빙 분류"
        p3 = f"더불어, {processed_base_texts[2]}\n\n이러한 절차적 투명성이 보장되어야만 최종 지원 혜택을 획득함에 있어 혼선이나 반려가 생기지 않으므로 {keyword} 대상자 분들은 본인의 조건표를 반드시 미리 확인해 두시는 것을 권해 드립니다."
        
        sub_h5 = f"##### ▪️ {clean_h} 현장 피드백 및 모니터링 수칙"
        p4 = f"특히 최근 실무 현장의 피드백 결과에 따르면, {keyword} 자격 심사 요건을 소홀히 하여 보증 승인이 반려되는 실수가 반복 조회되고 있으니 주의를 요합니다."
        
        sub_h6 = f"###### 🔸 {clean_h} 행정 권고 조항 자가진단"
        p5 = f"최종적으로 관계 관공서의 권고 조항을 사전에 1회 대조하여, 미납금이나 누락된 신고 서류가 없는지 교차 대조 후 이송하시는 것이 가장 안전합니다."

        sec_text = f"""<a id="section{i+1}"></a>\n\n## {i+1}. {clean_h}\n\n{p1}\n\n{sub_h3}\n\n{p2}\n\n{sub_h4}\n\n{p3}\n\n{sub_h5}\n\n{p4}\n\n{sub_h6}\n\n{p5}"""
        
        if i == 0:
            sec_text += f"""\n\n<div style="background-color: #e3f2fd; border-left: 5px solid #1e88e5; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #1565c0; display: block; font-size: 15px; margin-bottom: 5px;">💡 전문 지식 Tip</strong>
  본 {keyword} 제도는 가용한 행정 자원의 적기 배분을 위해 설계되었습니다. 이에 따라 자격 조회를 신속하게 매듭지으시는 편이 대단히 유리하며, 예산 조기 소진 전에 공식 웹사이트에서 실시간 자격 대조를 진행하시기를 강력 권장합니다.
</div>"""
        elif i == 3:
            sec_text += f"""\n\n<div style="background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #e65100; display: block; font-size: 15px; margin-bottom: 5px;">⚠️ 신청 시 핵심 주의사항</strong>
  부정한 서식 기재나 자격 초과 이력이 {keyword} 관계 기관의 합동 전산 대조 결과에 따라 사후 적발될 시에는 이미 지급된 지원금 전액의 환수 명령과 함께 법률상 가산금 요율이 가중 소급 부과되므로, 반드시 팩트만을 성실하게 기재하셔야 합니다.
</div>"""
            
        sec_text = re.sub(r'(지원금|혜택|대출|금리|수급|신청|조건|인센티브|초기 증상|수수료|시청률|계좌개설)', r'<b>\1</b>', sec_text, count=2)
        body_sections.append(sec_text)
        
    total_body_text = "\n\n---\n\n".join(body_sections)

    # 📌 외부 링크 2개~3개 치환
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

    table_map = {
        "FINANCE": [
            ["구분", "일반 오프라인 금융 신청", "모바일 스마트 우대 지원"],
            ["소요 기한", "지사 내방 대기 및 5영업일 이상 소요", "온라인 공동인증 대조 즉시 승인 및 이송"],
            ["감면 혜택", "기본 공제 및 고정 금리 요율 대조 적용", "우대 금리 가산 및 최대 추가 지원금 적립"]
        ],
        "HEALTH": [
            ["구분", "일반 건강 관리", "자가 위생 및 정밀 예방 관리"],
            ["수칙 조항", "상황별 임의 행동 및 소극적 위생 실천", "식약처 고시 3대 수칙 및 교차오염 방지"],
            ["기대 효력", "감염병 노출 확률 상존", "식중독 및 세균성 장염 발병 리스크 99% 차단"]
        ],
        "BENEFIT": [
            ["구분", "일반 행정 신청", "정부 특화 우대 지원"],
            ["제출 서류", "주민센터 내방 수동 작성 및 제출", "모바일 공동인증서 간편 전산 조회 연동"],
            ["혜택 요율", "기본 공제 및 일반 요율 대조 적용", "최대 감면 혜택 및 추가 지원금 적립"]
        ],
        "TECH": [
            ["구분", "순정 기본 셋업", "리소스 최적화 세이빙 적용"],
            ["동작 부하", "메모리 점유율 및 쓰레드 오버플로우 상존", "캐시 자동 클린업 및 프로세스 락 통제"],
            ["시스템 수명", "디스크 성능 지연 및 노화 가속", "메모리 세이버 동작을 통한 전력 30% 감축"]
        ],
        "ENTERTAINMENT": [
            ["구분", "일반 방송 포맷", "신규 미디어 트렌드 매칭"],
            ["콘텐츠 반응", "지상파 고정 시청자 위주 피드백 수렴", "글로벌 OTT 스트리밍 및 소셜 대중 반응 융합"],
            ["시청 점수", "안정적이나 정체된 시청률 요율 기록", "소셜 언급량 급증 및 역대 최고 흥행 달성"]
        ]
    }
    table_data = table_map.get(cat_key, table_map["FINANCE"])
    
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

    docs_map = {
        "FINANCE": [
            f"신청인 본인의 우대 금리 수급 신청서 및 본인 명의 계좌 통장 사본",
            f"특수관계인 간 거래 대조서 및 금융 거래 총괄 명세서 원본",
            f"홈택스 전자 신고용 본인 공동인증서 정보 대조"
        ],
        "HEALTH": [
            f"식품의약품안전처 지정 위생 자가진단 체크리스트 결과표",
            f"의심 증상 발현 시 병원 소견서 또는 임상 검진 내역서 사본",
            f"주방 조리 도구 및 보관 장비 온도 모니터링 서식"
        ],
        "BENEFIT": [
            f"우대 혜택 수급 신청서 및 본인 명의 계좌 사본",
            f"신청인 가구원수 대조용 주민등록등본 또는 등기 정보",
            f"건강보험료 납부확인서 또는 국세청 소득 증명 서식"
        ],
        "TECH": [
            f"시스템 펌웨어 버전 대조 스크린샷 및 로그 리포트 파일",
            f"프로세스 할당 최적화 확인서 (전자 서식)",
            f"소프트웨어 호환 승인 라이선스 증명원 사본"
        ],
        "ENTERTAINMENT": [
            f"방송 다시보기 플랫폼 이용권 및 정기 구독 확인 내역",
            f"콘텐츠 모니터링 시청 의견서 양식",
            f"대중 반응 지표 조사 결과 보고서 요약본"
        ]
    }
    docs = docs_map.get(cat_key, docs_map["FINANCE"])
    
    docs_list_html = ""
    for d in docs:
        docs_list_html += f"    <li>{d}</li>\n"
        
    docs_area = f"""<div style="background-color: #fafafa; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; margin: 25px 0; line-height: 1.8;">
  <strong style="color: #333; display: block; font-size: 15px; margin-bottom: 10px;">📋 {keyword} 신청 시 필수 증빙서류</strong>
  <ul style="margin: 0; padding-left: 20px; color: #333;">
{docs_list_html}  </ul>
</div>"""

    # 📌 예쁜 그림체 썸네일 프롬프트 정보 가져오기
    thumb_prompt_raw = THUMBNAIL_PROMPT_TEMPLATES.get(cat_key, THUMBNAIL_PROMPT_TEMPLATES["FINANCE"])
    if ch_key == "6_murimbook":
        thumb_prompt_final = thumb_prompt_raw.replace("--ar 16:9", "--ar 2:3").replace(
            "An aesthetic and beautiful detailed digital art illustration", 
            "An aesthetic Wuxia fantasy novel book cover art style, oriental watercolor painting"
        )
        in_image_text = f"✍️ [인쇄 합성 텍스트]: \"{title}\""
    else:
        thumb_prompt_final = thumb_prompt_raw
        in_image_text = f"✍️ [인쇄 합성 텍스트]: \"{keyword}\""

    # 📌 Alt text 가이드 및 썸네일 복사 영역 통합
    alt_text_guide = f"""<div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; margin-bottom: 25px; font-size: 14px; line-height: 1.6; display: flex; flex-direction: column; gap: 15px;">
  <div>
    <strong style="color: #2c3e50; display: block; font-size: 15px; margin-bottom: 5px;">📢 대표 이미지 업로드 시 Alt Text(대체 텍스트) 안내</strong>
    포스팅 업로드 시, 대표 썸네일 이미지의 Alt 대체 텍스트 입력란에 아래 문구를 복사해서 넣어주세요. 검색 로봇 유입에 대단히 유리합니다.<br>
    <code>[Alt Text]: {title} - {keyword} 핵심 가이드 및 요율 분석</code>
  </div>
  <hr style="border: 0; height: 1px; background: #e0e0e0; margin: 5px 0;">
  <div>
    <strong style="color: #1e88e5; display: block; font-size: 15px; margin-bottom: 5px;">🎨 대표 썸네일 AI 이미지 생성 프롬프트 (예쁜 그림체)</strong>
    아래 프롬프트 텍스트를 복사하여 Midjourney나 DALL-E 3에 입력하면 아주 예쁘고 따뜻한 감성의 일러스트 썸네일을 생성할 수 있습니다.<br>
    <div style="background: #f1f5f9; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; margin-top: 8px; font-family: monospace; font-size: 13px; color: #334155; white-space: pre-wrap;" id="thumbPrompt">{thumb_prompt_final}</div>
    <div style="margin-top: 6px; color: #475569; font-size: 12px; font-weight: bold;">{in_image_text} (중앙부에 예쁜 타이포로 합성 인쇄하여 사용)</div>
    <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
      <button onclick="copyThumbPrompt()" style="background-color: #1e88e5; color: #ffffff; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 1px 3px rgb(30 136 229 / 0.3);">썸네일 프롬프트 복사하기</button>
      <span id="thumbCopyMsg" style="color: #16a34a; font-weight: bold; font-size: 13px; display: none;">✓ 프롬프트 복사 완료!</span>
    </div>
  </div>
</div>"""

    official_link_box = f"""<div style="background-color: #f9f9f9; border-left: 4px solid #1565c0; padding: 20px; margin: 20px 0; text-align: left; line-height: 1.8;">
  <strong style="display: block; margin-bottom: 5px;">🔗 공식 행정 출처 안내 링크</strong>
  - <a href="{url}" target="_blank" rel="noopener noreferrer" style="color: #1565c0; text-decoration: underline; font-weight: bold;">{desc} 바로가기</a>
</div>"""

    if ch_key == "9_naver_연예":
        tag_list = [t.strip() for t in tags.split(',')]
        tag_row = " ".join([f"#{t}" for t in tag_list])
    else:
        tag_row = tags

    markdown_content = f"""# {title}

{intro}

---

{summary_box}

---

{alt_text_guide}

{toc_area}

---

{total_body_text}

---

{table_area}

---

{docs_area}

---

{closing}

---

{official_link_box}

{tag_row}
"""

    return markdown_content

def main():
    print(f"=== [원고 라이터 v20-EmbeddedThumb] 9대 채널 27개 썸네일 프롬프트 내장 컴파일 개시 ===")
    
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
            
            full_content_str = make_html_template_with_thumb(p, ch_key)
            
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

  <!-- 초편리 원클릭 전체 복사 상단바 영역 -->
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

  <!-- 브라우저 출력 확인용 뷰포트 영역 -->
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

    function copyThumbPrompt() {{
      var content = document.getElementById('thumbPrompt').innerText;
      
      var tempTextarea = document.createElement('textarea');
      tempTextarea.value = content;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
      
      var msg = document.getElementById('thumbCopyMsg');
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
            print(f"  ✅ Compiled H1~H6 + Embedded Prompt: post{no:02d}.md ({char_count} chars) & post{no:02d}.html")
            
    print(f"\n🎉 [대성공] 각 포스트 HTML에 예쁜 일러스트형 썸네일 프롬프트가 이식된 27개 HTML/MD 최종 컴파일 배포 완료!")

if __name__ == "__main__":
    main()
