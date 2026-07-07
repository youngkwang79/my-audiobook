# -*- coding: utf-8 -*-
"""
배경을 100% 빨간색으로 꽉 채우고 흰색 글자를 선명하게 입힌 고가독성 정지 PNG 링크 버튼 제작 스크립트
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_perfect_static_button():
    asset_folder = "naver_post_assets"
    os.makedirs(asset_folder, exist_ok=True)
    
    # 덮어씌울 PNG 및 GIF 경로 둘 다 설정 (기존 문제 있는 pulsing_link_button.gif 파일도 이 완벽한 이미지로 대체하여 에러 방지)
    png_path = os.path.join(asset_folder, "pulsing_link_button.png")
    gif_path = os.path.join(asset_folder, "pulsing_link_button.gif")
    
    w, h = 650, 100
    
    # 1. 완전한 불투명 24비트 RGB로 배경색 채우기 (네이버 흰 배경에서 무조건 깨지지 않는 안전 규격)
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # 폰트 로드
    font_path = "C:/Windows/Fonts/malgunbd.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arial.ttf"
        
    try:
        font = ImageFont.truetype(font_path, 23)
    except:
        font = ImageFont.load_default()
        
    # 2. 둥근 버튼 배경 그리기 (완벽한 단색 선명 레드)
    button_color = (217, 45, 32)  # #d92d20 강렬한 레드
    
    # 입체감 주는 붉은 그림자
    draw.rounded_rectangle(
        [(15, 13), (w - 15, h - 7)],
        radius=38,
        fill=(140, 10, 10),
    )
    
    # 본체 버튼 (선명한 빨간 배경 + 검정색 얇은 테두리 선)
    draw.rounded_rectangle(
        [(15, 10), (w - 15, h - 10)],
        radius=38,
        fill=button_color,
        outline=(0, 0, 0),
        width=2
    )
    
    # 3. 텍스트 배치 (눈이 아프지 않은 맑은 순백색)
    text = "🔥 [순수한집] 배도라지맥문동차 한정 혜택 받기 🔗"
    
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    text_w = right - left
    text_h = bottom - top
    text_x = (w - text_w) // 2
    text_y = (h - text_h) // 2 - 2
    
    # 텍스트 그리기 (외곽선 꼬임 없이 순수 흰색 글자만 깔끔히 배치)
    draw.text((text_x, text_y), text, fill=(255, 255, 255), font=font)
    
    # PNG로 저장
    img.save(png_path, "PNG")
    
    # 단일 프레임 GIF로도 복제 저장 (기존 리스트 꼬임 우회 목적)
    img.save(gif_path, "GIF")
    
    print(f"[SUCCESS] Perfect static PNG/GIF button created!")

if __name__ == "__main__":
    create_perfect_static_button()
