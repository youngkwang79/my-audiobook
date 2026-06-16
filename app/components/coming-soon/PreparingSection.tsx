"use client";

import React from "react";

interface PreparingSectionProps {
  preparingWorks: any[];
}

export default function PreparingSection({ preparingWorks }: PreparingSectionProps) {
  if (preparingWorks.length === 0) return null;

  return (
    <div className="preparing-section" style={{ marginTop: "32px", marginBottom: "24px" }}>
      <h2 
        className="section-title" 
        style={{ 
          fontSize: "16px", 
          fontWeight: 800, 
          color: "rgba(255, 255, 255, 0.85)", 
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span style={{ fontSize: "14px" }}>⚙️</span> 집필 및 공개 준비 중
      </h2>

      <div 
        className="preparing-grid" 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px 10px",
        }}
      >
        <style>{`
          @media (min-width: 600px) {
            .preparing-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              gap: 16px !important;
            }
          }
          @media (min-width: 1024px) {
            .preparing-grid {
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
              gap: 20px !important;
            }
          }

          .preparing-card {
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.6) 0%, rgba(10, 10, 15, 0.8) 100%);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: all 0.25s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .preparing-card:hover {
            transform: translateY(-4px);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
          }

          .preparing-thumb-container {
            width: 100%;
            aspect-ratio: 2 / 3;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            background: #0f0f15;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .preparing-thumb-blur {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: blur(12px) brightness(0.4);
            opacity: 0.85;
            transition: all 0.3s ease;
          }

          .preparing-card:hover .preparing-thumb-blur {
            filter: blur(8px) brightness(0.5);
            transform: scale(1.05);
          }

          .preparing-overlay {
            position: absolute;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
          }

          .preparing-icon {
            font-size: 20px;
            background: rgba(255, 255, 255, 0.1);
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.15);
            animation: pulse-ring 2s infinite;
          }

          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.15); }
            70% { box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }

          .preparing-badge-text {
            font-size: 10px;
            font-weight: 800;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            padding: 2px 8px;
            border-radius: 20px;
            color: #ffffff;
            letter-spacing: -0.3px;
          }

          .preparing-title {
            font-size: 13px;
            font-weight: 800;
            line-height: 1.35;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            height: 35px;
            word-break: keep-all;
          }

          .preparing-subtitle {
            font-size: 11px;
            font-weight: 500;
            color: #636370;
            margin: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `}</style>

        {preparingWorks.map((work) => (
          <div key={work.id} className="preparing-card">
            <div className="preparing-thumb-container">
              {work.thumbnail ? (
                <img 
                  src={work.thumbnail} 
                  alt={work.title} 
                  className="preparing-thumb-blur"
                />
              ) : (
                <div className="preparing-thumb-blur" style={{ background: "#1c1c24" }} />
              )}
              
              <div className="preparing-overlay">
                <div className="preparing-icon">🔒</div>
                <span className="preparing-badge-text">집필중</span>
              </div>
            </div>

            <div style={{ padding: "0 2px", display: "flex", flexDirection: "column", gap: "2px" }}>
              <h3 className="preparing-title">{work.title}</h3>
              <p className="preparing-subtitle">{work.subtitle || "기획 단계"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
