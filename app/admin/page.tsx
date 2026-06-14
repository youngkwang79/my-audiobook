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
  const base = filename.substring(0, filename.lastIndexOf(".")) || filename;

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
  { emoji: "💡", label: "아이디어" },
];

const EmojiPickerChips = ({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        marginTop: "6px",
        marginBottom: "12px",
      }}
    >
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
            userSelect: "none",
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

// 한글 제목을 영문 고유 ID(Slug)로 변환하는 함수
function romanizeHangeul(text: string): string {
  const choMap = [
    "g",
    "kk",
    "n",
    "d",
    "tt",
    "r",
    "m",
    "b",
    "pp",
    "s",
    "ss",
    "",
    "j",
    "jj",
    "ch",
    "k",
    "t",
    "p",
    "h",
  ];
  const jungMap = [
    "a",
    "ae",
    "ya",
    "yae",
    "eo",
    "e",
    "ye",
    "ye",
    "o",
    "wa",
    "wae",
    "oe",
    "yo",
    "u",
    "wo",
    "we",
    "wi",
    "yu",
    "eu",
    "ui",
    "i",
  ];
  const jongMap = [
    "",
    "g",
    "kk",
    "gs",
    "n",
    "nj",
    "nh",
    "d",
    "l",
    "lg",
    "lm",
    "lb",
    "ls",
    "lt",
    "lp",
    "lh",
    "m",
    "b",
    "bs",
    "s",
    "ss",
    "ng",
    "j",
    "ch",
    "k",
    "t",
    "p",
    "h",
  ];

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = Math.floor(offset / 21 / 28);
      const jung = Math.floor((offset % (21 * 28)) / 28);
      const jong = offset % 28;
      result += choMap[cho] + jungMap[jung] + jongMap[jong];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result.replace(/[^a-z0-9]/g, "").slice(0, 30);
}

// 괄호 안에 한자가 들어간 패턴 (반각 및 전각 괄호 포함) 자동 제거 함수
// 예: 무림(武林) -> 무림
function cleanHanja(text: string): string {
  const hanjaInParenthesesRegex =
    /\([^\)]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+[^\)]*\)/g;
  const hanjaInParenthesesFullWidthRegex =
    /（[^）]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+[^）]*）/g;
  return text
    .replace(hanjaInParenthesesRegex, "")
    .replace(hanjaInParenthesesFullWidthRegex, "");
}

