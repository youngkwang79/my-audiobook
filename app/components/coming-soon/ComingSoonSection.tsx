"use client";

import { useEffect, useState } from "react";
import WorkPosterCard from "@/app/components/work/WorkPosterCard";

// SVG 아이콘 컴포넌트
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function CheckIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

interface ComingSoonSectionProps {
  comingSoonWorks: any[];
  shouldPulse: boolean;
}

export default function ComingSoonSection({ comingSoonWorks, shouldPulse }: ComingSoonSectionProps) {
  const [alarmSettings, setAlarmSettings] = useState<Record<string, boolean>>({});

  // 알림 설정 로컬스토리지 연동
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alarmSettings");
      if (saved) {
        setAlarmSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRequestNotification = async (workId: string) => {
    const isSet = alarmSettings[workId];
    if (isSet) {
      const updated = { ...alarmSettings, [workId]: false };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 해제되었습니다.");
      return;
    }

    if (!("Notification" in window)) {
      const updated = { ...alarmSettings, [workId]: true };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 완료되었습니다! (알림을 지원하지 않는 브라우저이므로 설정만 완료되었습니다)");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...alarmSettings, [workId]: true };
        setAlarmSettings(updated);
        localStorage.setItem("alarmSettings", JSON.stringify(updated));
        alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
      } else {
        alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
      }
    } catch (error) {
      Notification.requestPermission((permission) => {
        if (permission === "granted") {
          const updated = { ...alarmSettings, [workId]: true };
          setAlarmSettings(updated);
          localStorage.setItem("alarmSettings", JSON.stringify(updated));
          alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
        } else {
          alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
        }
      });
    }
  };

  // scheduledReleaseDate 기준 날짜 그룹핑
  const groups: { dateLabel: string; time: number; works: any[] }[] = [];
  comingSoonWorks.forEach((work) => {
    let dateLabel = "";
    let time = 0;
    if (work.scheduledReleaseDate) {
      const d = new Date(work.scheduledReleaseDate);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dateLabel = `${mm}. ${dd}.`;
      time = d.getTime();
    }
    const existing = groups.find((g) => g.dateLabel === dateLabel);
    if (existing) {
      existing.works.push(work);
    } else {
      groups.push({ dateLabel, time, works: [work] });
    }
  });

  // 시간 오름차순 정렬
  groups.sort((a, b) => a.time - b.time);

  return (
    <div className="coming-soon-section" id="coming-soon-section">
      <h2 className="section-title">공개 예정</h2>

      {comingSoonWorks.length > 0 ? (
        <>
          {groups.map((group) => (
            <div key={group.dateLabel}>
              {group.dateLabel && (
                <div className="coming-soon-date-header">
                  <span className="coming-soon-date">{group.dateLabel}</span>
                  <div className="coming-soon-divider" />
                </div>
              )}
              <div className="coming-soon-grid">
                {group.works.map((work) => (
                  <div key={work.id} className="coming-soon-item-container">
                    <WorkPosterCard work={work} />
                    <button
                      className={`alarm-btn ${alarmSettings[work.id] ? "active" : ""} ${shouldPulse ? "pulse" : ""}`}
                      onClick={() => handleRequestNotification(work.id)}
                    >
                      {alarmSettings[work.id] ? (
                        <>
                          <CheckIconSmall />
                          <span>알림 설정 완료</span>
                        </>
                      ) : (
                        <>
                          <ClockIcon />
                          <span>알림 받기</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={{ padding: "30px 10px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "14px" }}>
          새로운 작품을 준비 중입니다.
        </div>
      )}
    </div>
  );
}
