# -*- coding: utf-8 -*-
"""
대표 이미지를 생성 및 미디어 등록하여 예약/임시글을 자동 발행하는 고품질 SEO 업로더
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

# ==========================================
# 1. 미디어 라이브러리에 이미지 업로드 (대체텍스트 설정)
# ==========================================
def upload_image(image_path, title_text):
    if not os.path.exists(image_path):
        print(f"[ERROR] Image not found at: {image_path}")
        return None

    url = f"{WP_URL}/wp-json/wp/v2/media"
    headers = {
        "Content-Disposition": f"attachment; filename={os.path.basename(image_path)}",
        "Content-Type": "image/jpeg"
    }

    print("Uploading image to WordPress Media Library...")
    try:
        with open(image_path, "rb") as img:
            response = requests.post(
                url,
                auth=(WP_USER, WP_APP_PW),
                headers=headers,
                data=img.read()
            )
        
        if response.status_code == 201:
            media_data = response.json()
            media_id = media_data.get("id")
            media_url = media_data.get("source_url")
            print(f"[SUCCESS] Image uploaded! ID: {media_id}, URL: {media_url}")

            # 대체텍스트(Alt Text) 및 설명 업데이트
            update_url = f"{WP_URL}/wp-json/wp/v2/media/{media_id}"
            update_data = {
                "alt_text": "시간관리 공부법 집중력 향상 비결",
                "caption": "시간관리와 스마트 공부법을 통한 집중력 향상 테크닉",
                "description": "시간관리 및 뇌 과학 기반의 효율적인 공부법 실전 가이드라인 이미지"
            }
            requests.post(
                update_url,
                auth=(WP_USER, WP_APP_PW),
                headers={"Content-Type": "application/json"},
                data=json.dumps(update_data)
            )
            return media_id
        else:
            print(f"[ERROR] Image upload failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"[ERROR] Image upload connection failed: {e}")
        return None

# ==========================================
# 2. 본문 조립 (SEO 1000자 이상 확장 및 키워드 최적화)
# ==========================================
def get_post_content():
    html = """
    <p>매일 똑같이 주어지는 24시간인데, 왜 누군가는 더 많은 성과를 내고 여유까지 즐기는 걸까요? 그 비밀은 바로 <strong>'시간관리'</strong>와 <strong>'뇌 과학을 활용한 공부법'</strong>의 조합에 있습니다. 단순히 책상 앞에 오래 앉아 있는 무의미한 엉덩이 싸움이 아니라, 한정된 에너지를 어떻게 통제하고 뇌가 몰입하게 만들었느냐가 결과의 차이를 만들어 냅니다. 이 글에서는 바쁜 일상 속에서 스마트한 시간관리를 실현하고, 집중력을 극대화하여 원하는 목표를 빠르게 성취하는 실전 공부법 전략을 자세히 정리해 드립니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 시간관리의 핵심, 에너지를 배치하는 우선순위 전략</h2>
    <p>성공적인 시간관리는 단지 하루 24시간을 잘게 쪼개어 빽빽한 스케줄표를 채우는 것이 아닙니다. 핵심은 나의 제한된 주의력과 물리적 에너지를 가장 가치 있는 일에 어떻게 효율적으로 '배치'하느냐에 달려 있습니다. 모든 일을 전부 잘하려고 노력할 때, 우리의 에너지는 분산되고 결과적으로는 아무것도 제대로 완수하지 못하게 됩니다.</p>
    
    <h3>💡 효율적인 시간관리를 위한 3대 핵심 액션 플랜</h3>
    <ul>
      <li><strong>아이젠하워 매트릭스 설계</strong>: 긴급성과 중요도를 기준으로 삼아 모든 과업을 재분류하세요. 스티브 코비 박사가 강조했듯, '긴급하지는 않지만 인생에서 아주 중요한 일(예: 장기적인 공부법 연구, 미래를 위한 자기계발)'에 먼저 전용 시간을 따로 배정해야만 진정한 변화가 생깁니다.</li>
      <li><strong>시간 가계부 기록</strong>: 가계부를 작성하여 지출을 통제하듯, 내가 온전히 하루 24시간을 어떻게 흘려보내고 있는지 최소 3일간 밀착 기록해 보세요. 무의식적으로 SNS나 모바일 게임, 웹서핑 등으로 소비하는 시간 낭비 요소를 발견하고 이를 차단하는 것만으로도 매일 1~2시간의 골든타임을 확보할 수 있습니다.</li>
      <li><strong>타임 블로킹(Time Blocking)</strong>: 캘린더나 스케줄러에 특정 시간을 오직 '나의 공부를 위한 전용 블록'으로 굳건히 예약해 두세요. 이 지정된 전용 시간대에는 그 어떤 멀티태스킹도 금지하고 오로지 약속된 단 하나의 메인 과업에만 무섭게 집중하는 단단한 환경을 구축하는 것이 필요합니다.</li>
    </ul>
    
    <p style="background-color: #f3f4f6; padding: 14px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      <strong>시간관리 요약 가이드:</strong> 시간관리 공부법의 진짜 본질은 '오늘 무엇을 할 것인가'보다 '오늘 나의 집중력을 흐리는 불필요한 과업을 무엇을 배제할 것인가'를 현명하게 단언하는 결정력에서 탄생합니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. 뇌 과학이 증명하는 스마트 공부법과 메타인지</h2>
    <p>기적 같은 집중력 향상을 원한다면, 인간의 뇌가 작동하는 생물학적인 메커니즘을 알아야 합니다. 사람의 뇌는 본래 한 번에 장시간 고도의 집중을 유지하도록 진화하지 않았습니다. 뇌의 연상 및 기억 시스템을 극대화하려면 뇌가 흥미를 느끼고 편하게 정보를 흡수할 수 있는 과학적인 공부법으로 접근하는 전략이 필수적입니다.</p>
    
    <h3>🧠 기억력 세포를 깨우는 3가지 실전 학습 기법</h3>
    <ul>
      <li><strong>뽀모도로(Pomodoro) 시간 분할 테크닉</strong>: 25분간 고도로 완전히 몰입해 공부한 후, 무조건 5분간 휴식을 취하는 사이클을 4회 반복해 보세요. 뇌가 본격적으로 피로감을 느끼기 전에 선제적으로 5분의 휴식을 끼워 넣으면 아드레날린과 도파민 수치가 적절히 유지되어 장시간 최적의 공부 효율을 지킬 수 있습니다.</li>
      <li><strong>적극적 인출 연습(Active Recall)</strong>: 눈으로 텍스트를 읽는 단순 반복 독서는 공부를 잘하고 있다는 착각을 주는 '유창성의 오류'를 범하기 쉽습니다. 한 챕터의 정독이 끝나면 책을 완전히 덮고 백지에 방금 배운 핵심 키워드를 그리거나, 눈앞에 가상의 청중이 있다고 생각하고 소리 내어 가르치듯 설명해 보세요. 뇌는 정보가 밖으로 인출되는 강력한 부하 속에서만 기억의 연결을 더 단단하게 재구성합니다.</li>
      <li><strong>주기적 간격 반복(Spaced Repetition)</strong>: 주기적인 피드백과 복습 시스템을 세워야 합니다. 학습 직후 10분, 1일 뒤, 1주일 뒤, 한 달 뒤의 순서로 간격을 점점 넓히며 복습 주기를 설계하세요. 에빙하우스의 망각 곡선을 무력화하고 단기 기억을 반영구적인 장기 기억 저장소로 밀어 넣는 유일한 지름길은 바로 이 과학적인 간격 반복 복습입니다.</li>
    </ul>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. 3단계 프로세스를 통한 학습 시스템 구축</h2>
    <p>시간관리와 공부법을 실제 행동으로 정착시키기 위해 아래의 3단계 흐름을 일상 스케줄에 적용해야 합니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 25%;">학습 단계</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 45%;">구체적 실행 프로세스</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 30%;">기대 향상 효과</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">1단계: 입력 (Input)</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">핵심 요약 노트 생성 및 개념의 맥락 정독</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">기초 개념의 구조화</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">2단계: 인출 (Output)</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">백지 복습 노트 작성 및 누군가에게 직접 설명하기</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">단기 기억의 장기화 촉진</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">3단계: 강화 (Review)</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">에빙하우스 주기(1일/7일/30일)에 맞춰 간격 누적 복습</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">학습 지식의 완전 정복</td>
        </tr>
      </tbody>
    </table>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 집중력 향상을 위한 완벽한 물리적 환경 설계</h2>
    <p>결단코 집중력은 초인적인 의지력의 차이가 아닙니다. 본질은 스마트한 '환경 통제'의 결과물입니다. 인간의 눈앞에 스마트폰이나 잡동사니가 보이면 의식하지 않더라도 뇌는 그것을 무시하기 위해 계속 에너지를 낭비하게 됩니다. 따라서 뇌가 자연스레 집중에 빠져들 수밖에 없는 미니멀하고 몰입적인 물리적 공간을 의도적으로 설계하는 것이 중요합니다.</p>
    
    <ul>
      <li><strong>철저한 디지털 디톡스 적용</strong>: 공부 시간이나 생산적 업무 시간 동안만큼은 스마트폰의 전원을 끄거나 물리적으로 완전히 격리된 다른 방에 보관하십시오. 화면에 진동이나 불빛 알림이 단 한 번 반짝이는 것만으로도, 흐트러진 뇌가 다시 원래의 깊은 몰입 상태(Deep Work Flow)로 복귀하는 데는 평균 23분의 아까운 적응 시간이 낭비됩니다.</li>
      <li><strong>최적의 청각 및 조명 세팅</strong>: 도서관의 극단적인 정적은 오히려 귀를 예민하게 만들어 집중을 깨기 쉽습니다. 약 50~70데시벨 수준의 잔잔한 백색 소음(카페의 웅성거림, 자연 빗소리)을 배경음으로 활용하시고, 시력을 보호하면서 주의력을 한 단계 끌어올리는 차분한 은은한 노란빛의 간접조명을 설정하시는 것이 현명합니다.</li>
      <li><strong>시야의 시각적 노이즈 제거</strong>: 책상 위에는 지금 당장 처리해야 하는 교재나 업무 서류 단 1개만 올려놓으세요. 시야 반경 내에 불필요한 서적이나 문구류, 영수증 등이 흩어져 있다면 뇌는 지속적으로 시각 정보를 탐지하며 집중 리소스를 갉아먹게 됩니다.</li>
    </ul>
    
    <p style="background-color: #fef2f2; padding: 14px; border-left: 4px solid #ef4444; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      <strong>돌발 상황 대응 주의사항:</strong> 오랜 몰입 중 잠시 집중력이 흐려진다고 스스로를 비난할 필요는 없습니다. 뇌 과학적으로 인간의 전두엽 주의력 필터는 30분 안팎으로 자연스럽게 리프레시를 요구합니다. 이때 억지로 매달리기보단 5분간 창밖을 바라보며 가볍게 물을 한 잔 마시고 스트레칭으로 뇌척수액의 흐름을 돕는 리셋 과정을 당당하게 즐기시기 바랍니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>5. 인생을 바꿀 수 있는 기록과 메타인지 회고</h2>
    <p>시간관리 및 효율적 공부법의 대단원은 반드시 '기록과 피드백을 통한 성찰(회고)'로 마침표를 찍어야 합니다. 매일 스스로의 몰입 시간대를 돌아보고 점검하지 않는다면, 다음 날에도 똑같은 시간 누수와 주의력 분산을 겪게 될 것입니다.</p>
    
    <p>저는 매일 잠들기 전, 오늘 하루 스케줄 중 집중력이 가장 무섭게 솟구쳤던 '몰입 피크타임'과 맥없이 집중이 무너져 내렸던 '시간 누출 원인'을 단 세 줄로 간단히 노션에 적어 기록으로 남깁니다. 나의 생활 방식을 내 눈으로 직접 수치화하여 모니터링하는 것(메타인지)은 생각 이상으로 강력한 힘을 발휘합니다. 내 하루를 스스로 완전하게 통제하고 있다는 건강한 지배적 만족감은 공부 자존감을 강하게 끌어올리고, 이는 다시 다음 날 더 밀도 높은 공부 시간관리에 도전할 열정의 연료가 됩니다.</p>
    
    <p>처음에는 소중한 일상 속에서 스마트폰을 멀리 치우는 평범한 행동조차 세상에서 가장 무겁고 어색한 일처럼 다가올 수 있습니다. 그러나 이를 극복하고 획득한 고요한 시간관리는 나 자신을 돌보고 장기적인 성장을 위해 투자하는 가장 짜릿하고 보람찬 시간으로 돌아옵니다. 여러분도 오늘 당장 모든 규칙을 완벽하게 적용하여 환골탈태하려 욕심내기보다, 오늘 딱 1시간만 스마트폰을 멀리 격리하고 뽀모도로 타이머를 켜보는 '작은 승리'를 지금 이 순간 경험해 보세요. 그 가벼운 시작이 여러분의 성취 곡선을 완전히 다르게 만들어 낼 것입니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #시간관리 #공부법 #집중력향상 #자기계발 #생산성 #뽀모도로 #학습전략 #몰입
    </p>
    """
    return html

def upload_post(image_path):
    title = "시간관리 공부법 정복: 집중력 향상을 통해 목표 달성하는 4가지 실전 학습 전략"
    
    # 1. 이미지 업로드 및 미디어 ID 획득
    featured_media_id = None
    if image_path:
        featured_media_id = upload_image(image_path, title)
        
    content = get_post_content()
    
    headers = {
        "Content-Type": "application/json"
    }
    
    post_data = {
        "title": title,
        "content": content,
        "status": "draft"
    }
    
    if featured_media_id:
        post_data["featured_media"] = featured_media_id
        print(f"Setting featured image to attachment ID: {featured_media_id}")
        
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    print("Uploading post to WordPress...")
    try:
        response = requests.post(
            url,
            auth=(WP_USER, WP_APP_PW),
            headers=headers,
            data=json.dumps(post_data)
        )
        if response.status_code == 201:
            print("\n[SUCCESS] Dynamic post successfully uploaded to WordPress!")
            print(f"Edit Link: {response.json().get('link')}")
        else:
            print(f"\n[FAILED] Upload failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    image_file = "C:\\Users\\owner\\.gemini\\antigravity\\brain\\820f16a8-6613-4149-ae20-d9f890d29a2b\\time_management_wp_cover_1783009911585.jpg"
    upload_post(image_file)
