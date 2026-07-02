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

def generate_history(prompt, description="요청"):
    """구글 가드레일 및 빈 값(None) 반환 에러를 완벽하게 방어하는 안전 업그레이드 함수"""
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            if response and response.text and response.text.strip(): 
                return response.text
            print(f"\n⚠️ [가드레일 감지] 구글 필터링으로 인해 빈 내용이 반환되었습니다. {attempt}차 우회 재시도 중...")
            time.sleep(2)
        except Exception: 
            print(f"\n🔄 [무림북 서버 지연] {description} {attempt}차 재시도 중... (오류 발생으로 대기)")
            time.sleep(3)
    return "조선의 대포가 일제히 포문을 열었다. 역사의 거대한 물줄기가 뒤바뀌는 굉음이 대지에 울려 퍼졌다."

print("==================================================")
print("⚔️ [무림북 대체 역사 국뽕 사이다 자동화 가동] ⚔️")
print("==================================================")

# ==========================================
# 🎲 [무림북 전용] 대형 출판사 기획팀 엄선 대체역사 대박 플롯 10선
# ==========================================
HISTORY_POOL = [
    "현대 국방과학연구소의 천재 무기공학도가 조선 초기의 불운한 세자 향(문종)의 몸으로 빙의하여, 세종대왕을 설득해 증기기관과 근대식 소총을 개발하고 세계를 정벌하는 스토리",
    "임진왜란 직전의 선조의 둘째 아들 광해군으로 빙의한 현대 외교관이, 미래의 침략 역사를 바탕으로 미리 군사력을 결집하고 역으로 일본 대륙과 만주 벌판을 정벌하는 스토리",
    "구한말 고종의 숨겨진 서자 왕족으로 빙의한 현대 특전사 장교가, 부패한 조정을 군사 쿠데타로 장악하고 서구 열강들의 침략을 신무기로 역관광시키는 격동의 스토리",
    "삼국시대 고구려의 바보 온달로 빙의한 역사학과 대학원생이, 철기 생산법과 현대 전술을 도입해 수나라의 백만 대군을 몰살하고 천하를 통일하는 서사 스토리",
    "세조 수양대군에게 죽임을 당하는 단종의 충신 성삼문의 아들로 빙의하여, 미래 계유정난 정보를 바탕으로 역으로 수양대군을 진압하고 조선을 한 단계 진화시키는 스토리",
    "병자호란 직전 인조의 장남 소현세자로 빙의한 현대 통상외교 전문가가 청나라의 대군을 신식 요새와 화포로 전멸시키고 역으로 청나라 황실을 속국으로 삼는 스토리",
    "조선 중기 연산군의 몸으로 빙의한 현대 정신과 의사이자 행정 관료가 폭정을 멈추고 능수능란한 가스라이팅과 개혁으로 신하들을 쥐락펴락하며 조선을 대영제국급으로 키우는 스토리",
    "구한말 척화비를 세우던 흥선대원군의 장남(고종의 형)으로 빙의하여, 서구 열강보다 먼저 미국의 대공황 주식을 매수하고 석유 시추권을 독점해 천문학적인 달러로 대한제국을 세우는 스토리",
    "조선 태종 이방원의 넷째 아들(세종대왕의 동생)로 빙의한 현대 정예 밀리터리 마니아 청년이, 형인 세종대왕의 과학 발전을 군사력으로 치환해 아메리카 대륙을 먼저 발견하는 스토리",
    "고려 무신정권 시대의 노비 만적의 몸으로 빙의한 현대 노동법 변호사이자 전술가가 결사대를 이끌고 정권을 전복, 역사상 최초의 근대식 민주 공화국 고려를 선포하는 스토리"
]

HISTORY_FILE = "history_fiction_history.txt"

# ----------------------------------------------------------------------
# 🚨 [이어 쓰기 꿀팁] 아까 쓰다 멈춘 소설을 이어서 쓰고 싶을 때는, 
# 아래 바로 다음 줄의 '#'을 지우고 소설 제목을 직접 적어주시면 됩니다!
# ----------------------------------------------------------------------
# novel_title = "예시제목" 

