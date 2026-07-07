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
            views: String(workData.play_count ?? workData.views ?? "0"),
            exclusive: workData.exclusive,
            featured: workData.featured,
            genre: workData.genre,
            created_at: workData.created_at
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

  // ✅ 블로그 글 조회수 카운트: 페이지 진입 시 1회 track-play 호출
  useEffect(() => {
    if (!workId) return;
    const sessionKey = `tracked_view_${workId}`;
    // 같은 세션에서 이미 카운트했으면 중복 방지
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    fetch("/api/media/track-play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workId }),
    }).catch(() => {});
  }, [workId]);

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

  const isBlog = work?.subtitle?.includes("[블로그]") || work?.subtitle?.includes("[공지사항]") || work?.genre === "블로그" || work?.genre === "blog";

  // 마크다운 문법을 HTML로 안전하게 변환해주는 초경량 파서 함수
  const parseMarkdownToHtml = (markdown: string) => {
    if (!markdown) return "";
    
    let html = markdown;

    // 0. 특수한 원화 기호나 이스케이프 찌꺼기 제거 (₩, ₩[ 등)
    html = html.replace(/₩/g, "");

    // 1. 볼드 처리 (**텍스트**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 2. 가로선 (---) 변환
    html = html.replace(/^---$/gm, "<hr style='border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;' />");

    // 3. 제목 태그 변환 (#, ##, ###) - 동적 고유 ID(id) 부여
    // 온점(.), 특수기호, 공백 편차에 상관없이 순수 알맹이 글자만 추출하여 앵커 ID 생성
    const makeSlug = (text: string) => {
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9가-힣]/g, "") // 온점(.) 및 특수문자 전면 소거
        .trim();
    };

    html = html.replace(/^### (.*?)$/gm, (match, p1) => {
      const slug = makeSlug(p1);
      return `<h3 id="${slug}" style='font-size: 19px; font-weight: 800; margin-top: 24px; margin-bottom: 10px; color: #ffd43b;'>${p1}</h3>`;
    });
    html = html.replace(/^## (.*?)$/gm, (match, p1) => {
      const slug = makeSlug(p1);
      return `<h2 id="${slug}" style='font-size: 22px; font-weight: 900; margin-top: 28px; margin-bottom: 12px; color: #ffd43b; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;'>${p1}</h2>`;
    });
    html = html.replace(/^# (.*?)$/gm, (match, p1) => {
      const slug = makeSlug(p1);
      return `<h1 id="${slug}" style='font-size: 26px; font-weight: 950; margin-top: 32px; margin-bottom: 14px; color: #ffd43b;'>${p1}</h1>`;
    });

    // 4. 링크 변환 ([텍스트](링크))
    // 내부 해시(anchor) 링크(#)인 경우, 주소 쪽 앵커 텍스트에서도 순수 알맹이만 추출하여 매칭 성공율 100% 보장
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
      if (url.startsWith("#")) {
        const cleanAnchor = makeSlug(decodeURIComponent(url.substring(1)));
        return `<a href="${url}" onclick="const el = document.getElementById('${cleanAnchor}'); if(el){ el.scrollIntoView({behavior: 'smooth'}); } else { console.warn('Anchor not found:', '${cleanAnchor}'); } return false;" style='color: #ff2a5f; text-decoration: underline; font-weight: 700;'>${text}</a>`;
      }
      return `<a href='${url}' target='_blank' rel='noopener noreferrer' style='color: #2563eb; text-decoration: underline; font-weight: 700;'>${text}</a>`;
    });

    // 5. 글머리 기호 변환
    // 순서 없는 목록 (* 내용 또는 - 내용)
    html = html.replace(/^[\*\-] (.*?)$/gm, "<li style='margin-left: 20px; margin-bottom: 8px; list-style-type: disc;'>$1</li>");
    // 순서 있는 목록 (1. 내용) - 목차 줄바꿈 가독성을 비약적으로 향상
    html = html.replace(/^(\d+)\. (.*?)$/gm, "<div style='margin-left: 8px; margin-bottom: 10px; font-size: 15px; line-height: 1.6;'>$1. $2</div>");

    // 6. 마크다운 테이블 구문 처리 (| 구분 | 내용 |)
    const lines = html.split("\n");
    let inTable = false;
    let tableHtml = "";
    let rowIndex = 0;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("|")) {
        // 구분선 행 (예: |---|---|) 건너뛰기
        if (line.includes("---") || line.includes("===")) {
          continue;
        }
        if (!inTable) {
          inTable = true;
          rowIndex = 0;
          tableHtml = `<div style="overflow-x: auto; margin: 24px 0; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02);"><table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">`;
        }
        
        const cells = line.split("|").map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const isHeader = rowIndex === 0;
        
        // 홀짝 행에  zebra 색상 부여
        const rowBg = isHeader 
          ? "linear-gradient(180deg, rgba(255, 212, 59, 0.1) 0%, rgba(255, 212, 59, 0.04) 100%)" 
          : (rowIndex % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent");
        
        tableHtml += `<tr style="background: ${rowBg}; border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.2s;">`;
        
        cells.forEach(cell => {
          const tag = isHeader ? "th" : "td";
          const cellStyle = isHeader
            ? "padding: 14px 16px; font-weight: 800; color: #ffd43b; font-size: 14px; border-bottom: 2px solid rgba(255, 212, 59, 0.25);"
            : "padding: 12px 16px; color: #e5e7eb; line-height: 1.5; border-right: 1px solid rgba(255, 255, 255, 0.03);";
          tableHtml += `<${tag} style="${cellStyle}">${cell}</${tag}>`;
        });
        tableHtml += "</tr>";
        rowIndex++;
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += "</table></div>";
          processedLines.push(tableHtml);
          tableHtml = "";
        }
        processedLines.push(lines[i]);
      }
    }
    if (inTable) {
      tableHtml += "</table></div>";
      processedLines.push(tableHtml);
    }
    html = processedLines.join("\n");

    // 7. 문단(Double Newline) 및 줄바꿈(Single Newline) 변환
    const paragraphs = html.split(/\n\n+/);
    return paragraphs
      .map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith("<table") || trimmed.startsWith("<h") || trimmed.startsWith("<li") || trimmed.startsWith("<hr")) {
          return p;
        }
        return `<p style='margin-bottom: 16px; line-height: 1.8; font-size: 16px;'>${p.replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
  };

  if (isBlog) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#050508",
          color: "white",
          padding: "20px 20px 80px",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
        }}
      >
        <TopBar />

        <div
          style={{
            maxWidth: 800,
            margin: "24px auto 0",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "28px 24px",
            boxSizing: "border-box"
          }}
        >
          {/* Breadcrumb / 카테고리 */}
          <div style={{ fontSize: 13, color: "#ff2a5f", fontWeight: 700, marginBottom: 12 }}>
            {work.subtitle}
          </div>

          {/* 제목 */}
          <h1 style={{ fontSize: "28px", fontWeight: 950, lineHeight: 1.35, marginBottom: 16, marginTop: 0 }}>
            {work.title}
          </h1>

          {/* 서브타이틀 */}
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24 }}>
            등록일: {new Date(work.created_at || Date.now()).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* 썸네일 (2:3 비율 북커버 스타일) */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src={work.thumbnail}
              alt={work.title}
              style={{
                width: "100%",
                maxWidth: 240,
                aspectRatio: "2 / 3",
                borderRadius: 16,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
              }}
            />
          </div>

          {/* 본문 (마크다운 파싱 렌더링) */}
          <div
            style={{
              color: "#f3f4f6",
              letterSpacing: "-0.3px",
              wordBreak: "break-word"
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(work.description || "") }}
          />

          {/* 하단 단추 */}
          <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, textAlign: "center" }}>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const currentTab = params.get("tab") || "도움되는글";
                router.push(`/?tab=${encodeURIComponent(currentTab)}`);
              }}
              style={{
                background: "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)",
                color: "white",
                border: "none",
                padding: "12px 28px",
                borderRadius: 14,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(255, 42, 95, 0.3)"
              }}
            >
              목록으로 돌아가기
            </button>
          </div>
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