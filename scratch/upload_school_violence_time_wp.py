# -*- coding: utf-8 -*-
"""
워드프레스 자동 포스팅 스크립트 - 학폭 피해자 손해배상 청구 소멸시효 (Rank Math SEO 90점 이상 충족)
"""

import requests
import json
import os
import mimetypes

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

brain_dir = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b"
featured_img_path = f"{brain_dir}/school_violence_time_wp_cover_1783085994870.jpg"
sub_img_path = f"{brain_dir}/school_violence_time_sub_image_1783086009409.jpg"

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
        "학폭 피해자 손해배상 청구 골든타임 썸네일", 
        "학폭 피해자의 손해배상 청구 소멸시효 3년 골든타임 가이드 대표 이미지", 
        "학폭 피해자가 민사상 손해배상을 청구할 때 꼭 알아야 할 3년 소멸시효 정보"
    )
    featured_media_id = feat_res[0] if feat_res else 0
    
    print("\nUploading sub image...")
    sub_res = upload_media(
        sub_img_path,
        "학폭 피해자 소멸시효 3년 인포그래픽",
        "",
        "학폭 피해 민사소송의 소멸시효 3년 기준 설명 이미지"
    )
    sub_img_url = sub_res[1] if sub_res else ""

    # 카테고리 체크 및 생성 (기존 생성 검증 포함)
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
    tags = ["학폭피해자", "손해배상청구", "소멸시효3년", "학폭민사소송"]
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
    title = "학폭 피해자: 3년 손해배상 골든타임" # 공백포함 22자, 숫자(3) 포함, 키워드 맨앞

    # 본문 구성 (Rank Math SEO 90점 이상 충족 - 글자 수 1000자 이상, 굵게 강조, 이미지 Alt, 내/외부 링크 포함)
    sub_img_html = f'<p style="text-align: center;"><img src="{sub_img_url}" alt="학폭 피해자 소멸시효 3년 인포그래픽" class="aligncenter size-full" /></p>' if sub_img_url else ""
    
    content_html = f"""
<p>학교폭력 피해로 인해 신체적, 정신적 상처를 입은 경우, 가해자 측을 상대로 민사상 불법행위에 기한 손해배상을 청구하여 치료비와 위자료를 받아낼 수 있습니다. 하지만 많은 <strong>학폭 피해자</strong>와 보호자분들이 소송 제기 시점을 명확히 인지하지 못해 권리를 잃어버리는 안타까운 상황이 발생합니다. 법적으로 배상을 청구할 수 있는 기간에는 엄격한 제한이 존재하기 때문입니다.</p>

<p>오늘 이 글을 끝까지 확인하시면 학폭 피해로 인한 손해배상 청구 시 반드시 지켜야 할 <strong>3년 소멸시효</strong>의 기준점과 법적 입증을 위한 골든타임 전략을 완벽히 이해하실 수 있습니다. 소멸시효 기간을 놓치게 되면 법적 권리가 완전히 소멸되므로, 초기부터 철저하게 준비해야 합니다.</p>

<hr />

<h2>1. 민사상 손해배상 청구권의 소멸시효와 '3년'의 기준점</h2>

<p>민법 제766조에 따르면 불법행위로 인한 손해배상의 청구권은 <strong>피해자나 그 법정대리인이 그 손해 및 가해자를 안 날로부터 3년</strong> 동안 행사하지 않으면 시효로 인하여 소멸합니다. 또한 불법행위를 한 날로부터 10년을 경과한 때에도 소멸시효가 완성됩니다.</p>

<ul>
  <li><strong>'손해 및 가해자를 안 날'의 해석</strong>: 단순히 폭행을 당한 날이 아니라, 치료가 필요하다는 진단을 받거나 가해 학생이 누구인지 명확히 특정되어 인지한 시점부터 3년의 카운트다운이 시작됩니다. 후유증이 발생한 경우에는 그 후유증으로 인한 손해를 구체적으로 인지한 때를 기준점으로 삼습니다.</li>
  <li><strong>성인이 된 이후의 청구 가능 여부</strong>: 피해 당시 미성년자였다면 법정대리인(부모)이 인지한 시점이 기준이 되므로 고등학교 시절의 폭력 사건을 성인이 된 이후에 청구하려고 할 때 시효가 완성되어 소송이 기각될 위험이 큽니다. 따라서 미성년자 시기라 하더라도 즉시 법적 조치를 개시하는 것이 유리합니다.</li>
</ul>

<hr />

<h2>2. 소멸시효를 중단시키고 골든타임을 확보하는 법적 방법</h2>

<p>소멸시효 완성 임박 시, 기간의 경과를 강제로 멈추고 권리를 보존할 수 있는 법적 안전장치들이 존재합니다.</p>

<p>{sub_img_html}</p>

<p>소멸시효를 중단하기 위해 가장 흔히 쓰이는 방법은 <strong>법원에 소송을 제기(재판상 청구)</strong>하는 것입니다. 또한 가해자의 재산(가해 학생 부모 명의의 부동산, 예금 등)을 찾아 <strong>압류, 가압류 또는 가처분 신청</strong>을 완료하면 시효가 즉시 중단됩니다. 시효 완성이 며칠 남지 않은 긴급한 상황이라면, 우선 가해자 측에 내용증명 우편으로 배상을 독촉하는 <strong>'최고'</strong>를 보냄으로써 최대 6개월의 유예기간을 임시로 벌어두고 그 기간 내에 정식 소송을 신속히 준비하는 전략이 유효합니다.</p>

<hr />

<h2>3. 위자료와 치료비 청구를 극대화하기 위한 증거 입증 전략</h2>

<p>법정에서 승소하고 정당한 배상액을 인정받기 위해서는 손해의 인과관계와 피해 규모를 입증할 확실한 증거들이 명확하게 구비되어야 합니다.</p>

<h3>① 기왕 치료비 및 향후 치료비 청구</h3>
<p>피해 발생 직후부터 소송 시점까지 지출한 모든 병원비, 수술비, 약제비 영수증을 꼼꼼하게 모아두어야 합니다. 또한 향후 지속적인 성형 수술이나 장기간의 정신과 통원 치료가 예상되는 경우, 종합병원 전문의로부터 <strong>'향후 치료비 추정서'</strong>를 공식 발급받아 재판부에 제출해야 장래 치료 비용까지 일괄 배상받을 수 있습니다.</p>

<h3>② 정신적 피해에 대한 위자료 입증</h3>
<p>위자료 액수는 학폭의 지속 기간, 괴롭힘의 잔혹성, 피해 학생이 겪은 학업 중단 등의 정신적 고통 강도에 따라 결정됩니다. Wee클래스 전문 상담 일지나 정신과 상담 기록, 가해자의 악의적인 사이버 괴롭힘이 기록된 메신저 캡처 화면을 바탕으로 피해의 중대성을 강하게 어필하는 것이 고액의 위자료 판결을 받아내는 입증 전략의 핵심입니다.</p>

<hr />

<h2>4. 학폭 손해배상 관련 정부 공식 법령 및 상담 안내</h2>

<p>민사 소송 절차와 피해 구제 제도를 깊이 있게 분석하기 위해 공인된 외부 기관 자료를 적극 참고해 보십시오:</p>

<ul>
  <li>🏛️ <strong><a href="https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=232490" target="_blank" rel="noopener noreferrer">국가법령정보센터 - 민법 제766조 (손해배상청구권의 소멸시효)</a></strong> — 불법행위에 따른 소멸시효 3년 및 10년 규정의 법적 해석과 조문 원문을 공식 열람할 수 있습니다.</li>
  <li>📞 <strong><a href="http://www.wee.go.kr" target="_blank" rel="noopener noreferrer">교육부 Wee 프로젝트 공식 웹 사이트</a></strong> — 학폭 피해 학생을 위한 1대1 무료 상담 창구 및 정부 연계 전문 법률 대리인 매칭 가이드를 제공합니다.</li>
</ul>

<blockquote>
<p>💡 <strong>학폭 피해자</strong>가 겪은 고통은 법적 조치를 미룬다고 해결되지 않습니다. 법이 보장하는 3년이라는 소중한 시간 동안 신속히 권리를 주장하여 실질적인 회복을 꾀하시기 바랍니다.</p>
</blockquote>

<p>지금 법적 조치를 고민하고 있다면, 이 글과 함께 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 읽어보세요. 아이가 심리적 두려움을 지우고 장기적인 미래 학업에 다시 집중할 수 있는 일상 루틴을 찾는 법을 안내합니다.</p>

<p>
<strong>#학폭피해자</strong> <strong>#소멸시효3년</strong> <strong>#손해배상청구</strong> <strong>#학폭위처분</strong> <strong>#학폭민사소송</strong> <strong>#민법제766조</strong> <strong>#향후치료비</strong> <strong>#경찰서고소</strong>
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
        "_rank_math_description": "소중한 배상 청구 권리를 지키는 학폭 피해자 손해배상 소멸시효 가이드. 3년 소멸시효 산정 기준점, 시효 중단 전략, 위자료 및 향후 치료비 극대화 입증 방법 완벽 정리."
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
