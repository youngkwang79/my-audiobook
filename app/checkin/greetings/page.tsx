"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

async function getAccessToken() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CheckinGreetingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [theme, setTheme] = useState("dark");
  const [greetings, setGreetings] = useState<any[]>([]);
  const [newGreeting, setNewGreeting] = useState("");
  const [greetingDone, setGreetingDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {}
  }, []);

  const loadGreetings = async () => {
    try {
      const res = await fetch("/api/attendance/greeting");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.greetings) {
        setGreetings(data.greetings);
      }
    } catch (e) {}
  };

  const checkUserGreetingStatus = async () => {
    if (!user) return;
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch("/api/me/tasks", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.completedTasks) {
        const todayStr = getTodayDateString();
        const taskId = `greeting_${todayStr}`;
        if (data.completedTasks.includes(taskId)) {
          setGreetingDone(true);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadGreetings();
    if (user) {
      checkUserGreetingStatus();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요한 미션입니다. 문파 가입(로그인)을 먼저 해주세요!");
      return;
    }
    const val = newGreeting.trim();
    if (!val) {
      alert("오늘의 인사말을 입력해주세요.");
      return;
    }
    if (val.length > 100) {
      alert("인사말은 100자 이하로 작성해주세요.");
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("로그인 세션이 만료되었습니다.");

      const res = await fetch("/api/attendance/greeting", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: val }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 409) {
        alert("오늘 이미 문안 인사를 기록하셨습니다.");
        setGreetingDone(true);
        return;
      }
      if (!res.ok) throw new Error(data?.message ?? "인사 등록 실패");

      alert("문안 인사가 기록되었습니다! +10 코인이 적립되었습니다 🎉");
      setNewGreeting("");
      setGreetingDone(true);
      loadGreetings();
      
      // 지갑 잔액 변경 브로드캐스트
      window.dispatchEvent(new Event("wallet-updated"));
    } catch (err: any) {
      alert(err?.message ?? "오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`gt-root ${theme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Noto+Serif+KR:wght@500;700;900&display=swap');

        * { box-sizing: border-box; }

        .gt-root {
          min-height: 100dvh;
          background: #0d0c10;
          color: #ffffff;
          font-family: 'Outfit', ui-sans-serif, system-ui, "Noto Sans KR", Arial;
        }

        .gt-wrap {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 0 60px;
          display: flex;
          flex-direction: column;
        }

        /* 헤더 */
        .gt-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 56px;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .gt-back {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
        }

        .gt-page-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 17px;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.2px;
        }

        /* 안내 설명 */
        .gt-info-box {
          margin: 16px;
          background: linear-gradient(135deg, #1d1222 0%, #141217 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .gt-info-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-weight: 900;
          color: #ffe066;
          margin: 0;
        }

        .gt-info-desc {
          font-size: 12.5px;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
          margin: 0;
        }

        /* 인사말 입력 서판 */
        .gt-form-section {
          margin: 0 16px 16px;
          background: #141217;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }

        .gt-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .gt-input {
          width: 100%;
          min-height: 80px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px;
          color: #ffffff;
          font-size: 13.5px;
          outline: none;
          resize: none;
          transition: border-color 0.2s;
        }

        .gt-input:focus {
          border-color: #ffe066;
        }

        .gt-submit-btn {
          width: 100%;
          height: 46px;
          background: linear-gradient(135deg, #bf953f 0%, #aa771c 100%);
          border: none;
          border-radius: 12px;
          color: #141217;
          font-family: 'Noto Serif KR', serif;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: opacity 0.2s;
          box-shadow: 0 4px 12px rgba(170,119,28,0.2);
        }

        .gt-submit-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .gt-done-msg {
          background: rgba(255,224,102,0.05);
          border: 1px dashed rgba(255,224,102,0.2);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          font-size: 13.5px;
          color: #ffe066;
          font-weight: 600;
        }

        /* 📜 동도들의 방명록 피드 */
        .gt-feed-section {
          margin: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .gt-feed-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 16px;
          font-weight: 900;
          color: #ffffff;
          margin: 8px 0 4px;
        }

        .gt-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .gt-card {
          background: #141217;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .gt-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
        }

        .gt-user {
          color: #f7d070;
          font-weight: 700;
        }

        .gt-text {
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          line-height: 1.45;
          word-break: break-all;
        }

        .gt-empty {
          text-align: center;
          padding: 40px 0;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
        }

        /* ── 라이트 모드 고대비 오버라이드 ── */
        .gt-root.light {
          background: #f6f4eb !important;
          color: #2b2724 !important;
        }
        .gt-root.light .gt-header {
          background: #fdfbf7;
          border-bottom: 1px solid #e1dbcd;
        }
        .gt-root.light .gt-back {
          color: #2b2724;
        }
        .gt-root.light .gt-page-title {
          color: #2b2724;
        }
        .gt-root.light .gt-info-box {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 4px 16px rgba(180, 160, 120, 0.08);
        }
        .gt-root.light .gt-info-title {
          color: #8b152d;
        }
        .gt-root.light .gt-info-desc {
          color: #5d564f;
        }
        .gt-root.light .gt-form-section {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 4px 16px rgba(180, 160, 120, 0.12);
        }
        .gt-root.light .gt-input {
          background: rgba(0,0,0,0.02);
          border: 1px solid #e1dbcd;
          color: #2b2724;
        }
        .gt-root.light .gt-input:focus {
          border-color: #aa771c;
        }
        .gt-root.light .gt-submit-btn {
          background: linear-gradient(135deg, #8b152d 0%, #600d1e 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(139,21,45,0.2);
        }
        .gt-root.light .gt-done-msg {
          background: rgba(139,21,45,0.04);
          border-color: rgba(139,21,45,0.15);
          color: #8b152d;
        }
        .gt-root.light .gt-feed-title {
          color: #2b2724;
        }
        .gt-root.light .gt-card {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 2px 8px rgba(180, 160, 120, 0.08);
        }
        .gt-root.light .gt-user {
          color: #8b152d;
        }
        .gt-root.light .gt-text {
          color: #2b2724;
        }
        .gt-root.light .gt-empty {
          color: #8e877c;
        }
        .gt-root.light .gt-meta {
          color: #8e877c;
        }
      `}</style>

      <div className="gt-wrap">
        {/* 헤더 */}
        <div className="gt-header">
          <button className="gt-back" onClick={() => router.back()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="gt-page-title">일일 문안 인사</h1>
        </div>

        {/* 안내 상자 */}
        <div className="gt-info-box">
          <h3 className="gt-info-title">📜 출석 한마디 적고 보상 받기</h3>
          <p className="gt-info-desc">
            오늘의 다짐이나 가벼운 인사를 남겨 문안 인사를 기록해 보세요.
            매일 처음 인사를 남기실 때 <strong>+10 코인</strong>이 지갑에 적립됩니다!
          </p>
        </div>

        {/* 작성 서판 */}
        <div className="gt-form-section">
          {greetingDone ? (
            <div className="gt-done-msg">
              오늘의 문안 인사 등록을 완료하셨습니다. ✓<br />
              지갑에 +10 코인이 정상 적립되었습니다.
            </div>
          ) : (
            <form className="gt-form" onSubmit={handleSubmit}>
              <textarea
                className="gt-input"
                placeholder={user ? "오늘도 힘차게 하루를 시작해 봅니다! (100자 이내)" : "문파 가입(로그인)을 하신 뒤 문안 인사를 적으실 수 있습니다."}
                value={newGreeting}
                onChange={(e) => setNewGreeting(e.target.value)}
                disabled={!user || loading}
                maxLength={100}
              />
              <button
                type="submit"
                className="gt-submit-btn"
                disabled={!user || loading || !newGreeting.trim()}
              >
                {loading ? "기록하는 중..." : "인사글 남기기 (+10 🪙)"}
              </button>
            </form>
          )}
        </div>

        {/* 📜 피드 */}
        <div className="gt-feed-section">
          <h2 className="gt-feed-title">📜 동도들의 문안 인사 목록</h2>
          <div className="gt-list">
            {greetings.length > 0 ? (
              greetings.map((g) => (
                <div className="gt-card" key={g.id}>
                  <div className="gt-meta">
                    <span className="gt-user">{g.username}</span>
                    <span>{new Date(g.created_at).toLocaleDateString()} {new Date(g.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="gt-text">{g.content}</div>
                </div>
              ))
            ) : (
              <div className="gt-empty">아직 인사말이 비어 있습니다. 첫 문안을 남겨보세요!</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
