"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";

export default function MembershipManagePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    let alive = true;
    try {
      // 테마 동기화
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {}

    const syncSub = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !alive) return;

        const res = await fetch("/api/me/restore", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data && alive) {
          if (data.success && data.plan) {
            localStorage.setItem("membership", data.plan);
            setSubscribedPlan(data.plan);
          } else {
            localStorage.removeItem("membership");
            setSubscribedPlan(null);
          }
        }
      } catch (e) {
        console.error("멤버십 동기화 실패:", e);
      }
    };

    syncSub();

    return () => {
      alive = false;
    };
  }, []);

  const handleCancelMembership = async () => {
    if (confirm("정말 멤버십 자동결제를 해지하시겠습니까? 해지 시 다음 결제일부터 멤버십 전용 혜택이 중단됩니다.")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          alert("로그인이 필요합니다.");
          return;
        }

        const res = await fetch("/api/me/unsubscribe", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "해지 실패");
        }

        localStorage.removeItem("membership");
        setSubscribedPlan(null);
        alert("정기결제가 정상적으로 해지되었습니다.\n(Toss Payments 자동결제 빌링 취소 API 연동 완료 예정)");
        window.dispatchEvent(new Event("wallet-updated"));
      } catch (e: any) {
        console.error("해지 에러:", e);
        alert("해지 처리 중 오류가 발생했습니다: " + e.message);
      }
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000000", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span>불러오는 중...</span>
      </main>
    );
  }

  // 플랜별 한글 이름 매칭
  const getPlanName = (plan: string) => {
    switch (plan) {
      case "weekly":
        return "주간 무제한 이용권 사용중 (주간)";
      case "monthly":
        return "월간 무제한 이용권 사용중 (월간)";
      case "yearly":
      case "annual":
        return "연간 무제한 이용권 사용중 (연간)";
      default:
        return `${plan} 멤버십 서비스`;
    }
  };

  return (
    <main className="manage-main">
      <style>{`
        .manage-main {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding: 16px 16px 80px;
          box-sizing: border-box;
        }

        .manage-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .manage-header {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 44px;
        }

        .back-btn-manage {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .manage-page-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }

        .manage-card {
          background: #16161e;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 18px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .status-badge {
          background: rgba(255, 42, 95, 0.1);
          color: #ff2a5f;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }

        .status-badge.inactive {
          background: rgba(255, 255, 255, 0.06);
          color: #8c8c96;
        }

        .plan-info-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          line-height: 1.4;
        }

        .plan-info-desc {
          font-size: 14px;
          color: #8c8c96;
          margin: 0;
          line-height: 1.6;
        }

        .btn-manage-action {
          width: 100%;
          height: 52px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-manage-action.join {
          background: linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(255, 42, 95, 0.3);
        }

        .btn-manage-action.join:active {
          transform: scale(0.98);
          opacity: 0.95;
        }

        .btn-manage-action.cancel {
          background: #1c1c1e;
          color: #ff453a;
          border: 1px solid rgba(255, 69, 58, 0.15);
        }

        .btn-manage-action.cancel:active {
          background: #2c2c2e;
        }

        /* ☀️ 라이트 테마 대응 */
        html.light .manage-main {
          background: #f4f4f7 !important;
          color: #1c1c1e !important;
        }

        html.light .back-btn-manage {
          color: #1c1c1e !important;
        }

        html.light .manage-card {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
        }

        html.light .status-badge.inactive {
          background: rgba(0, 0, 0, 0.04);
          color: #8c8c96;
        }

        html.light .plan-info-desc {
          color: #66666e !important;
        }

        html.light .btn-manage-action.cancel {
          background: #ffffff !important;
          border: 1px solid rgba(255, 69, 58, 0.2) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
        }

        html.light .btn-manage-action.cancel:active {
          background: #f4f4f7 !important;
        }
      `}</style>

      <div className="manage-container">
        {/* 헤더 */}
        <div className="manage-header">
          <button className="back-btn-manage" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2 className="manage-page-title">멤버십 관리</h2>
        </div>

        {/* 멤버십 상태 카드 */}
        <div className="manage-card">
          {subscribedPlan ? (
            <>
              <div className="status-badge">구독 중</div>
              <div>
                <h3 className="plan-info-title">{getPlanName(subscribedPlan)}</h3>
                <p className="plan-info-desc" style={{ marginTop: 8 }}>
                  자동 결제 예정일: 다음 주기 결제일<br />
                  매주/매년 정기 결제가 진행됩니다.
                </p>
              </div>
              <button className="btn-manage-action cancel" onClick={handleCancelMembership}>
                해제하기
              </button>
            </>
          ) : (
            <>
              <div className="status-badge inactive">미가입</div>
              <div>
                <h3 className="plan-info-title">가입된 멤버십이 없습니다.</h3>
                <p className="plan-info-desc" style={{ marginTop: 8 }}>
                  멤버십에 가입하시면 오디오북 무제한 듣기,<br />
                  신작 우선 공개 등 풍성한 혜택을 누리실 수 있습니다.
                </p>
              </div>
              <button className="btn-manage-action join" onClick={() => router.push("/membership")}>
                멤버십 가입하기
              </button>
            </>
          )}
        </div>
      </div>

      {/* 하단 탭바 */}
      <BottomNav />
    </main>
  );
}
