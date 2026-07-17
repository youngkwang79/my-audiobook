# -*- coding: utf-8 -*-
import json
import os
import sys
import requests
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
try:
    from api_key_loader import get_api_key
except ImportError:
    def get_api_key(key_name):
        return os.environ.get(key_name)

# Anthropic API 키 로드
ANTHROPIC_API_KEY = get_api_key("ANTHROPIC_API_KEY")

def try_claude(system_prompt, user_prompt):
    """
    Claude API를 사용하여 생성 시도.
    가장 고품질의 출력을 얻기 위해 Sonnet 및 Opus를 포함한 모델들을 순차적으로 시도합니다.
    """
    if not ANTHROPIC_API_KEY:
        print("[ERROR] Anthropic API 키를 찾을 수 없습니다. .env.local에 ANTHROPIC_API_KEY를 설정해 주세요.")
        return None

    # 지원되는 대표 모델 목록
    claude_models = [
        "claude-sonnet-5",
        "claude-opus-4-8",
        "claude-sonnet-4-6",
        "claude-opus-4-6",
        "claude-haiku-4-5-20251001"
    ]

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    for model in claude_models:
        print(f"[INFO] Claude {model} 모델로 생성을 시도합니다...")
        payload = {
            "model": model,
            "max_tokens": 8000,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }
        try:
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=120)
            if response.status_code == 200:
                result = response.json()
                text_content = ""
                for part in result.get("content", []):
                    if part.get("type") == "text":
                        text_content += part.get("text", "")
                
                if text_content:
                    print(f"[SUCCESS] Claude {model} 모델 생성 성공!")
                    return text_content.strip()
                else:
                    print(f"[WARNING] Claude {model} 모델 성공했으나 텍스트 본문이 비어있습니다.")
            else:
                safe_text = response.text.encode('ascii', errors='replace').decode('ascii')
                print(f"[WARNING] Claude {model} 모델 실패 (코드: {response.status_code}): {safe_text}")
        except Exception as e:
            safe_err = str(e).encode('ascii', errors='replace').decode('ascii')
            print(f"[WARNING] Claude {model} 모델 연결 실패: {safe_err}")

    return None

