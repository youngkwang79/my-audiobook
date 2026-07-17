# -*- coding: utf-8 -*-
import os
import re
import sys
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps

sys.stdout.reconfigure(encoding='utf-8')

DATE_STR = "2026-07-17"
BASE_DIR = r"D:\somenail"
BGM_PATH = r"D:\소설 유투브\my-audiobook\my_audiobook\public\Steady_State.MP3"
ARTIFACTS_DIR = r"C:\Users\owner\.gemini\antigravity\brain\bc669bbb-334e-47cf-9438-abb9aa0535e2"

# 기준 템플릿 경로
TEMPLATE_MONEY_PATH = os.path.join(ARTIFACTS_DIR, "template_money_book_cover_v4_1784208141322.jpg")
TEMPLATE_TREE_PATH = os.path.join(ARTIFACTS_DIR, "template_tree_book_cover_1784209573762.jpg")

THEME = {
    "bg_start": (10, 15, 30),
    "bg_end": (15, 23, 42)
}

# 9대 채널 설정 매핑 (폴더명, 테마 설명, 채널 약칭, Accent 컬러, 배경 템플릿 조정 사양)
CHANNELS_CFG = [
    {
        "folder": "1_tistory_경제, 재테크(money)",
        "desc": "재테크 가이드",
        "channel_name": "머니연구소",
        "accent": "#facc15",
        "base": "money",
        "hue_shift": 0 # 오리지널 네이비
    },
    {
        "folder": "2_tistory_stocks_Finance_(tree)",
        "desc": "주식 투자 리포트",
        "channel_name": "트리인베스트",
        "accent": "#4ade80",
        "base": "tree",
        "hue_shift": 0 # 오리지널 에메랄드 그린
    },
    {
        "folder": "3_tistory_health(green)",
        "desc": "건강 웰빙 라이프",
        "channel_name": "헬스노트",
        "accent": "#2dd4bf",
        "base": "tree",
        "hue_shift": 15 # 민트 올리브 그린톤
    },
    {
        "folder": "4_tistory_Subsidy, How-to, Government subsidies, Life hacks for daily routine_live_note",
        "desc": "정부 보조금 정보",
        "channel_name": "혜택연구소",
        "accent": "#c084fc",
        "base": "money",
        "hue_shift": 180 # 라벤더 바이올렛 톤
    },
    {
        "folder": "5_tistory_Law_Statute_Act(life_live)",
        "desc": "생활 법률 가이드",
        "channel_name": "법률나침반",
        "accent": "#fb923c",
        "base": "money",
        "hue_shift": 20 # 엔티크 브라운 가죽톤
    },
    {
        "folder": "6_murimbook_부동산,보험,대출",
        "desc": "부동산 보험 백과",
        "channel_name": "무림서가",
        "accent": "#e2e8f0",
        "base": "money",
        "hue_shift": 110, # 차콜 블랙톤화 (saturation 감소 예정)
        "desaturate": True
    },
    {
        "folder": "7_wordpress_돈이 되는 글",
        "desc": "IT 비즈니스 인사이트",
        "channel_name": "머니팩토리",
        "accent": "#38bdf8",
        "base": "money",
        "hue_shift": 135 # 테크 다크블루 톤
    },
    {
        "folder": "8_google_blogger_Windows_Mobile_Network",
        "desc": "모바일 테크 지침서",
        "channel_name": "테크웹진",
        "accent": "#22d3ee",
        "base": "money",
        "hue_shift": 155 # 오션 틸 톤
    },
    {
        "folder": "9_naver_예능,방송,드라마,핫이슈",
        "desc": "엔터 핫이슈 리포트",
        "channel_name": "이슈톡톡",
        "accent": "#f472b6",
        "base": "money",
        "hue_shift": 210 # 핫 마젠타/핑크 톤
    }
]

