"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/app/lib/supabaseClient";

type CommentItem = {
  id: string;
  user_id: string;
  user_email: string | null;
  content: string;
  created_at: string;
  updated_at?: string | null;
  is_hidden?: boolean;
};

type Props = {
  workId: string;
  episodeId: string;
};

async function getAccessToken() {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return null;
  return session?.access_token ?? null;
}

export default function Comments({ workId, episodeId }: Props) {
  const { user, loading } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingBusy, setEditingBusy] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [hideBusyId, setHideBusyId] = useState<string | null>(null);

  const loadComments = async () => {
    const qs = new URLSearchParams({
      work_id: workId,
      episode_id: episodeId,
    });

    const token = await getAccessToken();

    const res = await fetch(`/api/comments?${qs.toString()}`, {
      cache: "no-store",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    const data = await res.json().catch(() => null);
    setComments(Array.isArray(data?.comments) ? data.comments : []);
    setIsAdmin(!!data?.isAdmin);
  };

  useEffect(() => {
    loadComments();
  }, [workId, episodeId]);

  const onSubmit = async () => {
    if (!content.trim()) return;

    setBusy(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인 세션을 찾을 수 없습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          work_id: workId,
          episode_id: episodeId,
          content: content.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("comment submit error:", data);

        if (data?.error === "unauthorized" || data?.error === "user_error") {
          alert(`로그인이 필요합니다. (${data?.detail ?? data?.error ?? "auth_error"})`);
          return;
        }

        alert(`댓글 등록 실패: ${data?.detail ?? data?.error ?? "unknown_error"}`);
        return;
      }

      setContent("");
      loadComments();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item: CommentItem) => {
    setEditingId(item.id);
    setEditingContent(item.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const onSaveEdit = async (commentId: string) => {
    if (!editingContent.trim()) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    setEditingBusy(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인 세션을 찾을 수 없습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editingContent.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("comment edit error:", data);
        alert(`댓글 수정 실패: ${data?.detail ?? data?.error ?? "unknown_error"}`);
        return;
      }

      setEditingId(null);
      setEditingContent("");
      loadComments();
    } finally {
      setEditingBusy(false);
    }
  };

  const onDelete = async (commentId: string) => {
    const ok = window.confirm("이 댓글을 삭제할까요?");
    if (!ok) return;

    setDeletingId(commentId);

    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인 세션을 찾을 수 없습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("comment delete error:", data);
        alert(`댓글 삭제 실패: ${data?.detail ?? data?.error ?? "unknown_error"}`);
        return;
      }

      loadComments();
    } finally {
      setDeletingId(null);
    }
  };

  const onToggleHide = async (commentId: string, nextHidden: boolean) => {
    setHideBusyId(commentId);

    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인 세션을 찾을 수 없습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_hidden: nextHidden,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("comment hide error:", data);
        alert(`숨김 처리 실패: ${data?.detail ?? data?.error ?? "unknown_error"}`);
        return;
      }

      loadComments();
    } finally {
      setHideBusyId(null);
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
          comments.map((item) => {
            const isMine = !!user && item.user_id === user.id;
            const isEditing = editingId === item.id;
            const isEdited =
              !!item.updated_at &&
              new Date(item.updated_at).getTime() > new Date(item.created_at).getTime();

            return (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: item.is_hidden
                    ? "rgba(255,120,120,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: item.is_hidden
                    ? "1px solid rgba(255,120,120,0.18)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {item.user_email ?? "익명"} ·{" "}
                    {new Date(item.created_at).toLocaleString("ko-KR")}
                    {isEdited ? " · 수정됨" : ""}
                    {item.is_hidden ? " · 숨김됨" : ""}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isMine && !isEditing && (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.16)",
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          수정
                        </button>

                        <button
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.16)",
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                            cursor: deletingId === item.id ? "not-allowed" : "pointer",
                            opacity: deletingId === item.id ? 0.6 : 1,
                            fontSize: 12,
                          }}
                        >
                          {deletingId === item.id ? "삭제 중..." : "삭제"}
                        </button>
                      </>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => onToggleHide(item.id, !item.is_hidden)}
                        disabled={hideBusyId === item.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          color: "white",
                          cursor: hideBusyId === item.id ? "not-allowed" : "pointer",
                          opacity: hideBusyId === item.id ? 0.6 : 1,
                          fontSize: 12,
                        }}
                      >
                        {hideBusyId === item.id
                          ? "처리 중..."
                          : item.is_hidden
                          ? "숨김 해제"
                          : "숨기기"}
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
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

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={cancelEdit}
                        disabled={editingBusy}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          color: "white",
                          cursor: editingBusy ? "not-allowed" : "pointer",
                          opacity: editingBusy ? 0.6 : 1,
                        }}
                      >
                        취소
                      </button>

                      <button
                        onClick={() => onSaveEdit(item.id)}
                        disabled={editingBusy || !editingContent.trim()}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,215,120,0.7)",
                          background:
                            "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                          color: "#2b1d00",
                          fontWeight: 900,
                          cursor:
                            editingBusy || !editingContent.trim() ? "not-allowed" : "pointer",
                          opacity: editingBusy || !editingContent.trim() ? 0.6 : 1,
                        }}
                      >
                        {editingBusy ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {item.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}