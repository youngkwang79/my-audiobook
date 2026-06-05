"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Work } from "@/app/data/works";
import { supabase } from "@/lib/supabaseClient";
import LibraryItemCard from "@/app/components/work/LibraryItemCard";
import BottomNav from "@/app/components/BottomNav";

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function WorksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("시청 중");
  const [alarmSettings, setAlarmSettings] = useState<Record<string, boolean>>({});
  const [downloads, setDownloads] = useState<any[]>([]);
  const [watchProgress, setWatchProgress] = useState<Record<string, string>>({});
  const [worksList, setWorksList] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const tabs = ["시청 중", "시청 기록", "다운로드", "알림 설정 완료"];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && tabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // DB에서 소설 목록 불러오기
  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setLoadingWorks(true);
        const { data, error } = await supabase
          .from("works")
          .select(`
            *,
            episodes (
              id,
              release_date
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching works:", error);
        } else if (data) {
          const mapped = data.map((w: any) => {
            const isOldNew = w.badge === "신작" && w.created_at && (new Date().getTime() - new Date(w.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
            
            // 퍼블리싱된 첫 번째 에피소드 ID 찾기
            const publishedEpisodes = (w.episodes || [])
              .filter((e: any) => new Date(e.release_date).getTime() <= Date.now())
              .sort((a: any, b: any) => {
                const aNum = parseFloat(a.id);
                const bNum = parseFloat(b.id);
                if (isNaN(aNum) || isNaN(bNum)) {
                  return String(a.id).localeCompare(String(b.id));
                }
                return aNum - bNum;
              });
            const firstEpisodeId = publishedEpisodes[0]?.id || null;

            return {
              id: w.id,
              title: w.title,
              description: w.description,
              thumbnail: w.thumbnail,
              episodeCount: w.episode_count,
              totalEpisodes: w.total_episodes,
              freeEpisodes: w.free_episodes,
              status: w.status,
              subtitle: w.subtitle,
              badge: isOldNew ? "" : w.badge,
              views: String(w.views),
              exclusive: w.exclusive,
              featured: w.featured,
              firstEpisodeId,
              created_at: w.created_at
            } as Work;
          });
          setWorksList(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch works from DB:", err);
      } finally {
        setLoadingWorks(false);
      }
    };
    fetchWorks();
  }, []);

  // 시청 상태 및 진행 데이터 로드
  useEffect(() => {
    try {
      const progressRaw = localStorage.getItem("workProgress");
      if (progressRaw) {
        setWatchProgress(JSON.parse(progressRaw));
      } else {
        setWatchProgress({});
      }
    } catch (e) {
      console.error("시청 기록 로드 실패:", e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "다운로드") {
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;

        fetch("/api/me/downloads", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data.downloads) {
              try {
                // 문자열로 된 JSON 배열을 파싱
                const parsed = typeof data.downloads === "string" ? JSON.parse(data.downloads) : data.downloads;
                setDownloads(parsed);
              } catch(e) {
                console.error("다운로드 목록 파싱 오류:", e);
              }
            }
          })
          .catch(console.error);
      });
    }
  }, [activeTab]);

  // 알림 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alarmSettings");
      if (saved) {
        setAlarmSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  // 각 탭에 맞게 필터링된 작품 목록 가져오기
  const getFilteredWorks = () => {
    if (activeTab === "알림 설정 완료") {
      return worksList.filter((w) => alarmSettings[w.id] === true);
    }
    if (activeTab === "시청 중") {
      return worksList.filter((w) => {
        const watchedEp = watchProgress[w.id];
        if (!watchedEp) return false;
        const watchedEpNum = parseInt(watchedEp.split("-")[0], 10) || 0;
        return watchedEpNum < w.totalEpisodes;
      });
    }
    if (activeTab === "시청 기록") {
      return worksList.filter((w) => !!watchProgress[w.id]);
    }
    return worksList;
  };

  const filteredWorksList = getFilteredWorks();

  return (
    <main className="library-main">
      <style>{`
        .library-main {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding-bottom: 80px; /* BottomNav 공간 확보 */
        }

        .lib-header {
          position: sticky;
          top: 0;
          background: #000000;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
        }

        .lib-tabs {
          display: flex;
          gap: 16px;
        }

        .lib-tab {
          font-size: 16px;
          font-weight: 600;
          color: #8c8c96;
          cursor: pointer;
          position: relative;
          padding-bottom: 6px;
          transition: color 0.2s;
        }

        .lib-tab.active {
          color: #ffffff;
          font-weight: 700;
        }

        .lib-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: #ffffff;
          border-radius: 2px;
        }

        .lib-actions {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .lib-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
        }

        /* 알림 설정 완료 빈화면 스타일 */
        .lib-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 24px;
          text-align: center;
        }

        .lib-empty-text {
          font-size: 15px;
          color: #8c8c96;
          margin-bottom: 24px;
          font-weight: 500;
        }

        .lib-empty-btn {
          background: linear-gradient(90deg, #ff007f 0%, #ff7f00 100%);
          color: #ffffff;
          border: none;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 0, 127, 0.35);
          transition: transform 0.2s, opacity 0.2s;
        }

        .lib-empty-btn:active {
          transform: scale(0.96);
          opacity: 0.95;
        }
      `}</style>

      {/* 상단 탭 헤더 */}
      <div className="lib-header">
        <div className="lib-tabs">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`lib-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>
        <div className="lib-actions">
          <CheckIcon />
        </div>
      </div>

      {/* 리스트 영역 */}
      <div className="lib-list">
        {loadingWorks && activeTab !== "다운로드" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "100px 24px", color: "#8c8c96", fontSize: "15px", fontWeight: 500 }}>
            불러오는 중...
          </div>
        ) : activeTab === "알림 설정 완료" && filteredWorksList.length === 0 ? (
          <div className="lib-empty-state">
            {/* 시안의 빈 서랍/상자 아이콘 재현 */}
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ opacity: 0.5, marginBottom: 20 }}>
              <circle cx="65" cy="35" r="15" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" />
              <polygon points="61,29 61,41 71,35" fill="rgba(255, 255, 255, 0.4)" />
              
              <rect x="20" y="45" width="60" height="35" rx="6" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
              <path d="M20 52 H80" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" />
              <rect x="42" y="60" width="16" height="6" rx="3" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
              
              <path d="M38 48 L40 53 L45 54 L41 57 L42 62 L38 59 L34 62 L35 57 L31 54 L36 53 Z" fill="rgba(255, 255, 255, 0.25)" />
              
              <path d="M15 25 L17 25 M16 24 L16 26" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />
              <path d="M85 60 L87 60 M86 59 L86 61" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />
            </svg>

            <div className="lib-empty-text">아직 알림 설정한 드라마가 없어요.</div>
            <button
              className="lib-empty-btn"
              onClick={() => router.push("/?highlightComingSoon=true")}
            >
              인기 작품 시청하기
            </button>
          </div>
        ) : activeTab === "다운로드" ? (
          downloads.length === 0 ? (
            <div className="lib-empty-state">
              <div className="lib-empty-text">다운로드한 작품이 없습니다.</div>
              <button className="lib-empty-btn" onClick={() => router.push("/")}>
                작품 보러가기
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              {downloads.map((item, idx) => (
                <div key={idx} style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }} onClick={() => router.push(`/episode/${item.workId}/${item.episodeId}?part=${item.part}`)}>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>작품 ID: {item.workId}</div>
                  <div style={{ fontSize: "14px", color: "#8c8c96", marginTop: "4px" }}>
                    에피소드: {item.episodeId} | 파트: {item.part}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredWorksList.length === 0 ? (
          <div className="lib-empty-state">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ opacity: 0.5, marginBottom: 20 }}>
              <circle cx="65" cy="35" r="15" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" />
              <polygon points="61,29 61,41 71,35" fill="rgba(255, 255, 255, 0.4)" />
              
              <rect x="20" y="45" width="60" height="35" rx="6" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
              <path d="M20 52 H80" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" />
              <rect x="42" y="60" width="16" height="6" rx="3" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
              
              <path d="M38 48 L40 53 L45 54 L41 57 L42 62 L38 59 L34 62 L35 57 L31 54 L36 53 Z" fill="rgba(255, 255, 255, 0.25)" />
              
              <path d="M15 25 L17 25 M16 24 L16 26" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />
              <path d="M85 60 L87 60 M86 59 L86 61" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />
            </svg>
            <div className="lib-empty-text">
              {activeTab === "시청 중" ? "현재 시청 중인 작품이 없습니다." : "시청 기록이 없습니다."}
            </div>
            <button className="lib-empty-btn" onClick={() => router.push("/")}>
              인기 작품 시청하기
            </button>
          </div>
        ) : (
          filteredWorksList.map((work) => (
            <LibraryItemCard key={work.id} work={work} />
          ))
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <BottomNav />
    </main>
  );
}