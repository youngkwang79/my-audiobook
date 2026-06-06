// app/providers/AuthProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ✅ supabaseClient가 null일 수도 있으니 여기서 딱 1번만 잡고 시작
    const sb = supabase;

    // ✅ 배포 환경에서 env 빠졌을 때도 "빌드가 죽지 않게" 안전 종료
    if (!sb) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // ✅ 즉시 세션 로드
    (async () => {
      try {
        const {
          data: { session },
          error,
        } = await sb.auth.getSession();

        if (!mounted) return;

        if (error) {
  try {
    await sb.auth.signOut();
  } catch {}

  setSession(null);
  setUser(null);
} else {
  setSession(session ?? null);
  setUser(session?.user ?? null);
}
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    // ✅ 로그인/로그아웃 변화를 구독
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ✅ 웹 푸시 서비스 워커 등록 및 구독 연동
  useEffect(() => {
    if (
      loading ||
      !session?.access_token ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const vapidPublicKey = "BErJdJ0V49-dQF8kUs7fOXU_9W0ZI0wjEFq1uepwUvyMFtlyFodQbfn1p4Fkp5GacfupfJXgCXJ_cWPTUE8pJ4A";

    const registerPush = async () => {
      try {
        // 마케팅 알림 동의 여부 체크
        const isMarketingAllowed = localStorage.getItem("allowMarketingInfo") === "true";
        if (!isMarketingAllowed) {
          // 마케팅 수신동의 권장 안내 팝업 (취소 시 알림 허용을 아예 묻지 않음)
          const consent = confirm(
            "🎁 [무림북 혜택 알림 설정 안내]\n\n매일 드리는 출석 보상(무료 코인 받기) 및 작가님의 신규 에피소드 연재 소식을 실시간 알림 팝업으로 편리하게 받아보시겠습니까?\n\n(동의 시 '혜택 및 마케팅 정보 수신'이 허용 상태로 설정됩니다.)"
          );
          if (consent) {
            localStorage.setItem("allowMarketingInfo", "true");
            // 마이페이지 등 다른 컴포넌트에 변경 사항 동기화 신호 전송
            window.dispatchEvent(new Event("localstorage-marketing-updated"));
          } else {
            return; // 수신 거부 시 웹 푸시 등록 패스
          }
        }

        // 1. 서비스 워커 등록
        const registration = await navigator.serviceWorker.register("/sw.js");

        // 2. 알림 권한 체크 및 요청
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") {
          return; // 거부됨
        }

        // 3. 기존 구독 조회
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // 4. 신규 구독 생성
          const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        // 5. 서버에 푸시 구독 객체 저장 요청
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ subscription })
        });
      } catch (err) {
        console.error("웹 푸시 서비스 연동 오류:", err);
      }
    };

    registerPush();
  }, [session, loading]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        const sb = supabase;
        if (!sb) return;
        await sb.auth.signOut();
      },
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ VAPID Public Key 디코딩 헬퍼 함수
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}