"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import TopBar from "@/app/components/TopBar";
import { loadGameFromCloud } from "@/lib/gameSave";
import { useGameStore } from "@/app/lib/game/useGameStore";

function toKoreanAuthError(message?: string) {
  const msg = (message || "").toLowerCase();

  if (msg.includes("invalid login credentials")) return "로그인 정보가 올바르지 않습니다.";
  if (msg.includes("email not confirmed")) return "이메일 인증이 필요합니다.";
  if (msg.includes("user already registered")) return "이미 가입된 이메일입니다.";
  if (msg.includes("password")) return "비밀번호 조건을 확인해 주세요.";

  return message || "오류가 발생했습니다.";
}

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

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "find-email" | "forgot-password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "kakao" | "discord" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nickname, setNickname] = useState("");
  const [allowNotifications, setAllowNotifications] = useState(false);

  const redirect = searchParams.get("redirect") || "/";
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (ref) {
      localStorage.setItem("referral_code", ref);
      console.log("Referral code detected and saved:", ref);
    }
  }, [ref]);

  const emailOk = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const pwCheck = useMemo(() => validatePassword(password), [password]);

  const canSubmit = useMemo(() => {
    if (!supabase) return false;
    if (mode === "signup") {
      return emailOk && pwCheck.ok && nickname.trim().length >= 2;
    }
    if (mode === "login") {
      return emailOk && pwCheck.ok;
    }
    if (mode === "find-email") {
      return nickname.trim().length >= 2;
    }
    if (mode === "forgot-password") {
      return emailOk;
    }
    return false;
  }, [supabase, mode, emailOk, pwCheck.ok, nickname]);

  useEffect(() => {
    if (!loading && user) {
      syncCloudSave(user.id).finally(() => {
        router.replace(redirect);
      });
    }
  }, [loading, user, router, redirect]);

  async function syncCloudSave(userId: string) {
    try {
      const cloudData = await loadGameFromCloud(userId);

      if (cloudData) {
        const store = useGameStore.getState() as any;

        if (typeof store.importGameData === "function") {
          store.importGameData(cloudData);
          console.log("Supabase 클라우드 데이터 동기화 완료");
        }
      }
    } catch (e) {
      console.error("클라우드 저장 데이터 동기화 실패:", e);
    }
  }

  async function signInWithProvider(provider: "google" | "kakao" | "discord") {
    setMsg(null);

    if (!supabase) {
      setMsg(
        [
          "로그인 설정이 아직 배포에 반영되지 않았습니다.",
          "Vercel 환경변수 저장 후 반드시 Redeploy 해주세요.",
        ].join("\n")
      );
      return;
    }

    setOauthBusy(provider);

    const origin = window.location.origin;
    const redirectTo = `${origin}/login?redirect=${encodeURIComponent(
      redirect
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams:
          provider === "google"
            ? {
              access_type: "offline",
              prompt: "select_account",
            }
            : undefined,
      },
    });

    if (error) {
      setOauthBusy(null);
      setMsg(toKoreanAuthError(error.message));
    }
  }

  async function onSubmit() {
    setMsg(null);

    if (!supabase) {
      setMsg("로그인 설정이 아직 배포에 반영되었습니다.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const origin = window.location.origin;
        const emailRedirectTo = `${origin}/login?redirect=${encodeURIComponent(
          redirect
        )}`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              nickname: nickname.trim(),
              allow_notifications: allowNotifications,
            },
          },
        });

        if (error) throw error;

        setMsg(
          [
            "회원가입 요청이 완료되었습니다.",
            "입력한 이메일로 인증 메일이 발송됩니다.",
            "메일함에서 인증을 완료한 뒤 로그인해 주세요.",
          ].join("\n")
        );
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace(redirect);
      } else if (mode === "find-email") {
        const res = await fetch("/api/auth/find-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname }),
        });
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
          setMsg(`이메일 찾기 성공!\n가입된 이메일: ${data.email}`);
        } else {
          setMsg(data?.error || "이메일을 찾을 수 없습니다.");
        }
      } else if (mode === "forgot-password") {
        const origin = window.location.origin;
        const redirectTo = `${origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) throw error;

        setMsg("비밀번호 재설정 이메일이 발송되었습니다.\n입력하신 이메일의 메일함을 확인해 주세요.");
      }
    } catch (e: any) {
      setMsg(toKoreanAuthError(e?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0b0b12",
        color: "white",
        padding: "20px 16px",
      }}
    >
      {oauthBusy && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              padding: 22,
              borderRadius: 18,
              background: "rgba(15,15,22,0.96)",
              border: "1px solid rgba(255,215,120,0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 950 }}>
              {oauthBusy === "google" ? "구글 로그인 중..." :
                oauthBusy === "kakao" ? "카카오 로그인 중..." :
                  "디스코드 로그인 중..."}
            </div>
            <div style={{ marginTop: 10, opacity: 0.72 }}>
              로그인 완료 후 무림북으로 돌아옵니다.
            </div>
          </div>
        </div>
      )}

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
        .socialBtn {
          padding: 12px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: center;
        }
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
          {mode === "login" ? "로그인" : 
           mode === "signup" ? "회원가입" : 
           mode === "find-email" ? "아이디(이메일) 찾기" : 
           "비밀번호 재설정"}
        </h1>

        {(mode === "login" || mode === "signup") && (
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
                background:
                  mode === "login"
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.06)",
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
                background:
                  mode === "signup"
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              회원가입
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div className="helpBox">
            {"회원가입 진행방법\n"}
            {"1. 이메일과 비밀번호를 입력해 주세요.\n"}
            {"2. 회원가입 버튼을 누르면 인증 메일이 발송됩니다.\n"}
            {"3. 메일함에서 인증을 완료한 뒤 로그인해 주세요.\n\n"}
            {"비밀번호 안내\n"}
            {"- 알파벳, 숫자, 특수문자를 조합하여 8자 이상으로 입력해 주세요.\n"}
            {"- 예시: Abcd1234#"}
          </div>
        )}

        {mode === "find-email" && (
          <div className="helpBox" style={{ marginTop: 14 }}>
            {"아이디(이메일) 찾기 안내\n"}
            {"1. 회원가입 시 등록하신 닉네임을 정확히 입력해 주세요.\n"}
            {"2. 아래 버튼을 누르면 닉네임에 매핑된 이메일을 알려드립니다.\n"}
            {"* 개인정보 보호를 위해 찾으신 이메일 주소의 일부는 마스킹 처리되어 노출됩니다."}
          </div>
        )}

        {mode === "forgot-password" && (
          <div className="helpBox" style={{ marginTop: 14 }}>
            {"비밀번호 재설정 안내\n"}
            {"1. 가입 시 사용하신 이메일 주소를 입력해 주세요.\n"}
            {"2. 아래 버튼을 클릭하면 비밀번호 재설정 링크가 담긴 인증 메일이 발송됩니다.\n"}
            {"3. 수신하신 메일 안의 링크를 통해 새 비밀번호를 등록할 수 있습니다."}
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {(mode === "signup" || mode === "find-email") && (
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 (2자 이상)"
              type="text"
              maxLength={20}
              style={{
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
              }}
            />
          )}

          {mode === "signup" && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                cursor: "pointer",
                fontSize: "14px",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={allowNotifications}
                onChange={(e) => setAllowNotifications(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#E6D3A3",
                  cursor: "pointer",
                }}
              />
              <span>신규 업데이트 알림 받기 (모바일 푸시 허용)</span>
            </label>
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot-password") && (
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              type="email"
              style={{
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
              }}
            />
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot-password") && !emailOk && email.trim().length > 0 && (
            <div className="hint hintBad">이메일 형식을 확인해 주세요.</div>
          )}

          {(mode === "login" || mode === "signup") && (
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                setCapsOn(e.getModifierState?.("CapsLock") ?? false);
                if (e.key === "Enter" && canSubmit && !busy) {
                  onSubmit();
                }
              }}
              onKeyUp={(e) =>
                setCapsOn(e.getModifierState?.("CapsLock") ?? false)
              }
              placeholder="비밀번호(8자 이상, 영문+숫자+특수문자 포함)"
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
          )}

          {(mode === "login" || mode === "signup") && capsOn && <div className="hint hintBad">Caps Lock이 켜져 있습니다.</div>}

          {(mode === "login" || mode === "signup") && password.length > 0 && (
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

          {mode === "login" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 2, marginBottom: 2, padding: "0 4px" }}>
              <button 
                type="button"
                onClick={() => { setMode("find-email"); setMsg(null); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "6px 0", fontSize: 13 }}
              >
                아이디(이메일) 찾기
              </button>
              <button 
                type="button"
                onClick={() => { setMode("forgot-password"); setMsg(null); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "6px 0", fontSize: 13 }}
              >
                비밀번호 찾기 (재설정)
              </button>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={busy || !canSubmit}
            style={{
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "#E6D3A3",
              color: "#111",
              fontWeight: 900,
              cursor: busy || !canSubmit ? "not-allowed" : "pointer",
              opacity: busy || !canSubmit ? 0.55 : 1,
            }}
          >
            {mode === "login"
              ? busy
                ? "로그인 중..."
                : "로그인"
              : mode === "signup"
                ? busy
                  ? "가입 중..."
                  : "회원가입"
                : mode === "find-email"
                  ? busy
                    ? "찾는 중..."
                    : "이메일 찾기"
                  : busy
                    ? "메일 발송 중..."
                    : "비밀번호 재설정 링크 발송"}
          </button>

          {(mode === "find-email" || mode === "forgot-password") && (
            <button
              type="button"
              className="btnBase btnNormal"
              onClick={() => { setMode("login"); setMsg(null); }}
              style={{ marginTop: 4 }}
            >
              로그인 화면으로 돌아가기
            </button>
          )}

          {(mode === "login" || mode === "signup") && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  className="socialBtn"
                  disabled={!!oauthBusy}
                  onClick={() => signInWithProvider("google")}
                  style={{
                    background: "#ffffff",
                    color: "#111111",
                    fontSize: 14,
                    opacity: oauthBusy ? 0.65 : 1,
                  }}
                >
                  구글 로그인
                </button>

                <button
                  type="button"
                  className="socialBtn"
                  disabled={!!oauthBusy}
                  onClick={() => signInWithProvider("kakao")}
                  style={{
                    background: "#FEE500",
                    color: "#191919",
                    fontSize: 14,
                    opacity: oauthBusy ? 0.65 : 1,
                  }}
                >
                  카카오 로그인
                </button>
              </div>

              <button
                type="button"
                className="socialBtn"
                disabled={!!oauthBusy}
                onClick={() => signInWithProvider("discord")}
                style={{
                  background: "#5865F2",
                  color: "#ffffff",
                  opacity: oauthBusy ? 0.65 : 1,
                }}
              >
                디스코드 로그인
              </button>
            </>
          )}

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div style={{ minHeight: "100dvh", background: "#0b0b12" }} />}
    >
      <LoginPageInner />
    </Suspense>
  );
}