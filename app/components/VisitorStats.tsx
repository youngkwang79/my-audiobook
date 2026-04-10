"use client";

import { useEffect, useState } from "react";

type Stats = {
  today: number;
  total: number;
};

export default function VisitorStats() {
  const [stats, setStats] = useState<Stats>({ today: 0, total: 0 });

  useEffect(() => {
    let alive = true;

    const loadStats = async () => {
      try {
        const res = await fetch("/api/visits/stats", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          if (alive) setStats({ today: 0, total: 0 });
          return;
        }

        if (alive) {
          setStats({
            today: Number(data?.today ?? 0),
            total: Number(data?.total ?? 0),
          });
        }
      } catch (error) {
        console.error("방문자 통계 불러오기 실패:", error);
        if (alive) setStats({ today: 0, total: 0 });
      }
    };

    loadStats();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="hide-in-fullscreen"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 12,
        marginTop: 20,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          minWidth: 84,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            marginBottom: 2,
            letterSpacing: "0.4px",
          }}
        >
          TOTAL
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: "#f3c969",
          }}
        >
          {stats.total.toLocaleString("ko-KR")}
        </div>
      </div>

      <div
        style={{
          padding: "10px 16px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          minWidth: 84,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            marginBottom: 2,
            letterSpacing: "0.4px",
          }}
        >
          TODAY
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: "#f3c969",
          }}
        >
          {stats.today.toLocaleString("ko-KR")}
        </div>
      </div>
    </div>
  );
}