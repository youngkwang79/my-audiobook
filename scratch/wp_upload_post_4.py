# -*- coding: utf-8 -*-
"""
대표 이미지 및 본문 중간 이미지 자동 삽입, Rank Math SEO 메타데이터까지 완벽 제어하여 100점 점수를 타겟팅하는 업로더
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
# 1. 이미지 업로드 함수
# ==========================================
def upload_image(image_path, alt_text, caption, desc):
    if not os.path.exists(image_path):
        print(f"[ERROR] Image not found at: {image_path}")
        return None, None

    url = f"{WP_URL}/wp-json/wp/v2/media"
    headers = {
        "Content-Disposition": f"attachment; filename={os.path.basename(image_path)}",
        "Content-Type": "image/jpeg"
    }

    print(f"Uploading {os.path.basename(image_path)} to WordPress...")
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
            print(f"[SUCCESS] Uploaded! ID: {media_id}")

            # Alt text 등 세부 메타 데이터 업데이트
            update_url = f"{WP_URL}/wp-json/wp/v2/media/{media_id}"
            update_data = {
                "alt_text": alt_text,
                "caption": caption,
                "description": desc
            }
            requests.post(
                update_url,
                auth=(WP_USER, WP_APP_PW),
                headers={"Content-Type": "application/json"},
                data=json.dumps(update_data)
            )
            return media_id, media_url
        else:
            print(f"[ERROR] Upload failed: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return None, None

# ==========================================
# 2. 본문 작성 (시간관리 공부법 키워드 밀도 높이고 링크들 배치)
# ==========================================
def get_post_content(sub_img_url):
    # 포커스 키워드 '시간관리 공부법'을 본문 곳곳에 자연스럽게 녹여내고 글자 수를 확장했습니다.
    img_html = ""
    if sub_img_url:
        img_html = f"""
        <div style="text-align: center; margin: 28px 0;">
            <img src="{sub_img_url}" alt="시간관리 공부법 집중력 연구 일러스트" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #ddd;" />
            <p style="font-size: 13px; color: #666; margin-top: 8px;">뇌 과학 기반의 시간관리 공부법 실천 프로세스 구성도</p>
        </div>
        """

    html = f"""
    <p><strong>시간관리 공부법</strong>은 바쁜 현대 사회에서 한정된 주의 자원을 가장 생산적인 성과로 연결해 주는 강력한 핵심 전략입니다. 매일 똑같이 공평하게 주어지는 24시간인데, 왜 누군가는 탁월한 학업 성과를 내고 탄탄한 자기계발 여유까지 누리는 걸까요? 그 해답은 단순히 책상 앞에 지루하게 오래 앉아 시간을 낭비하는 엉덩이 싸움이 아니라, 뇌가 완전히 몰입할 수 있도록 행동 패턴을 제어하는 고품질의 <strong>시간관리 공부법</strong> 실천 여부에 달려 있습니다.</p>
    
    <p>본 포스팅에서는 뇌 과학의 이론적 토대 위에 검증된 시간관리 원칙을 융합하여, 공부와 일의 효율성을 단숨에 끌어올리는 구체적인 가이드를 제공합니다. 이 <strong>시간관리 공부법</strong> 가이드를 끝까지 읽고 일상에 적용해 보세요.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>1. 시간관리 공부법 핵심, 우선순위 배정과 타임 블로킹</h2>
    <p>진정한 의미의 <strong>시간관리 공부법</strong>은 단순히 시간 스케줄표에 빽빽하게 글자를 적는 기계적인 행동이 아닙니다. 본질은 나의 한정된 에너지를 어떤 영역에 먼저 투입할지 지혜롭게 결정하는 과정입니다. 모든 과제를 동시다발적으로 해결하려 덤빌 때 주의력은 조각나고 성과는 급락하게 됩니다.</p>
    
    <h3>💡 실전을 위한 구체적 3대 에너지 스케줄링 전략</h3>
    <ul>
      <li><strong>아이젠하워 원칙 적용</strong>: 긴급도와 중요도를 두 축으로 삼아 나의 과업 목록을 냉정하게 평가하세요. 눈앞에 긴급하지는 않지만 인생을 성장시키는 장기적인 학습 활동에 우선적으로 골든타임을 확보하는 것이 <strong>시간관리 공부법</strong>의 핵심 전제 조건입니다.</li>
      <li><strong>시간 사용의 기록(시간 가계부)</strong>: 가계부를 적듯 내가 시간을 어디에 쓰고 있는지를 3일간 매시간 기록해 보세요. 스마트폰 알림 확인, 웹서핑 등 무의식적으로 흘려보내던 자투리 시간을 명확하게 통제하는 것만으로도 여유 시간이 늘어납니다.</li>
      <li><strong>타임 블로킹(Time Blocking)</strong>: 하루의 특정 시간을 '공부 몰입 전용 블록'으로 캘린더에 미리 선점하여 봉인하세요. 이 시간 동안에는 어떠한 연락이나 회의도 차단하고 하나의 메인 학습에만 온전히 몰입하는 것이 최고의 <strong>시간관리 공부법</strong>입니다.</li>
    </ul>
    
    <p style="background-color: #f9fafb; padding: 14px; border-left: 4px solid #ffd43b; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      우선순위의 본질은 결국 '선택과 집중'입니다. 집중하고 싶다면 먼저 내 주변의 멀티태스킹 유도 요소를 완벽하게 차단하십시오.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>2. 뇌 과학이 좋아하는 스마트 공부법 테크닉</h2>
    <p>사람의 뇌 세포는 끊임없는 고강도 몰입 상태를 장시간 유지하는 것이 불가능합니다. 뇌의 집중 한계 메커니즘을 조화롭게 활용하는 <strong>시간관리 공부법</strong>을 실천해야 지치지 않고 지속적인 공부 성장을 이어갈 수 있습니다.</p>
    
    <h3>🧠 뇌의 기억 메커니즘을 돕는 학습 방법론</h3>
    <ul>
      <li><strong>뽀모도로(Pomodoro) 시간 관리법</strong>: 25분 집중과 5분 완전 휴식을 반복하는 체계적인 훈련법입니다. 뇌 세포가 피로감을 느끼기 직전에 의도적으로 짧은 리셋 시간을 끼워 넣어 집중 피로 누적을 방지하는 스마트한 <strong>시간관리 공부법</strong>의 대표 주자입니다.</li>
      <li><strong>적극적인 인출 연습(Active Recall)</strong>: 교재를 단순히 읽는 입력 학습은 '익숙함을 앎으로 오해'하게 만듭니다. 공부가 끝나면 책을 덮고, 머릿속으로 핵심 노트를 직접 말로 설명하거나 백지에 적어 기억을 강제로 인출해야 장기 기억 회로가 굳어집니다.</li>
      <li><strong>간격 반복 복습(Spaced Repetition)</strong>: 망각 곡선을 이겨내려면 복습 주기를 점진적으로 넓혀나가야 합니다. 첫 학습 직후 10분, 1일 뒤, 7일 뒤, 30일 뒤 누적 복습을 실행하는 것이야말로 <strong>시간관리 공부법</strong>의 완성 단계라 할 수 있습니다.</li>
    </ul>
    
    {img_html}
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>3. 메타인지 향상을 위한 3단계 학습 프로세스</h2>
    <p>시간관리 공부법 체계를 우리 일상에 완벽히 정착하기 위해 아래 표와 같이 체계적인 3단계 입력-인출-강화 순환 모델을 제안합니다.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; border: 1px solid #e5e7eb; background-color: #ffffff !important; color: #111827 !important;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6 !important;">
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 25%;">학습 프로세스</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 45%;">실행 핵심 방법론</th>
          <th style="padding: 12px; border: 1px solid #e5e7eb; color: #111827 !important; font-weight: bold; width: 30%;">기대 집중력 강화 효과</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">1. 정보의 입력</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">개념 구조화 및 핵심 맥락 정독 위주 공부법</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">배경 이해 및 논리 흐름 생성</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">2. 지식의 인출</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">백지 복습 및 소리 내어 가르치는 공부법</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">메타인지 극대화 및 장기 기억 정착</td>
        </tr>
        <tr style="background-color: #ffffff !important;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #ff2a5f !important; background-color: #ffffff !important;">3. 주기적 강화</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important;">시간관리 플래너에 연계한 점진적 누적 복습법</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #ffffff !important; font-weight: bold;">망각 방지 및 완전한 개념 체화</td>
        </tr>
      </tbody>
    </table>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>4. 고도화된 집중력을 유도하는 최적의 환경 관리</h2>
    <p>성공적인 공부 효율과 <strong>시간관리 공부법</strong> 정착의 절대다수는 의지의 영역이 아닌 똑똑한 환경 세팅에서 결판납니다. 눈앞에 보이고 들리는 방해 요소를 선제적으로 완전 격리하는 조치가 먼저입니다.</p>
    
    <ul>
      <li><strong>모바일 기기의 격리</strong>: 몰입 시간 중 스마트폰은 다른 방에 두거나 확실히 격리하세요. 벨소리나 알림 하나를 확인하느라 흐트러진 뇌가 다시 깊은 몰입 상태로 돌아오기까지 평균 23분의 불필요한 주의 회복 리소스가 낭비된다는 사실을 명심하십시오.</li>
      <li><strong>백색 소음과 조명 제어</strong>: 지나치게 고요한 독서실보다 50~70dB 정도의 자연 백색 소음(카페 소음 등)이 존재할 때 뇌파가 안정되어 집중 효율이 높아집니다. 더불어 눈에 피로를 덜 주고 차분함을 더하는 따뜻한 톤의 간접조명을 준비하세요.</li>
      <li><strong>책상 위의 미니멀리즘</strong>: 지금 당장 펼쳐놓고 씹어 먹을 메인 교재 단 한 권만 책상 위에 올리고 나머지는 모두 치워 눈의 피로와 주의력 시각 노이즈를 완전 차단해야 올바른 <strong>시간관리 공부법</strong>이 성립됩니다.</li>
    </ul>
    
    <p style="background-color: #fef2f2; padding: 14px; border-left: 4px solid #ef4444; font-weight: 500; color: #111827 !important; margin: 20px 0;">
      <strong>위기 대응 가이드:</strong> 공부 도중 흐트러지는 주의력 때문에 자기반성을 과하게 할 필요는 전혀 없습니다. 뇌의 집중 필터는 30분 마다 휴식을 유도하도록 설계되어 있으니, 가볍게 스트레칭을 하며 뇌 세포를 순환시키는 것이 지극히 정상적인 회복 단계입니다.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    
    <h2>5. 성장을 돕는 스마트한 기록과 데일리 피드백</h2>
    <p>고도의 <strong>시간관리 공부법</strong>을 내면화하기 위한 최종 열쇠는 잠들기 전 5분의 '메타인지 피드백'입니다. 스스로 오늘 수행한 과제 흐름과 낭비한 순간들을 기록하여 성찰하지 않는다면, 언제나 내일도 똑같은 시행착오를 반복하여 성장을 저해하게 됩니다.</p>
    
    <p>저는 매일 밤 노션에 오늘 하루의 집중 상태를 기록하며 '오늘의 몰입 피크타임'과 '시간 낭비 원인'을 객관적으로 분석해 기록합니다. 이 소소한 기록 습관은 메타인지를 높여 자신이 일상을 통제하고 있다는 보람과 지배력을 주어 학업 자존감을 높여줍니다. 그리고 이는 다시 내일 하루의 <strong>시간관리 공부법</strong>을 더 치열하게 완수해 낼 수 있는 든든한 원동력이 되어 줍니다.</p>
    
    <p>더 상세하고 다양한 분야의 활용 가이드나 예적금 이율을 시각화할 수 있는 유용한 도구들은 <a href="https://www.murimbook.com" target="_blank" rel="noopener" style="color: #ffd43b; text-decoration: underline; font-weight: bold;">무림북 오디오북 웹 어플리케이션</a>에서 간편하게 연동하여 사용하실 수 있습니다. 또한, 시간 관리에 대한 심리학적 메커니즘을 보다 학술적으로 연구해보고 싶으시다면 위키백과의 <a href="https://ko.wikipedia.org/wiki/%ED%8F%AC%EB%AA%A8%EB%8F%84%EB%A1%9C_%EA%B8%B0%EB%B2%95" target="_blank" rel="noopener" style="color: #ffd43b; text-decoration: underline; font-weight: bold;">포모도로 기법 위키백과</a> 문서도 함께 깊게 확인해보시기를 추천드립니다.</p>
    
    <p>오늘 당장 삶을 180도 고치려 무리하지 말고, 오늘 딱 1시간만 스마트폰을 멀리 두고 집중하는 '작은 승리'부터 맛보시길 바랍니다. 그 클릭 한 번과 작은 실천이 여러분의 학습 미래와 집중력 인생을 통째로 뒤바꾸어 놓을 것입니다. 모두 성공적인 자기계발과 시간관리 목표 성취를 이루시길 응원합니다.</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #9ca3af;">
      #시간관리 #공부법 #집중력향상 #자기계발 #생산성 #뽀모도로 #학습전략 #몰입
    </p>
    """
    return html

def upload_post(featured_img_path, sub_img_path):
    title = "시간관리 공부법 정복: 집중력 향상을 통해 목표 달성하는 4가지 실전 학습 전략"
    
    # 1. 대표 이미지 업로드 및 ID 획득
    featured_media_id = None
    if featured_img_path:
        featured_media_id, _ = upload_image(
            featured_img_path, 
            alt_text="시간관리 공부법 집중력 향상 비결", 
            caption="시간관리와 스마트 공부법을 통한 집중력 향상 테크닉", 
            desc="대표 이미지 - 16:9 규격 최적화 비주얼"
        )
        
    # 2. 본문 중간 이미지 업로드 및 URL 획득
    sub_media_url = None
    if sub_img_path:
        _, sub_media_url = upload_image(
            sub_img_path, 
            alt_text="시간관리 공부법 집중력 연구 일러스트", 
            caption="뇌 과학 기반의 시간관리 공부법 실천 프로세스 구성도", 
            desc="본문 삽입 이미지 - 16:9 규격 프로세스 일러스트"
        )
        
    content = get_post_content(sub_media_url)
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # 랭크매스 SEO 플러그인용 메타데이터 동시 제어 (100점 공략)
    post_data = {
        "title": title,
        "content": content,
        "status": "draft",
        "meta": {
            "_rank_math_focus_keyword": "시간관리 공부법",
            "_rank_math_title": "%title% %page% %sep% %sitename%",
            "_rank_math_description": "시간관리 공부법 핵심 노하우를 공개합니다. 집중력 향상을 돕는 뽀모도로 기법과 에빙하우스 간격 복습 전략을 통해 단기간에 목표를 성취해 보세요.",
            "_rank_math_permalink": "time-management-study-strategy"
        }
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
            print("\n[SUCCESS] 100-Point SEO Post successfully uploaded to WordPress!")
            print(f"Edit Link: {response.json().get('link')}")
        else:
            print(f"\n[FAILED] Upload failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    featured_img = "C:\\Users\\owner\\.gemini\\antigravity\\brain\\820f16a8-6613-4149-ae20-d9f890d29a2b\\time_management_wp_cover_1783009911585.jpg"
    sub_img = "C:\\Users\\owner\\.gemini\\antigravity\\brain\\820f16a8-6613-4149-ae20-d9f890d29a2b\\time_management_sub_image_1783011053445.jpg"
    upload_post(featured_img, sub_img)
