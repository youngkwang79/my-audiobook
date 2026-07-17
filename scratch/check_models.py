import requests
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api_key_loader import get_api_key

key = get_api_key("ANTHROPIC_API_KEY")

headers = {
    "x-api-key": key,
    "anthropic-version": "2023-06-01"
}

# Anthropic 가용 모델 목록 조회 API 호출
response = requests.get("https://api.anthropic.com/v1/models", headers=headers)
print("Status Code:", response.status_code)
print("Response Text:", response.text)