def parse_post_md(file_path):
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "무제"
    
    headings = []
    paragraphs = []
    
    sections = re.split(r"\n(##\s+.*?)\n", content)
    
    # 예능/방송/핫이슈/드라마 채널에 대출/보증/신청 등 타 채널 금융글 노이즈 혼입 방어 필터
    is_entertainment = "9_naver" in file_path or "예능" in file_path or "드라마" in file_path or "방송" in file_path
    
    for i in range(1, len(sections), 2):
        h_text = sections[i].replace("##", "").strip()
        h_text = re.sub(r'^\d+\.\s*', '', h_text)
        h_text = re.sub(r'^[a-zA-Z0-9_]+\s*and\s*', '', h_text)
        
        body_text = sections[i+1].strip() if i+1 < len(sections) else ""
        body_text = re.sub(r'<div.*?>.*?</div>', '', body_text, flags=re.DOTALL)
        body_text = re.sub(r'\|.*?\|', '', body_text)
        body_text = re.sub(r'\[.*?\]\(.*?\)', '', body_text)
        body_text = re.sub(r'[*_#`\-]', '', body_text)
        
        bold_finds = re.findall(r'<b>(.*?)</b>|<strong>(.*?)</strong>|\*\*(.*?)\*\*', sections[i+1])
        bold_sentences = []
        for match in bold_finds:
            clean_b = next((x for x in match if x), "").strip()
            if len(clean_b) > 5:
                # 금융 단어가 혼입된 꼬인 노이즈 문장은 과감히 배제
                if is_entertainment and any(w in clean_b for w in ["대출", "보증", "신청", "계좌", "환수", "우대율", "소득", "자산", "지원금"]):
                    continue
                bold_sentences.append(clean_b)
                
        # 예능 채널 본문 줄별 노이즈 필터링 적용
        clean_lines = []
        for l in body_text.split('\n'):
            line_str = l.strip()
            if len(line_str) > 15:
                if is_entertainment and any(w in line_str for w in ["대출", "보증", "신청", "계좌", "환수", "우대율", "소득", "자산", "지원금"]):
                    continue
                clean_lines.append(line_str)
                
        # 단 1개의 핵심 요점 문장만 추출하여 카드뉴스 텍스트를 고도로 슬림화/다이어트!
        if len(bold_sentences) >= 1:
            summary = "• " + bold_sentences[0]
        elif len(clean_lines) >= 1:
            summary = "• " + clean_lines[0]
        else:
            summary = "• 상세 정보는 본문을 참조해 주세요."
            
        # 100자 내외로 문장 길이 강제 클램핑 (눈에 쏙 들어오는 미니멀 릴스 최적화)
        if len(summary) > 105:
            summary = summary[:102] + "..."
            
        headings.append(h_text)
        paragraphs.append(summary)
        
    return {
        "title": title,
        "headings": headings[:5],
        "paragraphs": paragraphs[:5]
    }

