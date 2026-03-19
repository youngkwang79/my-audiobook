"use client";

import { useEffect, useState } from "react";

type Stats = {
  today: number;
  total: number;
};

export default function VisitorStats() {
  const [stats, setStats] = useState<Stats>({ today: 0, total: 0 });

  useEffect(() => {
    const pagePath = window.location.pathname;

    fetch("/api/visits/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_path: pagePath,
      }),
    }).finally(() => {
      fetch("/api/visits/stats", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          setStats({
            today: Number(data?.today ?? 0),
            total: Number(data?.total ?? 0),
          });
        })
        .catch(() => {
          setStats({ today: 0, total: 0 });
        });
    });
  }, []);

  return (
    <div
      style={{
        width: "100%",
        margin: "24px 0 12px",
        padding: "14px 18px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Total
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          {stats.total.toLocaleString("ko-KR")}
        </div>
      </div>

      <div
        style={{
          width: 1,
          height: 32,
          background: "rgba(255,255,255,0.12)",
        }}
      />

      <div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Today
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          {stats.today.toLocaleString("ko-KR")}
        </div>
      </div>
    </div>
  );
}