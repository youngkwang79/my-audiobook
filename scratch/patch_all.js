const fs = require("fs");
const path = "d:/소설 유투브/my-audiobook/my_audiobook/app/community/page.tsx";
let content = fs.readFileSync(path, "utf-8");

// Convert everything to LF to prevent CRLF matching failures
const originalWithLF = content.replace(/\r\n/g, "\n");
let workingContent = originalWithLF;

const stateTarget = `  // 모달 상태
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<any | null>(null);`;

const stateReplacement = `  // 모달 상태
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<any | null>(null);

  // 관리자 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 수정/삭제/숨김 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editingBusy, setEditingBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);

  const handleStartEdit = () => {
    if (!detailPost) return;
    setEditTitle(detailPost.title);
    setEditContent(detailPost.content);
    setEditCategory(detailPost.category);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    setEditingBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/community/posts", {
        method: "PUT",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: detailPost.id,
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "수정 실패");
      
      alert("글이 성공적으로 수정되었습니다.");
      setIsEditing(false);
      setDetailPost((prev: any) => ({
        ...prev,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
      }));
      loadPosts();
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    } finally {
      setEditingBusy(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("정말로 이 서신을 파기(삭제)하시겠습니까?")) return;
    setDeleteBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(\`/api/community/posts?id=\${detailPost.id}\`, {
        method: "DELETE",
        headers: {
          Authorization: \`Bearer \${token}\`,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "삭제 실패");
      
      alert("서신이 정상적으로 파기되었습니다.");
      handleCloseDetail();
      loadPosts();
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleToggleHide = async () => {
    const nextHidden = !detailPost.is_hidden;
    const confirmMsg = nextHidden
      ? "이 서신을 강호 동도들에게 보이지 않게 숨기시겠습니까?"
      : "이 서신의 숨김을 해제하여 모든 동도들에게 노출하시겠습니까?";
    if (!window.confirm(confirmMsg)) return;

    setHideBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/community/posts", {
        method: "PUT",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: detailPost.id,
          is_hidden: nextHidden,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "처리 실패");
      
      alert(nextHidden ? "숨김 처리 완료" : "숨김 해제 완료");
      setDetailPost((prev: any) => ({
        ...prev,
        is_hidden: nextHidden,
      }));
      loadPosts();
    } catch (err: any) {
      alert(err.message ?? "오류가 발생했습니다.");
    } finally {
      setHideBusy(false);
    }
  };`;

const closeDetailTarget = `  const handleCloseDetail = () => {
    setDetailPost(null);
    setComments([]);
  };`;

const closeDetailReplacement = `  const handleCloseDetail = () => {
    setDetailPost(null);
    setComments([]);
    setIsEditing(false);
  };`;

const loadPostsTarget = `      if (res.ok && data?.posts) {
        setPosts(data.posts);
      }`;

const loadPostsReplacement = `      if (res.ok && data?.posts) {
        setPosts(data.posts);
        if (data.isAdmin !== undefined) {
          setIsAdmin(data.isAdmin);
        }
      }`;

// Restore file from git to perform clean replacements
const { execSync } = require("child_process");
execSync("git checkout app/community/page.tsx");

// Read clean content again
content = fs.readFileSync(path, "utf-8");
let freshLF = content.replace(/\r\n/g, "\n");

// Re-apply states and closeDetail and loadPosts
if (freshLF.includes(stateTarget)) {
  freshLF = freshLF.replace(stateTarget, stateReplacement);
}
if (freshLF.includes(closeDetailTarget)) {
  freshLF = freshLF.replace(closeDetailTarget, closeDetailReplacement);
}
if (freshLF.includes(loadPostsTarget)) {
  freshLF = freshLF.replace(loadPostsTarget, loadPostsReplacement);
}

// Re-apply the modal index splitting replacement
const startToken = `              <h2 className="detail-title">{detailPost.title}</h2>`;
const endToken = `              </div>`; // This is the end of detail-actions

const startIdx = freshLF.indexOf(startToken);
const detailActionsIdx = freshLF.indexOf(`              {/* 추천 버튼 */}`, startIdx);
const endIdx = freshLF.indexOf(endToken, detailActionsIdx) + endToken.length;

if (startIdx !== -1 && endIdx !== -1) {
  const modalReplacement = `{isEditing ? (
                <form onSubmit={handleEditSubmit}>
                  <div className="form-group">
                    <label className="form-label">문파 전령 분류</label>
                    <select
                      className="form-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      {CATEGORIES.slice(1).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">제목</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">내용</label>
                    <textarea
                      className="form-textarea"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={2000}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={handleCancelEdit}
                      style={{ background: "rgba(255, 255, 255, 0.08)", color: "#8c8c96", marginTop: 0 }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={editingBusy}
                      style={{ marginTop: 0 }}
                    >
                      {editingBusy ? "수정 중..." : "수정 완료"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="detail-title">
                    {detailPost.is_hidden && (
                      <span style={{ color: "#ff2a5f", fontSize: 13, marginRight: 6 }}>[숨김]</span>
                    )}
                    {detailPost.title}
                  </h2>
                  <div className="detail-meta">
                    <div className="author-info">
                      <span className="author-badge">
                        {detailPost.author_faction} / {detailPost.author_realm}
                      </span>
                      <span style={{ fontWeight: 800 }}>{detailPost.username}</span>
                    </div>
                    <span>{new Date(detailPost.created_at).toLocaleString()}</span>
                  </div>
                  <div className="detail-content">{detailPost.content}</div>

                  {/* 본인 수정/삭제 및 관리자 기능 */}
                  {user && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 20 }}>
                      {user.id === detailPost.user_id && (
                        <button
                          onClick={handleStartEdit}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.16)",
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          수정
                        </button>
                      )}
                      {(user.id === detailPost.user_id || isAdmin) && (
                        <button
                          onClick={handleDeletePost}
                          disabled={deleteBusy}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255, 42, 95, 0.2)",
                            background: "rgba(255, 42, 95, 0.08)",
                            color: "#ff2a5f",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {deleteBusy ? "삭제 중..." : "삭제"}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={handleToggleHide}
                          disabled={hideBusy}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255, 215, 0, 0.3)",
                            background: "rgba(255, 215, 0, 0.08)",
                            color: "#ffd700",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {hideBusy ? "처리 중..." : detailPost.is_hidden ? "숨김 해제" : "숨기기"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 추천 버튼 */}
                  <div className="detail-actions">
                    <button
                      id="btn-recommend-post"
                      className={\`recommend-btn \${detailPost.isLiked ? "active" : ""}\`}
                      onClick={(e) => handleLikeToggle(detailPost.id, e)}
                    >
                      <span>{detailPost.isLiked ? "❤️" : "🤍"}</span>
                      <span>천하 경의 {detailPost.likes_count}</span>
                    </button>
                  </div>
                </>
              )}`;

  freshLF = freshLF.substring(0, startIdx) + modalReplacement + freshLF.substring(endIdx);
}

const finalContent = content.includes("\r\n") ? freshLF.replace(/\n/g, "\r\n") : freshLF;
fs.writeFileSync(path, finalContent, "utf-8");
console.log("Successfully restored, patched, and cleaned up community page code!");
