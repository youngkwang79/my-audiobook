# -*- coding: utf-8 -*-
"""
워드프레스 및 구글 블로거에 입력된 제휴 마케팅 링크들을 유저의 네이버 블로그 상세 리뷰글 주소(https://blog.naver.com/murimbook/224336757499)로 우회 치환하는 스크립트
"""

import os
import pickle
import requests
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/blogger']

# .env.local 환경변수 읽기
CLIENT_ID = ""
CLIENT_SECRET = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if k == "BLOGGER_CLIENT_ID":
                    CLIENT_ID = v
                elif k == "BLOGGER_CLIENT_SECRET":
                    CLIENT_SECRET = v

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    }
}

def get_blogger_service():
    creds = None
    token_path = 'scratch/blogger_token.pickle'
    if os.path.exists(token_path):
        try:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        except:
            creds = None
    return build('blogger', 'v3', credentials=creds)

def main():
    # 대상 링크 설정
    target_link = "https://blog.naver.com/murimbook/224336757499"
    
    # ==========================================
    # 1. 워드프레스 글 수정 (노인 보청기 포스트 ID: 733, 국민내일배움카드 포스트 ID: 727 등)
    # ==========================================
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    # 최근 등록한 워드프레스 글 ID 리스트
    wp_post_ids = [733, 727] 
    
    for pid in wp_post_ids:
        print(f"[WP] Fetching post ID {pid} content...")
        r_get = requests.get(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", auth=(WP_USER, WP_PASS))
        if r_get.status_code == 200:
            post_data = r_get.json()
            content = post_data["content"]["rendered"]
            
            # 기존 수익 링크(naver.me)를 네이버 블로그 글로 교체
            updated_content = content.replace("https://naver.me/FDcVf6y9", target_link)
            
            # 업데이트 요청
            r_update = requests.post(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", auth=(WP_USER, WP_PASS), json={
                "content": updated_content
            })
            if r_update.status_code == 200:
                print(f"[WP SUCCESS] Post ID {pid} link successfully updated to Naver Blog Bridge Link!")

    # ==========================================
    # 2. 구글 블로거 글 수정 (보청기 ID: 5003459061033779615, 내일배움카드 ID 등)
    # ==========================================
    service = get_blogger_service()
    blogs_res = service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    # 구글 블로거 예약/임시 포스트 개별 조회하여 배도라지차 제휴 링크 치환
    for current_status in ['DRAFT', 'SCHEDULED']:
        posts_res = service.posts().list(blogId=blog_id, status=current_status, maxResults=50).execute()
        if 'items' in posts_res:
            for post in posts_res['items']:
                content = post.get('content', '')
                if 'naver.me/FDcVf6y9' in content or 'smartstore.naver.com' in content:
                    print(f"[Blogger] Found target link in post '{post['title']}' ({current_status}). Replacing...")
                    updated_content = content.replace("https://naver.me/FDcVf6y9", target_link)
                    updated_content = updated_content.replace("https://smartstore.naver.com/sunsuhouse/products/8560153668", target_link)
                    
                    service.posts().update(blogId=blog_id, postId=post['id'], body={
                        "title": post['title'],
                        "content": updated_content,
                        "published": post.get('published'),
                        "status": post.get('status'),
                        "labels": post.get('labels')
                    }).execute()
                    print(f"[Blogger SUCCESS] Post '{post['title']}' link updated safely to Bridge!")

if __name__ == "__main__":
    main()