def get_font(size, is_bold=False):
    paths = [
        r"C:\Windows\Fonts\malgunbd.ttf" if is_bold else r"C:\Windows\Fonts\malgun.ttf",
        r"C:\Windows\Fonts\Arial.ttf",
        r"C:\Windows\Fonts\gulim.ttc"
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def wrap_text(text, font, max_width):
    lines = []
    for paragraph in text.split('\n'):
        if not paragraph.strip():
            lines.append("")
            continue
        current_line = ""
        for char in paragraph:
            test_line = current_line + char
            w = font.getbbox(test_line)[2] if hasattr(font, 'getbbox') else font.getsize(test_line)[0]
            if w <= max_width:
                current_line = test_line
            else:
                lines.append(current_line)
                current_line = char
        if current_line:
            lines.append(current_line)
    return lines

def get_colorized_bg(cfg):
    # 베이스 템플릿 로드
    base_path = TEMPLATE_MONEY_PATH if cfg["base"] == "money" else TEMPLATE_TREE_PATH
    if not os.path.exists(base_path):
        return Image.new("RGBA", (1080, 1920), (10, 15, 30, 255))
        
    orig = Image.open(base_path)
    img = orig.resize((1080, 1920), Image.Resampling.LANCZOS).convert("RGBA")
    
    # 색상 변환 처리 (Hue Shift 및 Desaturate 연산)
    if cfg["hue_shift"] != 0 or cfg.get("desaturate", False):
        hsv = img.convert("HSV")
        h, s, v = hsv.split()
        
        if cfg["hue_shift"] != 0:
            h = h.point(lambda x: int((x + cfg["hue_shift"]) % 256))
            
        if cfg.get("desaturate", False):
            s = s.point(lambda x: int(x * 0.15)) # 흑백에 가까운 차콜/실버 질감 유도
            
        img = Image.merge("HSV", (h, s, v)).convert("RGBA")
        
    return img

def draw_impact_title(draw_obj, text_title, font_keyword, font_hook, xy, accent_color, shadow_color=(0, 0, 0, 255)):
    # 책 표지 금박 테두리 안을 절대 벗어나지 않도록 하고, 단어 잘림 없는 최대 9자 기준 자동 구문 줄바꿈 적용
    # 예: "청년도약계좌 중도담보대출 한도 금리 및 비과세 유지 조건"
    # -> 1줄 (Keyword): 청년도약계좌
    # -> 2~N줄 (Hook): 단어가 잘리지 않는 선에서 한 줄당 최대 9자씩 줄바꿈
    
    words = text_title.split()
    keyword = ""
    hook_lines = []
    
    if len(words) > 0:
        keyword = words[0]
        # 첫 단어가 너무 짧을 시 결합
        if len(keyword) <= 3 and len(words) > 1:
            keyword = words[0] + " " + words[1]
            remains = words[2:]
        else:
            remains = words[1:]
            
        remains_text = " ".join(remains)
        
        # 9글자(공백 포함) 기준, 단어가 잘리지 않게 동적으로 줄을 쪼개는 알고리즘
        current_line = ""
        for word in remains:
            if not current_line:
                current_line = word
            else:
                test_line = current_line + " " + word
                if len(test_line) <= 9:
                    current_line = test_line
                else:
                    hook_lines.append(current_line)
                    current_line = word
        if current_line:
            hook_lines.append(current_line)
                
    hook_text = "\n".join(hook_lines)
    
    h_keyword_box = font_keyword.getbbox(keyword)
    h_key = h_keyword_box[3] - h_keyword_box[1]
    
    line_h_hook = font_hook.getbbox("A")[3] - font_hook.getbbox("A")[1]
    total_hook_h = len(hook_lines) * line_h_hook + (len(hook_lines) - 1) * 18
    
    total_h = h_key + 50 + total_hook_h
    
    start_y = xy[1] - total_h / 2
    
    # 1. 포커스 키워드 (노란색/엑센트, 초대형 100px)
    cx, cy = xy[0], start_y + h_key / 2
    
    for dx, dy in [(-4, -4), (4, -4), (-4, 4), (4, 4), (0, 4), (0, -4), (4, 0), (-4, 0), (0, 8), (2, 8), (-2, 8)]:
        draw_obj.text((cx + dx, cy + dy), keyword, font=font_keyword, fill=shadow_color, anchor="mm")
    draw_obj.text((cx, cy), keyword, font=font_keyword, fill=accent_color, anchor="mm")
    
    # Y 커서 이동
    cy_hook = cy + h_key/2 + 50 + total_hook_h / 2
    
    # 2. 후킹 멘트 (흰색, 대형 70px)
    for dx, dy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, 3), (0, -3), (3, 0), (-3, 0), (0, 6), (2, 6)]:
        draw_obj.text((cx + dx, cy_hook + dy), hook_text, font=font_hook, fill=shadow_color, anchor="mm", align="center")
    draw_obj.text((cx, cy_hook), hook_text, font=font_hook, fill="#ffffff", anchor="mm", align="center")

