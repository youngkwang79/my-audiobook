"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EMOJI_LIST } from "../utils/constants";

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

export default function WebPushPanel() {
  const pushTitleRef = useRef<HTMLInputElement>(null);
  const pushBodyRef = useRef<HTMLTextAreaElement>(null);
  const dailyTitleRef = useRef<HTMLInputElement>(null);
  const dailyBodyRef = useRef<HTMLTextAreaElement>(null);

  // --- 수동 푸시 상태 ---
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);
  const [pushScheduleType, setPushScheduleType] = useState<"instant" | "scheduled">("instant");
  const [pushScheduledTime, setPushScheduledTime] = useState("");

  // --- 매일 자동 발송 상태 ---
  const [dailyTitle, setDailyTitle] = useState("");
  const [dailyBody, setDailyBody] = useState("");
  const [dailyUrl, setDailyUrl] = useState("/checkin");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailySendHour, setDailySendHour] = useState(8);

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

  useEffect(() => {
    fetchDailyPushSettings();
  }, []);

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

  return (
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
            <label className="form-label">예약 발송 일시 설정 (KST)</label>
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
          <label className="form-label">클릭 시 이동할 링크 주소 (선택)</label>
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
            * 기본값은 메인 화면(/)입니다. 출석체크 알림인 경우 /checkin 을 적어주시면 됩니다.
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
              발송 완료: <strong>{pushResult.successCount}건</strong> | 실패(연결 종료):{" "}
              <strong>{pushResult.failCount}건</strong>
            </div>
            {pushResult.cleanedCount > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                }}
              >
                * 만료된 브라우저 구독 정보 {pushResult.cleanedCount}개가 DB에서 자동 정리되었습니다.
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

      <form onSubmit={handleDailyPushSave} className="card-panel" style={{ marginTop: 24 }}>
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
          동의한 모든 유저에게 자동 전송되는 출석/일일보상 푸시 문구를 편집합니다.
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
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
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
              <EmojiPickerChips
                onSelect={(emoji) => insertEmoji(dailyTitleRef, dailyTitle, setDailyTitle, emoji)}
              />
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
              <EmojiPickerChips
                onSelect={(emoji) => insertEmoji(dailyBodyRef, dailyBody, setDailyBody, emoji)}
              />
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
              {dailySaving ? "자동 발송 설정 저장 중..." : "매일 자동 발송 설정 저장하기"}
            </button>
          </>
        )}
      </form>
    </>
  );
}
