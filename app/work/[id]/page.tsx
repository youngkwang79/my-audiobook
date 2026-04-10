"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { works } from "@/app/data/works";
import { getEpisodesByWork } from "@/app/data/episodes";

import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const workId = String((params as any).id);
  const work = works.find((w) => w.id === workId);
  const episodes = useMemo(() => getEpisodesByWork(workId), [workId]);

  const DEFAULT_FREE_UNTIL = work?.freeEpisodes ?? 1;
  const total = episodes.length || work?.totalEpisodes || work?.episodeCount || 0;

  const [unlockedUntil, setUnlockedUntil] = useState<number>(DEFAULT_FREE_UNTIL);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`unlockedUntil:${workId}`);
      const fallback = DEFAULT_FREE_UNTIL;
      const v = raw ? Number(raw) : fallback;
      const normalized = Number.isFinite(v) ? v : fallback;
      setUnlockedUntil(Math.min(Math.max(normalized, fallback), total || fallback));
    } catch {
      setUnlockedUntil(DEFAULT_FREE_UNTIL);
    }
  }, [workId, DEFAULT_FREE_UNTIL, total]);

  const onAuthClick = async () => {
    if (loading) return;

    if (user) {
      const sb = supabase;
      if (!sb) {
        router.push("/login");
        return;
      }

      await sb.auth.signOut();
      router.refresh();
      return;
    }

    router.push("/login");
  };

  if (!work) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
        }}
      >
        <TopBar />
        <div style={{ marginTop: 24, fontSize: 18, fontWeight: 800 }}>
          존재하지 않는 작품입니다.
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b12",
        color: "white",
        padding: 20,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      <TopBar />

      <style>{`
        @media (max-width: 720px) {
          .workTopCard {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .episodeGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        className="workTopCard"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1200,
          gap: 18,
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <img
            src={work.thumbnail}
            alt={work.title}
            style={{
              width: 180,
              height: "auto",
              borderRadius: 16,
              objectFit: "contain",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />

          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>작품</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{work.title}</div>

            {!!work.description && (
              <div style={{ fontSize: 14, opacity: 0.82, marginBottom: 8, lineHeight: 1.5 }}>
                {work.description}
              </div>
            )}

            <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 700 }}>
              총 {work.totalEpisodes ?? work.episodeCount}화 {work.status}
            </div>

            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              무료 공개: 1~{work.freeEpisodes}화
            </div>

            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              현재 오픈 기준: 1~{unlockedUntil}화
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
  onClick={() => {
    const firstEpisode = episodes[0];
    if (!firstEpisode) return;
    router.push(`/episode/${work.id}/${firstEpisode.id}?part=1&autoplay=1`);
  }}
            style={{
              background:
                "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
              color: "#2b1d00",
              border: "1px solid rgba(255,215,120,0.65)",
              padding: "12px 18px",
              borderRadius: 14,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            1화부터 듣기
          </button>

          <button
            onClick={onAuthClick}
            style={{
              background: "rgba(0,0,0,0.35)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "12px 18px",
              borderRadius: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {user ? "로그아웃" : "로그인"}
          </button>
        </div>
      </div>

      <div
        id="episode-list"
        className="episodeGrid"
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          maxWidth: 1200,
        }}
      >
        {episodes.map((ep) => {
          const episodeNo = String(ep.id);
          const isLocked = ep.locked;

          return (
            <Link
  key={episodeNo}
  href={
    user
      ? `/episode/${work.id}/${episodeNo}?part=1&autoplay=1`
      : `/login?redirect=${encodeURIComponent(`/episode/${work.id}/${episodeNo}?part=1&autoplay=1`)}`
  }
  style={{ textDecoration: "none", color: "inherit" }}
>
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 16,
                  padding: 16,
                  minHeight: 96,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {episodeNo}화 {ep.parts > 1 ? `· ${ep.parts}편 구성` : ""}
                </div>

                <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.35 }}>
                  {ep.title}
                </div>

                <div style={{ fontSize: 12, opacity: 0.78 }}>
                  {isLocked ? "잠금" : "열림"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}