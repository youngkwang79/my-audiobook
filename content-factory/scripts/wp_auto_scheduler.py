# -*- coding: utf-8 -*-
import os
import sys
import time
import datetime
import argparse
import requests
import json

# 스크립트 디렉토리 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from news_crawler import fetch_latest_news, save_published_url
from image_processor import generate_blog_images
from claude_generator import generate_blog_post

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
try:
    from api_key_loader import get_api_key
except ImportError:
    def get_api_key(key_name):
        return os.environ.get(key_name)

# 워드프레스 접속 정보 설정
WP_URL = get_api_key("WP_URL") or "https://blog.murimbook.com"
WP_USER = get_api_key("WP_ADMIN_USERNAME") or "murimbook"
WP_APP_PW = get_api_key("WP_APPLICATION_PASSWORD")

def upload_media_to_wp(image_path, title, alt_text="", caption="", description=""):
    """
    워드프레스 미디어 라이브러리에 이미지를 업로드하고 미디어 ID와 URL을 반환합니다.
    """
    if not os.path.exists(image_path):
        print(f"[ERROR] 업로드할 이미지 파일을 찾을 수 없습니다: {image_path}")
        return None
        
    url = f"{WP_URL}/wp-json/wp/v2/media"
    filename = os.path.basename(image_path)
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "image/jpeg"
    }
    
    print(f"[INFO] 워드프레스에 이미지 업로드 중: {filename}")
    try:
        with open(image_path, "rb") as img_file:
            response = requests.post(
                url,
                auth=(WP_USER, WP_APP_PW),
                headers=headers,
                data=img_file,
                timeout=30
            )
            
        if response.status_code != 201:
            print(f"[ERROR] 미디어 업로드 실패 (코드 {response.status_code})")
            print(response.text)
            return None
            
        media_data = response.json()
        media_id = media_data.get("id")
        media_url = media_data.get("source_url")
        
        # 이미지 메타데이터(대체 텍스트, 설명, 캡션) 업데이트
        update_url = f"{WP_URL}/wp-json/wp/v2/media/{media_id}"
        update_payload = {}
        if alt_text:
            update_payload["alt_text"] = alt_text
        if caption:
            update_payload["caption"] = caption
        if description:
            update_payload["description"] = description
            
        if update_payload:
            requests.post(
                update_url,
                auth=(WP_USER, WP_APP_PW),
                json=update_payload,
                timeout=10
            )
            
        return {"id": media_id, "url": media_url}
        
    except Exception as e:
        print(f"[ERROR] 미디어 업로드 API 처리 예외 발생: {e}")
        return None

def get_or_create_wp_tags(tag_names):
    """
    워드프레스에서 태그 이름을 기반으로 태그 ID 목록을 반환합니다.
    존재하지 않는 태그는 자동으로 새로 생성합니다.
    """
    if not tag_names:
        return []
        
    tag_ids = []
    headers = {"Content-Type": "application/json"}
    
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
            
        create_url = f"{WP_URL}/wp-json/wp/v2/tags"
        payload = {"name": name}
        try:
            res = requests.post(create_url, auth=(WP_USER, WP_APP_PW), headers=headers, json=payload, timeout=10)
            if res.status_code == 201:
                tag_ids.append(res.json().get("id"))
            elif res.status_code == 400 and "term_exists" in res.text:
                err_data = res.json()
                term_id = err_data.get("data", {}).get("term_id")
                if term_id:
                    tag_ids.append(term_id)
                else:
                    search_url = f"{WP_URL}/wp-json/wp/v2/tags?search={name}"
                    search_res = requests.get(search_url, auth=(WP_USER, WP_APP_PW), timeout=10)
                    if search_res.status_code == 200:
                        search_data = search_res.json()
                        matched = False
                        for t in search_data:
                            if t.get("name") == name:
                                tag_ids.append(t.get("id"))
                                matched = True
                                break
                        if not matched and search_data:
                            tag_ids.append(search_data[0].get("id"))
            else:
                print(f"[WARNING] 태그 '{name}' 연동 실패 (코드 {res.status_code})")
        except Exception as e:
            print(f"[WARNING] 태그 '{name}' 처리 중 예외 발생: {e}")
            
    return tag_ids

