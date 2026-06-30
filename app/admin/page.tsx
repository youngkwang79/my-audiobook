// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { supabase, loginWithGoogle } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

import NovelRegistration from "./components/NovelRegistration";
import NovelEdit from "./components/NovelEdit";
import EpisodeUpload from "./components/EpisodeUpload";
import WebPushPanel from "./components/WebPushPanel";
import AutomationPanel from "./components/AutomationPanel";
import ContentFactoryPanel from "./components/ContentFactoryPanel";
import BlogQuizManager from "./components/BlogQuizManager";


export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "novels" | "episodes" | "edit" | "push" | "automation" | "contentFactory" | "blogQuiz"
  >("novels");

  const [worksList, setWorksList] = useState<any[]>([]);

  // 권한 검증
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setLoadingCheck(false);
      return;
    }

    const checkAdminRole = () => {
      const userRole = user.app_metadata?.role || user.user_metadata?.role;
      const hasAdminEmail =
        user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
      if (userRole === "admin" || hasAdminEmail) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoadingCheck(false);
    };

    checkAdminRole();
  }, [user, authLoading]);

  // 소설 목록 불러오기
  const fetchWorks = async () => {
    const { data } = await supabase
      .from("works")
      .select("id, title, free_episodes, last_voice, last_pitch, last_rate, subtitle, is_membership_only")
      .order("created_at", { ascending: false });
    if (data) {
      setWorksList(data);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchWorks();
    }
  }, [isAdmin]);

  // ✅ 비로그인 또는 권한 없을 때 화면 (로딩 완료 후에만 표시)
  if (!authLoading && !loadingCheck && !isAdmin) {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.refresh();
      window.location.reload();
    };

    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
          fontFamily: "sans-serif",
        }}
      >
        <TopBar />
        <div
          style={{
            maxWidth: 550,
            margin: "100px auto",
            textAlign: "center",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
            관리자 페이지
          </h2>

          {user ? (
            <div>
              <div
                style={{
                  background: "rgba(255,59,48,0.15)",
                  border: "1px solid #ff3b30",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 20,
                  textAlign: "left",
                }}
              >
                <div
                  style={{ fontWeight: 800, color: "#ff453a", fontSize: 15 }}
                >
                  ⚠️ 권한이 없습니다.
                </div>
                <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
                  현재 로그인된 계정: <strong>{user.email}</strong>
                </div>
              </div>
              <p
                style={{
                  opacity: 0.8,
                  fontSize: 13,
                  marginBottom: 20,
                  lineHeight: 1.6,
                  textAlign: "left",
                }}
              >
                이 계정은 관리자 화이트리스트에 등록되어 있지 않습니다.
              </p>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                다른 계정으로 로그아웃
              </button>
            </div>
          ) : (
            <div>
              <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 24 }}>
                이 페이지에 접근하려면 관리자 계정 로그인이 필요합니다.
              </p>
              <button
                onClick={() => loginWithGoogle("/admin")}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Google 관리자 로그인
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#050508",
        color: "white",
        padding: "20px 20px 80px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      <TopBar />

      <style>{`
        .admin-container {
          max-width: 900px;
          margin: 20px auto 0;
        }
        .admin-title {
          font-size: 28px;
          font-weight: 950;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #ff2a5f 0%, #fca834 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .admin-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 24px;
        }
        .admin-tab {
          padding: 12px 20px;
          font-size: 16px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
        }
        .admin-tab.active {
          color: white;
        }
        .admin-tab.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 3px;
          background: #ff2a5f;
          border-radius: 99px;
        }
        .card-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          backdrop-filter: blur(12px);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .form-label {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
        }
        .form-input, .form-select, .form-textarea {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
          color-scheme: dark;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #ff2a5f;
        }
        .form-select option {
          background-color: #121218;
          color: white;
        }
        .btn-submit {
          height: 48px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%);
          color: white;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-delete {
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(255, 59, 48, 0.4);
          background: rgba(255, 59, 48, 0.08);
          color: #ff453a;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .btn-delete:hover {
          background: rgba(255, 59, 48, 0.18);
          border-color: #ff3b30;
        }
        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-bar-fill {
          height: 100%;
          background: #ff2a5f;
          transition: width 0.1s ease-out;
        }
        .upload-dropzone:hover {
          border-color: #ff2a5f !important;
          background: rgba(255, 42, 95, 0.03) !important;
        }
      `}</style>

      <div className="admin-container">
        <h1 className="admin-title">무림북 어드민 대시보드</h1>

        {/* ✅ 권한 확인 중 인라인 배너 — 페이지를 교체하지 않아 업로드/자동화가 끊어지지 않음 */}
        {(authLoading || loadingCheck) && (
          <div
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.25)",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            관리자 권한 확인 중... (업로드/자동화는 계속 진행됩니다)
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "novels" ? "active" : ""}`}
            onClick={() => setActiveTab("novels")}
          >
            소설 등록
          </button>
          <button
            className={`admin-tab ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            작품 수정
          </button>
          <button
            className={`admin-tab ${activeTab === "episodes" ? "active" : ""}`}
            onClick={() => setActiveTab("episodes")}
          >
            회차 &amp; 오디오 업로드
          </button>
          <button
            className={`admin-tab ${activeTab === "push" ? "active" : ""}`}
            onClick={() => setActiveTab("push")}
          >
            웹 푸시 발송
          </button>
          <button
            className={`admin-tab ${activeTab === "automation" ? "active" : ""}`}
            onClick={() => setActiveTab("automation")}
          >
            오디오 자동연성 &amp; 자동화
          </button>
          <button
            className={`admin-tab ${activeTab === "contentFactory" ? "active" : ""}`}
            onClick={() => setActiveTab("contentFactory")}
          >
            콘텐츠 팩토리
          </button>
          <button
            className={`admin-tab ${activeTab === "blogQuiz" ? "active" : ""}`}
            onClick={() => setActiveTab("blogQuiz")}
          >
            블로그 퀴즈
          </button>
        </div>


        {/* ✅ display:none 방식으로 모든 패널을 마운트 유지 — 탭 전환 시 업로드/자동화 상태 보존 */}
        <div style={{ display: activeTab === "novels" ? "block" : "none" }}>
          <NovelRegistration fetchWorks={fetchWorks} worksList={worksList} />
        </div>

        <div style={{ display: activeTab === "edit" ? "block" : "none" }}>
          <NovelEdit fetchWorks={fetchWorks} worksList={worksList} />
        </div>

        <div style={{ display: activeTab === "episodes" ? "block" : "none" }}>
          <EpisodeUpload fetchWorks={fetchWorks} worksList={worksList} />
        </div>

        <div style={{ display: activeTab === "push" ? "block" : "none" }}>
          <WebPushPanel />
        </div>

        <div style={{ display: activeTab === "automation" ? "block" : "none" }}>
          <AutomationPanel fetchWorks={fetchWorks} worksList={worksList} />
        </div>

        <div style={{ display: activeTab === "contentFactory" ? "block" : "none" }}>
          <ContentFactoryPanel />
        </div>

        <div style={{ display: activeTab === "blogQuiz" ? "block" : "none" }}>
          <BlogQuizManager />
        </div>
      </div>

    </main>
  );
}
