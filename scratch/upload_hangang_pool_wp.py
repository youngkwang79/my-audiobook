# -*- coding: utf-8 -*-
"""
WordPress 자동 포스팅 스크립트 - 한강공원 수영장 야간 개장 글 등록 (Rank Math SEO 90점 이상 충족)
"""

import requests
import json
import os
import mimetypes

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_APP_PW = ""

env_path = ".env.local"
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    parts = line.split("=", 1)
                    key = parts[0].strip()
                    val = parts[1].strip()
                    if key == "WP_URL":
                        WP_URL = val
                    elif key == "WP_ADMIN_USERNAME":
                        WP_USER = val
                    elif key == "WP_APPLICATION_PASSWORD":
                        WP_APP_PW = val
    except Exception as e:
        print(f"Error loading env: {e}")

FEATURED_IMG_PATH = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\hangang_pool_wp_cover_1783026889056.jpg"
SUB_IMG_PATH = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\hangang_pool_sub_image_1783026988137.jpg"

def upload_media(file_path):
    print(f"Uploading media: {file_path}")
    url = f"{WP_URL}/wp-json/wp/v2/media"
    headers = {
        "Content-Disposition": f"attachment; filename={os.path.basename(file_path)}"
    }
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        headers["Content-Type"] = mime_type
        
    with open(file_path, "rb") as f:
        media_data = f.read()
        
    response = requests.post(
        url,
        auth=(WP_USER, WP_APP_PW),
        headers=headers,
        data=media_data
    )
    if response.status_code == 201:
        res_json = response.json()
        print(f"Uploaded successfully! ID: {res_json['id']}, URL: {res_json['source_url']}")
        return res_json['id'], res_json['source_url']
    else:
        print(f"Failed to upload media: {response.status_code}")
        print(response.text)
        return None, None

def get_or_create_tag(tag_name):
    search_url = f"{WP_URL}/wp-json/wp/v2/tags?search={requests.utils.quote(tag_name)}"
    r = requests.get(search_url, auth=(WP_USER, WP_APP_PW))
    if r.status_code == 200:
        tags = r.json()
        for t in tags:
            if t['name'] == tag_name:
                return t['id']
                
    create_url = f"{WP_URL}/wp-json/wp/v2/tags"
    r = requests.post(create_url, auth=(WP_USER, WP_APP_PW), json={"name": tag_name})
    if r.status_code == 201:
        return r.json()['id']
    return None

