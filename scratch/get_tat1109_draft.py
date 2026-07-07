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
    # 2556983684311625653
    # Let's try to get it, using string formatting properly.
    post = service.posts().get(blogId="127512538129296836", postId="2556983684311625653").execute()
    with open("scratch/tat1109_draft.json", "w", encoding="utf-8") as f:
        json.dump(post, f, ensure_ascii=False, indent=2)
    print("SUCCESS: Saved tat1109 draft to scratch/tat1109_draft.json")

if __name__ == '__main__':
    main()
