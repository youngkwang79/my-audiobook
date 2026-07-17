# -*- coding: utf-8 -*-
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"D:\somenail"
DATE_STR = "2026-07-17"
OUTPUT_FILE = os.path.join(BASE_DIR, f"오늘의_썸네일_생성_프롬프트_{DATE_STR}.txt")

try:
    sys.path.append(r"d:\소설 유투브\my-audiobook\my_audiobook")
    from create_today_posts_v11 import POSTS_CATALOG, PREFIX_MAP
except ImportError:
    PREFIX_MAP = {}
    POSTS_CATALOG = {}

PROMPT_TEMPLATES = {
    "FINANCE": (
        "A premium 3D isometric vector illustration symbolizing financial growth and security. "
        "A glowing piggy bank, gold coins stacking up, and a shield protecting charts with clean blue and teal color palette, dark mode background, high resolution, corporate style. --ar 16:9"
    ),
    "HEALTH": (
        "A modern and clean flat vector graphic representing health, wellness, and medical protection. "
        "A stylized shield with a green cross, fresh green leaves, medical icons, and clean white-teal gradient background, professional design, high resolution. --ar 16:9"
    ),
    "BENEFIT": (
        "A premium 3D digital illustration illustrating government welfare and legal policy support. "
        "A corporate building icon, official document with a gold stamp, and hands holding a glowing heart icon, professional corporate color palette, high resolution. --ar 16:9"
    ),
    "TECH": (
        "A sleek and futuristic 3D render of computer hardware, software optimization, and cloud storage. "
        "A glowing RAM chip, computer speed-up gauge, and neon cyan cybernetic line connections, dark mode, high resolution. --ar 16:9"
    ),
    "ENTERTAINMENT": (
        "A vibrant and dynamic pop-culture graphic for show business and media entertainment. "
        "A vintage television set, movie clapperboard, glowing stage spot lights with purple and yellow gradient background, modern vector style, energetic vibes. --ar 16:9"
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

def main():
    print(f"=== [썸네일 프롬프트 파일 생성기] 구동 ===")
    
    prompt_lines = []
    prompt_lines.append("==============================================================")
    prompt_lines.append(f"🎨 오늘의 9대 채널 블로그 대표 썸네일 이미지 AI 생성 프롬프트 패키지 ({DATE_STR}) 🎨")
    prompt_lines.append("==============================================================\n")
    prompt_lines.append("💡 [중요 지침]")
    prompt_lines.append("1. 비율 규칙: 일반 채널은 16:9 비율이 표준이며, 무림북 채널은 2:3 비율 북커버를 권장합니다.")
    prompt_lines.append("2. 이미지 인쇄 텍스트: 대표 이미지 위에 글의 핵심 제목을 눈에 띄게 직접 타이포 디자인으로 인쇄 합성하여 사용합니다.")
    prompt_lines.append("3. Pillow 압축 규칙: 생성된 썸네일 이미지는 화질을 최대한 보존하면서 500KB 이하로 강력 압축하여 D:\\somenail 폴더에 저장합니다.\n")
    prompt_lines.append("--------------------------------------------------------------\n")

    for ch_key, folder_prefix in PREFIX_MAP.items():
        target_folder = folder_prefix
        posts = POSTS_CATALOG.get(ch_key, [])
        if not posts:
            continue
            
        prompt_lines.append(f"■■■ 채널명: {target_folder} ■■■\n")
        
        cat_key = get_category_key(ch_key)
        base_prompt = PROMPT_TEMPLATES.get(cat_key, PROMPT_TEMPLATES["FINANCE"])
        
        for p in posts:
            no = p["no"]
            title = p["title"]
            keyword = p["keyword"]
            
            prompt_lines.append(f"🎬 [POST {no:02d}] 👉 {title}")
            prompt_lines.append(f"🔑 포커스 키워드: {keyword}")
            
            # 무림북 채널(6번 채널)의 경우 2:3 비율로 변경
            if ch_key == "6_murimbook":
                adjusted_prompt = base_prompt.replace("--ar 16:9", "--ar 2:3").replace(
                    "A premium 3D isometric vector illustration", 
                    "A Wuxia fantasy novel book cover art style, oriental painting"
                )
                prompt_lines.append(f"📸 AI 이미지 생성 프롬프트:")
                prompt_lines.append(f"   {adjusted_prompt}")
                prompt_lines.append(f"✍️ 이미지 내 인쇄 권장 텍스트 (합성 가이드):")
                prompt_lines.append(f"   \"[ {title} ]\" (배경 중앙부에 굵은 명조 서체로 디자인 합성)")
            else:
                prompt_lines.append(f"📸 AI 이미지 생성 프롬프트:")
                prompt_lines.append(f"   {base_prompt}")
                prompt_lines.append(f"✍️ 이미지 내 인쇄 권장 텍스트 (합성 가이드):")
                prompt_lines.append(f"   \"[ {keyword} ]\" (이미지 중앙 또는 하단 중앙에 깔끔한 산세리프 서체로 디자인 합성)")
                
            prompt_lines.append("-" * 62 + "\n")
            
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(prompt_lines))
        
    print(f"🎉 성공적으로 썸네일 프롬프트 텍스트 파일이 생성되었습니다: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