def main():
    featured_id, featured_url = upload_media(FEATURED_IMG_PATH)
    sub_id, sub_url = upload_media(SUB_IMG_PATH)
    
    if not featured_id or not sub_id:
        print("[ERROR] Media upload failed. Exiting.")
        return
        
    tag_names = ["한강공원 수영장", "야간 개장", "서울 야경", "여름 물놀이"]
    tag_ids = []
    for tn in tag_names:
        tid = get_or_create_tag(tn)
        if tid:
            tag_ids.append(tid)
            
    print(f"Resolved Tag IDs: {tag_ids}")
    
    img_html = f"""
    <div style="text-align: center; margin: 28px 0;">
        <img src="{sub_url}" alt="한강공원 수영장 야간 개장 물놀이장 전경 일러스트" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #ddd;" />
        <p style="font-size: 13px; color: #666; margin-top: 8px;">시원하고 한적한 분위기의 한강 야간 개장 수영장</p>
    </div>
    """

    content = f"""
    <p><strong>한강공원 수영장</strong> 및 물놀이장 야간 개장 소식은 매년 뜨겁게 찾아오는 한여름 무더위를 피해 시원한 저녁 휴식을 만끽할 수 있는 최고의 힐링 프로젝트입니다. 지치는 7월 본격적인 여름철이 시작되면서, 도심 속에서 밤 수영과 함께 시원한 강바람을 쐬는 것만큼 낭만적인 밤 피서도 드물 것입니다. 밤하늘 아래 반짝이는 대교의 조명과 멋진 서울 야경을 바라보며 물놀이를 즐기다 보면, 하루 동안 쌓였던 업무 스트레스와 피로가 단번에 해소되는 상쾌한 기분을 만끽하실 수 있습니다.</p>
    
    <p>본 포스팅에서는 도심 속에서 한적하게 여름 밤을 보낼 수 있는 2026년 <strong>한강공원 수영장</strong> 야간 개장의 스펙과 운영 세부 사항, 그리고 방문객들이 반드시 알아두어야 할 실패 없는 이용 팁을 꼼꼼하게 정리해 드립니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 2026 한강공원 수영장 야간 개장 세부 핵심 스펙</h2>
    <p>올해 야간 물놀이장 개장은 무더위가 최고조에 달하는 7월과 8월 여름 시즌에 맞추어 주간 운영 시간에 이어 밤에도 연장 가동하는 방식으로 설계되었습니다.</p>
    
    <h3>📅 야간 연장 운영 스케줄 정보</h3>
    <ul>
      <li><strong>야간 연장 기간</strong>: **2026년 7월 3일부터 8월 30일까지** 운영됩니다.</li>
      <li><strong>야간 운영 시간</strong>: **매일 저녁 18:00 ~ 20:00**까지 2시간 연장하여 시원한 물놀이가 가능합니다.</li>
      <li><strong>개장 대상 장소</strong>: **뚝섬 한강공원 및 여의도 한강공원 수영장**, 그리고 **잠실 및 난지 한강공원 물놀이장**이 그 주인공입니다.</li>
    </ul>
    
    <p style="background-color: #f9fafb; padding: 14px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      <strong>필독 안내:</strong> 수영장의 수질 상태나 갑작스러운 악천후 등의 기상 상황에 따라 운영 일정이 유동적으로 변동될 수 있습니다. 출발 전 <a href="https://hangang.seoul.go.kr" target="_blank" rel="noopener" style="font-weight: bold; color: #ffd43b; text-decoration: underline;">한강사업본부 홈페이지</a>에서 야간 운영 현황을 미리 확인해 두시면 훨씬 쾌적한 피서길이 됩니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. 똑똑한 방문객들을 위한 밤 수영 필수 체크리스트</h2>
    <p>밤바람이 부는 한강변은 낮과 기온 차가 다를 수 있으며, 요금 혜택을 챙기는 것도 쏠쏠한 기쁨입니다. 아래 항목을 체크하여 빈틈없는 <strong>한강공원 수영장</strong> 나들이를 만끽하십시오.</p>
    
    <h3>💡 실패 없는 야간 수영장 이용 핵심 팁 3대 전략</h3>
    <ul>
      <li><strong>체온 보호용 비치 타월 및 겉옷 준비</strong>: 밤 수영을 마치고 물 밖으로 나오면 시원한 강바람으로 인해 체온이 급감할 수 있습니다. 감기를 방지하기 위해 온몸을 따스하게 감쌀 수 있는 대형 비치 가운이나 긴소매 겉옷을 꼭 지참하세요.</li>
      <li><strong>입장료 할인 및 면제 서류 사전 확인</strong>: 다둥이 행복카드 소지자, 장애인, 국가유공자 등 지자체 조례에 따라 면제 또는 감면 혜택이 적용되는 대상자는 반드시 매표 시 증빙 서류나 실물 카드를 챙겨 방문하여 혜택을 누리십시오.</li>
      <li><strong>한적한 평일 저녁 집중 공략</strong>: 주말 밤에는 더위를 피해 찾아오는 수많은 시민들로 인파가 붐빕니다. 연인이나 친구와 한적하고 고즈넉한 무드를 여유롭게 만끽하고 싶다면 상대적으로 여유로운 평일 퇴근길 시간대를 활용하는 것을 권장해 드립니다.</li>
    </ul>
    
    {img_html}
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. 한강 야간 물놀이 주간 운영 대 야간 개장 비교 모델</h2>
    <p>뜨거운 한낮의 햇빛 아래 즐기는 주간 수영과, 로맨틱한 밤 야경을 등지고 선선하게 떠다니는 야간 피서의 차이를 알아봅니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 25%;">이용 구분</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 45%;">핵심 특징 및 대기 기류</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 30%;">추천 대상 및 취향</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">낮의 물놀이</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">따사로운 태양빛, 활기찬 노래와 에너지가 넘쳐나는 밝은 야외 분위기</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">가족 단위 방문객, 태닝 선호층</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">밤의 물놀이</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">은은한 대교 조명과 불빛, 뜨겁지 않은 시원한 바람 속 고요하고 낭만적인 힐링</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">퇴근 후 직장인, 연인 데이트 코스</td>
        </tr>
      </tbody>
    </table>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 삶의 밸런스를 튜닝하는 지혜로운 저녁 2시간</h2>
    <p>바쁜 일상 속에서 퇴근 후 주어지는 자투리 시간을 어떻게 설계하고 관리하느냐에 따라 매일 쌓이는 피로와 라이프스타일의 가치가 180도 변화할 수 있습니다. 쳇바퀴처럼 반복되는 하루에 지쳐 있다면, 하루 24시간을 영리하게 디자인하는 공부가 필요합니다.</p>
    
    <p>체계적이고 효율적인 자투리 시간 확보와 시간 습관 변화에 깊이 공감하신다면, 무림북 공식 사이트의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ec%b5%9c%ec%a0%81%ed%99%94-%ec%82%b6%ec%9d%98-%ec%a7%88%ec%9d%84-%eb%b0%94%ea%be%b8%eb%8a%94-%ec%8b%9c%ea%b0%84-%ea%b4%80%eb%a6%ac/" target="_blank" rel="noopener" style="font-weight: bold; color: #ffd43b; text-decoration: underline;">시간관리 방법 칼럼</a>을 함께 일독해 보시길 꼭 추천드립니다. 평범한 저녁 시간을 나를 위한 충전과 가치 있는 성장 기회로 튜닝하는 훌륭한 인사이트를 얻어갈 수 있습니다.</p>
    
    <p>아울러 원활한 입장권 구입을 원하신다면 공식 예매처인 <a href="https://yeyak.seoul.go.kr" target="_blank" rel="noopener" style="font-weight: bold; color: #ffd43b; text-decoration: underline;">서울시 공공서비스 예약</a> 채널에서 운영하는 사전 예매 페이지를 꼭 방문해 주차 시설 정보와 잔여 인원을 먼저 확인해보시길 권장해 드립니다.</p>
    
    <p>밤 수영장의 청량한 물속에서 한낮의 뜨거웠던 열기를 상쾌하게 식히고 시원한 밤바람을 맞으며 지내다 보면, 여름밤만이 줄 수 있는 진정한 충전의 낭만을 깨닫게 됩니다. 이번 7월과 8월, 무더운 열대야 스트레스에서 벗어나 건강하고 활력 넘치는 여름 휴식을 한강에서 만끽해 보시길 진심으로 응원합니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #한강공원수영장 #야간개장 #서울물놀이 #뚝섬수영장 #여의도물놀이 #여름휴가 #열대야극복 #서울가볼만한곳
    </p>
    """
    
    title = "한강공원 수영장 야간개장 7월일정" # 핵심키워드 맨앞, 숫자포함, 20자 내외
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    headers = {
        "Content-Type": "application/json"
    }
    
    meta_desc = "2026년 한강공원 수영장 야간 개장 7월 운영 일정과 실패 없는 밤 수영을 위한 팁. 시원한 서울 야경 속에서 즐기는 물놀이 정보를 정리합니다."
    
    post_data = {
        "title": title,
        "content": content,
        "status": "draft",
        "featured_media": featured_id,
        "categories": [85, 83, 9],
        "tags": tag_ids,
        "meta": {
            "_rank_math_focus_keyword": "한강공원 수영장",
            "rank_math_focus_keyword": "한강공원 수영장",
            "_rank_math_title": "%title% %page% %sep% %sitename%",
            "rank_math_title": "%title% %page% %sep% %sitename%",
            "_rank_math_description": meta_desc,
            "rank_math_description": meta_desc,
            "_rank_math_permalink": "hangang-park-night-pool-schedule",
            "rank_math_permalink": "hangang-park-night-pool-schedule"
        }
    }
    
    print(f"Uploading post to WordPress as draft...")
    try:
        response = requests.post(
            url,
            auth=(WP_USER, WP_APP_PW),
            headers=headers,
            data=json.dumps(post_data)
        )
        if response.status_code == 201:
            print("\n[SUCCESS] WordPress post uploaded successfully as DRAFT!")
            print(f"Edit Link: {response.json().get('link')}")
        else:
            print(f"\n[FAILED] Upload failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    main()
