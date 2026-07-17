# -*- coding: utf-8 -*-
"""
삭제된 15개 무림북 소설 작품을 Supabase works 테이블에 복원하는 스크립트
"""
import os, json, urllib.request, sys
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

R2_BASE = 'https://r2.murimbook.com'

# 15대 소설 전체 복원 데이터
novels = [
    {
        "id": "Woonghon_Kkaedaleumui_Geomgwa_Sonyeon",
        "title": "웅혼(雄魂) - 깨달음의 검과 소년",
        "thumbnail": R2_BASE + "/thumbnails/unghon_1781534280067.png",
        "subtitle": "[복수극] [성장] [미스터리]",
        "status": "완결"
    },
    {
        "id": "Myeolsaguirim Chomuyeong",
        "title": "멸사귀림(滅死歸臨) 초무영",
        "thumbnail": R2_BASE + "/thumbnails/myeolsagwirim_chomuyeong.png",
        "subtitle": "[회귀물] [복수극]",
        "status": "연재중"
    },
    {
        "id": "namgunguijanhonhaouibigeom",
        "title": "남궁의 잔혼 하오의 비검",
        "thumbnail": R2_BASE + "/thumbnails/namgung_1781525111157.png",
        "subtitle": "복수",
        "status": "완결"
    },
    {
        "id": "socheongun3nyenanepamyeleulbee",
        "title": "강호 인과율 - 명천 소청운전",
        "thumbnail": R2_BASE + "/thumbnails/socheongun3nyenanepamyeleulbee_1781776223213.png",
        "subtitle": "생존 성장 복수",
        "status": "완결"
    },
    {
        "id": "hwansaeng-geomjon",
        "title": "환생검존",
        "thumbnail": R2_BASE + "/thumbnails/hwansaeng-geomjon.png",
        "subtitle": "[환생물] [복수극]",
        "status": "완결"
    },
    {
        "id": "ganghouipaswaeyenoghyelpungdog",
        "title": "강호의 파쇄연옥: 혈풍독보",
        "thumbnail": R2_BASE + "/thumbnails/ganghouipaswaeyenoghyelpungdog_1782702134983.jpeg",
        "subtitle": "[회귀물] [복수극]",
        "status": "완결"
    },
    {
        "id": "gupailbangcheonjaedeulmumyengs",
        "title": "구파일방 천재들? 무명 삼류 무사가 다 씹어먹음",
        "thumbnail": R2_BASE + "/thumbnails/gupailbang_1781525327822.png",
        "subtitle": "[사이다]",
        "status": "완결"
    },
    {
        "id": "gunrimcheonha",
        "title": "군림천하",
        "thumbnail": R2_BASE + "/thumbnails/gunrimcheonha_1783461115868.jpg",
        "subtitle": "[정통무협]",
        "status": "연재중"
    },
    {
        "id": "cheongun",
        "title": "천군(天君)",
        "thumbnail": R2_BASE + "/thumbnails/cheongun.png",
        "subtitle": "[정통무협] [군신환생]",
        "status": "연재중"
    },
    {
        "id": "yahyelhwamyeng",
        "title": "야혈화명(夜血花明)",
        "thumbnail": R2_BASE + "/thumbnails/yahyelhwamyeng.png",
        "subtitle": "[느와르무협] [복수]",
        "status": "완결"
    },
    {
        "id": "sogaju",
        "title": "소가주(小家主)의 비밀",
        "thumbnail": R2_BASE + "/thumbnails/sogaju.png",
        "subtitle": "[두뇌싸움] [가문혁신]",
        "status": "연재중"
    },
    {
        "id": "cheonhajeil",
        "title": "천하제일인의 은퇴 생활",
        "thumbnail": R2_BASE + "/thumbnails/cheonhajeil.png",
        "subtitle": "[일상무협] [먼치킨]",
        "status": "완결"
    },
    {
        "id": "hagsasinsin",
        "title": "학사 신선 강호에 오다",
        "thumbnail": R2_BASE + "/thumbnails/hagsasinsin.png",
        "subtitle": "[학사물] [선협]",
        "status": "연재중"
    },
    {
        "id": "mudanggeom",
        "title": "무당의 검은 달이 되고",
        "thumbnail": R2_BASE + "/thumbnails/mudanggeom.png",
        "subtitle": "[도문성장] [기연]",
        "status": "완결"
    },
    {
        "id": "hwansaenggeomgwi",
        "title": "환생한 검귀는 가문에서 평화롭게 살고 싶다",
        "thumbnail": R2_BASE + "/thumbnails/hwansaenggeomgwi.png",
        "subtitle": "[가족애] [검공]",
        "status": "연재중"
    }
]

print('=== 15대 소설 복원 시작 ===')
success = 0
for novel in novels:
    payload = json.dumps([{
        "id": novel["id"],
        "title": novel["title"],
        "thumbnail": novel["thumbnail"],
        "subtitle": novel["subtitle"],
        "status": novel["status"],
        "badge": "NEW",
        "description": novel["title"] + " - 무림북 오디오북 연재 소설",
        "episode_count": 0,
        "total_episodes": 50,
        "free_episodes": 3,
        "exclusive": True,
        "featured": True,
        "views": 0,
        "play_count": 0,
        "is_membership_only": False,
        "last_voice": None,
        "last_pitch": None,
        "last_rate": None,
        "created_at": "2026-06-01T00:00:00+00:00"
    }]).encode('utf-8')

    req = urllib.request.Request(
        url + '/rest/v1/works',
        data=payload,
        headers=headers,
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print('  ✅ 복원됨: [' + novel["id"][:30] + '] ' + novel["title"])
            success += 1
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='ignore')
        print('  ❌ 실패: [' + novel["id"] + '] - ' + err[:150])

print('')
print('=== 소설 복원 완료! ' + str(success) + '/15 ===')
