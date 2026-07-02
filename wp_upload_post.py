# -*- coding: utf-8 -*-
"""
특정 블로그 포스팅 ('부동산 수수료 및 부가세 100% 절약 꿀팁') 워드프레스 자동 업로더
사용자의 실전 포스팅 원고를 바탕으로 예쁜 표와 서식을 입혀 워드프레스 임시글로 즉시 전송합니다.
"""

import requests
import json
import os

# ==========================================
# 1. 워드프레스 접속 정보 설정 (.env.local 자동 파싱)
# ==========================================
WP_URL = "https://your-wordpress-site.com"  
WP_USER = "your_username"                   
WP_APP_PW = "xxxx xxxx xxxx xxxx"           

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
        print(f"⚠️ {env_path} 로딩 실패: {e}")

# ==========================================
# 2. 본문 HTML 코드 조립
# ==========================================
def get_post_content():
    html = """
    <p>부동산 거래는 인생에서 가장 큰 금액이 오가는 계약 중 하나입니다. 설레는 마음으로 집을 구하다가도, 막상 계약 단계에서 마주하는 부동산 중개보수와 부가세는 생각지 못한 큰 부담으로 다가오곤 하죠.</p>
    
    <p>사실 중개보수는 <strong>법정 상한 요율</strong> 내에서 얼마든지 협의가 가능한 영역입니다. 이 글에서는 부동산 수수료를 합리적으로 줄이는 실전 전략과 부가세 관련 분쟁을 원천 차단하는 방법을 상세히 알려드립니다. 이 내용만 숙지하셔도 수십만 원 이상의 비용을 아낄 수 있습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 중개보수, '법정 상한 요율'부터 파악하기</h2>
    <p>많은 분이 공인중개사가 부르는 금액이 곧 정해진 가격이라고 오해하곤 합니다. 하지만 부동산 중개보수는 각 시·도 조례에 따라 <strong>최대 요율(상한 요율)</strong>만 정해져 있을 뿐, 그 안에서는 자유롭게 협의할 수 있습니다.</p>
    
    <h3>💡 거래 유형별 법정 상한 요율 이해</h3>
    <ul>
      <li><strong>매매/교환</strong>: 거래 금액에 따라 0.4%에서 0.9% 사이로 결정됩니다.</li>
      <li><strong>임대차(전세/월세)</strong>: 보통 0.3%에서 0.6% 수준에서 책정됩니다.</li>
      <li><strong>주택 외(오피스텔 등)</strong>: 주택과 달리 0.9% 이내에서 협의하며, 부가세가 발생할 확률이 높습니다.</li>
    </ul>
    <p style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important;">
      <strong>핵심 팁:</strong> 계약서를 작성하기 전에 반드시 해당 지역의 '중개보수 요율표'를 검색해 보세요. 내가 거래할 금액이 몇 퍼센트 구간에 해당하는지 정확히 알아야 협상 테이블에서 당당하게 의견을 제시할 수 있습니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. 부가세 10%, 무조건 내야 할까?</h2>
    <p>가장 흔하게 발생하는 분쟁 중 하나가 바로 중개보수 외에 추가되는 <strong>부가세 10%</strong>입니다. 결론부터 말씀드리면, 모든 중개사가 부가세를 받을 수 있는 것은 아닙니다.</p>
    
    <h3>일반과세자와 간이과세자의 차이</h3>
    <ul>
      <li><strong>일반과세자</strong>: 연 매출 8,000만 원 이상인 중개업소로, 세금계산서 발행이 가능하며 부가세 10%를 추가로 청구할 수 있습니다.</li>
      <li><strong>간이과세자</strong>: 연 매출이 적어 부가세 납부 의무가 면제되거나 매우 적은 곳입니다. 이들은 부가세를 별도로 청구할 명분이 없습니다.</li>
    </ul>
    <p style="background-color: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; font-weight: 500; color: #111827 !important;">
      <strong>주의사항:</strong> 계약 전 "사업자 등록증을 보여주실 수 있나요?"라고 정중히 요청해 보세요. 간이과세자라면 부가세 10%를 절약할 수 있으며, 일반과세자라면 부가세 포함 금액으로 협의를 시도해 보는 것이 전략입니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. 부동산 수수료 절약을 위한 실전 협상술</h2>
    <p>협상은 계약서에 도장을 찍기 직전이 아니라, <strong>매물을 보러 가기 전에 시작</strong>되어야 합니다. 상호 간의 기분 좋은 거래가 가장 중요하기 때문입니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">협상 단계</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">실행 전략</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">사전 조사</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">네이버 부동산 등에서 예상 중개보수를 미리 계산합니다.</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">현장 방문</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">중개사에게 "입주 날짜나 조건을 맞추는 대신 보수를 조정하고 싶다"고 제안합니다.</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">계약 단계</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">최종 금액을 계약서 특약사항에 명시하여 추후 분쟁을 예방합니다.</td>
        </tr>
      </tbody>
    </table>
    
    <ul>
      <li><strong>비용의 합리화</strong>: 수수료를 깎아달라고 하기보다, "저와 매도인(혹은 임대인)의 조건을 잘 조율해주셔서 감사합니다. 소정의 금액으로 조정이 가능할까요?"라고 접근하는 것이 효과적입니다.</li>
      <li><strong>서비스 비교</strong>: 요즘은 '반값 부동산'이나 '중개수수료 플랫폼'도 많습니다. 서비스의 질과 비용을 비교하여 나에게 가장 유리한 선택을 하세요.</li>
    </ul>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 왜 '거래 조건 협의'가 수수료보다 중요할까?</h2>
    <p>부동산 거래에서 수수료 몇만 원을 아끼는 것도 중요하지만, 더 큰 틀에서 보면 <strong>거래 조건을 나에게 유리하게 만드는 것이 진짜 절약</strong>입니다. 예를 들어, 잔금 날짜를 조정하거나 전세 보증금 보험 가입을 조건으로 내걸어 추후 발생할 수 있는 보증금 사고 위험을 낮추는 것이 훨씬 큰 이익입니다.</p>
    
    <p>저는 사실 부동산 공부를 시작하면서 가장 먼저 배운 게 <strong>'협상은 감정이 아니라 논리'</strong>라는 점이었습니다. 중개사님들도 결국 사람인지라, 너무 과도하게 수수료 인하를 요구하면 오히려 비협조적으로 변할 수 있습니다. 항상 예의를 갖추되, 법적으로 보장된 내 권리는 당당하게 요구하는 태도가 필요합니다.</p>
    
    <p>가끔은 수수료를 조금 더 주더라도 확실하게 일 처리를 해주는 중개사님이 나중에 큰 사고를 막아주기도 하더군요. 여러분도 이번 거래에서 단순히 '깎는 것'에만 집중하기보다, '안전하고 합리적인 계약'이라는 두 마리 토끼를 모두 잡으셨으면 좋겠습니다. 저도 이번에 이사 갈 집을 알아보고 있는데, 정말 마음에 드는 곳을 찾아서 기분 좋게 계약하고 싶네요. 모두 성공적인 부동산 거래 되시길 바랍니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #부동산 #중개수수료 #부가세절약 #부동산계약꿀팁 #전세계약 #아파트매매 #공인중개사 #부동산상식
    </p>
    """
    return html

# ==========================================
# 3. 전송 함수
# ==========================================
def upload_post():
    title = "부동산 수수료 및 부가세 100% 절약 꿀팁: 계약 전 필독 가이드"
    content = get_post_content()
    
    headers = {
        "Content-Type": "application/json"
    }
    post_data = {
        "title": title,
        "content": content,
        "status": "draft"
    }
    
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    print("Saving draft to WordPress...")
    try:
        response = requests.post(
            url,
            auth=(WP_USER, WP_APP_PW),
            headers=headers,
            data=json.dumps(post_data)
        )
        if response.status_code == 201:
            print("\n[SUCCESS] Draft successfully uploaded to WordPress!")
            print(f"Edit Link: {response.json().get('link')}")
        else:
            print(f"\n[FAILED] Upload failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    upload_post()