def generate_blog_post(news_title, news_desc):
    """
    뉴스 정보를 분석하여 장문 블로그 콘텐츠를 생성합니다.
    오직 Claude API만을 사용하여 최상의 글 품질을 보장합니다.
    """
    import datetime
    current_year = datetime.datetime.now().year

    system_prompt = (
        "당신은 구글 애드센스 수익 극대화와 Rank Math SEO 90점 이상 달성을 목표로 하는 10년 경력의 전문 검색최적화 IT/테크 칼럼니스트입니다.\n"
        "제공된 뉴스 속보 정보를 분석하여 독자에게 완벽한 정보를 전달하는 장문의 글을 작성하십시오."
    )

    user_prompt = f"""
올해의 현재 연도는 {current_year}년입니다. 제목의 연도 후킹 및 내용 전반에 언급되는 연도는 반드시 올해 연도인 {current_year}년을 사용해 주십시오.

다음 뉴스 속보를 분석하여, 사람들이 구글에서 대량으로 검색할 만한 '가장 유입량 높은 핵심 포커스 키워드'를 1개 추출하고, 이를 기반으로 본문을 한글 기준 '공백 포함 약 7,000자 이상'의 극도로 상세한 정보성 칼럼으로 대폭 확장하여 HTML 포스팅 본문으로 작성해 주세요. 
(★절대로 중간에 글을 끊지 말고, 결론까지 논리적으로 완벽하게 완성해 주세요.)

[분석할 뉴스 정보]
- 뉴스 제목: {news_title}
- 뉴스 요약: {news_desc}

[반드시 준수해야 할 작성 규칙]

1. **포커스 키워드**:
   - 분석을 바탕으로 구글 검색 유입량이 가장 높을 것으로 예상되는 핵심 포커스 키워드를 1개 추출하세요.
   
2. **글의 제목 (H1) 규칙 (수익 극대화 가이드라인)**:
   - **뉴스/이슈 스타일 제목 전면 금지**: 신문 기사식 헤드라인(예: "{current_year}년 청년 주거 지원금 확대 시행")은 절대로 사용하지 마세요. 사용자가 직접 검색창에 검색할 법한 **검색어 기반 블로그형 제목**으로 작성해야 합니다.
   - **행동요구형 황금 키워드 결합**: 다음 접미사 중 하나를 반드시 제목에 자연스럽게 녹여내세요.
     - `~신청 방법`, `~자격 조건`, `~가입 대상`, `~바로가기`, `~대상 조회`, `~예매`, `~다운로드`, `~자동계산`
   - **키워드 전방 배치**: 핵심이 되는 포커스 키워드를 무조건 **제목의 맨 앞(가장 좌측)**에 1회 위치시키세요.
   - **조사 최소화**: 단어 위주로 연결하고 "~의", "~를 위한" 등 조사를 피하여 검색 집중도를 높이세요.
   - **제목 템플릿 공식**: `[맨 앞: 메인 롱테일 키워드] + [중간: 연관 행동 키워드(접미사 결합)] + [끝: 숫자 또는 최신 연도 후킹]`
     - 예시: "실손보험 가입 조건 및 추천 병원 3곳 ({current_year} 최신)"

3. **본문 내 키워드 밀도 (지능형 1~1.5% 동적 보정)**:
   - 본문 전체 글의 양에서 메인 **포커스 키워드**가 구글 SEO 스팸 필터에 걸리지 않도록 **정확히 1~1.5%의 적정 밀도**를 칼같이 유지하십시오.
   - **기계적 반복 및 남용(Stuffing) 절대 금지**: 모든 문단마다 포커스 키워드를 강제로 쑤셔 넣는 어색한 문장은 절대 금지합니다. 문맥 흐름상 100% 꼭 필요한 본론 곳곳에만 **자연스러운 대화나 서술 형태로 총 6~8회 정도만 골고루 분산 배치**하십시오.
   - **자연스러운 동의어/변형 활용**: 포커스 키워드를 100% 동일한 어구로만 반복해 적으면 가독성이 훼손되므로, 자연스럽게 단어를 나누거나 변형(예: "청년 자립 회복" -> "자립을 준비하는 청년들의 회복", "청년들의 자립과 일상 회복")하여 문장의 가독성을 대폭 끌어올리십시오.

4. **구조 및 레이아웃**:
   - **서론**: 첫 100자 내에 독자가 얻을 핵심 이점과 메인 키워드가 자연스럽게 녹아든 도입부 문장으로 시작하세요.
   - **HTML 목차 테이블 (Table of Contents)**: 서론 바로 뒤에 클릭하면 본론의 소제목(H2, H3)으로 부드럽게 순간 이동(점프)하는 앵커 링크 테이블 영역을 깔끔한 HTML 코드 `<a href="#section1">` 형태로 조립해 제공하세요. (※ TOC 위에 이미지 Alt Text 안내 가이드 박스는 절대 넣지 마세요.)
   - **본론**: 적절하게 H2, H3 태그를 필수적으로 구분하여 배치하고, 각 섹션마다 상세 내용, 실용 가이드를 풍부하게 수록하세요. (글자 수를 7,000자 이상 확보하도록 아주 세부적인 사항까지 자세하게 풀어 쓰세요. 절대 도중에 끊지 마십시오.)
   - **결론 (3인칭 우회 마무리)**: 마지막 결론 문단은 AI가 쓴 기계적인 어투가 나지 않도록 하되, 거짓 1인칭 경험담을 직접 지어내는 대신 "주변에서 흔히 보는 사례인데요", "아는 지인의 경우도", "직장인들이 흔히 겪는 실수 중 하나는" 과 같이 3인칭 간접 경험으로 자연스럽게 우회하여 성의 있는 조언이나 스토리텔링을 3줄 이하로 담백하게 연결해 마무리하세요. ('작성자 주:' 나 괄호 같은 수식어는 절대 금지합니다.)

5. **가독성 및 텍스트 스타일 (Bold 강조 극대화 & 서브번호 금지 & 포인트 박스)**:
   - 모바일 가독성을 극대화하기 위해 **문장은 2줄 이내로 짧게 끊고, 단락은 3~4줄마다 나누어** 줄바꿈하세요.
   - 독자의 즉각적인 시선 포커싱과 스캔율을 높이기 위해, 본론 내 핵심 요지, 중요 키워드 및 주요 문장(최소 15군데 이상)은 반드시 **칠흑같이 검고 찐하게 강조되는** `<strong style="font-weight: 900; color: #000000;">중요한 단어 및 핵심 요지</strong>` 태그를 직접 감싸서 확실하게 굵기(Bold) 처리를 해 주십시오.
   - **서브 번호 지정 전면 금지**: 소제목(H2, H3) 아래에 하위 항목이나 구체적인 세부 전략을 나열할 때, **'6-1, 6-2, 6-3'과 같은 숫자 서브번호를 사용하는 것을 엄격히 금지**합니다. 숫자 대신 내용에 더 집중할 수 있도록 **가독성 좋은 이모지 기호(예: `📌`, `✔️`, `·`, `💡` 등)나 불릿 기호**를 문단 앞에 사용하여 깔끔하게 정리해 주십시오.
   - **핵심 포인트 박스 의무 주입 (1~2개)**: 본론 내용 중간에 독자가 핵심을 바로 알 수 있도록 요약 꿀팁이나 핵심 가이드를 담은 **포인트 박스 1~2개**를 반드시 HTML 인라인 스타일로 구현하여 주입하십시오.
     - *포인트 박스 HTML 템플릿*:
       `<div style="background-color: #F4F6F7; border-left: 5px solid #00BFA5; padding: 18px; border-radius: 6px; margin: 25px 0; line-height: 1.6;"><strong>💡 핵심 꿀팁 요약:</strong> ...내용...</div>`

6. **이미지 삽입 가이드**:
   - 본문 중간 적절한 위치(TOC와 본론 사이)에 중간 이미지 플레이스홀더용 태그를 `[중간_이미지_위치]`로 표시해 주세요. 나중에 썸네일 업로더가 해당 위치에 적절한 `<img>` 태그와 상세한 ALT 대체 텍스트를 주입하게 됩니다.

7. **링크 규칙 (내부 2개 / 외부 2개 이상 / 정부 출처 필수)**:
   - **내부 링크 (2개)**: 본문 중간 설명 과정에서 이 칼럼의 대주제와 부합하는 이전 작성 칼럼들(예: 시간관리, 부자습관, 부동산팁 등)을 자연스럽게 언급하며 텍스트 링크 2개를 심으세요. (실제 도메인 대신 '#'을 사용하되, 텍스트 형태가 자연스럽게 이전 칼럼을 나타내게 하세요.)
     - 예: "...과거 작성한 <a href='#'>부자습관 만드는 비결</a> 칼럼에서도 강조했듯이..."
   - **외부 백과 링크 (2개 이상)**: 본문 중간 설명 과정에서 중요한 전문 단어 또는 고유명사 3~4개에 나무위키(`https://namu.wiki/w/단어`) 또는 위키백과(`https://ko.wikipedia.org/wiki/단어`)의 실제 작동하는 정보 페이지 상세 링크를 자연스럽게 `<a>` 하이퍼링크 형식으로 거세요. (타겟은 반드시 `target="_blank"`로 새창 열기 설정)
   - **하단 공식 출처 링크 (필수 1~2개)**: 결론 바로 아래(해시태그 직전)에 글 주제와 직접적으로 긴밀한 정부 기관, 공공기관의 실제 정상 작동하는 외부 링크 1~2개(예: 대한민국 정책브리핑 `https://www.korea.kr` 등)를 친절한 안내 문구와 함께 **반드시 누락 없이 추가 삽입**하세요.

8. **해시태그**:
   - 본문 가장 마지막에 # 표시 없이 8개의 핵심 키워드를 쉼표(,)로만 구분하여 나열하세요.

9. **주의 사항**:
   - 규칙 관련 텍스트나 포스팅 외적인 설명은 응답 본문에 절대 포함하지 마십시오.
   - 응답 결과는 반드시 아래의 명시된 여덟 가지 구분자(Delimiter) 라인을 사용하여 정확한 Plain Text 포맷으로 출력해 주세요.
   - 포맷 형식:
   ===FOCUS_KEYWORD===
   추출한 포커스 키워드 단어 1개
   ===TITLE===
   완성된 제목 (위의 수익 극대화 H1 공식 필히 적용, 포커스 키워드가 맨 앞에 위치)
   ===SEO_DESCRIPTION===
   사람들을 확 끌어당기는 주어 + 내용을 담아낸 매력적인 요약글 (130~150자 내외, 추출한 [포커스 키워드]를 자연스럽게 1회 무조건 포함할 것)
   ===CATEGORIES===
   디지털트렌드, IT이슈, 테크뉴스 (글의 주제와 밀접한 연관 카테고리 3개, 쉼표 구분)
   ===TAGS===
   IT트렌드, 인공지능, 테크이슈 (쉼표로 구분한 해시태그 8개)
   ===IMAGE_PROMPT===
   대표 이미지용 영문 Stable Diffusion 생성 프롬프트 (※ 절대 이미지 내부에 글자(text, font 등) 렌더링을 지시하지 마십시오. 글씨의 '배경'이 될 수 있도록 98% 실사 기반에 2%의 아늑하고 따뜻한 일러스트 느낌이 가미된 고급 책 표지 목업(Book Cover Mockup)이나 감성적인 배경을 유도하십시오. 예시: a cozy study room table with an elegant minimalist book cover mockup, warm natural lighting, aesthetic interior scene, 98% realistic photo with 2% soft warm illustration touch, 8k, highly detailed, editorial photography)
   ===IMAGE_PROMPT_MID===
   본문 중간용 영문 Stable Diffusion 생성 프롬프트 (※ 글자 묘사 절대 금지. 본문 중간에 어울리는 감성적인 정물 배경 유도. 예시: close-up of a leather notebook, glasses, and a gold pen on a warm wooden desk, soft warm lighting, 98% realistic photo with 2% soft warm illustration touch, highly detailed, editorial style)
   ===CONTENT===
   작성된 전체 HTML 본문 (TOC 및 외부 링크, [중간_이미지_위치] 포함)
"""

    content_text = try_claude(system_prompt, user_prompt)
        
    if not content_text:
        print("[ERROR] Claude API를 통한 콘텐츠 생성에 실패했습니다.")
        return None

    try:
        content_text = content_text.strip()
        
        # 구분자를 기준으로 데이터 슬라이싱
        kw_part = content_text.split("===FOCUS_KEYWORD===")[1].split("===TITLE===")[0].strip()
        title_part = content_text.split("===TITLE===")[1].split("===SEO_DESCRIPTION===")[0].strip()
        seo_desc_part = content_text.split("===SEO_DESCRIPTION===")[1].split("===CATEGORIES===")[0].strip()
        cat_part = content_text.split("===CATEGORIES===")[1].split("===TAGS===")[0].strip()
        tags_part = content_text.split("===TAGS===")[1].split("===IMAGE_PROMPT===")[0].strip()
        img_prompt_part = content_text.split("===IMAGE_PROMPT===")[1].split("===IMAGE_PROMPT_MID===")[0].strip()
        img_prompt_mid_part = content_text.split("===IMAGE_PROMPT_MID===")[1].split("===CONTENT===")[0].strip()
        content_part = content_text.split("===CONTENT===")[1].strip()
        
        # 목록 리스트화
        tag_list = [t.strip() for t in tags_part.split(",") if t.strip()]
        cat_list = [c.strip() for c in cat_part.split(",") if c.strip()]
        
        post_data = {
            "focus_keyword": kw_part,
            "title": title_part,
            "seo_description": seo_desc_part,
            "categories": cat_list,
            "tags": tag_list,
            "image_prompt": img_prompt_part,
            "image_prompt_mid": img_prompt_mid_part,
            "content": content_part
        }
        
        print(f"[SUCCESS] 글 생성 완료! 키워드: [{post_data.get('focus_keyword')}] (태그 {len(tag_list)}개, 카테고리 {len(cat_list)}개)")
        return post_data
    except Exception as e:
        safe_err = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"[ERROR] 생성된 콘텐츠 텍스트 파싱 실패: {safe_err}")
        try:
            safe_text = content_text[:500].encode('ascii', errors='replace').decode('ascii')
            print("응답 원본 일부:", safe_text)
        except NameError:
            pass
        return None

if __name__ == "__main__":
    test_title = "오픈AI, 인간 수준 추론 능력 '스트로베리' 모델 출시 임박"
    test_desc = "오픈AI가 프로젝트명 스트로베리로 알려진 새로운 추론형 AI 모델을 곧 출시할 예정입니다. 이 모델은 복잡한 수학 문제와 프로그래밍 코드를 인간 수준으로 해결할 수 있는 능력을 갖추었습니다."
    post = generate_blog_post(test_title, test_desc)
    if post:
        print("\n=== 생성 결과 ===")
        print(f"키워드: {post['focus_keyword']}")
        print(f"제목: {post['title']}")
        print(f"요약글: {post['seo_description']}")
        print(f"카테고리: {post['categories']}")
        print(f"태그: {post['tags']}")
        print(f"대표 이미지 프롬프트: {post['image_prompt']}")
        print(f"중간 이미지 프롬프트: {post['image_prompt_mid']}")
        print(f"본문 길이: {len(post['content'])}자")
