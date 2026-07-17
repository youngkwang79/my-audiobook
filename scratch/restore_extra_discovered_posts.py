# -*- coding: utf-8 -*-
"""
추가 발굴된 누락 블로그 포스트들을 Supabase works 테이블에 복원하는 스크립트
발굴 목록:
  1. so_sang_gong_in_loan  - 소상공인 대출: 2026 저금리 100% 성공
  2. tomorrow_card         - 2026년 국민내일배움카드 신청방법 꿀팁 총정리
  3. automation_tools      - 업무 자동화 도구 정복기 (ChatGPT, Zapier, Notion)
  4. time_management       - 시간관리 공부법 정복 (집중력 향상 4가지 전략)
  5. pear_tea_review       - 배도라지차 찐 후기 (블로거 감성 글)
  6. tat1109               - 필립스 TAT1109 블루투스 이어폰
  7. watertap_faucet       - 회전 수전 세면대 워터탭 미소랩 스윙글
"""

import os
import re
import json
import datetime
import urllib.request
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

def load_credentials():
    url = ""
    service_key = ""
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    parts = line.strip().split("=", 1)
                    k = parts[0].strip()
                    v = parts[1].strip()
                    if k == "NEXT_PUBLIC_SUPABASE_URL":
                        url = v
                    elif k == "SUPABASE_SERVICE_ROLE_KEY":
                        service_key = v
    return url, service_key


def extract_triple_quoted_string(filepath, var_name="content"):
    """파이썬 소스에서 content_html = \"\"\"...\"\"\", html = \"\"\"...\"\"\" 패턴 추출"""
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        src = f.read()
    patterns = [
        rf'{var_name}\s*=\s*f?"""(.*?)"""',
        rf'{var_name}\s*=\s*f?\'\'\'(.*?)\'\'\'',
    ]
    for pat in patterns:
        m = re.search(pat, src, re.DOTALL)
        if m:
            return m.group(1).strip()
    return None


def extract_blogger_content(filepath):
    """블로거용 content_html 추출 - f-string 중에 blogger_img_url 참조 처리"""
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        src = f.read()
    # content_html = f""" ... """ 패턴
    m = re.search(r'content_html\s*=\s*f"""(.*?)"""', src, re.DOTALL)
    if m:
        raw = m.group(1)
        # f-string 변수 대체 (이미지 URL 등)
        raw = re.sub(r'\{blogger_img_url\}', 'https://blog.murimbook.com/wp-content/uploads/2026/07/tomorrow_card_blogger_cover.jpg', raw)
        raw = re.sub(r'\{sub_img_url\}', '', raw)
        raw = re.sub(r'\{sub_img_html\}', '', raw)
        raw = re.sub(r'\{[^}]+\}', '', raw)  # 나머지 변수 제거
        return raw.strip()
    return None


def extract_wp_content_html(filepath):
    """워드프레스용 content_html f-string 추출"""
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        src = f.read()
    m = re.search(r'content_html\s*=\s*f"""(.*?)"""', src, re.DOTALL)
    if m:
        raw = m.group(1)
        raw = re.sub(r'\{sub_img_html\}', '', raw)
        raw = re.sub(r'\{sub_img_url\}', '', raw)
        raw = re.sub(r'\{[^}]+\}', '', raw)
        return raw.strip()
    return None


def extract_get_post_content_func(filepath):
    """def get_post_content() 함수 내 return html 패턴 추출"""
    with open(filepath, encoding="utf-8", errors="ignore") as f:
        src = f.read()
    m = re.search(r'html\s*=\s*f?"""(.*?)"""', src, re.DOTALL)
    if m:
        raw = m.group(1)
        raw = re.sub(r'\{[^}]+\}', '', raw)
        return raw.strip()
    return None


