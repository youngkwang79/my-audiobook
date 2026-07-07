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
          
          // 💡 실시간 방문 카운터 증가: play_count 수치를 DB 상에서 즉시 1 증가시킴 (비관리자 진입 시 작동)
          const currentPlayCount = Number(workData.play_count ?? 0);
          const nextPlayCount = currentPlayCount + 1;
          
          if (!isAdmin) {
            supabase
              .from("works")
              .update({ play_count: nextPlayCount })
              .eq("id", workId)
              .then(({ error }) => {
                if (error) console.error("Failed to increment play_count:", error);
              });
          }

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
            views: String(nextPlayCount), // 사용자에게는 실시간 반영된 수치로 노출
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

  const isBlog = work?.id?.startsWith("calc-") || work?.subtitle?.includes("[블로그]") || work?.subtitle?.includes("[공지사항]") || work?.genre === "블로그" || work?.genre === "blog";

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

          {/* 💡 [계산기 3형제 실물 프로그램 임베드 영역] */}
          <div style={{ marginBottom: 30 }}>
            <CalculatorEmbed id={work.id} />
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

// 💡 [실물 계산기 프로그램 내장 컴포넌트]
function CalculatorEmbed({ id }: { id: string }) {
  // 롱테일 예시 3개 탭 제어용 React State 추가
  const [activeExampleTab, setActiveExampleTab] = useState<string>("ex1");

  const [housePrice, setHousePrice] = useState("");
  const [ownerAge, setOwnerAge] = useState("59");
  const [holdYears, setHoldYears] = useState("4");
  const [taxResult, setTaxResult] = useState<any>(null);

  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [loanType, setLoanType] = useState("원리금균등");
  const [loanResult, setLoanResult] = useState<any>(null);

  const [brokerPrice, setBrokerPrice] = useState("");
  const [brokerType, setBrokerType] = useState("주택");
  const [brokerResult, setBrokerResult] = useState<any>(null);

  if (id !== "calc-jongbuse" && id !== "calc-loan" && id !== "calc-brokerage") {
    return null;
  }

  const formatWon = (val: number) => {
    if (!val || val === 0) return "0 원";
    return Math.round(val).toLocaleString("ko-KR") + " 원";
  };

  const handleJongbuse = () => {
    const priceBillion = parseFloat(housePrice);
    if (!priceBillion || priceBillion <= 0) {
      alert("공시가격을 정확히 입력해 주세요!");
      return;
    }
    const price = priceBillion * 1000000000;
    
    let jointTax = 0;
    const half = price / 2;
    if (half > 1200000000) {
      jointTax = calcBaseJongbuse(half - 1200000000) * 2;
    }

    let singleTax = 0;
    let base = 0;
    let rawTax = 0;
    let totalRate = 0;
    
    if (price > 1200000000) {
      base = price - 1200000000;
      rawTax = calcBaseJongbuse(base);

      let ageRate = 0;
      const ageVal = parseInt(ownerAge);
      if (ageVal >= 70) ageRate = 0.4;
      else if (ageVal >= 65) ageRate = 0.3;
      else if (ageVal >= 60) ageRate = 0.2;

      let holdRate = 0;
      const holdVal = parseInt(holdYears);
      if (holdVal >= 15) holdRate = 0.5;
      else if (holdVal >= 10) holdRate = 0.4;
      else if (holdVal >= 5) holdRate = 0.2;

      totalRate = ageRate + holdRate;
      if (totalRate > 0.8) totalRate = 0.8;

      singleTax = rawTax * (1 - totalRate);
    }

    setTaxResult({
      joint: jointTax,
      single: singleTax,
      rate: totalRate * 100,
      saving: Math.max(0, jointTax - singleTax)
    });
  };

  const calcBaseJongbuse = (base: number) => {
    if (base <= 0) return 0;
    if (base <= 300000000) return base * 0.005;
    if (base <= 600000000) return 1500000 + (base - 300000000) * 0.007;
    if (base <= 1200000000) return 3600000 + (base - 600000000) * 0.01;
    if (base <= 2500000000) return 9600000 + (base - 1200000000) * 0.015;
    return 29100000 + (base - 2500000000) * 0.02;
  };

  const handleLoan = () => {
    const principal = parseFloat(loanAmount) * 10000;
    const annualRate = parseFloat(loanRate);
    const rateMonthly = annualRate / 12 / 100;
    const months = parseInt(loanTerm);

    if (!principal || !rateMonthly || !months) {
      alert("대출 정보를 정확히 기입해 주세요!");
      return;
    }

    let schedule = [];
    let totalInterest = 0;
    let remainingPrincipal = principal;

    if (loanType === "원리금균등") {
      const monthlyRepayment = (principal * rateMonthly * Math.pow(1 + rateMonthly, months)) / (Math.pow(1 + rateMonthly, months) - 1);
      
      for (let i = 1; i <= months; i++) {
        const interest = remainingPrincipal * rateMonthly;
        const principalPaid = monthlyRepayment - interest;
        remainingPrincipal -= principalPaid;
        totalInterest += interest;

        schedule.push({
          seq: i,
          repayment: monthlyRepayment,
          principal: principalPaid,
          interest: interest,
          balance: Math.max(0, remainingPrincipal)
        });
      }
    } else {
      const monthlyPrincipal = principal / months;
      for (let i = 1; i <= months; i++) {
        const interest = remainingPrincipal * rateMonthly;
        remainingPrincipal -= monthlyPrincipal;
        totalInterest += interest;

        schedule.push({
          seq: i,
          repayment: monthlyPrincipal + interest,
          principal: monthlyPrincipal,
          interest: interest,
          balance: Math.max(0, remainingPrincipal)
        });
      }
    }

    setLoanResult({
      monthly: schedule[0].repayment,
      interest: totalInterest,
      total: principal + totalInterest,
      schedule: schedule
    });
  };

  const handleBrokerage = () => {
    const price = parseFloat(brokerPrice) * 100000000;
    if (!price || price <= 0) {
      alert("거래 금액을 입력해 주세요!");
      return;
    }

    let rate = 0.004;
    let limit = 0;

    if (brokerType === "주택") {
      if (price < 50000000) { rate = 0.006; limit = 250000; }
      else if (price < 200000000) { rate = 0.005; limit = 800000; }
      else if (price < 900000000) { rate = 0.004; }
      else if (price < 1200000000) { rate = 0.005; }
      else if (price < 1500000000) { rate = 0.006; }
      else { rate = 0.007; }
    } else {
      rate = 0.009;
    }

    let fee = price * rate;
    let overLimit = false;
    if (limit > 0 && fee > limit) {
      fee = limit;
      overLimit = true;
    }

    setBrokerResult({
      fee,
      rate: rate * 100,
      limit,
      overLimit
    });
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1.5px solid rgba(255, 42, 95, 0.2)", borderRadius: 20, padding: 24, margin: "20px 0" }}>
      {/* 종부세 폼 */}
      {id === "calc-jongbuse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900, color: "#ffffff" }}>📊 공시가격별 종합부동산세 절세 연산기</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>아파트 공시가격 (억원)</label>
            <input type="number" value={housePrice} onChange={(e) => setHousePrice(e.target.value)} placeholder="예: 16" style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", fontSize: 15, fontWeight: 700 }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>공동 명의자 나이</label>
              <select value={ownerAge} onChange={(e) => setOwnerAge(e.target.value)} style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 10px", fontSize: 13, fontWeight: 700 }}>
                <option value="59">만 60세 미만</option>
                <option value="60">만 60세~64세 (20%)</option>
                <option value="65">만 65세~69세 (30%)</option>
                <option value="70">만 70세 이상 (40%)</option>
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>주택 보유 기간</label>
              <select value={holdYears} onChange={(e) => setHoldYears(e.target.value)} style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 10px", fontSize: 13, fontWeight: 700 }}>
                <option value="4">5년 미만</option>
                <option value="5">5년~10년 미만 (20%)</option>
                <option value="10">10년~15년 미만 (40%)</option>
                <option value="15">15년 이상 (50%)</option>
              </select>
            </div>
          </div>
          <button onClick={handleJongbuse} style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer" }}>세금 절감 시뮬레이션 돌리기</button>
          
          {taxResult && (
            <div style={{ marginTop: 10, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13.5 }}>
                <span>공동명의 기본 납부 세액:</span>
                <strong>{formatWon(taxResult.joint)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13.5 }}>
                <span>단독 특례 신청 납부 세액:</span>
                <strong>{formatWon(taxResult.single)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5, fontWeight: 900 }}>
                <span style={{ color: "#ffd43b" }}>단독 명의 특례 신청 시 최종 절세액:</span>
                <span style={{ color: "#ff2a5f" }}>{formatWon(taxResult.saving)}</span>
              </div>
            </div>
          )}

          {/* 💡 [3대 롱테일 예시 선택 탭 스위처 UI 임베드 복원] */}
          <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 900, color: "#ffd43b", textAlign: "center" }}>
              💡 원하는 세무/금융 롱테일 예시 주제 가이드 선택
            </h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { key: "ex1", label: "예시 1) 공시가 15억 유불리 비교" },
                { key: "ex2", label: "예시 2) 9월 홈택스 신청 절차" },
                { key: "ex3", label: "예시 3) 고령 장기보유 중복공제" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveExampleTab(tab.key)}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    height: 38,
                    borderRadius: 8,
                    border: "1.5px solid " + (activeExampleTab === tab.key ? "#ff2a5f" : "rgba(255,255,255,0.1)"),
                    background: activeExampleTab === tab.key ? "rgba(255,42,95,0.1)" : "none",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 1 본문 내용 */}
            {activeExampleTab === "ex1" && (
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <strong style={{ color: "#ffffff", fontSize: 14.5 }}>🏠 아파트 공시가격 15억 부부 공동명의 단독명의 종부세 모의 연산 비교, 나에게 유리한 선택은?</strong>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  서울 및 수도권 기준인 공시가격 15억 원 주택 한 채를 소유한 부부라면, 지분을 50:50으로 나누어 가졌을 때 인당 기본 공제 12억 원(합산 24억 원)을 적용받아 종합부동산세 납부 금액은 0원이 됩니다. 반면 단독명의 특례를 선택하면 기본 공제금액이 12억 원으로 제한되므로 공제액을 초과한 3억 원에 대해 종부세가 부과됩니다. 그러나 단독 소유주는 최대 80%에 달하는 장기보유 및 고령자 공제를 중복해서 공제받을 수 있으므로, 소유주의 나이가 만 60세를 넘어가고 거주 보유 기간이 5년 이상 길어지는 순간부터 단독 특례가 훨씬 유익할 수 있으므로 면밀한 검토가 필요합니다.
                </p>
              </div>
            )}

            {/* 탭 2 본문 내용 */}
            {activeExampleTab === "ex2" && (
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <strong style={{ color: "#ffffff", fontSize: 14.5 }}>📝 1주택 공동명의 종부세 단독명의 특례 신청 9월 세무서 접수 방법 및 홈택스 절차 완벽 가이드</strong>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  매년 9월 16일부터 9월 30일까지 2주간 국세청 홈택스나 관할 세무서를 통해 '공동명의 1주택자 세율 적용 특례 신청' 접수를 진행해야 합니다. 홈택스에 로그인한 후 공동인증서 승인을 거쳐 '공동명의 1주택자 특례 신청' 란에서 주택 공시가격과 지분율을 입력하고, 부부 중 1명을 납세의무자로 설정해 신고를 마칩니다. 접수를 놓치게 되면 사후 행정 절차가 까다로우므로 해당 기한 내에 가계 절세를 검토해 완료해야 합니다.
                </p>
              </div>
            )}

            {/* 탭 3 본문 내용 */}
            {activeExampleTab === "ex3" && (
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <strong style={{ color: "#ffffff", fontSize: 14.5 }}>⚖️ 부부 공동명의 종부세 고령자 공제 중복 적용 여부와 세액 절감 계산법 총정리</strong>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  1세대 1주택 단독명의 특례는 소유주의 만 연령에 따른 고령자 세액 공제(만 60세 이상 20%, 만 65세 이상 30%, 만 70세 이상 40%)와 해당 주택의 장기 보유 연수에 따른 세액 공제(5년 이상 20%, 10년 이상 40%, 15년 이상 50%)를 병합 제공합니다. 두 세액 공제는 중복하여 합산 적용할 수 있으며, 법률상의 통합 공제 한도는 최대 80%로 규정되어 있습니다. 최대 공제를 받는 납세자는 원 고지 세액의 단 20%만 부담하므로 자산을 지키는 최선의 방패가 됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 대출 이자 폼 */}
      {id === "calc-loan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900, color: "#ffffff" }}>💵 무료 대출 상환 회차별 원리금 계산기</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>대출 금액 (만원 단위)</label>
            <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="예: 20000 (2억원)" style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", fontSize: 15, fontWeight: 700 }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>대출 기간 (개월)</label>
              <input type="number" value={loanTerm} onChange={(e) => setLoanTerm(e.target.value)} placeholder="예: 36" style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", fontSize: 14, fontWeight: 700 }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>연 이자 요율 (%)</label>
              <input type="number" value={loanRate} onChange={(e) => setLoanRate(e.target.value)} placeholder="예: 4.8" step="0.1" style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", fontSize: 14, fontWeight: 700 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["원리금균등", "원금균등"].map((mode) => (
              <button key={mode} onClick={() => setLoanType(mode)} style={{ flex: 1, height: 38, borderRadius: 8, border: "1.5px solid " + (loanType === mode ? "#ff2a5f" : "rgba(255,255,255,0.1)"), background: loanType === mode ? "rgba(255,42,95,0.1)" : "none", color: "white", fontWeight: 700, cursor: "pointer" }}>{mode}</button>
            ))}
          </div>
          <button onClick={handleLoan} style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer" }}>상환금 리포트 생성하기</button>

          {loanResult && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)", fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>첫 달 원리금 상환액:</span>
                  <strong>{formatWon(loanResult.monthly)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>대출 총 발생 이자액:</span>
                  <strong>{formatWon(loanResult.interest)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5, fontWeight: 900 }}>
                  <span style={{ color: "#ffd43b" }}>원금 + 이자 총 상환합계:</span>
                  <span style={{ color: "#ff2a5f" }}>{formatWon(loanResult.total)}</span>
                </div>
              </div>

              {/* 회차 표 리포트 */}
              <h3 style={{ fontSize: 14.5, fontWeight: 900, color: "#ffd43b", margin: "10px 0 0 0" }}>📊 대출 상환 회차별 정밀 이자 스케줄 표</h3>
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ padding: 8 }}>회차</th>
                      <th style={{ padding: 8 }}>납부원리금</th>
                      <th style={{ padding: 8 }}>상환원금</th>
                      <th style={{ padding: 8 }}>이자금액</th>
                      <th style={{ padding: 8 }}>남은대출잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanResult.schedule.map((row: any) => (
                      <tr key={row.seq} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <td style={{ padding: 8, fontWeight: 700 }}>{row.seq}회</td>
                        <td style={{ padding: 8, color: "#ffd43b" }}>{formatWon(row.repayment)}</td>
                        <td style={{ padding: 8 }}>{formatWon(row.principal)}</td>
                        <td style={{ padding: 8 }}>{formatWon(row.interest)}</td>
                        <td style={{ padding: 8, color: "rgba(255,255,255,0.4)" }}>{formatWon(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 중개수수료 폼 */}
      {id === "calc-brokerage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900, color: "#ffffff" }}>🏠 부동산 중개 수수료 법정 한도 계산기</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {["주택", "오피스텔/기타"].map((mode) => (
              <button key={mode} onClick={() => setBrokerType(mode)} style={{ flex: 1, height: 38, borderRadius: 8, border: "1.5px solid " + (brokerType === mode ? "#ff2a5f" : "rgba(255,255,255,0.1)"), background: brokerType === mode ? "rgba(255,42,95,0.1)" : "none", color: "white", fontWeight: 700, cursor: "pointer" }}>{mode}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>거래 대금 (억원)</label>
            <input type="number" value={brokerPrice} onChange={(e) => setBrokerPrice(e.target.value)} placeholder="예: 7.5 (7억 5천만원)" step="0.1" style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", fontSize: 15, fontWeight: 700 }} />
          </div>
          <button onClick={handleBrokerage} style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer" }}>복비 한도액 연산하기</button>

          {brokerResult && (
            <div style={{ marginTop: 10, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13.5 }}>
                <span>적용 상한 수수료 요율:</span>
                <strong>{brokerResult.rate} %</strong>
              </div>
              {brokerResult.overLimit && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#ffd43b" }}>
                  <span>구간 법정 한도액 제한:</span>
                  <strong>{formatWon(brokerResult.limit)} 한도 적용</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5, fontWeight: 900 }}>
                <span style={{ color: "#ffd43b" }}>최종 법정 중개 수수료 한도:</span>
                <span style={{ color: "#ff2a5f" }}>{formatWon(brokerResult.fee)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}