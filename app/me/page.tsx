"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

const goldButtonStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
  color: "#2b1d00",
  border: "1px solid rgba(255,215,120,0.7)",
  padding: "12px 16px",
  borderRadius: 16,
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
  whiteSpace: "nowrap",
  WebkitTapHighlightColor: "transparent",
  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,215,120,0.18)",
  borderRadius: 24,
  background: "rgba(12,12,18,0.58)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  padding: 20,
  backdropFilter: "blur(6px)",
};

const dangerButtonStyle: React.CSSProperties = {
  background: "rgba(255, 107, 107, 0.1)",
  color: "#ff6b6b",
  border: "1px solid rgba(255, 107, 107, 0.3)",
  padding: "10px 14px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export default function MePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 문제가 발생했습니다.");
    }
  };

  const handleEnterTraining = () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } catch (e) {
      console.log("Fullscreen request failed", e);
    }
    router.push("/me/game");
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", padding: "24px 16px", color: "white" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ ...cardStyle, textAlign: "center" }}>불러오는 중...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", padding: "24px 16px", color: "white" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 12 }}>내정보</h1>
            <p style={{ opacity: 0.88, lineHeight: 1.7, marginBottom: 18 }}>
              내정보는 로그인 후 이용할 수 있습니다.
            </p>
            <button onClick={() => router.push("/login")} style={goldButtonStyle}>
              로그인하러 가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 40px", color: "white" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <section style={{ ...cardStyle, marginBottom: 18, padding: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 950,
                  letterSpacing: "-0.8px",
                  marginBottom: 8,
                }}
              >
                내정보
              </div>
              <div style={{ fontSize: 15, opacity: 0.82, lineHeight: 1.7 }}>
                계정 보안과 포인트, 무림수련 여정을 한눈에 관리하세요.
              </div>
            </div>

            <button onClick={handleEnterTraining} style={goldButtonStyle}>
              무림수련 입장
            </button>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          <section style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>
              계정 및 보안
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: -4 }}>
                이메일 계정
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  fontSize: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {user.email}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  style={{ ...goldButtonStyle, flex: 1, fontSize: 13 }}
                  onClick={() => router.push("/me/change-password")}
                >
                  비밀번호 변경
                </button>

                <button
                  style={{ ...goldButtonStyle, flex: 1, fontSize: 13 }}
                  onClick={() => router.push("/me/change-email")}
                >
                  이메일 변경
                </button>
              </div>

              <button
                style={{
                  ...goldButtonStyle,
                  width: "100%",
                  fontSize: 13,
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                }}
                onClick={() => {}}
              >
                2단계 인증 설정 (OTP)
              </button>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
              포인트
            </div>
            <div style={{ fontSize: 14, opacity: 0.84, lineHeight: 1.8, marginBottom: 14 }}>
              보유한 포인트로 에피소드를 감상하거나 게임 아이템을 구매할 수 있습니다.
            </div>
            <button onClick={() => router.push("/points")} style={goldButtonStyle}>
              포인트 확인하기
            </button>
          </section>

          <section
            style={{
              ...cardStyle,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
                계정 관리
              </div>
              <div style={{ fontSize: 14, opacity: 0.84, lineHeight: 1.8, marginBottom: 20 }}>
                안전하게 로그아웃하거나 서비스 탈퇴를 진행할 수 있습니다.
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...dangerButtonStyle, flex: 1 }}
                  onClick={handleSignOut}
                >
                  로그아웃
                </button>

                <button
                  style={{ ...dangerButtonStyle, flex: 1 }}
                  onClick={() => {}}
                >
                  전체 기기 로그아웃
                </button>
              </div>

              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  textDecoration: "underline",
                  cursor: "pointer",
                  textAlign: "right",
                }}
                onClick={() => {
                  if (confirm("정말 탈퇴하시겠습니까? 데이터는 복구되지 않습니다.")) {
                  }
                }}
              >
                계정 탈퇴하기
              </button>
            </div>
          </section>

          <section
            style={{
              ...cardStyle,
              border: "1px solid rgba(243, 201, 105, 0.4)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 10,
                color: "#f3c969",
              }}
            >
              무림수련 정보
            </div>
            <div style={{ fontSize: 14, opacity: 0.84, lineHeight: 1.8, marginBottom: 14 }}>
              현재 협객님의 수련 상태를 확인하고 즉시 강호로 입장합니다.
            </div>
            <button
              onClick={handleEnterTraining}
              style={{ ...goldButtonStyle, width: "100%" }}
            >
              수련 계속하기
            </button>
          </section>

          <section
            style={{
              ...cardStyle,
              border: "1px solid rgba(243, 201, 105, 0.4)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 10,
                color: "#f3c969",
              }}
            >
              1인칭 무협세계
            </div>
            <div style={{ fontSize: 14, opacity: 0.84, lineHeight: 1.8, marginBottom: 14 }}>
              강호를 직접 체험하는 1인칭 무협세계로 즉시 입장합니다.
            </div>
            <button
              onClick={handleEnterTraining}
              style={{ ...goldButtonStyle, width: "100%" }}
            >
              수련 계속하기
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}