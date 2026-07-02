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

def generate_modern_fantasy(prompt, description="요청"):
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
print("🏢 [무림북 현대 판타지 무한 자동화 시스템 가동] ⚡")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 수십 가지 현대 판타지 플롯 데이터베이스
# ==========================================
MODERN_FANTASY_POOL = [
    "f급 하급 헌터로 구르던 주인공이 대격변 이전 과거로 회귀하여 미래의 던전 정보와 주식 정보를 독점해 세계 1위 재벌이자 최강자가 되는 스토리",
    "전 세계에서 유일하게 마법과 무공이 존재하지 않는 현대 사회에서 홀로 '네크로맨서' 히든 클래스로 각성해 그림자 군대를 이끄는 스토리",
    "만년 대리이자 흙수저였던 주인공이 어느 날 스마트폰에 '신의 투자 앱'이 설치되면서 미래 상한가 주식과 코인을 미리 보고 대한민국을 매수하는 스토리",
    "던전에서 동료들에게 배신당하고 죽어가던 순간, 보스의 심장을 삼키고 '무한 흡수' 특성을 얻어 전 세계 게이트를 혼자 씹어먹는 먼치킨 스토리",
    "탑급 연예 기획사의 막내 매니저가 눈앞에 연예인들의 '성능 등급과 미래 스타성 수치'가 상태창으로 보이게 되면서 엔터계를 지배하는 대부로 성장하는 스토리"
 "대한민국 최악의 흙수저였던 주인공이 IMF 직전으로 회귀하여 미래 지식으로 월가를 집어삼키는 재벌물 스토리",
    "지방대 출신의 만년 인턴 의사가 눈앞에 '천재 의사의 수술 상태창'을 얻어 세계적인 신의로 거듭나는 전문직 스토리",
    "지독하게 연기를 못해 구박받던 무명 배우가 사후 세계에서 고대 대배우들의 영혼을 흡수하여 연기 천재가 되는 스토리",
    "평범한 회사원이었으나 내일 아침 네이버 실시간 검색어와 주식 등락률이 미리 보이는 스마트폰을 얻게 되는 스토리",
    "무릎 부상으로 은퇴한 비운의 축구 선수가 10년 전 고교 시절로 회귀하여 '축구의 신 스킬 상태창'을 깨우는 스토리",
    "현대 서울 한복판에 대형 던전이 열리고, 각성자 중 유일하게 '몬스터 제작 및 합성' 권능을 얻은 헌터 스토리",
    "사법고시 장수생이 사람의 이마 위에 그 사람이 지은 죄와 형량이 텍스트로 보이는 사이다 검사물 스토리",
    "망해가는 아이돌 기획사의 로드 매니저가 멤버들의 미래 흥행 지수와 잠재력이 능력치로 보이는 천재 프로듀서 스토리",
    "평범한 국밥집 아들이 전 세계 모든 요리의 레시피와 절대 미각을 주는 '요리사의 시스템'을 얻는 미식 현판 스토리",
    "말단 웹툰 PD가 미래에 1위를 할 대박 웹툰 작가들의 리스트를 스마트폰 메일로 받으면서 업계를 지배하는 스토리",
    "강남의 삼류 부동산 중개업자가 땅 밑에 묻힌 금괴와 3년 뒤 개발될 핵심 요지의 정보가 홀로그램으로 보이는 스토리",
    "천재적인 두뇌를 가졌으나 음모로 가문이 몰락한 주인공이 대한민국 서열 1위 대기업의 막내아들로 환생하는 스토리",
    "현대 사회의 평범한 공무원이 고대 군주들의 통치 스킬을 각성하여 정계와 재계를 뒤흔드는 막후 플레이어 스토리",
    "싸구려 모조품을 팔던 골동품상 주인이 사물의 진품 여부와 숨겨진 역사적 가치가 감정창으로 보이는 스토리",
    "천재 피아니스트였으나 사고로 손을 다친 주인공이 음악의 요정들과 계약하여 전 세계를 울리는 작곡가로 부활하는 스토리",
    "만년 하위권을 전전하던 프로야구 구단의 만년 후보 투수가 '야구 시스템 코인 장터'를 열어 메이저리그를 평정하는 스토리",
    "서울에 게이트가 폭발한 아포칼립스 세계관에서 오직 나 혼자만 안전한 집(쉘터)을 무한 업그레이드할 수 있는 스토리",
    "평범한 웹소설 작가가 자신이 쓴 소설의 내용이 내일부터 현실 세계에 그대로 구현되는 능력을 얻게 되는 스토리",
    "대기업에서 이용만 당하고 버려진 천재 엔지니어가 대학생 시절로 회귀하여 자신만의 독점 기술로 실리콘밸리를 점령하는 스토리",
    "우연히 '신들의 변호사 사무실'에 고용되어 현실 세계의 억울한 귀신들과 신들의 소송을 맡아 승소하는 천재 변호사 스토리"

]