def upsert_to_supabase(url, headers, work_id, title, content, thumbnail_url, tags=""):
    payload = json.dumps([{
        "id": work_id,
        "title": title,
        "description": content,
        "thumbnail": thumbnail_url,
        "status": "공개",
        "subtitle": "[블로그]",
        "badge": "",
        "episode_count": 0,
        "total_episodes": 50,
        "free_episodes": 10,
        "exclusive": True,
        "featured": True,
        "views": 0,
        "play_count": 0,
        "is_membership_only": False,
        "last_voice": None,
        "last_pitch": None,
        "last_rate": None,
        "created_at": "2026-07-01T00:00:00+00:00"
    }]).encode("utf-8")

    req = urllib.request.Request(
        f"{url}/rest/v1/works",
        data=payload,
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  ✅ UPSERTED: [{work_id}] {title[:50]}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  ❌ FAILED [{work_id}]: HTTP {e.code} - {body[:200]}")
        return False


def main():
    url, service_key = load_credentials()
    if not url or not service_key:
        print("[ERROR] .env.local credentials not found!")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }

    # 추가 발굴 글 목록 정의
    extra_posts = []

    # ===== 1. 소상공인 대출 =====
    content_1 = extract_wp_content_html("scratch/upload_so_sang_gong_in_loan_wp.py")
    if content_1:
        extra_posts.append({
            "id": "so_sang_gong_loan",
            "title": "소상공인 대출: 2026 저금리 100% 성공",
            "content": content_1,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/so_sang_gong_in_loan_wp_cover_1783122512983.jpg",
            "tags": "소상공인대출,저금리대출,소상공인시장진흥공단,정책자금,자영업자대출,민간대환대출,사업자대출,금융지원"
        })
        print("[1] 소상공인 대출 본문 추출 성공")
    else:
        print("[1] 소상공인 대출 본문 추출 실패 - 수동 확인 필요")

    # ===== 2. 국민내일배움카드 =====
    content_2 = extract_blogger_content("scratch/upload_tomorrow_card_posts.py")
    if not content_2:
        content_2 = extract_wp_content_html("scratch/upload_tomorrow_card_posts.py")
    if content_2:
        extra_posts.append({
            "id": "tomorrow_card",
            "title": "국민내일배움카드 신청방법 꿀팁 총정리",
            "content": content_2,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/tomorrow_card_bookcover.jpg",
            "tags": "국민내일배움카드,정부지원,직업훈련,HRD-Net,자기계발,취업준비,국비지원,커리어"
        })
        print("[2] 국민내일배움카드 본문 추출 성공")
    else:
        print("[2] 국민내일배움카드 본문 추출 실패 - 수동 확인 필요")

    # ===== 3. 업무 자동화 도구 정복기 =====
    content_3 = extract_get_post_content_func("scratch/wp_upload_post_2.py")
    if content_3:
        extra_posts.append({
            "id": "automation_tools",
            "title": "업무 자동화 도구 정복기: ChatGPT, Zapier, Notion으로 생산성 200% 올리기",
            "content": content_3,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/automation_tools_bookcover.jpg",
            "tags": "업무자동화,생산성도구,ChatGPT활용,Zapier연동,노션사용법,디지털트랜스포메이션,시간관리,스마트워크"
        })
        print("[3] 업무 자동화 도구 정복기 본문 추출 성공")
    else:
        # 대안: content_html 패턴으로 재시도
        content_3b = extract_wp_content_html("scratch/wp_upload_post_2.py")
        if content_3b:
            extra_posts.append({
                "id": "automation_tools",
                "title": "업무 자동화 도구 정복기: ChatGPT, Zapier, Notion으로 생산성 200% 올리기",
                "content": content_3b,
                "thumbnail_url": "https://r2.murimbook.com/thumbnails/automation_tools_bookcover.jpg",
                "tags": "업무자동화,생산성도구,ChatGPT활용,Zapier연동,노션사용법,디지털트랜스포메이션,시간관리,스마트워크"
            })
            print("[3] 업무 자동화 도구 정복기 본문 추출 성공 (대안)")
        else:
            print("[3] 업무 자동화 도구 정복기 본문 추출 실패 - 수동 확인 필요")

    # ===== 4. 시간관리 공부법 (wp_upload_post_3.py) =====
    content_4 = extract_wp_content_html("scratch/wp_upload_post_3.py")
    if not content_4:
        content_4 = extract_get_post_content_func("scratch/wp_upload_post_3.py")
    if content_4:
        extra_posts.append({
            "id": "time_management_study",
            "title": "시간관리 공부법 정복: 집중력 향상을 통해 목표 달성하는 4가지 실전 학습 전략",
            "content": content_4,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/time_management_bookcover.jpg",
            "tags": "시간관리,공부법,집중력향상,목표달성,자기계발,학습전략,포모도로,생산성"
        })
        print("[4] 시간관리 공부법 본문 추출 성공")
    else:
        print("[4] 시간관리 공부법 본문 추출 실패 - 수동 확인 필요")

    # ===== 5. 배도라지차 찐 후기 =====
    content_5 = extract_blogger_content("scratch/update_blogger_pear_tea.py")
    if not content_5:
        # 다른 패턴으로 시도
        with open("scratch/update_blogger_pear_tea.py", encoding="utf-8", errors="ignore") as f:
            src = f.read()
        m = re.search(r'"content"\s*:\s*f?"""(.*?)"""', src, re.DOTALL)
        if not m:
            m = re.search(r'"content"\s*:\s*f?\'\'\'(.*?)\'\'\'', src, re.DOTALL)
        if m:
            content_5 = m.group(1).strip()
    if content_5:
        extra_posts.append({
            "id": "pear_tea_review",
            "title": "아침마다 기침하느라 깨는 분들만 보세요. 배도라지차 정착하게 된 찐 후기",
            "content": content_5,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/pear_tea_bookcover.jpg",
            "tags": "배도라지차,기침,목건강,도라지차,천연차,건강차,맥문동,힐링루틴"
        })
        print("[5] 배도라지차 찐 후기 본문 추출 성공")
    else:
        print("[5] 배도라지차 찐 후기 본문 추출 실패 - 수동 확인 필요")

    # ===== 6. 필립스 TAT1109 블루투스 이어폰 =====
    with open("scratch/update_tat1109_draft.py", encoding="utf-8", errors="ignore") as f:
        src6 = f.read()
    m6 = re.search(r'"content"\s*:\s*f?"""(.*?)"""', src6, re.DOTALL)
    if not m6:
        m6 = re.search(r'content\s*=\s*f?"""(.*?)"""', src6, re.DOTALL)
    if m6:
        content_6 = m6.group(1).strip()
        extra_posts.append({
            "id": "tat1109_earphone",
            "title": "필립스 커널형 무선 블루투스 이어폰 TAT1109 블랙",
            "content": content_6,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/tat1109_bookcover.jpg",
            "tags": "블루투스이어폰,필립스이어폰,TAT1109,무선이어폰,커널형이어폰,가성비이어폰,이어폰추천,필립스"
        })
        print("[6] 필립스 TAT1109 본문 추출 성공")
    else:
        print("[6] 필립스 TAT1109 본문 추출 실패 - 수동 확인 필요")

    # ===== 7. 회전 수전 세면대 워터탭 =====
    content_7 = extract_blogger_content("scratch/update_blogger_post.py")
    if not content_7:
        with open("scratch/update_blogger_post.py", encoding="utf-8", errors="ignore") as f:
            src7 = f.read()
        m7 = re.search(r'"content"\s*:\s*f?"""(.*?)"""', src7, re.DOTALL)
        if m7:
            content_7 = m7.group(1).strip()
    if content_7:
        extra_posts.append({
            "id": "watertap_faucet",
            "title": "회전 수전 세면대 워터탭 미소랩 스윙글 필터 스펙 분석 및 설치 효과",
            "content": content_7,
            "thumbnail_url": "https://r2.murimbook.com/thumbnails/watertap_bookcover.jpg",
            "tags": "회전수전,세면대수전,워터탭,미소랩,스윙글,정수필터,절수,홈인테리어"
        })
        print("[7] 워터탭 수전 본문 추출 성공")
    else:
        print("[7] 워터탭 수전 본문 추출 실패 - 수동 확인 필요")

    print(f"\n--- 총 {len(extra_posts)}개 글 복원 대상 확인 ---\n")

    success = 0
    for post in extra_posts:
        if post["content"] and len(post["content"]) > 100:
            result = upsert_to_supabase(
                url, headers,
                post["id"], post["title"], post["content"],
                post["thumbnail_url"], post.get("tags", "")
            )
            if result:
                success += 1
        else:
            print(f"  ⚠️ SKIP [{post['id']}]: content too short or empty")

    print(f"\n=== 추가 복원 완료! 성공: {success}/{len(extra_posts)} ===")


if __name__ == "__main__":
    main()
