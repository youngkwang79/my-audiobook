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

def generate_horror(prompt, description="요청"):
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
print("👁️ [무림북 미스터리 호러 잔혹 자동화 가동] 🩸")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 호러 미스터리 플롯 데이터베이스
# ==========================================
HORROR_POOL = [
    "매일 밤 12시가 되면 기괴한 규칙들이 적힌 쪽지가 발견되는 가문의 대저택, 그 규칙을 어긴 사람들이 하나씩 흔적도 없이 사라지는 심리 공포 스토리",
    "새로 이사 간 아파트 지하 3층 주차장에서 벽 뒤로 들려오는 의문의 울음소리를 조사하던 주인공이 건물의 숨겨진 잔혹한 인체 제사의 역사와 마주하는 스토리",
    "인터넷에서 화제가 된 폐교체험 스트리머 팀이 실시간 방송 도중, 들어올 때는 없었던 '실제 존재하지 않는 13번째 교실'에 갇히며 벌어지는 리얼 타임 생존 호러 스토리",
    "죽은 사람의 기억을 볼 수 있는 영매 주인공이 연쇄 실종 사건이 발생한 시골 외딴 마을의 무당 가문에 잠입했다가 마을 전체가 모시는 기괴한 사신을 목격하는 스토리",
    "스마트폰에 깔린 의문의 괴담 어플, 하루에 하나씩 어플에 배달되는 잔혹 괴담이 실제 주변 인물들에게 그대로 실현되기 시작하며 숨 막히게 조여오는 공포 스토리"
"매일 밤 12시가 되면 기괴한 규칙들이 적힌 쪽지가 발견되는 가문의 대저택, 그 규칙을 어긴 사람들이 하나씩 흔적도 없이 사라지는 심리 공포 스토리",
    "새로 이사 간 아파트 지하 3층 주차장에서 벽 뒤로 들려오는 의문의 울음소리를 조사하던 주인공이 건물의 숨겨진 잔혹한 인체 제사 History와 마주하는 스토리",
    "인터넷에서 화제가 된 폐교체험 스트리머 팀이 실시간 방송 도중, 들어올 때는 없었던 '실제 존재하지 않는 13번째 교실'에 갇히며 벌어지는 리얼 타임 생존 호러 스토리",
    "죽은 사람의 기억을 볼 수 있는 영매 주인공이 연쇄 실종 사건이 발생한 시골 외딴 마을의 무당 가문에 잠입했다가 마을 전체가 모시는 기괴한 사신을 목격하는 스토리",
    "스마트폰에 깔린 의문의 괴담 어플, 하루에 하나씩 어플에 배달되는 잔혹 괴담이 실제 주변 인물들에게 그대로 실현되기 시작하며 숨 막히게 조여오는 공포 스토리",
    "폭설로 고립된 산장, 7명의 등산객 중 한 명이 살해당했다. 하지만 범인을 추적할수록 숨겨진 생존 규칙을 지키지 않으면 산장 자체가 사람을 집어삼킨다는 기괴한 저주를 깨닫는 스토리",
    "대형 종합병원 영안실의 야간 경비원으로 취직한 주인공이, 매일 새벽 3시가 되면 시체 냉장고 안에서 정기적으로 두드리는 노크 소리의 비밀과 병원 내부의 불법 장기 매매 괴담을 파헤치는 스토리",
    "인간과 똑같이 생긴 존재가 밤마다 거리를 활보하며 사람들의 이름을 부르고, 그 이름에 대답한 이들은 다음 날 목 밑으로 살점이 사라진 채 발견되는 도시 전설 추적 스토리",
    "시간이 멈춘 어느 시골 기차역에 잘못 내린 주인공이, 낮이 오지 않고 영원한 밤만 지속되는 그 기괴한 역에서 탈출하기 위해 매 시간마다 철로 위를 걸어오는 역무원 귀신들과 사투를 벌이는 스토리",
    "독서실 맨 구석 자리에 앉은 사람마다 일주일 안에 스스로 목숨을 끊는 저주받은 고시원, 그 비밀을 밝히기 위해 직접 그 자리에 앉아 공부를 시작한 형사의 숨 막히는 심리 스릴러 호러 스토리"
]

HISTORY_FILE = "horror_history.txt"

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

    available_plots = [p for p in HORROR_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 호러 미스터리 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = HORROR_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 호러 미스터리 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 호러 미스터리 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 호러 미스터리 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 나폴리탄 규칙형: 이 저택의 규칙을 절대 읽지 마십시오, 지하 주차장의 13번째 경고문
2) 생존/방송형: 심야 폐교 스트리밍 생존기, 내 스마트폰에 괴담이 배달된다
3) 미스터리 속박형: 그 시골 마을이 숨긴 기괴한 비밀, 죽은 자의 기억이 말을 건다

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_horror(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 미스터리 호러"
    novel_intro = "무림북이 선보이는 숨 막히는 공포와 기괴한 미스터리 대작."
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
response_1_25_text = generate_horror(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_horror(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 너무 허무맹랑한 판타지 난사나 개그 요소를 절대 금지합니다. 독자가 서늘함을 느끼도록 현실적인 촉감과 기괴한 시각 묘사에 집중하십시오.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 피 비린내, 온도가 급격히 떨어지는 공기, 어둠 속에서 들려오는 관절 꺾이는 소리, 벽을 긁는 손톱 소리 등 오감을 자극하는 공포 묘사를 최소 3문장 이상 숨 막히게 서술하십시오.
- 주인공이 위기에 직면했을 때 심장이 터질 것 같은 호흡, 식은땀, 온몸의 털이 곤두서는 공포의 심리 묘사를 극대화하십시오.
- 문장은 템포를 빠르게 조절하여 긴장감을 최고조로 높이고 줄바꿈을 거칠고 불규칙하게 활용하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_호러_{{safe_title}}"
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
            previous_summary = generate_horror(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 호러 미스터리 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_horror(prompt, f"{{chapter}}화 본문 집필")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_horror(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 호러 미스터리 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")