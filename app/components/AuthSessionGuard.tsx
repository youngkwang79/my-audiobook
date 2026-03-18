"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

const PROTECTED_PREFIXES = ["/work", "/points"];

export default function AuthSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    const checkAndRedirect = () => {
      if (document.visibilityState !== "visible") return;

      if (!user && isProtected) {
        try {
          localStorage.removeItem("points");
          localStorage.removeItem("lastPlayed");
        } catch {}

        router.replace("/");
      }
    };

    const handleVisibilityChange = () => {
      checkAndRedirect();
    };

    const handleFocus = () => {
      checkAndRedirect();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, loading, pathname, router]);

  return null;
}