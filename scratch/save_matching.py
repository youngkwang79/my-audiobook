# -*- coding: utf-8 -*-
import os
import pickle
from googleapiclient.discovery import build

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
    for p in posts_res.get('items', []):
        if 'TAT1109' in p['title'] or '필립스' in p['title'] or p['title'] == '':
            print(f"FOUND MATCH - ID: {p['id']} | Title: {p['title']}")
            # let's write the whole item json
            import json
            filename = f"scratch/post_{p['id']}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(p, f, ensure_ascii=False, indent=2)
            print(f"Saved {filename}")

if __name__ == '__main__':
    main()
