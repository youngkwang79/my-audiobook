import os
import base64
import requests
import json
import re
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env.local")
WP_URL  = os.getenv("WP_URL", "").rstrip("/")
WP_USER = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS = os.getenv("WP_APPLICATION_PASSWORD", "")
cred    = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
headers = {"Authorization": f"Basic {cred}", "Content-Type": "application/json"}

post_seo_map = {
    1352: {
        "focus_kw": "정부 대출 규제 정책",
        "title": "정부 대출 규제 정책 | 부동산 시장 혼란 속 직장인 한도 비교 전략",
        "slug": "government-loan-regulation-policy",
        "intro": "정부 대출 규제 정책은 최근 부동산 자산 시장의 향방을 가르는 가장 뜨거운 주제입니다. 이 글을 통해 시시각각 변화하는 규제 흐름 속에서 직장인들이 최선의 대출 한도를 확보하고 비교하는 실전 전략을 명확하게 제시해 드립니다."
    },
    1349: {
        "focus_kw": "미국 반도체 레버리지",
        "title": "미국 반도체 레버리지 | 3배 ETF 고위험 투자의 장단점 분석",
        "slug": "us-semiconductor-leverage-etf",
        "intro": "미국 반도체 레버리지 투자는 최근 고수익을 노리는 서학개미들 사이에서 폭발적인 관심을 받고 있습니다. 고수익의 이면에 숨겨진 3배 레버리지 ETF의 치명적인 리스크와 장단점 분석을 통해 안전한 자산 관리 비법을 공유합니다."
    },
    1346: {
        "focus_kw": "가족 경제 교육 추천",
        "title": "가족 경제 교육 추천 | 증권박물관 실물 전시를 활용한 문해력 공부법",
        "slug": "family-economy-education-museum",
        "intro": "가족 경제 교육 추천 장소로 손꼽히는 증권박물관은 자녀의 조기 경제 관념을 심어주기에 최적의 공간입니다. 실물 증권 전시물을 살펴보며 아이들의 금융 문해력을 쉽고 재미있게 키워줄 수 있는 구체적인 홈스쿨링 공부법을 정리했습니다."
    },
    1343: {
        "focus_kw": "투자자 예탁금 증시 전망",
        "title": "투자자 예탁금 증시 전망 | 주식 실탄 감소가 자산 시장에 미치는 파장",
        "slug": "investor-deposit-market-forecast",
        "intro": "투자자 예탁금 증시 전망은 향후 주식 시장의 반등 여부를 예측하는 중요한 선행 지표입니다. 개인 투자자들의 실탄이 감소함에 따라 향후 자산 시장에 미칠 파장과 포트폴리오 대응 요령을 정밀히 짚어봅니다."
    },
    1340: {
        "focus_kw": "AI 반도체 기술 트렌드",
        "title": "AI 반도체 기술 트렌드 | 카이스트 동탄 사이언스 허브 연구 현황 가이드",
        "slug": "ai-semiconductor-technology-trends",
        "intro": "AI 반도체 기술 트렌드는 미래 디지털 경제 패권을 좌우할 핵심 기술 분야입니다. 동탄 롯데백화점 지하에 위치한 카이스트 사이언스 허브의 4개년 성과와 핵심 연구 현황 가이드를 통해 최첨단 IT 산업의 흐름을 조명합니다."
    }
}

print("=== 워드프레스 예약글 5개 직접 SEO 90점 및 밀도 1.5% 튜닝 시작 ===")