def draw_card_image(post_data, page_idx, dest_path, bg_img, cfg):
    img = bg_img.copy()
    draw = ImageDraw.Draw(img)
    
    font_body = get_font(44, is_bold=False)
    font_meta = get_font(34, is_bold=True)
    
    if page_idx == 0:
        # [1장: 표지/썸네일] - 책 금테두리 안쪽 580px 한계 래핑 및 바깥 마진 대칭 정렬
        font_keyword = get_font(100, is_bold=True)
        font_hook = get_font(70, is_bold=True)
        font_outer_meta = get_font(48, is_bold=True) # 바깥 여백용 대형 폰트
        
        # 1-1. 상단 책 가죽에 겹치지 않게 완전 바깥 여백 배치 (Y: 80, 크기 48px)
        draw.text((540, 80), f"◆ {cfg['desc']} ◆", font=font_outer_meta, fill="#ffffff", anchor="mm")
        
        # 1-2. 중앙 제목 렌더러 (가로폭 한계를 580px로 좁혀 금테두리 내부 안착 유도)
        draw_impact_title(draw, post_data["title"], font_keyword, font_hook, (540, 960), cfg["accent"])
            
        # 1-3. 하단 책에 겹치지 않게 바깥 여백 배치 (Y: 1820, 크기 48px)
        draw.text((540, 1820), f"출처 - {cfg['channel_name']}", font=font_outer_meta, fill="#ffffff", anchor="mm")
        
    else:
        # [2~5장: 본론] - 배경 책 표지 질감(금박 무늬 등)이 선명하게 보이도록 반투명 암막 레이어 투사 (Alpha 130 적용)
        draw.rectangle([0, 0, 1080, 1920], fill=(10, 15, 30, 130))
        
        # 2-1. 상단 영역
        draw.text((540, 150), f"PAGE {page_idx + 1} OF 5", font=font_meta, fill=cfg["accent"], anchor="mm")
        draw.line([(150, 190), (930, 190)], fill=(255, 255, 255, 35), width=2)
        
        # 2-2. 정중앙 직사각 고대비 텍스트 카드 프레임 (가로 840px로 확장, 텍스트 가독성 최우선 확보)
        draw.rounded_rectangle([100, 340, 980, 1560], radius=30, fill=(17, 24, 39, 245), outline=(255, 255, 255, 20), width=2)
        
        h_idx = page_idx - 1
        heading = f"● {post_data['headings'][h_idx]}"
        body_content = post_data['paragraphs'][h_idx]
        
        # 소제목 렌더링 (가로 720px 기준 줄바꿈)
        font_sub = get_font(48, is_bold=True)
        sub_lines = wrap_text(heading, font_sub, 740)
        
        # 본문 요약 렌더링 (가로 720px 기준 줄바꿈)
        body_lines = wrap_text(body_content, font_body, 720)
        
        # 전체 텍스트 박스 높이 계산
        sub_total_h = len(sub_lines) * 75
        body_total_h = len(body_lines) * 75
        total_text_h = sub_total_h + 80 + body_total_h # 간격 80 포함
        
        # 카드 프레임 내부(Y: 340~1560, 총 높이 1220px)의 정중앙에 수직 정렬
        y_cursor = 340 + (1220 - total_text_h) / 2
        
        for line in sub_lines:
            for ox, oy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
                draw.text((540 + ox, y_cursor + oy), line, font=font_sub, fill=(0, 0, 0, 200), anchor="mm")
            draw.text((540, y_cursor), line, font=font_sub, fill=cfg["accent"], anchor="mm")
            y_cursor += 75
            
        y_cursor += 80
        
        # 본문 요약 렌더링 (중앙 정렬 anchor="mm" 처리하여 가로세로 완벽한 미학적 대칭 안착)
        for line in body_lines:
            if line.strip() == "":
                y_cursor += 30
                continue
            for ox, oy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
                draw.text((540 + ox, y_cursor + oy), line, font=font_body, fill=(0, 0, 0, 150), anchor="mm")
            draw.text((540, y_cursor), line, font=font_body, fill="#ffffff", anchor="mm")
            y_cursor += 75
            
        # 2-3. 하단 영역 (고정댓글 단어를 프로필 링크로 전격 갱신)
        draw.line([(150, 1620), (930, 1620)], fill=(255, 255, 255, 35), width=2)
        draw.text((540, 1720), f"자세한 설명과 정보는\n프로필 링크 및 블로그를 참조해 주세요.", font=font_meta, fill="#e2e8f0", anchor="mm", align="center")
        
    img.save(dest_path, "PNG")