def get_or_create_wp_categories(cat_names):
    """
    워드프레스에서 카테고리 이름을 기반으로 카테고리 ID 목록을 반환합니다.
    존재하지 않는 카테고리는 자동으로 새로 생성합니다.
    """
    if not cat_names:
        return []
        
    cat_ids = []
    headers = {"Content-Type": "application/json"}
    
    for name in cat_names:
        name = name.strip()
        if not name:
            continue
            
        create_url = f"{WP_URL}/wp-json/wp/v2/categories"
        payload = {"name": name}
        try:
            res = requests.post(create_url, auth=(WP_USER, WP_APP_PW), headers=headers, json=payload, timeout=10)
            if res.status_code == 201:
                cat_ids.append(res.json().get("id"))
            elif res.status_code == 400 and "term_exists" in res.text:
                err_data = res.json()
                term_id = err_data.get("data", {}).get("term_id")
                if term_id:
                    cat_ids.append(term_id)
                else:
                    search_url = f"{WP_URL}/wp-json/wp/v2/categories?search={name}"
                    search_res = requests.get(search_url, auth=(WP_USER, WP_APP_PW), timeout=10)
                    if search_res.status_code == 200:
                        search_data = search_res.json()
                        matched = False
                        for t in search_data:
                            if t.get("name") == name:
                                cat_ids.append(t.get("id"))
                                matched = True
                                break
                        if not matched and search_data:
                            cat_ids.append(search_data[0].get("id"))
            else:
                print(f"[WARNING] 카테고리 '{name}' 연동 실패 (코드 {res.status_code})")
        except Exception as e:
            print(f"[WARNING] 카테고리 '{name}' 처리 중 예외 발생: {e}")
            
    return cat_ids

def upload_post_to_wp(title, content, featured_media_id=None, tag_ids=None, category_ids=None, seo_desc=None, keyword=None):
    """
    워드프레스에 글을 업로드합니다.
    가장 마지막에 등록된 예약 글 또는 발행 글의 발행 시점으로부터 정확히 1시간 뒤를 예약 시간(status='future')으로 지정합니다.
    (만약 예약 정보가 없거나 과거 글만 있다면, 현재 시점 기준 1시간 뒤로 설정)
    Rank Math SEO 플러그인 전용 메타 필드(설명 및 포커스 키워드)를 완벽 연동합니다.
    """
    url = f"{WP_URL}/wp-json/wp/v2/posts"
    
    # 1단계: 가장 최신 등록 포스트 1건 조회 (예약 글 포함)
    check_url = f"{WP_URL}/wp-json/wp/v2/posts?status=publish,future,draft,pending&per_page=1&orderby=date&order=desc"
    
    now = datetime.datetime.now()
    scheduled_time = now + datetime.timedelta(hours=1)
    
    try:
        check_res = requests.get(check_url, auth=(WP_USER, WP_APP_PW), timeout=15)
        if check_res.status_code == 200:
            posts = check_res.json()
            if posts:
                last_post = posts[0]
                last_date_str = last_post.get("date")
                if last_date_str:
                    # ISO 포맷 파싱 (YYYY-MM-DDTHH:MM:SS)
                    last_time = datetime.datetime.strptime(last_date_str, "%Y-%m-%dT%H:%M:%S")
                    if last_time > now:
                        # 마지막 포스팅 시점이 미래(예약됨)라면 그로부터 1시간 뒤 지정
                        scheduled_time = last_time + datetime.timedelta(hours=1)
                        print(f"[INFO] 최근 예약 발행 감지됨. 마지막 예약시간({last_date_str})으로부터 1시간 뒤로 설정합니다.")
    except Exception as e:
        print(f"[WARNING] 최근 포스팅 정보 조회 중 오류 발생 (기본 1시간 뒤 지정): {e}")
        
    scheduled_iso = scheduled_time.strftime("%Y-%m-%dT%H:%M:%S")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    post_data = {
        "title": title,
        "content": content,
        "status": "future",  # 예약 발행
        "date": scheduled_iso
    }
    
    if featured_media_id:
        post_data["featured_media"] = featured_media_id
    if tag_ids:
        post_data["tags"] = tag_ids
    if category_ids:
        post_data["categories"] = category_ids
        
    # Rank Math SEO 플러그인 전용 메타데이터 삽입
    post_data["meta"] = {
        "rank_math_title": "%title% %page% %sep% %sitename%",
        "rank_math_description": seo_desc if seo_desc else title,
        "rank_math_focus_keyword": keyword if keyword else ""
    }
        
    print(f"[INFO] 워드프레스에 새 글 예약 발행 등록 중... (예약 시간: {scheduled_iso})")
    try:
        response = requests.post(
            url,
            auth=(WP_USER, WP_APP_PW),
            headers=headers,
            json=post_data,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"[SUCCESS] 포스팅 예약 발행 완료! (상태: {result.get('status')})")
            print(f"[INFO] 예약 발행 예정 주소: {result.get('link')}")
            return True
        else:
            print(f"[ERROR] 포스팅 등록 실패 (코드 {response.status_code})")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"[ERROR] 포스팅 등록 API 처리 예외 발생: {e}")
        return False