for pid, info in post_seo_map.items():
    r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"[{pid}] 조회 실패")
        continue
        
    post = r.json()
    content_html = post.get("content", {}).get("rendered", "")
    
    # ── [이중 필터] 가이드 찌꺼기 제거 ──────────
    content_html = re.sub(r"ALT_TEXT:\s*.*?\n", "", content_html, flags=re.IGNORECASE)
    content_html = re.sub(r"<!--\s*ALT_TEXT:\s*.*?\s*-->", "", content_html, flags=re.IGNORECASE)
    content_html = re.sub(r"\[ALT_TEXT:\s*.*?\]", "", content_html, flags=re.IGNORECASE)
    content_html = content_html.replace("[X]", "").replace("☒", "")

    # ── 1. 이미지 태그 alt/title 설정 ──────────
    content_html = re.sub(r'alt="[^"]*"', f'alt="{info["focus_kw"]}"', content_html)
    content_html = re.sub(r'title="[^"]*"', f'title="{info["focus_kw"]}"', content_html)
    
    # ── 2. 본문 첫 100자 (서론) 교체 ──────────
    first_p = f"<p><strong>{info['focus_kw']}</strong> — {info['intro']}</p>"
    p_match = re.search(r"<p[^>]*>.*?</p>", content_html, re.DOTALL)
    if p_match:
        content_html = content_html.replace(p_match.group(0), first_p, 1)
    else:
        content_html = first_p + "\n" + content_html

    # ── 3. [핵심] 키워드 밀도 보강 (15회 이상 출현 타겟) ──
    # H2, H3 태그에 포커스 키워드를 접두어로 자연스럽게 주입
    # 예: "<h2>소제목</h2>" -> "<h2>[포커스 키워드] 소제목</h2>"
    h_tags = re.findall(r"<(h[23])[^>]*>(.*?)</\1>", content_html)
    replaced_count = 0
    for h_type, h_text in h_tags:
        # 이미 키워드가 들어있는 경우 제외
        if info["focus_kw"] not in h_text:
            old_h = f"<{h_type}>{h_text}</{h_type}>"
            # 번호가 붙은 소제목 정제 및 포커스 키워드 주입
            clean_h_text = re.sub(r"^[0-9\.\s\-]+", "", h_text)
            new_h = f"<{h_type}>{info['focus_kw']} | {clean_h_text}</{h_type}>"
            content_html = content_html.replace(old_h, new_h, 1)
            replaced_count += 1

    # 본문 단락(<p>) 중 5군데를 찾아서 문장 시작 부분에 포커스 키워드를 자연스럽게 주입
    p_tags = re.findall(r"<p[^>]*>(.*?)</p>", content_html)
    p_injected = 0
    for p_text in p_tags:
        if p_injected >= 6:
            break
        # 너무 짧은 문단이나 내부링크 등은 패스
        if len(p_text) > 80 and info["focus_kw"] not in p_text and "<a" not in p_text:
            old_p = f"<p>{p_text}</p>"
            new_p = f"<p>{info['focus_kw']} 관점에서 살펴보면, {p_text}</p>"
            content_html = content_html.replace(old_p, new_p, 1)
            p_injected += 1

    # ── 4. 워드프레스 업데이트 호출 ────────────
    meta_desc = f"{info['focus_kw']} 관련 핵심 가이드: {info['intro'][:130]}..."
    
    payload = {
        "title":   info["title"],
        "content": content_html,
        "slug":    info["slug"],
        "meta": {
            "rank_math_focus_keyword":  info["focus_kw"],
            "rank_math_title":          info["title"],
            "rank_math_description":    meta_desc,
            "rank_math_robots":         ["index", "follow"],
            "rank_math_rich_snippet":   "article",
        }
    }
    
    r_up = requests.post(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", headers=headers, json=payload, timeout=20)
    if r_up.status_code in (200, 201):
        print(f"  [성공] ID:{pid} -> 제목: {info['title']}")
        print(f"     - 키워드 주입 완료 (소제목 {replaced_count}개, 본문 {p_injected}개 추가)")
        print(f"     - 포커스 키워드: {info['focus_kw']}")
    else:
        print(f"  [실패] ID:{pid} -> {r_up.status_code} ({r_up.text[:100]})")

print("\n=== 모든 예약글 SEO 및 키워드 밀도 보정 완료! ===")
