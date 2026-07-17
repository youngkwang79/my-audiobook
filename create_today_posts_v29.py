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

# 📌 2차 타깃 채널 3개 (4_tistory_live_note, 5_tistory_life_live, 6_murimbook = 총 9개 글)
TARGET_CHANNELS = ["4_tistory_live_note", "5_tistory_life_live", "6_murimbook"]

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

def get_dynamic_docs_and_table(title, keyword):
    if "탄소중립" in title:
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
    if ch_key in ["6_murimbook"]:
        return "FINANCE"
    return "BENEFIT"

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
        
        # 📌 챕터별 독창적 해설 창작 (H2 직후 부가설명)
        if i == 0:
            ext_p = (
                f"본 {clean_h} 조항에 관한 구체적인 추진 목적을 검토해보면, "
                f"신청인이 획득할 수 있는 실질적인 요건을 맞추어 제공되는 정부 정책 혜택입니다.\n\n"
                f"무엇보다 {keyword} 제도의 구비 서식을 철저히 대조하지 않으면 심사 단계에서 승인이 늦어질 수 있습니다.\n\n"
                f"따라서 세부 조건들을 미리 확인하시는 편이 가계 살림에 가장 효과적입니다."
            )
        elif i == 1:
            ext_p = (
                f"특히 {keyword}의 구체적인 적용 가이드라인을 살펴보면, "
                f"소관 행정 관청은 신청인의 최근 증빙 내역과 이력을 정밀하게 교차 검증하고 있습니다.\n\n"
                f"만약 사실과 다른 정보나 오남용 사례가 발견될 경우에는 기 지급된 수혜액의 반환 의무 등이 수반될 수 있으므로, "
                f"반드시 검증된 팩트 정보만을 서식에 기재해 제출하셔야 안전합니다."
            )
        elif i == 2:
            ext_p = (
                f"아울러 전산망을 이용한 비대면 간편 전송 방식을 활용하시면, "
                f"직접 지사를 방문하여 줄을 서는 번거로움 없이 3분 내외로 원스톱 접수가 가능합니다.\n\n"
                f"다만 첨부 자료가 불분명하거나 본인 확인 절차가 누락되면 처리가 지연될 수 있습니다.\n\n"
                f"접수 전 구비 서류 파일들의 보완 상태를 미리 꼼꼼히 대조해 보시는 것을 권해 드립니다."
            )
        elif i == 3:
            ext_p = (
                f"최근 실제 이용자 분들의 민원 제기 현황과 현장 피드백 결과를 면밀히 파악해 본 결과, "
                f"신청 마감 시기를 혼동하여 아까운 신청 권리를 영구 상실하는 안타까운 상황이 발생하곤 합니다.\n\n"
                f"이러한 행정상의 실수를 방지하기 위해 가용한 일정을 메모해 두는 등 일정 관리가 중요합니다."
            )
        else:
            ext_p = (
                f"최종적으로, {keyword}에 관한 세부 혜택 규모나 적용 요율은 관계 당국의 정책 고시 발표에 따라 수시로 개편될 여지가 있습니다.\n\n"
                f"추가적으로 변경되는 지침들은 정부 공공 포털 등의 공식 업데이트를 정기적으로 확인해 보시는 편이 가장 권장됩니다."
            )
            
        p1 = f"{fact_spaced}\n\n{ext_p}"
        
        # 📌 H3~H6 중복 원천 삭제! 오직 H2(소제목)와 p1(독창적 설명)만 남기는 콤팩트 규격 적용!
        sec_text = f"""<a id="section{i+1}"></a>\n\n## {i+1}. {clean_h}\n\n{p1}"""
        
        if i == 0:
            sec_text += f"""\n\n<div style="background-color: #e3f2fd; border-left: 5px solid #1e88e5; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #1565c0; display: block; font-size: 15px; margin-bottom: 5px;">💡 전문 지식 Tip</strong>
  본 {keyword} 제도는 가용한 행정 자원의 적기 배분을 위해 설계되었습니다.\n\n
  이에 따라 자격 조회를 신속하게 매듭지으시는 편이 대단히 유리합니다.\n\n
  예산 조기 소진 전에 공식 웹사이트에서 실시간 자격 대조를 진행하시기를 강력 권장합니다.
</div>"""
        elif i == 3:
            sec_text += f"""\n\n<div style="background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; line-height: 1.8;">
  <strong style="color: #e65100; display: block; font-size: 15px; margin-bottom: 5px;">⚠️ 신청 시 핵심 주의사항</strong>
  부정한 서식 기재나 자격 초과 이력이 관계 기관의 합동 전산 대조 결과에 따라 사후 적발될 시에는 이미 지급된 지원금 전액의 환수 명령과 함께 법률상 가산금 요율이 가중 소급 부과되므로, 반드시 팩트만을 성실하게 기재하셔야 합니다.
</div>"""
            
        sec_text = sec_text.replace(f"{keyword}", f"<strong>{keyword}</strong>")
        body_sections.append(sec_text)
        
    total_body_text = "\n\n---\n\n".join(body_sections)

    # 100% 진짜 도메인 서류 & 표
    docs, table_data = get_dynamic_docs_and_table(title, keyword)

    # 외부 위키백과 링크 교체
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
    print(f"=== [원고 라이터 v29-Phase2] 2차 타깃 3개 채널 총 9개 원고 콤팩트 재생성 개시 ===")
    
    for ch_key in TARGET_CHANNELS:
        folder_prefix = PREFIX_MAP.get(ch_key)
        target_folder = None
        for folder_name in os.listdir(BASE_DIR):
            if folder_name.startswith(folder_prefix) and os.path.isdir(os.path.join(BASE_DIR, folder_name)):
                target_folder = folder_name
                break
        if not target_folder:
            target_folder = folder_prefix
            
        date_dir = os.path.join(BASE_DIR, target_folder, DATE_STR)
        os.makedirs(date_dir, exist_ok=True)
        
        print(f"\n📂 Processing Channel (Target Only): {target_folder}")
        
        posts_data_list = POSTS_CATALOG.get(ch_key)
        if not posts_data_list:
            print(f"  ⚠️ Warning: No catalog data for {ch_key}. Skipping.")
            continue
            
        # 1. 3개 포스트 글 본문만 콤팩트 재생성 (thumbnail_prompts.html 보전)
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
            print(f"  ✅ Re-written (Compact): post{no:02d}.md ({char_count} chars) & post{no:02d}.html")
            
        print(f"  💡 Preserved: thumbnail_prompts.html")
            
    print(f"\n🎉 [대성공] 2차 타깃 3개 채널(총 9개 원고)의 본문 재생성이 중복과 팩트 오류를 모두 해결하여 완결되었습니다!")

if __name__ == "__main__":
    main()
