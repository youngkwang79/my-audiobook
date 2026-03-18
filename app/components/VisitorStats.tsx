"use client";

import { useEffect, useState } from "react";

type Stats = {
  today: number;
  total: number;
};

function getVisitorKey() {
  if (typeof window === "undefined") return "";

  const KEY = "visitor_key";
  let value = localStorage.getItem(KEY);

  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(KEY, value);
  }

  return value;
}

export default function VisitorStats() {
  const [stats, setStats] = useState<Stats>({ today: 0, total: 0 });

  useEffect(() => {
    const visitorKey = getVisitorKey();
    const pagePath = window.location.pathname;

    fetch("/api/visits/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitor_key: visitorKey,
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
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          fontWeight: 800,
        }}
      >
        오늘 방문자: {stats.today.toLocaleString("ko-KR")}
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          fontWeight: 800,
        }}
      >
        총 방문자: {stats.total.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}