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

def generate_noir(prompt, description="요청"):
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
print("🚬 [무림북 정통 느와르 혈전 자동화 가동] 🕶️")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 정통 느와르 플롯 데이터베이스
# ==========================================
NOIR_POOL = [
    "조직의 보스를 위해 10년간 감옥에서 썩고 나온 주인공이, 자신을 배신하고 은퇴시키려 한 조직의 핵심 간부들을 상대로 도끼 한 자루를 들고 피의 사격을 시작하는 스토리",
    "대한민국 최대 범죄 조직인 '골드문'에 위장 잠입한 언더커버 경찰 주인공이 보스의 두터운 신임을 얻으며 실제 조직의 2인자 자리에 오르자 정체성에 혼란을 느끼는 스토리",
    "명성이 자자한 밤의 세계 해결사였으나 손을 씻고 포장마차를 하던 주인공이, 하나뿐인 여동생을 건드린 거대 사채업자 파를 혼자서 멸문시켜 버리는 처절한 복수 스토리",
    "부패한 검사와 거대 마약 카르텔이 결탁한 항구 도시 인천, 그곳에서 법을 믿지 않고 주먹과 권총으로 악인들을 가차 없이 사냥하는 독종 형사의 차가운 액션 스토리",
    "무자비한 칼잡이로 살아가던 남자가 우연히 보호하게 된 꼬마 아이를 지키기 위해, 자신이 몸담았던 전국의 거대 조직 전체를 적으로 돌리고 밤의 거리에서 사투를 벌이는 스토리"
"조직의 보스를 위해 10년간 감옥에서 썩고 나온 주인공이, 자신을 배신하고 은퇴시키려 한 조직의 핵심 간부들을 상대로 도끼 한 자루를 들고 피의 사격을 시작하는 스토리",
    "대한민국 최대 범죄 조직인 '골드문'에 위장 잠입한 언더커버 경찰 주인공이 보스의 두터운 신임을 얻으며 실제 조직의 2인자 자리에 오르자 정체성에 혼란을 느끼는 스토리",
    "명성이 자자한 밤의 세계 해결사였으나 손을 씻고 포장마차를 하던 주인공이, 하나뿐인 여동생을 건드린 거대 사채업자 파를 혼자서 멸문시켜 버리는 처절한 복수 스토리",
    "부패한 검사와 거대 마약 카르텔이 결탁한 항구 도시 인천, 그곳에서 법을 믿지 않고 주먹과 권총으로 악인들을 가차 없이 사냥하는 독종 형사의 차가운 액션 스토리",
    "무자비한 칼잡이로 살아가던 남자가 우연히 보호하게 된 꼬마 아이를 지키기 위해, 자신이 몸담았던 전국의 거대 조직 전체를 적으로 돌리고 밤의 거리에서 사투를 벌이는 스토리",
    "과거 카지노 세계를 주름잡던 은퇴한 전설의 타짜가, 자신의 손가락을 자른 신흥 조폭 세력의 거대 도박판 설계에 뛰어들어 목숨과 수천억 원의 판돈을 걸고 마지막 복수극을 펼치는 스토리",
    "화려한 홍콩의 밤거리 뒤편, 조직의 자금을 관리하는 천재 회계사 여주인공과 그녀를 암살하라는 명령을 받았으나 차마 쏘지 못하고 조직을 배신한 고독한 일류 살수의 도피 및 액션 스토리",
    "서울 한복판, 세력 다툼 세대교체기가 찾아온 범죄 연합체에서 밑바닥 행동대장 소년이 냉혹한 두뇌 플레이와 자비 없는 칼질로 선배 보스들을 하나씩 숙청하며 암흑가 정점에 서는 정통 피카레스크 스토리",
    "불법 사설 도박 투기장에서 평생 개처럼 싸우던 인간 병기 주인공이, 자신을 노예처럼 부리던 거대 자본가들의 vvip 매치 현장을 쇠파이프 하나로 피바다로 만들고 탈출하는 하드보일드 액션 스토리",
    "정치권의 더러운 뒷수습을 도맡아 하던 그림자 해결사 조직이 권력자들에게 사냥당하자, 생존한 최정예 대원 3명이 청와대와 국회 정계 거물들의 목숨을 노리며 도심 한복판에서 벌이는 군사 느와르 스토리"
]

HISTORY_FILE = "noir_history.txt"

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

    available_plots = [p for p in NOIR_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 정통 느와르 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = NOIR_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 정통 느와르 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 정통 느와르 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 정통 느와르 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 복수/청산형: 조직이 나를 버린 그날부터, 해결사는 포장마차를 접는다
2) 잠입/갈등형: 언더커버가 보스가 되려 함, 인천항의 마약 카르텔을 깼다
3) 하드보일드형: 나 혼자 조직을 멸문시킴, 그 기사에게 자비는 없다

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_noir(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 정통 느와르"
    novel_intro = "무림북이 선보이는 묵직한 밤의 세계, 피와 담배 연기의 느와르 대작."
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
response_1_25_text = generate_noir(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_noir(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 비현실적인 마법, 초능력, 상태창은 절대 금지합니다. 오직 날것 그대로의 주먹, 칼, 권총, 차량 추격전 등 거칠고 현실적인 하드보일드 액션만 허용합니다.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 빗물에 젖은 밤거리의 아스팔트, 매캐한 담배 연기, 입술에서 터진 핏방울 등 차갑고 쓸쓸한 하드보일드 특유의 분위기를 최소 3문장 이상 서술하십시오.
- 칼날이 부딪치고 주먹이 안면을 강타하는 액션을 날것 그대로 날카롭고 잔인하면서도 절제된 어조로 생생하게 묘사하십시오.
- 문장은 묵직하고 단호한 어조(~했다. ~였다.)로 끊어 치듯 작성하고 비장미를 극대화하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_느와르_{{safe_title}}"
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
            previous_summary = generate_noir(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 정통 느와르 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_noir(prompt, f"{{chapter}}화 본문 집필")
    
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_noir(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 정통 느와르 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")