"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

// 1) 에러 메시지 한글 매핑
function toKoreanAuthError(message?: string) {
  const msg = (message || "").toLowerCase();

  if (msg.includes("invalid login credentials")) return "로그인 정보가 올바르지 않습니다.";
  if (msg.includes("email not confirmed")) return "이메일 인증이 필요합니다. 받은 메일함에서 인증을 완료해 주세요.";
  if (msg.includes("user already registered")) return "이미 가입된 이메일입니다.";
  if (msg.includes("password")) return "비밀번호 조건을 확인해 주세요.";

  return message || "오류가 발생했습니다.";
}

// 2) 비밀번호 규칙: 8자 이상 + 영문 + 숫자 + 특수문자
function validatePassword(pw: string) {
  const value = pw.trim();

  const minLenOk = value.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*()_\-+=\[\]{}|;:'",.<>\/?]/.test(value);

  return {
    ok: minLenOk && hasLetter && hasNumber && hasSpecial,
    minLenOk,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const pwCheck = useMemo(() => validatePassword(password), [password]);

  // ✅ supabase가 null이면 제출 자체를 막음
  const canSubmit = useMemo(() => !!supabase && emailOk && pwCheck.ok, [emailOk, pwCheck.ok]);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit() {
    setMsg(null);

    // ✅ 여기서부터 “온라인에서 터지는 문제” 방어
    if (!supabase) {
      setMsg(
        [
          "로그인 설정이 아직 배포에 반영되지 않았습니다.",
          "Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) 저장 후",
          "반드시 Redeploy(재배포) 해주세요.",
        ].join("\n")
      );
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        setMsg(
          [
            "회원가입 요청이 완료되었습니다.",
            "입력한 이메일로 인증 메일이 발송됩니다.",
            "메일함에서 인증을 완료한 뒤 로그인해 주세요.",
          ].join("\n")
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      }
    } catch (e: any) {
      setMsg(toKoreanAuthError(e?.message));
    } finally {
      setBusy(false);
    }
  }

  // ✅ 로그인/회원가입 둘 다 조건 충족하면 금빛 (원하면 signup만 금빛으로 바꿔도 됨)
  const isGoldActive = canSubmit && !busy;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 24 }}>
      {/* CSS(반짝/황금 효과) */}
      <style>{`
        .btnBase {
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          color: white;
          font-weight: 900;
          transition: all 180ms ease;
        }
        .btnDisabled {
          background: rgba(255,255,255,0.04);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .btnNormal {
          background: rgba(255,255,255,0.12);
          cursor: pointer;
        }

        /* 황금 + 글로우 + 반짝 */
        .btnGold {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #b8860b, #ffd700, #b8860b);
          color: #111;
          border: 1px solid rgba(255, 215, 0, 0.65);
          box-shadow: 0 0 18px rgba(255, 215, 0, 0.35);
          transform: translateY(-1px);
          cursor: pointer;
        }
        .btnGold:hover {
          box-shadow: 0 0 26px rgba(255, 215, 0, 0.45);
          transform: translateY(-2px);
        }
        .btnGold::after {
          content: "";
          position: absolute;
          top: -40%;
          left: -60%;
          width: 60%;
          height: 180%;
          background: rgba(255,255,255,0.35);
          transform: rotate(25deg);
          animation: shine 1.4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shine {
          0%   { left: -70%; opacity: 0; }
          25%  { opacity: 0.35; }
          50%  { left: 120%; opacity: 0.15; }
          100% { left: 140%; opacity: 0; }
        }

        .helpBox {
          margin-top: 6px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.25);
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .hint {
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.4;
          margin-top: -2px;
        }
        .hintGood { color: rgba(255,255,255,0.85); }
        .hintBad { color: rgba(255,160,160,0.95); }
      `}</style>

      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>

        {!supabase && (
          <div className="helpBox" style={{ borderColor: "rgba(255,180,180,0.35)" }}>
            현재 배포 환경에서 Supabase 설정이 감지되지 않았습니다.
            {"\n"}Vercel 환경변수 저장 후 Redeploy를 해주세요.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={() => {
              setMode("login");
              setMsg(null);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: mode === "login" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            로그인
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setMsg(null);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: mode === "signup" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            회원가입
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            type="email"
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          />
          {!emailOk && email.trim().length > 0 && <div className="hint hintBad">이메일 형식을 확인해 주세요.</div>}

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호(8자 이상, 영문+숫자+특수문자 포함)"
            type="password"
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          />

          {password.length > 0 && (
            <>
              <div className={`hint ${pwCheck.minLenOk ? "hintGood" : "hintBad"}`}>
                • 8자 이상 {pwCheck.minLenOk ? "충족" : "필요"}
              </div>
              <div className={`hint ${pwCheck.hasLetter ? "hintGood" : "hintBad"}`}>
                • 영문 포함 {pwCheck.hasLetter ? "충족" : "필요"}
              </div>
              <div className={`hint ${pwCheck.hasNumber ? "hintGood" : "hintBad"}`}>
                • 숫자 포함 {pwCheck.hasNumber ? "충족" : "필요"}
              </div>
              <div className={`hint ${pwCheck.hasSpecial ? "hintGood" : "hintBad"}`}>
                • 특수문자 포함 {pwCheck.hasSpecial ? "충족" : "필요"}
              </div>
            </>
          )}

          <button
            className={[
              "btnBase",
              busy || !canSubmit ? "btnDisabled" : isGoldActive ? "btnGold" : "btnNormal",
            ].join(" ")}
            onClick={onSubmit}
            disabled={busy || !canSubmit}
          >
            {mode === "login" ? (busy ? "로그인 중..." : "로그인") : busy ? "가입 중..." : "회원가입"}
          </button>

          {msg && <div className="helpBox">{msg}</div>}

          <button
            className="btnBase btnNormal"
            onClick={() => router.push("/")}
            style={{ marginTop: 4 }}
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
