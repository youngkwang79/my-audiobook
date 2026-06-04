// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { supabase, loginWithGoogle } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

// 파일명에서 회차 번호와 제목 추출하는 헬퍼 함수
function parseFilename(filename: string) {
  // 확장자 제거 (예: .mp3, .m4a 등)
  const base = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // 1. "01 새벽의 검", "01 - 새벽의 검", "1화 새벽의 검" 패턴 매칭
  // 숫자(1개 이상) + 선택적 "화" + 공백/대시/점/언더바 + 나머지 내용
  const match = base.trim().match(/^(\d+)(?:화)?[\s\-_.]+(.+)$/);
  if (match) {
    const id = match[1];
    const title = match[2].trim();
    return { id: String(Number(id)), title };
  }
  
  // 2. 숫자만 있는 패턴 (예: "01", "1화")
  const onlyNumMatch = base.trim().match(/^(\d+)(?:화)?$/);
  if (onlyNumMatch) {
    const id = onlyNumMatch[1];
    return { id: String(Number(id)), title: `${Number(id)}화` };
  }
  
  // 3. 예외 패턴 (예: "새벽의 검")
  return { id: "1", title: base.trim() };
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"novels" | "episodes" | "edit">("novels");

  // --- 소설 등록 상태 ---
  const [novelId, setNovelId] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [novelDesc, setNovelDesc] = useState("");
  const [novelStatus, setNovelStatus] = useState<"연재중" | "완결" | "준비중">("완결");
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택형 장르 태그
  const [novelBadge, setNovelBadge] = useState("신작");
  const [novelExclusive, setNovelExclusive] = useState(true);
  const [novelFeatured, setNovelFeatured] = useState(true);
  const [novelThumbnail, setNovelThumbnail] = useState("");
  const [freeEpisodes, setFreeEpisodes] = useState<number | "">(10);
  const [totalEpisodes, setTotalEpisodes] = useState<number | "">(50);

  // 썸네일 직접 업로드 상태
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  // --- 회차 등록 상태 ---
  const [worksList, setWorksList] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState(true);
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  const [episodeFile, setEpisodeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- 작품 수정 상태 ---
  const [editWorkId, setEditWorkId] = useState("");
  const [editWork, setEditWork] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState("");
  const [editThumbnailUploading, setEditThumbnailUploading] = useState(false);

  // 권한 검증
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setLoadingCheck(false);
      return;
    }

    const checkAdminRole = () => {
      const userRole = user.app_metadata?.role || user.user_metadata?.role;
      const hasAdminEmail = user.email === "youngkwang79@gmail.com"; // 예비 관리자 이메일
      if (userRole === "admin" || hasAdminEmail) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoadingCheck(false);
    };

    checkAdminRole();
  }, [user, authLoading]);

  // 소설 목록 불러오기 (회차 등록 탭용)
  const fetchWorks = async () => {
    const { data, error } = await supabase
      .from("works")
      .select("id, title")
      .order("created_at", { ascending: false });
    if (data) {
      setWorksList(data);
      if (data.length > 0 && !selectedWorkId) {
        setSelectedWorkId(data[0].id);
      }
    }
  };

  // 특정 작품 불러오기 (수정 탭)
  const fetchEditWork = async (id: string) => {
    if (!id) return;
    setEditLoading(true);
    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setEditWork({ ...data });
        setEditThumbnailPreview(data.thumbnail || "");
        setEditThumbnailFile(null);
      }
    } catch (err: any) {
      alert("작품 정보 불러오기 실패: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // 작품 수정 저장
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWork) return;
    setEditSaving(true);
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      let finalThumbnail = editWork.thumbnail;

      // 새 썸네일 파일이 선택된 경우 업로드
      if (editThumbnailFile) {
        setEditThumbnailUploading(true);
        const ext = editThumbnailFile.name.split(".").pop() || "png";
        const r2Key = `thumbnails/${editWork.id}.${ext}`;
        const formData = new FormData();
        formData.append("file", editThumbnailFile);
        formData.append("key", r2Key);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/direct-upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`업로드 실패: ${xhr.status}`));
          xhr.onerror = () => reject(new Error("네트워크 오류"));
          xhr.send(formData);
        });
        finalThumbnail = `https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/${r2Key}`;
        setEditThumbnailUploading(false);
      }

      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editWork.id,
          title: editWork.title,
          description: editWork.description,
          thumbnail: finalThumbnail,
          episode_count: editWork.episode_count,
          total_episodes: editWork.total_episodes,
          free_episodes: editWork.free_episodes,
          status: editWork.status,
          subtitle: editWork.subtitle,
          badge: editWork.badge,
          exclusive: editWork.exclusive,
          featured: editWork.featured,
          views: editWork.views ?? 0,
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");
      alert("✅ 작품 정보가 성공적으로 수정되었습니다!");
      fetchWorks();
      fetchEditWork(editWork.id);
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally {
      setEditSaving(false);
      setEditThumbnailUploading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchWorks();
    }
  }, [isAdmin]);

  // 소설 등록 제출
  const handleNovelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelId || !novelTitle) {
      alert("소설 ID와 제목은 필수 항목입니다.");
      return;
    }

    let finalThumbnailUrl = novelThumbnail || "/thumbnails/default.jpg";

    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);

      // 썸네일 파일 업로드 시작
      if (thumbnailFile) {
        setThumbnailUploading(true);
        setThumbnailProgress(0);
        const ext = thumbnailFile.name.split(".").pop() || "png";
        const r2Key = `thumbnails/${novelId}.${ext}`;

        const formData = new FormData();
        formData.append("file", thumbnailFile);
        formData.append("key", r2Key);

        // API 라우트를 통해 안전하게 파일 전송 (서버를 통해 R2 업로드하므로 CORS 문제 우회)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/direct-upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              setThumbnailProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`업로드 실패 status: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("네트워크 오류 발생"));
          xhr.send(formData);
        });

        finalThumbnailUrl = `https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/${r2Key}`;
      }

      // 3. API 라우트를 통해 안전하게 등록/수정 (RLS 우회)
      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isNew: true,
          id: novelId,
          title: novelTitle,
          description: novelDesc,
          thumbnail: finalThumbnailUrl,
          episode_count: 0,
          total_episodes: totalEpisodes === "" ? 50 : totalEpisodes,
          free_episodes: freeEpisodes === "" ? 10 : freeEpisodes,
          status: novelStatus,
          subtitle: selectedTags.join(" "),
          badge: novelBadge,
          views: 0,
          exclusive: novelExclusive,
          featured: novelFeatured
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "소설 등록 실패");
      }

      alert("소설이 성공적으로 등록되었습니다!");
      setNovelId("");
      setNovelTitle("");
      setNovelDesc("");
      setSelectedTags([]);
      setNovelBadge("신작");
      setNovelThumbnail("");
      setThumbnailFile(null);
      setThumbnailPreview("");
      setThumbnailProgress(0);
      fetchWorks(); // 목록 갱신
    } catch (err: any) {
      console.error(err);
      alert(`소설 등록 실패: ${err.message}`);
    } finally {
      setThumbnailUploading(false);
    }
  };

  // 회차 업로드 제출 (오디오 파일 업로드 포함)
  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !episodeId || !episodeTitle || !episodeReleaseDate) {
      alert("모든 필수 값을 입력해 주세요. (음원 파일을 선택하면 자동으로 채워집니다)");
      return;
    }

    if (!episodeFile) {
      alert("오디오 음원 파일을 선택해 주세요.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);

      // 1. 오디오 파일 R2 업로드
      const isPureNumber = /^\d+$/.test(episodeId);
      const epFolder = isPureNumber ? String(Number(episodeId)).padStart(3, "0") : episodeId;
      
      const ext = (episodeFile.name.split(".").pop() || "mp3").toUpperCase();
      const r2Key = `${selectedWorkId}/${epFolder}/01.${ext}`; // 항상 01 파트로 업로드

      const formData = new FormData();
      formData.append("file", episodeFile);
      formData.append("key", r2Key);

      // API 라우트를 통해 안전하게 파일 전송 (서버를 통해 R2 업로드하므로 CORS 문제 우회)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/direct-upload", true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        const onUploadLoad = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`업로드 실패 status: ${xhr.status}`));
          }
        };
        xhr.onload = onUploadLoad;

        xhr.onerror = () => reject(new Error("네트워크 오류 발생"));
        xhr.send(formData);
      });

      // 2. API 라우트를 통해 안전하게 에피소드 등록/수정 (RLS 우회 및 에피소드 수 업데이트 일괄 처리)
      const epRes = await fetch("/api/admin/upsert-episode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          work_id: selectedWorkId,
          id: episodeId,
          title: episodeTitle,
          locked: episodeLocked,
          parts: 1, // 항상 1 파트
          release_date: new Date(episodeReleaseDate).toISOString()
        })
      });

      const epData = await epRes.json();
      if (!epRes.ok) {
        throw new Error(epData.error || "에피소드 DB 저장 실패");
      }

      alert("회차 등록 및 R2 오디오 업로드가 성공적으로 완료되었습니다!");
      setEpisodeId("");
      setEpisodeTitle("");
      setEpisodeFile(null);
      setUploadProgress(null);
    } catch (err: any) {
      console.error(err);
      alert(`업로드 중 오류 발생: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 로딩 뷰
  if (authLoading || loadingCheck) {
    return (
      <main style={{ minHeight: "100dvh", background: "#0b0b12", color: "white", padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>관리자 권한 조회 중...</div>
      </main>
    );
  }

  // 비로그인 또는 관리자가 아닐 때 로그인 유도 화면
  if (!isAdmin) {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.refresh();
      window.location.reload();
    };

    return (
      <main style={{ minHeight: "100dvh", background: "#0b0b12", color: "white", padding: 20, fontFamily: "sans-serif" }}>
        <TopBar />
        <div style={{ maxWidth: 550, margin: "100px auto", textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>관리자 페이지</h2>
          
          {user ? (
            <div>
              <div style={{ background: "rgba(255,59,48,0.15)", border: "1px solid #ff3b30", borderRadius: 8, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
                <div style={{ fontWeight: 800, color: "#ff453a", fontSize: 15 }}>⚠️ 권한이 없습니다.</div>
                <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
                  현재 로그인된 계정: <strong>{user.email}</strong>
                </div>
              </div>
              <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 20, lineHeight: 1.6, textAlign: "left" }}>
                이 계정은 관리자 화이트리스트에 등록되어 있지 않습니다. 관리자 권한을 획득하려면 아래 방법 중 하나를 사용해 주세요.
              </p>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16, marginBottom: 24, textAlign: "left", fontSize: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                <strong>방법 1: 소스 코드 수정 (가장 빠름)</strong>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                  <code style={{ color: "#ffe9a3", fontSize: 11 }}>app/admin/page.tsx</code> 파일 <strong>62번째 라인</strong>을 아래와 같이 수정하여 본인 이메일을 추가해 줍니다:
                </p>
                <pre style={{ background: "#1c1c24", padding: "8px 12px", borderRadius: 6, marginTop: 8, overflowX: "auto", color: "#8dd3c7" }}>
{`const hasAdminEmail = 
  user.email === "admin@murimbook.com" || 
  user.email === "${user.email}";`}
                </pre>
                <strong style={{ display: "block", marginTop: 12 }}>방법 2: Supabase 메타데이터 설정</strong>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                  Supabase 대시보드 &gt; Authentication &gt; Users 에서 해당 유저의 metadata에 <code style={{ color: "#ffe9a3" }}>"role": "admin"</code>을 추가합니다.
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{ width: "100%", height: 48, borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer", transition: "background 0.2s" }}
              >
                다른 계정으로 로그아웃
              </button>
            </div>
          ) : (
            <div>
              <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 24 }}>이 페이지에 접근하려면 관리자 계정 로그인이 필요합니다.</p>
              <button
                onClick={() => loginWithGoogle("/admin")}
                style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
              >
                Google 관리자 로그인
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#050508",
        color: "white",
        padding: "20px 20px 80px",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      <TopBar />

      <style>{`
        .admin-container {
          max-width: 900px;
          margin: 20px auto 0;
        }
        .admin-title {
          font-size: 28px;
          font-weight: 950;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #ff2a5f 0%, #fca834 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .admin-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 24px;
        }
        .admin-tab {
          padding: 12px 20px;
          font-size: 16px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
        }
        .admin-tab.active {
          color: white;
        }
        .admin-tab.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 3px;
          background: #ff2a5f;
          border-radius: 99px;
        }
        .card-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          backdrop-filter: blur(12px);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .form-label {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
        }
        .form-input, .form-select, .form-textarea {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #ff2a5f;
        }
        .btn-submit {
          height: 48px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%);
          color: white;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .thumbnail-preview-wrap {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-top: 10px;
        }
        .thumbnail-img {
          width: 120px;
          aspect-ratio: 2 / 3;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .audio-upload-row {
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-bar-fill {
          height: 100%;
          background: #ff2a5f;
          transition: width 0.1s ease-out;
        }
        .upload-dropzone:hover {
          border-color: #ff2a5f !important;
          background: rgba(255, 42, 95, 0.03) !important;
        }
      `}</style>

      <div className="admin-container">
        <h1 className="admin-title">무림북 어드민 대시보드</h1>

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === "novels" ? "active" : ""}`} onClick={() => setActiveTab("novels")}>소설 등록</button>
          <button className={`admin-tab ${activeTab === "edit" ? "active" : ""}`} onClick={() => { setActiveTab("edit"); if (!editWorkId && worksList.length > 0) { setEditWorkId(worksList[0].id); fetchEditWork(worksList[0].id); } }}>작품 수정</button>
          <button className={`admin-tab ${activeTab === "episodes" ? "active" : ""}`} onClick={() => setActiveTab("episodes")}>회차 & 오디오 업로드</button>
        </div>

        {/* 탭 1: 소설 작품 관리 */}
        {activeTab === "novels" && (
          <form onSubmit={handleNovelSubmit} className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>새로운 무협 소설 생성</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">소설 영문 고유 ID (예: cheonmujin)</label>
                <input type="text" className="form-input" placeholder="cheonmujin" value={novelId} onChange={(e) => setNovelId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">소설 제목</label>
                <input type="text" className="form-input" placeholder="천무진: 봉인된 천재" value={novelTitle} onChange={(e) => setNovelTitle(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">소설 줄거리 및 시놉시스</label>
              <textarea className="form-textarea" rows={6} placeholder="작품 소개글을 입력하세요..." value={novelDesc} onChange={(e) => setNovelDesc(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">기본 무료 공개 화수</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={freeEpisodes} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFreeEpisodes(val === "" ? "" : Number(val));
                  }} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">총 연재 예정 화수</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={totalEpisodes} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalEpisodes(val === "" ? "" : Number(val));
                  }} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">연재 상태</label>
                <select className="form-select" value={novelStatus} onChange={(e) => setNovelStatus(e.target.value as any)}>
                  <option value="연재중">연재중</option>
                  <option value="완결">완결</option>
                  <option value="준비중">준비중</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">장르 태그 선택</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {["[회귀물]", "[복수극]", "[의선]", "[성장]", "[복수]", "[정통무협]", "[환생물]", "[먼치킨]", "[사이다]", "[미스터리]"].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: isSelected ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)" : "rgba(255,255,255,0.05)",
                          border: isSelected ? "1px solid #ff2a5f" : "1px solid rgba(255,255,255,0.12)",
                          color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                          boxShadow: isSelected ? "0 0 10px rgba(255, 42, 95, 0.4)" : "none"
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">노출 배지 선택</label>
                <select 
                  className="form-select" 
                  value={novelBadge} 
                  onChange={(e) => setNovelBadge(e.target.value)}
                >
                  <option value="신작">신작</option>
                  <option value="">없음</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ flexDirection: "row", gap: 24, marginTop: 8, marginBottom: 20 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={novelExclusive} onChange={(e) => setNovelExclusive(e.target.checked)} />
                독점 공개 여부
              </label>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={novelFeatured} onChange={(e) => setNovelFeatured(e.target.checked)} />
                홈페이지 추천작 노출
              </label>
            </div>

            {/* 표지 썸네일 이미지 직접 업로드 기능 */}
            <div className="form-group" style={{ background: "rgba(255,255,255,0.02)", padding: 20, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>🖼️ 소설 표지 썸네일 직접 업로드 (선택 사항)</label>
              
              <div 
                style={{ 
                  border: "2px dashed rgba(255, 255, 255, 0.1)", 
                  borderRadius: 10, 
                  padding: "30px 20px", 
                  textAlign: "center", 
                  background: "rgba(255,255,255,0.01)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  position: "relative"
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    setThumbnailFile(file);
                    setThumbnailPreview(URL.createObjectURL(file));
                  }
                }}
                onClick={() => {
                  document.getElementById("thumbnail-file-input")?.click();
                }}
                className="upload-dropzone"
              >
                <input 
                  type="file" 
                  id="thumbnail-file-input" 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setThumbnailFile(file);
                      setThumbnailPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                
                {thumbnailPreview ? (
                  <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", textAlign: "left" }}>
                    <img src={thumbnailPreview} alt="Thumbnail Preview" style={{ width: 90, height: 135, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)" }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>선택된 이미지</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4, wordBreak: "break-all" }}>{thumbnailFile?.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{((thumbnailFile?.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFile(null);
                          setThumbnailPreview("");
                        }}
                        style={{ marginTop: 8, background: "rgba(255, 59, 48, 0.2)", border: "1px solid #ff3b30", color: "#ff453a", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>이미지 파일을 드래그하여 놓거나 클릭하여 선택</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>JPEG, PNG, WEBP 등 지원 (권장 비율 2:3)</div>
                  </div>
                )}
              </div>

              {thumbnailUploading && (
                <div style={{ marginTop: 8 }}>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${thumbnailProgress}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                    <span>표지 업로드 중...</span>
                    <span>{thumbnailProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-submit">작품 생성하기</button>
          </form>
        )}

        {/* 탭 2-5: 작품 수정 */}
        {activeTab === "edit" && (
          <div className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>📝 등록된 작품 정보 수정</h2>

            {/* 작품 선택 */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">수정할 작품 선택</label>
              <select
                className="form-select"
                value={editWorkId}
                onChange={(e) => {
                  setEditWorkId(e.target.value);
                  fetchEditWork(e.target.value);
                }}
              >
                <option value="">-- 작품을 선택하세요 --</option>
                {worksList.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>

            {editLoading && (
              <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>불러오는 중...</div>
            )}

            {editWork && !editLoading && (
              <form onSubmit={handleEditSubmit}>
                {/* ID 표시 (수정 불가) */}
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label" style={{ opacity: 0.5 }}>소설 ID (변경 불가)</label>
                  <input className="form-input" value={editWork.id} disabled style={{ opacity: 0.4, cursor: "not-allowed" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">소설 제목</label>
                    <input
                      className="form-input"
                      value={editWork.title ?? ""}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">연재 상태</label>
                    <select
                      className="form-select"
                      value={editWork.status ?? "연재중"}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="연재중">연재중</option>
                      <option value="완결">완결</option>
                      <option value="준비중">준비중</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">줄거리 / 시놉시스</label>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={editWork.description ?? ""}
                    onChange={(e) => setEditWork((p: any) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">장르 태그 (subtitle)</label>
                    <input
                      className="form-input"
                      placeholder="[회귀물] [복수극] ..."
                      value={editWork.subtitle ?? ""}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, subtitle: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">무료 공개 화수</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editWork.free_episodes ?? ""}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, free_episodes: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">총 연재 예정 화수</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editWork.total_episodes ?? ""}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, total_episodes: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">배지</label>
                    <select
                      className="form-select"
                      value={editWork.badge ?? ""}
                      onChange={(e) => setEditWork((p: any) => ({ ...p, badge: e.target.value }))}
                    >
                      <option value="신작">신작</option>
                      <option value="인기">인기</option>
                      <option value="">없음</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 24, paddingTop: 28 }}>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editWork.exclusive ?? false}
                        onChange={(e) => setEditWork((p: any) => ({ ...p, exclusive: e.target.checked }))}
                      />
                      독점 공개
                    </label>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editWork.featured ?? false}
                        onChange={(e) => setEditWork((p: any) => ({ ...p, featured: e.target.checked }))}
                      />
                      홈 추천작 노출
                    </label>
                  </div>
                </div>

                {/* 썸네일 수정 */}
                <div className="form-group" style={{ background: "rgba(255,255,255,0.02)", padding: 20, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12, marginBottom: 20 }}>
                  <label className="form-label" style={{ marginBottom: 12, display: "block" }}>🖼️ 표지 썸네일 변경 (선택 사항)</label>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {/* 현재 썸네일 미리보기 */}
                    {editThumbnailPreview && (
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>현재 표지</div>
                        <img
                          src={editThumbnailPreview}
                          alt="thumbnail"
                          style={{ width: 80, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
                        className="upload-dropzone"
                        onClick={() => document.getElementById("edit-thumbnail-input")?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("image/")) {
                            setEditThumbnailFile(file);
                            setEditThumbnailPreview(URL.createObjectURL(file));
                          }
                        }}
                      >
                        <input
                          type="file"
                          id="edit-thumbnail-input"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditThumbnailFile(file);
                              setEditThumbnailPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        {editThumbnailFile ? (
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                            ✅ 새 이미지 선택됨: <strong>{editThumbnailFile.name}</strong>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditThumbnailFile(null); setEditThumbnailPreview(editWork.thumbnail || ""); }}
                              style={{ marginLeft: 10, background: "rgba(255,59,48,0.2)", border: "1px solid #ff3b30", color: "#ff453a", padding: "2px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                            >취소</button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>📤 새 이미지를 드래그하거나 클릭해서 선택</div>
                        )}
                      </div>
                      {editThumbnailUploading && (
                        <div style={{ fontSize: 12, color: "#fca834", marginTop: 8 }}>썸네일 업로드 중...</div>
                      )}
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={editSaving}>
                  {editSaving ? "저장 중..." : "✅ 변경사항 저장하기"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 탭 2: 회차 등록 & 대용량 파일 업로드 */}
        {activeTab === "episodes" && (
          <form onSubmit={handleEpisodeSubmit} className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>신규 회차(에피소드) 추가 및 업로드</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">대상 소설 작품 선택</label>
                <select className="form-select" value={selectedWorkId} onChange={(e) => setSelectedWorkId(e.target.value)}>
                  {worksList.map(w => (
                    <option key={w.id} value={w.id}>{w.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">공개 예정 일시</label>
                <input type="datetime-local" className="form-input" value={episodeReleaseDate} onChange={(e) => setEpisodeReleaseDate(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">기본 잠금 상태 설정</label>
                <select className="form-select" value={String(episodeLocked)} onChange={(e) => setEpisodeLocked(e.target.value === "true")}>
                  <option value="true">🔒 잠금 (무료화수 초과 시 포인트 필요)</option>
                  <option value="false">🔓 공개 (무료)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">오디오 음원 파일 선택 (.mp3, .m4a)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { id, title } = parseFilename(file.name);
                      setEpisodeId(id);
                      setEpisodeTitle(title);
                      setEpisodeFile(file);
                    }
                  }}
                  className="form-input"
                  style={{ padding: "8px 12px" }}
                />
              </div>
            </div>

            {episodeFile && (
              <div style={{ margin: "16px 0", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#ffe9a3" }}>ℹ️ 파일 분석 완료</span>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      등록 회차: <strong>{episodeId}화</strong> | 제목: <strong>{episodeTitle}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                      파일명: {episodeFile.name} ({((episodeFile.size) / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setEpisodeFile(null);
                      setEpisodeId("");
                      setEpisodeTitle("");
                    }}
                    style={{ background: "rgba(255, 59, 48, 0.2)", border: "1px solid #ff3b30", color: "#ff453a", padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
                  >
                    파일 제거
                  </button>
                </div>

                {uploadProgress !== null && (
                  <div style={{ marginTop: 12 }}>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                      <span>업로드 중...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={uploading} style={{ marginTop: 16 }}>
              {uploading ? "업로드 및 회차 등록 중..." : "회차 등록 및 파일 전송 시작"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
