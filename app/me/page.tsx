"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";
import { requestIdentityVerification } from "@portone/browser-sdk/v2";

// 설정 기어 아이콘
function GearIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

// 복사 아이콘
function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.8 }}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

// 꺾쇠 오른쪽 아이콘
function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

// 노란색 코인 아이콘
function CoinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ marginRight: 2 }}
    >
      <circle cx="12" cy="12" r="10" fill="#fca834" />
      <circle
        cx="12"
        cy="12"
        r="7"
        stroke="#ffffff"
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="15"
        fill="#ffffff"
        fontSize="9"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        P
      </text>
    </svg>
  );
}

// Supabase 액세스 토큰 획득
async function getAccessToken() {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return null;
  return session?.access_token ?? null;
}

// 뒤로가기 아이콘
function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

// 쓰레기통 아이콘
function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.8 }}
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );
}

// 비밀번호 강도 검사 헬퍼
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

// 동양풍 아바타 프리셋 SVG 헬퍼
function getAvatarPresetSvg(
  preset: string | null | undefined,
  textFallback: string,
) {
  const cleanPreset = (preset || "").toLowerCase();
  const size = "100%";

  if (cleanPreset === "sword") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #2b0c0c 0%, #150505 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d4af37",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffd700"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="20" y1="10" x2="14" y2="4"></line>
          <line x1="10" y1="20" x2="4" y2="14"></line>
          <line x1="2" y1="22" x2="7" y2="17"></line>
          <line x1="22" y1="2" x2="17" y2="7"></line>
        </svg>
      </div>
    );
  }
  if (cleanPreset === "scholar") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0c182b 0%, #050a12 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d4af37",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffd700"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </div>
    );
  }
  if (cleanPreset === "taoist") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0c2b14 0%, #051209 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d4af37",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffd700"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path
            d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10 10 10 0 0 0 0-20z"
            fill="#ffd700"
            opacity="0.3"
          ></path>
          <circle cx="12" cy="7" r="1" fill="#ffd700"></circle>
          <circle cx="12" cy="17" r="1" fill="#ffd700"></circle>
        </svg>
      </div>
    );
  }
  if (cleanPreset === "dragon") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1c1c1e 0%, #09090a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d4af37",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffd700"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" />
        </svg>
      </div>
    );
  }
  if (cleanPreset === "poison") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #230c2b 0%, #0f0512 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d4af37",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffd700"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </div>
    );
  }

  // Default text circle fallback
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.1)",
        boxSizing: "border-box",
        padding: "4px",
      }}
    >
      <span
        className="profile-avatar-text"
        style={{
          color: "#333333",
          fontSize: "8px",
          fontWeight: "800",
          lineHeight: "1.25",
          textAlign: "center",
          wordBreak: "keep-all",
        }}
      >
        {textFallback
          ? textFallback.length > 3
            ? textFallback.slice(0, 3)
            : textFallback
          : "무림"}
      </span>
    </div>
  );
}

// 소셜 계정 뱃지 컴포넌트
function ProviderBadge({ provider }: { provider: string }) {
  const prov = (provider || "email").toLowerCase();
  let bg = "rgba(255,255,255,0.08)";
  let fg = "#aaa";
  let text = "이메일";
  if (prov === "google") {
    bg = "#ffffff";
    fg = "#111";
    text = "Google";
  } else if (prov === "kakao") {
    bg = "#FEE500";
    fg = "#191919";
    text = "카카오";
  } else if (prov === "discord") {
    bg = "#5865F2";
    fg = "#ffffff";
    text = "디스코드";
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: 800,
        backgroundColor: bg,
        color: fg,
        marginLeft: "8px",
        verticalAlign: "middle",
      }}
    >
      {text} 연동
    </span>
  );
}

