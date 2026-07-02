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

def generate_moorim_fusion(prompt, description="요청"):
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
print("⚔️ [무림북 판타지 무협 자동화 시스템 가동] 🔮")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 판타지 무협 플롯 데이터베이스
# ==========================================
FUSION_PLOT_POOL = [
    "중원을 제패한 천하제일 마교의 교주가 마황과의 대결 후 죽었으나, 판타지 대륙 마법 명문 가문의 낙제 서자로 환생해 마나 대신 '내공'을 쌓으며 대륙을 경악시키는 스토리",
    "판타지 세계의 8서클 대마법사가 차원 균열에 휩쓸려 중원 무림, 기경팔맥이 모두 막힌 남궁세가의 천치 소가주 몸으로 환생하여 마법 진법과 마력 심법으로 강호를 씹어먹는 스토리",
    "화산파의 멸문 위기를 맞은 매화검객 주인공이 우연히 판타지 세계의 정령계로 차원 이동하여, 검 끝에 불과 바람의 정령을 깃들여 중원으로 귀환해 복수하는 스토리",
    "사천당가의 천재 독왕이 드래곤의 둥지(레어)로 차원 이동하여, 드래곤의 마법 재료들과 고대 암기술을 결합해 대륙 최초의 '마법 살수 가문'을 창조하는 스토리",
    "중원의 몰락한 표국의 표사가 판타지 세계와 통하는 비밀 게이트를 발견하고, 중원의 신비한 영약과 판타지 세계의 아티팩트를 밀무역하며 양대 세계관의 최고 부유한 절대자가 되는 스토리"
    "차원 이동한 8서클 대마법사가 몰락한 화산파의 맹인 서자로 빙의하는 스토리",
    "드래곤이 인간 유희를 위해 마교의 시한부 소교주 몸으로 들어가 강호를 평정하는 스토리",
    "무림 한가운데에 이계의 게이트가 열리고, 정파 무사들이 '헌터' 시스템을 얻어 레이드하는 스토리",
    "대마법사에게 소환당해 마법 아카데미의 검술 교관이 된 북해빙궁주의 판타지 참교육 스토리",
    "서양 정령들과 계약하여 최초의 '정령검술'을 창시하고 무림맹을 뒤흔드는 천재 스토리",
    "이계의 성기사가 무림의 악명 높은 사파 혈교의 살수로 환생하여 협을 행하는 스토리",
    "강호에 네크로맨서의 권능이 나타나, 죽은 무림 고수들을 강시 대신 스켈레톤으로 부리는 스토리",
    "판타지 세계의 연금술사가 무림의 당가 서자로 빙의하여 마법 포션과 독공을 융합하는 스토리",
    "드래곤의 심장(드래곤 하트)을 먹고 기경팔맥 대신 마나 서클을 돌리는 무림 천재 스토리",
    "마왕과의 최종 결전 중 무림 세계의 소림사 방장실로 튕겨 나간 용사의 강호 적응기 스토리",
    "이계의 정령왕이 소환 의식 오류로 무림 팽가의 뚱뚱한 꼴통 도련님 몸에 깃드는 스토리",
    "서양 검술 마스터가 늙어 죽은 뒤, 무림의 삼류 표국의 짐꾼 소년으로 환생하는 스토리",
    "무림맹주가 눈을 떠보니 판타지 세계 아카데미의 열등생이자 낙제생이 되어 있는 스토리",
    "마법 제국의 황제가 반역을 당해 죽은 후, 마교의 지하 감옥에 갇힌 노예로 깨어나는 스토리",
    "기사단의 단장이 무림의 천하제일 가문인 남궁세가의 가주 몸에 빙의하여 검기를 마나처럼 쓰는 스토리",
    "판타지 세계의 천재 암살자가 무림의 하오문 밑바닥 구걸 소년으로 환생해 정보 조직을 지배하는 스토리",
    "차원 이동 시스템을 얻어 월요일은 무림, 화요일은 판타지 세계를 오가며 양쪽 기술을 밀무역하는 스토리",
    "신들의 전쟁에서 패배한 전쟁의 신이 무림의 평범한 대장장이 아들로 태어나 신성 무기를 제련하는 스토리",
    "몬스터의 능력을 흡수하는 '바바리안' 전사가 무림의 야수파(수왕가) 후계자로 빙의하는 스토리",
    "마법 탑의 탑주가 무림의 전설적인 의가에 서자로 태어나 신성 마법과 혈자리를 결합해 신의가 되는 스토리"

]

HISTORY_FILE = "moorim_fusion_history.txt"

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

    available_plots = [p for p in FUSION_PLOT_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 판타지 무협 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = FUSION_PLOT_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 판타지 무협 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 판타지 무협 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 판타지 무협 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 무협 고수 -> 판타지 대륙: 마교교주 백작 가문 서자 되다, 천하제일인의 검 끝에 정령이 깃듦
2) 판타지 고수 -> 중원 무림: 8서클 대마법사는 남궁세가의 서자, 엘프 마법으로 무림 제패
3) 차원 밀무역/이동형: 무림 표사가 판타지 게이트를 열어버림, 당가 독왕의 판타지 살수 아카데미

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_moorim_fusion(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 판타지 무협"
    novel_intro = "무림북이 선보이는 경이로운 퓨전 판타지 무협 대작."
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
response_1_25_text = generate_moorim_fusion(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_moorim_fusion(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 상황을 설명하는 서술문(지문) 끝에 (~지, ~으니, ~네, ~소, ~였다네) 같은 구어체/독백체 어미를 절대 쓰지 마십시오.
2. 본문 어디에도 한자(漢字) 자체나 괄호 안에 한자를 병기하는 행위를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 중원의 무공(내공, 기경팔맥, 매화검기, 강기)과 서양 판타지(마나 서클, 파이어볼, 드래곤)가 격돌하거나 융합하는 전투 묘사를 최소 3문장 이상 웅장하게 집필하십시오.
- 서양식 오라를 쓰는 기사단장이 주인공이 펼치는 무협식 '검강'을 보고 경악하는 '주변인 사이다 리액션'을 꼭 포함하십시오.
- 문장은 웹소설 호흡에 맞게 짧게 자주 줄바꿈을 해주시고, 대사 비중을 40% 이상 유지하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_퓨전_{{safe_title}}"
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
            previous_summary = generate_moorim_fusion(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 판타지 무협 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_moorim_fusion(prompt, f"{{chapter}}화 본문 집필")
    
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_moorim_fusion(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 판타지 무협 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")