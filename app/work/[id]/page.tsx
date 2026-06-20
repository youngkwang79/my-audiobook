"use client";

import TopBar from "@/app/components/TopBar";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/providers/AuthProvider";
import { supabase, loginWithGoogle } from "@/lib/supabaseClient";

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const workId = decodeURIComponent(String((params as any).id));

  const [work, setWork] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingWork, setLoadingWork] = useState(true);

  // 시청 기록 (workProgress, lastPlayed)
  const [watchedEpisode, setWatchedEpisode] = useState<string | null>(null);
  const [resumePart, setResumePart] = useState<number>(1);

  useEffect(() => {
    try {
      const progressRaw = localStorage.getItem("workProgress");
      const progress = progressRaw ? JSON.parse(progressRaw) : {};
      const lastEp: string | undefined = progress[workId];
      if (lastEp) {
        setWatchedEpisode(lastEp);
        // lastPlayed에서 part 복원
        const lastPlayedRaw = localStorage.getItem("lastPlayed");
        if (lastPlayedRaw) {
          const lp = JSON.parse(lastPlayedRaw);
          if (lp.workId === workId && String(lp.episodeId) === String(lastEp)) {
            setResumePart(lp.part ?? 1);
          }
        }
      }
    } catch (e) {}
  }, [workId]);

  // 시청한 에피소드 번호 집합 (watchedEpisode 이하 모두 완료로 간주)
  const watchedEpisodeNum = useMemo(() => {
    if (!watchedEpisode) return 0;
    return parseInt(String(watchedEpisode).split("-")[0], 10) || 0;
  }, [watchedEpisode]);

  const isAdmin = !!user && (
    user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || 
    user.email === "admin@murimbook.com" || 
    user.app_metadata?.role === "admin" || 
    user.user_metadata?.role === "admin"
  );

  useEffect(() => {
    if (!workId) return;
    const fetchData = async () => {
      try {
        setLoadingWork(true);
        // Fetch work
        const { data: workData, error: workErr } = await supabase
          .from("works")
          .select("*")
          .eq("id", workId)
          .maybeSingle();

        if (workErr) {
          console.error("Error fetching work:", workErr);
        } else if (workData) {
          const isOldNew = workData.badge === "신작" && workData.created_at && (new Date().getTime() - new Date(workData.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
          setWork({
            id: workData.id,
            title: workData.title,
            description: workData.description,
            thumbnail: workData.thumbnail,
            episodeCount: workData.episode_count,
            totalEpisodes: workData.total_episodes,
            freeEpisodes: workData.free_episodes,
            status: workData.status,
            subtitle: workData.subtitle,
            badge: isOldNew ? "" : workData.badge,
            views: String(workData.views),
            exclusive: workData.exclusive,
            featured: workData.featured
          });
        }

        // Fetch episodes (published only, or all if admin)
        let query = supabase
          .from("episodes")
          .select("*")
          .eq("work_id", workId);

        if (!isAdmin) {
          query = query.lte("release_date", new Date().toISOString());
        }

        const { data: epData, error: epErr } = await query.order("id", { ascending: true });

        if (epErr) {
          console.error("Error fetching episodes:", epErr);
        } else if (epData) {
          const sorted = epData.map((e: any) => ({
            id: e.id,
            title: e.title,
            locked: e.locked,
            parts: e.parts
          })).sort((a, b) => {
            const aNum = parseFloat(a.id);
            const bNum = parseFloat(b.id);
            if (isNaN(aNum) || isNaN(bNum)) {
              return String(a.id).localeCompare(String(b.id));
            }
            return aNum - bNum;
          });
          setEpisodes(sorted);
        }
      } catch (err) {
        console.error("Failed to load work details:", err);
      } finally {
        setLoadingWork(false);
      }
    };
    fetchData();
  }, [workId, isAdmin]);

  const DEFAULT_FREE_UNTIL = work?.freeEpisodes ?? 1;
  const total = episodes.length || work?.totalEpisodes || work?.episodeCount || 0;

  const [unlockedUntil, setUnlockedUntil] = useState<number>(1);

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
      await supabase.auth.signOut();
      router.refresh();
      return;
    }

    await loginWithGoogle(`/works/${workId}`);
  };

  const goEpisode = async (href: string) => {
    if (user) {
      router.push(href);
      return;
    }

    await loginWithGoogle(href);
  };

  if (loadingWork) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>데이터를 불러오는 중...</div>
      </main>
    );
  }

  if (!work) {
    return (
      <main
        style={{
          minHeight: "100dvh",
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
        minHeight: "100dvh",
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
              width: 150,
              aspectRatio: "2 / 3",
              borderRadius: 16,
              objectFit: "cover",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />

          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>작품</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{work.title}</div>

            {!!work.description && (
              <div style={{ fontSize: 14, opacity: 0.82, marginBottom: 8, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
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
              goEpisode(`/episode/${work.id}/${firstEpisode.id}?part=1&autoplay=1`);
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

          {/* 이어듣기 버튼 (시청 기록 있을 때) */}
          {watchedEpisode && (
            <button
              onClick={() => goEpisode(`/episode/${work.id}/${watchedEpisode}?part=${resumePart}&autoplay=1`)}
              style={{
                background: "linear-gradient(135deg, #ff2a5f 0%, #ff7a3c 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px 18px",
                borderRadius: 14,
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ▶ {watchedEpisode}화 이어듣기
            </button>
          )}

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

      {episodes.length > 0 ? (
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
            const isLocked = isAdmin ? false : ep.locked;
            const href = `/episode/${work.id}/${episodeNo}?part=1&autoplay=1`;
            const epNum = parseInt(episodeNo.split("-")[0], 10) || 0;
            const isWatched = watchedEpisodeNum > 0 && epNum <= watchedEpisodeNum;
            const isCurrent = watchedEpisode && String(watchedEpisode) === episodeNo;

            return (
              <div
                key={episodeNo}
                onClick={() => goEpisode(href)}
                style={{
                  background: isCurrent
                    ? "rgba(255, 42, 95, 0.12)"
                    : isWatched
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.05)",
                  border: isCurrent
                    ? "1px solid rgba(255,42,95,0.35)"
                    : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 16,
                  padding: 16,
                  minHeight: 96,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 8,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  opacity: isWatched && !isCurrent ? 0.72 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
                  {episodeNo}화 {ep.parts > 1 ? `· ${ep.parts}편 구성` : ""}
                  {isWatched && (
                    <span style={{
                      background: isCurrent ? "#ff2a5f" : "rgba(255,255,255,0.15)",
                      color: isCurrent ? "#ffffff" : "rgba(255,255,255,0.7)",
                      fontSize: 9,
                      fontWeight: 900,
                      padding: "1px 6px",
                      borderRadius: 99,
                    }}>
                      {isCurrent ? "▶ 이어듣기" : "✓ 완료"}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.35 }}>
                  {ep.title}
                </div>

                {ep.parts > 1 && (
                  <div 
                    style={{ 
                      display: "flex", 
                      gap: 6, 
                      flexWrap: "wrap", 
                      marginTop: 4, 
                      marginBottom: 4 
                    }}
                  >
                    {Array.from({ length: ep.parts }).map((_, idx) => {
                      const partNum = idx + 1;
                      return (
                        <span
                          key={partNum}
                          onClick={(e) => {
                            e.stopPropagation();
                            goEpisode(`/episode/${work.id}/${episodeNo}?part=${partNum}&autoplay=1`);
                          }}
                          style={{
                            background: "rgba(255, 255, 255, 0.12)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "background 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                          }}
                        >
                          {partNum}편
                        </span>
                      );
                    })}
                  </div>
                )}

                <div style={{ fontSize: 12, opacity: 0.78, display: "flex", alignItems: "center", gap: 4 }}>
                  {isLocked ? "🔒 잠금" : "🔓 열림"}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 16,
            fontWeight: 700,
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 16,
            marginTop: 22,
            maxWidth: 1200,
          }}
        >
          에피소드 준비 중입니다. 조만간 재미있는 소설과 오디오 스토리로 찾아뵙겠습니다!
        </div>
      )}
    </main>
  );
}