def write_card_html(post_data, dest_path, cfg):
    slides_html = ""
    
    # 1. 표지
    slides_html += f"""
    <div class="slide active">
      <div class="card-header">
        <span class="category" style="color: {cfg['accent']};">{cfg['desc']}</span>
        <span class="page-num">1 / 5</span>
      </div>
      <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <h1 class="card-title" style="text-align:center; font-size:30px;">{post_data['title']}</h1>
      </div>
      <div class="card-footer" style="justify-content:center;">
        <span style="font-size:15px; color:#e2e8f0;">{cfg['channel_name']} 지음</span>
      </div>
    </div>
    """
    
    # 2~5. H2
    for i in range(4):
        heading = post_data['headings'][i]
        paragraph = post_data['paragraphs'][i].replace('\n', '<br>')
        slides_html += f"""
        <div class="slide">
          <div class="card-header">
            <span class="category" style="color: {cfg['accent']};">{cfg['desc']}</span>
            <span class="page-num">{i+2} / 5</span>
          </div>
          <div class="content-box" style="background: rgba(17, 24, 39, 0.95); padding: 25px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.08); margin: auto 0;">
            <h2 class="slide-subtitle" style="color: {cfg['accent']}; text-align:center; margin-top:0; font-size:21px;">{i+1}. {heading}</h2>
            <p class="card-body" style="font-size: 16.5px; line-height: 1.8; color: #ffffff; margin: 0;">
              {paragraph}
            </p>
          </div>
          <div class="card-footer" style="justify-content:center;">
            <span style="font-size:13px; color:#94a3b8; text-align:center;">자세한 설명은 프로필 링크를 참조하세요!</span>
          </div>
        </div>
        """
        
    html_content = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SNS 카드뉴스 - {post_data['title']}</title>
  <style>
    body {{
      margin: 0; padding: 0; background-color: #0f172a;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif;
    }}
    .phone-wrapper {{
      width: 100%; max-width: 420px;
      aspect-ratio: 9 / 16;
      background: linear-gradient(180deg, rgb{THEME['bg_start']} 0%, rgb{THEME['bg_end']} 100%);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border-radius: 20px; overflow: hidden;
      position: relative; box-sizing: border-box;
      border: 3px solid rgba(255,255,255,0.05);
    }}
    .slider-container {{
      width: 100%; height: 100%;
      position: relative;
    }}
    .slide {{
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; transform: scale(0.95);
      transition: all 0.4s ease-in-out;
      box-sizing: border-box;
      padding: 40px 30px;
      display: flex; flex-direction: column;
      background: rgba(15, 23, 42, 0.65);
      border-radius: 17px;
      pointer-events: none;
    }}
    .slide.active {{
      opacity: 1; transform: scale(1);
      pointer-events: auto;
    }}
    .card-header {{
      display: flex; justify-content: space-between;
      align-items: center; font-size: 14px; font-weight: bold;
    }}
    .category {{ text-transform: uppercase; letter-spacing: 1px; }}
    .page-num {{ color: #94a3b8; }}
    .card-title {{
      color: #ffffff; font-size: 26px; font-weight: 800; line-height: 1.4;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }}
    .divider {{
      width: 100%; height: 2px; background: rgba(255,255,255,0.1);
      margin-bottom: 20px;
    }}
    .slide-subtitle {{
      font-weight: 700; margin-bottom: 20px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }}
    .card-body {{
      overflow-y: auto;
    }}
    .card-footer {{
      margin-top: auto; display: flex;
    }}
    .nav-btn {{
      background: rgba(255,255,255,0.1); border: none; color: white;
      width: 45px; height: 45px; border-radius: 50%;
      position: absolute; top: 50%; transform: translateY(-50%);
      cursor: pointer; display: flex; justify-content: center; align-items: center;
      font-size: 20px; z-index: 10; transition: background 0.3s;
    }}
    .nav-btn:hover {{ background: rgba(255,255,255,0.2); }}
    .nav-btn.prev {{ left: 15px; }}
    .nav-btn.next {{ right: 15px; }}
    .dots {{
      position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 8px; z-index: 10;
    }}
    .dot {{
      width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3);
      cursor: pointer; transition: all 0.3s;
    }}
    .dot.active {{
      width: 24px; border-radius: 4px; background: {cfg['accent']};
    }}
  </style>
</head>
<body>

  <div class="phone-wrapper">
    <button class="nav-btn prev" onclick="moveSlide(-1)">&#10094;</button>
    <button class="nav-btn next" onclick="moveSlide(1)">&#10095;</button>
    
    <div class="slider-container">
      {slides_html}
    </div>
    
    <div class="dots">
      <span class="dot active" onclick="setSlide(0)"></span>
      <span class="dot" onclick="setSlide(1)"></span>
      <span class="dot" onclick="setSlide(2)"></span>
      <span class="dot" onclick="setSlide(3)"></span>
      <span class="dot" onclick="setSlide(4)"></span>
    </div>
  </div>

  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    function showSlide(n) {{
      slides[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      
      currentSlide = (n + slides.length) % slides.length;
      
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
    }}
    
    function moveSlide(dir) {{
      showSlide(currentSlide + dir);
    }}
    
    function setSlide(n) {{
      showSlide(n);
    }}
    
    let startX = 0;
    const wrapper = document.querySelector('.phone-wrapper');
    wrapper.addEventListener('touchstart', (e) => {{
      startX = e.touches[0].clientX;
    }}, {{passive: true}});
    
    wrapper.addEventListener('touchend', (e) => {{
      const diffX = e.changedTouches[0].clientX - startX;
      if (Math.abs(diffX) > 50) {{
        if (diffX > 0) {{
          moveSlide(-1);
        }} else {{
          moveSlide(1);
        }}
      }}
    }}, {{passive: true}});
  </script>
</body>
</html>
"""
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(html_content)

def render_reels_video_with_bgm(png_paths, bgm_path, mp4_path):
    if not png_paths or len(png_paths) < 5:
        return False
        
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", "4.5", "-i", png_paths[0],
        "-loop", "1", "-t", "4.5", "-i", png_paths[1],
        "-loop", "1", "-t", "4.5", "-i", png_paths[2],
        "-loop", "1", "-t", "4.5", "-i", png_paths[3],
        "-loop", "1", "-t", "4.0", "-i", png_paths[4],
        "-i", bgm_path,
        "-filter_complex",
        "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.0[v1];"
        "[v1][2:v]xfade=transition=fade:duration=0.5:offset=8.0[v2];"
        "[v2][3:v]xfade=transition=fade:duration=0.5:offset=12.0[v3];"
        "[v3][4:v]xfade=transition=fade:duration=0.5:offset=16.0[v4]",
        "-map", "[v4]",
        "-map", "5:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "25",
        "-c:a", "aac", "-b:a", "128k", "-shortest",
        mp4_path
    ]
    
    try:
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        res = subprocess.run(cmd, capture_output=True, text=True, startupinfo=startupinfo, check=True)
        return True
    except Exception as e:
        print(f"❌ [에러] ffmpeg 비디오+음악 병합 실패: {e}")
        return False

def main():
    print("=== [v2] 9대 채널 전체 20초 BGM 명품 북커버 Reels 동영상 컴파일 시작 ===")
    
    if not os.path.exists(BASE_DIR):
        print(f"Base dir {BASE_DIR} not found. Aborting.")
        return
        
    # somenail 폴더 아래에 있는 매칭되는 채널 순회
    for folder_name in os.listdir(BASE_DIR):
        full_folder_path = os.path.join(BASE_DIR, folder_name)
        if not os.path.isdir(full_folder_path):
            continue
            
        # 설정 매핑 찾기
        cfg = None
        for item in CHANNELS_CFG:
            if folder_name.startswith(item["folder"]):
                cfg = item
                break
                
        if not cfg:
            continue
            
        date_dir = os.path.join(full_folder_path, DATE_STR)
        if not os.path.exists(date_dir):
            continue
            
        print(f"\n📂 Processing Channel: {cfg['channel_name']} ({folder_name})")
        
        # 채널 전용 색상 톤이 입혀진 고화질 책 표지 이미지 추출
        channel_bg_img = get_colorized_bg(cfg)
        
        for no in [1, 2, 3]:
            md_file = os.path.join(date_dir, f"post{no:02d}.md")
            if not os.path.exists(md_file):
                continue
                
            print(f"  └─ Parsing Post {no:02d}...")
            post_data = parse_post_md(md_file)
            if not post_data:
                continue
                
            # PNG 5장 드로잉
            png_paths = []
            for i in range(5):
                png_path = os.path.join(date_dir, f"post{no:02d}_card{i+1:02d}.png")
                draw_card_image(post_data, i, png_path, channel_bg_img, cfg)
                png_paths.append(png_path)
                
            # MP4 동영상 (음악 결합)
            mp4_path = os.path.join(date_dir, f"post{no:02d}_card.mp4")
            if os.path.exists(BGM_PATH):
                success = render_reels_video_with_bgm(png_paths, BGM_PATH, mp4_path)
                if success:
                    print(f"    ✅ Video compiled: post{no:02d}_card.mp4")
                    # 인코딩 성공 시, 용량 최적화를 위해 임시 PNG 이미지 5장 완전 삭제 (클린업 완료)
                    for temp_png in png_paths:
                        try:
                            if os.path.exists(temp_png):
                                os.remove(temp_png)
                        except Exception as e:
                            print(f"      ⚠️ Failed to clean up temp PNG {temp_png}: {e}")
                else:
                    print(f"    ❌ Video compilation failed for post{no:02d}")
            else:
                print(f"    ⚠️ BGM missing. Video skipped.")

    print("\n🎉 [성공] 전체 9대 채널의 20초 BGM 명품 북커버 Reels 동영상 패키지 컴파일 최종 배포 완료!")

if __name__ == "__main__":
    main()
