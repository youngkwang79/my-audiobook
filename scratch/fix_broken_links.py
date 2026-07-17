# -*- coding: utf-8 -*-
import os
import requests
import pickle
from googleapiclient.discovery import build

# Load env variables
WP_URL = ""
WP_USER = ""
WP_PASS = ""
BLOGGER_BLOG_ID = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                parts = line.split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip().replace('"', '').replace("'", "")
                if k == "WP_URL":
                    WP_URL = v
                elif k == "WP_ADMIN_USERNAME":
                    WP_USER = v
                elif k == "WP_APPLICATION_PASSWORD":
                    WP_PASS = v
                elif k == "BLOGGER_BLOG_ID":
                    BLOGGER_BLOG_ID = v

def get_blogger_service():
    token_path = 'scratch/blogger_token.pickle'
    with open(token_path, 'rb') as token:
        creds = pickle.load(token)
    return build('blogger', 'v3', credentials=creds)

def main():
    # 1. Fix WordPress Atopalm post (ID: 857)
    if WP_URL and WP_USER and WP_PASS:
        wp_url = f"{WP_URL}/wp-json/wp/v2/posts/857"
        r = requests.get(wp_url, auth=(WP_USER, WP_PASS))
        if r.status_code == 200:
            post = r.json()
            content = post["content"]["rendered"]
            # Replace https with http for atopalm to prevent SSL error
            if "https://www.atopalm.co.kr" in content:
                new_content = content.replace("https://www.atopalm.co.kr", "http://www.atopalm.co.kr")
                payload = {"content": new_content}
                r_update = requests.post(wp_url, auth=(WP_USER, WP_PASS), json=payload)
                if r_update.status_code == 200:
                    print("Successfully fixed Atopalm SSL link in WordPress Post 857!")
                else:
                    print(f"Failed to update WP Post 857: {r_update.status_code}")
            else:
                print("Atopalm SSL link not found in WordPress Post 857 content.")
        else:
            print(f"Failed to fetch WP Post 857: {r.status_code}")

    # 2. Fix Blogger Atopalm post (ID: 6164763693754747844)
    if BLOGGER_BLOG_ID:
        try:
            service = get_blogger_service()
            post_id = "6164763693754747844"
            post = service.posts().get(blogId=BLOGGER_BLOG_ID, postId=post_id).execute()
            content = post.get("content", "")
            if "https://www.atopalm.co.kr" in content:
                post["content"] = content.replace("https://www.atopalm.co.kr", "http://www.atopalm.co.kr")
                service.posts().update(blogId=BLOGGER_BLOG_ID, postId=post_id, body=post).execute()
                print("Successfully fixed Atopalm SSL link in Blogger draft 6164763693754747844!")
            else:
                print("Atopalm SSL link not found in Blogger draft.")
        except Exception as e:
            print(f"Failed to fix Blogger draft link: {e}")

if __name__ == '__main__':
    main()
