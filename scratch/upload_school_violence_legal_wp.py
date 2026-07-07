# -*- coding: utf-8 -*-
"""
워드프레스 자동 포스팅 스크립트 - 학폭 가해자 형사고소 및 민사 손해배상 (Rank Math SEO 90점 이상 충족)
"""

import requests
import json
import os
import mimetypes

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
featured_img_path = f"{brain_dir}/school_violence_legal_wp_cover_1783107139129.jpg"
sub_img_path = f"{brain_dir}/school_violence_legal_sub_image_1783107150657.jpg"

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
        "학폭 피해자 형사고소 및 민사 손해배상 썸네일", 
        "학폭 피해자의 가해자 형사고소 및 민사 손해배상 가이드 대표 이미지", 
        "학교폭력 가해자에 대한 형사고소 절차와 민사상 손해배상 청구 전략 안내"
    )
    featured_media_id = feat_res[0] if feat_res else 0
    
    print("\nUploading sub image...")
    sub_res = upload_media(
        sub_img_path,
        "학폭 피해자 형사고소 민사소송 인포그래픽",
        "",
        "학교폭력 가해자 형사고소 및 민사 손해배상 절차 설명 이미지"
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
    tags = ["학폭피해자", "가해자고소", "손해배상청구", "민형사소송"]
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
    title = "학폭 피해자: 2대 민형사 소송 전략" # 공백포함 22자, 숫자(2) 포함, 키워드 맨앞

    # 본문 구성 (Rank Math SEO 90점 이상 충족 - 글자 수 1000자 이상, 굵게 강조, 이미지 Alt, 내/외부 링크 포함)
    sub_img_html = f'<p style="text-align: center;"><img src="{sub_img_url}" alt="학폭 피해자 형사고소 민사소송 인포그래픽" class="aligncenter size-full" /></p>' if sub_img_url else ""
    
    content_html = f"""
<p>학교폭력 피해가 확인되었을 때 많은 <strong>학폭 피해자</strong> 가족들은 가해 학생의 뻔뻔한 태도와 미온적인 학교의 대처에 큰 고통을 겪게 됩니다. 이때 단순히 교육청의 학폭위 처분에만 의존하기보다는 적극적으로 형사고소와 민사 손해배상이라는 사법 절차를 밟아 나가는 것이 실질적인 권리 구제의 핵심입니다.</p>

<p>오늘 이 글을 끝까지 확인하시면 가해자 형사 처벌을 위한 고소 절차부터 미성년자 부모를 타겟으로 한 강력한 민사상 치료비 및 위자료 청구 전략까지 일목요연하게 이해하실 수 있습니다. 법적인 무기를 갖추는 일은 소중한 자녀의 심리적 안정과 가해자 측의 제대로 된 사과를 이끌어내는 유일한 방법입니다.</p>

<hr />

<h2>1. 가해자 형사고소 및 처벌 기준 (만 14세 이상과 촉법소년)</h2>

<p>학교폭력은 단순히 학칙 위반이 아니라 폭행, 상해, 협박, 공갈, 강제추행, 명예훼손에 해당하는 엄연한 <strong>형사 범죄</strong>입니다. 가해 학생의 연령에 따라 적용되는 법적 책임이 달라집니다.</p>

<ul>
  <li><strong>만 14세 이상 (형사 책임 능력자)</strong>: 일반 형법이 그대로 적용되므로 경찰서에 고소장을 접수하여 정식 형사 사건으로 수사 및 처벌을 요구할 수 있습니다. 죄질이 무겁고 보복 우려가 있는 경우 전과 기록이 남는 재판 및 소년교도소 수감까지 이어질 수 있습니다.</li>
  <li><strong>만 10세 이상 ~ 만 14세 미만 (촉법소년)</strong>: 형사 처벌 대상은 아니지만 소년법에 의거하여 소년부로 이송되며, 1호(보호자 감호)부터 10호(장기 소년원 송치)까지의 강력한 소년보호처분을 받게 됩니다. 전과는 남지 않으나 소년원 송치 기록 등은 수사기관 내부 자료로 영구 보존됩니다.</li>
</ul>

<hr />

<h2>2. 가해 학생 부모 대상 민사상 손해배상 청구 전략</h2>

<p>가해 학생은 미성년자이므로 경제적 능력이 없습니다. 따라서 민사 소송을 진행할 때는 민법 제750조(불법행위책임)와 제755조(감독의무자의 책임)를 근거로 <strong>가해 학생의 부모를 공동 피고로 지정하여 연대 책임</strong>을 물어야 합니다.</p>

<p>{sub_img_html}</p>

<p>민사 소송을 통해서는 가해자 측에게 치료비, 약값, 향후 치료비(흉터 제거 수술비 및 정신과 정기 진료 비용 등)는 물론, 피해 학생 및 가족들이 겪은 막대한 정신적 고통에 대한 <strong>위자료</strong>를 청구할 수 있습니다. 소송 제기 사실만으로도 가해자 부모에게 강력한 심리적 압박이 가해지며, 이는 결국 진정성 있는 합의나 진지한 사과로 이어지는 촉매 역할을 합니다.</p>

<hr />

<h2>3. 합의 성사 요령과 합의서 작성 시 필수 주의 사항</h2>

<p>형사고소나 민사소송 과정에서 가해자 측이 처벌 수위를 낮추기 위해 합의를 요구해 오는 경우가 많습니다. 이때 성급히 합의에 응했다가 후회하는 일이 없어야 합니다.</p>

<h3>① 합의 금액 산정 기준</h3>
<p>합의금은 단순 기왕 치료비뿐만 아니라 향후 치료가 필요한 예측 진료비, 상담비, 그리고 부모가 자녀 간병을 위해 휴업하면서 발생한 휴업 손해와 위자료를 모두 종합하여 다소 넉넉한 수준으로 책정해야 합니다. 합의가 성사되면 가해자는 형사 처벌 및 소년원 송치 수위가 크게 낮아지므로 신중하게 판단해야 합니다.</p>

<h3>② 합의서 문구 작성 시 독소 조항 배제</h3>
<p>합의서 양식에 '향후 어떠한 민·형사상 이의도 제기하지 않는다'는 포괄적인 문구를 넣을 때 매우 주의해야 합니다. 반드시 <strong>'합의 시점 이후 발생하는 예측 불가능한 후유증에 대한 치료비 청구 권리는 배제한다'</strong>는 예외 조항을 기입하여 차후 발생할지 모르는 추가 치료 권리를 확실히 보장받아 두어야 합니다.</p>

<hr />

<h2>4. 학폭 민형사 소송 관련 공식 국가 법률 가이드 추천</h2>

<p>학교폭력 구제 절차와 소년법 조문을 보다 상세하게 분석하려면 공인된 외부 기관 사이트를 참고해 보십시오:</p>

<ul>
  <li>🏛️ <strong><a href="https://www.law.go.kr/법령/소년법" target="_blank" rel="noopener noreferrer">국가법령정보센터 - 소년법</a></strong> — 대한민국 공식 법령 제공 페이지에서 촉법소년 대상 보호처분의 세부 기준(1호~10호)과 소년재판 절차를 상세히 열람할 수 있습니다.</li>
  <li>📞 <strong><a href="http://www.wee.go.kr" target="_blank" rel="noopener noreferrer">교육부 Wee 프로젝트 공식 웹 사이트</a></strong> — 피해 학생을 위한 1대1 법률 상담망 연계 및 심리 치유 아카데미 안내를 찾아보실 수 있습니다.</li>
</ul>

<blockquote>
<p>💡 <strong>학폭 피해자</strong>의 눈물을 닦아주는 것은 말뿐인 위로가 아니라, 단호하고 강력한 법적 권리 행사입니다. 전문가의 조력을 받아 아이에게 든든한 울타리를 선물해 주세요.</p>
</blockquote>

<p>지금 가해자 고소를 고민하고 있다면, 이 글과 함께 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 함께 읽어보세요. 아이가 상처를 극복하고 건강한 학업 루틴을 회복할 수 있는 실천적 솔루션을 전합니다.</p>

<p>
<strong>#학폭피해자</strong> <strong>#가해자형사고소</strong> <strong>#손해배상청구</strong> <strong>#학폭민사소송</strong> <strong>#촉법소년처벌</strong> <strong>#소년원송치</strong> <strong>#위자료청구</strong> <strong>#Wee클래스</strong>
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
        "_rank_math_focus_keyword": "학폭 피해자",
        "_rank_math_description": "가해자를 응징하는 학폭 피해자 형사고소 및 민사 손해배상 소송 가이드. 만 14세 이상 및 촉법소년 처벌 요건, 가해 부모 연대책임 위자료 청구, 합의서 작성 팁 총정리."
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
