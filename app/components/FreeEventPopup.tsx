"use client";

import { useState, useEffect } from "react";

// 이벤트 종료 날짜 (오늘부터 1달 뒤)
const EVENT_END_DATE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
})();

function formatDate(date: Date) {
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")}`;
}

export default function FreeEventPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    // "오늘 하루 보지 않기" 체크
    const hideDate = localStorage.getItem("hideFreeEventPopup");
    const today = new Date().toDateString();
    if (hideDate === today) return;

    // D-Day 계산
    const diff = EVENT_END_DATE.getTime() - Date.now();
    setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    setIsOpen(true);
  }, []);

  const handleHideToday = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      localStorage.setItem("hideFreeEventPopup", new Date().toDateString());
      setIsOpen(false);
    } else {
      localStorage.removeItem("hideFreeEventPopup");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      fontFamily: "'Noto Serif KR', 'Noto Sans KR', serif",
    }}>
      <div style={{
        position: "relative",
        width: "100%", maxWidth: "400px",
        background: "linear-gradient(160deg, #0d0d1a 0%, #12001f 50%, #0d0d1a 100%)",
        border: "1.5px solid rgba(180, 100, 255, 0.4)",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 0 60px rgba(160, 60, 255, 0.35), 0 0 120px rgba(100, 0, 200, 0.2)",
        animation: "popupSlideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}>

        {/* 배경 빛 효과 */}
        <div style={{
          position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
          width: "300px", height: "300px",
          background: "radial-gradient(circle, rgba(160,60,255,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* 헤더 */}
        <div style={{
          background: "linear-gradient(135deg, #6a0dad 0%, #9b30ff 50%, #c77dff 100%)",
          padding: "24px 20px 20px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* 헤더 빛 줄기 */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            animation: "shimmer 3s ease-in-out infinite",
          }} />

          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "3px", marginBottom: "6px" }}>
            ✦ 무림북 특별 이벤트 ✦
          </div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 900, color: "#fff", lineHeight: 1.25, letterSpacing: "-0.5px" }}>
            전체 무료 개방!
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
            지금 바로 모든 오디오북을 무료로 감상하세요
          </p>
        </div>

        {/* D-DAY 카운터 */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "12px", padding: "20px 24px 16px",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: "linear-gradient(135deg, #9b30ff, #c77dff)",
              borderRadius: "12px",
              padding: "10px 20px",
              minWidth: "70px",
            }}>
              <span style={{ fontSize: "36px", fontWeight: 900, color: "#fff", fontFamily: "sans-serif", lineHeight: 1 }}>
                {daysLeft}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "4px", display: "block" }}>DAYS LEFT</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "22px" }}>:</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", fontWeight: 600, lineHeight: 1.6 }}>
            이벤트 종료일<br />
            <span style={{ color: "#c77dff", fontWeight: 800 }}>{formatDate(EVENT_END_DATE)}</span>
          </div>
        </div>

        {/* 혜택 목록 */}
        <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { icon: "🎧", text: "사이트 내 모든 오디오북 무료 청취" },
            { icon: "📖", text: "멤버십 전용 콘텐츠 포함 전체 개방" },
            { icon: "⏰", text: `이벤트 기간: ~${formatDate(EVENT_END_DATE)}까지` },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: "rgba(155, 48, 255, 0.08)",
              border: "1px solid rgba(155, 48, 255, 0.2)",
              borderRadius: "10px", padding: "12px 14px",
            }}>
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA 버튼 */}
        <div style={{ padding: "0 24px 8px" }}>
          <button
            onClick={() => { setIsOpen(false); window.location.href = "/works"; }}
            style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #6a0dad, #9b30ff, #c77dff)",
              color: "#fff", fontWeight: 900, fontSize: "16px",
              border: "none", borderRadius: "12px", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(155, 48, 255, 0.5)",
              letterSpacing: "-0.3px",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(155, 48, 255, 0.6)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(155, 48, 255, 0.5)";
            }}
          >
            🎧 지금 바로 무료 감상하기
          </button>
        </div>

        {/* 푸터 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 24px 16px",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" onChange={handleHideToday} style={{ accentColor: "#9b30ff" }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>오늘은 그만보기</span>
          </label>
          <button onClick={() => setIsOpen(false)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.4)",
            fontSize: "13px", cursor: "pointer", fontWeight: 600, padding: "4px 8px",
          }}>
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