// AI로 생성된 썸네일 이미지 위에 한글 제목과 장르/태그 오버레이하는 함수
async function drawTitleOnThumbnail(
  imageUrl: string,
  title: string,
  subtitle: string,
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    // 1. 구글 폰트 로딩 대기
    try {
      if (typeof window !== "undefined" && (document as any).fonts) {
        await (document as any).fonts.ready;
      }
    } catch (e) {
      console.warn("Fonts ready promise failed:", e);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = img.naturalWidth || 768;
        const height = img.naturalHeight || 1024;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }

        // 베이스 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // 하단 부드러운 검은색 그라데이션 오버레이 (영화 포스터 스타일, 시인성 확보)
        const bottomGradient = ctx.createLinearGradient(
          0,
          height * 0.6,
          0,
          height,
        );
        bottomGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        bottomGradient.addColorStop(0.35, "rgba(0, 0, 0, 0.55)");
        bottomGradient.addColorStop(0.7, "rgba(0, 0, 0, 0.85)");
        bottomGradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const titleFontFamily =
          "'Noto Serif KR', 'Nanum Myeongjo', 'Batang', 'Georgia', serif";

        // 제목 및 부제목 파싱 (중요도에 따라 글씨 크기를 조절하기 위한 분할)
        let mainTitle = title.trim();
        let subTitleText = "";

        // 괄호 한자 제거 (예: 웅혼(雄魂) -> 웅혼)
        mainTitle = cleanHanja(mainTitle);

        // 구분자(: 또는 -) 기준 분할
        const separators = [":", "-", "–", "—"];
        let splitIndex = -1;
        for (const sep of separators) {
          const idx = mainTitle.indexOf(sep);
          if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
            splitIndex = idx;
          }
        }

        if (splitIndex !== -1) {
          subTitleText = mainTitle.substring(splitIndex + 1).trim();
          mainTitle = mainTitle.substring(0, splitIndex).trim();
        } else {
          // 구분자가 없으나 띄어쓰기가 있고 7자 이상인 경우 똑똑하게 1차 분할
          const words = mainTitle.split(/\s+/);
          if (words.length >= 3) {
            // 예: "개방의 봉황 맹을 바로 세우다!" -> "개방의 봉황" / "맹을 바로 세우다!"
            mainTitle = words.slice(0, 2).join(" ");
            subTitleText = words.slice(2).join(" ");
          } else if (words.length === 2) {
            // 예: "멸사귀림 초무영" -> "멸사귀림" / "초무영"
            mainTitle = words[0];
            subTitleText = words[1];
          }
        }

        // 글씨 크기 동적 결정 (60대 시니어도 가독할 수 있도록 최대한 크게)
        // 메인 타이틀 크기 결정 (가로폭의 95% 범위 내 최대화, 한계치 22%)
        let mainFontSize = Math.floor(
          Math.min((width * 0.95) / mainTitle.length, width * 0.22),
        );
        if (mainFontSize < 60) mainFontSize = 60; // 최소 크기 보장 크게 조정

        if (subTitleText) {
          // 부제목 크기 결정 (가로폭 95% 범위 내 최대화, 한계치 8%)
          let subFontSize = Math.floor(
            Math.min((width * 0.95) / subTitleText.length, width * 0.08),
          );
          if (subFontSize < 30) subFontSize = 30; // 최소 크기 보장 크게 조정

          const mainY = height * 0.79;
          const subY = height * 0.89;

          // --- 메인 제목 그리기 ---
          ctx.font = `900 ${mainFontSize}px ${titleFontFamily}`;

          // 메인 그라데이션 브러시
          const mainGradient = ctx.createLinearGradient(
            0,
            mainY - mainFontSize * 0.6,
            0,
            mainY + mainFontSize * 0.6,
          );
          mainGradient.addColorStop(0, "#ffffff"); // 맨 위는 흰색 광택
          mainGradient.addColorStop(0.25, "#fce881"); // 밝은 골드
          mainGradient.addColorStop(0.7, "#cba135"); // 중후한 골드
          mainGradient.addColorStop(1, "#846014"); // 어두운 베이스 골드

          // 그림자 및 외곽선 효과 적용
          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 5;

          ctx.lineWidth = mainFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.lineWidth = mainFontSize * 0.05;
          ctx.strokeStyle = "#1a1100";
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.fillStyle = mainGradient;
          ctx.fillText(mainTitle, width / 2, mainY);

          // --- 부제목 그리기 ---
          ctx.font = `bold ${subFontSize}px ${titleFontFamily}`;

          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 3;

          ctx.lineWidth = subFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(subTitleText, width / 2, subY);

          ctx.fillStyle = "#ffe285"; // 부드러운 골드 옐로우
          ctx.fillText(subTitleText, width / 2, subY);
        } else {
          // 부제목이 없는 경우: 단일 제목 배치
          const mainY = height * 0.84;

          ctx.font = `900 ${mainFontSize}px ${titleFontFamily}`;

          const mainGradient = ctx.createLinearGradient(
            0,
            mainY - mainFontSize * 0.6,
            0,
            mainY + mainFontSize * 0.6,
          );
          mainGradient.addColorStop(0, "#ffffff");
          mainGradient.addColorStop(0.25, "#fce881");
          mainGradient.addColorStop(0.7, "#cba135");
          mainGradient.addColorStop(1, "#846014");

          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 5;

          ctx.lineWidth = mainFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.lineWidth = mainFontSize * 0.05;
          ctx.strokeStyle = "#1a1100";
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.fillStyle = mainGradient;
          ctx.fillText(mainTitle, width / 2, mainY);
        }

        // Blob 파일로 변환 저장
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas to Blob conversion failed."));
          }
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(
        new Error("Failed to load generated base thumbnail image: " + err),
      );
    };
  });
}

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
    emoji: string,
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
  const [activeTab, setActiveTab] = useState<
    "novels" | "episodes" | "edit" | "push" | "automation"
  >("novels");

  // --- 소설 등록 상태 ---
  const [novelId, setNovelId] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [novelDesc, setNovelDesc] = useState("");
  const [novelStatus, setNovelStatus] = useState<"연재중" | "완결" | "준비중">(
    "완결",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 선택형 장르 태그
  const [novelBadge, setNovelBadge] = useState("신작");
  const [novelExclusive, setNovelExclusive] = useState(true);
  const [novelFeatured, setNovelFeatured] = useState(true);
  const [novelIsMembershipOnly, setNovelIsMembershipOnly] = useState(false);
  const [novelThumbnail, setNovelThumbnail] = useState("");
  const [freeEpisodes, setFreeEpisodes] = useState<number | "">(10);
  const [totalEpisodes, setTotalEpisodes] = useState<number | "">(50);

  const [episodeIsMembershipOnly, setEpisodeIsMembershipOnly] = useState(false);

  // 썸네일 직접 업로드 상태
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  // AI 썸네일 자동 생성 상태 및 함수
  const [generatingAiThumbnail, setGeneratingAiThumbnail] = useState(false);

  const handleGenerateAiThumbnail = async (
    id: string,
    title: string,
    desc: string,
    isEdit: boolean,
  ) => {
    if (!id || !title) {
      alert(
        "소설 고유 ID와 제목을 먼저 입력해 주세요. 이를 기반으로 이미지가 생성됩니다.",
      );
      return;
    }

    setGeneratingAiThumbnail(true);
    let defaultPrompt = `${title} 소설 책 표지 일러스트, 동양 무협 판타지 스타일, 극화, 고화질`;

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      // 1. Gemini를 통해 제목과 줄거리를 분석한 고화질 영문 프롬프트 자동 생성 요청
      try {
        const promptGenRes = await fetch("/api/admin/generate-prompt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, description: desc }),
        });
        if (promptGenRes.ok) {
          const promptData = await promptGenRes.json();
          if (promptData.prompt) {
            defaultPrompt = promptData.prompt;
          }
        }
      } catch (geminiErr) {
        console.error(
          "Gemini prompt generation failed, falling back to default:",
          geminiErr,
        );
      }

      setGeneratingAiThumbnail(false); // prompt 대화상자는 브라우저 블로킹을 발생시키므로 로딩창 임시 해제

      const promptValue = prompt(
        "AI 표지 생성을 위한 지시어(영문 또는 한글)를 입력하세요.\n입력하지 않으면 분석된 정보(제목+줄거리)를 바탕으로 생성됩니다.",
        defaultPrompt,
      );
      if (promptValue === null) return; // 취소

      setGeneratingAiThumbnail(true);

      const res = await fetch("/api/admin/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          novelId: id,
          prompt: promptValue || defaultPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 이미지 생성 실패");

      // --- 한글 제목 & 태그 오버레이 작업 추가 ---
      try {
        const subtitleVal = isEdit
          ? editWork?.subtitle || ""
          : selectedTags.join(" ");

        // 1. 캔버스를 통해 이미지 로드 후 한글 제목 그리기
        const textOverlayBlob = await drawTitleOnThumbnail(
          data.thumbnailUrl,
          title,
          subtitleVal,
        );

        // 2. 오버레이된 이미지를 다시 direct-upload API를 통해 동일 경로(로컬 + R2)에 덮어쓰기 업로드
        const r2Key = data.thumbnailUrl.startsWith("/")
          ? data.thumbnailUrl.substring(1)
          : data.thumbnailUrl;

        const uploadFormData = new FormData();
        const fileName = r2Key.split("/").pop() || `${id}_${Date.now()}.png`;
        uploadFormData.append("file", textOverlayBlob, fileName);
        uploadFormData.append("key", r2Key);

        const uploadRes = await fetch("/api/admin/direct-upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadErr.error || "한글 제목 이미지 업로드 실패");
        }
      } catch (overlayErr: any) {
        console.error(
          "한글 제목 오버레이 적용 실패 (일반 이미지로 유지됨):",
          overlayErr,
        );
        alert(
          "⚠️ 한글 제목 오버레이 적용 중 오류가 발생했습니다. 원본 이미지로 설정됩니다.\n오류: " +
            overlayErr.message,
        );
      }

      alert("✨ AI 썸네일 생성 및 한글 제목 오버레이 업로드가 완료되었습니다!");
      if (isEdit) {
        setEditWork((p: any) => ({ ...p, thumbnail: data.thumbnailUrl }));
        setEditThumbnailPreview(data.thumbnailUrl);
      } else {
        setNovelThumbnail(data.thumbnailUrl);
        setThumbnailPreview(data.thumbnailUrl);
      }
    } catch (err: any) {
      alert("AI 썸네일 생성 실패: " + err.message);
    } finally {
      setGeneratingAiThumbnail(false);
    }
  };

  // --- 회차 등록 상태 ---
  const [worksList, setWorksList] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState<
    "auto" | "free" | "locked"
  >("auto");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");

  // 다중 파일 벌크 업로드용 큐 상태
  const [episodeQueue, setEpisodeQueue] = useState<
    Array<{
      id: string;
      title: string;
      file: File;
      progress: number;
      status: "idle" | "uploading" | "success" | "error";
      errorMsg?: string;
      is_membership_only?: boolean;
    }>
  >([]);
  const [isQueueUploading, setIsQueueUploading] = useState(false);

  // --- 작품 수정 상태 ---
  const [editWorkId, setEditWorkId] = useState("");
  const [editWork, setEditWork] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);
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
  const [pushScheduleType, setPushScheduleType] = useState<
    "instant" | "scheduled"
  >("instant");
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
      .select("id, title, free_episodes, last_voice, last_pitch, last_rate")
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      let finalThumbnail = editWork.thumbnail;

      // 새 썸네일 파일이 선택된 경우 업로드
      if (editThumbnailFile) {
        setEditThumbnailUploading(true);
        const ext = editThumbnailFile.name.split(".").pop() || "png";
        const r2Key = `thumbnails/${editWork.id}_${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append("file", editThumbnailFile);
        formData.append("key", r2Key);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/direct-upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () =>
            xhr.status === 200
              ? resolve()
              : reject(new Error(`업로드 실패: ${xhr.status}`));
          xhr.onerror = () => reject(new Error("네트워크 오류"));
          xhr.send(formData);
        });
        finalThumbnail = `/${r2Key}`;
        setEditThumbnailUploading(false);
      }

      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
          is_membership_only: editWork.is_membership_only ?? false,
        }),
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

  // 작품 삭제 처리
  const handleDeleteWork = async () => {
    if (!editWork) return;
    const confirmDelete = window.confirm(
      `⚠️ 경고: [${editWork.title}] 작품을 삭제하시겠습니까?\n\n` +
        `작품 삭제 시 해당 작품의 모든 에피소드(회차) 목록과 사용자의 소장 내역(entitlements)도 함께 삭제됩니다.\n` +
        `이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?`,
    );
    if (!confirmDelete) return;

    setEditDeleting(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/delete-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editWork.id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "삭제 실패");

      alert("🗑️ 작품이 완벽하게 삭제되었습니다.");

      // 상태 초기화 및 작품 목록 리프레시
      setEditWorkId("");
      setEditWork(null);
      fetchWorks();
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    } finally {
      setEditDeleting(false);
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      // 썸네일 파일 업로드 시작
      if (thumbnailFile) {
        setThumbnailUploading(true);
        setThumbnailProgress(0);
        const ext = thumbnailFile.name.split(".").pop() || "png";
        const r2Key = `thumbnails/${novelId}_${Date.now()}.${ext}`;

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

        finalThumbnailUrl = `/${r2Key}`;
      }

      // 3. API 라우트를 통해 안전하게 등록/수정 (RLS 우회)
      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
          featured: novelFeatured,
          is_membership_only: novelIsMembershipOnly,
        }),
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
      setNovelIsMembershipOnly(false);
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
        status: "idle" as const,
        is_membership_only: episodeIsMembershipOnly,
      });
    }

    setEpisodeQueue((prev) => [...prev, ...newItems]);
    // 파일 인풋의 value 초기화 (같은 파일을 다시 올릴 수 있도록)
    e.target.value = "";
  };

  // 큐 개별 아이템 삭제
  const removeQueueItem = (index: number) => {
    setEpisodeQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 큐 개별 아이템 필드 변경 (회차 번호, 제목, 멤버십 전용 여부)
  const updateQueueItem = (
    index: number,
    key: "id" | "title" | "is_membership_only",
    value: any,
  ) => {
    setEpisodeQueue((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, [key]: value };
        }
        return item;
      }),
    );
  };

  // 개별 파일의 실제 잠금(유료/무료) 여부를 반환하는 헬퍼 함수
  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;

    // "auto"인 경우 소설 무료화수(free_episodes) 조회
    const work = worksList.find((w) => w.id === selectedWorkId);
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
    const pendingItems = episodeQueue.filter(
      (item) => item.status === "idle" || item.status === "error",
    );
    if (pendingItems.length === 0) {
      alert("업로드할 대기 중인 파일이 없습니다.");
      return;
    }

    setIsQueueUploading(true);

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      if (!token) throw new Error("로그인 세션이 만료되었습니다.");

      // 순차적으로 업로드 진행
      for (let i = 0; i < episodeQueue.length; i++) {
        const item = episodeQueue[i];
        if (item.status === "success") continue; // 이미 성공한 파일은 스킵

        // 상태를 uploading으로 변경
        setEpisodeQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "uploading" as const, progress: 0 } : q,
          ),
        );

        try {
          // 1. 오디오 파일 R2 업로드
          const isPureNumber = /^\d+$/.test(item.id);
          const epFolder = isPureNumber
            ? String(Number(item.id)).padStart(3, "0")
            : item.id;
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
                setEpisodeQueue((prev) =>
                  prev.map((q, idx) =>
                    idx === i ? { ...q, progress: pct } : q,
                  ),
                );
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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              work_id: selectedWorkId,
              id: item.id,
              title: item.title,
              locked: getEpisodeLockedStatus(item.id),
              parts: 1,
              release_date: new Date(episodeReleaseDate).toISOString(),
              is_membership_only: item.is_membership_only ?? false,
            }),
          });

          const epData = await epRes.json();
          if (!epRes.ok) {
            throw new Error(epData.error || "에피소드 DB 저장 실패");
          }

          // 완료 업데이트
          setEpisodeQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: "success" as const, progress: 100 }
                : q,
            ),
          );
        } catch (itemErr: any) {
          console.error(`${item.file.name} 업로드 실패:`, itemErr);
          setEpisodeQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: "error" as const, errorMsg: itemErr.message }
                : q,
            ),
          );
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      if (pushScheduleType === "scheduled") {
        // 예약 발송
        const res = await fetch("/api/admin/schedule-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
            scheduled_time: new Date(pushScheduledTime).toISOString(),
          }),
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "푸시 발송 실패");

        setPushResult(data);
        alert(
          `✅ 전체 회원 푸시 즉시 전송 완료!\n(전송: ${data.sentCount}건 / 성공: ${data.successCount}건 / 실패: ${data.failCount}건)`,
        );
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      if (!token) return;

      const res = await fetch("/api/admin/save-push-settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setDailyTitle(data.settings.daily_title || "");
        setDailyBody(data.settings.daily_body || "");
        setDailyUrl(data.settings.daily_url || "/checkin");
        setDailySendHour(
          data.settings.daily_send_hour !== undefined
            ? data.settings.daily_send_hour
            : 8,
        );
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/save-push-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          daily_title: dailyTitle,
          daily_body: dailyBody,
          daily_url: dailyUrl,
          daily_send_hour: Number(dailySendHour),
        }),
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
      <main
        style={{
          minHeight: "100dvh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          관리자 권한 조회 중...
        </div>
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
      <main
        style={{
          minHeight: "100dvh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
          fontFamily: "sans-serif",
        }}
      >
        <TopBar />
        <div
          style={{
            maxWidth: 550,
            margin: "100px auto",
            textAlign: "center",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
            관리자 페이지
          </h2>

          {user ? (
            <div>
              <div
                style={{
                  background: "rgba(255,59,48,0.15)",
                  border: "1px solid #ff3b30",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 20,
                  textAlign: "left",
                }}
              >
                <div
                  style={{ fontWeight: 800, color: "#ff453a", fontSize: 15 }}
                >
                  ⚠️ 권한이 없습니다.
                </div>
                <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
                  현재 로그인된 계정: <strong>{user.email}</strong>
                </div>
              </div>
              <p
                style={{
                  opacity: 0.8,
                  fontSize: 13,
                  marginBottom: 20,
                  lineHeight: 1.6,
                  textAlign: "left",
                }}
              >
                이 계정은 관리자 화이트리스트에 등록되어 있지 않습니다. 관리자
                권한을 획득하려면 아래 방법 중 하나를 사용해 주세요.
              </p>
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                  textAlign: "left",
                  fontSize: 12,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <strong>방법 1: 소스 코드 수정 (가장 빠름)</strong>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                  <code style={{ color: "#ffe9a3", fontSize: 11 }}>
                    app/admin/page.tsx
                  </code>{" "}
                  파일 <strong>62번째 라인</strong>을 아래와 같이 수정하여 본인
                  이메일을 추가해 줍니다:
                </p>
                <pre
                  style={{
                    background: "#1c1c24",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginTop: 8,
                    overflowX: "auto",
                    color: "#8dd3c7",
                  }}
                >
                  {`const hasAdminEmail = 
  user.email === "admin@murimbook.com" || 
  user.email === "${user.email}";`}
                </pre>
                <strong style={{ display: "block", marginTop: 12 }}>
                  방법 2: Supabase 메타데이터 설정
                </strong>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                  Supabase 대시보드 &gt; Authentication &gt; Users 에서 해당
                  유저의 metadata에{" "}
                  <code style={{ color: "#ffe9a3" }}>"role": "admin"</code>을
                  추가합니다.
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                다른 계정으로 로그아웃
              </button>
            </div>
          ) : (
            <div>
              <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 24 }}>
                이 페이지에 접근하려면 관리자 계정 로그인이 필요합니다.
              </p>
              <button
                onClick={() => loginWithGoogle("/admin")}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                }}
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
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
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
        .btn-delete {
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(255, 59, 48, 0.4);
          background: rgba(255, 59, 48, 0.08);
          color: #ff453a;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .btn-delete:hover {
          background: rgba(255, 59, 48, 0.18);
          border-color: #ff3b30;
        }
        .btn-delete:disabled {
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
          <button
            className={`admin-tab ${activeTab === "novels" ? "active" : ""}`}
            onClick={() => setActiveTab("novels")}
          >
            소설 등록
          </button>
          <button
            className={`admin-tab ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("edit");
              if (!editWorkId && worksList.length > 0) {
                setEditWorkId(worksList[0].id);
                fetchEditWork(worksList[0].id);
              }
            }}
          >
            작품 수정
          </button>
          <button
            className={`admin-tab ${activeTab === "episodes" ? "active" : ""}`}
            onClick={() => setActiveTab("episodes")}
          >
            회차 & 오디오 업로드
          </button>
          <button
            className={`admin-tab ${activeTab === "push" ? "active" : ""}`}
            onClick={() => setActiveTab("push")}
          >
            웹 푸시 발송
          </button>
          <button
            className={`admin-tab ${activeTab === "automation" ? "active" : ""}`}
            onClick={() => setActiveTab("automation")}
          >
            오디오 자동연성 & 파일합포장
          </button>
        </div>

        {/* 탭 1: 소설 작품 관리 */}
        {activeTab === "novels" && (
          <form onSubmit={handleNovelSubmit} className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
              새로운 무협 소설 생성
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">
                  소설 영문 고유 ID (예: cheonmujin)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="cheonmujin"
                  value={novelId}
                  onChange={(e) => setNovelId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">소설 제목</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="천무진: 봉인된 천재"
                  value={novelTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNovelTitle(title);
                    setNovelId(romanizeHangeul(title));
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">소설 줄거리 및 시놉시스</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="작품 소개글을 입력하세요..."
                value={novelDesc}
                onChange={(e) => setNovelDesc(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
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
                <select
                  className="form-select"
                  value={novelStatus}
                  onChange={(e) => setNovelStatus(e.target.value as any)}
                >
                  <option value="연재중">연재중</option>
                  <option value="완결">완결</option>
                  <option value="준비중">준비중</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">장르 태그 선택</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {[
                    "[회귀물]",
                    "[복수극]",
                    "[의선]",
                    "[성장]",
                    "[복수]",
                    "[정통무협]",
                    "[환생물]",
                    "[먼치킨]",
                    "[사이다]",
                    "[미스터리]",
                  ].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags((prev) =>
                              prev.filter((t) => t !== tag),
                            );
                          } else {
                            setSelectedTags((prev) => [...prev, tag]);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: isSelected
                            ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)"
                            : "rgba(255,255,255,0.05)",
                          border: isSelected
                            ? "1px solid #ff2a5f"
                            : "1px solid rgba(255,255,255,0.12)",
                          color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                          boxShadow: isSelected
                            ? "0 0 10px rgba(255, 42, 95, 0.4)"
                            : "none",
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

            <div
              className="form-group"
              style={{
                flexDirection: "row",
                gap: 24,
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={novelExclusive}
                  onChange={(e) => setNovelExclusive(e.target.checked)}
                />
                독점 공개 여부
              </label>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={novelFeatured}
                  onChange={(e) => setNovelFeatured(e.target.checked)}
                />
                홈페이지 추천작 노출
              </label>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  color: "#ff2a5f",
                }}
              >
                <input
                  type="checkbox"
                  checked={novelIsMembershipOnly}
                  onChange={(e) => setNovelIsMembershipOnly(e.target.checked)}
                />
                👑 멤버십 전용 작품
              </label>
            </div>

            {/* 표지 썸네일 이미지 직접 업로드 기능 */}
            <div
              className="form-group"
              style={{
                background: "rgba(255,255,255,0.02)",
                padding: 20,
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: 12,
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    margin: 0,
                  }}
                >
                  🖼️ 소설 표지 썸네일
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleGenerateAiThumbnail(
                      novelId,
                      novelTitle,
                      novelDesc,
                      false,
                    )
                  }
                  disabled={generatingAiThumbnail || !novelId || !novelTitle}
                  style={{
                    background:
                      "linear-gradient(135deg, #ff2a5f 0%, #fca834 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor:
                      generatingAiThumbnail || !novelId || !novelTitle
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      generatingAiThumbnail || !novelId || !novelTitle
                        ? 0.6
                        : 1,
                  }}
                >
                  {generatingAiThumbnail
                    ? "🎨 AI 이미지 생성 중..."
                    : "🎨 AI 썸네일 원클릭 생성"}
                </button>
              </div>

              <div
                style={{
                  border: "2px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  padding: "30px 20px",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.01)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  position: "relative",
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
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "left",
                    }}
                  >
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail Preview"
                      style={{
                        width: 90,
                        height: 135,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                    <div>
                      <div
                        style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}
                      >
                        선택된 이미지
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.6)",
                          marginTop: 4,
                          wordBreak: "break-all",
                        }}
                      >
                        {thumbnailFile?.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          marginTop: 2,
                        }}
                      >
                        {((thumbnailFile?.size || 0) / 1024 / 1024).toFixed(2)}{" "}
                        MB
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFile(null);
                          setThumbnailPreview("");
                        }}
                        style={{
                          marginTop: 8,
                          background: "rgba(255, 59, 48, 0.2)",
                          border: "1px solid #ff3b30",
                          color: "#ff453a",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      이미지 파일을 드래그하여 놓거나 클릭하여 선택
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 4,
                      }}
                    >
                      JPEG, PNG, WEBP 등 지원 (권장 비율 2:3)
                    </div>
                  </div>
                )}
              </div>

              {thumbnailUploading && (
                <div style={{ marginTop: 8 }}>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${thumbnailProgress}%` }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      opacity: 0.7,
                      marginTop: 4,
                    }}
                  >
                    <span>표지 업로드 중...</span>
                    <span>{thumbnailProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-submit">
              작품 생성하기
            </button>
          </form>
        )}

        {/* 탭 2-5: 작품 수정 */}
        {activeTab === "edit" && (
          <div className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
              📝 등록된 작품 정보 수정
            </h2>

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
                {worksList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>

            {editLoading && (
              <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
                불러오는 중...
              </div>
            )}

            {editWork && !editLoading && (
              <form onSubmit={handleEditSubmit}>
                {/* ID 표시 (수정 불가) */}
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label" style={{ opacity: 0.5 }}>
                    소설 ID (변경 불가)
                  </label>
                  <input
                    className="form-input"
                    value={editWork.id}
                    disabled
                    style={{ opacity: 0.4, cursor: "not-allowed" }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">소설 제목</label>
                    <input
                      className="form-input"
                      value={editWork.title ?? ""}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">연재 상태</label>
                    <select
                      className="form-select"
                      value={editWork.status ?? "연재중"}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          status: e.target.value,
                        }))
                      }
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
                    onChange={(e) =>
                      setEditWork((p: any) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">장르 태그 (subtitle)</label>
                    <input
                      className="form-input"
                      placeholder="[회귀물] [복수극] ..."
                      value={editWork.subtitle ?? ""}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          subtitle: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">무료 공개 화수</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editWork.free_episodes ?? ""}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          free_episodes: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">총 연재 예정 화수</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editWork.total_episodes ?? ""}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          total_episodes: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">배지</label>
                    <select
                      className="form-select"
                      value={editWork.badge ?? ""}
                      onChange={(e) =>
                        setEditWork((p: any) => ({
                          ...p,
                          badge: e.target.value,
                        }))
                      }
                    >
                      <option value="신작">신작</option>
                      <option value="인기">인기</option>
                      <option value="">없음</option>
                    </select>
                  </div>
                  <div
                    className="form-group"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 24,
                      paddingTop: 28,
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editWork.exclusive ?? false}
                        onChange={(e) =>
                          setEditWork((p: any) => ({
                            ...p,
                            exclusive: e.target.checked,
                          }))
                        }
                      />
                      독점 공개
                    </label>
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editWork.featured ?? false}
                        onChange={(e) =>
                          setEditWork((p: any) => ({
                            ...p,
                            featured: e.target.checked,
                          }))
                        }
                      />
                      홈 추천작 노출
                    </label>
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        color: "#ff2a5f",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editWork.is_membership_only ?? false}
                        onChange={(e) =>
                          setEditWork((p: any) => ({
                            ...p,
                            is_membership_only: e.target.checked,
                          }))
                        }
                      />
                      👑 멤버십 전용
                    </label>
                  </div>
                </div>

                {/* 썸네일 수정 */}
                <div
                  className="form-group"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    padding: 20,
                    border: "1px dashed rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <label className="form-label" style={{ margin: 0 }}>
                      🖼️ 표지 썸네일 변경
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleGenerateAiThumbnail(
                          editWork.id,
                          editWork.title,
                          editWork.description,
                          true,
                        )
                      }
                      disabled={
                        generatingAiThumbnail || !editWork.id || !editWork.title
                      }
                      style={{
                        background:
                          "linear-gradient(135deg, #ff2a5f 0%, #fca834 100%)",
                        border: "none",
                        borderRadius: "8px",
                        color: "white",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor:
                          generatingAiThumbnail ||
                          !editWork.id ||
                          !editWork.title
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          generatingAiThumbnail ||
                          !editWork.id ||
                          !editWork.title
                            ? 0.6
                            : 1,
                      }}
                    >
                      {generatingAiThumbnail
                        ? "🎨 AI 이미지 생성 중..."
                        : "🎨 AI 썸네일 원클릭 생성"}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* 현재 썸네일 미리보기 */}
                    {editThumbnailPreview && (
                      <div style={{ flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          현재 표지
                        </div>
                        <img
                          src={editThumbnailPreview}
                          alt="thumbnail"
                          style={{
                            width: 80,
                            height: 120,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          border: "2px dashed rgba(255,255,255,0.1)",
                          borderRadius: 10,
                          padding: "20px",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        className="upload-dropzone"
                        onClick={() =>
                          document
                            .getElementById("edit-thumbnail-input")
                            ?.click()
                        }
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
                              setEditThumbnailPreview(
                                URL.createObjectURL(file),
                              );
                            }
                          }}
                        />
                        {editThumbnailFile ? (
                          <div
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.8)",
                            }}
                          >
                            ✅ 새 이미지 선택됨:{" "}
                            <strong>{editThumbnailFile.name}</strong>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditThumbnailFile(null);
                                setEditThumbnailPreview(
                                  editWork.thumbnail || "",
                                );
                              }}
                              style={{
                                marginLeft: 10,
                                background: "rgba(255,59,48,0.2)",
                                border: "1px solid #ff3b30",
                                color: "#ff453a",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.5)",
                            }}
                          >
                            📤 새 이미지를 드래그하거나 클릭해서 선택
                          </div>
                        )}
                      </div>
                      {editThumbnailUploading && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#fca834",
                            marginTop: 8,
                          }}
                        >
                          썸네일 업로드 중...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={handleDeleteWork}
                    disabled={editSaving || editDeleting}
                  >
                    {editDeleting ? "🗑️ 삭제 중..." : "🗑️ 작품 삭제하기"}
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={editSaving || editDeleting}
                  >
                    {editSaving ? "저장 중..." : "✅ 변경사항 저장하기"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 탭 2: 회차 등록 & 대용량 파일 업로드 */}
        {activeTab === "episodes" && (
          <form onSubmit={handleEpisodeSubmit} className="card-panel">
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
              📚 신규 회차(에피소드) 일괄 추가 및 업로드
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              여러 개의 오디오 파일을 한 번에 선택하여 일괄 순차 업로드할 수
              있습니다. 파일명에서 회차 번호와 제목이 자동으로 파싱되며, 업로드
              전에 직접 수정할 수 있습니다.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">대상 소설 작품 선택</label>
                <select
                  className="form-select"
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                >
                  {worksList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">일괄 공개 예정 일시</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={episodeReleaseDate}
                  onChange={(e) => setEpisodeReleaseDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginTop: 8,
              }}
            >
              <div className="form-group">
                <label className="form-label">기본 잠금 상태 설정</label>
                <select
                  className="form-select"
                  value={episodeLocked}
                  onChange={(e) => setEpisodeLocked(e.target.value as any)}
                >
                  <option value="auto">
                    ✨ 작품 설정에 따라 자동 지정 (무료/유료 자동 분리)
                  </option>
                  <option value="free">
                    🔓 전체 무료회차로 지정 (포인트 불필요)
                  </option>
                  <option value="locked">
                    🔒 전체 유료회차로 지정 (포인트 필요)
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">멤버십 전용 기본값</label>
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    height: "42px",
                    color: "#ff2a5f",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={episodeIsMembershipOnly}
                    onChange={(e) =>
                      setEpisodeIsMembershipOnly(e.target.checked)
                    }
                  />
                  👑 멤버십 전용으로 지정
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">
                  오디오 음원 파일 선택 (여러 파일 선택 가능, .mp3, .m4a)
                </label>
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
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>📋 업로드 대기열 ({episodeQueue.length}개 파일)</span>
                  {!isQueueUploading && (
                    <button
                      type="button"
                      onClick={() => setEpisodeQueue([])}
                      style={{
                        background: "rgba(255, 59, 48, 0.15)",
                        border: "1px solid #ff3b30",
                        color: "#ff453a",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      목록 비우기
                    </button>
                  )}
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    maxHeight: 400,
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                >
                  {episodeQueue.map((item, index) => {
                    const fileSizeMB = (item.file.size / 1024 / 1024).toFixed(
                      2,
                    );

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
                          border: isProcessing
                            ? "1px solid #fca834"
                            : isSuccess
                              ? "1px solid rgba(52,199,89,0.3)"
                              : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          padding: 16,
                          position: "relative",
                        }}
                      >
                        {/* 상단: 상태 및 원본 파일명 */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                background: statusColor + "1a",
                                color: statusColor,
                                border: `1px solid ${statusColor}`,
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {statusText}
                            </span>
                            {/* 실제 유료/무료 분기 배지 */}
                            {(() => {
                              const actualLocked = getEpisodeLockedStatus(
                                item.id,
                              );
                              const lockColor = actualLocked
                                ? "#ff453a"
                                : "#34c759";
                              const lockText = actualLocked
                                ? "🔒 유료"
                                : "🔓 무료";
                              return (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    background: lockColor + "1a",
                                    color: lockColor,
                                    border: `1px solid ${lockColor}`,
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {lockText}
                                </span>
                              );
                            })()}
                            <span
                              style={{
                                fontSize: 12,
                                color: "rgba(255,255,255,0.4)",
                                wordBreak: "break-all",
                              }}
                            >
                              {item.file.name} ({fileSizeMB} MB)
                            </span>
                          </div>
                          {!isQueueUploading && !isSuccess && (
                            <button
                              type="button"
                              onClick={() => removeQueueItem(index)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ff453a",
                                fontSize: 12,
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              제거
                            </button>
                          )}
                        </div>

                        {/* 중단: 파싱된 데이터 편집 폼 */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "80px 1fr 120px",
                            gap: 12,
                          }}
                        >
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              className="form-label"
                              style={{ fontSize: 11, opacity: 0.6 }}
                            >
                              회차 번호
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: "6px 10px", fontSize: 13 }}
                              value={item.id}
                              disabled={isQueueUploading || isSuccess}
                              onChange={(e) =>
                                updateQueueItem(index, "id", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              className="form-label"
                              style={{ fontSize: 11, opacity: 0.6 }}
                            >
                              회차 제목
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: "6px 10px", fontSize: 13 }}
                              value={item.title}
                              disabled={isQueueUploading || isSuccess}
                              onChange={(e) =>
                                updateQueueItem(index, "title", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div
                            className="form-group"
                            style={{
                              marginBottom: 0,
                              justifyContent: "center",
                            }}
                          >
                            <label
                              className="form-label"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                color: "#ff2a5f",
                                height: "100%",
                                marginTop: "18px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={item.is_membership_only ?? false}
                                disabled={isQueueUploading || isSuccess}
                                onChange={(e) =>
                                  updateQueueItem(
                                    index,
                                    "is_membership_only",
                                    e.target.checked,
                                  )
                                }
                              />
                              👑 멤버십 전용
                            </label>
                          </div>
                        </div>

                        {/* 업로드 진행 상태 바 */}
                        {isProcessing && (
                          <div style={{ marginTop: 12 }}>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${item.progress}%`,
                                  background: "#fca834",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 실패 시 에러 문구 */}
                        {isError && item.errorMsg && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#ff453a",
                              marginTop: 8,
                              background: "rgba(255,69,58,0.08)",
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid rgba(255,69,58,0.2)",
                            }}
                          >
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
                : `회차 일괄 등록 및 파일 전송 시작 (${episodeQueue.length}개 파일)`}
            </button>
          </form>
        )}

        {/* 탭 4: 웹 푸시 알림 발송 */}
        {activeTab === "push" && (
          <>
            <form onSubmit={handlePushSubmit} className="card-panel">
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
                📢 전체 유저 대상 수동 웹 푸시 발송 및 예약
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                푸시 알림 수신을 허용한 모든 회원(브라우저) 기기 화면에 실시간
                알림 팝업을 즉시 보내거나 특정 일시에 예약 전송합니다.
              </p>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">발송 방식 선택</label>
                <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="radio"
                      name="pushScheduleType"
                      value="instant"
                      checked={pushScheduleType === "instant"}
                      onChange={() => setPushScheduleType("instant")}
                    />
                    즉시 발송
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
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
                  <label className="form-label">
                    예약 발송 일시 설정 (KST)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={pushScheduledTime}
                    onChange={(e) => setPushScheduledTime(e.target.value)}
                    required
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 2,
                    }}
                  >
                    * 매 정각마다 동작하는 백엔드 크론(Cron) 스케줄러가 해당
                    예약 시간을 확인하여 자동 전송합니다.
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
                <EmojiPickerChips
                  onSelect={(emoji) =>
                    insertEmoji(pushTitleRef, pushTitle, setPushTitle, emoji)
                  }
                />
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
                <EmojiPickerChips
                  onSelect={(emoji) =>
                    insertEmoji(pushBodyRef, pushBody, setPushBody, emoji)
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  클릭 시 이동할 링크 주소 (선택)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="/checkin"
                  value={pushUrl}
                  onChange={(e) => setPushUrl(e.target.value)}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 2,
                  }}
                >
                  * 기본값은 메인 화면(/)입니다. 출석체크 알림인 경우 /checkin
                  을 적어주시면 됩니다.
                </span>
              </div>

              {pushResult && (
                <div
                  style={{
                    margin: "16px 0",
                    background: "rgba(76,217,100,0.1)",
                    border: "1px solid #34c759",
                    borderRadius: 10,
                    padding: 16,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 850,
                      color: "#34c759",
                      marginBottom: 4,
                    }}
                  >
                    ✅ 전송 성공!
                  </div>
                  <div>
                    총 시도: <strong>{pushResult.sentCount}건</strong>
                  </div>
                  <div>
                    발송 완료: <strong>{pushResult.successCount}건</strong> |
                    실패(연결 종료): <strong>{pushResult.failCount}건</strong>
                  </div>
                  {pushResult.cleanedCount > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        marginTop: 2,
                      }}
                    >
                      * 만료된 브라우저 구독 정보 {pushResult.cleanedCount}개가
                      DB에서 자동 정리되었습니다.
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-submit"
                disabled={pushSending}
                style={{ marginTop: 8 }}
              >
                {pushSending
                  ? "작업 처리 중..."
                  : pushScheduleType === "scheduled"
                    ? "지정한 일시에 예약 전송 설정하기"
                    : "전체 회원에게 푸시 알림 즉시 발송하기"}
              </button>
            </form>

            <form
              onSubmit={handleDailyPushSave}
              className="card-panel"
              style={{ marginTop: 24 }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
                ⏰ 매일 자동 발송 웹 푸시 문구 및 시간 설정 (상시 발송)
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                Vercel Cron 작업을 통해 매일 지정한 시간대(KST 기준 정각)에 수신
                동의한 모든 유저에게 자동 전송되는 출석/일일보상 푸시 문구를
                편집합니다.
              </p>

              {dailyLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 20,
                    opacity: 0.6,
                    fontSize: 14,
                  }}
                >
                  설정을 불러오는 중...
                </div>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">
                      매일 자동 발송 시간 선택 (KST 기준 정각)
                    </label>
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
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 2,
                      }}
                    >
                      * 1시간 간격으로 도는 크론 스케줄러가 여기 설정된 시간대와
                      일치할 때 자동으로 알림을 발송합니다.
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
                    <EmojiPickerChips
                      onSelect={(emoji) =>
                        insertEmoji(
                          dailyTitleRef,
                          dailyTitle,
                          setDailyTitle,
                          emoji,
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      자동 발송 알림 상세 내용
                    </label>
                    <textarea
                      ref={dailyBodyRef}
                      className="form-textarea"
                      rows={3}
                      placeholder="잊지 말고 일일 문안인사와 출석체크를 완료하고 무료 10코인을 받아가세요! 🍵"
                      value={dailyBody}
                      onChange={(e) => setDailyBody(e.target.value)}
                      required
                    />
                    <EmojiPickerChips
                      onSelect={(emoji) =>
                        insertEmoji(
                          dailyBodyRef,
                          dailyBody,
                          setDailyBody,
                          emoji,
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      자동 발송 클릭 시 이동할 링크 주소 (선택)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="/checkin"
                      value={dailyUrl}
                      onChange={(e) => setDailyUrl(e.target.value)}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 2,
                      }}
                    >
                      * 기본값은 출석체크 화면(/checkin)입니다.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={dailySaving}
                    style={{ marginTop: 8 }}
                  >
                    {dailySaving
                      ? "자동 발송 설정 저장 중..."
                      : "매일 자동 발송 설정 저장하기"}
                  </button>
                </>
              )}
            </form>
          </>
        )}

        {/* 탭 5: 오디오 자동 연성 및 파일 합포장 */}
        {activeTab === "automation" && (
          <AutomationPanel worksList={worksList} fetchWorks={fetchWorks} />
        )}
      </div>
    </main>
  );
}

