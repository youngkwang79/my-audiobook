"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";
import TopBar from "@/app/components/TopBar";

const CATEGORIES = ["전체", "자유 대담", "소설 평론", "무공 비급", "창작 소설"];

async function getAccessToken() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");

  // 모달 상태
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<any | null>(null);

  // 새 글 필드
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("자유 대담");
  const [submittingPost, setSubmittingPost] = useState(false);

  // 댓글 필드
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // 테마
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {}
  }, []);

  // 일일 문안인사 바로가기 파라미터 처리
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openWriteModal") === "1") {
        setActiveCategory("자유 대담");
        setNewCategory("자유 대담");
        setWriteModalOpen(true);
        router.replace("/community?category=자유 대담");
      }
    }
  }, [router]);

  // 글 목록 불러오기
  const loadPosts = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const catParam = activeCategory !== "전체" ? `?category=${encodeURIComponent(activeCategory)}` : "";
      const res = await fetch(`/api/community/posts${catParam}`, {
        headers,
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.posts) {
        setPosts(data.posts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeCategory]);

  // 특정 글 상세 조회 시 댓글도 함께 로드
  const loadComments = async (postId: string) => {
    try {
      setLoadingComments(true);
      const res = await fetch(`/api/community/comments?postId=${postId}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.comments) {
        setComments(data.comments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenDetail = (post: any) => {
    setDetailPost(post);
    setNewComment("");
    loadComments(post.id);
  };

  const handleCloseDetail = () => {
    setDetailPost(null);
    setComments([]);
  };

  // 새 글 등록
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다. 문파 가입(로그인)을 먼저 해주세요!");
      return;
    }

    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setSubmittingPost(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("로그인 세션 만료");

      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          category: newCategory,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "등록 실패");

      if (data?.earnedGreetingReward) {
        alert("강호게시판에 글이 등록되었습니다. 📜\n\n🎁 일일 문안 인사 미션 완료 보상 +10 코인 지급 완료!");
        window.dispatchEvent(new Event("wallet-updated"));
      } else {
        alert("강호게시판에 글이 등록되었습니다. 📜");
      }
      setNewTitle("");
      setNewContent("");
      setWriteModalOpen(false);
      loadPosts();
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    } finally {
      setSubmittingPost(false);
    }
  };

  // 댓글 등록
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    const val = newComment.trim();
    if (!val) return;

    setSubmittingComment(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("로그인 세션 만료");

      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: detailPost.id,
          content: val,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "댓글 등록 실패");

      setNewComment("");
      loadComments(detailPost.id);
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // 추천(좋아요) 토글
  const handleLikeToggle = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("추천은 로그인 후 가능합니다. 문판 가입을 해주세요!");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("로그인 세션 만료");

      const res = await fetch("/api/community/likes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "추천 처리 실패");

      // 목록 상태 업데이트
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: data.isLiked, likes_count: data.likesCount }
            : p
        )
      );

      // 상세 모달 상태도 열려 있다면 업데이트
      if (detailPost && detailPost.id === postId) {
        setDetailPost((prev: any) => ({
          ...prev,
          isLiked: data.isLiked,
          likes_count: data.likesCount,
        }));
      }
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    }
  };

  return (
    <main className={`com-root ${theme}`}>
      <title>강호게시판 - 무림북</title>
      <meta name="description" content="고품격 오디오 소설 플랫폼 무림북의 공식 강호게시판. 무협 팬들과의 소통과 토론방." />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Noto+Serif+KR:wght@500;700;900&display=swap');

        .com-root {
          min-height: 100dvh;
          background: #0b0b12;
          color: #f3f4f6;
          font-family: 'Outfit', ui-sans-serif, system-ui, "Noto Sans KR", sans-serif;
          padding-bottom: 90px;
        }

        .com-wrap {
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
        }

        /* ── 상단 정보 ── */
        .com-header {
          text-align: center;
          margin-bottom: 18px;
        }

        .com-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 26px;
          color: #ffd700;
          text-shadow: 0 0 12px rgba(255,215,0,0.3);
          font-weight: 950;
          margin: 8px 0 4px;
        }

        .com-desc {
          font-size: 12px;
          color: #8c8c96;
          margin: 0;
        }

        /* ── 카테고리 스크롤 ── */
        .com-cats {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          margin-bottom: 16px;
          padding-bottom: 4px;
        }
        .com-cats::-webkit-scrollbar {
          display: none;
        }

        .com-cat {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 99px;
          padding: 6px 14px;
          color: #8c8c96;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .com-cat.active {
          background: #ffd700;
          border-color: #ffd700;
          color: #0b0b12;
          box-shadow: 0 4px 10px rgba(255,215,0,0.2);
        }

        /* ── 포스트 리스트 ── */
        .post-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .post-card {
          background: #141217;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
          text-align: left;
        }

        .post-card:active {
          transform: scale(0.98);
        }

        .post-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .post-category {
          background: rgba(255, 215, 0, 0.1);
          color: #ffd700;
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
        }

        .post-date {
          font-size: 11px;
          color: #5b5b66;
        }

        .post-title {
          font-size: 16px;
          font-weight: 850;
          color: #ffffff;
          line-height: 1.4;
          margin: 0 0 6px;
        }

        .post-snippet {
          font-size: 13px;
          color: #8c8c96;
          line-height: 1.5;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .post-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.04);
          padding-top: 10px;
        }

        .author-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .author-badge {
          background: linear-gradient(135deg, #2b1d00 0%, #171103 100%);
          border: 1px solid #ffd700;
          color: #ffd700;
          font-size: 9px;
          font-weight: 900;
          border-radius: 4px;
          padding: 1px 4px;
          letter-spacing: -0.2px;
        }

        .author-name {
          font-size: 12px;
          font-weight: 700;
          color: #d1d1d6;
        }

        .post-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #8c8c96;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 4px;
        }

        .stat-btn.active {
          color: #ff2a5f;
        }

        /* ── 플로팅 글쓰기 버튼 ── */
        .write-float-btn {
          position: fixed;
          bottom: calc(74px + env(safe-area-inset-bottom));
          right: calc((100% - 480px) / 2 + 16px);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%);
          border: none;
          box-shadow: 0 8px 20px rgba(212,162,60,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2b1d00;
          font-size: 26px;
          cursor: pointer;
          z-index: 900;
          transition: transform 0.2s;
        }

        @media (max-width: 480px) {
          .write-float-btn {
            right: 16px;
          }
        }

        .write-float-btn:active {
          transform: scale(0.9);
        }

        /* ── 모달 공통 ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 10000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .modal-card {
          width: 100%;
          max-width: 480px;
          background: #141217;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 20px;
          max-height: 85dvh;
          overflow-y: auto;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
          animation: slideUp 0.25s cubic-bezier(0.1, 0.8, 0.2, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 18px;
          font-weight: 900;
          color: #ffd700;
        }

        .modal-close {
          background: none;
          border: none;
          color: #8c8c96;
          font-size: 22px;
          cursor: pointer;
          padding: 4px;
        }

        /* ── 폼 구성요소 ── */
        .form-group {
          margin-bottom: 16px;
          text-align: left;
        }

        .form-label {
          display: block;
          font-size: 12px;
          color: #8c8c96;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .form-select {
          width: 100%;
          background: #1c1c24;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: white;
          padding: 10px;
          font-size: 14px;
          outline: none;
        }

        .form-input {
          width: 100%;
          background: #1c1c24;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: white;
          padding: 10px;
          font-size: 14px;
          outline: none;
        }

        .form-textarea {
          width: 100%;
          background: #1c1c24;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: white;
          padding: 10px;
          font-size: 14px;
          outline: none;
          resize: vertical;
          min-height: 150px;
        }

        .submit-btn {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%);
          border: none;
          color: #2b1d00;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          margin-top: 10px;
        }

        .submit-btn:disabled {
          opacity: 0.5;
        }

        /* ── 글 상세화면 ── */
        .detail-post-body {
          text-align: left;
        }

        .detail-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 12px;
          color: #8c8c96;
        }

        .detail-title {
          font-size: 20px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .detail-content {
          font-size: 14px;
          color: #d1d1d6;
          line-height: 1.6;
          white-space: pre-wrap;
          margin-bottom: 24px;
          background: rgba(255,255,255,0.02);
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.04);
        }

        .detail-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .recommend-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 42, 95, 0.08);
          border: 1.5px solid rgba(255, 42, 95, 0.2);
          border-radius: 20px;
          color: #ff2a5f;
          font-weight: 850;
          font-size: 13px;
          padding: 8px 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recommend-btn.active {
          background: #ff2a5f;
          color: white;
          box-shadow: 0 4px 12px rgba(255,42,95,0.3);
        }

        /* ── 댓글 섹션 ── */
        .comments-section {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 18px;
          text-align: left;
        }

        .comments-title {
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .comment-item {
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .comment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .comment-user {
          font-size: 12px;
          font-weight: 700;
          color: #d1d1d6;
        }

        .comment-date {
          font-size: 10px;
          color: #5b5b66;
        }

        .comment-content {
          font-size: 13px;
          color: #b8b0c8;
          line-height: 1.4;
        }

        .comment-form {
          margin-top: 14px;
          display: flex;
          gap: 8px;
        }

        .comment-input {
          flex: 1;
          background: #1c1c24;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: white;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
        }

        .comment-btn {
          background: #ffd700;
          color: #0b0b12;
          border: none;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          padding: 0 14px;
          cursor: pointer;
        }

        .comment-btn:disabled {
          opacity: 0.5;
        }

        .novel-welcome-banner {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(20, 18, 23, 0.6) 100%);
          border: 1px dashed rgba(255, 215, 0, 0.35);
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          position: relative;
          overflow: hidden;
          text-align: left;
        }
        .novel-welcome-banner::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #ffd700;
        }
        .novel-banner-content {
          flex: 1;
        }
        .novel-banner-badge {
          display: inline-block;
          background: #ff2a5f;
          color: #ffffff;
          font-size: 9px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 4px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .novel-banner-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 6px 0;
        }
        .novel-banner-desc {
          font-size: 11.5px;
          color: #a1a1aa;
          line-height: 1.55;
          margin: 0;
        }
        .novel-banner-desc strong {
          color: #ffd700;
        }
        .novel-banner-icon {
          font-size: 32px;
          filter: drop-shadow(0 2px 8px rgba(255, 215, 0, 0.25));
          user-select: none;
          animation: float-scroll 4s infinite ease-in-out;
        }
        @keyframes float-scroll {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
      `}</style>

      {/* 데스크탑 탑바 */}
      <div className="desktop-topbar">
        <TopBar />
      </div>

      <div className="com-wrap">
        {/* 상단 정보 */}
        <div className="com-header">
          <h1 className="com-title">강호게시판</h1>
          <p className="com-desc">강호 동도들과 지혜를 나누고 연공을 기록하는 공간</p>
        </div>

        {/* 카테고리 탭 */}
        <div className="com-cats">
          {CATEGORIES.map((cat) => (
            <button
              id={`cat-${cat}`}
              key={cat}
              className={`com-cat ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 창작 소설 안내 배너 */}
        {activeCategory === "창작 소설" && (
          <div className="novel-welcome-banner">
            <div className="novel-banner-content">
              <span className="novel-banner-badge">오디오북 제작 지원</span>
              <h4 className="novel-banner-title">✍️ 강호 기인들의 창작 소설방</h4>
              <p className="novel-banner-desc">
                나만의 무협 소설을 기맥 넘치게 펼쳐내 주십시오!<br />
                독자 동도분들께서 투고해 주신 훌륭한 창작 소설은 심사를 통해 <strong>무림북 정식 오디오북 작품으로 제작</strong>하여 온 천하에 선포해 드립니다. 함께 만들어가는 새로운 무림을 지향합니다.
              </p>
            </div>
            <div className="novel-banner-icon">📜</div>
          </div>
        )}

        {/* 포스트 리스트 */}
        {loading ? (
          <div style={{ padding: "60px 0", color: "#ffd700", fontWeight: 800 }}>강호 전령을 읽는 중... 🍃</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: "80px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            기록된 서신(글)이 없습니다. 첫 서신을 남겨보세요.
          </div>
        ) : (
          <div className="post-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-card"
                onClick={() => handleOpenDetail(post)}
              >
                <div className="post-card-header">
                  <span className="post-category">{post.category}</span>
                  <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="post-title">{post.title}</h2>
                <p className="post-snippet">{post.content}</p>
                <div className="post-footer">
                  <div className="author-info">
                    <span className="author-badge">
                      {post.author_faction} / {post.author_realm}
                    </span>
                    <span className="author-name">{post.username}</span>
                  </div>
                  <div className="post-stats">
                    <button
                      className="stat-btn"
                      onClick={(e) => handleLikeToggle(post.id, e)}
                    >
                      <span style={{ color: post.isLiked ? "#ff2a5f" : "#8c8c96" }}>
                        {post.isLiked ? "❤️" : "🤍"}
                      </span>
                      <span>{post.likes_count}</span>
                    </button>
                    <div className="stat-item">
                      <span>💬</span>
                      <span>답글</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 플로팅 글쓰기 버튼 */}
      <button
        id="btn-write-post"
        className="write-float-btn"
        onClick={() => {
          if (!user) {
            alert("로그인이 필요합니다. 문파 가입(로그인)을 먼저 해주세요!");
            return;
          }
          if (activeCategory !== "전체") {
            setNewCategory(activeCategory);
          } else {
            setNewCategory("자유 대담");
          }
          setWriteModalOpen(true);
        }}
        title="새 글 작성"
      >
        ＋
      </button>

      {/* 글쓰기 모달 */}
      {writeModalOpen && (
        <div className="modal-overlay" onClick={() => setWriteModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">강호 서신 기록</span>
              <button className="modal-close" onClick={() => setWriteModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handlePostSubmit}>
              <div className="form-group">
                <label className="form-label">문파 전령 분류</label>
                <select
                  id="select-category"
                  className="form-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.slice(1).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">제목</label>
                <input
                  id="input-post-title"
                  type="text"
                  className="form-input"
                  placeholder="강호 동도들의 이목을 끌 제목..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <textarea
                  id="textarea-post-content"
                  className="form-textarea"
                  placeholder="대화 나누고 싶은 서사 또는 무공 공략법..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  maxLength={2000}
                  required
                />
              </div>
              <button
                id="btn-submit-post"
                type="submit"
                className="submit-btn"
                disabled={submittingPost}
              >
                {submittingPost ? "봉인 인장 전송 중..." : "서신 날리기 ✉️"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 글 상세 & 댓글 모달 */}
      {detailPost && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{detailPost.category}</span>
              <button className="modal-close" onClick={handleCloseDetail}>×</button>
            </div>
            
            <div className="detail-post-body">
              <h2 className="detail-title">{detailPost.title}</h2>
              <div className="detail-meta">
                <div className="author-info">
                  <span className="author-badge">
                    {detailPost.author_faction} / {detailPost.author_realm}
                  </span>
                  <span style={{ fontWeight: 800 }}>{detailPost.username}</span>
                </div>
                <span>{new Date(detailPost.created_at).toLocaleString()}</span>
              </div>
              <div className="detail-content">{detailPost.content}</div>

              {/* 추천 버튼 */}
              <div className="detail-actions">
                <button
                  id="btn-recommend-post"
                  className={`recommend-btn ${detailPost.isLiked ? "active" : ""}`}
                  onClick={(e) => handleLikeToggle(detailPost.id, e)}
                >
                  <span>{detailPost.isLiked ? "❤️" : "🤍"}</span>
                  <span>천하 경의 {detailPost.likes_count}</span>
                </button>
              </div>

              {/* 댓글 섹션 */}
              <div className="comments-section">
                <h3 className="comments-title">답글 기록 ({comments.length}개)</h3>
                
                {loadingComments ? (
                  <div style={{ color: "#ffd700", fontSize: 12 }}>답글 비전서를 여는 중... 📖</div>
                ) : comments.length === 0 ? (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "10px 0" }}>
                    아직 달린 답글이 없습니다. 첫 답글을 남겨보세요.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                    {comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-user">{comment.username}</span>
                          <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="comment-content">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 댓글 폼 */}
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="comment-form">
                    <input
                      id="input-comment"
                      type="text"
                      className="comment-input"
                      placeholder="답글을 작성하세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={300}
                      required
                    />
                    <button
                      id="btn-submit-comment"
                      type="submit"
                      className="comment-btn"
                      disabled={submittingComment}
                    >
                      기록
                    </button>
                  </form>
                ) : (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 12, textAlign: "center" }}>
                    로그인하시면 강호 답글을 달 수 있습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <BottomNav />
    </main>
  );
}
