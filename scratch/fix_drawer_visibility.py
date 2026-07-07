# -*- coding: utf-8 -*-
"""
카테고리 드로어 오버레이의 초기 상태를 보이지 않도록 CSS 스타일을 수정하는 복원 스크립트
"""
import os

def fix_drawer_visibility():
    file_path = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b/wordpress_bottom_nav.html"
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # CSS 스타일 내에 category-drawer-overlay의 숨김 속성 정의를 주입합니다.
    target_style = ".wp-sheet-close-btn:active {\n      transform: scale(0.98);\n    }\n  }"
    replacement_style = """.wp-sheet-close-btn:active {
      transform: scale(0.98);
    }

    /* 카테고리 드로어 오버레이 초기 숨김 속성 강제 추가 */
    .category-drawer-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(4px) !important;
      z-index: 1000000 !important;
      display: none !important;
      align-items: flex-end !important;
      justify-content: center !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease !important;
    }

    .category-drawer-overlay.active {
      display: flex !important;
      opacity: 1 !important;
    }

    .category-drawer-content {
      width: 100% !important;
      background: #1f2937 !important;
      border-top-left-radius: 24px !important;
      border-top-right-radius: 24px !important;
      border: 1px solid #374151 !important;
      padding: 24px 20px calc(24px + env(safe-area-inset-bottom)) !important;
      box-sizing: border-box !important;
      transform: translateY(100%) !important;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }

    .category-drawer-overlay.active .category-drawer-content {
      transform: translateY(0) !important;
    }

    .category-drawer-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 20px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      padding-bottom: 12px !important;
    }

    .category-drawer-header h3 {
      margin: 0 !important;
      font-size: 18px !important;
      font-weight: 800 !important;
      color: #ffffff !important;
    }

    .category-drawer-close-btn {
      font-size: 28px !important;
      color: rgba(255, 255, 255, 0.4) !important;
      cursor: pointer !important;
      line-height: 1 !important;
    }

    .category-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
      max-height: 50dvh !important;
      overflow-y: auto !important;
    }

    .category-grid-item {
      display: flex !important;
      align-items: center !important;
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      padding: 14px 16px !important;
      border-radius: 12px !important;
      color: #e2e8f0 !important;
      text-decoration: none !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      transition: all 0.2s ease !important;
    }
  }"""
    
    updated_content = content.replace(target_style, replacement_style)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print("[SUCCESS] Re-defined category-drawer CSS rule to hide overlay by default.")

if __name__ == "__main__":
    fix_drawer_visibility()
