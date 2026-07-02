import os
import time
import re
import random
import sys
from google import genai

# [원천 차단] 윈도우 환경에서 파이썬이 한글을 다룰 때 아스키 에러가 나는 것을 시스템 수준에서 강제로 막습니다.
sys.stdout.reconfigure(encoding='utf-8')

from api_key_loader import GOOGLE_API_KEY

# .env.local 파일에서 로드한 GOOGLE_API_KEY를 사용합니다.
client = genai.Client(api_key=GOOGLE_API_KEY)
MODEL_NAME = 'gemini-2.5-flash'

def generate_romance(prompt, description="요청"):
    """구글 가드레일 및 빈 값(None) 반환 에러를 완벽하게 방어하는 안전 업그레이드 함수"""
    for attempt in range(1, 4):  # 최대 3번까지 자동 재시도
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            if response and response.text and response.text.strip():
                return response.text
            print(f"\n⚠️ [가드레일 감지] 구글 필터링으로 인해 빈 내용이 반환되었습니다. {{attempt}}차 우회 재시도 중...")
            time.sleep(2)
        except Exception as e:
            print(f"\n🔄 [무림북 서버 지연] {{description}} {{attempt}}차 재시도 중... (오류 발생으로 대기)")
            time.sleep(3)
    return "웅장한 운명의 서막이 올랐다. 폭풍전야와 같은 긴장감이 공간을 감돌기 시작했다."

print("==================================================")
print("🌸 [무림북 로맨스 판타지 치명적 자동화 가동] 👑")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 로맨스 판타지 플롯 데이터베이스
# ==========================================
ROMANCE_POOL = [
    "피폐 소설 속 폭군 황제의 손에 목이 잘리는 악역 공녀로 빙의한 주인공이 생존을 위해 황제에게 치명적인 디저트를 바치며 조련하는 스토리",
    "가문과 황태자에게 철저히 이용당하고 독살당한 여주인공이 성인식 전날로 회귀하여, 가문을 무너뜨리기 위해 제국 최고의 괴물 대공에게 계약 결혼을 제안하는 스토리",
    "남장 여주인공이 제국의 냉혈한 소드 마스터 기사단장이 이끄는 정예 기사단에 수석으로 입단하여, 정체를 숨긴 채 기사단장과 아슬아슬한 동거 및 로맨스를 펼치는 스토리",
    "마법 부작용으로 밤마다 거대한 아기 고양이로 변하는 저주에 걸린 냉혹한 북부대공, 우연히 그를 줍게 된 가난한 하급 정령사 여주인공의 심쿵 육아 겸 로맨스 스토리",
    "소설 속 여주인공의 따분한 친구로 빙의했으나, 원작의 집착 남주인공들이 어째서인지 원작 여주가 아닌 나에게 집착하기 시작하는 스토리"
"피폐 소설 속 폭군 황제의 손에 목이 잘리는 악역 공녀로 빙의한 주인공이 생존을 위해 황제에게 치명적인 디저트를 바치며 조련하는 스토리",
    "가문과 황태자에게 철저히 이용당하고 독살당한 여주인공이 성인식 전날로 회귀하여, 가문을 무너뜨리기 위해 제국 최고의 괴물 대공에게 계약 결혼을 제안하는 스토리",
    "남장 여주인공이 제국의 냉혈한 소드 마스터 기사단장이 이끄는 정예 기사단에 수석으로 입단하여, 정체를 숨긴 채 기사단장과 아슬아슬한 동거 및 로맨스를 펼치는 스토리",
    "마법 부작용으로 밤마다 거대한 아기 고양이로 변하는 저주에 걸린 냉혹한 북부대공, 우연히 그를 줍게 된 가난한 하급 정령사 여주인공의 심쿵 육아 겸 로맨스 스토리",
    "소설 속 여주인공의 따분한 친구로 빙의했으나, 원작의 집착 남주인공들이 어째서인지 원작 여주가 아닌 나에게 집착하기 시작하는 스토리",
    "마탑의 까칠하고 냉정하기로 소문난 천재 마탑주가 여주인공이 만든 사랑의 묘약 물약을 실수로 마신 뒤, 밤낮으로 여주인공의 집 앞으로 찾아와 눈물을 흘리며 매달리는 로맨틱 코미디 스토리",
    "몰락한 백작가의 영애인 주인공이 대륙 최고의 정보 길드를 막후에서 운영하는 비밀 상단의 주인임이 밝혀지며, 그녀의 재력을 보고 제국의 황태자가 전재산을 바치며 청혼하는 영리한 여주인공 스토리",
    "신탁에 의해 성녀로 추대되었으나 신전의 부패를 깨닫고 탈출한 주인공이, 제국 최고의 현상금 사냥꾼이자 마왕의 피가 흐르는 하프 엘프 남주인공과 손을 잡고 신전을 뒤엎는 걸크러시 스토리",
    "계모와 이복동생에게 구박받던 주인공이 제국 최고의 보석 감정사 능력을 각성하여 전 대륙의 다이아몬드 유통권을 장악하고 가문을 파멸시키는 사이다 로판 스토리",
    "시한부 판정을 받고 모든 것을 포기한 채 휴양지의 성 성주로 내려간 공녀 주인공이, 그녀를 지키기 위해 신의 기사 자리를 버리고 내려온 집착 여기사 및 기사단장들과의 애절한 구원 로맨스 스토리"
]

HISTORY_FILE = "romance_history.txt"

