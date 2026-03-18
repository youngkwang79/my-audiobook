"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

type CommentItem = {
  id: string;
  user_email: string | null;
  content: string;
  created_at: string;
};

type Props = {
  workId: string;
  episodeId: string;
};

export default function Comments({ workId, episodeId }: Props) {
  const { user, loading } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const loadComments = async () => {
    const qs = new URLSearchParams({
      work_id: workId,
      episode_id: episodeId,
    });

    const res = await fetch(`/api/comments?${qs.toString()}`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    setComments(Array.isArray(data?.comments) ? data.comments : []);
  };

  useEffect(() => {
    loadComments();
  }, [workId, episodeId]);

  const onSubmit = async () => {
    if (!content.trim()) return;

    setBusy(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          work_id: workId,
          episode_id: episodeId,
          content: content.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === "unauthorized") {
          alert("로그인이 필요합니다.");
          return;
        }

        alert("댓글 등록에 실패했습니다.");
        return;
      }

      setContent("");
      loadComments();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 18,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 20, fontWeight: 900 }}>댓글</h2>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            loading
              ? "로딩 중..."
              : user
              ? "댓글을 입력해 주세요."
              : "로그인 후 댓글을 작성할 수 있습니다."
          }
          disabled={!user || busy}
          maxLength={500}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            resize: "vertical",
          }}
        />

        <button
          onClick={onSubmit}
          disabled={!user || busy || !content.trim()}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,215,120,0.7)",
            background:
              "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
            color: "#2b1d00",
            fontWeight: 950,
            cursor: !user || busy ? "not-allowed" : "pointer",
            opacity: !user || busy ? 0.6 : 1,
          }}
        >
          {busy ? "등록 중..." : "댓글 등록"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {comments.length === 0 ? (
          <div style={{ opacity: 0.7 }}>첫 댓글을 남겨보세요.</div>
        ) : (
          comments.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                {item.user_email ?? "익명"} · {new Date(item.created_at).toLocaleString("ko-KR")}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{item.content}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}