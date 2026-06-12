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

def generate_modern(prompt, description="요청"):
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
print("💼 [무림북 현대물 전문 자동화 시스템 가동] 🏙️")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 현대물 플롯 데이터베이스
# ==========================================
MODERN_POOL = [
    "지방대 출신의 말단 사원이 가문의 비밀 유산인 천재적인 경영 두뇌를 각성하여 대기업의 내부 권력 투쟁을 박살 내고 회장 자리까지 올라가는 스토리",
    "천재적인 절대 미각과 주방 통제력을 가진 무명 요리사가 망해가는 골목 식당부터 시작해 세계 최고의 미슐랭 쓰리스타 기업을 일구는 스토리",
    "빽 없고 돈 없는 흙수저 출신 천재 변호사가 거대 로펌과 부패한 정재계 거물들을 법의 칼날과 치밀한 설계로 하나씩 무너뜨리는 사이다 법정 스토리",
    "동대문 옷가게 밑바닥부터 시작해 기발한 마케팅 Tobacco 디자인 감각으로 파리 패션위크를 뒤흔들고 글로벌 패션 제국을 건설하는 패션 왕 스토리",
    "천재적인 작곡 및 프로듀싱 능력을 숨긴 채 살아온 무명 연습생이 메가 히트곡을 연달아 터뜨리며 엔터테인먼트 시장의 판도를 바꾸는 음악 천재 스토리"
"지방대 출신의 말단 사원이 가문의 비밀 유산인 천재적인 경영 두뇌를 각성하여 대기업의 내부 권력 투쟁을 박살 내고 회장 자리까지 올라가는 스토리",
    "천재적인 절대 미각과 주방 통제력을 가진 무명 요리사가 망해가는 골목 식당부터 시작해 세계 최고의 미슐랭 쓰리스타 기업을 일구는 스토리",
    "빽 없고 돈 없는 흙수저 출신 천재 변호사가 거대 로펌과 부패한 정재계 거물들을 법의 칼날과 치밀한 설계로 하나씩 무너뜨리는 사이다 법정 스토리",
    "동대문 옷가게 밑바닥부터 시작해 기발한 마케팅과 디자인 감각으로 파리 패션위크를 뒤흔들고 글로벌 패션 제국을 건설하는 패션 왕 스토리",
    "천재적인 작곡 및 프로듀싱 능력을 숨긴 채 살아온 무명 연습생이 메가 히트곡을 연달아 터뜨리며 엔터테인먼트 시장의 판도를 바꾸는 음악 천재 스토리",
    "강남의 평범한 부동산 중개업자 청년이 도시 개발 계획과 땅의 미래 가치를 꿰뚫어 보는 미친 안목을 각성해 수십 조 원대의 빌딩 부자가 되는 스토리",
    "과거 천재 바둑 기사였으나 불의의 사고로 은퇴한 주인공이, 월가의 헤지펀드 트레이더로 스카우트되어 주식 시장의 모든 판세를 바둑판 보듯 읽어내며 수조 원을 벌어들이는 스토리",
    "삼류 대학 병원의 펠로우로 구박받던 천재 외과의사가 신의 손이라 불리는 전설적인 천재 수술 기법을 복원하여 세계 최고의 병원장들을 줄 세우는 메디컬 명작 스토리",
    "과거 국정원 특수 요원이었으나 신분을 숨기고 평범한 고등학교 경비원으로 살아가던 주인공이, 학교를 습격한 거대 다국적 테러리스트들을 홀로 조용히 사냥하는 스릴러 대작 스토리",
    "대한민국 최하위 꼴찌 프로야구단의 단장으로 부임한 천재 데이터 분석가가 낡은 구단 시스템을 완전히 갈아엎고 기적의 사이다 연속 우승을 달성하는 스포츠 매니지먼트 스토리"
]

HISTORY_FILE = "modern_history.txt"

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

    available_plots = [p for p in MODERN_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 현대물 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = MODERN_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 현대물 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 현대물 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 현대물 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 직업 정점형: 백만장자 천재 변호사, 미슐랭 쓰리스타 주방장이 되었다
2) 밑바닥 반전형: 대기업 막내사원이 경영을 너무 잘함, 동대문 옷가게에서 패션왕까지
3) 사이다 천재형: 나 혼자 탑티어 프로듀서, 흙수저 천재 변호사의 법정 설계

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_modern(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 현대물"
    novel_intro = "무림북이 선보이는 현실감 넘치는 사이다 현대물 대작."
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
response_1_25_text = generate_modern(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_modern(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 판타지나 무협 요소(상태창, 마법, 내공, 무공 초식 등)를 절대 넣지 마십시오. 철저히 현실적인 기술과 지식으로 승부하는 현대물입니다.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 현대 비즈니스 현장의 긴장감 넘치는 PPT 발표, 주주총회, 계약 협상, 법정 공방 등의 장면을 전문 용어를 섞어 매우 치밀하고 쫄깃하게 묘사하십시오.
- 주인공의 신들린 능력을 보고 무시하던 직장 상사, 거대 재벌가 회장들이 식은땀을 흘리며 감탄하는 장면을 배치하십시오.
- 문장은 웹소설 호흡에 맞게 짧게 자주 줄바꿈을 해주시고, 대사 비중을 40% 이상 유지하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_현대_{{safe_title}}"
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
            previous_summary = generate_modern(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 현대물 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_modern(prompt, f"{{chapter}}화 본문 집필")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_modern(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 현대물 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")