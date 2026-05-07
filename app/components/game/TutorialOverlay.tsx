"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useGameStore, TUTORIAL_STEPS } from "@/app/lib/game/useGameStore";

export default function TutorialOverlay() {
  const game = useGameStore((s: any) => s.game);
  const completeTutorialStep = useGameStore((s: any) => s.completeTutorialStep);
  const prevTutorialStep = useGameStore((s: any) => s.prevTutorialStep);

  if (!game?.hasStarted) return null;

  const tutorialProgress = game?.tutorialProgress || {
    isActive: false,
    currentStepId: null,
    completedStepIds: [],
  };
  const { isActive, currentStepId } = tutorialProgress;
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [secondTargetRect, setSecondTargetRect] = useState<DOMRect | null>(
    null,
  );
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const step = currentStepId ? (TUTORIAL_STEPS as any)[currentStepId] : null;

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock/Unlock body scroll and Global Pause when tutorial is active/inactive
  useEffect(() => {
    if (isActive && step) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    } else {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.height = "auto";
      
      // Fail-safe: Ensure game resumes when tutorial is not active
      const state = useGameStore.getState() as any;
      if (state.game.isPaused || state.game.timeScale !== 1) {
        useGameStore.setState((s: any) => ({
          game: { ...s.game, isPaused: false, timeScale: 1 }
        }));
      }
    }

    return () => {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.height = "auto";

      // Fail-safe on unmount
      useGameStore.setState((s: any) => ({
        game: { ...s.game, isPaused: false, timeScale: 1 }
      }));
    };
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive || !step?.targetId) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }

      if (step.secondTargetId) {
        const el2 = document.getElementById(step.secondTargetId);
        if (el2) setSecondTargetRect(el2.getBoundingClientRect());
        else setSecondTargetRect(null);
      } else {
        setSecondTargetRect(null);
      }
    };

    updateRect();
    const timer = setInterval(updateRect, 100); // Poll for layout changes (Faster for responsiveness)
    return () => clearInterval(timer);
  }, [isActive, step]);

  if (!isActive || !step || !(TUTORIAL_STEPS as any)[currentStepId!]) {
    if (isActive) {
      // Auto-fix: Clear stuck/invalid tutorial state
      useGameStore.setState((s: any) => ({
        game: {
          ...s.game,
          isPaused: false,
          timeScale: 1,
          tutorialProgress: {
            ...s.game.tutorialProgress,
            isActive: false,
            currentStepId: null
          }
        }
      }));
    }
    return null;
  }

  const padding = 4;
  const hole = targetRect
    ? {
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        right: targetRect.right + padding,
        bottom: targetRect.bottom + padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        pointerEvents: "none",
      }}
    >
      {!hole && !secondTargetRect ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              step.actionType === "any" ? "rgba(0,0,0,0.7)" : "transparent",
            pointerEvents:
              step.actionType === "any" ||
              [
                "tower_unlock",
                "library_unlock",
                "library_cost_guide",
                "library_complete",
                "master_unlock",
                "inn_event",
                "restart_training",
              ].includes(step.id)
                ? "none"
                : "auto",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      ) : (
        <>
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <defs>
              <mask id="tutorial-mask">
                <rect width="100%" height="100%" fill="white" />
                {hole && (
                  <rect
                    x={hole.left}
                    y={hole.top}
                    width={hole.width}
                    height={hole.height}
                    rx="12"
                    fill="black"
                  />
                )}
                {secondTargetRect && (
                  <rect
                    x={secondTargetRect.left - 4}
                    y={secondTargetRect.top - 4}
                    width={secondTargetRect.width + 8}
                    height={secondTargetRect.height + 8}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.7)"
              mask="url(#tutorial-mask)"
              pointerEvents={
                step.actionType === "any" ||
                [
                  "tower_unlock",
                  "library_unlock",
                  "library_cost_guide",
                  "library_complete",
                  "master_unlock",
                  "inn_event",
                  "trance_achieved",
                  "forge_unlock",
                ].includes(step.id)
                  ? "none"
                  : "auto"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </svg>

          {/* Transparent Click Handler for the hole */}
          {hole && step.actionType === "click" && (
            <div
              style={{
                position: "absolute",
                left: hole.left,
                top: hole.top,
                width: hole.width,
                height: hole.height,
                pointerEvents: "auto",
                cursor: "pointer",
                zIndex: 100005,
              }}
              onClick={(e) => {
                const el = document.getElementById(step.targetId);
                if (el) {
                  completeTutorialStep(currentStepId!);
                  setTimeout(() => el.click(), 10);
                }
              }}
            />
          )}
        </>
      )}

      {/* Instruction Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            margin: "0 auto",
            top: [
              "select_item_to_refine",
              "select_item_to_reroll",
              "select_item_to_infuse",
            ].includes(step.id)
              ? "60%"
              : [
                    "click_refine_start",
                    "click_reroll_start",
                    "goto_forge_refine",
                  ].includes(step.id)
                ? "38%"
                : step.id === "select_refine_tab"
                  ? "32%"
                  : step.id === "select_item_inventory"
                    ? "35%"
                    : step.id === "check_quest"
                      ? "35%"
                      : step.id === "explain_mission_bar"
                        ? "38%"
                        : [
                            "click_status_detailed",
                            "explain_status_panel",
                            "explain_time_cycle",
                            "explain_auto_battle",
                            "auto_training_info",
                            "library_complete",
                            "library_cost_guide",
                          ].includes(step.id)
                        ? "28%"
                        : ["upgrade_mult_10", "upgrade_hp_gold"].includes(
                              step.id,
                            )
                          ? "32%"
                          : step.id === "upgrade_atk_gold"
                            ? "58%"
                            : step.id === "explain_night_only"
                              ? "55%"
                              : step.id === "click_equip_button"
                                ? "65%"
                                : ["select_oil"].includes(step.id)
                                  ? "58%"
                                  : step.id === "check_forge_result"
                                    ? "45%"
                                    : [
                                          "check_refine_result",
                                          "check_reroll_result",
                                          "check_current_options",
                                          "check_refine_preview",
                                          "select_item_to_infuse",
                                          "check_final_infused_options",
                                        ].includes(step.id)
                                      ? "65%"
                                      : [
                                            "check_refine_result",
                                            "check_reroll_result",
                                            "check_current_options",
                                            "check_refine_preview",
                                            "select_item_to_infuse",
                                            "upgrade_popup_any",
                                            "library_complete",
                                          ].includes(step.id)
                                        ? "35%"
                                        : "50%",
            transform: "translateY(-50%)",
            width: "90%",
            maxWidth: "320px",
            maxHeight: "80vh",
            overflowY: "auto",
            background: "linear-gradient(135deg, #1a1c24 0%, #101218 100%)",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.2)",
            border: "2px solid #ffd700",
            borderRadius: "20px",
            padding: "20px",
            boxSizing: "border-box",
            pointerEvents: "auto",
            zIndex: 100001,
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevTutorialStep();
            }}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#aaa",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              zIndex: 1,
            }}
            title="이전 단계로"
          >
            ↩️
          </button>
          <div
            style={{
              color: "#ffd700",
              fontSize: "18px",
              fontWeight: "900",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            ✨ {step.title}
          </div>
          <div
            style={{
              color: "#eee",
              fontSize: "14px",
              lineHeight: "1.6",
              textAlign: "center",
              marginBottom: "20px",
              wordBreak: "keep-all",
              overflowWrap: "anywhere",
            }}
          >
            {step.message}
          </div>

          {/* 👉 팝업 내부 유도 손가락 */}
          {[
            "library_cost_guide",
            "library_basic_free",
            "library_complete",
            "library_to_training",
          ].includes(step.id) && (
            <motion.div
              animate={{
                y: [0, 8, 0],
                scale: [1, 1.15, 1],
                opacity: [1, 0.75, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                fontSize: "34px",
                textAlign: "center",
                marginTop: "-8px",
                marginBottom: "10px",
                filter: "drop-shadow(0 0 8px #ffd700)",
                pointerEvents: "none",
              }}
            >
              👇
            </motion.div>
          )}

          {(step.actionType === "any" ||
            [
              "tower_unlock",
              "master_unlock",
              "inn_event",
              "click_equip_button",
              "library_complete",
              "library_cost_guide",
            ].includes(step.id)) && (
            <button
              onClick={() => completeTutorialStep(currentStepId!)}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(180deg, #ffd700, #d4a23c)",
                border: "none",
                borderRadius: "10px",
                color: "#1a1612",
                fontWeight: "900",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {step.id === "auto_training_info"
                ? "무림입성"
                : step.id === "select_oil"
                  ? "확인"
                  : "다음"}
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Blinking Finger Icon */}
      {hole && (
        <motion.div
          animate={{
            y:
              step.id === "start_faction" ||
              step.id === "check_quest" ||
              step.id === "explain_night_only" ||
              step.id === "goto_forge_click" ||
              step.id === "forge_unlock" ||
              step.id === "tower_unlock" ||
              step.id === "inn_event" ||
              step.id === "library_complete" ||
              step.id === "library_cost_guide"
                ? [0, 15, 0]
                : step.id === "explain_mission_bar"
                  ? [0, -15, 0]
                  : [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left:
              hole.left +
              hole.width / 2 -
              25 +
              (step.id === "click_status_detailed" ? 100 : 0),
            top:
              step.id === "goto_forge_refine"
                ? hole.top - 60
                : step.id === "upgrade_unlock"
                  ? hole.top - 45 // 더 더 아래로 조정 (-55 -> -45)
                  : step.id === "goto_inventory"
                    ? hole.top - 25
                    : [
                          "start_faction",
                          "check_quest",
                          "explain_night_only",
                          "goto_forge_click",
                          "forge_unlock",
                          "upgrade_tab_technique",
                          "upgrade_tab_mastery",
                          "goto_inventory",
                          "goto_inventory_potion",
                          "check_forge_result",
                          "check_final_infused_options",
                          "goto_inventory_final",
                          "actual_final_back_to_training",
                          "restart_training",
                          "library_unlock",
                          "library_cost_guide",
                          "library_complete",
                          "master_unlock",
                          "tower_unlock",
                          "inn_event",
                          "explain_mission_bar",
                        ].includes(step.id)
                      ? [
                            "check_forge_result",
                            "check_final_infused_options",
                            "library_unlock",
                            "library_cost_guide",
                            "library_complete",
                          ].includes(step.id)
                        ? hole.top - 50
                        : step.id === "explain_mission_bar"
                          ? "15vh"
                          : hole.top - 85
                      : step.id === "click_infuse_start"
                        ? hole.top - 50
                        : step.id === "select_oil"
                          ? hole.top + 65
                          : hole.top +
                            hole.height / 2 +
                            ([
                              "select_item_inventory",
                              "click_equip_button",
                              "select_item_to_refine",
                              "select_item_to_reroll",
                              "select_item_to_infuse",
                              "select_infused_item",
                            ].includes(step.id) ||
                            [
                              "select_refine_tab",
                              "select_reroll_tab",
                              "select_infuse_tab",
                            ].includes(step.id)
                              ? 30
                              : 5) +
                            (step.targetId === "training-area"
                              ? 40
                              : step.id === "click_status_detailed"
                                ? -10
                                : step.id === "explain_quest_list"
                                  ? 110
                                  : step.id === "explain_time_cycle"
                                    ? 40
                                    : [
                                          "check_current_options",
                                          "check_reroll_result",
                                          "check_forge_result",
                                          "upgrade_guide_info",
                                          "upgrade_popup_any",
                                          "upgrade_atk_gold",
                                          "upgrade_mult_10",
                                          "upgrade_hp_gold",
                                        ].includes(step.id)
                                      ? 40 // 결과 확인 시 손가락이 텍스트를 가리지 않도록 적절히 이동
                                      : step.id === "explain_night_only"
                                        ? -60
                                        : step.id === "library_unlock"
                                          ? -15
                                          : 0),
            width: 50,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            pointerEvents: "none",
            zIndex: 100002,
            filter: "drop-shadow(0 0 10px #ffd700)",
          }}
        >
          {step.id === "start_faction" ||
          step.id === "check_quest" ||
          step.id === "explain_night_only" ||
          step.id === "goto_forge_click" ||
          step.id === "upgrade_unlock" ||
          step.id === "upgrade_tab_technique" ||
          step.id === "upgrade_tab_mastery" ||
          step.id === "forge_unlock" ||
          step.id === "goto_inventory" ||
          step.id === "goto_forge_refine" ||
          step.id === "click_infuse_start" ||
          step.id === "check_forge_result" ||
          step.id === "check_final_infused_options" ||
          step.id === "library_unlock" ||
          step.id === "master_unlock" ||
          step.id === "tower_unlock" ||
          step.id === "inn_event" ||
          step.id === "library_complete" ||
          step.id === "library_cost_guide"
            ? "👇"
            : "👆"}
        </motion.div>
      )}

      {/* Second Finger Icon (for mission bar) */}
      {secondTargetRect && (
        <motion.div
          animate={{
            y: step.id === "explain_mission_bar" ? [0, 15, 0] : [0, 15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left: secondTargetRect.left + secondTargetRect.width / 2 - 25,
            top:
              step.id === "explain_mission_bar"
                ? "75vh"
                : secondTargetRect.top - 60,
            width: 50,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            pointerEvents: "none",
            zIndex: 100002,
            filter: "drop-shadow(0 0 10px #ffd700)",
          }}
        >
          {step.id === "explain_mission_bar" ? "👇" : "👇"}
        </motion.div>
      )}
    </div>
  );
}
