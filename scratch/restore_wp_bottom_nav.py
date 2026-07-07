# -*- coding: utf-8 -*-
"""
하단 메인 탭 바에 '법률/소송'을 제거하고 원래 5개 탭(홈, 카테고리, 대출 계산기, 소개 및 문의, 더보기)으로 복원하는 스크립트
"""
import os

def restore_bottom_nav():
    file_path = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b/wordpress_bottom_nav.html"
    
    html_content = """<!-- 워드프레스 모바일 상단 검색바 및 하단 5탭 내비게이션 바 (슬라이드 바텀시트 및 카테고리 드로어 포함) -->
<!-- 이 전체 코드를 WPCode 플러그인의 'Footer' 영역에 붙여넣으시면 모바일 화면에 고정 노출됩니다. -->

<!-- 1. 모바일 상단 검색바 HTML -->
<div class="mobile-app-search-bar">
  <div class="search-input-wrapper">
    <form role="search" method="get" action="https://blog.murimbook.com/">
      <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <input class="search-field" placeholder="무림북 블로그 검색..." type="search" name="s" required />
    </form>
  </div>
</div>

<div class="wp-bottom-nav-wrapper">
  <!-- 하단 탭 내비게이션 -->
  <div class="wp-bottom-nav">
    <!-- 1. 홈 -->
    <a href="/" class="wp-nav-item">
      <svg class="wp-nav-icon" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      <span>홈</span>
    </a>
    
    <!-- 2. 카테고리 -->
    <div class="wp-nav-item" onclick="wpToggleCategoryDrawer(true)">
      <svg class="wp-nav-icon" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-7v2h14V6H7z"/></svg>
      <span>카테고리</span>
    </div>
    
    <!-- 3. 대출 계산기 (실제 페이지 주소 반영) -->
    <a href="https://blog.murimbook.com/?page_id=584" class="wp-nav-item wp-nav-calc">
      <svg class="wp-nav-icon accent" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 6h-2V7h2v2zm-4 0H9V7h2v2zm-2 2h2v2H9v-2zm4 0h2v2h-2v-2zm4 4H7v-2h10v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
      <span class="accent-text">대출 계산기</span>
    </a>
    
    <!-- 4. 소개 및 문의 (애드센스 심사용 고정) -->
    <a href="https://blog.murimbook.com/%ec%86%8c%ea%b0%9c-%eb%b0%8f-%ec%a0%9c%ed%9c%b4%eb%ac%b8%ec%9d%98/" class="wp-nav-item">
      <svg class="wp-nav-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
      <span>소개 및 문의</span>
    </a>
    
    <!-- 5. 더보기 -->
    <div class="wp-nav-item" onclick="wpToggleBottomSheet(true)">
      <svg class="wp-nav-icon" viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      <span>더보기</span>
    </div>
  </div>

  <!-- 카테고리 드로어 오버레이 HTML -->
  <div class="category-drawer-overlay" id="wpCategoryDrawerOverlay" onclick="wpToggleCategoryDrawer(false)">
    <div class="category-drawer-close-area" onclick="wpToggleCategoryDrawer(false)"></div>
    <div class="category-drawer-content" onclick="event.stopPropagation()">
      <div class="category-drawer-header">
        <h3>카테고리</h3>
        <span class="category-drawer-close-btn" onclick="wpToggleCategoryDrawer(false)">&times;</span>
      </div>
      
      <div class="category-grid">
        <a href="https://blog.murimbook.com/category/%ea%b8%88%ec%9c%b5-%ec%9e%ac%ed%85%8c%ed%81%ac/" class="category-grid-item">
          <span>💼 금융/재테크</span>
        </a>
        <a href="https://blog.murimbook.com/category/%ea%b0%95%ec%a0%9c-%ea%bf%80%ed%8c%81/" class="category-grid-item">
          <span>🍯 강제 꿀팁</span>
        </a>
        <a href="https://blog.murimbook.com/category/%ea%b1%b4%ea%b0%95-%ec%9d%98%eb%a3%8c/" class="category-grid-item">
          <span>🏥 건강/의료</span>
        </a>
        <a href="https://blog.murimbook.com/category/%ec%9e%90%eb%8f%99%ec%b0%a8-%ea%b5%90%ed%86%b5/" class="category-grid-item">
          <span>🚗 자동차/교통</span>
        </a>
        <a href="https://blog.murimbook.com/category/ai-%ec%9e%90%eb%8f%99%ed%99%94/" class="category-grid-item">
          <span>🤖 AI/자동화</span>
        </a>
        <a href="https://blog.murimbook.com/category/law/" class="category-grid-item">
          <span>⚖️ 법률/소송</span>
        </a>
      </div>
    </div>
  </div>

  <!-- 더보기 바텀시트 슬라이드 모달 -->
  <div class="wp-bottom-sheet-overlay" id="wpBottomSheetOverlay" onclick="wpToggleBottomSheet(false)">
    <div class="wp-bottom-sheet" onclick="event.stopPropagation()">
      <div class="wp-sheet-handle"></div>
      <h3 class="wp-sheet-title">무림북 더보기</h3>
      
      <div class="wp-sheet-menu">
        <!-- 0. 신규 부동산 복비 계산기 연동 -->
        <a href="https://blog.murimbook.com/%eb%b6%80%eb%8f%99%ec%82%b0-%ec%a4%91%ea%b0%9c%eb%b3%b4%ec%88%98-%ea%b3%84%ec%82%b0%ea%b8%b0-%eb%88%84%ea%b5%ac%eb%82%98-%ec%82%ac%ec%9a%a9-%ea%b0%80%eb%8a%a5-100-%eb%ac%b4%eb%a3%8c/" class="wp-sheet-menu-item">
          <span style="color: #ffd43b !important; font-weight: bold;">🏠 부동산 복비 계산기</span>
        </a>
        <!-- 1. 무림북 가기 플랫폼 연동 -->
        <a href="https://murimbook.com" target="_blank" rel="noopener" class="wp-sheet-menu-item">
          <span>⚔️ 무림북 플랫폼 바로가기</span>
        </a>
        <!-- 2. 머니 마그넷 (100억의 흐름 글) -->
        <a href="https://blog.murimbook.com/%eb%ac%b4%eb%a6%bc%eb%b6%81-%eb%a8%b8%eb%8b%88-%eb%a7%88%ea%b7%b8%eb%84%b7-money-magnet-100%ec%96%b5%ec%9d%98-%ed%9d%90%eb%a6%84/" class="wp-sheet-menu-item">
          <span>🧲 무림북 머니 마그넷</span>
        </a>
        <!-- 3. 이용약관 -->
        <a href="https://blog.murimbook.com/?p=244" class="wp-sheet-menu-item">
          <span>📜 서비스 이용약관</span>
        </a>
        <!-- 4. 개인정보 처리방침 -->
        <a href="https://blog.murimbook.com/%ea%b0%9c%ec%9d%b8%ec%a0%95%eb%b3%b4%ec%b2%98%eb%a6%ac%eb%b0%a9%ec%b9%a8-privacy-policy/" class="wp-sheet-menu-item">
          <span>🛡️ 개인정보 처리방침</span>
        </a>
        <!-- 5. 소개 및 제휴문의 -->
        <a href="https://blog.murimbook.com/%ec%86%8c%ea%b0%9c-%eb%b0%8f-%ec%a0%9c%ed%9c%b4%eb%ac%b8%ec%9d%98/" class="wp-sheet-menu-item">
          <span>🤝 소개 및 제휴문의</span>
        </a>
      </div>
      
      <button class="wp-sheet-close-btn" onclick="wpToggleBottomSheet(false)">닫기</button>
    </div>
  </div>
</div>

<style>
  /* 데스크톱(PC)에서는 하단 내비게이션 바 완전 차단 */
  @media (min-width: 769px) {
    .wp-bottom-nav-wrapper {
      display: none !important;
    }
  }

  /* 모바일(768px 이하) 전용 스타일 */
  @media (max-width: 768px) {
    .wp-bottom-nav-wrapper {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      z-index: 999999 !important;
      font-family: 'Noto Sans KR', sans-serif;
    }

    .wp-bottom-nav {
      width: 100%;
      height: calc(60px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background-color: #0b0f19;
      border-top: 1px solid #1f293d;
      display: flex;
      justify-content: space-around;
      align-items: center;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
    }

    .wp-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #ffffff !important;
      text-decoration: none !important;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      flex: 1;
      height: 100%;
      transition: all 0.2s ease;
    }

    .wp-nav-item:active {
      transform: scale(0.95);
      color: #ffd43b !important;
    }

    .wp-nav-icon {
      width: 22px;
      height: 22px;
      fill: #ffffff !important;
      transition: all 0.2s ease;
    }

    .wp-nav-item:active .wp-nav-icon {
      fill: #ffd43b !important;
    }

    /* 계산기 전용 강조 스타일 */
    .wp-nav-icon.accent {
      fill: #ffd43b !important;
    }
    .wp-nav-item .accent-text {
      color: #ffd43b !important;
      font-weight: 700;
    }

    /* 바텀시트 슬라이드 모달 */
    .wp-bottom-sheet-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .wp-bottom-sheet-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .wp-bottom-sheet {
      width: 100%;
      background: #161c2a;
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      border: 1px solid #1f293d;
      border-bottom: none;
      padding: 20px 20px calc(24px + env(safe-area-inset-bottom));
      box-sizing: border-box;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .wp-bottom-sheet-overlay.active .wp-bottom-sheet {
      transform: translateY(0);
    }

    .wp-sheet-handle {
      width: 40px;
      height: 4px;
      background-color: #374151;
      border-radius: 2px;
      margin: 0 auto 5px auto;
    }

    .wp-sheet-title {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #ffd43b !important;
      text-align: center;
      margin: 0 !important;
    }

    .wp-sheet-menu {
      display: flex;
      flex-direction: column;
      border: 1px solid #1f293d;
      border-radius: 12px;
      background-color: #1f293d;
      overflow: hidden;
    }

    .wp-sheet-menu-item {
      display: flex;
      align-items: center;
      padding: 15px;
      color: #f3f4f6 !important;
      text-decoration: none !important;
      font-size: 14px;
      font-weight: 600;
      border-bottom: 1px solid #161c2a;
      transition: background-color 0.2s;
    }

    .wp-sheet-menu-item:last-child {
      border-bottom: none;
    }

    .wp-sheet-menu-item:active {
      background-color: #161c2a;
    }

    .wp-sheet-close-btn {
      width: 100%;
      background: #ffd43b !important;
      color: #0b0f19 !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      height: 46px;
      border-radius: 10px;
      cursor: pointer;
      border: none !important;
      transition: all 0.2s;
    }

    .wp-sheet-close-btn:active {
      transform: scale(0.98);
    }
  }

  /* 검색 입력창 글씨 색상 하얀색 강제 적용 */
  .search-field {
    color: #ffffff !important;
  }
  .search-field::placeholder {
    color: #ffffff !important;
    opacity: 1 !important;
  }

  /* 카테고리/아카이브 페이지 상단 흰색 배경 제거 및 텍스트 흰색 강제 */
  .page-header, 
  .separate-containers .page-header,
  .archive-header {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 16px 12px 0 12px !important;
    margin: 0 !important;
  }
  .page-header h1,
  .page-header .page-title {
    color: #ffffff !important;
    font-size: 20px !important;
    font-weight: 800 !important;
  }
</style>

<script>
  // 더보기 바텀시트 토글
  function wpToggleBottomSheet(isOpen) {
    const overlay = document.getElementById('wpBottomSheetOverlay');
    if (isOpen) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }

  // [복원] 카테고리 드로어 토글 (기존 블로그 테마 CSS 클래스 활성화)
  function wpToggleCategoryDrawer(isOpen) {
    const overlay = document.getElementById('wpCategoryDrawerOverlay');
    if (overlay) {
      if (isOpen) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    }
  }
</script>
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("[SUCCESS] Bottom nav restored to 5 standard tabs successfully.")

if __name__ == "__main__":
    restore_bottom_nav()
