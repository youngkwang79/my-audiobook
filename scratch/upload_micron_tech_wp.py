# -*- coding: utf-8 -*-
"""
WordPress 자동 포스팅 스크립트 - 마이크론 테크놀로지 주가 전망 (Rank Math SEO 90점 이상 충족)
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

FEATURED_IMG_PATH = r"C:\Users\owner\.gemini\antigravity\brain\820f16a8-6613-4149-ae20-d9f890d29a2b\micron_tech_wp_cover_1783049112390.jpg"

def upload_media(file_path):
    print(f"Uploading media: {file_path}")
    url = f"{WP_URL}/wp-json/wp/v2/media"
    mime_type, _ = mimetypes.guess_type(file_path)
    headers = {
        "Content-Disposition": f"attachment; filename={os.path.basename(file_path)}"
    }
    if mime_type:
        headers["Content-Type"] = mime_type
    else:
        headers["Content-Type"] = "image/jpeg"
        
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
    
    if not featured_id:
        print("[ERROR] Media upload failed. Exiting.")
        return
        
    tag_names = ["마이크론 테크놀로지", "MU주가", "HBM4", "반도체 주식"]
    tag_ids = []
    for tn in tag_names:
        tid = get_or_create_tag(tn)
        if tid:
            tag_ids.append(tid)
            
    print(f"Resolved Tag IDs: {tag_ids}")
    
    content = f"""
    <p>인공지능(AI) 반도체 시장의 폭발적인 성장 속에서 메모리 반도체 기업들의 위상이 과거와 몰라보게 달라졌습니다. **이번 <strong>마이크론 테크놀로지</strong>(MU) 주가 전망은** 단순한 경기 순환형 기업을 넘어 글로벌 AI 인프라의 핵심 공급망으로서의 재평가 과정을 담고 있습니다.</p>
    
    <p>많은 투자자가 가장 궁금해하시는 2026년 하반기 주가 흐름과 HBM(고대역폭 메모리) 공급 계약 현황, 그리고 월가 애널리스트들의 목표 주가를 놓치지 않도록 일목요연하게 정리해 드립니다. 오늘 이 글을 끝까지 확인하시면 변동성이 큰 반도체 시장에서 마이크론 주식을 언제, 어떻게 대응해야 할지 완벽한 인사이트를 얻으실 수 있습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 2026년 마이크론 테크놀로지 실적 폭발과 주가 현황</h2>
    <p>마이크론은 최근 발표된 2026 회계연도 3분기 실적에서 시장의 예측치를 크게 상회하는 '어닝 서프라이즈'를 기록하며 시장을 놀라게 했습니다. 과거 메모리 반도체 기업들이 겪었던 고질적인 가격 널뛰기 구조에서 벗어나 완전히 새로운 체급으로 성장했음을 증명한 셈입니다.</p>
    
    <h3>📈 역대급 분기 실적과 시장 반응</h3>
    <p>3분기 매출은 전년 동기 대비 3배 이상 폭증한 414억 6,000만 달러를 기록하였으며, 비일반기계회계기준(Non-GAAP) 주당순이익(EPS) 역시 시장 컨센서스였던 20.28달러를 가볍게 뛰어넘은 25.11달러를 달성했습니다. 실적 발표 직후 주가가 하루 만에 15% 이상 급등하는 등 AI 메모리 슈퍼사이클의 위력을 유감없이 보여주었습니다.</p>
    
    <p style="background-color: #f9fafb; padding: 14px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      현재 마이크론의 주가는 연초 대비 270% 이상 상승하며 시가총액 1조 달러 고지를 돌파했습니다. 다만 단기 급등에 따른 피로감으로 52주 최고점인 1,255달러 선에서 일부 숨 고르기 양상을 보이고 있습니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. 주가 상승을 이끄는 핵심 동력: HBM 공급 부족과 롱텀 계약</h2>
    <p>마이크론의 가파른 우상향 곡선을 뒷받침하는 가장 강력한 엔진은 단연 차세대 AI 서버의 필수 부품인 고대역폭 메모리(HBM)입니다.</p>
    
    <h3>📦 2026년까지 완판된 HBM 물량</h3>
    <p>마이크론은 이미 2026년까지 생산할 수 있는 HBM 물량 전체에 대해 가격과 공급 조건을 확정 짓는 사전 계약을 완료했다고 밝혔습니다. 엔비디아의 차세대 AI 가속기인 '베라 루빈(Vera Rubin)'에 탑재될 HBM4 공급을 비롯해, 최근 엔스로픽(Anthropic)과 AI 메모리 및 스토리지 아키텍처 구축을 위한 다년간의 전략적 고객 계약(Strategic Customer Agreement)을 체결하며 안정적인 수주 잔고를 확보했습니다.</p>
    
    <ul>
      <li><strong>압도적인 마진율 개선</strong>: 과거 25~30% 수준에 머물던 매출총이익률(Gross Margin)이 HBM4 및 고부가가치 디램(DRAM) 판매 확대로 인해 최근 84.6%라는 경이적인 수치까지 확장되었습니다.</li>
      <li><strong>빅테크향 수주 랠리</strong>: 구글의 차세대 AI 칩인 TPU와 아마존의 트레이니움3 등 글로벌 빅테크 기업들의 자체 커스텀 칩 탑재 수요가 지속해서 늘어나고 있습니다.</li>
      <li><strong>구조적 패러다임 변화</strong>: 단순한 부품 공급사 지위에서 탈피해 빅테크 기업들과 장기 파트너십을 맺음으로써 업황 주기에 따른 리스크를 대폭 낮췄습니다.</li>
    </ul>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. 월가 애널리스트 목표 주가 및 투자 시나리오 요약</h2>
    <p>현재 시장에서는 마이크론의 주가가 추가 랠리를 이어갈 수 있을지에 대해 낙관론과 신중론이 팽팽하게 대립하고 있습니다. 복잡한 시장 전망 데이터를 투자 전략 수립에 도움을 드릴 수 있도록 직관적인 마크다운 표로 요약해 드립니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 25%;">구분</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 45%;">예상 주가 범위</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 30%;">핵심 투자 논거 및 리스크 요인</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">강세 시나리오</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">1,410달러 ~ 2,000달러</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">HBM4 가격 결정권 유지, AI 데이터센터 지출의 다년 슈퍼사이클 지속</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">컨센서스 (평균)</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">약 1,230달러</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">39명의 애널리스트가 '매수(Buy)' 의견 유지, 현재 적정 가치 구간 진입</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">약세 시나리오</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">730달러 ~ 1,013달러</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">대규모 설비 투자 후 생산량 증설에 따른 디램 가격 정상화, 차익 실현 매물</td>
        </tr>
      </tbody>
    </table>
    
    <p>월가의 전체 커버리지 애널리스트 중 약 96% 이상이 여전히 매수 또는 강력 매수 의견을 제시하고 있어 장기적인 방향성에 대해서는 긍정적인 시각이 우세합니다. 하지만 단기적으로 200일 이동평균선과의 괴리율이 커진 만큼 변동성에 유의할 필요가 있습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 재무 건전성과 리스크 요인 분석</h2>
    <p>공격적인 공장 증설(메가팹 건설)에 따른 부채 부담 우려가 존재하지만, 마이크론의 체급과 재무 건전성은 그 어느 때보다 탄탄합니다.</p>
    
    <h3>💸 든든한 현금 흐름과 유동성 확보</h3>
    <p>현재 마이크론이 보유한 현금성 자산은 약 120억 달러 규모이며, 미사용 대출 한도까지 포함한 전체 유동성은 155억 달러 수준에 달합니다. 단기 부채 상환 능력을 보여주는 유동비율 역시 2.46배로 매우 건강하며, 지난 분기에만 39억 달러의 조정 잉여현금흐름을 창출해 내며 투자금을 스스로 벌어들이는 선순환 구조를 확립했습니다.</p>
    
    <h3>🇺🇸 미국 정부의 전폭적인 지원</h3>
    <p>무엇보다 미국 반도체법(CHIPS Act)을 통해 60억 달러 이상의 보조금을 확보한 상태에서 국가적 지원을 받으며 리스크를 분산하고 있습니다. 다만 메모리 반도체 특유의 하방 리스크인 '공급 과잉에 따른 가격 정상화'가 찾아올 경우 수익성과 PER(주가수익비율)이 동시에 꺾일 수 있다는 점은 염두에 두어야 합니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>5. 가계 경제 밸런스를 튜닝하는 지혜로운 저녁 2시간</h2>
    <p>개인적으로 주식 투자를 하면서 느끼는 점이지만, 반도체 섹터만큼 대중의 환호와 공포가 빠르게 교차하는 곳도 없는 것 같습니다. 불과 1~2년 전만 해도 공급 과잉으로 적자 늪에 허덕이던 마이크론이 이제는 시총 1조 달러를 넘나드는 AI 대장주로 우뚝 선 모습을 보니 격세지감이 느껴집니다. 급등한 주가 차트를 보면 지금이라도 추격 매수를 해야 하나 마음이 조급해지기 마련이지만, 이럴 때일수록 철저하게 분할 매수로 접근하며 리스크를 관리하는 지혜가 필요해 보입니다. AI가 바꾸어 놓을 우리 미래의 초입에서 마이크론이 보여줄 기술 혁신의 여정을 설레는 마음으로 계속 지켜보고 싶습니다.</p>
    
    <p>자세하고 합리적인 지출 다이어트 비법이나 자산 빌드 구조가 궁금하시다면 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ec%b0%a8%ec%a0%81%ed%99%94-%ec%82%b6%ec%9d%98-%ec%a7%88%ec%9d%84-%eb%b0%94%ea%be%b8%eb%8a%94-%ec%8b%9c%ea%b0%84-%ea%b4%80%eb%a6%ac/" target="_blank" rel="noopener" style="font-weight: bold; color: #ffd43b; text-decoration: underline;">시간관리 방법 칼럼</a>을 통해서 삶의 밸런스를 튜닝하는 팁을 얻어 가실 수 있습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #마이크론주가전망 #미국주식 #반도체주식 #HBM4 #에이아이반도체 #마이크론실적 #2026년주식전망 #테크주투자
    </p>
    """
    
    title = "마이크론 테크놀로지 주가전망"
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    headers = {
        "Content-Type": "application/json"
    }
    
    meta_desc = "2026년 마이크론 테크놀로지 주가 전망 및 실적 분석. HBM 공급 계약과 월가 적정 목표 주가 투자 시나리오 완벽 정리."
    
    post_data = {
        "title": title,
        "content": content,
        "status": "draft",
        "featured_media": featured_id,
        "categories": [85, 83, 9],
        "tags": tag_ids,
        "meta": {
            "_rank_math_focus_keyword": "마이크론 테크놀로지",
            "rank_math_focus_keyword": "마이크론 테크놀로지",
            "_rank_math_title": "%title% %page% %sep% %sitename%",
            "rank_math_title": "%title% %page% %sep% %sitename%",
            "_rank_math_description": meta_desc,
            "rank_math_description": meta_desc,
            "_rank_math_permalink": "micron-technology-stock-outlook",
            "rank_math_permalink": "micron-technology-stock-outlook"
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
