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
    
    # Update Blogger draft post with TAT1109 content, including a high conversion red button
    # with the user's Naver Shopping Connect link: https://naver.me/xONKT7Qt
    # Incorporate internal/external links (like a professional public service announcement style but high marketing power)
    # Including peer blog links or backlink styles if needed, and hashtags.
    
    blog_id = "127512538129296836"
    post_id = "2556983684311625653"
    
    # 🔴 [Red Background, Bold Text, White Font button HTML]
    cta_button = """
<div style="text-align: center; margin: 35px 0;">
  <a href="https://naver.me/xONKT7Qt" target="_blank" rel="noopener noreferrer" 
     style="display: inline-block; background-color: #d92d20; color: #ffffff; padding: 18px 45px; border-radius: 50px; font-weight: 900; font-size: 22px; text-decoration: none; box-shadow: 0 6px 20px rgba(217, 45, 32, 0.4); border: 2px solid #b41d12; letter-spacing: -0.5px; transition: all 0.2s ease-in-out;">
     🔥 필립스 TAT1109 무선 이어폰 특가 혜택 바로가기 🔗
  </a>
</div>
"""

    # We also need internal/external/pear tea links.
    # Pear tea link from user's rules and script: https://naver.me/FDcVf6y9
    # Murimbook internal link (like "시간관리", "부자습관", "부동산팁" or the ones we searched: "한강공원 수영장 야간개장 7월일정", "마이크론 테크놀로지 주가전망" etc.)
    # External link: Official Philips support page or standard reference link
    
    content_html = """
<h3 data-path-to-node="2"><b data-index-in-node="0" data-path-to-node="2">오늘 하루, 당신의 마음은 안녕한가요?</b></h3>
<p data-path-to-node="3">유난히 소란스러웠던 오늘, 꽉 찬 지하철 안에서 사람들의 웅성거림이 문득 무겁게 느껴지던 순간이 있었죠. 세상의 소음을 잠시 밀어내고, 오직 나만의 고요 속으로 숨어들고 싶은 마음. 어쩌면 우리에게 필요한 건 거창한 휴식이 아니라, 아주 작은 틈 하나일지도 모릅니다.</p>

<p data-path-to-node="4"><b data-index-in-node="0" data-path-to-node="4">소음이 사라진 자리에 스며든 오후의 정적</b>을 상상해 봅니다. 필립스 TAT1109는 그런 마음을 담아 만들었습니다. 10mm의 드라이버가 들려주는 소리는 화려한 기교 대신, 묵직하고 탄탄한 울림으로 하루의 끝을 다독여줍니다. 퇴근길, 좋아하는 음악을 귀에 꽂는 순간 비로소 시작되는 나만의 작은 섬. 그곳에서는 세상의 거친 소리 대신 내가 좋아하는 멜로디만이 고요하게 머뭅니다.</p>

<!-- 본문 중간 이미지 또는 상세 이미지 배치 추천 영역 -->
<div style="text-align: center; margin: 24px 0;">
  <img src="https://blog.murimbook.com/wp-content/uploads/2026/07/philips_tat1109_detail.jpg" alt="필립스 커널형 무선 블루투스 이어폰 TAT1109 블랙 상세 컷" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
  <p style="font-size: 13px; color: #666; margin-top: 8px;">[참고 이미지] 인이어 커널형 설계로 외부 소음을 차단하고 착용감을 극대화한 필립스 TAT1109</p>
</div>

<p data-path-to-node="5"><b data-index-in-node="0" data-path-to-node="5">손끝에 닿는 온기, 코끝에 머무는 위로</b>처럼 일상의 조각들은 사소한 배려에서 완성되곤 합니다. 블루투스 5.4의 빠른 연결은 바쁜 출근길 문 앞에서 잠시 머뭇거리는 당신의 시간을 아껴주고, AI 마이크가 담긴 다정한 통화 음질은 굳이 큰 소리를 내지 않아도 당신의 진심이 온전히 상대에게 닿게 합니다. 전문적인 게이밍 모드나 가벼운 생활 방수 기능 또한, 당신의 평온한 일상이 무너지지 않도록 묵묵히 곁을 지키는 약속 같은 것이지요.</p>

<p data-path-to-node="7">거창한 노이즈 캔슬링보다는 당신의 귓가에 가장 편안하게 밀착되는 인이어의 감각을 고민했습니다. 무겁게 느껴지지 않는 가벼움과, 6시간(케이스 포함 최대 24시간)을 든든하게 채워주는 배터리의 여유. 이 제품을 만들 때 가장 고민했던 것은 '어떻게 하면 당신의 이동 시간을 조금 더 포근하게 만들 수 있을까'였습니다.</p>

<p data-path-to-node="8">오늘 밤, 당신의 소중한 일상에 이 작은 온기를 들여보는 건 어떨까요? 비싼 제품은 아니지만, 당신의 하루를 조금 더 따뜻하게 물들여줄 다정한 친구가 되어줄 거예요. 분명, 내일의 당신은 오늘보다 조금 더 평온한 아침을 맞이하게 될 것입니다.</p>

<!-- 🔴 고품격 세일즈 전환 버튼 -->
""" + cta_button + """

<hr style="border: 0; height: 1px; background: #e0e0e0; margin: 30px 0;" />

<!-- 💡 다정하고 공익적인 추가 추천 코너 (내부/외부 링크) -->
<div style="background-color: #f9f9f9; border: 1px solid #e5e5e5; padding: 20px; border-radius: 10px; font-size: 15px; line-height: 1.7; color: #555;">
  <p style="margin-top: 0; font-weight: bold; color: #333; font-size: 16px;">🌱 일상의 피로와 목 관리를 위한 작은 제안</p>
  <p>하루 종일 이어폰으로 귀를 채우고 열정적인 하루를 보내셨다면, 잠시 귀를 쉬게 해주고 메마른 목을 달래주는 따뜻한 차 한 잔 어떨까요? 목 관리에 관심이 많으신 분들 사이에서 큰 사랑을 받고 있는 <a href="https://naver.me/FDcVf6y9" target="_blank" rel="noopener noreferrer" style="color: #0066cc; font-weight: bold; text-decoration: underline;">[순수한집] 배도라지맥문동차 🔗</a>로 깊은 수분을 공급해 보세요.</p>
  
  <p style="margin-bottom: 0;">또한, 이번 7월 야외 활동을 계획 중이시라면 도심 속 힐링을 선사하는 <a href="https://blog.murimbook.com/676" target="_blank" rel="noopener noreferrer" style="color: #0066cc; font-weight: bold; text-decoration: underline;">한강공원 수영장 야간개장 일정 및 정보 🔗</a>도 함께 확인하시어 더욱 촉촉하고 활기찬 주말을 가꿔보시길 권해드립니다.</p>
</div>

<p style="font-size: 12px; color: #888; margin-top: 20px; text-align: center;">
  * 본 글은 네이버 쇼핑 커넥트 제휴 활동의 일환으로 일정 수수료를 제공받을 수 있으며, 유용한 정보 제공을 목적으로 작성되었습니다.
</p>

<!-- 해시태그 추가 -->
<p style="font-size: 14px; color: #777; margin-top: 15px; text-align: left; font-weight: 500;">
  #필립스이어폰 #무선이어폰추천 #블루투스이어폰 #TAT1109 #필립스TAT1109 #커널형이어폰 #가성비이어폰 #음질좋은이어폰 #배도라지맥문동차 #내부링크 #네이버쇼핑커넥트
</p>
"""

    post_body = {
        "title": "필립스 커널형 무선 블루투스 이어폰 TAT1109 블랙",
        "content": content_html,
        "status": "DRAFT"
    }

    print("Updating Google Blogger post...")
    updated_post = service.posts().update(
        blogId=blog_id,
        postId=post_id,
        body=post_body
    ).execute()
    
    print("SUCCESS: Updated draft post on Google Blogger.")
    print("Post URL:", updated_post.get("url"))

if __name__ == '__main__':
    main()
