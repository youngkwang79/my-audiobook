"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("결제 상태를 확인하고 있습니다...");

  useEffect(() => {
    const type = searchParams.get("type");
    const plan = searchParams.get("plan");
    
    // PortOne V2 redirects append these query params
    const paymentId = searchParams.get("paymentId") 
      || searchParams.get("payment_id") 
      || searchParams.get("issueId") 
      || searchParams.get("issue_id")
      || searchParams.get("merchant_order_ref")
      || searchParams.get("merchantOrderRef")
      || searchParams.get("merchant_issue_id")
      || searchParams.get("merchantIssueId");
    const billingKey = searchParams.get("billingKey") 
      || searchParams.get("billing_key")
      || searchParams.get("subscription_order_ref")
      || searchParams.get("subscriptionOrderRef");
    const code = searchParams.get("code");
    const message = searchParams.get("message") || "결제에 실패했습니다.";

    const safeRedirect = (targetPath: string) => {
      if (typeof window !== "undefined") {
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobile && window.history.length > 2) {
          // 모바일: PG사 결제 인증창(전체 페이지 리다이렉트)을 스택에서 건너뛰기 위해 go(-2)
          window.history.go(-2);
          setTimeout(() => {
            try {
              window.location.replace(targetPath);
            } catch (e) {
              router.replace(targetPath);
            }
          }, 100);
        } else if (window.history.length > 1) {
          // PC: PG사가 팝업/이프레임으로 뜨므로 main 히스토리에 쌓이지 않음.
          // /payments/redirect 임시 페이지만 지우기 위해 go(-1) 후 replace
          window.history.go(-1);
          setTimeout(() => {
            try {
              window.location.replace(targetPath);
            } catch (e) {
              router.replace(targetPath);
            }
          }, 100);
        } else {
          router.replace(targetPath);
        }
      } else {
        router.replace(targetPath);
      }
    };

    async function handleRedirect() {
      if (!type || !paymentId) {
        const rawSearch = typeof window !== "undefined" ? window.location.search : "";
        setStatusMessage(`잘못된 접근입니다.\n(전송된 값 - type: ${type || '없음'}, ID: ${paymentId || '없음'})\nURL: ${rawSearch}`);
        setTimeout(() => router.replace("/"), 10000); // 10초 대기하여 사용자가 볼 수 있도록 함
        return;
      }

      // 1) 결제창에서 실패/취소하고 돌아온 경우 처리
      if (code != null) {
        setStatusMessage("결제가 취소되었거나 실패했습니다.");
        try {
          await supabase
            .from("orders")
            .update({ status: "FAILED" })
            .eq("payment_id", paymentId);
        } catch (dbErr) {
          console.error("Failed to update order status to FAILED:", dbErr);
        }
        alert(`결제 실패: ${message}`);
        safeRedirect(type === "membership" ? "/membership" : "/points");
        return;
      }

      // 2) 성공한 경우 서버 API를 호출하여 최종 승인 처리
      setStatusMessage("결제 승인을 완료하고 있습니다. 잠시만 기다려 주세요...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          alert("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
          router.replace("/login");
          return;
        }

        const token = session.access_token;

        if (type === "coin") {
          // 코인 충전 승인 API 호출
          const res = await fetch("/api/payments/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentId }),
          });

          const data = await res.json().catch(() => null);

          if (res.ok && data?.ok) {
            alert("충전이 완료되었습니다!");
            safeRedirect("/points");
          } else {
            alert(`충전 승인 처리 실패: ${data?.error || "알 수 없는 오류"}`);
            safeRedirect("/points");
          }
        } else if (type === "membership") {
          // 멤버십 정기결제 빌링키 승인 API 호출
          if (!billingKey) {
            alert("빌링키 발급 정보가 유효하지 않습니다.");
            safeRedirect("/membership");
            return;
          }

          const res = await fetch("/api/me/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ plan: plan || "weekly", paymentId, billingKey }),
          });

          const data = await res.json().catch(() => null);

          if (res.ok) {
            localStorage.setItem("membership", plan || "weekly");
            alert(`${plan === "weekly" ? "주간" : "연간"} 멤버십 가입이 완료되었습니다!`);
            safeRedirect("/");
          } else {
            alert(`멤버십 구독 승인 실패: ${data?.error || "알 수 없는 오류"}`);
            safeRedirect("/membership");
          }
        }
      } catch (err: any) {
        console.error("Error during payment redirect processing:", err);
        alert(`결제 승인 처리 중 에러가 발생했습니다: ${err.message || err}`);
        safeRedirect(type === "membership" ? "/membership" : "/points");
      }
    }

    handleRedirect();
  }, [searchParams, router]);

  return (
    <div className="redirect-box">
      <div className="spinner"></div>
      <div className="status-text">{statusMessage}</div>
      <div className="caption-text">창을 닫거나 뒤로 가기를 누르지 마세요.</div>
    </div>
  );
}

export default function RedirectHandlerPage() {
  return (
    <div className="redirect-container">
      <style>{`
        .redirect-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f15 0%, #050508 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          padding: 20px;
          text-align: center;
        }
        .redirect-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px 30px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 215, 120, 0.1);
          border-top: 4px solid #ffd700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .status-text {
          font-size: 16px;
          font-weight: 700;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
        }
        .caption-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <Suspense fallback={
        <div className="redirect-box">
          <div className="spinner"></div>
          <div className="status-text">결제 정보 읽는 중...</div>
          <div className="caption-text">창을 닫거나 뒤로 가기를 누르지 마세요.</div>
        </div>
      }>
        <RedirectContent />
      </Suspense>
    </div>
  );
}
