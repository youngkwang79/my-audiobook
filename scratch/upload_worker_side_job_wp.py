# -*- coding: utf-8 -*-
"""
워드프레스 자동 포스팅 스크립트 - 직장인 부업 집에서 돈 버는 방법 (Rank Math SEO 90점 이상 충족)
"""

import requests
import json
import os
import mimetypes

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
featured_img_path = f"{brain_dir}/worker_side_job_wp_cover_1783159245964.jpg"
sub_img_path = f"{brain_dir}/worker_side_job_sub_image_1783159258447.jpg"

def upload_media(file_path, alt_text, caption="", description=""):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None
    
    url = f"{WP_URL}/wp-json/wp/v2/media"
    mime_type, _ = mimetypes.guess_type(file_path)
    headers = {
        "Content-Disposition": f'attachment; filename="{os.path.basename(file_path)}"'
    }
    if mime_type:
        headers["Content-Type"] = mime_type
        
    with open(file_path, "rb") as f:
        r = requests.post(url, auth=(WP_USER, WP_PASS), headers=headers, data=f)
        
    if r.status_code == 201:
        media_id = r.json()["id"]
        media_url = r.json()["source_url"]
        print(f"Media uploaded successfully! ID: {media_id}, URL: {media_url}")
        
        # 메타데이터 업데이트 (Alt, Caption, Description)
        update_url = f"{WP_URL}/wp-json/wp/v2/media/{media_id}"
        requests.post(
            update_url,
            auth=(WP_USER, WP_PASS),
            json={
                "alt_text": alt_text,
                "caption": caption,
                "description": description
            }
        )
        return media_id, media_url
    else:
        print(f"Failed to upload media: {r.status_code}, {r.text}")
        return None

