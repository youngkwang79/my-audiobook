import os
import base64
import requests
import json
import re
import glob
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env.local")
WP_URL  = os.getenv("WP_URL", "").rstrip("/")
WP_USER = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS = os.getenv("WP_APPLICATION_PASSWORD", "")
cred    = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
headers = {"Authorization": f"Basic {cred}", "Content-Type": "application/json"}

# 5개 글의 상세 정보 정의
post_seo_map = {
    1352: {
        "folder_pattern": "시장_혼돈_키우는__정책실장_입",
        "focus_kw": "정부 대출 규제 정책",
        "title": "정부 대출 규제 정책 | 부동산 시장 혼란 속 직장인 한도 비교 전략",
        "slug": "government-loan-regulation-policy",
        "intro": "정부 대출 규제 정책은 최근 부동산 자산 시장의 향방을 가르는 가장 뜨거운 주제입니다. 이 글을 통해 시시각각 변화하는 규제 흐름 속에서 직장인들이 최선의 대출 한도를 확보하고 비교하는 실전 전략을 명확하게 제시해 드립니다."
    },
    1349: {
        "folder_pattern": "반도체주_떨어졌다고요__3배로_베팅",
        "focus_kw": "미국 반도체 레버리지",
        "title": "미국 반도체 레버리지 | 3배 ETF 고위험 투자의 장단점 분석",
        "slug": "us-semiconductor-leverage-etf",
        "intro": "미국 반도체 레버리지 투자는 최근 고수익을 노리는 서학개미들 사이에서 폭발적인 관심을 받고 있습니다. 고수익의 이면에 숨겨진 3배 레버리지 ETF의 치명적인 리스크와 장단점 분석을 통해 안전한 자산 관리 비법을 공유합니다."
    },
    1346: {
        "folder_pattern": "한국예탁결제원_증권박물관_인기",
        "focus_kw": "가족 경제 교육 추천",
        "title": "가족 경제 교육 추천 | 증권박물관 실물 전시를 활용한 문해력 공부법",
        "slug": "family-economy-education-museum",
        "intro": "가족 경제 교육 추천 장소로 손꼽히는 증권박물관은 자녀의 조기 경제 관념을 심어주기에 최적의 공간입니다. 실물 증권 전시물을 살펴보며 아이들의 금융 문해력을 쉽고 재미있게 키워줄 수 있는 구체적인 홈스쿨링 공부법을 정리했습니다."
    },
    1343: {
        "folder_pattern": "개미들__실탄__떨어졌나",
        "focus_kw": "투자자 예탁금 증시 전망",
        "title": "투자자 예탁금 증시 전망 | 주식 실탄 감소가 자산 시장에 미치는 파장",
        "slug": "investor-deposit-market-forecast",
        "intro": "투자자 예탁금 증시 전망은 향후 주식 시장의 반등 여부를 예측하는 중요한 선행 지표입니다. 개인 투자자들의 실탄이 감소함에 따라 향후 자산 시장에 미칠 파장과 포트폴리오 대응 요령을 정밀히 짚어봅니다."
    },
    1340: {
        "folder_pattern": "백화점_아래_반도체_요람",
        "focus_kw": "AI 반도체 기술 트렌드",
        "title": "AI 반도체 기술 트렌드 | 카이스트 동탄 사이언스 허브 연구 현황 가이드",
        "slug": "ai-semiconductor-technology-trends",
        "intro": "AI 반도체 기술 트렌드는 미래 디지털 경제 패권을 좌우할 핵심 기술 분야입니다. 동탄 롯데백화점 지하에 위치한 카이스트 사이언스 허브의 4개년 성과와 핵심 연구 현황 가이드를 통해 최첨단 IT 산업의 흐름을 조명합니다."
    }
}

print("=== 🛠️ 워드프레스 구텐베르크 블록 호환 모드로 5개 예약글 재구축 시작 ===")

