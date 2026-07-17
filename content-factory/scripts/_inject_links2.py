
# generate_article 함수의 base 변수 다음에 링크 정보 삽입 패치
with open('content-factory/scripts/gemini_writer.py', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 내부링크/외부링크 빌드 코드를 base= 라인 다음에 삽입
old = '    base = f"[주제] {title}\\n[요약] {summary}\\n[메인키워드] {main_kw} / [포커스] {kw_str}"'
new = '''    base = f"[주제] {title}\\n[요약] {summary}\\n[메인키워드] {main_kw} / [포커스] {kw_str}"

    # ── 내부 링크 (WP 실제 발행글) ──────────────
    wp_posts = get_internal_links()
    if len(wp_posts) >= 2:
        import random as _rand
        sampled = _rand.sample(wp_posts, min(2, len(wp_posts)))
        internal_link_block = "\\n".join(
            f'  - <a href="{p[\\'url\\']}" title="{p[\\'title\\']}">{p[\\'title\\']}</a>'
            for p in sampled
        )
    else:
        internal_link_block = "  - (내부링크 없음 — 블로그 글 더 발행 후 자동 연결됨)"

    # ── 외부 링크 형식 고정 (실제 작동 보장) ────
    ext_link_namu = f"https://namu.wiki/w/{main_kw}"
    ext_link_wiki = f"https://ko.wikipedia.org/wiki/{main_kw}"
    external_link_block = f"""  - 나무위키: <a href="{ext_link_namu}" target="_blank" rel="noopener">{main_kw} — 나무위키</a>
  - 위키백과: <a href="{ext_link_wiki}" target="_blank" rel="noopener">{main_kw} — 위키백과</a>"""
'''

if old in content:
    content = content.replace(old, new, 1)
    with open('content-factory/scripts/gemini_writer.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: link blocks added")
else:
    print("ERROR: target string not found")
    # 디버그
    idx = content.find('base = f"[주제]')
    print(f"  'base = f' found at index: {idx}")
    if idx >= 0:
        print(f"  Context: {repr(content[idx:idx+100])}")
