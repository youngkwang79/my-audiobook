# -*- coding: utf-8 -*-
import os
import pickle
from googleapiclient.discovery import build

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

def get_blogger_service():
    token_path = 'scratch/blogger_token.pickle'
    with open(token_path, 'rb') as token:
        creds = pickle.load(token)
    return build('blogger', 'v3', credentials=creds)

def main():
    service = get_blogger_service()
    blogs_res = service.blogs().listByUser(userId='self').execute()
    blog_id = blogs_res['items'][0]['id']
    
    posts_res = service.posts().list(blogId=blog_id, status='DRAFT', maxResults=100).execute()
    if 'items' not in posts_res or not posts_res['items']:
        print("No drafts found")
        return
        
    for p in posts_res['items']:
        print(f"ID: {p['id']} | Title: {p['title']}")

if __name__ == '__main__':
    main()
