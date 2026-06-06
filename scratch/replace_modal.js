const fs = require("fs");
const path = "d:/소설 유투브/my-audiobook/my_audiobook/app/community/page.tsx";
let content = fs.readFileSync(path, "utf-8");

const startToken = `              <h2 className="detail-title">{detailPost.title}</h2>`;
const endToken = `              </div>`; // This is the end of detail-actions

const startIdx = content.indexOf(startToken);
// Find the closing div of detail-actions which is after startIdx
const detailActionsIdx = content.indexOf(`              {/* 추천 버튼 */}`, startIdx);
const endIdx = content.indexOf(endToken, detailActionsIdx) + endToken.length;

if (startIdx !== -1 && endIdx !== -1) {
  console.log("Found startToken at:", startIdx);
  console.log("Found endToken at:", endIdx);
  
  const replacement = `{isEditing ? (
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

  const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(path, newContent, "utf-8");
  console.log("Successfully replaced modal content using safe nested replace!");
} else {
  console.log("Tokens not found!");
}
