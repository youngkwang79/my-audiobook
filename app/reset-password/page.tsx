"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/providers/AuthProvider";

function validatePassword(pw: string) {
  const value = pw.trim();
  return {
    ok:
      value.length >= 8 &&
      /[a-zA-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[!@#$%^&*()_\-+=\[\]{}|;:'",.<>\/?]/.test(value),
    minLenOk: value.length >= 8,
    hasLetter: /[a-zA-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[!@#$%^&*()_\-+=\[\]{}|;:'",.<>\/?]/.test(value),
  };
}

function ResetPasswordInner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      alert("로그인이 필요하거나 유효하지 않은 접근입니다. 비밀번호 재설정 메일을 다시 요청해 주세요.");
      router.replace("/login");
    }
  }, [user, loading, router]);

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = pwCheck.ok && passwordsMatch && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      alert("비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해 주세요.");
      router.replace("/login");
    } catch (e: any) {
      console.error(e);
      setMsg(e.message || "비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0b0b12",
        color: "white",
        padding: "20px 16px",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <TopBar />
      </div>

      <style>{`
        .btnBase {
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          color: white;
          font-weight: 900;
        }
        .btnNormal {
          background: rgba(255,255,255,0.12);
          cursor: pointer;
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
          margin: "20px auto 0",
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, marginBottom: 16 }}>
          비밀번호 재설정
        </h1>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              setCapsOn(e.getModifierState?.("CapsLock") ?? false);
            }}
            placeholder="새 비밀번호 (8자 이상, 영문+숫자+특수문자)"
            type="password"
            style={{
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          />

          {capsOn && <div className="hint hintBad">Caps Lock이 켜져 있습니다.</div>}

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

          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 확인"
            type="password"
            style={{
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          />

          {confirmPassword.length > 0 && !passwordsMatch && (
            <div className="hint hintBad">• 비밀번호가 일치하지 않습니다.</div>
          )}

          {confirmPassword.length > 0 && passwordsMatch && (
            <div className="hint hintGood">• 비밀번호가 일치합니다.</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "#E6D3A3",
              color: "#111",
              fontWeight: 900,
              cursor: !canSubmit ? "not-allowed" : "pointer",
              opacity: !canSubmit ? 0.55 : 1,
              marginTop: 8,
            }}
          >
            {busy ? "변경 중..." : "비밀번호 변경 완료"}
          </button>

          {msg && <div className="helpBox">{msg}</div>}

          <button
            className="btnBase btnNormal"
            onClick={() => router.push("/login")}
            style={{ marginTop: 4 }}
          >
            로그인 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div style={{ minHeight: "100dvh", background: "#0b0b12" }} />}
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
