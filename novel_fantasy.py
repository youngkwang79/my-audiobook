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

def generate_fantasy(prompt, description="요청"):
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
print("🔮 [무림북 정통 판타지 무한 자동화 시스템 가동] 🐉")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 판타지 플롯 데이터베이스
# ==========================================
FANTASY_POOL = [
    "공작 가문의 쓸모없는 낙제 서자로 태어나 구박받던 주인공이 전설 속 정령왕들과 계약해 대륙 최고의 마법 검사로 성장하는 스토리",
    "인류 최강의 9서클 대마법사가 마왕과의 최종 결전 후 배신당해 죽었으나, 100년 뒤 제국의 초짜 훈련병 소년으로 환생해 다시 정점으로 올라가는 스토리",
    "변방의 멸망해가는 영지를 물려받은 무능한 영주가 우연히 드래곤의 유산을 상속받아 영지를 대륙 최강의 철혈 영지로 부흥시키는 영지물 스토리",
    "마력이 전혀 없어 검술 가문에서 쫓겨난 소년이 고대 거인족의 신체 강화 비술을 깨닫고 마법을 주먹으로 부숴버리는 먼치킨 스토리",
    "제국 최고의 엘리트들이 모이는 아카데미에 만년 전교 꼴찌이자 하급 귀족인 주인공이 입학했으나 숨겨진 유물을 발굴하며 천재들을 압도하는 스토리"
 "제국 최강의 소드마스터가 반역으로 사망한 뒤, 20년 전 아카데미 낙제생 시절로 회귀하는 스토리",
    "멸망한 드래곤 로드가 남긴 마지막 에그를 발견하고, 영혼이 동조되어 드래곤의 권능을 얻은 소년의 스토리",
    "대륙 최악의 막장 영지라 불리는 변방의 백작 가문 서자가 영지 경영 시스템을 얻어 대공국으로 키우는 스토리",
    "마법 재능이 전혀 없는 평범한 광부의 아들이 전설적인 고대 현자의 마도서를 발견하고 9서클 마법사로 성장하는 스토리",
    "신들의 전쟁에서 패배하고 봉인되었던 성기사가 천 년 뒤 마왕의 기운이 다시 싹트는 제국에서 깨어나는 스토리",
    "이계의 용사로 소환되어 마왕을 잡았으나 동료들에게 배신당한 후, 제국의 하급 기사 몸으로 환생하는 스토리",
    "사람의 마법 재능과 검술 잠재력을 수치와 랭크로 볼 수 있는 '감정안'을 각성한 용병단장의 인재 영입 스토리",
    "평생 정령을 보지 못하던 견습 기사가 태초의 정령왕과 계약하여 대륙 유일의 '정령검사'가 되는 스토리",
    "정통 기사 가문의 낙제생 도련님이 사물의 미래 가치와 숨겨진 옵션을 보는 마안을 얻어 유물을 독점하는 스토리",
    "마법 탑의 잔인한 생체 실험실에서 탈출한 노예 소년이 '스킬 복사 상태창'을 각성해 탑주들에게 복수하는 스토리",
    "제국의 황제가 후계자 경쟁에서 독살당한 뒤, 국경 지대 경비대의 가난한 평기사 아들로 환생하여 복수를 도모하는 스토리",
    "정통 서양 마법 아카데미에 입학한 하급 귀족 소년이 이론과 연금술만으로 천재 엘리트들을 참교육하는 스토리",
    "신성 제국의 타락한 추기경들에게 파문당한 성기사가 마족들의 영지로 넘어가 그곳의 영주가 되어 제국을 심판하는 스토리",
    "검술의 한계인 '그랜드마스터'에 도달했으나 늙어 죽기 직전, 마나가 넘쳐나는 신비로운 엘프 수림의 소년으로 환생하는 스토리",
    "차원 상인 시스템을 각성하여 대륙의 희귀한 마법 도구와 엘프의 과실, 난쟁이의 무기를 독점 유통하는 부호 스토리",
    "멸망 위기에 처한 왕국의 막내 왕자가 죽은 영웅들의 영혼을 소환하고 빙의할 수 있는 군주 스킬을 각성하는 스토리",
    "마왕군의 최전방에서 싸우던 스켈레톤 병사가 전생의 기억과 자아를 되찾고 인간 기사로 거듭나는 역발상 환생 스토리",
    "연금술의 대가가 신의 영역에 도전하다 폭발 사고를 당한 뒤, 마법 도시 밑바닥의 고아 소년 몸에서 깨어나는 스토리",
    "대륙을 공포에 떨게 했던 전설적인 네크로맨서가 사후 300년 만에 빛을 섬기는 성황청의 견습 신관 몸으로 빙의하는 스토리",
    "평범한 대장장이가 신공을 발휘해 검에 자아(에고)를 불어넣는 능력을 얻어 에고소드 군단을 만드는 스토리"

]

HISTORY_FILE = "fantasy_history.txt"

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

    available_plots = [p for p in FANTASY_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 판타지 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = FANTASY_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 판타지 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 판타지 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 판타지 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 환생/재기형: 9서클 대마법사는 평범하게 살고 싶다, 낙제 공자가 너무 강함
2) 영지/성장형: 망해가는 영지를 대륙 최강으로, 내 검 끝에 정령왕이 깃든다
3) 아카데미/유물형: 아카데미 꼴찌가 전설의 유물을 주웠다, 나 혼자 거인족 신공

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_fantasy(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 판타지 대작"
    novel_intro = "무림북이 선보이는 서사적이고 웅장한 판타지 대작."
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
response_1_25_text = generate_fantasy(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_fantasy(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 무협 단어(냥, 시진, 내공, 심법) 및 현대 단어(컴퓨터, 스마트폰, 주식)를 절대 금지합니다. 돈은 '골드, 실버', 에너지는 '마나, 서클', 신분은 '공작, 백작' 단어만 사용하십시오.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 검기나 검강이 뿜어지는 소드 마스터의 격돌 묘사, 혹은 마법 서클이 회전하며 불꽃과 번개가 폭발하는 마법 주문 묘사를 최소 3문장 이상 아주 웅장하고 디테일하게 집필하십시오.
- 무능한 줄 알았던 주인공이 능력을 터뜨렸을 때 아카데미 교수나 기사단장들이 입을 쩍 벌리며 경악하는 사이다 리액션을 꼭 포함하십시오.
- 문장은 웹소설 호흡에 맞게 짧게 자주 줄바꿈을 해주시고, 대사 비중을 40% 이상 유지하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_판타지_{{safe_title}}"
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
            previous_summary = generate_fantasy(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 판타지 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_fantasy(prompt, f"{{chapter}}화 본문 집필")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_fantasy(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 판타지 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")