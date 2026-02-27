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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}