# -*- coding: utf-8 -*-
"""
구글 블로거 임시글 '배도라지' 분석 및 상세페이지 텍스트/이미지 추출기
"""

import os
import pickle
import requests
import re
from bs4 import BeautifulSoup
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
            if creds and hasattr(creds, 'client_id') and creds.client_id != CLIENT_ID:
                creds = None
                os.remove(token_path)
        except Exception:
            creds = None
            os.remove(token_path)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
        
        if not creds:
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
            
    return build('blogger', 'v3', credentials=creds)

def main():
    service = get_blogger_service()
    
    # 내 블로그 리스트 획득
    blogs_res = service.blogs().listByUser(userId='self').execute()
    if 'items' not in blogs_res or not blogs_res['items']:
        print("[ERROR] No blogs found.")
        return
        
    blog = blogs_res['items'][0]
    blog_id = blog['id']
    blog_name = blog['name']
    print(f"[INFO] Accessing Blog: {blog_name} (ID: {blog_id})")
    
    # 임시글 리스트 조회
    posts_res = service.posts().list(blogId=blog_id, status='DRAFT', maxResults=100).execute()
    if 'items' not in posts_res or not posts_res['items']:
        print("[ERROR] No draft posts found.")
        return
        
    target_post = None
    for post in posts_res['items']:
        # 제목에 '배도라지'가 포함되어 있는지 확인
        if '배도라지' in post['title']:
            target_post = post
            break
            
    if not target_post:
        print("[ERROR] Could not find any draft post with title containing '배도라지'.")
        return
        
    print(f"[SUCCESS] Target Post Found: '{target_post['title']}' (ID: {target_post['id']})")
    
    # 본문 HTML 분석 및 이미지 태그 파싱
    content_html = target_post.get('content', '')
    soup = BeautifulSoup(content_html, 'html.parser')
    
    # 모든 이미지 소스 리스트업
    img_elements = soup.find_all('img')
    img_urls = []
    for img in img_elements:
        src = img.get('src')
        if src:
            img_urls.append(src)
            
    print(f"[INFO] Extracted {len(img_urls)} image URLs from the post.")
    for idx, url in enumerate(img_urls[:5]):
        print(f"  - Image {idx+1}: {url[:80]}...")
        
    # 추출한 이미지 데이터 로컬 저장 폴더
    asset_folder = "naver_post_assets"
    os.makedirs(asset_folder, exist_ok=True)
    
    # 나중에 OCR 분석하기 쉽도록 이미지 URL 정보를 로컬에 보관
    url_file_path = os.path.join(asset_folder, "blogger_image_urls.txt")
    with open(url_file_path, "w", encoding="utf-8") as f:
        f.write(f"Post ID: {target_post['id']}\n")
        f.write(f"Post Title: {target_post['title']}\n")
        f.write("=== Image URLs ===\n")
        for url in img_urls:
            f.write(f"{url}\n")
            
    print(f"[SUCCESS] Saved blogger post details to {url_file_path}")

if __name__ == "__main__":
    main()
