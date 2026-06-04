"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

// 뒤로가기 아이콘
function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

// 아이콘 매핑용 SVG 컴포넌트들
function CardIcon({ type }: { type: string }) {
  if (type === "profile") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fca834" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (type === "history") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }
  if (type === "coin") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffcc00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  if (type === "membership") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      </svg>
    );
  }
  // alert / warning
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function WithdrawPage() {
  const router = useRouter();
  const { user, session, loading, signOut } = useAuth();

  const [currentCoins, setCurrentCoins] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // 1. 코인 잔액 조회
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch("/api/me/wallet", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setCurrentCoins(Number(data.points ?? 0) + Number(data.reward_points ?? 0));
        }
      } catch (e) {
        console.error("지갑 정보 조회 오류:", e);
      }
    };

    if (user && session) {
      fetchWallet();
    }
  }, [user, session]);

  // 2. 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 3. 회원 탈퇴 API 요청
  const handleWithdraw = async () => {
    if (!agreed || countdown > 0 || submitting) return;

    if (!confirm("정말 탈퇴하시겠습니까?\n계정이 영구 삭제되며 무림북 내 모든 데이터가 즉시 소멸합니다.")) {
      return;
    }

    setSubmitting(true);
    try {
      const token = session?.access_token;
      if (!token) {
        alert("로그인 세션이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        alert("회원 탈퇴가 안전하게 처리되었습니다.\n그동안 무림북을 이용해 주셔서 진심으로 감사합니다.");
        
        // Supabase 로그아웃 및 로컬스토리지 정리
        await signOut();
        try {
          localStorage.clear();
        } catch (e) {}

        router.replace("/");
      } else {
        alert(data?.error || "탈퇴 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e) {
      console.error("탈퇴 오류:", e);
      alert("탈퇴 처리 중 알 수 없는 에러가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000000", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span>불러오는 중...</span>
      </main>
    );
  }

  const coinDisplay = currentCoins !== null ? `${currentCoins.toLocaleString()} P` : "조회 중...";

  return (
    <main className="withdraw-bg">
      <style>{`
        .withdraw-bg {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding-bottom: calc(40px + env(safe-area-inset-bottom));
        }

        .withdraw-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .withdraw-header {
          display: flex;
          align-items: center;
          position: relative;
          height: 56px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .withdraw-back-btn {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .withdraw-title {
          width: 100%;
          text-align: center;
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .withdraw-intro {
          font-size: 14px;
          color: #8c8c96;
          line-height: 1.6;
          text-align: center;
          margin-top: 10px;
        }

        .withdraw-cards-label {
          font-size: 14.5px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: -10px;
        }

        .withdraw-card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .withdraw-card {
          background: #16161e;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .withdraw-card-icon-wrap {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .withdraw-card-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .withdraw-card-title {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .withdraw-card-desc {
          font-size: 12.5px;
          color: #8c8c96;
          line-height: 1.45;
          margin: 0;
        }

        .withdraw-agree-wrapper {
          margin-top: 10px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(255, 69, 58, 0.03);
          border: 1px solid rgba(255, 69, 58, 0.08);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }

        .withdraw-checkbox {
          width: 20px;
          height: 20px;
          accent-color: #ff453a;
          cursor: pointer;
        }

        .withdraw-agree-text {
          font-size: 13.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.4;
        }

        .withdraw-submit-btn {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          font-size: 15.5px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          margin-top: 10px;
        }

        .withdraw-submit-btn.disabled {
          background: #24242e;
          color: #55555d;
          cursor: not-allowed;
        }

        .withdraw-submit-btn.active {
          background: #ff453a;
          color: #ffffff;
        }

        .withdraw-submit-btn.active:active {
          opacity: 0.9;
        }
      `}</style>

      <div className="withdraw-container">
        {/* 헤더 */}
        <div className="withdraw-header">
          <button className="withdraw-back-btn" onClick={() => router.back()}>
            <BackIcon />
          </button>
          <h3 className="withdraw-title">회원 탈퇴</h3>
        </div>

        {/* 인트로 설명 */}
        <div className="withdraw-intro">
          무림북을 이용해 주셔서 감사합니다. 계정을 삭제하시면 아래 유의사항에 따라 회원님의 모든 데이터와 구매 혜택이 영구적으로 소멸되며 다시 복구할 수 없습니다.
        </div>

        {/* 유의사항 타이틀 */}
        <div className="withdraw-cards-label">아래 데이터의 소멸에 동의해 주세요.</div>

        {/* 유의사항 카드 리스트 */}
        <div className="withdraw-card-list">
          <div className="withdraw-card">
            <div className="withdraw-card-icon-wrap">
              <CardIcon type="profile" />
            </div>
            <div className="withdraw-card-info">
              <h4 className="withdraw-card-title">기본 프로필 및 식별 정보 소멸</h4>
              <p className="withdraw-card-desc">가입 시 입력된 이메일 정보와 등록하신 닉네임이 시스템에서 완벽하게 즉시 영구 파기됩니다.</p>
            </div>
          </div>

          <div className="withdraw-card">
            <div className="withdraw-card-icon-wrap">
              <CardIcon type="history" />
            </div>
            <div className="withdraw-card-info">
              <h4 className="withdraw-card-title">서재 보관 기록 및 청취 발자취 초기화</h4>
              <p className="withdraw-card-desc">작품 보관함 저장 목록, 이어듣기 진행도, 자막/오디오 재생 관련 기록들이 전부 복구 불가하도록 완전 제거됩니다.</p>
            </div>
          </div>

          <div className="withdraw-card">
            <div className="withdraw-card-icon-wrap">
              <CardIcon type="coin" />
            </div>
            <div className="withdraw-card-info">
              <h4 className="withdraw-card-title">잔여 코인 정보 즉시 소멸</h4>
              <p className="withdraw-card-desc">
                현재 회원님이 보유 중인 무림 내공 코인(<span style={{ color: "#ffcc00", fontWeight: 800 }}>{coinDisplay}</span>)은 탈퇴 즉시 자동 환수 및 파기되며, 어떠한 경우에도 환불이나 이관이 불가합니다.
              </p>
            </div>
          </div>

          <div className="withdraw-card">
            <div className="withdraw-card-icon-wrap">
              <CardIcon type="membership" />
            </div>
            <div className="withdraw-card-info">
              <h4 className="withdraw-card-title">구독 후원 혜택 및 에피소드 감상 권한 종료</h4>
              <p className="withdraw-card-desc">활성화된 모든 후원 멤버십 정보 및 소설 회차별 잠금 해제 혜택이 정지되어, 에피소드 청취 권한이 일괄 박탈됩니다.</p>
            </div>
          </div>

          <div className="withdraw-card">
            <div className="withdraw-card-icon-wrap">
              <CardIcon type="alert" />
            </div>
            <div className="withdraw-card-info">
              <h4 className="withdraw-card-title">중복 접속 및 다기능 동시 차단</h4>
              <p className="withdraw-card-desc">다른 기기에서 로그인된 계정은 탈퇴 완료 즉시 인증 세션이 만료되며, 즉시 해당 기기에서의 무림북 앱 이용이 제한됩니다.</p>
            </div>
          </div>
        </div>

        {/* 동의 체크박스 */}
        <label className="withdraw-agree-wrapper">
          <input
            type="checkbox"
            className="withdraw-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={submitting}
          />
          <span className="withdraw-agree-text">
            위 유의사항에 따른 위험과 데이터의 영구적 손실을 이해하였으며, 무림북 계정의 영구 삭제에 동의합니다.
          </span>
        </label>

        {/* 삭제 제출 버튼 */}
        <button
          className={`withdraw-submit-btn ${agreed && countdown === 0 && !submitting ? "active" : "disabled"}`}
          onClick={handleWithdraw}
          disabled={!agreed || countdown > 0 || submitting}
        >
          {submitting
            ? "탈퇴 처리 중..."
            : countdown > 0
            ? `계정 삭제 (${countdown}초 대기)`
            : "계정 영구 삭제하기"}
        </button>
      </div>
    </main>
  );
}
