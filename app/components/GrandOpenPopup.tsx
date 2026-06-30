"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GrandOpenPopup() {
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [hasReceivedWelcome, setHasReceivedWelcome] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check "Don't show today"
    const hideDate = localStorage.getItem("hideGrandOpenPopup");
    const today = new Date().toDateString();
    if (hideDate === today) {
      return;
    }

    // Check if user is logged in to check claim status
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const res = await fetch("/api/me/membership-eligibility", {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setHasReceivedWelcome(data.hasReceivedWelcome);
          }
        } catch (e) {}
      }
      setIsOpen1(true);
      setIsOpen2(true);
    }
    init();
  }, []);

  const handleClose1 = () => setIsOpen1(false);
  const handleClose2 = () => setIsOpen2(false);

  const handleHideToday = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      localStorage.setItem("hideGrandOpenPopup", new Date().toDateString());
      setIsOpen1(false);
      setIsOpen2(false);
    } else {
      localStorage.removeItem("hideGrandOpenPopup");
    }
  };

  const handleClaimWelcomeGift = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        window.location.href = "/login";
        return;
      }
      const res = await fetch("/api/events/claim-welcome", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert("회원가입 축하 3500 코인이 지급되었습니다!");
        setHasReceivedWelcome(true);
      } else {
        alert(data.error || "지급 실패");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen1 && !isOpen2) return null;

  return (
    <div className="popup-overlay">
      {isOpen2 && (
        <div className={`popup-content popup2 ${isOpen1 ? "popup2-back" : "popup2-front"}`}>
          <h2 className="popup-title">
            <span className="title-sub">무림북 강호 출두</span>
            <br />창작 소설 공모!
          </h2>
          
          <div className="benefits-list">
            <div className="benefit-item" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <img src="/novel_contest.jpg" alt="공모전 이미지" style={{ width: '100%', borderRadius: '8px', marginBottom: '10px', display: 'none' }} onError={(e) => e.currentTarget.style.display = 'none'} />
              <div className="b-desc" style={{ width: '100%' }}>
                <strong style={{ fontSize: '18px', marginBottom: '12px' }}>무림북 창작 소설 공모!</strong>
                <p style={{ fontSize: '15px', color: '#fff', marginBottom: '10px' }}>murimbook@naver.com 으로<br/>줄거리를 보내주세요.</p>
                <p style={{ fontSize: '15px', color: '#ffd700', marginBottom: '16px' }}>분량에 따라 코인 차등 지급!<br/><span style={{color:"#ff2a5f", fontWeight:"bold", fontSize: '18px'}}>(최대 15,000 코인)</span></p>
                <span style={{fontSize:"12px", color:"#888"}}>※ 소설 제출 후 심사를 통해 결과 안내</span>
              </div>
            </div>
          </div>

          <div className="popup-footer">
            <label className="hide-today">
              <input type="checkbox" onChange={handleHideToday} />
              <span>오늘은 그만보기</span>
            </label>
            <button className="close-btn" onClick={handleClose2}>닫기</button>
          </div>
        </div>
      )}

      {isOpen1 && (
        <div className="popup-content popup1">
          <h2 className="popup-title">
            <span className="title-sub">무림북 강호 출두</span>
            <br />그랜드 오픈 특별 이벤트!
          </h2>
          
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="b-num">1</div>
              <div className="b-desc">
                <strong>가입 축하 선물 3500 코인!</strong>
                <p>모든 가입자에게 5만원 상당의 코인 지급!</p>
                {!hasReceivedWelcome ? (
                  <button className="claim-btn" onClick={handleClaimWelcomeGift} disabled={loading}>
                    {loading ? "지급중..." : "지금 받기"}
                  </button>
                ) : (
                  <button className="claim-btn disabled" disabled>지급 완료</button>
                )}
              </div>
            </div>

            <div className="benefit-item">
              <div className="b-num">2</div>
              <div className="b-desc">
                <strong>멤버십 오픈 특가 파격 할인!</strong>
                <p>월간 멤버십 3개월간 단 1,900원 프로모션!<br/>홈페이지 내 모든 오디오북 무제한 감상 가능</p>
                <button className="go-btn" onClick={() => { setIsOpen1(false); setIsOpen2(false); window.location.href='/membership'; }}>멤버십 보러가기</button>
              </div>
            </div>

            <div className="benefit-item">
              <div className="b-num">3</div>
              <div className="b-desc">
                <strong>무림북 삼행시 이벤트!</strong>
                <p>게시판에서 삼행시를 지어주세요.<br/>1등 3,000코인 등 푸짐한 경품이!</p>
                <button className="go-btn" onClick={() => { setIsOpen1(false); setIsOpen2(false); window.location.href='/community?category=무림북 삼행시'; }}>참여하기</button>
              </div>
            </div>
          </div>

          <div className="popup-footer">
            <label className="hide-today">
              <input type="checkbox" onChange={handleHideToday} />
              <span>오늘은 그만보기</span>
            </label>
            <button className="close-btn" onClick={handleClose1}>닫기</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .popup-content {
          position: absolute;
          background: linear-gradient(180deg, #1f1a18 0%, #111012 100%);
          border: 2px solid #b38728;
          border-radius: 12px;
          width: calc(100% - 40px);
          max-width: 420px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          color: white;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(179, 135, 40, 0.4), inset 0 0 20px rgba(0,0,0,0.8);
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          font-family: 'Noto Serif KR', serif;
        }
        .popup1 {
          z-index: 2;
        }
        .popup2 {
          transition: all 0.3s ease;
        }
        .popup2-back {
          transform: translateY(-20px) scale(0.95);
          opacity: 0.8;
          filter: brightness(0.7);
          z-index: 1;
        }
        .popup2-front {
          transform: translateY(0) scale(1);
          opacity: 1;
          filter: brightness(1);
          z-index: 3;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .popup-title {
          background: url('https://www.transparenttextures.com/patterns/stardust.png'), linear-gradient(135deg, #7b0000, #3a0000);
          border-bottom: 2px solid #b38728;
          margin: 0;
          padding: 16px 20px;
          text-align: center;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.3;
          color: #fcf6ba;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          letter-spacing: 1px;
          flex-shrink: 0;
        }
        .title-sub {
          display: block;
          font-size: 14px;
          color: #b38728;
          margin-bottom: 4px;
          letter-spacing: 2px;
        }
        .benefits-list {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          flex: 1;
        }
        .benefit-item {
          display: flex;
          gap: 14px;
          background: linear-gradient(90deg, rgba(179,135,40,0.15) 0%, rgba(255,255,255,0.02) 100%);
          padding: 16px;
          border-radius: 8px;
          border-left: 3px solid #b38728;
          border-right: 1px solid rgba(179,135,40,0.2);
          border-top: 1px solid rgba(179,135,40,0.2);
          border-bottom: 1px solid rgba(179,135,40,0.2);
        }
        .b-num {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #bf953f, #fcf6ba, #b38728);
          color: #4a0000;
          font-weight: 900;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          font-family: sans-serif;
        }
        .b-desc strong {
          display: block;
          color: #ffd700;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .b-desc p {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #ccc;
          line-height: 1.4;
        }
        .claim-btn, .go-btn {
          background: linear-gradient(to right, #b38728, #fcf6ba, #b38728);
          color: #3a0000;
          border: 1px solid #7b0000;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(179,135,40,0.3);
          font-family: inherit;
        }
        .claim-btn:hover, .go-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .claim-btn.disabled {
          background: #333;
          color: #777;
          border: 1px solid #222;
          cursor: not-allowed;
          box-shadow: none;
        }
        .popup-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: rgba(0,0,0,0.3);
          border-top: 1px solid #333;
          flex-shrink: 0;
        }
        .hide-today {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #aaa;
          cursor: pointer;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 12px;
        }
      `}</style>
    </div>
  );
}