HISTORY_FILE = "modern_fantasy_history.txt"

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

    available_plots = [p for p in MODERN_FANTASY_POOL if p not in used_plots]

    if not available_plots:
        print("🔄 [안내] 모든 현대 판타지 플롯을 한 번씩 다 사용했습니다! 히스토리를 리셋하고 처음부터 다시 시작합니다.")
        used_plots = []
        available_plots = MODERN_FANTASY_POOL.copy()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)

    selected_plot = random.choice(available_plots)

    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f:
        h_f.write(selected_plot + "\n")

    print(f"🎲 [중복 제외 엔진] 이번 현대 판타지 연재작 소재: {{selected_plot}}")
    print("--------------------------------------------------")
    print("🤖 [1단계] 무림북 트렌디 기획 및 100자 소개글 빌드 시작...")

    prompt_msg = f"""
    당신은 네이버 시리즈와 카카오페이지에서 현대 판타지 장르로 실시간 1위를 쓸어 담는 대한민국 최고의 메가 히트 웹소설 작가이자 스타 PD입니다.
    무림북 독자들이 제목만 보고도 심장이 뛰어서 바로 클릭할 수밖에 없는 트렌디하고 강력한 현대 판타지 소설을 기획해 주세요.

    당신이 이번 작품에서 반드시 중심으로 다루어야 할 [메인 흥행 플롯]은 다음과 같습니다:
    👉 {{selected_plot}}

    [★ 초강력 제목 작성 필수 가이드 공식]
    무조건 아래 최신 웹소설 흥행 제목 공식 중 하나를 채택하여 직관적이고 도파민 터지게 지으십시오:
    1) 회귀/재벌형: 나 혼자 미래 주식 독점, 과거로 간 f급 헌터가 재벌을 매수함
2) 직업/상태창형: 상태창 보는 천재 매니저, 내가 만든 던전 요리가 너무 마약임
3) 먼치킨 사이다형: sss급 게이트 나 혼자 깼다, 무한 흡수로 강해지는 헌터 생활

    [★ 100자 소설 소개글 가이드]
    독자가 연재 목록을 누르기 전, 호기심을 극대화할 수 있는 '작품 소개'를 100자 내외(스포일러 금지)로 핵심 플롯만 강렬하게 작성하십시오.

    [절대 주의 사항]
    - 모든 내용에 한자(漢字) 및 괄호 친 한자 표기는 절대 금지합니다. 오직 순수 한글로만 출력하십시오.

    다른 설명 없이 오직 아래 형식을 칼같이 지켜서 출력해 주세요.
    제목: [여기에 작성]
    소개글: [여기에 작성]
    전체 줄거리: [여기에 작성]
    """

    concept_text = generate_modern_fantasy(prompt_msg, "소설 기획 및 소개글 생성")

    novel_title = "무명 현대 판타지"
    novel_intro = "무림북이 선보이는 도파민 폭발 현대 판타지 대작."
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
response_1_25_text = generate_modern_fantasy(prompt_1_25, "1~25화 시놉시스 생성")

prompt_26_50 = f"소설 <{{novel_title}}> (줄거리: {{overall_plot}})의 26화부터 50화(최종화)까지의 세부 시놉시스를 작성해 주세요. 출력 형식은 '26화: 내용', '27화: 내용' 형태로 50화까지 빠짐없이 적어주세요. 모든 시놉시스 문장은 한자 표기 없이 오직 순수 한글로만 작성하십시오."
response_26_50_text = generate_modern_fantasy(prompt_26_50, "26~50화 시놉시스 생성")

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
1. 상황을 설명하는 서술문 끝에 옛날식 낡은 말투를 절대 쓰지 마십시오. 세련되고 빠른 템포의 현대어 문장(~했다, ~였다)으로 서술하십시오.
2. 본문 어디에도 한자(漢字) 자체 표기를 절대 금지합니다. 오직 순수한 '한글'로만 표기하십시오.
3. 돈은 '원, 달러, 억, 백만 골드', 시간은 '시, 분, 초' 같은 현대 및 게임 판타지 단어만 사용하십시오.
4. 소설 본문이 아닌 다른 잡설은 절대 출력하지 마십시오.

[권장 스타일]
- 주인공의 눈앞에 나타나는 파란색 격자 모양의 [상태창] 및 스킬 알림창 묘사를 각 화마다 최소 1회 이상 임팩트 있게 집필하십시오.
- 주인공의 말도 안 되는 빠른 성장이나 주식 폭등을 보고 주변 재벌이나 길드장들이 경악하며 감탄하는 '사이다 리액션'을 상세히 묘사하십시오.
- 문장은 웹소설 호흡에 맞게 짧게 자주 줄바꿈을 해주시고, 대사 비중을 40% 이상 유지하십시오."""

previous_summary = "없음 (이제 막 이야기가 시작되었습니다.)"

# 폴더 자동 생성
output_dir = f"무림북_현판_{{safe_title}}"
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
            previous_summary = generate_modern_fantasy(summary_prompt, f"{{chapter}}화 기존 줄거리 복구")
        except Exception:
            pass
        continue

    # 파일이 없는 경우에만 새로 집필 가동
    synopsis = synopses[chapter]
    print(f"▓ [{{chapter}}/50화] 현대 판타지 본문 폭풍 생성 중... 🔥")
    
    prompt = f"""
    {{RULES_TEXT}}
    [소설 기본 정보] - 제목: {{novel_title}} - 전체 줄거리: {{overall_plot}}
    [이전 화까지의 핵심 요약] {{previous_summary}}
    [이번 {{chapter}}화의 세부 시놉시스] {{synopsis}}
    위 정보를 바탕으로 {{chapter}}화의 본문을 풍부하고 흡입력 있게 집필해 주세요.
    """
    
    chapter_text = generate_modern_fantasy(prompt, f"{{chapter}}화 본문 집필")
    
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(chapter_text)
    print(f"   ↳ ⚡ {{chapter}}화 초고속 저장 완료! ({{filename}})")
        
    summary_prompt = f"다음 소설 본문을 읽고 주인공의 상태와 주요 상황을 3줄 요약해줘.\n\n[본문]\n{{chapter_text}}"
    previous_summary = generate_modern_fantasy(summary_prompt, f"{{chapter}}화 줄거리 요약")
    
    time.sleep(1)

print("\n==================================================")
print(f"🎉 [공장 가동 완료] 무림북 현대 판타지 카테고리 대작 완결!")
print(f"📂 [{{output_dir}}] 폴더에서 50화 완결본과 소개글을 확인하세요!")
print("==================================================")