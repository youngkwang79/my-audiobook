
with open('content-factory/scripts/gemini_writer.py', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

new_code = '''
# ──────────────────────────────────────────────
# WordPress 내부 링크 수집 (실제 존재하는 글)
# ──────────────────────────────────────────────
import base64 as _b64
import requests as _req

_WP_URL  = os.getenv("WP_URL", "").rstrip("/")
_WP_USER = os.getenv("WP_ADMIN_USERNAME", "")
_WP_PASS = os.getenv("WP_APPLICATION_PASSWORD", "")
_INTERNAL_LINKS_CACHE = []

def get_internal_links(count: int = 10) -> list:
    global _INTERNAL_LINKS_CACHE
    if _INTERNAL_LINKS_CACHE:
        return _INTERNAL_LINKS_CACHE
    if not all([_WP_URL, _WP_USER, _WP_PASS]):
        return []
    try:
        cred = _b64.b64encode(f"{_WP_USER}:{_WP_PASS}".encode()).decode()
        r = _req.get(
            f"{_WP_URL}/wp-json/wp/v2/posts",
            headers={"Authorization": f"Basic {cred}"},
            params={"per_page": count, "status": "publish", "orderby": "date"},
            timeout=10,
        )
        if r.status_code == 200:
            _INTERNAL_LINKS_CACHE = [
                {"title": p.get("title", {}).get("rendered", ""), "url": p.get("link", "")}
                for p in r.json() if p.get("link")
            ]
            print(f"  내부링크 후보: {len(_INTERNAL_LINKS_CACHE)}개 로드")
    except Exception as e:
        print(f"  내부링크 로드 실패: {e}")
    return _INTERNAL_LINKS_CACHE

'''

target = 'MAX_PER_RUN   = 5'
idx = content.find(target)
if idx >= 0:
    end_line = content.find('\n', idx) + 1
    content = content[:end_line] + new_code + content[end_line:]
    with open('content-factory/scripts/gemini_writer.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: internal links function added')
else:
    print('ERROR: target not found')
