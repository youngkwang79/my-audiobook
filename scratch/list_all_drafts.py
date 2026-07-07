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
    for blog in blogs_res.get('items', []):
        print(f"Blog ID: {blog['id']} | Name: {blog['name']}")
        posts_res = service.posts().list(blogId=blog['id'], status='DRAFT', maxResults=100).execute()
        if 'items' in posts_res:
            for p in posts_res['items']:
                print(f"  Post ID: {p['id']} | Title: {p['title']}")

if __name__ == '__main__':
    main()
