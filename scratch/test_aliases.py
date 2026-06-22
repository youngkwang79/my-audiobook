import os
import requests
import json

def load_env():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '../../.env.local'),
        os.path.join(os.path.dirname(__file__), '../.env.local'),
        os.path.abspath('.env.local'),
        os.path.abspath('../.env.local')
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")
            break

load_env()
api_key = os.environ.get("ANTHROPIC_API_KEY")

url = "https://api.anthropic.com/v1/messages"
headers = {
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}

# 에이전트 가이드 추천 모델명 리스트 테스트
test_models = [
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022",
    "claude-3-haiku",
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229"
]

for model in test_models:
    print(f"\n--- Testing model alias: {model} ---")
    data = {
        "model": model,
        "max_tokens": 10,
        "messages": [{"role": "user", "content": "Hi"}]
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
