# -*- coding: utf-8 -*-
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"D:\somenail"
DATE_STR = "2026-07-17"
OUTPUT_PATH = rf"D:\somenail\오늘의_릴스_업로드_캡션본_{DATE_STR}.txt"

CHANNELS_CFG = [
    {"folder": "1_tistory_경제", "channel_name": "머니연구소", "desc": "재테크 가이드"},
    {"folder": "2_tistory_stocks", "channel_name": "트리인베스트", "desc": "주식&투자 지침"},
    {"folder": "3_tistory_health", "channel_name": "헬스노트", "desc": "건강 관리 요강"},
    {"folder": "4_tistory_Subsidy", "channel_name": "혜택연구소", "desc": "생활 혜택 가이드"},
    {"folder": "5_tistory_Law", "channel_name": "법률나침반", "desc": "법률 상식 지침"},
    {"folder": "6_murimbook", "channel_name": "무림서가", "desc": "부동산&금융 팁"},
    {"folder": "7_wordpress", "channel_name": "머니팩토리", "desc": "돈이 되는 정보"},
    {"folder": "8_google_blogger", "channel_name": "테크웹진", "desc": "IT 모바일 테크"},
    {"folder": "9_naver", "channel_name": "이슈톡톡", "desc": "예능&드라마 핫이슈"}
]

def parse_post_md(file_path):
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "무제"
    
    # 예능/방송/핫이슈/드라마 채널에 대출/보증/신청 등 타 채널 금융글 노이즈 혼입 방어 필터
    is_entertainment = "9_naver" in file_path or "예능" in file_path or "드라마" in file_path or "방송" in file_path
    
    # 굵은 글씨가 들어간 줄 전체를 긁어오되 태그만 말끔히 제거하여 가독성 높은 온전한 문장 완성
    lines = content.split('\n')
    bold_sentences = []
    
    # 해시태그 목록 추출
    hashtags = []
    
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        # 마지막 라인 부근의 해시태그 행 추출
        if line_str.startswith("#") or ("," in line_str and not line_str.startswith("-") and not "|" in line_str and len(line_str) < 150 and not "💡" in line_str):
            if "#" in line_str:
                hashtags = [t.strip() for t in line_str.split() if t.strip().startswith("#")]
            else:
                hashtags = [f"#{t.strip()}" for t in line_str.split(',') if t.strip()]
                
        # <b> 혹은 ** 가 들어간 요점 줄 캡처 (단, 머리글 안내 영역의 메타 문구는 엄격 배제)
        if ("<b>" in line_str or "**" in line_str or "<strong>" in line_str) and not any(w in line_str for w in ["요점", "주의사항", "대표 이미지", "대체 텍스트", "목차", "Table of Contents", "📢", "📌"]):
            # HTML 태그 및 마크다운 특수문자 정제
            clean = re.sub(r'<[^>]*>|[*_#`\-]', '', line_str).strip()
            # 금융 단어 혼입 방지 필터 적용
            if is_entertainment and any(w in clean for w in ["대출", "보증", "신청", "계좌", "환수", "우대율", "소득", "자산", "지원금"]):
                continue
            if len(clean) > 8:
                bold_sentences.append(clean)
                
    if not hashtags:
        hashtags = ["#재테크", "#정보", "#꿀팁", "#릴스", "#추천"]
        
    return {
        "title": title,
        "bullets": bold_sentences[:3],
        "tags": hashtags[:8]
    }

def main():
    print("=== [캡션 작성기] 9대 채널 SNS 전용 요약글 일괄 컴파일 집행 ===")
    if not os.path.exists(BASE_DIR):
        print("Base directory not found.")
        return
        
    full_caption_text = "==================================================\n"
    full_caption_text += "🎬 오늘의 9대 채널 페이스북/인스타 릴스 업로드 캡션 패키지 🎬\n"
    full_caption_text += "==================================================\n\n"
    
    for item in CHANNELS_CFG:
        # 매칭되는 폴더 찾기
        target_folder = None
        for folder_name in os.listdir(BASE_DIR):
            if folder_name.startswith(item["folder"]) and os.path.isdir(os.path.join(BASE_DIR, folder_name)):
                target_folder = folder_name
                break
                
        if not target_folder:
            continue
            
        date_dir = os.path.join(BASE_DIR, target_folder, DATE_STR)
        if not os.path.exists(date_dir):
            continue
            
        full_caption_text += f"■■■ 채널명: {item['channel_name']} ({item['desc']}) ■■■\n\n"
        
        for no in [1, 2, 3]:
            md_file = os.path.join(date_dir, f"post{no:02d}.md")
            if not os.path.exists(md_file):
                continue
                
            data = parse_post_md(md_file)
            if not data:
                continue
                
            # 페이스북/인스타 감성 캡션 조립
            title = data["title"]
            bullets = data["bullets"]
            tags = " ".join(data["tags"])
            
            bullet_text = ""
            for idx, b in enumerate(bullets):
                bullet_text += f"📌 {b}\n"
            if not bullet_text:
                bullet_text = f"📌 {title} 상세 유용한 정보 제공!\n"
                
            caption = f"""🎬 [{item['channel_name']} 릴스 리포트 - POST 0{no}]
👉 {title}

💡 릴스 핵심 3줄 요약!
{bullet_text}
🔗 더 상세한 내용과 꿀팁은 프로필 링크 및 블로그를 참조해 주세요! ✨

{tags}
--------------------------------------------------
"""
            full_caption_text += caption
            
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(full_caption_text)
        
    print(f"🎉 성공! SNS 전용 캡션글 파일이 생성되었습니다: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
