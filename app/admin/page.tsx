// app/admin/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
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

const EMOJI_LIST = [
  { emoji: "🎁", label: "선물박스" },
  { emoji: "💰", label: "돈" },
  { emoji: "💎", label: "보석" },
  { emoji: "👑", label: "왕관" },
  { emoji: "🎉", label: "파티" },
  { emoji: "🍵", label: "찻잔" },
  { emoji: "📚", label: "책" },
  { emoji: "⚔️", label: "검" },
  { emoji: "🥋", label: "도복" },
  { emoji: "📜", label: "스크롤" },
  { emoji: "☯️", label: "태극" },
  { emoji: "🔔", label: "종" },
  { emoji: "📣", label: "확성기" },
  { emoji: "📢", label: "공지" },
  { emoji: "🔥", label: "불" },
  { emoji: "✨", label: "반짝" },
  { emoji: "🚀", label: "로켓" },
  { emoji: "⭐", label: "별" },
  { emoji: "💌", label: "편지" },
  { emoji: "💡", label: "아이디어" }
];

const EmojiPickerChips = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px", marginBottom: "12px" }}>
      {EMOJI_LIST.map(({ emoji, label }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          title={label}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
            userSelect: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
            e.currentTarget.style.borderColor = "#ff2a5f";
            e.currentTarget.style.transform = "scale(1.15)";
            e.currentTarget.style.boxShadow = "0 0 8px rgba(255, 42, 95, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // --- 입력창 Ref (이모지 삽입용) ---
  const pushTitleRef = useRef<HTMLInputElement>(null);
  const pushBodyRef = useRef<HTMLTextAreaElement>(null);
  const dailyTitleRef = useRef<HTMLInputElement>(null);
  const dailyBodyRef = useRef<HTMLTextAreaElement>(null);

  const insertEmoji = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    value: string,
    setValue: (val: string) => void,
    emoji: string
  ) => {
    const input = ref.current;
    if (!input) {
      setValue(value + emoji);
      return;
    }

    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const newValue = value.substring(0, start) + emoji + value.substring(end);
    setValue(newValue);

    setTimeout(() => {
      input.focus();
      const nextCursorPos = start + emoji.length;
      input.setSelectionRange(nextCursorPos, nextCursorPos);
    }, 10);
  };

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"novels" | "episodes" | "edit" | "push" | "automation">("novels");

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
  const [episodeLocked, setEpisodeLocked] = useState<"auto" | "free" | "locked">("auto");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  
  // 다중 파일 벌크 업로드용 큐 상태
  const [episodeQueue, setEpisodeQueue] = useState<Array<{
    id: string;
    title: string;
    file: File;
    progress: number;
    status: "idle" | "uploading" | "success" | "error";
    errorMsg?: string;
  }>>([]);
  const [isQueueUploading, setIsQueueUploading] = useState(false);

  // --- 작품 수정 상태 ---
  const [editWorkId, setEditWorkId] = useState("");
  const [editWork, setEditWork] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState("");
  const [editThumbnailUploading, setEditThumbnailUploading] = useState(false);

  // --- 웹 푸시 상태 ---
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);

  // --- 매일 자동 발송 (Vercel Cron) 설정 상태 ---
  const [dailyTitle, setDailyTitle] = useState("");
  const [dailyBody, setDailyBody] = useState("");
  const [dailyUrl, setDailyUrl] = useState("/checkin");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailySendHour, setDailySendHour] = useState(8);

  // --- 수동 푸시 발송 및 예약 관련 상태 ---
  const [pushScheduleType, setPushScheduleType] = useState<"instant" | "scheduled">("instant");
  const [pushScheduledTime, setPushScheduledTime] = useState("");

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
      .select("id, title, free_episodes")
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

  // 오디오 다중 파일 선택 처리
  const handleAudioFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { id, title } = parseFilename(file.name);
      newItems.push({
        id,
        title,
        file,
        progress: 0,
        status: "idle" as const
      });
    }

    setEpisodeQueue(prev => [...prev, ...newItems]);
    // 파일 인풋의 value 초기화 (같은 파일을 다시 올릴 수 있도록)
    e.target.value = "";
  };

  // 큐 개별 아이템 삭제
  const removeQueueItem = (index: number) => {
    setEpisodeQueue(prev => prev.filter((_, idx) => idx !== index));
  };

  // 큐 개별 아이템 필드 변경 (회차 번호 또는 제목)
  const updateQueueItem = (index: number, key: "id" | "title", value: string) => {
    setEpisodeQueue(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [key]: value };
      }
      return item;
    }));
  };

  // 개별 파일의 실제 잠금(유료/무료) 여부를 반환하는 헬퍼 함수
  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;

    // "auto"인 경우 소설 무료화수(free_episodes) 조회
    const work = worksList.find(w => w.id === selectedWorkId);
    const freeCount = work?.free_episodes ?? 10; // 기본 폴백 10

    const epNum = Number(episodeIdStr);
    if (isNaN(epNum)) {
      return true; // 숫자가 아닌 경우 유료로 안전하게 잠금
    }
    return epNum > freeCount; // 무료 화수를 초과하면 locked (true), 이하는 무료 (false)
  };

  // 회차 벌크 업로드 진행
  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !episodeReleaseDate) {
      alert("공개 예정 일시를 설정해 주세요.");
      return;
    }

    if (episodeQueue.length === 0) {
      alert("업로드할 오디오 파일을 선택해 주세요.");
      return;
    }

    // 업로드 대기중인(idle 또는 error) 아이템 확인
    const pendingItems = episodeQueue.filter(item => item.status === "idle" || item.status === "error");
    if (pendingItems.length === 0) {
      alert("업로드할 대기 중인 파일이 없습니다.");
      return;
    }

    setIsQueueUploading(true);

    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      if (!token) throw new Error("로그인 세션이 만료되었습니다.");

      // 순차적으로 업로드 진행
      for (let i = 0; i < episodeQueue.length; i++) {
        const item = episodeQueue[i];
        if (item.status === "success") continue; // 이미 성공한 파일은 스킵

        // 상태를 uploading으로 변경
        setEpisodeQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "uploading" as const, progress: 0 } : q));

        try {
          // 1. 오디오 파일 R2 업로드
          const isPureNumber = /^\d+$/.test(item.id);
          const epFolder = isPureNumber ? String(Number(item.id)).padStart(3, "0") : item.id;
          const ext = (item.file.name.split(".").pop() || "mp3").toUpperCase();
          const r2Key = `${selectedWorkId}/${epFolder}/01.${ext}`; // 항상 01 파트로 업로드

          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("key", r2Key);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/admin/direct-upload", true);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setEpisodeQueue(prev => prev.map((q, idx) => idx === i ? { ...q, progress: pct } : q));
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200) resolve();
              else reject(new Error(`R2 업로드 실패 (${xhr.status})`));
            };

            xhr.onerror = () => reject(new Error("네트워크 오류 발생"));
            xhr.send(formData);
          });

          // 2. 에피소드 DB 저장
          const epRes = await fetch("/api/admin/upsert-episode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              work_id: selectedWorkId,
              id: item.id,
              title: item.title,
              locked: getEpisodeLockedStatus(item.id),
              parts: 1,
              release_date: new Date(episodeReleaseDate).toISOString()
            })
          });

          const epData = await epRes.json();
          if (!epRes.ok) {
            throw new Error(epData.error || "에피소드 DB 저장 실패");
          }

          // 완료 업데이트
          setEpisodeQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "success" as const, progress: 100 } : q));
        } catch (itemErr: any) {
          console.error(`${item.file.name} 업로드 실패:`, itemErr);
          setEpisodeQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "error" as const, errorMsg: itemErr.message } : q));
        }
      }

      alert("🎉 모든 대기중인 회차 업로드 절차가 완료되었습니다!");
    } catch (err: any) {
      alert("업로드 처리 중 치명적 오류가 발생했습니다: " + err.message);
    } finally {
      setIsQueueUploading(false);
    }
  };

  // 웹 푸시 전체 전송 제출
  const handlePushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) {
      alert("알림 제목과 내용은 필수 입력 항목입니다.");
      return;
    }

    if (pushScheduleType === "scheduled" && !pushScheduledTime) {
      alert("예약 발송일 경우 발송 일시를 설정해야 합니다.");
      return;
    }

    setPushSending(true);
    setPushResult(null);

    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);

      if (pushScheduleType === "scheduled") {
        // 예약 발송
        const res = await fetch("/api/admin/schedule-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
            scheduled_time: new Date(pushScheduledTime).toISOString()
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "예약 푸시 등록 실패");

        alert("✅ 수동 푸시 예약이 성공적으로 등록되었습니다!");
        setPushTitle("");
        setPushBody("");
        setPushUrl("/");
        setPushScheduledTime("");
        setPushScheduleType("instant");
      } else {
        // 즉시 발송
        const res = await fetch("/api/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: pushTitle,
            body: pushBody,
            url: pushUrl
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "푸시 발송 실패");

        setPushResult(data);
        alert(`✅ 전체 회원 푸시 즉시 전송 완료!\n(전송: ${data.sentCount}건 / 성공: ${data.successCount}건 / 실패: ${data.failCount}건)`);
        setPushTitle("");
        setPushBody("");
        setPushUrl("/");
      }
    } catch (err: any) {
      alert("푸시 전송 중 에러 발생: " + err.message);
    } finally {
      setPushSending(false);
    }
  };

  // 웹 푸시 템플릿 설정 불러오기
  const fetchDailyPushSettings = async () => {
    setDailyLoading(true);
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      if (!token) return;

      const res = await fetch("/api/admin/save-push-settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setDailyTitle(data.settings.daily_title || "");
        setDailyBody(data.settings.daily_body || "");
        setDailyUrl(data.settings.daily_url || "/checkin");
        setDailySendHour(data.settings.daily_send_hour !== undefined ? data.settings.daily_send_hour : 8);
      }
    } catch (err: any) {
      console.error("자동 발송 설정 로드 실패:", err);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleDailyPushSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyTitle || !dailyBody) {
      alert("알림 제목과 내용은 필수 입력 항목입니다.");
      return;
    }

    setDailySaving(true);
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      const res = await fetch("/api/admin/save-push-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          daily_title: dailyTitle,
          daily_body: dailyBody,
          daily_url: dailyUrl,
          daily_send_hour: Number(dailySendHour)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "설정 저장 실패");

      alert("✅ 매일 자동 발송 문구 및 발송 시간 설정이 저장되었습니다!");
    } catch (err: any) {
      alert("자동 발송 설정 저장 중 에러 발생: " + err.message);
    } finally {
      setDailySaving(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === "push") {
      fetchDailyPushSettings();
    }
  }, [isAdmin, activeTab]);

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
          color-scheme: dark; /* 브라우저 기본 선택창(달력, 드롭다운 등) 다크 테마 강제 */
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #ff2a5f;
        }
        .form-select option {
          background-color: #121218;
          color: white;
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
          <button className={`admin-tab ${activeTab === "push" ? "active" : ""}`} onClick={() => setActiveTab("push")}>웹 푸시 발송</button>
          <button className={`admin-tab ${activeTab === "automation" ? "active" : ""}`} onClick={() => setActiveTab("automation")}>오디오 자동연성 & 파일합포장</button>
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
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>📚 신규 회차(에피소드) 일괄 추가 및 업로드</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
              여러 개의 오디오 파일을 한 번에 선택하여 일괄 순차 업로드할 수 있습니다. 
              파일명에서 회차 번호와 제목이 자동으로 파싱되며, 업로드 전에 직접 수정할 수 있습니다.
            </p>

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
                <label className="form-label">일괄 공개 예정 일시</label>
                <input type="datetime-local" className="form-input" value={episodeReleaseDate} onChange={(e) => setEpisodeReleaseDate(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">기본 잠금 상태 설정</label>
                <select className="form-select" value={episodeLocked} onChange={(e) => setEpisodeLocked(e.target.value as any)}>
                  <option value="auto">✨ 작품 설정에 따라 자동 지정 (무료/유료 자동 분리)</option>
                  <option value="free">🔓 전체 무료회차로 지정 (포인트 불필요)</option>
                  <option value="locked">🔒 전체 유료회차로 지정 (포인트 필요)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">오디오 음원 파일 선택 (여러 파일 선택 가능, .mp3, .m4a)</label>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  disabled={isQueueUploading}
                  onChange={handleAudioFilesChange}
                  className="form-input"
                  style={{ padding: "8px 12px" }}
                />
              </div>
            </div>

            {/* 업로드 대기열 리스트 */}
            {episodeQueue.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>📋 업로드 대기열 ({episodeQueue.length}개 파일)</span>
                  {!isQueueUploading && (
                    <button 
                      type="button" 
                      onClick={() => setEpisodeQueue([])}
                      style={{ background: "rgba(255, 59, 48, 0.15)", border: "1px solid #ff3b30", color: "#ff453a", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                    >
                      목록 비우기
                    </button>
                  )}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                  {episodeQueue.map((item, index) => {
                    const fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
                    
                    // 상태 스타일 지정
                    let statusColor = "rgba(255,255,255,0.4)";
                    let statusText = "대기 중";
                    let isProcessing = item.status === "uploading";
                    let isSuccess = item.status === "success";
                    let isError = item.status === "error";

                    if (isProcessing) {
                      statusColor = "#fca834";
                      statusText = `업로드 중 (${item.progress}%)`;
                    } else if (isSuccess) {
                      statusColor = "#34c759";
                      statusText = "완료";
                    } else if (isError) {
                      statusColor = "#ff453a";
                      statusText = "실패";
                    }

                    return (
                      <div 
                        key={index} 
                        style={{ 
                          background: "rgba(255,255,255,0.02)", 
                          border: isProcessing ? "1px solid #fca834" : isSuccess ? "1px solid rgba(52,199,89,0.3)" : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12, 
                          padding: 16, 
                          position: "relative" 
                        }}
                      >
                        {/* 상단: 상태 및 원본 파일명 */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span 
                              style={{ 
                                fontSize: 11, 
                                fontWeight: 800, 
                                background: statusColor + "1a", 
                                color: statusColor, 
                                border: `1px solid ${statusColor}`, 
                                padding: "2px 8px", 
                                borderRadius: 6 
                              }}
                            >
                              {statusText}
                            </span>
                            {/* 실제 유료/무료 분기 배지 */}
                            {(() => {
                              const actualLocked = getEpisodeLockedStatus(item.id);
                              const lockColor = actualLocked ? "#ff453a" : "#34c759";
                              const lockText = actualLocked ? "🔒 유료" : "🔓 무료";
                              return (
                                <span 
                                  style={{ 
                                    fontSize: 11, 
                                    fontWeight: 800, 
                                    background: lockColor + "1a", 
                                    color: lockColor, 
                                    border: `1px solid ${lockColor}`, 
                                    padding: "2px 8px", 
                                    borderRadius: 6 
                                  }}
                                >
                                  {lockText}
                                </span>
                              );
                            })()}
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", wordBreak: "break-all" }}>
                              {item.file.name} ({fileSizeMB} MB)
                            </span>
                          </div>
                          {!isQueueUploading && !isSuccess && (
                            <button
                              type="button"
                              onClick={() => removeQueueItem(index)}
                              style={{ background: "none", border: "none", color: "#ff453a", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
                            >
                              제거
                            </button>
                          )}
                        </div>

                        {/* 중단: 파싱된 데이터 편집 폼 */}
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>회차 번호</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "6px 10px", fontSize: 13 }} 
                              value={item.id} 
                              disabled={isQueueUploading || isSuccess}
                              onChange={(e) => updateQueueItem(index, "id", e.target.value)}
                              required 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>회차 제목</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "6px 10px", fontSize: 13 }} 
                              value={item.title} 
                              disabled={isQueueUploading || isSuccess}
                              onChange={(e) => updateQueueItem(index, "title", e.target.value)}
                              required 
                            />
                          </div>
                        </div>

                        {/* 업로드 진행 상태 바 */}
                        {isProcessing && (
                          <div style={{ marginTop: 12 }}>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${item.progress}%`, background: "#fca834" }} />
                            </div>
                          </div>
                        )}

                        {/* 실패 시 에러 문구 */}
                        {isError && item.errorMsg && (
                          <div style={{ fontSize: 11, color: "#ff453a", marginTop: 8, background: "rgba(255,69,58,0.08)", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,69,58,0.2)" }}>
                            ⚠️ {item.errorMsg}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={isQueueUploading || episodeQueue.length === 0} 
              style={{ marginTop: 24 }}
            >
              {isQueueUploading 
                ? "🚀 일괄 오디오 파일 순차 업로드 중..." 
                : `회차 일괄 등록 및 파일 전송 시작 (${episodeQueue.length}개 파일)`
              }
            </button>
          </form>
        )}

        {/* 탭 4: 웹 푸시 알림 발송 */}
        {activeTab === "push" && (
          <>
            <form onSubmit={handlePushSubmit} className="card-panel">
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>📢 전체 유저 대상 수동 웹 푸시 발송 및 예약</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
                푸시 알림 수신을 허용한 모든 회원(브라우저) 기기 화면에 실시간 알림 팝업을 즉시 보내거나 특정 일시에 예약 전송합니다.
              </p>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">발송 방식 선택</label>
                <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                    <input 
                      type="radio" 
                      name="pushScheduleType" 
                      value="instant" 
                      checked={pushScheduleType === "instant"} 
                      onChange={() => setPushScheduleType("instant")} 
                    />
                    즉시 발송
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                    <input 
                      type="radio" 
                      name="pushScheduleType" 
                      value="scheduled" 
                      checked={pushScheduleType === "scheduled"} 
                      onChange={() => setPushScheduleType("scheduled")} 
                    />
                    예약 발송
                  </label>
                </div>
              </div>

              {pushScheduleType === "scheduled" && (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">예약 발송 일시 설정 (KST)</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={pushScheduledTime} 
                    onChange={(e) => setPushScheduledTime(e.target.value)} 
                    required 
                  />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    * 매 정각마다 동작하는 백엔드 크론(Cron) 스케줄러가 해당 예약 시간을 확인하여 자동 전송합니다.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">알림 제목</label>
                <input 
                  ref={pushTitleRef}
                  type="text" 
                  className="form-input" 
                  placeholder="[무림북] 신작 독점 공개!" 
                  value={pushTitle} 
                  onChange={(e) => setPushTitle(e.target.value)} 
                  required 
                />
                <EmojiPickerChips onSelect={(emoji) => insertEmoji(pushTitleRef, pushTitle, setPushTitle, emoji)} />
              </div>

              <div className="form-group">
                <label className="form-label">알림 상세 내용</label>
                <textarea 
                  ref={pushBodyRef}
                  className="form-textarea" 
                  rows={3} 
                  placeholder="천무진: 봉인된 천재의 오디오 신규 회차가 지금 업로드되었습니다. 지금 들어보세요!" 
                  value={pushBody} 
                  onChange={(e) => setPushBody(e.target.value)} 
                  required 
                />
                <EmojiPickerChips onSelect={(emoji) => insertEmoji(pushBodyRef, pushBody, setPushBody, emoji)} />
              </div>

              <div className="form-group">
                <label className="form-label">클릭 시 이동할 링크 주소 (선택)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="/checkin" 
                  value={pushUrl} 
                  onChange={(e) => setPushUrl(e.target.value)} 
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                  * 기본값은 메인 화면(/)입니다. 출석체크 알림인 경우 /checkin 을 적어주시면 됩니다.
                </span>
              </div>

              {pushResult && (
                <div style={{ margin: "16px 0", background: "rgba(76,217,100,0.1)", border: "1px solid #34c759", borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 850, color: "#34c759", marginBottom: 4 }}>✅ 전송 성공!</div>
                  <div>총 시도: <strong>{pushResult.sentCount}건</strong></div>
                  <div>발송 완료: <strong>{pushResult.successCount}건</strong> | 실패(연결 종료): <strong>{pushResult.failCount}건</strong></div>
                  {pushResult.cleanedCount > 0 && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>* 만료된 브라우저 구독 정보 {pushResult.cleanedCount}개가 DB에서 자동 정리되었습니다.</div>}
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={pushSending} style={{ marginTop: 8 }}>
                {pushSending 
                  ? "작업 처리 중..." 
                  : pushScheduleType === "scheduled" 
                    ? "지정한 일시에 예약 전송 설정하기" 
                    : "전체 회원에게 푸시 알림 즉시 발송하기"
                }
              </button>
            </form>

            <form onSubmit={handleDailyPushSave} className="card-panel" style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>⏰ 매일 자동 발송 웹 푸시 문구 및 시간 설정 (상시 발송)</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
                Vercel Cron 작업을 통해 매일 지정한 시간대(KST 기준 정각)에 수신 동의한 모든 유저에게 자동 전송되는 출석/일일보상 푸시 문구를 편집합니다.
              </p>

              {dailyLoading ? (
                <div style={{ textAlign: "center", padding: 20, opacity: 0.6, fontSize: 14 }}>설정을 불러오는 중...</div>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">매일 자동 발송 시간 선택 (KST 기준 정각)</label>
                    <select 
                      className="form-select" 
                      value={dailySendHour} 
                      onChange={(e) => setDailySendHour(Number(e.target.value))}
                      style={{ maxWidth: 260 }}
                    >
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const ampm = hour < 12 ? "오전" : "오후";
                        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                        return (
                          <option key={hour} value={hour}>
                            {`${ampm} ${displayHour}시 (${hour}:00)`}
                          </option>
                        );
                      })}
                    </select>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      * 1시간 간격으로 도는 크론 스케줄러가 여기 설정된 시간대와 일치할 때 자동으로 알림을 발송합니다.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">자동 발송 알림 제목</label>
                    <input 
                      ref={dailyTitleRef}
                      type="text" 
                      className="form-input" 
                      placeholder="🎁 [무림북] 오늘의 출석 보상 도착!" 
                      value={dailyTitle} 
                      onChange={(e) => setDailyTitle(e.target.value)} 
                      required 
                    />
                    <EmojiPickerChips onSelect={(emoji) => insertEmoji(dailyTitleRef, dailyTitle, setDailyTitle, emoji)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">자동 발송 알림 상세 내용</label>
                    <textarea 
                      ref={dailyBodyRef}
                      className="form-textarea" 
                      rows={3} 
                      placeholder="잊지 말고 일일 문안인사와 출석체크를 완료하고 무료 10코인을 받아가세요! 🍵" 
                      value={dailyBody} 
                      onChange={(e) => setDailyBody(e.target.value)} 
                      required 
                    />
                    <EmojiPickerChips onSelect={(emoji) => insertEmoji(dailyBodyRef, dailyBody, setDailyBody, emoji)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">자동 발송 클릭 시 이동할 링크 주소 (선택)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="/checkin" 
                      value={dailyUrl} 
                      onChange={(e) => setDailyUrl(e.target.value)} 
                    />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      * 기본값은 출석체크 화면(/checkin)입니다.
                    </span>
                  </div>

                  <button type="submit" className="btn-submit" disabled={dailySaving} style={{ marginTop: 8 }}>
                    {dailySaving ? "자동 발송 설정 저장 중..." : "매일 자동 발송 설정 저장하기"}
                  </button>
                </>
              )}
            </form>
          </>
        )}

        {/* 탭 5: 오디오 자동 연성 및 파일 합포장 */}
        {activeTab === "automation" && (
          <AutomationPanel worksList={worksList} />
        )}
      </div>
    </main>
  );
}

function AutomationPanel({ worksList }: { worksList: any[] }) {
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);

  // TTS states
  const [selectedWorkId, setSelectedWorkId] = useState(worksList[0]?.id || "");
  const [episodeId, setEpisodeId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState<"auto" | "free" | "locked">("auto");
  const [textInput, setTextInput] = useState("");
  const [txtFiles, setTxtFiles] = useState<File[]>([]);

  const [voice, setVoice] = useState("ko-KR-InJoonNeural");
  const [preset, setPreset] = useState("karisma");
  const [pitch, setPitch] = useState("-6Hz");
  const [rate, setRate] = useState("-6%");

  const [customPitchVal, setCustomPitchVal] = useState(0);
  const [customRateVal, setCustomRateVal] = useState(0);

  const [previewText, setPreviewText] = useState("안녕하세요! 이 목소리로 무림북 오디오북이 제작됩니다. 들어보시고 음높이와 속도를 맞춰보세요.");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [ttsStatus, setTtsStatus] = useState<"idle" | "tts" | "upload" | "db" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    if (presetName === "karisma") {
      setVoice("ko-KR-InJoonNeural");
      setPitch("-6Hz");
      setRate("-6%");
    } else if (presetName === "oe-yu") {
      setVoice("ko-KR-HyunsuNeural");
      setPitch("-3Hz");
      setRate("-3%");
    } else if (presetName === "cave") {
      setVoice("ko-KR-InJoonNeural");
      setPitch("-4Hz");
      setRate("-5%");
    } else if (presetName === "romance") {
      setVoice("ko-KR-HyunsuNeural");
      setPitch("+1Hz");
      setRate("+0%");
    } else if (presetName === "modern-fantasy") {
      setVoice("ko-KR-HyunsuNeural");
      setPitch("-1Hz");
      setRate("+8%");
    }
  };

  const handleCustomPitchChange = (val: number) => {
    setCustomPitchVal(val);
    const sign = val >= 0 ? "+" : "";
    setPitch(`${sign}${val}Hz`);
  };

  const handleCustomRateChange = (val: number) => {
    setCustomRateVal(val);
    const sign = val >= 0 ? "+" : "";
    setRate(`${sign}${val}%`);
  };

  // 텍스트 파일 로드 처리
  const handleTxtFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 자연 정렬을 이용하여 파일명을 순서대로 정렬 (예: 1화, 2화, 10화 순서)
      const fileList = Array.from(files).sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      setTxtFiles(fileList);

      // 모든 파일의 텍스트를 순서대로 읽고 합칩니다.
      const contentsArray = [];
      for (const file of fileList) {
        const text = await file.text();
        contentsArray.push(text);
      }
      setTextInput(contentsArray.join("\n\n"));

      // 파일이 한 개일 때만 자동으로 제목과 화수 파싱
      if (fileList.length === 1) {
        const file = fileList[0];
        const base = file.name.replace(/\.[^/.]+$/, "");
        const match = base.trim().match(/^(\d+)(?:화)?[\s\-_.]+(.+)$/);
        if (match) {
          setEpisodeId(String(Number(match[1])));
          setEpisodeTitle(match[2].trim());
        } else {
          const onlyNumMatch = base.trim().match(/^(\d+)(?:화)?$/);
          if (onlyNumMatch) {
            setEpisodeId(String(Number(onlyNumMatch[1])));
            setEpisodeTitle(`${Number(onlyNumMatch[1])}화`);
          } else {
            setEpisodeTitle(base.trim());
          }
        }
      } else {
        setEpisodeTitle("");
        setEpisodeId("");
      }
    }
  };

  // 파일 합포장 (Merge) 실행
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeFiles.length === 0) {
      alert("합포장할 텍스트 파일들을 선택해 주세요.");
      return;
    }
    setMerging(true);
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      const formData = new FormData();
      for (const file of mergeFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/admin/merge-chapters", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "파일 합본 생성 실패");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "전체_합본_소설.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      alert("✨ 합포장이 완료되어 다운로드되었습니다!");
      setMergeFiles([]);
    } catch (err: any) {
      alert("합포장 중 오류 발생: " + err.message);
    } finally {
      setMerging(false);
    }
  };

  // 목소리 미리듣기 재생
  const handlePlayPreview = async () => {
    if (!previewText.trim()) return;
    
    if (previewAudio) {
      if (isPreviewPlaying) {
        previewAudio.pause();
        setIsPreviewPlaying(false);
        return;
      } else {
        previewAudio.play();
        setIsPreviewPlaying(true);
        return;
      }
    }

    setPreviewLoading(true);
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: previewText,
          voice,
          pitch,
          rate,
          preview: true
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "미리듣기 음성 생성 실패");
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
      
      setPreviewAudio(audio);
      audio.play();
      setIsPreviewPlaying(true);
    } catch (err: any) {
      alert("미리듣기 실패: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 미리듣기 톤 설정 변경 시 캐시 비우기
  useEffect(() => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
    }
  }, [voice, pitch, rate, previewText]);

  // 에피소드 잠금 상태 자동 획득
  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;
    const work = worksList.find(w => w.id === selectedWorkId);
    const freeCount = work?.free_episodes ?? 10;
    const epNum = Number(episodeIdStr);
    return isNaN(epNum) ? true : epNum > freeCount;
  };

  // TTS 오디오 자동 연성 및 홈페이지 즉시 반영
  const handleTtsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !episodeId || !episodeTitle || !episodeReleaseDate) {
      alert("모든 메타데이터 항목을 입력해 주세요.");
      return;
    }
    if (!textInput.trim()) {
      alert("회차 본문 텍스트를 입력하거나 텍스트 파일을 첨부해 주세요.");
      return;
    }

    setTtsStatus("tts");
    setErrorMsg("");

    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: textInput,
          voice,
          pitch,
          rate,
          preview: false,
          workId: selectedWorkId,
          episodeId,
          title: episodeTitle,
          locked: getEpisodeLockedStatus(episodeId),
          releaseDate: episodeReleaseDate
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "오디오 생성/등록 실패");
      }

      setTtsStatus("success");
      alert(`🎉 [연성 완료] ${episodeTitle} 오디오가 R2에 업로드되고 홈페이지에 즉시 반영되었습니다!`);
      
      // 폼 초기화
      setEpisodeId("");
      setEpisodeTitle("");
      setTextInput("");
      setTxtFile(null);
    } catch (err: any) {
      console.error(err);
      setTtsStatus("error");
      setErrorMsg(err.message);
    }
  };

  // 작품 선택 기본값 설정
  useEffect(() => {
    if (worksList.length > 0 && !selectedWorkId) {
      setSelectedWorkId(worksList[0].id);
    }
  }, [worksList, selectedWorkId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. 텍스트 파일 합본기 */}
      <form onSubmit={handleMergeSubmit} className="card-panel">
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>📝 텍스트 파일 합포장기 (TXT Merger)</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.5 }}>
          50개 등 다수의 텍스트 파일(.txt)을 선택하면 파일 이름순으로 정렬하여 하나의 전체 합본 메모장 파일로 생성 및 다운로드합니다.
        </p>
        
        <div className="form-group">
          <label className="form-label">합포장할 텍스트 파일 선택 (다중 파일 선택 가능)</label>
          <input 
            type="file" 
            accept=".txt" 
            multiple 
            disabled={merging}
            onChange={(e) => {
              const files = e.target.files;
              if (files) setMergeFiles(Array.from(files));
            }}
            className="form-input"
          />
        </div>

        {mergeFiles.length > 0 && (
          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>선택된 파일 목록 ({mergeFiles.length}개)</div>
            <div style={{ maxHeight: 150, overflowY: "auto", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {[...mergeFiles].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((f, i) => (
                <div key={i} style={{ fontSize: 12, opacity: 0.7 }}>{i + 1}. {f.name}</div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn-submit" disabled={merging || mergeFiles.length === 0}>
          {merging ? "🔄 파일 정렬 및 합본 합포장 중..." : `50개 회차 메모장 합본 생성 및 다운로드 (${mergeFiles.length}개)`}
        </button>
      </form>

      {/* 2. TTS 오디오 자동 연성기 */}
      <form onSubmit={handleTtsSubmit} className="card-panel">
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>🎙️ TTS 오디오 자동 연성기 (edge-tts)</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.5 }}>
          소설 텍스트 파일을 첨부하거나 입력하면 목소리를 입혀 mp3 파일로 제작하고, Cloudflare R2에 업로드한 뒤 홈페이지에 즉시 새 회차로 반영합니다.
        </p>

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">회차 번호 (숫자)</label>
            <input type="text" className="form-input" placeholder="1" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">회차 제목</label>
            <input type="text" className="form-input" placeholder="1화: 강호에 피는 꽃" value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">잠금 상태 설정</label>
            <select className="form-select" value={episodeLocked} onChange={(e) => setEpisodeLocked(e.target.value as any)}>
              <option value="auto">작품 설정에 따라 자동 무료/유료 분리</option>
              <option value="free">🔓 전체 무료회차로 지정</option>
              <option value="locked">🔒 전체 유료회차로 지정</option>
            </select>
          </div>
        </div>

        {/* 목소리 톤 프리셋 설정 */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: 18, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔊 성우 및 목소리 톤 프리셋</div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {[
              { id: "karisma", label: "🗡️ 카리스마 무협 (인준, 동굴음)" },
              { id: "oe-yu", label: "🦉 외유내강 (현수, 고결함)" },
              { id: "cave", label: "🌲 진중 판타지 (인준, 느림)" },
              { id: "romance", label: "🌸 로맨스 남주 (현수, 부드러움)" },
              { id: "modern-fantasy", label: "⚡ 현대 판타지 (현수, 지루함없음)" },
              { id: "custom", label: "⚙️ 사용자 직접 조절" }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: preset === p.id ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)" : "rgba(255,255,255,0.05)",
                  border: preset === p.id ? "1px solid #ff2a5f" : "1px solid rgba(255,255,255,0.12)",
                  color: preset === p.id ? "white" : "rgba(255,255,255,0.7)",
                  transition: "all 0.15s"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">AI 성우 선택</label>
              <select className="form-select" value={voice} onChange={(e) => { setVoice(e.target.value); setPreset("custom"); }} disabled={preset !== "custom"}>
                <option value="ko-KR-InJoonNeural">Standard InJoon (인준 - 차분함, 신뢰감)</option>
                <option value="ko-KR-HyunsuNeural">Standard Hyunsu (현수 - 부드러움, 중저음)</option>
              </select>
            </div>
            
            <div style={{ display: "flex", gap: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">음높이 (Pitch): {pitch}</label>
                <input 
                  type="range" 
                  min="-15" 
                  max="15" 
                  value={preset === "custom" ? customPitchVal : parseInt(pitch) || 0} 
                  disabled={preset !== "custom"}
                  onChange={(e) => handleCustomPitchChange(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 11, opacity: 0.5 }}>-15Hz (동굴음) ~ +15Hz (하이톤)</span>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">속도 (Rate): {rate}</label>
                <input 
                  type="range" 
                  min="-30" 
                  max="30" 
                  value={preset === "custom" ? customRateVal : parseInt(rate) || 0} 
                  disabled={preset !== "custom"}
                  onChange={(e) => handleCustomRateChange(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 11, opacity: 0.5 }}>-30% (천천히) ~ +30% (빠르게)</span>
              </div>
            </div>
          </div>

          {/* 목소리 미리듣기 테스트 */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12, opacity: 0.8 }}>미리듣기 테스트 문장</label>
              <input 
                type="text" 
                className="form-input" 
                value={previewText} 
                onChange={(e) => setPreviewText(e.target.value)} 
                style={{ fontSize: 13, height: 36, padding: "0 10px" }}
              />
            </div>
            <button
              type="button"
              onClick={handlePlayPreview}
              disabled={previewLoading}
              style={{
                height: 36,
                padding: "0 18px",
                borderRadius: "8px",
                border: "none",
                background: isPreviewPlaying ? "#ff3b30" : "#ffd700",
                color: isPreviewPlaying ? "white" : "#2b1d00",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {previewLoading ? "🔊 생성 중..." : isPreviewPlaying ? "⏹️ 정지" : "🎧 톤 미리듣기"}
            </button>
          </div>
        </div>

        {/* 텍스트 파일 입력 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">소설 본문 텍스트 파일 (.txt) 업로드</label>
            <input 
              type="file" 
              accept=".txt" 
              multiple
              onChange={handleTxtFileChange}
              className="form-input"
            />
            <span style={{ fontSize: 11, opacity: 0.5 }}>* 파일 여러 개를 선택하면 자동으로 내용이 순서대로 합쳐집니다.</span>
          </div>
          {txtFiles.length > 0 && (
            <div style={{ alignSelf: "center", fontSize: 13, color: "#34c759", fontWeight: 700 }}>
              ✅ {txtFiles.length}개 파일 로드 완료 (총 {(txtFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB)
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "normal", marginTop: 4, maxHeight: 80, overflowY: "auto" }}>
                {txtFiles.map((f, i) => (
                  <div key={i}>- {f.name}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">본문 텍스트 직접 입력/수정 (본문 {textInput.length}글자)</label>
          <textarea
            className="form-textarea"
            rows={10}
            placeholder="소설의 본문을 입력해 주세요. 위의 파일 업로드를 사용해 텍스트 파일을 불러오셔도 됩니다."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
        </div>

        {ttsStatus !== "idle" && (
          <div style={{ 
            background: ttsStatus === "success" ? "rgba(52,199,89,0.1)" : ttsStatus === "error" ? "rgba(255,59,48,0.1)" : "rgba(252,168,52,0.1)",
            border: `1px solid ${ttsStatus === "success" ? "#34c759" : ttsStatus === "error" ? "#ff3b30" : "#fca834"}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 800, color: ttsStatus === "success" ? "#34c759" : ttsStatus === "error" ? "#ff3b30" : "#fca834" }}>
              {ttsStatus === "tts" && "🎙️ AI 성우가 소설을 낭독하는 중입니다 (오디오 파일 굽는 중)..."}
              {ttsStatus === "upload" && "☁️ 생성된 오디오 파일을 Cloudflare R2 스토리지에 업로드하는 중..."}
              {ttsStatus === "db" && "💾 데이터베이스에 에피소드를 등록 및 노출하는 중..."}
              {ttsStatus === "success" && "🎉 [완료] 오디오가 정상적으로 연성 및 업로드되어 홈페이지에 즉시 발행되었습니다!"}
              {ttsStatus === "error" && `❌ 연성 에러 발생: ${errorMsg}`}
            </div>
            {ttsStatus !== "success" && ttsStatus !== "error" && (
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>* 브루(Vrew) 작업과 파일 R2 수동 업로드, DB 등록 작업이 백그라운드에서 한 번에 묶여 동작합니다.</div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          className="btn-submit" 
          disabled={ttsStatus === "tts" || ttsStatus === "upload" || ttsStatus === "db"}
        >
          {ttsStatus === "tts" || ttsStatus === "upload" || ttsStatus === "db"
            ? "🔄 오디오 연성 및 자동 퍼블리싱 진행 중..."
            : `🚀 오디오 자동 연성 및 홈페이지 반영 시작`
          }
        </button>
      </form>
    </div>
  );
}
