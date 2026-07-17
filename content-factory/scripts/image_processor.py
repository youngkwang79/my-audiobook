# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
import os
import random
import math
import requests
import urllib.parse
from io import BytesIO

# 한글 글꼴 경로 설정 (Windows 기본 맑은 고딕 사용)
DEFAULT_FONT_PATH = "C:\\Windows\\Fonts\\malgun.ttf"
if not os.path.exists(DEFAULT_FONT_PATH):
    DEFAULT_FONT_PATH = "C:\\Windows\\Fonts\\Arial.ttf"

def generate_free_ai_image(prompt, width, height):
    """
    Pollinations AI 오픈 생성 서버(Stable Diffusion XL)를 활용하여,
    주어진 영문 프롬프트에 맞는 100% 독창적인 AI 실사 이미지를 무료로 생성하여 가져옵니다.
    """
    if not prompt:
        return None
        
    # URL 인코딩 적용
    encoded_prompt = urllib.parse.quote(prompt.strip())
    # nologo=true 및 seed를 랜덤하게 주어 매번 독창적인 이미지가 나오도록 함
    seed = random.randint(1, 999999)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true&seed={seed}"
    
    print(f"[INFO] AI 이미지 무료 생성 서버 요청 중... (프롬프트: {prompt[:60]}...)")
    try:
        response = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0"})
        if response.status_code == 200 and len(response.content) > 5000:
            img = Image.open(BytesIO(response.content))
            if img.mode != "RGB":
                img = img.convert("RGB")
            print("[SUCCESS] AI 이미지 실시간 생성 및 다운로드 성공!")
            return img
        else:
            print(f"[WARNING] AI 생성 서버 응답 코드 오류: {response.status_code}")
    except Exception as e:
        print(f"[WARNING] AI 이미지 실시간 생성 실패 (백업용 로컬 카드로 자동 전환): {e}")
    return None

def create_tech_diagonal_gradient(width, height, color1, color2):
    """(백업용) 세련된 하이테크 느낌의 '대각선 그라데이션' 배경 이미지 생성"""
    base = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    for y in range(height):
        for x in range(0, width, 2):
            dist = (x + y) / (width + height)
            r = int(color1[0] + (color2[0] - color1[0]) * dist)
            g = int(color1[1] + (color2[1] - color1[1]) * dist)
            b = int(color1[2] + (color2[2] - color1[2]) * dist)
            draw.point((x, y), fill=(r, g, b, 255))
            draw.point((x+1, y), fill=(r, g, b, 255))
            
    grid_size = 40
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    for x in range(0, width, grid_size):
        draw_overlay.line([(x, 0), (x, height)], fill=(255, 255, 255, 12), width=1)
    for y in range(0, height, grid_size):
        draw_overlay.line([(0, y), (width, y)], fill=(255, 255, 255, 12), width=1)
        
    combined = Image.alpha_composite(base, overlay)
    return combined.convert("RGB")

def draw_text_wrapped_with_shadow(draw, text, font, fill_color, max_width, start_y, line_spacing=12):
    """가독성 극대화를 위한 Drop Shadow 포함 자동 줄바꿈 렌더링"""
    words = list(text)
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
        
    y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (draw.im.size[0] - w) // 2
        
        # 사방 8방향 2px 검은색 외곽선(Stroke) 드로잉으로 가독성 100% 보장
        for dx, dy in [(-2,-2), (-2,0), (-2,2), (0,-2), (0,2), (2,-2), (2,0), (2,2)]:
            draw.text((x + dx, y + dy), line, fill=(15, 23, 42, 255), font=font) # 짙은 슬레이트 블랙 외곽선
            
        draw.text((x, y), line, fill=fill_color, font=font)
        y += h + line_spacing
    return y