export default function MePage() {
  const router = useRouter();
  const { user, session, loading, signOut } = useAuth();
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);
  const [remainingMissions, setRemainingMissions] = useState<number | null>(
    null,
  );
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newAllowNotifications, setNewAllowNotifications] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);

  // 계정 변경 관련 모달 상태 추가
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [changeEmailVal, setChangeEmailVal] = useState("");
  const [changeEmailBusy, setChangeEmailBusy] = useState(false);

  const [changePwVal, setChangePwVal] = useState("");
  const [changePwConfirmVal, setChangePwConfirmVal] = useState("");
  const [currentPwVal, setCurrentPwVal] = useState("");
  const [changePwBusy, setChangePwBusy] = useState(false);
  const [changePwCapsOn, setChangePwCapsOn] = useState(false);

  // 설정 화면 데이터 및 토글 상태
  const [allowMobileDownload, setAllowMobileDownload] = useState(false);
  const [allowPersonalRecommendation, setAllowPersonalRecommendation] =
    useState(true);
  const [denySalePersonalInfo, setDenySalePersonalInfo] = useState(false);
  const [allowMarketingInfo, setAllowMarketingInfo] = useState(true);
  const [cacheSize, setCacheSize] = useState("0.0MB");

  // 테마 상태 추가
  const [theme, setTheme] = useState("dark");

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
      document.documentElement.className = nextTheme;
    } catch (e) {}
  };

  // 로컬 스토리지 크기 계산
  const calculateCacheSize = () => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += (localStorage.getItem(key) || "").length + key.length;
        }
      }
      const mb = (total / (1024 * 1024)).toFixed(1);
      setCacheSize(`${mb}MB`);
    } catch (e) {
      setCacheSize("0.0MB");
    }
  };

  useEffect(() => {
    try {
      setAllowMobileDownload(
        localStorage.getItem("allowMobileDownload") === "true",
      );
      setAllowPersonalRecommendation(
        localStorage.getItem("allowPersonalRecommendation") !== "false",
      );
      setDenySalePersonalInfo(
        localStorage.getItem("denySalePersonalInfo") === "true",
      );
      setAllowMarketingInfo(
        localStorage.getItem("allowMarketingInfo") !== "false",
      );

      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;

      calculateCacheSize();
    } catch (e) {}
  }, []);

  // 외부(AuthProvider 등)에서 마케팅 설정 업데이트 시 동기화
  useEffect(() => {
    const handleMarketingSync = () => {
      try {
        setAllowMarketingInfo(
          localStorage.getItem("allowMarketingInfo") !== "false",
        );
      } catch (e) {}
    };
    window.addEventListener(
      "localstorage-marketing-updated",
      handleMarketingSync,
    );
    return () => {
      window.removeEventListener(
        "localstorage-marketing-updated",
        handleMarketingSync,
      );
    };
  }, []);

  const handleToggle = (
    key: string,
    value: boolean,
    setter: (val: boolean) => void,
  ) => {
    try {
      localStorage.setItem(key, String(value));
      setter(value);
    } catch (e) {}
  };

  const handleClearCache = () => {
    try {
      const preserveKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes("sb-") || key === "membership" || key.includes("auth"))
        ) {
          preserveKeys.push({ key, value: localStorage.getItem(key) });
        }
      }
      localStorage.clear();

      preserveKeys.forEach((item) => {
        localStorage.setItem(item.key, item.value || "");
      });

      // 설정값 재보존
      localStorage.setItem("allowMobileDownload", String(allowMobileDownload));
      localStorage.setItem(
        "allowPersonalRecommendation",
        String(allowPersonalRecommendation),
      );
      localStorage.setItem(
        "denySalePersonalInfo",
        String(denySalePersonalInfo),
      );
      localStorage.setItem("allowMarketingInfo", String(allowMarketingInfo));

      alert("캐시가 삭제되었습니다.");
      calculateCacheSize();
    } catch (e) {
      alert("캐시 삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (user && !user.user_metadata?.nickname) {
      setShowNicknameModal(true);
      const socialName =
        user.user_metadata?.full_name || user.user_metadata?.name || "";
      setNewNickname(socialName);
    } else {
      setShowNicknameModal(false);
    }
  }, [user]);

  // 수동 닉네임 변경 시 초기값 주입
  useEffect(() => {
    if (user && isNicknameModalOpen) {
      setNewNickname(user.user_metadata?.nickname || "");
      setNewAllowNotifications(
        user.user_metadata?.allow_notifications || false,
      );
    }
  }, [isNicknameModalOpen, user]);

  // 남은 미션 개수 불러오기
  const loadRemainingMissions = async () => {
    try {
      const token = session?.access_token;
      if (!token) {
        setRemainingMissions(null);
        return;
      }

      const res = await fetch("/api/me/tasks", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.completedTasks) {
        const completed: string[] = data.completedTasks;

        // 오늘 날짜 포맷
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        // 대상 미션들
        const missions = [
          "checkin_" + todayStr,
          "greeting_" + todayStr,
          "youtube",
          "invite_" + todayStr,
          "watch5_" + todayStr,
          "watch10_" + todayStr,
          "watch15_" + todayStr,
          "share_" + todayStr,
        ];

        const incompleteCount = missions.filter(
          (m) => !completed.includes(m),
        ).length;
        setRemainingMissions(incompleteCount);
      } else {
        setRemainingMissions(null);
      }
    } catch (e) {
      console.error("미션 개수 로드 에러:", e);
      setRemainingMissions(null);
    }
  };

  // 지갑 잔액 불러오기
  const loadWallet = async () => {
    try {
      const token = session?.access_token;
      if (!token) {
        setCurrentPoints(null);
        return;
      }

      const refCode = localStorage.getItem("referral_code");
      const url = refCode ? `/api/me/wallet?ref=${refCode}` : `/api/me/wallet`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setCurrentPoints(
          Number(data.points ?? 0) + Number(data.reward_points ?? 0),
        );
        if (refCode) {
          localStorage.removeItem("referral_code");
        }
      } else {
        setCurrentPoints(null);
      }
    } catch (error) {
      console.error("지갑 데이터 불러오기 에러:", error);
      setCurrentPoints(null);
    }
  };

  // DB의 구독 정보를 로컬 스토리지와 동기화
  const syncSubscription = async () => {
    try {
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/me/restore", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        if (data.success && data.plan) {
          localStorage.setItem("membership", data.plan);
          setSubscribedPlan(data.plan);
        } else {
          localStorage.removeItem("membership");
          setSubscribedPlan(null);
        }
      }
    } catch (e) {
      console.error("구독 정보 동기화 실패:", e);
    }
  };

  useEffect(() => {
    if (user && session) {
      loadWallet();
      loadRemainingMissions();
      syncSubscription();
    } else {
      setCurrentPoints(null);
      setRemainingMissions(null);
    }
  }, [user, session]);

  // 에피소드 오픈 등으로 코인 변동 시 지갑 잔액 및 미션 개수 갱신 리스너
  useEffect(() => {
    const handleWalletUpdate = () => {
      if (user && session) {
        loadWallet();
        loadRemainingMissions();
        syncSubscription();
      }
    };
    window.addEventListener("wallet-updated", handleWalletUpdate);
    return () => {
      window.removeEventListener("wallet-updated", handleWalletUpdate);
    };
  }, [user, session]);

  useEffect(() => {
    try {
      const plan = localStorage.getItem("membership");
      if (plan) setSubscribedPlan(plan);
    } catch (e) {}
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsSettingsOpen(false);
      router.replace("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 문제가 발생했습니다.");
    }
  };

  const handleCopyId = () => {
    try {
      const targetId = user?.id ? user.id.slice(0, 8) : "333418883";
      navigator.clipboard.writeText(targetId);
      alert(`ID ${targetId} 가 클립보드에 복사되었습니다.`);
    } catch (e) {
      alert("ID 복사 중 문제가 발생했습니다.");
    }
  };

  const handlePointsRedirect = () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    router.push("/points");
  };

  const handleEmailChangeSubmit = async () => {
    const emailTrimmed = changeEmailVal.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      alert("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    if (emailTrimmed === user?.email) {
      alert("현재 이메일과 동일합니다.");
      return;
    }

    setChangeEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: emailTrimmed },
        { emailRedirectTo: `${window.location.origin}/me` },
      );
      if (error) throw error;
      alert(
        "이메일 변경 인증 메일이 발송되었습니다!\n\n" +
          "보안을 위해 기존 이메일 주소와 새 이메일 주소 양쪽의 메일함을 모두 확인하여 각각 발송된 인증 링크를 클릭해 주셔야 최종적으로 변경 완료됩니다.",
      );
      setIsEmailModalOpen(false);
      setChangeEmailVal("");
    } catch (err: any) {
      alert(`이메일 변경 실패: ${err.message}`);
    } finally {
      setChangeEmailBusy(false);
    }
  };

  const handlePasswordChangeSubmit = async () => {
    const pwCheck = validatePassword(changePwVal);
    if (!pwCheck.ok) {
      alert("비밀번호 조건을 충족해 주세요.");
      return;
    }
    if (changePwVal !== changePwConfirmVal) {
      alert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setChangePwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: changePwVal.trim(),
      });
      if (error) throw error;
      alert("비밀번호가 성공적으로 변경되었습니다!");
      setIsPasswordModalOpen(false);
      setChangePwVal("");
      setChangePwConfirmVal("");
      setCurrentPwVal("");
    } catch (err: any) {
      alert(`비밀번호 변경 실패: ${err.message}`);
    } finally {
      setChangePwBusy(false);
    }
  };

  const handleMembershipRedirect = () => {
    router.push("/membership");
  };

  const handleIdentityVerification = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    try {
      const storeId = "store-8054c58a-c4b5-41b0-bb69-3c1aaf372ea4";
      const channelKey =
        process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY ||
        "YOUR_IDENTITY_CHANNEL_KEY";
      const identityVerificationId = `identity-verification-${Math.random().toString(36).substring(2, 15)}`;

      const identityVerificationParams: any = {
        storeId,
        identityVerificationId,
        channelKey,
        bypass: {
          danal: {
            CPTITLE: "무림북",
          },
          inicisUnified: {
            flgFixedUser: "N",
          },
        },
      };

      if (user?.email) {
        identityVerificationParams.customer = {
          email: user.email,
        };
      }

      const response = await requestIdentityVerification(
        identityVerificationParams,
      );

      if (!response || response.code !== undefined) {
        alert(
          response?.message ||
            "본인인증을 진행하지 못했거나 오류가 발생했습니다.",
        );
        return;
      }

      // 서버로 인증 완료 요청
      const token = session?.access_token;
      const verifyRes = await fetch("/api/me/verify-identity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          identityVerificationId,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (verifyRes.ok && verifyData?.success) {
        alert("본인인증이 정상적으로 완료되었습니다!");
        window.location.reload();
      } else {
        alert(
          `본인인증 완료 처리 실패: ${verifyData?.error || "서버 응답 오류"}`,
        );
      }
    } catch (err: any) {
      console.error("본인인증 에러:", err);
      alert(`본인인증 진행 중 에러가 발생했습니다: ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span>불러오는 중...</span>
      </main>
    );
  }

  // 화면 렌더링에 사용할 유저 정보
  const displayName =
    user?.user_metadata?.nickname ||
    (user?.email ? user.email.split("@")[0] : "고영광");
  const displayId = user?.id ? user.id.slice(0, 8) : "333418883";
  const displayCoins = currentPoints !== null ? currentPoints : 0;

  return (
    <main className={`me-main-bg ${theme}`}>
      <style>{`
        .me-main-bg {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding-bottom: calc(80px + env(safe-area-inset-bottom));
        }

        .me-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        }

        /* 헤더 영역 */
        .me-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          height: 44px;
        }

        .settings-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          transition: transform 0.2s;
        }

        .settings-btn:active {
          transform: scale(0.9);
        }

        /* 프로필 영역 */
        .profile-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: -10px;
        }

        .profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .profile-avatar-text {
          color: #333333;
          font-size: 8px;
          font-weight: 800;
          line-height: 1.25;
          text-align: center;
          word-break: keep-all;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .profile-name {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .profile-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #8c8c96;
          font-weight: 600;
        }

        .copy-btn {
          background: none;
          border: none;
          color: #8c8c96;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 2px;
          margin-left: 2px;
          vertical-align: middle;
        }

        .profile-divider {
          color: rgba(255, 255, 255, 0.15);
        }

        /* 멤버십 배너 */
        .membership-banner {
          background: #ff2a5f;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          text-decoration: none;
          margin-top: 10px;
        }

        .membership-banner:active {
          transform: scale(0.98);
        }

        .membership-banner-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .membership-banner-title {
          font-size: 18px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .membership-banner-desc {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          font-weight: 550;
        }

        .membership-banner-btn {
          background: #ffffff;
          color: #ff2a5f;
          font-size: 14px;
          font-weight: 850;
          padding: 8px 18px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* 메뉴 그룹 박스 */
        .menu-group-box {
          background: #16161e;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
        }

        .menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 58px;
          color: #ffffff;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          width: 100%;
        }

        .menu-item:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .menu-item-left {
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .menu-item-right {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8c8c96;
        }

        .menu-coin-text {
          font-size: 15px;
          font-weight: 800;
          color: #fca834;
        }

        .menu-badge {
          background: #ff2a5f;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 12px;
          letter-spacing: -0.2px;
        }

        .menu-right-text {
          font-size: 14px;
          font-weight: 600;
          color: #8c8c96;
        }

        .menu-arrow {
          display: flex;
          align-items: center;
          color: #55555d;
        }

        /* 바텀 시트 (설정 모달) */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 100000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .modal-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        .bottom-sheet {
          width: 100%;
          max-width: 480px;
          background: #16161e;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-overlay.active .bottom-sheet {
          transform: translateY(0);
        }

        .sheet-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .sheet-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .sheet-btn:active {
          background: rgba(255, 255, 255, 0.1);
        }

        .sheet-btn.danger {
          color: #ff5252;
          background: rgba(255, 82, 82, 0.08);
          border-color: rgba(255, 82, 82, 0.15);
        }

        .sheet-btn.danger:active {
          background: rgba(255, 82, 82, 0.15);
        }

        .sheet-close-btn {
          width: 100%;
          background: #ffffff;
          color: #000000;
          font-size: 15px;
          font-weight: 800;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          border: none;
          margin-top: 8px;
        }

        /* 풀스크린 설정 화면 오버레이 스타일 */
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: #000000;
          z-index: 100000;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94);
          box-sizing: border-box;
        }

        .settings-overlay.active {
          transform: translateX(0);
        }

        .settings-content {
          flex: 1;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          background: #000000;
          overflow-y: auto;
          padding-bottom: calc(40px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 56px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #000000;
          flex-shrink: 0;
        }

        .settings-back-btn {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
          gap: 24px;
        }

        .settings-group {
          background: #16161e;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
        }

        .settings-group-title {
          font-size: 12px;
          font-weight: 800;
          color: #8c8c96;
          margin-top: 6px;
          margin-bottom: 10px;
          padding-left: 4px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
        }

        .settings-row:active {
          background-color: rgba(255, 255, 255, 0.04);
        }

        .settings-row-right {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8c8c96;
          font-size: 14.5px;
          font-weight: 600;
        }

        .settings-chevron {
          color: #55555d;
          display: flex;
          align-items: center;
        }

        /* iOS 토글 스위치 스타일 */
        .switch-container {
          position: relative;
          display: inline-block;
          width: 51px;
          height: 31px;
        }

        .switch-container input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #333337;
          transition: .3s;
          border-radius: 34px;
        }

        .switch-slider:before {
          position: absolute;
          content: "";
          height: 27px;
          width: 27px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.2);
        }

        input:checked + .switch-slider {
          background-color: #ff2a5f;
        }

        input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        .settings-logout-btn {
          margin: 32px 20px 20px;
          background: #1c1c1e;
          color: #ff453a;
          border: none;
          border-radius: 12px;
          height: 50px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .settings-logout-btn:active {
          background: #2c2c2e;
        }

        /* 라이트 모드 전용 스타일 오버라이드 (가독성 보완) */
        .me-main-bg.light {
          background: #f2f2f7 !important;
          color: #1c1c1e !important;
        }
        .me-main-bg.light .settings-btn {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .profile-name {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .profile-meta {
          color: #55555d !important;
        }
        .me-main-bg.light .copy-btn {
          color: #55555d !important;
        }
        .me-main-bg.light .menu-group-box {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.04) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        }
        .me-main-bg.light .menu-item {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .menu-item:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .me-main-bg.light .menu-item-left {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .menu-arrow {
          color: #c7c7cc !important;
        }
        .me-main-bg.light .menu-right-text {
          color: #8e8e93 !important;
        }
        .me-main-bg.light .settings-overlay {
          background: #f2f2f7 !important;
        }
        .me-main-bg.light .settings-content {
          background: #f2f2f7 !important;
        }
        .me-main-bg.light .settings-header {
          background: #ffffff !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
        }
        .me-main-bg.light .settings-back-btn {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .settings-title {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .settings-group {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.04) !important;
        }
        .me-main-bg.light .settings-group-title {
          color: #8e8e93 !important;
        }
        .me-main-bg.light .settings-row {
          color: #1c1c1e !important;
        }
        .me-main-bg.light .settings-row:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .me-main-bg.light .settings-row-right {
          color: #8e8e93 !important;
        }
        .me-main-bg.light .settings-chevron {
          color: #c7c7cc !important;
        }
        .me-main-bg.light .settings-logout-btn {
          background: #ffffff !important;
          color: #ff3b30 !important;
          border: 1px solid rgba(0, 0, 0, 0.04) !important;
        }
        .me-main-bg.light .switch-slider {
          background-color: #e5e5ea !important;
        }
      `}</style>

      <div className="me-container">
        {/* 헤더 */}
        <div className="me-header">
          <button
            className="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
          >
            <GearIcon />
          </button>
        </div>

        {/* 프로필 */}
        <div className="profile-section">
          <div
            className="profile-avatar"
            onClick={() => setIsAvatarModalOpen(true)}
            style={{ cursor: "pointer", position: "relative" }}
            title="프로필 아바타 변경"
          >
            {getAvatarPresetSvg(
              user?.user_metadata?.avatar_preset,
              displayName,
            )}
            <div
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                background: "#d4af37",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #16161e",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16161e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>
          <div className="profile-info">
            <h2
              className="profile-name"
              style={{ display: "flex", alignItems: "center" }}
            >
              {displayName}
              <ProviderBadge
                provider={
                  user?.app_metadata?.provider ||
                  user?.identities?.[0]?.provider ||
                  "email"
                }
              />
            </h2>
            <div className="profile-meta">
              <span>회원 ID {displayId}</span>
              <button
                className="copy-btn"
                onClick={handleCopyId}
                title="회원 ID 복사"
              >
                <CopyIcon />
              </button>
            </div>
          </div>
        </div>

        {/* 멤버십 배너 */}
        <div className="membership-banner" onClick={handleMembershipRedirect}>
          <div className="membership-banner-left">
            <h3 className="membership-banner-title">
              {subscribedPlan === "monthly"
                ? "월간 무제한 이용권 사용 중💖"
                : subscribedPlan === "weekly"
                  ? "주간 무제한 이용권 사용 중🍵"
                  : subscribedPlan === "annual" || subscribedPlan === "yearly"
                    ? "연간 무제한 이용권 사용 중🍗"
                    : "멤버십 서비스 가입 (정액제 이용권)"}
            </h3>
            {!subscribedPlan && (
              <p className="membership-banner-desc">
                소설 무제한 감상 및 전용 혜택을 누려보세요:
              </p>
            )}
          </div>
          {!subscribedPlan && (
            <button
              className="membership-banner-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleMembershipRedirect();
              }}
            >
              가입
            </button>
          )}
        </div>

        {/* 메뉴 그룹 1 */}
        <div className="menu-group-box">
          <button className="menu-item" onClick={handlePointsRedirect}>
            <span className="menu-item-left">코인 충전</span>
            <div className="menu-item-right">
              {subscribedPlan && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#ff2a5f",
                    marginRight: "4px",
                    fontWeight: "600",
                  }}
                >
                  멤버십 회원
                </span>
              )}
              <span className="menu-arrow">
                <ChevronRightIcon />
              </span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/wallet")}>
            <span className="menu-item-left">내 지갑 (코인 잔액)</span>
            <div className="menu-item-right">
              <CoinIcon />
              <span className="menu-coin-text">{displayCoins}</span>
              <span className="menu-arrow">
                <ChevronRightIcon />
              </span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/checkin")}>
            <span className="menu-item-left">출석 보상 (무료 코인 받기)</span>
            <div className="menu-item-right">
              {remainingMissions !== null && remainingMissions > 0 && (
                <span className="menu-badge">+{remainingMissions}</span>
              )}
              <span className="menu-arrow">
                <ChevronRightIcon />
              </span>
            </div>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              if (
                confirm(
                  "안녕하세요. 고품격 무협 오디오 청취 플랫폼 '무림북'입니다. 이용문의 및 에러 사항은 언제든 1:1 채팅으로 남겨주세요.\n\n확인을 누르시면 1:1 문의 채팅방(카카오톡 오픈채팅)으로 이동합니다.",
                )
              ) {
                window.open("https://open.kakao.com/o/s4Da53xi", "_blank");
              }
            }}
          >
            <span className="menu-item-left">고객 문의 (1:1 문의)</span>
            <div className="menu-item-right">
              <span className="menu-arrow">
                <ChevronRightIcon />
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 설정 화면 오버레이 */}
      <div className={`settings-overlay ${isSettingsOpen ? "active" : ""}`}>
        <div className="settings-content">
          {/* 헤더 */}
          <div className="settings-header">
            <button
              className="settings-back-btn"
              onClick={() => setIsSettingsOpen(false)}
            >
              <BackIcon />
            </button>
            <h3 className="settings-title">설정</h3>
          </div>

          {/* 설정 리스트 */}
          <div className="settings-list">
            {/* 0. 계정 및 보안 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="settings-group-title">계정 및 보안</div>
              <div className="settings-group">
                <button
                  className="settings-row"
                  onClick={() => {
                    setIsNicknameModalOpen(true);
                  }}
                >
                  <span>닉네임 및 알림 수신 설정</span>
                  <div className="settings-row-right">
                    <span>{displayName}</span>
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>

                <button
                  className="settings-row"
                  onClick={() => {
                    setIsEmailModalOpen(true);
                  }}
                >
                  <span>이메일 주소 변경</span>
                  <div className="settings-row-right">
                    <span style={{ fontSize: "13px" }}>
                      {user?.email || "미등록"}
                    </span>
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>

                <button
                  className="settings-row"
                  onClick={() => {
                    const provider =
                      user?.app_metadata?.provider ||
                      user?.identities?.[0]?.provider ||
                      "email";
                    if (provider !== "email") {
                      alert(
                        "소셜 계정(구글, 카카오, 디스코드 등)으로 로그인하신 회원은 소셜 인증 서비스(구글/카카오/디스코드)를 이용하므로 자체 비밀번호 변경 대상이 아닙니다. 각 소셜 서비스 홈페이지에서 비밀번호 변경을 진행해 주세요.",
                      );
                    } else {
                      setIsPasswordModalOpen(true);
                    }
                  }}
                >
                  <span>비밀번호 변경</span>
                  <div className="settings-row-right">
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 1. 서비스 및 구독 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="settings-group-title">구독 및 서비스</div>
              <div className="settings-group">
                <button
                  className="settings-row"
                  onClick={() => {
                    if (subscribedPlan) {
                      router.push("/me/membership");
                    } else {
                      router.push("/membership");
                    }
                  }}
                >
                  <span>구독 및 멤버십 설정</span>
                  <div className="settings-row-right">
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. 앱 사용 설정 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="settings-group-title">앱 사용 설정</div>
              <div className="settings-group">
                <button className="settings-row" onClick={handleThemeToggle}>
                  <span>화면 테마 설정</span>
                  <div className="settings-row-right">
                    <span>
                      {theme === "dark" ? "다크 모드" : "라이트 모드"}
                    </span>
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>

                <div
                  className="settings-row"
                  style={{ cursor: "default" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>3G/LTE/5G 다운로드 허용</span>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      checked={allowMobileDownload}
                      onChange={(e) =>
                        handleToggle(
                          "allowMobileDownload",
                          e.target.checked,
                          setAllowMobileDownload,
                        )
                      }
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <button className="settings-row" onClick={handleClearCache}>
                  <span>임시 저장 공간 비우기</span>
                  <div className="settings-row-right">
                    <span style={{ fontSize: "14px", color: "#8c8c96" }}>
                      {cacheSize}
                    </span>
                    <TrashIcon />
                  </div>
                </button>
              </div>
            </div>

            {/* 3. 개인정보 보호 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="settings-group-title">개인정보 보호</div>
              <div className="settings-group">
                <div
                  className="settings-row"
                  style={{ cursor: "default" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>개인정보 판매 및 제공 제한</span>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      checked={denySalePersonalInfo}
                      onChange={(e) =>
                        handleToggle(
                          "denySalePersonalInfo",
                          e.target.checked,
                          setDenySalePersonalInfo,
                        )
                      }
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div
                  className="settings-row"
                  style={{ cursor: "default" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>혜택 및 마케팅 정보 수신</span>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      checked={allowMarketingInfo}
                      onChange={(e) =>
                        handleToggle(
                          "allowMarketingInfo",
                          e.target.checked,
                          setAllowMarketingInfo,
                        )
                      }
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* 4. 기타 및 정보 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="settings-group-title">기타</div>
              <div className="settings-group">
                <button
                  className="settings-row"
                  onClick={() => {
                    router.push("/terms");
                  }}
                >
                  <span>무림북 정보 및 약관</span>
                  <div className="settings-row-right">
                    <span>1.0.0</span>
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>

                <button
                  className="settings-row"
                  onClick={() => {
                    router.push("/me/withdraw");
                  }}
                >
                  <span>회원 탈퇴 (계정 삭제)</span>
                  <div className="settings-row-right">
                    <span className="settings-chevron">
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 관리자 특권 */}
            {(user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin" || user?.email === "youngkwang79@gmail.com" || user?.email === "admin@murimbook.com") && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div className="settings-group-title" style={{ color: "#e8356d" }}>관리자 특권</div>
                <div className="settings-group">
                  <button
                    className="settings-row"
                    onClick={async () => {
                      if (!confirm("월간 멤버십을 강제 활성화 하시겠습니까?")) return;
                      try {
                        const token = session?.access_token;
                        if (!token) return;
                        
                        const { error } = await supabase.from('subscriptions').upsert({
                          user_id: user.id,
                          plan_type: 'monthly',
                          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        }, { onConflict: "user_id" });
                        
                        if (error) throw error;
                        alert("관리자 권한으로 월간 멤버십이 활성화되었습니다!");
                        syncSubscription();
                      } catch(e) {
                        alert("권한 부여 실패");
                      }
                    }}
                  >
                    <span>월간 멤버십 30일 무상 갱신</span>
                  </button>
                  <button
                    className="settings-row"
                    onClick={async () => {
                      if (!confirm("멤버십을 즉시 해지 하시겠습니까?")) return;
                      try {
                        const { error } = await supabase.from('subscriptions').delete().eq('user_id', user.id);
                        if (error) throw error;
                        alert("멤버십이 해지되었습니다.");
                        localStorage.removeItem("membership");
                        setSubscribedPlan(null);
                      } catch(e) {
                        alert("해지 실패");
                      }
                    }}
                  >
                    <span>멤버십 즉시 해지</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 로그아웃 버튼 */}
          {user && (
            <button className="settings-logout-btn" onClick={handleSignOut}>
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 닉네임 설정 모달 (소셜 가입자 및 미설정자용 또는 수동 설정 변경용) */}
      {(showNicknameModal || isNicknameModalOpen) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#16161e",
              border: "1px solid rgba(255, 215, 120, 0.25)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              {isNicknameModalOpen ? "닉네임 및 알림 수신 설정" : "닉네임 설정"}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              댓글과 프로필에서 이메일 대신 노출될
              <br />
              닉네임을 설정해 주세요.
            </p>

            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="닉네임 (2자 이상)"
              type="text"
              maxLength={20}
              disabled={modalBusy}
              style={{
                padding: "14px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
                fontSize: 15,
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
                fontSize: "13.5px",
                color: "rgba(255,255,255,0.85)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={newAllowNotifications}
                onChange={(e) => setNewAllowNotifications(e.target.checked)}
                disabled={modalBusy}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#E6D3A3",
                  cursor: "pointer",
                }}
              />
              <span>신규 업데이트 알림 받기 (모바일 푸시)</span>
            </label>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                onClick={async () => {
                  if (newNickname.trim().length < 2) {
                    alert("닉네임은 2자 이상 입력해 주세요.");
                    return;
                  }
                  setModalBusy(true);
                  try {
                    const { error } = await supabase.auth.updateUser({
                      data: {
                        nickname: newNickname.trim(),
                        allow_notifications: newAllowNotifications,
                      },
                    });
                    if (error) throw error;
                    alert("설정이 저장되었습니다!");
                    setShowNicknameModal(false);
                    setIsNicknameModalOpen(false);
                    window.location.reload();
                  } catch (err: any) {
                    alert(`저장 실패: ${err.message}`);
                  } finally {
                    setModalBusy(false);
                  }
                }}
                disabled={modalBusy || newNickname.trim().length < 2}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%)",
                  color: "#2b1d00",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor:
                    modalBusy || newNickname.trim().length < 2
                      ? "not-allowed"
                      : "pointer",
                  opacity: modalBusy || newNickname.trim().length < 2 ? 0.6 : 1,
                }}
              >
                {modalBusy ? "저장 중..." : "저장 완료"}
              </button>

              {isNicknameModalOpen ? (
                <button
                  onClick={() => setIsNicknameModalOpen(false)}
                  disabled={modalBusy}
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.4)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
              ) : (
                <button
                  onClick={() => {
                    const randomNum = Math.floor(1000 + Math.random() * 9000);
                    const fallbackNick = `독자_${randomNum}`;
                    supabase.auth
                      .updateUser({
                        data: {
                          nickname: fallbackNick,
                          allow_notifications: false,
                        },
                      })
                      .then(() => {
                        setShowNicknameModal(false);
                        window.location.reload();
                      });
                  }}
                  disabled={modalBusy}
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.4)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  나중에 하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이메일 주소 변경 모달 */}
      {isEmailModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#16161e",
              border: "1px solid rgba(255, 215, 120, 0.25)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              이메일 주소 변경
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              새로운 이메일 주소를 입력해 주세요.
              <br />
              <strong style={{ color: "#ffd700" }}>
                기존 및 신규 이메일의 메일함으로 각각 인증 메일이 발송되며, 두
                링크를 모두 승인해야 주소 변경이 최종 완료됩니다.
              </strong>
            </p>

            <input
              value={changeEmailVal}
              onChange={(e) => setChangeEmailVal(e.target.value)}
              placeholder="새 이메일 주소"
              type="email"
              disabled={changeEmailBusy}
              style={{
                padding: "14px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
                fontSize: 15,
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                onClick={handleEmailChangeSubmit}
                disabled={changeEmailBusy || !changeEmailVal.trim()}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%)",
                  color: "#2b1d00",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor:
                    changeEmailBusy || !changeEmailVal.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity: changeEmailBusy || !changeEmailVal.trim() ? 0.6 : 1,
                }}
              >
                {changeEmailBusy ? "메일 발송 중..." : "이메일 변경 메일 전송"}
              </button>

              <button
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setChangeEmailVal("");
                }}
                disabled={changeEmailBusy}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {isPasswordModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#16161e",
              border: "1px solid rgba(255, 215, 120, 0.25)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              비밀번호 변경
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              새롭게 사용할 비밀번호를 설정해 주세요.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={currentPwVal}
                onChange={(e) => setCurrentPwVal(e.target.value)}
                placeholder="현재 비밀번호"
                type="password"
                disabled={changePwBusy}
                style={{
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  outline: "none",
                  fontSize: 15,
                }}
              />

              <input
                value={changePwVal}
                onChange={(e) => setChangePwVal(e.target.value)}
                onKeyDown={(e) => {
                  setChangePwCapsOn(e.getModifierState?.("CapsLock") ?? false);
                }}
                placeholder="새 비밀번호 (8자 이상, 영문+숫자+특수문자)"
                type="password"
                disabled={changePwBusy}
                style={{
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  outline: "none",
                  fontSize: 15,
                }}
              />

              {changePwCapsOn && (
                <div style={{ fontSize: 12, color: "#ff453a", marginTop: -6 }}>
                  Caps Lock이 켜져 있습니다.
                </div>
              )}

              {changePwVal.length > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    background: "rgba(0,0,0,0.2)",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      color: validatePassword(changePwVal).minLenOk
                        ? "#34c759"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    • 8자 이상{" "}
                    {validatePassword(changePwVal).minLenOk ? "충족" : "필요"}
                  </div>
                  <div
                    style={{
                      color: validatePassword(changePwVal).hasLetter
                        ? "#34c759"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    • 영문 포함{" "}
                    {validatePassword(changePwVal).hasLetter ? "충족" : "필요"}
                  </div>
                  <div
                    style={{
                      color: validatePassword(changePwVal).hasNumber
                        ? "#34c759"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    • 숫자 포함{" "}
                    {validatePassword(changePwVal).hasNumber ? "충족" : "필요"}
                  </div>
                  <div
                    style={{
                      color: validatePassword(changePwVal).hasSpecial
                        ? "#34c759"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    • 특수문자 포함{" "}
                    {validatePassword(changePwVal).hasSpecial ? "충족" : "필요"}
                  </div>
                </div>
              )}

              <input
                value={changePwConfirmVal}
                onChange={(e) => setChangePwConfirmVal(e.target.value)}
                placeholder="비밀번호 확인"
                type="password"
                disabled={changePwBusy}
                style={{
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  outline: "none",
                  fontSize: 15,
                }}
              />

              {changePwConfirmVal.length > 0 &&
                changePwVal !== changePwConfirmVal && (
                  <div style={{ fontSize: 12, color: "#ff453a" }}>
                    • 비밀번호가 일치하지 않습니다.
                  </div>
                )}
              {changePwConfirmVal.length > 0 &&
                changePwVal === changePwConfirmVal && (
                  <div style={{ fontSize: 12, color: "#34c759" }}>
                    • 비밀번호가 일치합니다.
                  </div>
                )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                onClick={handlePasswordChangeSubmit}
                disabled={
                  changePwBusy ||
                  !validatePassword(changePwVal).ok ||
                  changePwVal !== changePwConfirmVal
                }
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%)",
                  color: "#2b1d00",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor:
                    changePwBusy ||
                    !validatePassword(changePwVal).ok ||
                    changePwVal !== changePwConfirmVal
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    changePwBusy ||
                    !validatePassword(changePwVal).ok ||
                    changePwVal !== changePwConfirmVal
                      ? 0.6
                      : 1,
                }}
              >
                {changePwBusy ? "변경 처리 중..." : "비밀번호 변경 완료"}
              </button>

              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setChangePwVal("");
                  setChangePwConfirmVal("");
                  setCurrentPwVal("");
                }}
                disabled={changePwBusy}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 아바타 선택 모달 */}
      {isAvatarModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#16161e",
              border: "1px solid rgba(255, 215, 120, 0.25)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              무림풍 프로필 아바타 선택
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              무림북 감성을 가득 담은 동양 무협풍 문양 아바타입니다.
              <br />
              원하시는 문양을 선택해 귀하의 문파 캐릭터를 지정해 주세요.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                maxHeight: 300,
                overflowY: "auto",
                padding: "4px",
              }}
            >
              {[
                {
                  key: "sword",
                  name: "🗡️ 검협 (검의 문양)",
                  desc: "무협의 상징",
                },
                {
                  key: "scholar",
                  name: "🪶 학사 (선비의 문양)",
                  desc: "필체와 깨달음",
                },
                {
                  key: "taoist",
                  name: "🥋 도인 (태극의 문양)",
                  desc: "음양과 선계",
                },
                {
                  key: "dragon",
                  name: "🐉 황룡 (군주의 문양)",
                  desc: "천하를 다스리는 자",
                },
                {
                  key: "poison",
                  name: "🌸 화주 (백화의 문양)",
                  desc: "꽃 and 독문의 비술",
                },
                {
                  key: "default",
                  name: "⚙️ 기본 원형 (문구)",
                  desc: "기본 생각 명언구",
                },
              ].map((preset) => {
                const isSelected =
                  (user?.user_metadata?.avatar_preset || "default") ===
                  preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.updateUser({
                          data: { avatar_preset: preset.key },
                        });
                        if (error) throw error;
                        alert("프로필 아바타 문양이 변경되었습니다!");
                        setIsAvatarModalOpen(false);
                        window.location.reload();
                      } catch (err: any) {
                        alert(`아바타 변경 실패: ${err.message}`);
                      }
                    }}
                    style={{
                      background: isSelected
                        ? "rgba(212, 175, 55, 0.15)"
                        : "rgba(255,255,255,0.03)",
                      border: isSelected
                        ? "2px solid #d4af37"
                        : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14,
                      padding: 12,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ width: 50, height: 50, borderRadius: "50%" }}>
                      {getAvatarPresetSvg(preset.key, displayName.slice(0, 2))}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: isSelected ? "#ffd700" : "#fff",
                        }}
                      >
                        {preset.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                        {preset.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsAvatarModalOpen(false)}
              style={{
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.4)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 하단 내비게이션 */}
      <BottomNav />
    </main>
  );
}