# ======================================================================
# 자동 기획 및 중복 체크 연산 (새 작품 시작용 로직)
# ======================================================================
if 'novel_title' not in locals():
    used_plots = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as h_f:
            used_plots = [line.strip() for line in h_f.readlines() if line.strip()]
            
    available_plots = [p for p in HISTORY_POOL if p not in used_plots]
    
    if not available_plots:
        print("🔄 [안내] 모든 대체역사 플롯을 사용했습니다! 히스토리를 리셋합니다.")
        used_plots = []
        available_plots = HISTORY_POOL.copy()
        if os.path.exists(HISTORY_FILE): 
            os.remove(HISTORY_FILE)
            
    selected_plot = random.choice(available_plots)
    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f: 
        h_f.write(selected_plot + "\n")

    prompt_msg = f"""당신은 대체역사 웹소설의 거장입니다. 다음 플롯을 바탕으로 소설을 기획하십시오. 한자 절대 금지.
    플롯: {selected_plot}
    제목 공식: 블랙기업 조선을 바꾸다, 회귀한 세자가 총을 너무 잘 만듦
    출력 형식:
    제목: [작성]
    소개글: [작성]
    전체 줄거리: [작성]"""
    
    concept_text = generate_history(prompt_msg, "기획 생성")
    novel_title, novel_intro, overall_plot = "무명 대체역사", "대체역사 대작", ""
    for line in concept_text.split('\n'):
        if line.startswith("제목:"): novel_title = line.replace("제목:", "").strip()
        if line.startswith("소개글:"): novel_intro = line.replace("소개글:", "").strip()
        if line.startswith("전체 줄거리:"): overall_plot = line.replace("전체 줄거리:", "").strip()
else: 
    novel_intro, overall_plot = "이어서 쓰는 중", "이어서 쓰는 중"

safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()
output_dir = f"무림북_역사_{safe_title}"
if not os.path.exists(output_dir): 
    os.makedirs(output_dir)

# 작품 핵심 소개글 저장
info_filename = os.path.join(output_dir, f"00_🚨작품소개_및_기획안🚨.txt")
if not os.path.exists(info_filename):
    with open(info_filename, "w", encoding="utf-8") as info_f:
        info_f.write(f"■ 작품 제목: {novel_title}\n■ 100자 소개글: {novel_intro}\n■ 전체 줄거리 요약:\n{overall_plot}\n")

print(f"▶ [기획 확정] 🔥트렌디 신작 제목🔥: < {novel_title} >")
print(f"▶ [100자 소개글]: {novel_intro}")
print(f"▶ 1화~50화 전체 시놉시스 초고속 빌드를 시작합니다...")

prompt_1_25 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 1~25화 세부 시놉시스를 '1화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_1_25 = generate_history(prompt_1_25, "1~25화 시놉시스 생성")
prompt_26_50 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 26~50화 세부 시놉시스를 '26화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_26_50 = generate_history(prompt_26_50, "26~50화 시놉시스 생성")
full_synopsis = response_1_25 + "\n" + response_26_50

synopses = {}
for i in range(1, 51):
    search_key = f"{i}화:"
    if search_key in full_synopsis:
        part = full_synopsis.split(search_key)[1]
        next_key = f"{i+1}화:"
        synopses[i] = part.split(next_key)[0].strip() if next_key in part else part.split("\n\n")[0].strip()
    else: 
        synopses[i] = f"{novel_title}의 장엄한 제 {i}화 스토리가 전개됩니다."

print("▶ 1화부터 50화까지의 모든 시놉시스 장전 완료!")
print("==================================================")
print("✍️ [2단계] 무림북 연재본 초고속 50화 연속 집필 폭주")
print("==================================================")

RULES = """틀딱 구어체 금지. '~했다, ~였다'의 묵직한 서술체 사용. 한자 표기 절대 금지, 순수 한글만 표기. 신하들이 소리 높여 통곡하거나 황제들이 조선의 신무기를 보고 경악하여 무릎 꿇는 거대한 국뽕 사이다 카타르시스를 연출하십시오."""

previous_summary = "없음 (이야기가 막 시작되었습니다.)"
for chapter in range(1, 51):
    filename = os.path.join(output_dir, f"{chapter:02d}화_{safe_title}.txt")
    if os.path.exists(filename):
        print(f"⏭️ [{chapter}/50화] 이미 집필된 파일 패스 (이어 쓰기 작동)")
        try:
            with open(filename, "r", encoding="utf-8") as f:
                existing_text = f.read()
            summary_prompt = f"다음 소설 본문을 읽고 주요 상황을 3줄 요약해줘.\n\n[본문]\n{existing_text}"
            previous_summary = generate_history(summary_prompt, f"{chapter}화 기존 줄거리 복구")
        except Exception: pass
        continue
    
    print(f"▓ [{chapter}/50화] 대체 역사 본문 폭풍 생성 중... 🔥")
    prompt = f"""{RULES}
    제목: {novel_title}
    이전 요약: {previous_summary}
    이번화 시놉시스: {synopses[chapter]}
    위 정보를 바탕으로 {chapter}화의 본문을 웅장하고 흡입력 있게 집필해줘."""
    
    chapter_text = generate_history(prompt, f"{chapter}화 본문 집필")
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f: f.write(chapter_text)
    print(f"   ↳ ⚡ {chapter}화 초고속 저장 완료! ({filename})")
    
    previous_summary = generate_history(f"다음 본문을 3줄 요약해줘.\n\n[본문]\n{chapter_text}", f"{chapter}화 줄거리 요약")
    time.sleep(1)

print("\n==================================================\n🎉 대체 역사 완결!\n==================================================")