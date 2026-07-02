# -*- coding: utf-8 -*-
"""
업무 자동화 도구 정복기 포스팅 워드프레스 자동 업로더
"""

import requests
import json
import os

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
        print(f"Error loading env: {e}")

def get_post_content():
    html = """
    <p>매일 반복되는 단순 업무에 지쳐 "누가 대신 좀 해줬으면 좋겠다"라고 생각하신 적 있으신가요? 이메일 정리, 데이터 입력, 회의록 요약 등 매일 반복되는 루틴 업무는 창의적인 시간을 갉아먹는 주범입니다. 오늘 이 글을 통해 업무 자동화의 핵심 도구인 ChatGPT, Zapier, Notion을 연결하여 나만의 자동화 시스템을 구축하는 방법을 알려드립니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 업무 자동화의 핵심, 왜 이 3가지 도구인가?</h2>
    <p>현대 직장인의 생산성은 '어떤 도구를 어떻게 연결하느냐'에 따라 결정됩니다. 단순히 도구를 사용하는 것을 넘어, 도구 사이를 흐르는 데이터의 통로를 만드는 것이 자동화의 핵심입니다.</p>
    
    <h3>💡 자동화 도구의 역할 분담</h3>
    <ul>
      <li><strong>ChatGPT (뇌)</strong>: 복잡한 텍스트를 이해하고, 내용을 요약하며, 메일 초안을 작성하는 지능형 비서입니다.</li>
      <li><strong>Zapier (다리)</strong>: 서로 다른 앱(예: 이메일과 노션)을 연결하여 데이터가 자동으로 이동하도록 돕는 자동화 플랫폼입니다.</li>
      <li><strong>Notion (기록/저장소)</strong>: 자동화된 데이터가 최종적으로 정리되고 관리되는 체계적인 지식 베이스입니다.</li>
    </ul>
    <p style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important;">
      <strong>핵심 요약:</strong> 자동화의 첫걸음은 무작정 기술을 배우는 것이 아니라, 나의 반복 업무 중 무엇을 '자동화'할 것인지 정의하는 것에서 시작됩니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. Zapier로 여는 업무 자동화의 세상</h2>
    <p>Zapier는 코딩을 전혀 모르는 사람도 앱과 앱을 연결할 수 있게 해주는 마법 같은 도구입니다. 'If This, Then That(만약 이것이 발생하면, 저것을 하라)'의 논리 구조를 가집니다.</p>
    
    <h3>자동화 시나리오 예시</h3>
    <ol>
      <li><strong>트리거(Trigger)</strong>: 구글 폼으로 고객 문의가 들어옵니다.</li>
      <li><strong>액션(Action 1)</strong>: Zapier가 이 내용을 ChatGPT로 보냅니다.</li>
      <li><strong>액션(Action 2)</strong>: ChatGPT가 작성한 답변 초안을 Notion 데이터베이스에 저장합니다.</li>
    </ol>
    <p>이 과정을 거치면 매번 메일을 복사해서 붙여넣을 필요 없이, 단 몇 초 만에 처리 상태를 확인할 수 있습니다. 반복적인 'Ctrl+C, Ctrl+V' 작업에서 벗어나는 것만으로도 하루 1시간 이상을 절약할 수 있습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. ChatGPT와 Notion의 환상적인 조합</h2>
    <p>노션은 그 자체로도 훌륭하지만, ChatGPT와 결합하면 '지능형 문서 시스템'으로 진화합니다.</p>
    
    <h3>생산성 극대화 가이드라인</h3>
    <ul>
      <li><strong>회의록 자동 정리</strong>: 음성 녹음본을 텍스트로 전환한 뒤, ChatGPT에게 "회의 핵심 안건과 결정 사항만 3줄로 요약해줘"라고 요청하세요. 그 결과물을 노션에 붙여넣기만 하면 됩니다.</li>
      <li><strong>콘텐츠 제작</strong>: 블로그 글의 개요를 ChatGPT로 잡고, 이를 노션의 '콘텐츠 캘린더' 데이터베이스에 자동으로 삽입하여 관리하는 시스템을 구축할 수 있습니다.</li>
    </ul>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">도구</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">주요 활용 분야</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold;">생산성 향상 기대치</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">ChatGPT</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">아이디어 구상, 텍스트 요약</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">50% 이상 단축</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">Zapier</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">앱 간 데이터 연동</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">80% 이상 자동화</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">Notion</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">업무 체계화, 데이터 관리</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">30% 이상 체계 개선</td>
        </tr>
      </tbody>
    </table>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 자동화 시스템 구축 시 주의할 점</h2>
    <p>시스템을 만드는 것보다 중요한 것은 '지속 가능성'입니다. 처음부터 너무 복잡한 자동화를 시도하면 오히려 오류를 수정하느라 시간을 더 쓰게 될 수 있습니다.</p>
    <p style="background-color: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; font-weight: 500; color: #111827 !important;">
      <strong>주의사항:</strong> 처음에는 가장 단순한 '이메일 알림'이나 '간단한 데이터 저장'부터 시작하세요. 작은 성공(Small Win)이 쌓여야 더 복잡한 자동화도 구현할 수 있습니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>5. 인간만이 할 수 있는 영역에 집중하기</h2>
    <p>사실 저도 처음에는 자동화를 '게으름을 피우기 위한 도구'라고 생각했습니다. 하지만 시스템을 구축하면서 깨달은 점은, 자동화가 우리에게 주는 진짜 선물은 '시간'이 아니라 '몰입할 여유'라는 것입니다.</p>
    <p>데이터를 옮기고 정리하는 기계적인 업무를 도구에 맡기고 나니, 정작 중요한 기획이나 사람과의 소통에 훨씬 더 에너지를 쏟을 수 있게 되더군요. 저 역시 최근에 반복되는 이메일 응대를 자동화했는데, 남는 시간에 책을 한 권 더 읽거나 나만의 프로젝트를 구상할 수 있게 되어 얼마나 기쁜지 모릅니다.</p>
    <p>여러분도 이번 기회에 복잡한 수식이나 코딩 고민은 잠시 접어두고, 내가 반복하는 루틴이 무엇인지 찬찬히 들여다보세요. 그리고 그중 딱 하나만이라도 오늘 자동화해보시길 바랍니다. 작은 클릭 한 번이 여러분의 업무 환경을 완전히 바꿀 수 있습니다. 여러분도 저처럼 도구들과 친해져서 조금 더 여유로운 퇴근 시간을 맞이하셨으면 좋겠습니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #업무자동화 #생산성도구 #ChatGPT활용법 #Zapier연동 #노션사용법 #디지털트랜스포메이션 #시간관리 #스마트워크
    </p>
    """
    return html

def upload_post():
    title = "업무 자동화 도구 정복기: ChatGPT, Zapier, Notion으로 생산성 200% 올리기"
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
