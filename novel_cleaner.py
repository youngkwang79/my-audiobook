import re

# 장르 불문 시스템 프롬프트 유출 방지 및 공통 정화용 필터
MODERN_WORD_MAP = {
    "서스펜스": "긴장감",
    "대사 호흡": "호흡",
    "서술 주기": "",
    "인지 부조화": "경악",
    "클로즈업": "선명하게"
}

leaked_patterns = [
    r"큰따옴표로 묶인 두 무인의 대사 호흡이 3문단 이상의 서술 주기를 정확히 지키며[^\n]*\n?",
    r"서술 3문단이 지나면 반드시 등장인물의 대사 2~3줄을 포함하여[^\n]*\n?",
    r"대화문은 큰따옴표\(\"\"\)[^\n]*\n?",
    r"\[🚨 이번 화 본문 서술 시 집중해야 할[^\n]*\n?",
    r"(?:[0-9일이삼사오육칠팔구십]\s*문단의?\s*서술\s*주기가?\s*(?:지나치기|지나기|넘어가기)\s*전,?\s*)",
    r"(?:서술이\s*(?:세\s*문단|[0-9일이삼사오육칠팔구십]\s*문단)을\s*넘어가기\s*전,?\s*)",
    r"(?:(?:[^\s]+?\.txt\s*(?:와|과)?\s*)*[^\s]+?\.txt에?\s*(?:명시된|적힌|기록된|따르면|의거하여|참고하여)?\s*)",
    r"(?:전\s*화의?\s*긴박한?\s*정황(?:에서)?\s*(?:한\s*치의?\s*단절도?\s*없이)?\s*(?:실시간으로?\s*이어지는?)?\s*찰나의\s*순간이(?:었다|었습니다)\.?\s*)",
    r"(?:전체\s*분량의?\s*[0-9일이삼사오육칠팔구십]+%\s*내외?를?\s*(?:차지하는|유지하는)?\s*인물들의?\s*대사\s*호흡(?:과\s*심층적\s*갈망(?:의\s*리듬)?이?)?\s*)",
    r"(?:심층적\s*갈망(?:의\s*리듬이?)?\s*)"
]

def clean_text(text):
    filtered_text = text
    for bad_word, replacement in MODERN_WORD_MAP.items():
        if bad_word in filtered_text:
            filtered_text = filtered_text.replace(bad_word, replacement)
            
    # 정밀 문장 치환 (문법 구조 복원)
    connector_patterns = [
        (r"(?:였다는|이라는|바였다는)\s+전\s*화의?\s*긴박한?\s*정황(?:에서)?\s*(?:한\s*치의?\s*단절도?\s*없이)?\s*(?:실시간으로?\s*이어지는?)?\s*찰나의\s*순간이(?:었다|었습니다)\.?", "였다."),
        (r"(?:였다는|이라는|바였다는)\s+이전\s*화의?\s*(?:마지막|끝|정황)[^\s]*?\s*(?:단절\s*없이)?\s*(?:실시간으로?)?\s*이어받(?:는|은)\s*찰나의\s*순간이(?:었다|었습니다)\.?", "였다."),
        (r"시선의\s*이동\s*묘사를?\s*(?:촘촘하게)?\s*확장했다\.?", "시선을 던졌다."),
        (r"시선의\s*이동\s*묘사", "시선")
    ]
    for pattern, rep in connector_patterns:
        filtered_text = re.sub(pattern, rep, filtered_text)
        
    # 문장 단위 프롬프트 유출 정화 (해당 문장 전체 삭제)
    sentence_leak_pattern = r"[^.!?\n]*?(?:대사\s*호흡|서술\s*주기|심리전\s*제어|지침\s*제어|3문단\s*이상|세\s*문단\s*이상|시놉시스_[0-9]+|세계관\s*설정|시선의\s*이동\s*묘사)[^.!?\n]*?[.!?]\s*"
    filtered_text = re.sub(sentence_leak_pattern, "", filtered_text)
        
    for pattern in leaked_patterns:
        filtered_text = re.sub(pattern, "", filtered_text)
    return filtered_text
