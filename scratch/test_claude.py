import requests
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api_key_loader import get_api_key

key = get_api_key("ANTHROPIC_API_KEY")
print("Key length:", len(key) if key else 0)
print("Key starts with:", key[:15] if key else "None")

headers = {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}

payload = {
    "model": "claude-3-haiku-20240307",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello"}]
}

response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
print("Status Code:", response.status_code)
print("Response Text:", response.text)
