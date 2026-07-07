# -*- coding: utf-8 -*-
"""
워드프레스 자동 포스팅 스크립트 - 학교 폭력 대처법 및 법적 대응절차 (Rank Math SEO 90점 이상 충족)
"""

import requests
import json
import os
import mimetypes

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
featured_img_path = f"{brain_dir}/school_violence_wp_cover_1783079622761.jpg"
sub_img_path = f"{brain_dir}/school_violence_sub_image_1783079786331.jpg"

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
        "학교폭력 대처법 가이드 썸네일", 
        "학교폭력 대처법 및 법적 대응절차 가이드 대표 이미지", 
        "학교폭력 대처법에 대한 행정적, 법적 대응 가이드라인 안내"
    )
    featured_media_id = feat_res[0] if feat_res else 0
    
    print("\nUploading sub image...")
    sub_res = upload_media(
        sub_img_path,
        "학교폭력 법적대응 절차 인포그래픽",
        "",
        "학교폭력 발생 시 신속한 대처와 증거 확보 가이드"
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
    tags = ["학교폭력", "학교폭력대처법", "법적대응", "학폭위"]
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
    title = "학교폭력 대처법: 5단계 법적 대응" # 공백포함 20자 내외, 숫자 포함, 키워드 맨앞

    # 본문 구성 (Rank Math SEO 90점 이상 충족 - 글자 수 1000자 이상, 굵게 강조, 이미지 Alt, 내/외부 링크 포함)
    sub_img_html = f'<p style="text-align: center;"><img src="{sub_img_url}" alt="학교폭력 법적대응 절차 인포그래픽" class="aligncenter size-full" /></p>' if sub_img_url else ""
    
    content_html = f"""
<p>학교는 우리 아이들이 안전하게 배우고 성장해야 할 배움의 터전이지만, 불행히도 학교폭력이라는 예상치 못한 위기 상황에 직면하는 가정들이 여전히 많습니다. 내 아이가 학교폭력의 피해자가 되었을 때, 부모로서 감정적으로 대처하기보다는 <strong>학교폭력 대처법</strong>을 명확히 인지하고 이성적이면서도 신속한 법적 절차를 밟아 나가는 것이 무엇보다 중요합니다.</p>

<p>오늘 이 글을 끝까지 확인하시면 학폭 발생 초기 단계의 증거 확보 요령부터 학교폭력대책심의위원회(학폭위) 대응, 그리고 민·형사상 법적 구제 절차까지 한 번에 완벽하게 이해하실 수 있습니다. 신속하고 철저한 대비만이 소중한 우리 아이의 미래와 심리적 회복을 지키는 유일한 열쇠입니다.</p>

<hr />

<h2>1. 학교폭력 발생 초기 대응 및 핵심 증거 확보 방법</h2>

<p>학교폭력 사건이 인지되었을 때 가장 먼저 해야 할 일은 감정을 추스르고 <strong>객관적인 사실과 물적 증거를 수집하는 것</strong>입니다. 법적인 다툼이나 학폭위 심의 단계에서 피해 사실을 입증할 수 있는 구체적인 자료가 부족하면 정당한 권리를 보장받기 어렵습니다.</p>

<ul>
  <li><strong>카카오톡, SNS, 문자메시지 캡처</strong>: 사이버 폭력의 경우, 상대방이 대화방을 나가거나 메시지를 삭제하기 전에 반드시 날짜와 대화 상대방이 명확히 드러나도록 캡처해두어야 합니다. 화면 녹화 기능을 활용하면 조작 의혹을 원천 차단할 수 있습니다.</li>
  <li><strong>상해 진단서 및 심리상담 기록 확보</strong>: 신체적 폭력이나 가혹 행위가 있었다면 즉시 응급실이나 병원을 찾아 치료를 받고 일반 진단서가 아닌 <strong>'학교폭력 피해용' 상해 진단서</strong>를 발급받으십시오. 또한, 극심한 정신적 고통을 겪고 있다면 전문 소아청소년정신과 상담 및 심리 진단 기록을 남기는 것이 중요합니다.</li>
  <li><strong>주변 목격자의 일관된 진술 확보</strong>: 주변 동급생 친구들이나 현장을 목격한 교사 등의 증언은 학폭위에서 가장 공신력 있는 증거로 활용됩니다. 필요하다면 목격 학생의 부모 동의 하에 사실 확인서를 작성해 두는 것이 이롭습니다.</li>
</ul>

<hr />

<h2>2. 학교폭력대책심의위원회(학폭위) 진행 과정과 방어 전략</h2>

<p>초기 신고가 완료되면 학교 자체 해결 요건(피해 학생 및 보호자의 서면 동의, 2주 미만의 신체·정신적 치료 등)을 충족하지 않는 한 교육지원청 산하 <strong>학교폭력대책심의위원회(학폭위)</strong>로 사건이 이송됩니다.</p>

<p>{sub_img_html}</p>

<p>학폭위 단계에서 보호자는 반드시 <strong>의견서</strong>를 사전 제출해야 합니다. 육하원칙에 입각하여 피해 사실을 상세히 적고 증거 자료를 순서대로 넘버링하여 첨부해야 심의위원들이 한눈에 쟁점을 파악할 수 있습니다. 심의 당일 진술 시에는 감정에 호소하기보다 가해 학생의 보복 가능성과 피해 학생의 보호 필요성을 논리적으로 설명하는 자세가 요구됩니다. 가해 학생에게는 서면사과(1호)부터 퇴학 처분(9호)까지 내려지며, 이 처분은 생활기록부에 기재되어 상급 학교 진학 시 중요한 영향을 미칩니다.</p>

<hr />

<h2>3. 가해자 측에 대한 강력한 법적 대응 및 민·형사상 절차</h2>

<p>교육청의 학폭위 행정 처분과 별개로, 사안의 중대성에 따라 가해 학생과 그 보호자를 대상으로 법적 처벌 및 금전적 배상을 요구할 수 있습니다.</p>

<h3>① 형사 고소 절차 (형사 책임)</h3>
<p>가해 학생이 만 14세 이상인 경우 형사 처벌 대상이 되므로 경찰서에 고소장을 접수하여 폭행, 협박, 명예훼손 등의 혐의로 직접 고소할 수 있습니다. 만약 만 10세 이상 만 14세 미만의 <strong>촉법소년</strong>에 해당한다면 형사 처벌 대신 가정법원 소년부에 송치되어 보호처분을 받게 됩니다. 어떠한 경우라도 법적 조치를 취한다는 명확한 태도를 보이는 것이 가해자 측의 진정성 있는 반성을 이끌어내는 데 효과적입니다.</p>

<h3>② 민사상 손해배상 청구 (치료비 및 위자료)</h3>
<p>학교폭력으로 인해 발생한 병원 치료비, 약값, 심리치료 비용 및 정신적 피해에 따른 위자료는 가해 학생과 연대 책임이 있는 <strong>가해 학생의 부모(친권자)를 상대로 민사 소송을 제기</strong>하여 청구할 수 있습니다. 부모의 감독 의무 위반 책임을 묻는 절차로써, 피해 가정이 겪은 경제적·정신적 고통에 대한 실질적인 보상을 요구할 수 있는 강력한 수단입니다.</p>

<hr />

<h2>4. 학교폭력 관련 정부 및 외부 신뢰 자료 추천</h2>

<p>사건 진행 중에 혼란스러운 마음이 든다면 공인된 외부 기관의 법적 가이드를 참고하시는 것을 적극 권장합니다:</p>

<ul>
  <li>🏛️ <strong><a href="https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=230869" target="_blank" rel="noopener noreferrer">국가법령정보센터 - 학교폭력예방 및 대책에 관한 법률</a></strong> — 대한민국 공식 법령 제공 페이지에서 학교폭력 정의, 학폭위 구성 요건 및 처분 기준에 대한 법적 원문을 투명하게 확인할 수 있습니다.</li>
  <li>📞 <strong><a href="http://www.wee.go.kr" target="_blank" rel="noopener noreferrer">교육부 Wee 프로젝트 공식 웹 사이트</a></strong> — 교육부에서 주관하는 학생 공감 상담 서비스로, 피해 학생을 위한 1대1 심리 상담 지원망 및 긴급 구조 대처 매뉴얼을 찾아보실 수 있습니다.</li>
</ul>

<blockquote>
<p>💡 <strong>학교폭력 대처법</strong>의 본질은 부모와 아이가 고립되지 않고, 법이 허용하는 공적 제도와 구제 수단을 100% 활용하는 데 있습니다. 부모님의 단호하고 올바른 대처가 아이에게 가장 든든한 버팀목이 됩니다.</p>
</blockquote>

<p>지금 어려운 상황을 겪고 있다면, 이 글과 함께 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 읽어보세요. 아이가 다시 일상으로 돌아와 학업에 집중할 수 있는 심리적 루틴 형성에 도움이 될 것입니다.</p>

<p>
<strong>#학교폭력대처법</strong> <strong>#학교폭력예방</strong> <strong>#학폭위대응</strong> <strong>#학교폭력고소</strong> <strong>#촉법소년처벌</strong> <strong>#Wee클래스</strong> <strong>#학폭증거확보</strong> <strong>#민사손해배상</strong>
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
    
    # Rank Math Focus Keyword 및 Meta Description API 전송은 일반 포스팅 API의 meta 필드에 삽입
    # Rank Math는 커스텀 메타 필드로 '_rank_math_focus_keyword'와 '_rank_math_description'를 사용함
    post_data["meta"] = {
        "_rank_math_focus_keyword": "학교폭력 대처법",
        "_rank_math_description": "소중한 내 아이를 지키는 학교폭력 대처법 총정리. 학폭 발생 초기 증거 확보 요령부터 교육청 학폭위 대응, 민형사상 법적 처벌 및 손해배상 청구 절차까지 완벽 가이드."
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