def run_once():
    """
    단일 주기 실행: 최신 미발행 뉴스를 가져와 글 작성, 이미지 생성 후 예약 발행 처리
    """
    print("\n--- [RUN] 자동 발행 주기 시작 ---")
    news_items = fetch_latest_news()
    if not news_items:
        print("[INFO] 신규 수집된 새로운 뉴스가 없습니다.")
        return
        
    # 첫 번째 신규 뉴스 발행
    target_news = news_items[0]
    print(f"[INFO] 신규 발행 대상 뉴스 선정: {target_news['title']}")
    
    # 1. Claude API 글 생성
    blog_data = generate_blog_post(target_news["title"], target_news["description"])
    if not blog_data:
        print("[ERROR] 블로그 본문 생성을 취소합니다.")
        return
        
    keyword = blog_data.get("focus_keyword", "IT트렌드")
    post_title = blog_data.get("title")
    post_content = blog_data.get("content")
    seo_description = blog_data.get("seo_description")
    
    # 2. 무림북 전용 2:3 북커버 대표 이미지 및 16:9 중간 이미지 생성
    images_info = generate_blog_images(
        keyword, 
        post_title, 
        image_prompt=blog_data.get("image_prompt"), 
        image_prompt_mid=blog_data.get("image_prompt_mid"),
        aspect_ratio="2:3"
    )
    
    # 3. 대표 썸네일 워드프레스 업로드
    main_media = upload_media_to_wp(
        images_info["main_path"],
        title=f"{keyword}_main_thumb",
        alt_text=images_info["main_meta"]["alt_text"],
        caption=images_info["main_meta"]["caption"],
        description=images_info["main_meta"]["description"]
    )
    
    # 4. 중간 이미지 워드프레스 업로드
    mid_media = upload_media_to_wp(
        images_info["mid_path"],
        title=f"{keyword}_mid_image",
        alt_text=images_info["mid_meta"]["alt_text"]
    )
    
    # 5. 본문 중간 이미지 플레이스홀더를 실제 img 태그 및 쿠팡 파트너스 수익 링크 박스로 치환
    if mid_media:
        img_tag = f'<p style="text-align: center;"><img src="{mid_media["url"]}" alt="{images_info["mid_meta"]["alt_text"]}" class="aligncenter size-large" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.08);" /></p>'
        
        # 쿠팡 파트너스 닌자 슬러시 고유 상품 링크 연동
        coupang_base = get_api_key("COUPANG_PARTNERS_LINK")
        if coupang_base and "/a/xxxxxx" not in coupang_base:
            # 개별 상품 링크이므로 쿼리 없이 다이렉트 랜딩
            coupang_url = coupang_base
            
            coupang_box = f"""
<div style="border: 2px solid #FF9800; padding: 18px; border-radius: 10px; margin: 25px 0; background-color: #FFFDE7; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <h4 style="margin-top: 0; color: #E65100; font-weight: bold; font-size: 1.15rem; margin-bottom: 5px;">🎁 오늘의 추천 핫딜: 닌자 초고속 슬러시 블렌더 메이커</h4>
  <p style="font-size: 0.95rem; color: #555; margin-bottom: 15px;">SNS 대란 품절 주의! 닌자 슬러시 메이커의 쿠팡 최저가 혜택과 로켓배송 정보를 지금 즉시 확인해 보세요.</p>
  <a href="{coupang_url}" target="_blank" style="display: inline-block; background-color: #FF9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.05rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">닌자 슬러시 최저가 혜택 보러가기 👉</a>
  <p style="font-size: 0.75rem; color: #888; margin-top: 10px; margin-bottom: 0;">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
</div>
"""
            post_content = post_content.replace("[중간_이미지_위치]", img_tag + coupang_box)
        else:
            post_content = post_content.replace("[중간_이미지_위치]", img_tag)
    else:
        post_content = post_content.replace("[중간_이미지_위치]", "")
        
    # 5.5 동적 내부 링크 박스 ("읽으면 무조건 돈이 되는 글") 생성 및 본문 병합
    try:
        # 최근 발행 및 예약 포스트 3건 수집
        recent_posts_url = f"{WP_URL}/wp-json/wp/v2/posts?status=publish,future&per_page=3&orderby=date&order=desc"
        links_data = []
        try:
            res_posts = requests.get(recent_posts_url, auth=(WP_USER, WP_APP_PW), timeout=15)
            if res_posts.status_code == 200:
                posts_list = res_posts.json()
                for p in posts_list:
                    link_addr = p.get("link")
                    link_title = p.get("title", {}).get("rendered", "")
                    if link_addr and link_title:
                        # HTML 엔티티 등 디코딩 제거용 단순화
                        link_title = link_title.replace("&#8211;", "-").replace("&#8216;", "'").replace("&#8217;", "'")
                        links_data.append((link_addr, link_title))
            else:
                print(f"[WARNING] API 최근 글 조회 응답 실패 (코드 {res_posts.status_code}). 백업 링크 데이터를 사용합니다.")
        except Exception as api_err:
            print(f"[WARNING] API 네트워크 타임아웃 또는 차단 발생 ({api_err}). 백업 링크 데이터를 사용합니다.")
            
        # 만약 API 통신 장애로 링크 데이터를 못 가져왔다면 고정 백업 3건으로 대체 (누락 방지)
        if not links_data:
            links_data = [
                ("https://blog.murimbook.com/?p=1584", "랜섬웨어 공격 대응 방법 및 예방 자가진단 총정리 (2026년 최신)"),
                ("https://blog.murimbook.com/?p=1569", "메타 과징금 디지털서비스법 위반 조건 및 이용자 대상 조회 방법 (2026 최신)"),
                ("https://blog.murimbook.com/?p=1564", "리드 잡스 요세미티 투자정보 바로가기와 암 치료 혁신 자격 조건 총정리 (2026 최신)")
            ]
            
        related_box = '\n\n<div style="border: 2px dashed #00BFA5; padding: 18px; border-radius: 10px; margin: 25px 0; background-color: #fcfcfc;">\n'
        related_box += '  <h4 style="margin-top: 0; color: #00BFA5; font-weight: bold; font-size: 1.15rem;">💰 읽으면 무조건 돈이 되는 글</h4>\n'
        related_box += '  <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.6;">\n'
        for l_addr, l_title in links_data:
            related_box += f'    <li style="margin-bottom: 8px;"><a href="{l_addr}" target="_blank" style="color: #00796B; text-decoration: underline; font-weight: bold;">{l_title}</a></li>\n'
        related_box += '  </ul>\n'
        related_box += '</div>\n\n'
        
        # 본문 마지막 해시태그(또는 결론 하단부) 직전에 병합
        post_content = post_content.strip() + related_box
        print("[INFO] '읽으면 무조건 돈이 되는 글' 관련 내부 링크 박스 삽입 완료.")
    except Exception as e:
        print(f"[WARNING] 내부 링크 박스 생성 프로세스 도중 예외 발생: {e}")
        
    # 6. 워드프레스 예약 업로드 발행 (Rank Math SEO 메타 설명 연동)
    featured_id = main_media["id"] if main_media else None
    tag_names = blog_data.get("tags", [])
    tag_ids = get_or_create_wp_tags(tag_names)
    cat_names = blog_data.get("categories", [])
    cat_ids = get_or_create_wp_categories(cat_names)
    
    success = upload_post_to_wp(
        post_title, 
        post_content, 
        featured_media_id=featured_id, 
        tag_ids=tag_ids, 
        category_ids=cat_ids,
        seo_desc=seo_description,
        keyword=keyword
    )
    
    if success:
        # 중복 방지 DB에 링크 저장
        save_published_url(target_news["link"])
        print(f"[SUCCESS] 뉴스 [{target_news['title']}] 자동 발행 및 업로드 전체 프로세스 성공!")

def start_scheduler():
    """
    매시간마다 뉴스 수집 및 자동 발행을 수행하는 무한 루프 스케줄러
    """
    print("[INFO] 워드프레스 뉴스 자동 발행 스케줄러가 활성화되었습니다. (1시간 간격 작동)")
    while True:
        try:
            run_once()
        except Exception as e:
            print(f"[WARNING] 스케줄러 실행 중 예외 발생: {e}")
            
        print("[INFO] 1시간 동안 대기 상태에 들어갑니다...")
        time.sleep(3600)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WordPress Auto News Publisher Scheduler")
    parser.add_argument("--once", action="store_true", help="1회만 실행하고 종료합니다.")
    args = parser.parse_args()
    
    if args.once:
        run_once()
    else:
        start_scheduler()
