import os, re, json, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')

url = ''
service_key = ''
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            parts = line.strip().split('=', 1)
            k, v = parts[0].strip(), parts[1].strip()
            if k == 'NEXT_PUBLIC_SUPABASE_URL': url = v
            elif k == 'SUPABASE_SERVICE_ROLE_KEY': service_key = v

headers = {
    'apikey': service_key,
    'Authorization': 'Bearer ' + service_key,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
}

# upload_micron_blogger.py 에서 content_html 추출
# f-string의 {image_html} 변수를 빈 문자열로 대체
with open('scratch/upload_micron_blogger.py', encoding='utf-8', errors='ignore') as f:
    src = f.read()

# content_html = f"""{image_html}\n\n<h2>... 패턴 찾기
m = re.search(r'content_html\s*=\s*f?"""(.*?)"""', src, re.DOTALL)
if m:
    raw = m.group(1)
    # {image_html} 변수 제거 (대형 base64 이미지 포함)
    raw = re.sub(r'\{image_html\}', '', raw)
    raw = re.sub(r'\{[^}]+\}', '', raw)
    content = raw.strip()
    print('본문 추출 성공! 길이:', len(content), '자')
    print('미리보기:', content[:200])
else:
    print('추출 실패')
    content = None

if content and len(content) > 200:
    payload = json.dumps([{
        "id": "micron_hbm4_analysis",
        "title": "마이크론 HBM4 전력 효율 분석: AI 서버가 선택하는 이유",
        "description": content,
        "thumbnail": "https://r2.murimbook.com/thumbnails/micron_hbm4_bookcover.jpg",
        "status": "공개",
        "subtitle": "[블로그]",
        "badge": "",
        "episode_count": 0,
        "total_episodes": 50,
        "free_episodes": 10,
        "exclusive": True,
        "featured": True,
        "views": 0,
        "play_count": 0,
        "is_membership_only": False,
        "last_voice": None,
        "last_pitch": None,
        "last_rate": None,
        "created_at": "2026-07-01T00:00:00+00:00"
    }]).encode('utf-8')

    req = urllib.request.Request(
        url + '/rest/v1/works',
        data=payload,
        headers=headers,
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print('✅ UPSERTED: micron_hbm4_analysis - 마이크론 HBM4 전력 효율 분석')
    except urllib.error.HTTPError as e:
        print('❌ FAILED:', e.read().decode('utf-8', errors='ignore')[:300])