interface ParsedChapter {
  id: string;
  title: string;
  text: string;
}

function createPitchShifter(ctx: AudioContext, pitchFactor: number) {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1) as any;
  node.pitchFactor = pitchFactor;

  let delay = 0;
  const maxDelay = 0.05 * ctx.sampleRate; // 50ms delay max
  const delayBuffer = new Float32Array(maxDelay * 2);
  let writeIndex = 0;

  node.onaudioprocess = (e: any) => {
    const input = e.inputBuffer.getChannelData(0);
    const output = e.outputBuffer.getChannelData(0);
    const currentPitchFactor = node.pitchFactor;

    if (Math.abs(currentPitchFactor - 1.0) < 0.02) {
      for (let i = 0; i < input.length; i++) {
        output[i] = input[i];
      }
      return;
    }

    const rate = 1.0 - currentPitchFactor;
    for (let i = 0; i < input.length; i++) {
      delayBuffer[writeIndex] = input[i];

      let readIndex = writeIndex - delay;
      if (readIndex < 0) readIndex += delayBuffer.length;

      const baseIndex = Math.floor(readIndex);
      const frac = readIndex - baseIndex;
      const nextIndex = (baseIndex + 1) % delayBuffer.length;

      output[i] =
        delayBuffer[baseIndex] * (1.0 - frac) + delayBuffer[nextIndex] * frac;

      delay += rate;
      if (delay < 0) {
        delay += maxDelay;
      } else if (delay >= maxDelay) {
        delay -= maxDelay;
      }

      writeIndex = (writeIndex + 1) % delayBuffer.length;
    }
  };

  return node;
}