def generate_blog_images(keyword, title, image_prompt=None, image_prompt_mid=None, output_dir=None, aspect_ratio="16:9"):
    """
    무료 AI 이미지(Stable Diffusion XL) 생성 및 시네마틱 텍스트 합성 썸네일 제작.
    aspect_ratio="2:3" 이면 무림북용 세로 북커버(800x1200), "16:9" 이면 일반 가로형(1200x675)으로 분기 생성합니다.
    서버 장애 시 백업용 로컬 그리드 카드로 자동 복구.
    """
    if not output_dir:
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../output")
    os.makedirs(output_dir, exist_ok=True)
    
    # 종횡비 동적 매핑
    if aspect_ratio == "16:9":
        w_main, h_main = 1200, 675
        badge_y = 140
        title_y = 230
        title_max_w = 900
        watermark_x, watermark_y = 150, 520
    else: # 기본값 "2:3" 북커버
        w_main, h_main = 800, 1200
        badge_y = 360
        title_y = 460
        title_max_w = 680
        watermark_x, watermark_y = 100, 1050
        
    # 1. 대표 썸네일 이미지 생성
    img_main = None
    if image_prompt:
        img_main = generate_free_ai_image(image_prompt, w_main, h_main)
        
    if img_main is None:
        print("[WARNING] 대표 이미지 AI 생성 실패. 백업 로컬 그래픽 카드로 렌더링합니다.")
        palettes = [
            ((10, 24, 55), (0, 191, 165)),
            ((23, 12, 48), (255, 0, 128)),
            ((15, 32, 67), (76, 121, 255))
        ]
        color1, color2 = random.choice(palettes)
        img_main = create_tech_diagonal_gradient(w_main, h_main, color1, color2)
        
        card_layer = Image.new("RGBA", (w_main, h_main), (0, 0, 0, 0))
        draw_card = ImageDraw.Draw(card_layer)
        if aspect_ratio == "16:9":
            draw_card.rounded_rectangle([(120, 120), (1080, 545)], radius=20, fill=(0, 0, 0, 130), outline=(255, 255, 255, 40), width=2)
        else:
            draw_card.rounded_rectangle([(80, 80), (720, 1120)], radius=20, fill=(0, 0, 0, 130), outline=(255, 255, 255, 40), width=2)
        img_main = Image.alpha_composite(img_main.convert("RGBA"), card_layer).convert("RGB")
    else:
        # AI 생성 이미지 리사이징
        img_main = img_main.resize((w_main, h_main), Image.Resampling.LANCZOS)
        
        # 텍스트 가독성을 위해 반투명 영화관 스타일의 시네마틱 어두운 그라데이션 필터 입히기
        filter_layer = Image.new("RGBA", (w_main, h_main), (0, 0, 0, 0))
        draw_filter = ImageDraw.Draw(filter_layer)
        for y in range(h_main):
            alpha = int(160 + (95 * (y / h_main)))
            draw_filter.line([(0, y), (w_main, y)], fill=(0, 0, 0, alpha))
        img_main = Image.alpha_composite(img_main.convert("RGBA"), filter_layer).convert("RGB")

    # 텍스트 드로잉
    draw_main = ImageDraw.Draw(img_main)
    try:
        font_keyword = ImageFont.truetype(DEFAULT_FONT_PATH, 34)
        font_title = ImageFont.truetype(DEFAULT_FONT_PATH, 46)
        font_watermark = ImageFont.truetype(DEFAULT_FONT_PATH, 20)
    except IOError:
        font_keyword = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_watermark = ImageFont.load_default()

    # 키워드 뱃지
    badge_layer = Image.new("RGBA", (w_main, h_main), (0, 0, 0, 0))
    draw_badge = ImageDraw.Draw(badge_layer)
    kw_text = f" {keyword} "
    bbox_kw = draw_main.textbbox((0, 0), kw_text, font=font_keyword)
    kw_w = bbox_kw[2] - bbox_kw[0]
    kw_h = bbox_kw[3] - bbox_kw[1]
    kw_x = (w_main - kw_w) // 2
    
    draw_badge.rounded_rectangle([(kw_x - 15, badge_y), (kw_x + kw_w + 15, badge_y + 10 + kw_h + 10)], radius=8, fill=(255, 196, 0, 240))
    img_main = Image.alpha_composite(img_main.convert("RGBA"), badge_layer).convert("RGB")
    draw_main = ImageDraw.Draw(img_main)
    
    draw_main.text((kw_x, badge_y + 3), kw_text, fill=(17, 24, 39), font=font_keyword)
    draw_text_wrapped_with_shadow(draw_main, title, font_title, (255, 255, 255), title_max_w, title_y)
    draw_main.text((watermark_x, watermark_y), "© AI GENERATED NEWS ROOM // BLOG SYSTEM", fill=(220, 220, 220, 180), font=font_watermark)
    
    main_img_path = os.path.join(output_dir, "thumb_main.jpg")
    img_main.save(main_img_path, "JPEG", quality=85, optimize=True)
    
    # 2. 중간 이미지 (800 x 450, 16:9)
    img_mid = None
    if image_prompt_mid:
        img_mid = generate_free_ai_image(image_prompt_mid, 800, 450)
        
    if img_mid is None:
        print("[WARNING] 중간 이미지 AI 생성 실패. 백업 로컬 그래픽 카드로 렌더링합니다.")
        palettes = [
            ((15, 32, 67), (76, 121, 255)),
            ((25, 25, 25), (255, 179, 0))
        ]
        color1, color2 = random.choice(palettes)
        img_mid = create_tech_diagonal_gradient(800, 450, color2, color1)
        
        mid_card_layer = Image.new("RGBA", (800, 450), (0, 0, 0, 0))
        draw_mid_card = ImageDraw.Draw(mid_card_layer)
        draw_mid_card.rounded_rectangle([(70, 70), (730, 380)], radius=15, fill=(0, 0, 0, 145), outline=(255, 255, 255, 30), width=2)
        img_mid = Image.alpha_composite(img_mid.convert("RGBA"), mid_card_layer).convert("RGB")
    else:
        # AI 생성 이미지의 크기를 800x450으로 강제 리사이징하여 합성 오류(ValueError)를 방지
        img_mid = img_mid.resize((800, 450), Image.Resampling.LANCZOS)
        
        mid_filter = Image.new("RGBA", (800, 450), (0, 0, 0, 0))
        draw_mid_filter = ImageDraw.Draw(mid_filter)
        for y in range(450):
            alpha = int(140 + (100 * (y / 450)))
            draw_mid_filter.line([(0, y), (800, y)], fill=(0, 0, 0, alpha))
        img_mid = Image.alpha_composite(img_mid.convert("RGBA"), mid_filter).convert("RGB")

    draw_mid = ImageDraw.Draw(img_mid)
    try:
        font_mid_title = ImageFont.truetype(DEFAULT_FONT_PATH, 28)
        font_mid_desc = ImageFont.truetype(DEFAULT_FONT_PATH, 22)
    except IOError:
        font_mid_title = ImageFont.load_default()
        font_mid_desc = ImageFont.load_default()
        
    draw_mid.text((100, 95), "[핵심 분석] 관련 상세 분석 자료", fill=(255, 196, 0), font=font_mid_title)
    
    summarized_info = f"본 기사는 '{keyword}' 관련 주요 외신 속보와 공식 문서를 정밀 분석하여 작성된 장문의 정보성 칼럼입니다. 세부적인 내용 및 핵심 분석은 하단 본문을 참조해 주시기 바랍니다."
    draw_text_wrapped_with_shadow(draw_mid, summarized_info, font_mid_desc, (255, 255, 255), 580, 160)
    
    mid_img_path = os.path.join(output_dir, "thumb_mid.jpg")
    img_mid.save(mid_img_path, "JPEG", quality=85, optimize=True)
    
    main_size = os.path.getsize(main_img_path) / 1024
    mid_size = os.path.getsize(mid_img_path) / 1024
    print(f"[INFO] AI 생성 대표 썸네일 완료: {main_img_path} ({main_size:.1f} KB)")
    print(f"[INFO] AI 생성 중간 이미지 완료: {mid_img_path} ({mid_size:.1f} KB)")
    
    return {
        "main_path": main_img_path,
        "main_meta": {
            "alt_text": f"{keyword} 속보 정보 칼럼 대표 이미지",
            "caption": f"최신 {keyword} 트렌드 정보 요약",
            "description": f"AI가 요약 분석한 {keyword} 심층 분석 기사 대표 카드 썸네일"
        },
        "mid_path": mid_img_path,
        "mid_meta": {
            "alt_text": f"{keyword} 핵심 요약 및 테크 트렌드 관련 상세 설명 다이어그램 카드 이미지"
        }
    }

if __name__ == "__main__":
    generate_blog_images("인공지능", "인공지능(AI)과 미래 사회의 거대한 변화에 대처하는 실전 직장인 상식 가이드",
                         image_prompt="a cute yellow robot reading a book, clean digital drawing, pixel art style",
                         image_prompt_mid="a computer desk with glowing screens, warm lighting")
