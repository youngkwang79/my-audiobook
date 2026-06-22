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
print(f"Testing Key: {api_key}")

url = "https://api.anthropic.com/v1/messages"
headers = {
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}

data = {
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hi"}]
}

response = requests.post(url, headers=headers, json=data)
print("Status:", response.status_code)
print("Response headers:", dict(response.headers))
print("Response body:", response.text)