function AutomationPanel({
  worksList,
  fetchWorks,
}: {
  worksList: any[];
  fetchWorks: () => Promise<void>;
}) {
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const activeShifterNodeRef = useRef<any>(null);

  // TTS states
  const [selectedWorkId, setSelectedWorkId] = useState(worksList[0]?.id || "");
  const [episodeId, setEpisodeId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState<
    "auto" | "free" | "locked"
  >("auto");
  const [textInput, setTextInput] = useState("");
  const [txtFiles, setTxtFiles] = useState<File[]>([]);
  const [ttsIsMembershipOnly, setTtsIsMembershipOnly] = useState(false);

  const [voice, setVoice] = useState("ko-KR-InJoonNeural");
  const [preset, setPreset] = useState("karisma");
  const [pitch, setPitch] = useState("-6Hz");
  const [rate, setRate] = useState("-6%");

  const [customPitchVal, setCustomPitchVal] = useState(0);
  const [customRateVal, setCustomRateVal] = useState(0);
  const [effect, setEffect] = useState("none");

  // 소설 작품 선택 시 최근 사용했던 목소리 설정 자동 복원
  useEffect(() => {
    if (!selectedWorkId) return;
    const work = worksList.find((w) => w.id === selectedWorkId);
    if (work) {
      if (work.last_voice) setVoice(work.last_voice);
      if (work.last_pitch) {
        setPitch(work.last_pitch);
        const pVal = parseInt(work.last_pitch) || 0;
        setCustomPitchVal(pVal);
      }
      if (work.last_rate) {
        setRate(work.last_rate);
        const rVal = parseInt(work.last_rate) || 0;
        setCustomRateVal(rVal);
      }
      if (work.is_membership_only !== undefined) {
        setTtsIsMembershipOnly(work.is_membership_only);
      }
      setPreset("custom");
    }
  }, [selectedWorkId, worksList]);

  const [previewText, setPreviewText] =
    useState(`살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.
“여기 쥐새끼가 숨어 있었군. 흠, 옆에 있는 늙은이는 뭐냐? 동행인가?”
진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다. 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.
“이 노인은 이 일과 아무 상관 없는 지나가는 미치광이요! 원하는 건 내 목숨일 테니, 이 노인은 보내줘라!”
살수들은 서로를 바라보며 비열한 웃음을 터뜨렸다. 그들의 웃음소리가 기괴하게 사당 안을 울렸다.`);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAudioBuffer, setPreviewAudioBuffer] =
    useState<AudioBuffer | null>(null);
  const [previewAudioCtx, setPreviewAudioCtx] = useState<AudioContext | null>(
    null,
  );
  const [previewSourceNode, setPreviewSourceNode] =
    useState<AudioBufferSourceNode | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  // 실시간 재생 속도 조절 (Web Audio playbackRate)
  // rate(%) 값을 Web Audio playbackRate로 변환하는 헬퍼
  // rateFactor : (100 + %) / 100
  const calcPlaybackRate = (rateStr: string): number => {
    const ratePercent = parseInt(rateStr) || 0;
    const rateFactor = (100 + ratePercent) / 100;
    return Math.max(0.1, rateFactor);
  };

  const [ttsStatus, setTtsStatus] = useState<
    "idle" | "tts" | "upload" | "db" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Split & Batch TTS states
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [schedulingType, setSchedulingType] = useState<
    "immediate" | "1hour" | "12hour" | "1day"
  >("immediate");
  const [schedulingStartDate, setSchedulingStartDate] = useState("");
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [itemStatuses, setItemStatuses] = useState<{
    [key: number]: {
      status: "idle" | "running" | "success" | "error";
      errorMsg?: string;
    };
  }>({});
  const [batchStatus, setBatchStatus] = useState<
    "idle" | "running" | "paused" | "success" | "error"
  >("idle");

  const batchActiveRef = useRef(false);
  const currentProcessingIndexRef = useRef(0);

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
    } else if (presetName === "furious") {
      // 분노/화남 프리셋: 날카롭고 격양된 빠른 말조
      setPitch("+4Hz");
      setRate("+12%");
    } else if (presetName === "calm") {
      // 차분/따뜻 프리셋: 낮고 편안한 느린 말조
      setPitch("-3Hz");
      setRate("-8%");
    }
  };

  const handleCustomPitchChange = (val: number) => {
    setCustomPitchVal(val);
    const sign = val >= 0 ? "+" : "";
    const newPitch = `${sign}${val}Hz`;
    setPitch(newPitch);
    const pitchFactor = Math.pow(2, val / 120);
    if (activeShifterNodeRef.current) {
      activeShifterNodeRef.current.pitchFactor = pitchFactor;
    }
  };

  const handleCustomRateChange = (val: number) => {
    setCustomRateVal(val);
    const sign = val >= 0 ? "+" : "";
    const newRate = `${sign}${val}%`;
    setRate(newRate);
    if (previewSourceNode && isPreviewPlaying) {
      previewSourceNode.playbackRate.value = calcPlaybackRate(newRate);
    }
  };

  // 텍스트 파일 로드 처리
  const handleTxtFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 자연 정렬을 이용하여 파일명을 순서대로 정렬 (예: 1화, 2화, 10화 순서)
      const fileList = Array.from(files).sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

      setTxtFiles(fileList);

      // 모든 파일의 텍스트를 순서대로 읽고 합칩니다.
      const contentsArray = [];
      for (const file of fileList) {
        const text = await file.text();
        contentsArray.push(text);
      }
      setTextInput(cleanHanja(contentsArray.join("\n\n")));

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

  // 합본 파일 파싱 처리
  const handleSplitFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = cleanHanja(await file.text());

      const headerRegex = /^\[\s*(.+?)\s*\]$/;
      const lines = text.split(/\r?\n/);
      const chapters: ParsedChapter[] = [];
      let currentHeader = "";
      let currentLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(headerRegex);
        if (match) {
          if (currentHeader || currentLines.join("").trim().length > 0) {
            const titleText = currentHeader || "프롤로그";
            const { id, title } = parseFilename(titleText + ".txt");
            chapters.push({
              id,
              title,
              text: currentLines.join("\n").trim(),
            });
          }
          currentHeader = match[1].trim();
          currentLines = [];
        } else {
          currentLines.push(line);
        }
      }

      if (currentHeader || currentLines.join("").trim().length > 0) {
        const titleText = currentHeader || "마지막 화";
        const { id, title } = parseFilename(titleText + ".txt");
        chapters.push({
          id,
          title,
          text: currentLines.join("\n").trim(),
        });
      }

      setParsedChapters(chapters);
      setItemStatuses({});
      setBatchStatus("idle");
      setCurrentBatchIndex(0);
      currentProcessingIndexRef.current = 0;
    }
  };

  const updateParsedChapter = (
    idx: number,
    field: keyof ParsedChapter,
    value: string,
  ) => {
    setParsedChapters((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  // 일괄 연성 루프 처리
  const runBatch = async (startIndex: number) => {
    if (parsedChapters.length === 0) return;
    batchActiveRef.current = true;
    setBatchStatus("running");

    let index = startIndex;
    currentProcessingIndexRef.current = index;
    setCurrentBatchIndex(index);

    const token = await supabase.auth
      .getSession()
      .then((s) => s.data.session?.access_token);
    if (!token) {
      alert("로그인 세션이 만료되었습니다.");
      setBatchStatus("idle");
      batchActiveRef.current = false;
      return;
    }

    const startBaseTime = new Date(schedulingStartDate || new Date());

    const failedList: string[] = [];
    let successCount = 0;

    // 이전 진행 내역에서 성공/실패 개수 초기화
    for (let i = 0; i < startIndex; i++) {
      if (itemStatuses[i]?.status === "success") {
        successCount++;
      } else if (itemStatuses[i]?.status === "error") {
        const ch = parsedChapters[i];
        failedList.push(`${ch.id}화 (${ch.title})`);
      }
    }

    while (index < parsedChapters.length && batchActiveRef.current) {
      setItemStatuses((prev) => ({
        ...prev,
        [index]: { status: "running" },
      }));

      const chapter = parsedChapters[index];

      // 공개 일시 계산
      let calculatedReleaseDate = new Date(startBaseTime);
      if (schedulingType === "1hour") {
        calculatedReleaseDate.setHours(startBaseTime.getHours() + index);
      } else if (schedulingType === "12hour") {
        calculatedReleaseDate.setHours(startBaseTime.getHours() + index * 12);
      } else if (schedulingType === "1day") {
        calculatedReleaseDate.setDate(startBaseTime.getDate() + index);
      }

      try {
        const epLockedVal = getEpisodeLockedStatus(chapter.id);
        const targetWork = worksList.find((w) => w.id === selectedWorkId);
        const isMembershipOnlyVal = targetWork?.is_membership_only ?? false;

        const res = await fetch("/api/admin/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: chapter.text,
            voice,
            pitch,
            rate,
            effect,
            preview: false,
            workId: selectedWorkId,
            episodeId: chapter.id,
            title: chapter.title,
            locked: epLockedVal,
            releaseDate: calculatedReleaseDate.toISOString(),
            is_membership_only: isMembershipOnlyVal,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(
            result.details || result.error || "오디오 생성/등록 실패",
          );
        }

        setItemStatuses((prev) => ({
          ...prev,
          [index]: { status: "success" },
        }));
        successCount++;
      } catch (err: any) {
        console.error(`Error processing chapter at index ${index}:`, err);
        setItemStatuses((prev) => ({
          ...prev,
          [index]: { status: "error", errorMsg: err.message },
        }));
        failedList.push(`${chapter.id}화 (${chapter.title})`);
      }

      index++;
      currentProcessingIndexRef.current = index;
      setCurrentBatchIndex(index);
    }

    batchActiveRef.current = false;
    if (index >= parsedChapters.length) {
      setBatchStatus("success");
      // 연성 완료 리프레시 후 최종 현황 리포트 알림
      fetchWorks();
      if (failedList.length > 0) {
        alert(
          `일괄 연성이 완료되었으나, 에러가 발생한 회차가 있습니다.\n\n- 성공: ${successCount}화\n- 실패: ${failedList.length}화\n\n[실패 회차 목록]\n${failedList.join("\n")}`,
        );
      } else {
        alert(
          `🎉 모든 회차의 오디오 일괄 연성이 성공적으로 완료되었습니다! (총 ${successCount}개 회차)`,
        );
      }
    } else {
      setBatchStatus("paused");
    }
  };

  const pauseBatch = () => {
    batchActiveRef.current = false;
    setBatchStatus("paused");
  };

  const resumeBatch = () => {
    runBatch(currentProcessingIndexRef.current);
  };

  const cancelBatch = () => {
    batchActiveRef.current = false;
    setBatchStatus("idle");
    setCurrentBatchIndex(0);
    currentProcessingIndexRef.current = 0;
    setItemStatuses({});
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const formData = new FormData();
      for (const file of mergeFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/admin/merge-chapters", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "파일 합본 생성 실패");
      }

      const selectedWork = worksList.find((w) => w.id === selectedWorkId);
      const downloadName = selectedWork
        ? `[완결]${selectedWork.title}.txt`
        : "전체_합본_소설.txt";
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
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

  // Web Audio API 기반 미리듣기 재생 헬퍼
  const stopPreviewSource = () => {
    if (previewSourceNode) {
      try {
        previewSourceNode.stop();
      } catch (e) {}
      previewSourceNode.disconnect();
      setPreviewSourceNode(null);
    }
    if (activeShifterNodeRef.current) {
      activeShifterNodeRef.current.disconnect();
      activeShifterNodeRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  const playBufferFromStart = (buffer: AudioBuffer, ctx: AudioContext) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calcPlaybackRate(rate);

    const pitchHz = parseInt(pitch) || 0;
    const pitchFactor = Math.pow(2, pitchHz / 120);

    const shifter = createPitchShifter(ctx, pitchFactor);
    activeShifterNodeRef.current = shifter;

    source.connect(shifter);
    shifter.connect(ctx.destination);

    source.start(0);
    source.onended = () => setIsPreviewPlaying(false);
    setPreviewSourceNode(source);
    setIsPreviewPlaying(true);
    return source;
  };

  // 목소리 미리듣기 재생 (서버 연성 → Web Audio API 재생)
  const handlePlayPreview = async () => {
    if (!previewText.trim()) return;

    // 이미 버퍼가 있고 재생 중이면 정지
    if (isPreviewPlaying) {
      stopPreviewSource();
      return;
    }

    // 버퍼가 이미 있으면 다시 재생 (서버 재호출 없음)
    if (previewAudioBuffer && previewAudioCtx) {
      playBufferFromStart(previewAudioBuffer, previewAudioCtx);
      return;
    }

    setPreviewLoading(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: previewText,
          voice,
          pitch,
          rate,
          effect,
          preview: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "미리듣기 음성 생성 실패");
      }

      const arrayBuf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);

      setPreviewAudioBuffer(decoded);
      setPreviewAudioCtx(ctx);
      playBufferFromStart(decoded, ctx);
    } catch (err: any) {
      alert("미리듣기 실패: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 다시듣기: 현재 voice/pitch/rate 설정으로 서버 재연성 후 재생
  const handleReplayPreview = async () => {
    if (!previewText.trim()) return;
    stopPreviewSource();
    // 버퍼 초기화 → handlePlayPreview가 서버 재호출하도록
    setPreviewAudioBuffer(null);
    if (previewAudioCtx) {
      try {
        previewAudioCtx.close();
      } catch (e) {}
      setPreviewAudioCtx(null);
    }
    // 새 설정으로 재생성
    setPreviewLoading(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: previewText,
          voice,
          pitch,
          rate,
          effect,
          preview: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "다시듣기 실패");
      }
      const arrayBuf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setPreviewAudioBuffer(decoded);
      setPreviewAudioCtx(ctx);
      playBufferFromStart(decoded, ctx);
    } catch (err: any) {
      alert("다시듣기 실패: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ★ 목소리(voice) · 텍스트 · 이펙트 변경 시에만 버퍼 초기화 → 재연성 필요
  // ★ 음높이(pitch) · 속도(rate) 는 실시간 슬라이더로 처리 → 재연성 트리거 안 함
  useEffect(() => {
    stopPreviewSource();
    setPreviewAudioBuffer(null);
    if (previewAudioCtx) {
      try {
        previewAudioCtx.close();
      } catch (e) {}
      setPreviewAudioCtx(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, previewText, effect]);

  // 에피소드 잠금 상태 자동 획득
  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;
    const work = worksList.find((w) => w.id === selectedWorkId);
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
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
          releaseDate: episodeReleaseDate,
          is_membership_only: ttsIsMembershipOnly,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.details || result.error || "오디오 생성/등록 실패",
        );
      }

      setTtsStatus("success");
      alert(
        `🎉 [연성 완료] ${episodeTitle} 오디오가 R2에 업로드되고 홈페이지에 즉시 반영되었습니다!`,
      );

      // 폼 초기화
      setEpisodeId("");
      setEpisodeTitle("");
      setTextInput("");
      setTxtFiles([]);
      setTtsIsMembershipOnly(false);
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
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          📝 텍스트 파일 합포장기 (TXT Merger)
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          50개 등 다수의 텍스트 파일(.txt)을 선택하면 파일 이름순으로 정렬하여
          하나의 전체 합본 메모장 파일로 생성 및 다운로드합니다.
        </p>

        <div className="form-group">
          <label className="form-label">
            합포장할 텍스트 파일 선택 (다중 파일 선택 가능)
          </label>
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
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              선택된 파일 목록 ({mergeFiles.length}개)
            </div>
            <div
              style={{
                maxHeight: 150,
                overflowY: "auto",
                background: "rgba(0,0,0,0.2)",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {[...mergeFiles]
                .sort((a, b) =>
                  a.name.localeCompare(b.name, undefined, { numeric: true }),
                )
                .map((f, i) => (
                  <div key={i} style={{ fontSize: 12, opacity: 0.7 }}>
                    {i + 1}. {f.name}
                  </div>
                ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn-submit"
          disabled={merging || mergeFiles.length === 0}
        >
          {merging
            ? "🔄 파일 정렬 및 합본 합포장 중..."
            : `50개 회차 메모장 합본 생성 및 다운로드 (${mergeFiles.length}개)`}
        </button>
      </form>

      {/* 2. 합본 소설 분할 및 일괄 오디오 연성기 */}
      <div className="card-panel">
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          📝 합본 소설 분할 및 일괄 오디오 연성기 (Split & Batch TTS)
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          [ 1화_제목 ] 등 대괄호로 분리된 합본 소설 텍스트 파일(.txt)을
          업로드하면 자동으로 각 화로 분할하고 순차적으로 오디오를 일괄 생성하여
          배포합니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">대상 소설 작품 선택</label>
            <select
              className="form-select"
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
            >
              {worksList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">합본 소설 텍스트 파일 업로드</label>
            <input
              type="file"
              accept=".txt"
              onChange={handleSplitFileChange}
              className="form-input"
              disabled={batchStatus === "running"}
            />
          </div>
        </div>

        {parsedChapters.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
              📋 파싱된 회차 목록 ({parsedChapters.length}개)
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">예약 발행 방식 설정</label>
                <select
                  className="form-select"
                  value={schedulingType}
                  onChange={(e) => setSchedulingType(e.target.value as any)}
                  disabled={batchStatus === "running"}
                >
                  <option value="immediate">즉시 공개 (동시 발행)</option>
                  <option value="1hour">1시간 간격 순차 발행</option>
                  <option value="12hour">12시간 간격 순차 발행</option>
                  <option value="1day">1일 간격 순차 발행</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  첫 회차 발행 예정 일시 (기준 시간)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={schedulingStartDate}
                  onChange={(e) => setSchedulingStartDate(e.target.value)}
                  required
                  disabled={batchStatus === "running"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">잠금 설정 (유료/무료)</label>
                <select
                  className="form-select"
                  value={episodeLocked}
                  onChange={(e) => setEpisodeLocked(e.target.value as any)}
                  disabled={batchStatus === "running"}
                >
                  <option value="auto">
                    작품 설정에 따라 자동 무료/유료 분리
                  </option>
                  <option value="free">🔓 전체 무료회차로 지정</option>
                  <option value="locked">🔒 전체 유료회차로 지정</option>
                </select>
              </div>
            </div>

            {/* 회차 테이블 목록 */}
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                background: "rgba(0,0,0,0.2)",
                borderRadius: 8,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 16,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    <th style={{ padding: "8px 4px", width: "80px" }}>
                      회차 번호
                    </th>
                    <th style={{ padding: "8px 4px" }}>회차 제목</th>
                    <th style={{ padding: "8px 4px", width: "100px" }}>
                      본문 글자수
                    </th>
                    <th style={{ padding: "8px 4px", width: "100px" }}>상태</th>
                    <th style={{ padding: "8px 4px", width: "80px" }}>
                      잠금 구분
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedChapters.map((chapter, idx) => {
                    const statusInfo = itemStatuses[idx] || { status: "idle" };
                    const isCurrent =
                      idx === currentBatchIndex && batchStatus === "running";

                    let badgeColor = "rgba(255,255,255,0.3)";
                    let badgeText = "대기";
                    if (statusInfo.status === "running") {
                      badgeColor = "#fca834";
                      badgeText = "연성 중...";
                    } else if (statusInfo.status === "success") {
                      badgeColor = "#34c759";
                      badgeText = "완료";
                    } else if (statusInfo.status === "error") {
                      badgeColor = "#ff453a";
                      badgeText = "실패";
                    }

                    const actualLocked = getEpisodeLockedStatus(chapter.id);

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: isCurrent
                            ? "rgba(255, 42, 95, 0.08)"
                            : "transparent",
                        }}
                      >
                        <td style={{ padding: "6px 4px" }}>
                          <input
                            type="text"
                            value={chapter.id}
                            onChange={(e) =>
                              updateParsedChapter(idx, "id", e.target.value)
                            }
                            disabled={batchStatus === "running"}
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "4px",
                              color: "white",
                              padding: "4px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          />
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) =>
                              updateParsedChapter(idx, "title", e.target.value)
                            }
                            disabled={batchStatus === "running"}
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "4px",
                              color: "white",
                              padding: "4px 8px",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td style={{ padding: "8px 4px", opacity: 0.7 }}>
                          {chapter.text.length.toLocaleString()} 자
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: "bold",
                              color: badgeColor,
                              background: badgeColor + "1a",
                              border: `1px solid ${badgeColor}`,
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                            title={statusInfo.errorMsg}
                          >
                            {badgeText}
                          </span>
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: actualLocked ? "#ff453a" : "#34c759",
                            }}
                          >
                            {actualLocked ? "🔒 유료" : "🔓 무료"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 일괄 컨트롤 영역 */}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {batchStatus === "idle" && (
                <button
                  type="button"
                  onClick={() => runBatch(0)}
                  className="btn-submit"
                  style={{ flex: 1 }}
                >
                  🚀 일괄 오디오 연성 시작 ({parsedChapters.length}개 회차)
                </button>
              )}
              {batchStatus === "running" && (
                <button
                  type="button"
                  onClick={pauseBatch}
                  className="btn-submit"
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, #fca834 0%, #ff7f00 100%)",
                  }}
                >
                  ⏸️ 일괄 연성 일시 정지 (현재 {currentBatchIndex + 1}번째 진행
                  중)
                </button>
              )}
              {batchStatus === "paused" && (
                <>
                  <button
                    type="button"
                    onClick={resumeBatch}
                    className="btn-submit"
                    style={{ flex: 1 }}
                  >
                    ▶️ 연성 재개 ({currentBatchIndex + 1}번째부터 시작)
                  </button>
                  <button
                    type="button"
                    onClick={cancelBatch}
                    className="btn-submit"
                    style={{
                      width: "120px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    ❌ 초기화
                  </button>
                </>
              )}
              {(batchStatus === "success" || batchStatus === "error") && (
                <button
                  type="button"
                  onClick={cancelBatch}
                  className="btn-submit"
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  🔄 목록 초기화 및 완료 확인
                </button>
              )}
            </div>

            {/* 전체 진행률바 */}
            {batchStatus !== "idle" && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <span>전체 일괄 연성 진행도</span>
                  <span>
                    {Math.round(
                      (currentBatchIndex / parsedChapters.length) * 100,
                    )}
                    % ({currentBatchIndex} / {parsedChapters.length})
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(currentBatchIndex / parsedChapters.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. TTS 오디오 자동 연성기 */}
      <form onSubmit={handleTtsSubmit} className="card-panel">
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          🎙️ TTS 오디오 자동 연성기 (edge-tts)
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          소설 텍스트 파일을 첨부하거나 입력하면 목소리를 입혀 mp3 파일로
          제작하고, Cloudflare R2에 업로드한 뒤 홈페이지에 즉시 새 회차로
          반영합니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">대상 소설 작품 선택</label>
            <select
              className="form-select"
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
            >
              {worksList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">공개 예정 일시</label>
            <input
              type="datetime-local"
              className="form-input"
              value={episodeReleaseDate}
              onChange={(e) => setEpisodeReleaseDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">멤버십 전용 설정</label>
            <label
              className="form-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                height: "42px",
                color: "#ff2a5f",
              }}
            >
              <input
                type="checkbox"
                checked={ttsIsMembershipOnly}
                onChange={(e) => setTtsIsMembershipOnly(e.target.checked)}
              />
              👑 멤버십 전용으로 지정
            </label>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">회차 번호 (숫자)</label>
            <input
              type="text"
              className="form-input"
              placeholder="1"
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">회차 제목</label>
            <input
              type="text"
              className="form-input"
              placeholder="1화: 강호에 피는 꽃"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">잠금 상태 설정</label>
            <select
              className="form-select"
              value={episodeLocked}
              onChange={(e) => setEpisodeLocked(e.target.value as any)}
            >
              <option value="auto">작품 설정에 따라 자동 무료/유료 분리</option>
              <option value="free">🔓 전체 무료회차로 지정</option>
              <option value="locked">🔒 전체 유료회차로 지정</option>
            </select>
          </div>
        </div>

        {/* 목소리 톤 프리셋 설정 */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            padding: 18,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            🔊 성우 및 목소리 톤 프리셋
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              { id: "karisma", label: "🗡️ 카리스마 무협 (인준, 동굴음)" },
              { id: "oe-yu", label: "🦉 외유내강 (현수, 고결함)" },
              { id: "cave", label: "🌲 진중 판타지 (인준, 느림)" },
              { id: "romance", label: "🌸 로맨스 남주 (현수, 부드러움)" },
              {
                id: "modern-fantasy",
                label: "⚡ 현대 판타지 (현수, 지루함없음)",
              },
              { id: "furious", label: "🔥 분노/화남 (빠르고 날카롭게)" },
              { id: "calm", label: "🍃 차분/따뜻 (느리고 포근하게)" },
              { id: "custom", label: "⚙️ 사용자 직접 조절" },
            ].map((p) => (
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
                  background:
                    preset === p.id
                      ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    preset === p.id
                      ? "1px solid #ff2a5f"
                      : "1px solid rgba(255,255,255,0.12)",
                  color: preset === p.id ? "white" : "rgba(255,255,255,0.7)",
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">AI 성우 선택</label>
              <select
                className="form-select"
                value={voice}
                onChange={(e) => {
                  setVoice(e.target.value);
                  setPreset("custom");
                }}
                disabled={preset !== "custom"}
              >
                <optgroup label="무료 성우 (Microsoft Edge)">
                  <option value="ko-KR-InJoonNeural">
                    Standard InJoon (인준 - 차분함, 신뢰감, 남성)
                  </option>
                  <option value="ko-KR-HyunsuNeural">
                    Standard Hyunsu (현수 - 부드러움, 중저음, 남성)
                  </option>
                  <option value="ko-KR-SunHiNeural">
                    Standard SunHi (선희 - 하이톤, 맑고 또렷함, 여성)
                  </option>
                </optgroup>
                <optgroup label="구글 클라우드 프리미엄 성우 (Google Cloud TTS - GOOGLE_API_KEY 필요)">
                  <option value="ko-KR-Neural2-B">
                    Premium Neural2-B (남성 - 묵직한 중저음 성우, 강인함 -
                    추천!)
                  </option>
                  <option value="ko-KR-Neural2-C">
                    Premium Neural2-C (여성 - 차분하고 따뜻함)
                  </option>
                  <option value="ko-KR-Neural2-A">
                    Premium Neural2-A (여성 - 맑고 생기 넘침)
                  </option>
                  <option value="ko-KR-Wavenet-D">
                    Premium Wavenet-D (남성 - 신뢰감 있는 아나운서)
                  </option>
                  <option value="ko-KR-Wavenet-B">
                    Premium Wavenet-B (남성 - 부드러운 중저음)
                  </option>
                </optgroup>
                <optgroup label="유료 프리미엄 성우 (OpenAI - OPENAI_API_KEY 필요)">
                  <option value="onyx">
                    Premium Onyx (오닉스 - 묵직한 중저음, 강인함, 남성)
                  </option>
                  <option value="echo">
                    Premium Echo (에코 - 따뜻함, 친근함, 남성)
                  </option>
                  <option value="fable">
                    Premium Fable (페이블 - 서사적, 냉철함, 남성)
                  </option>
                  <option value="alloy">
                    Premium Alloy (얼로이 - 중립적, 신뢰감, 남성)
                  </option>
                  <option value="nova">
                    Premium Nova (노바 - 활기참, 하이톤, 여성)
                  </option>
                  <option value="shimmer">
                    Premium Shimmer (쉬머 - 프로페셔널, 차분함, 여성)
                  </option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">🔊 특수 효과음 필터 (FFmpeg)</label>
              <select
                className="form-select"
                value={effect}
                onChange={(e) => setEffect(e.target.value)}
              >
                <option value="none">없음 (기본 목소리)</option>
                <option value="echo">🏛️ 웅장한 울림 (동굴/독백 효과)</option>
                <option value="radio">
                  📻 무전기/전화기 (기계적 감쇠 효과)
                </option>
                <option value="robot">🤖 기계음/로봇 (SF 괴물 효과)</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">음높이 (Pitch): {pitch}</label>
              <input
                type="range"
                min="-30"
                max="30"
                value={
                  preset === "custom" ? customPitchVal : parseInt(pitch) || 0
                }
                disabled={preset !== "custom"}
                onChange={(e) =>
                  handleCustomPitchChange(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                -30Hz (극저음/동굴음) ~ +30Hz (하이톤)
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">속도 (Rate): {rate}</label>
              <input
                type="range"
                min="-30"
                max="30"
                value={
                  preset === "custom" ? customRateVal : parseInt(rate) || 0
                }
                disabled={preset !== "custom"}
                onChange={(e) => handleCustomRateChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                -30% (천천히) ~ +30% (빠르게)
              </span>
            </div>
          </div>

          {/* 목소리 미리듣기 테스트 */}
          <div
            style={{
              marginTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 16,
            }}
          >
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label
                className="form-label"
                style={{ fontSize: 12, opacity: 0.8 }}
              >
                미리듣기 테스트 문장
              </label>
              <textarea
                className="form-textarea"
                rows={5}
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                style={{
                  fontSize: 13,
                  padding: "10px",
                  resize: "vertical",
                  width: "100%",
                }}
              />
            </div>

            {/* 재생 중 실시간 반영 안내 */}
            {isPreviewPlaying && (
              <div
                style={{
                  marginBottom: 10,
                  padding: "8px 12px",
                  background: "rgba(255,215,0,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,215,0,0.25)",
                  fontSize: 12,
                  color: "#ffd700",
                }}
              >
                ⚡ 위 <strong>음높이 · 속도</strong> 슬라이더를 움직이면 지금
                재생 중인 음성에 즉시 반영됩니다
              </div>
            )}

            {/* 버튼 행 */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={handlePlayPreview}
                disabled={previewLoading}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: "8px",
                  border: "none",
                  background: isPreviewPlaying ? "#ff3b30" : "#ffd700",
                  color: isPreviewPlaying ? "white" : "#2b1d00",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: previewLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {previewLoading
                  ? "🔊 생성 중..."
                  : isPreviewPlaying
                    ? "⏹️ 정지"
                    : "🎧 톤 미리듣기"}
              </button>
              {/* 다시듣기: 현재 음높이/속도/목소리 설정으로 서버 재연성 */}
              {previewAudioBuffer && (
                <button
                  type="button"
                  onClick={handleReplayPreview}
                  disabled={previewLoading}
                  title="음높이·속도·이펙트 슬라이더 조절 후 클릭 → 새 설정으로 재연성 후 재생"
                  style={{
                    height: 40,
                    padding: "0 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: previewLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  🔁 다시듣기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 텍스트 파일 입력 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">
              소설 본문 텍스트 파일 (.txt) 업로드
            </label>
            <input
              type="file"
              accept=".txt"
              multiple
              onChange={handleTxtFileChange}
              className="form-input"
            />
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              * 파일 여러 개를 선택하면 자동으로 내용이 순서대로 합쳐집니다.
            </span>
          </div>
          {txtFiles.length > 0 && (
            <div
              style={{
                alignSelf: "center",
                fontSize: 13,
                color: "#34c759",
                fontWeight: 700,
              }}
            >
              ✅ {txtFiles.length}개 파일 로드 완료 (총{" "}
              {(txtFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)}{" "}
              KB)
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: "normal",
                  marginTop: 4,
                  maxHeight: 80,
                  overflowY: "auto",
                }}
              >
                {txtFiles.map((f, i) => (
                  <div key={i}>- {f.name}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            본문 텍스트 직접 입력/수정 (본문 {textInput.length}글자)
          </label>
          <textarea
            className="form-textarea"
            rows={10}
            placeholder="소설의 본문을 입력해 주세요. 위의 파일 업로드를 사용해 텍스트 파일을 불러오셔도 됩니다."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
        </div>

        {ttsStatus !== "idle" && (
          <div
            style={{
              background:
                ttsStatus === "success"
                  ? "rgba(52,199,89,0.1)"
                  : ttsStatus === "error"
                    ? "rgba(255,59,48,0.1)"
                    : "rgba(252,168,52,0.1)",
              border: `1px solid ${ttsStatus === "success" ? "#34c759" : ttsStatus === "error" ? "#ff3b30" : "#fca834"}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color:
                  ttsStatus === "success"
                    ? "#34c759"
                    : ttsStatus === "error"
                      ? "#ff3b30"
                      : "#fca834",
              }}
            >
              {ttsStatus === "tts" &&
                "🎙️ AI 성우가 소설을 낭독하는 중입니다 (오디오 파일 굽는 중)..."}
              {ttsStatus === "upload" &&
                "☁️ 생성된 오디오 파일을 Cloudflare R2 스토리지에 업로드하는 중..."}
              {ttsStatus === "db" &&
                "💾 데이터베이스에 에피소드를 등록 및 노출하는 중..."}
              {ttsStatus === "success" &&
                "🎉 [완료] 오디오가 정상적으로 연성 및 업로드되어 홈페이지에 즉시 발행되었습니다!"}
              {ttsStatus === "error" && `❌ 연성 에러 발생: ${errorMsg}`}
            </div>
            {ttsStatus !== "success" && ttsStatus !== "error" && (
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                * 브루(Vrew) 작업과 파일 R2 수동 업로드, DB 등록 작업이
                백그라운드에서 한 번에 묶여 동작합니다.
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn-submit"
          disabled={
            ttsStatus === "tts" || ttsStatus === "upload" || ttsStatus === "db"
          }
        >
          {ttsStatus === "tts" || ttsStatus === "upload" || ttsStatus === "db"
            ? "🔄 오디오 연성 및 자동 퍼블리싱 진행 중..."
            : `🚀 오디오 자동 연성 및 홈페이지 반영 시작`}
        </button>
      </form>
    </div>
  );
}
