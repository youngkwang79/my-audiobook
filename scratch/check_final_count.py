import os
import urllib.request
import json
import sys
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
    'Content-Type': 'application/json'
}
req = urllib.request.Request(
    url + '/rest/v1/works?select=id,title,status&order=created_at.asc',
    headers=headers,
    method='GET'
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print('=== 총 ' + str(len(data)) + '개 작품 ===')
    for i, w in enumerate(data, 1):
        status = w.get('status', '?')
        wid = w.get('id', '?')
        title = w.get('title', '?')[:50]
        print(str(i).zfill(2) + '. [' + status + '] ' + wid + ' - ' + title)
