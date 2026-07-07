# -*- coding: utf-8 -*-
"""
워드프레스 706번 글의 어색한 추천 링크 부분을 학교폭력 대처법 이전 글로 순환 매칭 수정
"""

import requests

WP_URL = "https://blog.murimbook.com"
WP_USER = "murimbook"
WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"

def main():
    post_id = 706
    url = f"{WP_URL}/wp-json/wp/v2/posts/{post_id}"
    
    # 1. 기존 포스트 가져오기
    r = requests.get(url, auth=(WP_USER, WP_PASS))
    if r.status_code != 200:
        print(f"Failed to fetch post {post_id}")
        return
        
    post_data = r.json()
    content = post_data["content"]["raw"] if "raw" in post_data["content"] else post_data["content"]["rendered"]
    
    # 2. 동떨어진 시간관리 추천 멘트를 학교폭력 대처법 5단계 글로 자연스럽게 교체
    old_target = '지금 가해자 고소를 고민하고 있다면, 이 글과 함께 무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 함께 읽어보세요. 아이가 상처를 극복하고 건강한 학업 루틴을 회복할 수 있는 실천적 솔루션을 전합니다.'
    
    # 시간관리 링크가 다양하게 인코딩되거나 다르게 들어가 있을 수 있으므로 범용 교체
    new_recommendation = '<p>가해 학생에 대한 강력한 민형사 소송과 별개로, 학폭 인지 초기에 부모가 반드시 취해야 할 행동 요령과 물적 증거 수집 가이드가 필요하시다면 무림북 블로그의 <a href="https://blog.murimbook.com/%ed%95%99%ea%b5%90%ed%8f%ad%eb%a0%a5-%eb%8c%80%ec%b2%98%eb%b2%95-5%ea%b0%80%ec%a7%80/" title="학교폭력 대처법 가이드" rel="noopener">학교폭력 대처법 5단계 행정적 대응 절차</a>를 먼저 참고해 보시기 바랍니다.</p>'
    
    # 단순 문자열 매칭이 안 될 수 있으므로, 시간관리 링크 파트 전체를 정규식이나 replace로 안전하게 교체
    import re
    updated_content = re.sub(
        r'<p>지금 가해자 고소를 고민하고 있다면.*?</p>',
        new_recommendation,
        content,
        flags=re.DOTALL
    )
    
    # 만약 p태그가 없는 원시 문자열 형태라면 fallback
    if updated_content == content:
        updated_content = content.replace(
            '무림북 블로그의 <a href="https://blog.murimbook.com/%ec%8b%9c%ea%b0%84%ea%b4%80%eb%a6%ac-%ea%b3%b5%eb%b6%80%eb%b2%95-%ec%a7%91%ec%a4%91%eb%a0%a5-%ed%96%a5%ec%83%81-%eb%b9%84%ea%b2%b0-5%ea%b0%80%ec%a7%80/" title="시간관리 공부법 칼럼" rel="noopener">시간관리 공부법 및 집중력 향상 비결</a>도 함께 읽어보세요.',
            '무림북 블로그의 <a href="https://blog.murimbook.com/%ed%95%99%ea%b5%90%ed%8f%ad%eb%a0%a5-%eb%8c%80%ec%b2%98%eb%b2%95-5%ea%b0%80%ec%a7%80/" title="학교폭력 대처법 가이드" rel="noopener">학교폭력 대처법 5단계 행정적 대응 절차</a>를 함께 읽어보세요.'
        )

    # 3. 포스트 업데이트
    r_update = requests.post(
        url,
        auth=(WP_USER, WP_PASS),
        json={"content": updated_content}
    )
    
    if r_update.status_code == 200:
        print(f"[SUCCESS] Post {post_id} updated with school violence internal link!")
    else:
        print(f"Failed to update post: {r_update.status_code}, {r_update.text}")

if __name__ == "__main__":
    main()