def main():
    print("Uploading featured image...")
    feat_res = upload_media(
        featured_img_path, 
        "직장인 부업 및 집에서 돈 버는 방법 썸네일", 
        "직장인 부업 1인 창업 완벽 가이드 대표 이미지", 
        "직장인이 퇴근 후 집에서 부수입을 올릴 수 있는 대표적인 3가지 부업 소개"
    )
    featured_media_id = feat_res[0] if feat_res else 0
    
    print("\nUploading sub image...")
    sub_res = upload_media(
        sub_img_path,
        "직장인 부업 수익화 프로세스 인포그래픽",
        "",
        "직장인 부수입 창출을 위한 대표적인 온라인 부업 비교표"
    )
    sub_img_url = sub_res[1] if sub_res else ""

    # 카테고리 체크 및 생성
    required_cats = ["IT/업무", "AI/자동화", "경제/산업"]
    cat_ids = []
    
    r_cats = requests.get(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), params={"per_page": 100})
    existing_cats = {c["name"]: c["id"] for c in r_cats.json()} if r_cats.status_code == 200 else {}
    
    for cat_name in required_cats:
        if cat_name in existing_cats:
            cat_ids.append(existing_cats[cat_name])
        else:
            r_new = requests.post(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), json={"name": cat_name})
            if r_new.status_code == 201:
                cat_ids.append(r_new.json()["id"])
                print(f"Created category: {cat_name}")
            else:
                print(f"Failed to create category {cat_name}: {r_new.text}")

    # 태그 생성 및 바인딩
    tags = ["직장인부업", "재택알바", "부수입창출", "1인창업"]
    tag_ids = []
    r_tags = requests.get(f"{WP_URL}/wp-json/wp/v2/tags", auth=(WP_USER, WP_PASS), params={"per_page": 100})
    existing_tags = {t["name"]: t["id"] for t in r_tags.json()} if r_tags.status_code == 200 else {}
    
    for tag in tags:
        if tag in existing_tags:
            tag_ids.append(existing_tags[tag])
        else:
            r_new = requests.post(f"{WP_URL}/wp-json/wp/v2/tags", auth=(WP_USER, WP_PASS), json={"name": tag})
            if r_new.status_code == 201:
                tag_ids.append(r_new.json()["id"])
                print(f"Created tag: {tag}")
            
    # 제목 규칙: 핵심키워드를 맨 앞에 배치하고, 숫자를 포함하여 공백 포함 20자 내외로 짓는다.
    # 포커스 키워드: [직장인 부업]
    title = "직장인 부업: 3가지 무자본 머니 파이프" # 공백포함 22자, 숫자(3) 포함, 키워드 맨앞

    # 본문 구성 (Rank Math SEO 90점 이상 충족 - 글자 수 1000자 이상, 굵게 강조, 이미지 Alt, 내/외부 링크 포함)
    sub_img_html = f'<p style="text-align: center;"><img src="{sub_img_url}" alt="직장인 부업 수익화 프로세스 인포그래픽" class="aligncenter size-full" /></p>' if sub_img_url else ""
    
    content_html = f"""
<p>물가는 치솟고 월급만으로는 자산 형성이 턱없이 부족한 요즘, 퇴근 후 2~3시간을 활용해 추가 소득을 얻으려는 <strong>직장인 부업</strong>에 대한 관심이 어느 때보다 높습니다. 과거의 육체노동형 아르바이트와 달리, 최근의 부업 트렌드는 노트북 한 대만 있으면 집에서 시공간의 제약 없이 안정적인 파이프라인을 구축할 수 있는 무자본 디지털 부업이 대세를 이루고 있습니다.</p>

<p>오늘 이 글을 끝까지 확인하시면 리스크 없이 지금 당장 시작할 수 있는 <strong>직장인 부업</strong> 대표 유형 3가지의 특징과 구체적인 시작 요령, 그리고 회사에 알리지 않고 안전하게 부수입을 올릴 수 있는 세무적 주의사항까지 한 번에 완벽하게 파악하실 수 있습니다. 경제적 자유로 가는 첫걸음은 지금 바로 실천하는 것입니다.</p>

<hr />

<h2>1. 퇴근 후 집에서 돈 버는 무자본 온라인 부업 Top 3</h2>

<p>초기 자본금이 전혀 들어가지 않아 실패 리스크가 제로에 가까운 직장인 친화형 디지털 부업 자금 조달법들입니다.</p>

<ul>
  <li><strong>수익형 블로그 운영 (애드센스)</strong>: 구글 티스토리나 워드프레스를 개설하여 정보성 글을 작성하고 광고 수익을 얻는 구조입니다. 검색 유입이 쌓이기 시작하면 내가 자고 있는 시간에도 달러 수익이 들어오는 가장 대표적인 자동화 파이프라인입니다.</li>
  <li><strong>전자책(E-Book) 집필 및 플랫폼 판매</strong>: 직무 노하우, 엑셀 템플릿, 연애 기술, 주식 투자법 등 자신만의 작고 구체적인 지식을 PDF 형태의 문서로 작성해 크몽, 탈잉 등에 업로드하여 무한 복사 판매 수익을 창출합니다.</li>
  <li><strong>해외 구매대행 및 위탁판매</strong>: 국내 쇼핑몰이나 해외 타오바오 등에서 인기 있는 트렌드 상품을 발굴해 국내 네이버 스마트스토어 등에 등록하고, 주문이 들어오면 대리 배송하는 방식으로 무재고 창업이 가능합니다.</li>
</ul>

<hr />

<h2>2. 랭크매스 고득점을 위한 핵심 키워드 검색 노출 꿀팁</h2>

<p>온라인으로 부업을 시작할 때도, 수익형 블로그를 키우기 위해서는 검색엔진 최적화(SEO) 지식이 필수적입니다.</p>

<p>{sub_img_html}</p>

<p>우리가 작성하는 정보 글이 구글이나 네이버 첫 페이지 상단에 안착하려면 <strong>포커스 키워드를 본문의 제목과 첫 문단, 그리고 소제목 영역에 자연스럽게 배치</strong>해야 합니다. 문맥과 상관없이 키워드를 기계적으로 욱여넣으면 검색 패널티를 받아 저품질 블로그로 낙인찍힙니다. 또한 독자들이 본문을 읽는 시간을 늘리기 위해 문맥을 매끄럽게 가꾸고, 글 마지막 부분에 주제와 일치하는 자사 블로그 내의 다른 유익한 칼럼 링크들을 2~3개 연계 삽입하여 페이지 뷰 순환을 유도하는 내부 링크 전략을 적극적으로 활용하셔야 합니다.</p>

<hr />

<h2>3. 회사 모르게 안전하게 부수입을 올리는 세법 및 인사 규정 체크</h2>

<p>직장인이 부업을 진행할 때 가장 두려워하는 부분이 바로 '회사에 들키지 않을까?' 하는 점입니다. 몇 가지 핵심만 알면 인사상 불이익 없이 안전하게 운영할 수 있습니다.</p>

<h3>① 근로계약서 상의 겸업 금지 의무 확인</h3>
<p>기본적으로 헌법상 직업선택의 자유가 보장되므로 근무 시간 외의 부업은 법적 문제가 없으나, 회사 업무에 지장을 주거나 동종 경쟁 업계에 피해를 주는 부업은 징계 사유가 될 수 있습니다. 무자본 온라인 부업의 경우 회사 보안이나 핵심 자산 유출 우려가 전혀 없으므로 가장 안전한 영역에 속합니다.</p>

<h3>② 국민건강보험료 통보 기준점 파악</h3>
<p>회사가 근로자의 부업 사실을 알게 되는 가장 흔한 경로는 건강보험료 인상 통보입니다. 본업 외의 사업소득이나 기타소득을 합친 부수입 금액이 <strong>연간 2,000만 원(2026년 현행 기준)을 초과하지 않는다면</strong> 회사로 건강보험료 인상 고지서가 날아가지 않으므로 조용히 부수입을 누적할 수 있습니다. 안심하고 파이프라인을 구축하셔도 좋습니다.</p>

<hr />

<h2>4. 직장인 부업을 고민할 때 참고하면 좋은 공식 정부 가이드</h2>

<p>부업 세무 신고 및 1인 창업 지원 정책을 면밀히 파악하기 위해 공식 정부 채널의 가이드를 주기적으로 참고해 보십시오:</p>

<ul>
  <li>🏛️ <strong><a href="https://www.nts.go.kr" target="_blank" rel="noopener noreferrer">국세청 홈택스 공식 누리집</a></strong> — 자영업이나 부업으로 발생한 사업소득의 종합소득세 신고 방법과 5월 정기 신고 요령에 대한 신뢰도 높은 세법 자료를 제공합니다.</li>
  <li>📞 <strong><a href="https://www.k-startup.go.kr" target="_blank" rel="noopener noreferrer">K-스타트업 배움터 공식 웹 사이트</a></strong> — 중소벤처기업부에서 운영하는 창업 포털로, 무자본 1인 창업자를 위한 정부 보조금 지원 사업 및 무료 마케팅 교육 과정을 열람할 수 있습니다.</li>
</ul>

<blockquote>
<p>💡 <strong>직장인 부업</strong>의 본질은 근로소득이라는 안정적인 울타리 안에서 리스크 없이 사업적 역량을 키워보는 데 있습니다. 작은 시도가 모여 큰 경제적 독립을 이뤄냅니다.</p>
</blockquote>

<p>효율적인 부업 머니 파이프라인 구축을 고민하고 있다면, 이 글과 함께 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 꼭 읽어보세요. 본업과 부업의 밸런스를 흐트러뜨리지 않고 한정된 하루 시간을 효율적으로 쪼개어 쓰는 강력한 집중력 설계 노하우를 전수해 줍니다. 또한, 자금이 다소 묶여 저금리 지원 융자가 필요하신 예비 창업주라면 <a href="https://blog.murimbook.com/%ec%86%8c%ec%83%81%ea%b3%b5%ec%9d%b8-%eb%8c%80%ec%b6%9c-2026-%ec%a0%80%eb%8c%80%ec%b6%9c-100-%ec%84%b1%ea%b3%b5/" title="소상공인 대출 가이드" rel="noopener">소상공인 대출 저금리 정책자금 신청법</a>도 함께 정독하시어 무자본에서 유자본으로 연착륙하는 자금 조달 흐름을 매끄럽게 설계해 보시기 바랍니다.</p>

<p>
<strong>#직장인부업</strong> <strong>#재택알바</strong> <strong>#머니파이프라인</strong> <strong>#1인창업</strong> <strong>#종합소득세신고</strong> <strong>#건강보험료기준</strong> <strong>#수익형블로그</strong> <strong>#무자본창업</strong>
</p>
"""

    post_data = {
        "title": title,
        "content": content_html,
        "status": "draft",
        "featured_media": featured_media_id,
        "categories": cat_ids,
        "tags": tag_ids
    }
    
    post_data["meta"] = {
        "_rank_math_focus_keyword": "직장인 부업",
        "_rank_math_description": "자유롭게 부수입을 쌓는 직장인 부업 집에서 돈 버는 방법 가이드. 애드센스 블로그, 전자책 판매 등 무자본 부업 Top 3 소개 및 세무/인사 겸업금지 탈출 팁."
    }

    print("\nCreating draft post on WordPress...")
    post_url = f"{WP_URL}/wp-json/wp/v2/posts"
    r_post = requests.post(post_url, auth=(WP_USER, WP_PASS), json=post_data)
    
    if r_post.status_code == 201:
        post_id = r_post.json()["id"]
        edit_link = f"https://blog.murimbook.com/wp-admin/post.php?post={post_id}&action=edit"
        print(f"\n[SUCCESS] WordPress post created successfully as DRAFT!")
        print(f"Post ID: {post_id}")
        print(f"Edit Link: {edit_link}")
    else:
        print(f"Failed to create post: {r_post.status_code}, {r_post.text}")

if __name__ == "__main__":
    main()
