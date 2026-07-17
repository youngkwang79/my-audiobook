# -*- coding: utf-8 -*-
import os
import pickle
import json
from googleapiclient.discovery import build

def get_blogger_service():
    token_path = 'scratch/blogger_token.pickle'
    with open(token_path, 'rb') as token:
        creds = pickle.load(token)
    return build('blogger', 'v3', credentials=creds)

def main():
    service = get_blogger_service()
    blog_id = '127512538129296836'
    post_id = '2893877478233273074'
    
    # We fetch drafts by listing them and searching
    posts_res = service.posts().list(blogId=blog_id, status='DRAFT', maxResults=100).execute()
    found = False
    for p in posts_res.get('items', []):
        if p['id'] == post_id:
            print("Found Post via List! Saving to JSON...")
            with open('scratch/target_post.json', 'w', encoding='utf-8') as f:
                json.dump(p, f, ensure_ascii=False, indent=2)
            found = True
            break
            
    if not found:
        print("Post not found in draft list.")

if __name__ == '__main__':
    main()