# ----------------------------------------------------------------------
# 🚨 [이어 쓰기 꿀팁] 아까 쓰다 멈춘 소설을 이어서 쓰고 싶을 때는, 
# 아래 바로 다음 줄의 '#'을 지우고 소설 제목을 직접 적어주시면 됩니다!
# ----------------------------------------------------------------------
# novel_title = "예시제목"  <-- 이어서 쓰고 싶을 때 여기에 폴더명 제목 넣고 '#' 지우기!

# ======================================================================
# 자동 기획 및 중복 체크 연산 (새 작품 시작용 로직)
# ======================================================================
if 'novel_title' not in locals():
    used_plots = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as h_f:
            used_plots = [line.strip() for line in h_f.readlines() if line.strip()]

    available_plots = [p for p in ROMANCE_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 로맨스 판타지 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = ROMANCE_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 로맨스 판타지 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 로맨스 판타지 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 로맨스 판타지 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 피폐 빙의/생존형: 폭군의 과자점에 위장 취업했습니다, 악역 공녀는 생존이 최우선입니다
2) 계약 결혼/회귀형: 괴물 대공님, 저와 계약 결혼해 주세요, 전 남편이 집착하기 시작했다
3) 남장/집착형: 냉혈 기사단장이 내 정체를 모름, 집착 남주들이 나를 놓아주지 않는다

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_romance(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 로맨스 판타지"
    novel_intro = "무림북이 선보이는 애절하고 짜릿한 로맨스 판타지 대작."
    overall_plot = ""

    for line in concept_text.split('\n'):
        if line.startswith("제목:"):
            novel_title = line.replace("제목:", "").strip()
        if line.startswith("소개글:"):
            novel_intro = line.replace("소개글:", "").strip()
        if line.startswith("전체 줄거리:"):
            overall_plot = line.replace("전체 줄거리:", "").strip()
else:
    novel_intro = "이어서 쓰는 중"
    overall_plot = "이어서 쓰는 중"

safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()

print(f"▶ [기획 확정] 🔥트렌디 신작 제목🔥: < {{novel_title}} >")
print(f"▶ [100자 소개글]: {{novel_intro}}")
print(f"▶ 1화~50화 전체 시놉시스 초고속 빌드를 시작합니다...")

prompt_1_25 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 1화부터 25화까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '1화: 내용', '2화: 내용' 형태로 25화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_1_25_text = generate_romance(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_romance(prompt_26_50, "26~50화 시놉시스 생성")

full_synopsis_text = response_1_25_text + "\n" + response_26_50_text

synopses = {}
for i in range(1, 51):
    search_key = f"{{i}}화:"
    if search_key in full_synopsis_text:
        part = full_synopsis_text.split(search_key)[1]
        next_key = f"{{i+1}}화:"
        if next_key in part:
            synopses[i] = part.split(next_key)[0].strip()
        else:
            synopses[i] = part.split("\n\n")[0].strip()
    else:
        synopses[i] = f"{{novel_title}}의 흥미진진한 제 {{i}}화 스토리가 전개됩니다."

print("▶ 1화부터 50화까지의 모든 시놉시스 장전 완료!")
print("==================================================")
print("✍️ [2단계] 무림북 연재본 초고속 50화 연속 집필 폭주")
print("==================================================")

RULES_TEXT = """[절대 금지 사항]
1. 거칠고 투박한 남초 무협 어조나 마물 중심의 묘사는 배제하십시오. 감정선과 인물 간의 텐션, 화려한 복식 묘사에 집중하십시오.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 북부대공 등 남주인공의 차가우면서도 여주인공에게만 흔들리는 눈빛, 조각 같은 턱선, 묵직하고 매력적인 목소리를 심장이 간질거릴 정도로 디테일하게 묘사하십시오.
- 사교계 무도회, 화려한 드레스, 보석 문화 등의 귀족 사회 배경을 감각적이고 아름다운 어휘로 최소 3문장 이상 묘사하십시오.
- 문장은 호흡이 섬세하게 이어지도록 줄바꿈을 조절하시고, 설레는 대사 비중을 40% 이상 유지하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_로맨스_{{safe_title}}"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# [최초 1회 실행] 작품 정보 파일 저장
info_filename = os.path.join(output_dir, f"00_🚨작품소개_및_기획안🚨.txt")
if not os.path.exists(info_filename):
    with open(info_filename, "w", encoding="utf-8") as info_f:
        info_f.write(f"■ 작품 제목: {{novel_title}}\n")
        info_f.write(f"■ 100자 소개글: {{novel_intro}}\n")
        info_f.write(f"■ 메인 플롯 소스: {{selected_plot}}\n")
        info_f.write(f"■ 전체 시놉시스 요약:\n{{overall_plot}}\n")
    print(f"   ↳ 📄 작품 핵심 소개글 파일 저장 완료! ({{info_filename}})")

# 1화부터 50화까지 집필 (자동 이어 쓰기 체크포인트 연동)
for chapter in range(1, 51):
    filename = os.path.join(output_dir, f"{{chapter:02d}}화_{{safe_title}}.txt")
    
    # [핵심] 이미 씌어진 파일이 있다면 읽어서 요약만 갱신하고 스킵!
    if os.path.exists(filename):
        print(f"⏭️ [{{chapter}}/50화] 이미 집필된 파일이 확인되어 패스합니다. (이어 쓰기 작동)")
        try:
            with open(filename, "r", encoding="utf-8") as f:
                existing_text = f.read()
            summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{existing_text}}"
            previous_summary = generate_romance(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 로맨스 판타지 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_romance(prompt, f"{{chapter}}화 본문 집필")
    
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_romance(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 로맨스 판타지 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")