for pid, info in post_seo_map.items():
    # 1. 로컬 post.html 원본 파일 읽기
    pattern = f"content-factory/output/*{info['folder_pattern']}*/post.html"
    matched_files = glob.glob(pattern)
    if not matched_files:
        print(f"[{pid}] 로컬 파일 없음")
        continue
        
    with open(matched_files[0], "r", encoding="utf-8") as f:
        html = f.read()

    # ── [기본 정화] 찌꺼기 문자 필터링 ──
    html = re.sub(r"```html\s*", "", html, flags=re.IGNORECASE)
    html = re.sub(r"```\s*", "", html)
    html = re.sub(r"<p[^>]*>\s*📌\s*이미지\s*Alt\s*Text.*?</p>", "", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"📌\s*이미지\s*Alt\s*Text.*?\n", "", html, flags=re.IGNORECASE)
    html = re.sub(r"ALT_TEXT:\s*.*?\n", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<!--\s*ALT_TEXT:\s*.*?\s*-->", "", html, flags=re.IGNORECASE)
    html = re.sub(r"\[ALT_TEXT:\s*.*?\]", "", html, flags=re.IGNORECASE)
    html = html.replace("[X]", "").replace("☒", "")
    html = re.sub(r"(독자\s*관점\s*소제목|세부\s*소제목|실전\s*적용법|주의사항/체크리스트|비교/분석|마무리|인간적\s*결론|공식\s*출처\s*링크|해시태그)\s*[\(]*[가-힣\s]*[\)]*\s*[:-]", "", html)
    html = re.sub(r"독자\s*관점\s*소제목\s*-\s*", "", html)

    # ── 2. [구텐베르크 블록 포맷 보정] ──
    # 줄바꿈과 HTML 태그가 단순 나열되면 워드프레스가 블록 해석 실패하므로, 
    # 워드프레스 전용 주석블록(<!-- wp:paragraph --> 등)을 사용하여 HTML 포맷팅 강제 지정
    blocks = []
    
    # 첫 서론 문단 블록 조립
    first_p = f"<p><strong>{info['focus_kw']}</strong> — {info['intro']}</p>"
    blocks.append(f"<!-- wp:paragraph -->\n{first_p}\n<!-- /wp:paragraph -->")

    # 목차 블록
    toc_match = re.search(r'<div class="toc">.*?</div>', html, re.DOTALL)
    if toc_match:
        blocks.append(f"<!-- wp:html -->\n{toc_match.group(0)}\n<!-- /wp:html -->")

    # 본문 요소를 찾아서 워드프레스 블록 주석으로 감싸기
    # H2, H3, P, Blockquote 등의 요소 매칭
    elements = re.findall(r"(<(h[234]|p|blockquote|ul|hr)[^>]*>.*?</\2>|<figure[^>]*>.*?</figure>|[^<]+)", html, re.DOTALL)
    
    # 3번째 H2 앞에 본문 중간 이미지 삽입을 위한 이미지 주소 추적
    featured_media_id = None
    body_img_url = ""
    try:
        r_media = requests.get(f"{WP_URL}/wp-json/wp/v2/media", headers=headers, params={"search": info["focus_kw"], "per_page": 2}, timeout=15)
        if r_media.status_code == 200 and r_media.json():
            media_list = r_media.json()
            featured_media_id = media_list[0]["id"]
            if len(media_list) >= 2:
                body_img_url = media_list[1]["source_url"]
    except Exception:
        pass

    h2_count = 0
    p_injected = 0

    for el_tuple in elements:
        el_text = el_tuple[0].strip()
        if not el_text:
            continue
        
        # 중복 방지: 이미 서론과 목차는 추가했으므로 패스
        if info["intro"][:20] in el_text or 'class="toc"' in el_text or '📋 목차' in el_text:
            continue
            
        # 3. 소제목 파싱 (기계적 짝대기 치환 제거)
        if el_text.startswith("<h2") or el_text.startswith("<h3"):
            h_type = "h2" if el_text.startswith("<h2") else "h3"
            h_content = re.sub(r"<[^>]+>", "", el_text).strip()
            clean_h = re.sub(r"^[0-9\.\s\-]+", "", h_content)
            
            # 오리지널 소제목 그대로 사용하되, 구텐베르크 블록 아이디만 보강
            el_text = f"<{h_type} id=\"sec{h2_count+1}\">{clean_h}</{h_type}>"
            
            if h_type == "h2":
                h2_count += 1
                # 3번째 H2 위치에 본문 이미지 블록 삽입
                if h2_count == 3 and body_img_url:
                    img_block = f"<!-- wp:image -->\n<figure class=\"wp-block-image size-large\"><img src=\"{body_img_url}\" alt=\"{info['focus_kw']}\" title=\"{info['focus_kw']}\"/><figcaption>{info['focus_kw']} 핵심 포인트 정리</figcaption></figure>\n<!-- /wp:image -->"
                    blocks.append(img_block)
            
            blocks.append(f"<!-- wp:heading -->\n{el_text}\n<!-- /wp:heading -->")
            
        elif el_text.startswith("<p"):
            # 기계적 접두사 주입 제거, 오리지널 본문 그대로 문단 블록 감싸기
            blocks.append(f"<!-- wp:paragraph -->\n{el_text}\n<!-- /wp:paragraph -->")
            
        elif el_text.startswith("<blockquote"):
            blocks.append(f"<!-- wp:quote -->\n{el_text}\n<!-- /wp:quote -->")
            
        elif el_text.startswith("<ul"):
            blocks.append(f"<!-- wp:list -->\n{el_text}\n<!-- /wp:list -->")
            
        elif el_text.startswith("<hr"):
            blocks.append("<!-- wp:separator -->\n<hr class=\"wp-block-separator\"/>\n<!-- /wp:separator -->")
            
        elif el_text.startswith("<figure"):
            # 기존 이미지 figure는 워드프레스 이미지 블록으로 감싸기
            blocks.append(f"<!-- wp:image -->\n{el_text}\n<!-- /wp:image -->")

    # 블록 최종 조립
    gut_content = "\n\n".join(blocks)

    # 5. 메타 빌드 및 워드프레스 재전송
    meta_desc = f"{info['focus_kw']} 관련 핵심 가이드: {info['intro'][:130]}..."
    payload = {
        "title":   info["title"],
        "content": gut_content,
        "slug":    info["slug"],
        "meta": {
            "rank_math_focus_keyword":  info["focus_kw"],
            "rank_math_title":          info["title"],
            "rank_math_description":    meta_desc,
            "rank_math_robots":         ["index", "follow"],
            "rank_math_rich_snippet":   "article",
        }
    }
    if featured_media_id:
        payload["featured_media"] = featured_media_id

    r_up = requests.post(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", headers=headers, json=payload, timeout=30)
    if r_up.status_code in (200, 201):
        print(f"  [호환 복구 완료] ID:{pid} -> 블록 변환 적용!")
    else:
        print(f"  [실패] ID:{pid} -> {r_up.status_code} ({r_up.text[:100]})")

print("\n=== 모든 예약글 구텐베르크 블록 변환 완료! ===")
