"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType, CombatAnalysis, CombatLogEntry, CombatLogSource, NextDayEvent, Quest, TowerEnemy, TowerState, TowerBuff, TowerArtifact, ItemTier } from "./types";
import { FACTIONS } from "./factions";
import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS, GIRU_GIFT_ITEMS, GIRU_QUESTS, ROGUE_QUEST_REWARDS, getNextAdaptiveQuests, getInfoTierCost } from "./nightSystem";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, SYNERGY_CONFIG, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions, rollPaewangItem, getEnhancementMultiplier, FORGE_ITEMS, generateRandomGear, SET_GROUPS, getItemOptionCount, fixItemOptions } from "./items";
import { getMovementBuff } from "./movementLogic";
import {
  ensureLearnedSkill,
  refineLearnedSkill,
  getRefineWisdomCost,
  getRefineGoldCost,
  canSynthesize,
  MARTIAL_COMPENDIUM,
  getRefineBonusMultiplier,
  getManualFragmentDisplayName
} from "./martialArtsSystem";
import { MARTIAL_SYNTHESIS_RECIPES } from "./martialArtsRecipes";
import { saveGameToFirebase, loadGameFromFirebase } from "@/lib/gameSave";
import { supabase } from "@/lib/supabaseClient";
import { m } from "framer-motion";
import { TOWER_ROGUE_BUFF_POOL, getTierWeight, TOWER_SYNERGIES } from "./towerData";

/**
 * 현재 경지와 문파에 맞는 비급 조각을 무작위로 선택하는 헬퍼
 */
const getRealmAppropriateShards = (game: any) => {
  const faction = game.faction || "무소속";
  const realm = game.realm || "필부";
  
  // 현재 경지에 맞는 무공들 필터링
  let possible = MARTIAL_COMPENDIUM.filter(sk => 
    (sk.factionName === faction || sk.factionName === "강호공용") && 
    sk.realm === realm
  );
  
  if (possible.length === 0) {
    // 해당 경지에 맞는 문파 무공이 없으면 전체 도감에서 해당 경지 무공 검색
    possible = MARTIAL_COMPENDIUM.filter(sk => sk.realm === realm);
  }
  
  if (possible.length === 0) {
    // 해당 경지에 맞는 무공이 하나도 없으면 (매우 드문 경우)
    // 기본적으로 신화 비급 조각 반환 또는 가장 낮은 경지 무공 반환
    return { name: "신화 비급 조각", icon: "📜" };
  }
  
  const selected = possible[Math.floor(Math.random() * possible.length)];
  return { name: `${selected.name} 조각`, icon: "📜" };
};


export function formatCompactNumber(num: number): string {
  if (num < 0) return "0";
  if (num < 10000) return Math.floor(num).toLocaleString();
  if (num < 100000000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, "") + "만";
  }
  if (num < 1000000000000) {
    return (num / 100000000).toFixed(1).replace(/\.0$/, "") + "억";
  }
  if (num < 10000000000000000) {
    return (num / 1000000000000).toFixed(1).replace(/\.0$/, "") + "조";
  }
  return (num / 10000000000000000).toFixed(1).replace(/\.0$/, "") + "경";
}

export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 300, dummyType: "straw", label: "낡은 짚더미", hp: 150, mp: 300, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: "straw", label: "말라비틀어진 짚더미", hp: 300, mp: 800, goldMultiplier: 3 },
  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: "wood", label: "통나무 목인", hp: 600, mp: 2000, goldMultiplier: 8 },
  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: "leather", label: "가죽 목격인", hp: 1200, mp: 5000, goldMultiplier: 20 },
  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: "iron", label: "청강철 목인", hp: 2500, mp: 12000, goldMultiplier: 50 },
  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: "spirit", label: "기운 서린 목격인", hp: 5000, mp: 30000, goldMultiplier: 150 },
  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: "master", label: "화경의 환영", hp: 12000, mp: 70000, goldMultiplier: 400 },
  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: "legend", label: "현경의 전설", hp: 25000, mp: 150000, goldMultiplier: 1000 },
  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: "life-death", label: "생사의 문턱", hp: 50000, mp: 400000, goldMultiplier: 2500 },
  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: "myth", label: "신화의 형상", hp: 120000, mp: 1000000, goldMultiplier: 7000 },
  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: "heaven", label: "천인합일의 경지", hp: 300000, mp: 3000000, goldMultiplier: 20000 },
};

export function getInnStageConfig(stage: number) {
  const getTarget = (s: number) => {
    const scores = [
      0, 3000, 7000, 12000, 16000, 20000, 25000, 30000, 36000, 43000, 50000,
      58000, 67000, 77000, 88000, 100000, 113000, 127000, 142000, 158000, 200000
    ];
    if (s <= 20) return scores[s] || 0;
    return 200000 + (s - 20) * 50000;
  };

  const targetScore = getTarget(stage);
  const prevTarget = stage > 1 ? getTarget(stage - 1) : 0;

  const relativeTarget = targetScore - prevTarget;

  return {
    targetScore,
    relativeTarget,
    prevTarget,
    durationSec: 30,
    playerDrainIntervalSec: Math.max(1.0, 2.0 - (stage - 1) * 0.05),
    playerDrainPerTick: 7 + Math.floor(stage * 2),
    finisherThresholdRate: 0.05, // Match score >= 5% of target means finisher
    finisherBleedDurationSec: 5,
    stageDamageMult: 1 + (stage - 1) * 0.15,
    counterCheckWindowSec: 10,
    counterThresholdRate: 0.4, // If score < 40% of expected in 10s
    counterDotDurationSec: 6,
    counterCooldownSec: 15
  };
}

export const REALM_ORDER = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];

export const STAT_UPGRADE_CONFIG: Record<string, { name: string; resources: string[] }> = {
  hpRec: { name: "생명력", resources: ["gold"] },
  hpRecovery: { name: "재생", resources: ["gold"] },
  mpRec: { name: "내공", resources: ["gold"] },
  atk: { name: "공격력", resources: ["gold"] },
  def: { name: "방어력", resources: ["gold"] },
  critRate: { name: "치명타 확률", resources: ["gold", "reputation"] },
  critDmg: { name: "치명타 피해", resources: ["gold", "reputation"] },
  eva: { name: "회피율", resources: ["gold", "reputation"] },
  luck: { name: "기운/행운", resources: ["gold", "reputation"] },
  autoGain: { name: "수련 효율", resources: ["gold", "reputation"] },
  offlineLimit: { name: "수련 시간", resources: ["gold", "reputation"] },
};

export const STAT_INCREMENTS: Record<string, number> = {
  atk: 500,
  def: 500,
  hpRec: 2500,
  hpRecovery: 20,
  mpRec: 100,
  critRate: 0.001,
  critDmg: 1,
  eva: 0.001,
  luck: 0.0002,
  autoGain: 0.01,
  offlineLimit: 0.05,
};

export const TUTORIAL_STEPS: Record<string, any> = {
  start_faction: {
    id: "start_faction",
    title: "강호 입성",
    message: "문파를 선택하고 강호에 발을 들였습니다. 먼저 [임무] 탭을 확인하여 앞으로의 방향을 잡으세요.",
    targetId: "nav-quest",
    actionType: "click"
  },
  check_quest: {
    id: "check_quest",
    title: "임무 확인",
    message: "임무를 수행하고 강해져서 강호에 이름을 날리세요. 이제 수련장으로 이동합시다.",
    targetId: "nav-training",
    actionType: "click"
  },
  explain_quest_list: {
    id: "explain_quest_list",
    title: "임무 상세",
    message: "임무 내용과 보상 내역을 이곳에서 확인할 수 있습니다. 첫 번째 임무인 '허수아비 100마리 처치'를 확인하고 수련장으로 이동해봅시다.",
    targetId: "quest-item-first",
    actionType: "any"
  },
  start_training: {
    id: "start_training",
    title: "기초 수련",
    message: "수련장에서 허수아비를 처치하여 깨달음을 얻으세요. 화면을 터치해 공격할 수 있습니다.",
    targetId: "training-area",
    actionType: "click"
  },
  explain_mission_bar: {
    id: "explain_mission_bar",
    title: "임무 및 상태 확인",
    message: "하단의 임무 표시창에서는 현재 진행중인 임무를 확인할 수 있습니다. 상단은 상태를 바로 확인할 수 있는 창입니다. 순서는 금화,명성,수련치,공격력입니다.",
    targetId: "player-status-button",
    secondTargetId: "mission-status-bar",
    actionType: "any"
  },
  click_status_detailed: {
    id: "click_status_detailed",
    title: "상태창 확인",
    message: "상태창 버튼을 눌러 상세 정보를 확인하세요.",
    targetId: "player-status-button",
    actionType: "click"
  },
  explain_status_panel: {
    id: "explain_status_panel",
    title: "성취도 상세",
    message: "개인 능력치와 전투력, 그리고 다음 깨달음(경지)까지의 상세한 정보를 확인할 수 있습니다.",
    targetId: null,
    actionType: "any"
  },
  auto_training_info: {
    id: "auto_training_info",
    title: "자동 수련 안내",
    message: "초당 5번의 자동 수련이 진행 중입니다. 경지가 높아질수록 허수아비의 생명력도 높아지니, 직접 터치해야 더 빨리 강해질 수 있습니다!",
    targetId: "training-area",
    actionType: "any"
  },
  explain_time_cycle: {
    id: "explain_time_cycle",
    title: "시간의 흐름",
    message: "하루는 낮(5분) 그리고 황혼(1분) 그리고 밤(5분) 그리고 새벽(1분)으로 돌아갑니다.",
    targetId: "time-status-bar",
    actionType: "any"
  },
  explain_night_only: {
    id: "explain_night_only",
    title: "밤의 활동",
    message: "기루와 도박은 밤에만 이용할 수 있습니다.",
    targetId: "nav-giru",
    actionType: "any"
  },

  explain_auto_battle: {
    id: "explain_auto_battle",
    title: "자동 전투",
    message: "자동 전투(수련)는 직접 터치하지 않아도 지속적으로 성장을 도와줍니다.",
    targetId: "training-area",
    actionType: "any"
  },
  trance_achieved: {
    id: "trance_achieved",
    title: "무아지경 진입",
    message: "축하합니다! 무아지경 상태에서는 공격력이 10배로 상승합니다. 더 빠르게 허수아비를 처단하세요.",
    targetId: null,
    actionType: "any"
  },
  forge_unlock: {
    id: "forge_unlock",
    title: "대장간 개방",
    message: "허수아비 30번 처치 보상으로 [대장간]이 열렸습니다! 장비를 마련하여 더 강해질 시간입니다.",
    targetId: null,
    actionType: "any"
  },
  goto_forge_click: {
    id: "goto_forge_click",
    title: "대장간 이동",
    message: "무림은 위험한 곳입니다. 자신을 보호하고 강화하기 위한 필수 장소입니다.",
    targetId: "nav-forge",
    actionType: "click"
  },
  buy_weapon: {
    id: "buy_weapon",
    title: "장비 구입",
    message: "먼저 [무명철검]을 구입하세요. 튜토리얼 진행을 위해 특별히 [명품] 등급의 장비가 준비될 것입니다.",
    targetId: "forge-buy-weapon-필부_mainWeapon",
    actionType: "click"
  },
  goto_inventory: {
    id: "goto_inventory",
    title: "가방 확인",
    message: "장비를 눌러서 구입한 장비를 착용하러 갑니다.",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_item_inventory: {
    id: "select_item_inventory",
    title: "아이템 선택",
    message: "방금 구입한 무기를 선택하세요.",
    targetId: "inv-item-list-first",
    actionType: "click"
  },
  click_equip_button: {
    id: "click_equip_button",
    title: "장착하기",
    message: "[장착하기] 버튼을 눌러 무기를 착용합니다.",
    targetId: "inv-equip-btn",
    actionType: "click"
  },
  goto_forge_refine: {
    id: "goto_forge_refine",
    title: "장비 제련 유도",
    message: "이제 장비를 제련하여 성능을 극한으로 끌어올려 봅시다. 다시 대장간으로 이동하세요.",
    targetId: "nav-forge",
    actionType: "click"
  },
  select_refine_tab: {
    id: "select_refine_tab",
    title: "장비 제련",
    message: "[장비 제련] 메뉴를 선택하세요.",
    targetId: "forge-main-tab-enhance",
    actionType: "click"
  },
  select_item_to_refine: {
    id: "select_item_to_refine",
    title: "대상 선택",
    message: "제련할 아이템(현재 착용 중인 무기)을 선택하세요.",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  check_refine_preview: {
    id: "check_refine_preview",
    title: "강화 수치 확인",
    message: "장비를 제련하면 공격력을 포함한 기본 능력치가 크게 상승합니다. 현재 수치와 제련 후 예상 수치를 확인해보세요.",
    targetId: "forge-refine-stat-preview",
    actionType: "any"
  },
  click_refine_start: {
    id: "click_refine_start",
    title: "제련 시작",
    message: "[제련 시작]을 눌러 장비를 강화합니다. 공격력이 상승합니다.",
    targetId: "forge-refine-start-btn",
    actionType: "click"
  },
  check_refine_result: {
    id: "check_refine_result",
    title: "제련 결과 확인",
    message: "제련이 성공하여 장비의 강화 수치가 상승했습니다! +1강당 장비의 기본 능력치가 10%씩 중첩되어 증가합니다. 이제 더 강력해진 공격력을 확인해보세요.",
    targetId: "forge-info-box-header",
    actionType: "any"
  },
  select_reroll_tab: {
    id: "select_reroll_tab",
    title: "재연마 선택",
    message: "다음은 [재연마]입니다. 장비의 효과를 무작위로 새롭게 변경할 수 있습니다.",
    targetId: "forge-tab-reroll",
    actionType: "click"
  },
  select_item_to_reroll: {
    id: "select_item_to_reroll",
    title: "대상 선택",
    message: "재연마할 아이템을 다시 한번 선택해주세요.",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  check_current_options: {
    id: "check_current_options",
    title: "현재 옵션 확인",
    message: "재연마를 하기전, 현재 장비에 부여된 옵션들을 확인해보세요. 유지하고 싶은 옵션이 있다면 옆에 박스를 체크하면 그 옵션은 유지됩니다.",
    targetId: "forge-item-options-list",
    actionType: "any"
  },
  click_reroll_start: {
    id: "click_reroll_start",
    title: "재연마 실행",
    message: "[재연마 시작] 버튼을 눌러 새로운 옵션을 획득해보세요.",
    targetId: "forge-reroll-start-btn",
    actionType: "click"
  },
  check_reroll_result: {
    id: "check_reroll_result",
    title: "재연마 결과 확인",
    message: "재연마를 통해 장비에 새로운 옵션들이 부여되었습니다! 어떤 효과들이 추가되었는지 확인해보세요.",
    targetId: "forge-item-options-list",
    actionType: "any"
  },
  select_infuse_tab: {
    id: "select_infuse_tab",
    title: "연마 탭 선택",
    message: "마지막으로 [연마]입니다. 특수 재료인 기름을 발라 장비에 특별한 효과를 부여합니다.",
    targetId: "forge-tab-infuse",
    actionType: "click"
  },
  select_item_to_infuse: {
    id: "select_item_to_infuse",
    title: "대상 선택",
    message: "연마할 아이템을 선택하세요.",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  select_oil: {
    id: "select_oil",
    title: "연마제 선택",
    message: "공격력을 대폭 높여주는 [광폭유] 외 2종을 미리 지급해드렸습니다. 광폭유를 눌러 연마하세요.",
    targetId: "forge-oil-item-oil_atk_3",
    actionType: "click"
  },
  click_infuse_start: {
    id: "click_infuse_start",
    title: "연마 시작",
    message: "[연마하기] 버튼을 눌러 무기에 효과를 적용합니다.",
    targetId: "forge-infuse-start-btn",
    actionType: "click"
  },
  check_forge_result: {
    id: "check_forge_result",
    title: "연마 완료",
    message: "연마제가 무기에 성공적으로 스며들었습니다. 이제 하단의 [장비] 탭을 눌러 효과를 확인해볼까요?",
    targetId: "nav-inventory",
    actionType: "click"
  },
  goto_inventory_final: {
    id: "goto_inventory_final",
    title: "장비 확인",
    message: "[장비] 탭으로 이동하여 아이템을 확인합니다.",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_infused_item: {
    id: "select_infused_item",
    title: "아이템 클릭",
    message: "연마한 무기를 클릭하여 상세 정보를 확인하세요.",
    targetId: "inv-item-list-first",
    actionType: "click"
  },
  check_final_infused_options: {
    id: "check_final_infused_options",
    title: "효과 적용 확인",
    message: "아이템 설명 하단에 [광폭유] 효과가 적용된 것이 보이시나요? 이제 다시 강해진 상태로 수련을 시작합시다! 하단의 [수련] 탭을 클릭하세요.",
    targetId: "nav-training",
    actionType: "click"
  },
  actual_final_back_to_training: {
    id: "actual_final_back_to_training",
    title: "수련 복귀",
    message: "[수련] 탭을 눌러 메인 화면으로 돌아갑니다.",
    targetId: "main-nav-training",
    actionType: "click"
  },
  restart_training: {
    id: "restart_training",
    title: "수련 재개",
    message: "이제 [수련 시작] 버튼을 눌러 다시 강해질 시간입니다!",
    targetId: "training-start-btn",
    actionType: "click"
  },
  select_potion_category: {
    id: "select_potion_category",
    title: "회복제 선택",
    message: "대장간에서는 무기뿐만 아니라 회복제도 제작할 수 있습니다. [회복제] 카테고리를 선택하세요.",
    targetId: "forge-realm-회복제",
    actionType: "click"
  },
  buy_hp_potion: {
    id: "buy_hp_potion",
    title: "회복제 구입",
    message: "생존에 필수적인 [생명력 회복제(소)]를 구입해 봅시다.",
    targetId: "forge-buy-potion-potion_hp_1",
    actionType: "click"
  },
  goto_inventory_potion: {
    id: "goto_inventory_potion",
    title: "장비탭 이동",
    message: "구입한 물약을 장착하러 다시 가방(장비) 탭으로 이동합니다.",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_medicine_tab: {
    id: "select_medicine_tab",
    title: "행낭 선택",
    message: "소모품을 확인할 수 있는 [행낭] 메뉴를 선택하세요.",
    targetId: "inv-slot-medicine",
    actionType: "click"
  },
  guide_potion_setup: {
    id: "guide_potion_setup",
    title: "물약 장착",
    message: "소형회복제를 꾹 눌러서 아래의 [물약 장착] 슬롯으로 끌어다 놓으면 장착됩니다. 대결 시 자동으로 사용되어 생존을 돕습니다.",
    targetId: "inv-medicine-item-first",
    secondTargetId: "inv-quick-slot-0",
    actionType: "any"
  },

  upgrade_unlock: {
    id: "upgrade_unlock",
    title: "강화 개방",
    message: "허수아비 50번 처치 보상으로 [강화]가 열렸습니다. 획득한 금화와 명성으로 능력치를 영구히 상승시키세요.",
    targetId: "nav-upgrade",
    actionType: "click"
  },
  upgrade_guide_info: {
    id: "upgrade_guide_info",
    title: "상세 정보 확인",
    message: "각 항목을 누르면 그 무공이 가진 깊은 뜻과 자세한 정보를 볼 수 있습니다. [공격력] 항목을 눌러보세요.",
    targetId: "upgrade-item-atk",
    actionType: "click"
  },
  upgrade_popup_any: {
    id: "upgrade_popup_any",
    title: "정보 확인 완료",
    message: "능력의 설명을 확인하셨나요? 설명창을 눌러 닫고 수련을 계속하세요.",
    targetId: "upgrade-description-popup",
    actionType: "click"
  },
  upgrade_mult_10: {
    id: "upgrade_mult_10",
    title: "수련의 가속",
    message: "한 단계씩 오르는 수련으로는 부족합니다. 이제 한 번에 10단계씩 성장의 속도를 끌어올려 보십시오. [x10]을 선택하세요.",
    targetId: "upgrade-mult-10",
    actionType: "click"
  },
  upgrade_atk_gold: {
    id: "upgrade_atk_gold",
    title: "공격력 강화",
    message: "효율이 극대화되었으니, 이제 공격력을 대폭 상승시킬 차례입니다. [공격력] 강화 버튼을 눌러보세요.",
    targetId: "upgrade-btn-atk-gold",
    actionType: "click"
  },
  upgrade_hp_gold: {
    id: "upgrade_hp_gold",
    title: "생명력 강화",
    message: "강인한 육체는 무인의 근본입니다. [생명력]을 강화하여 끊임없는 타격에도 굴하지 않는 신체를 만드세요.",
    targetId: "upgrade-btn-hpRec-gold",
    secondTargetId: "upgrade-mult-10",
    actionType: "click"
  },
  upgrade_tab_technique: {
    id: "upgrade_tab_technique",
    title: "심화 연마",
    message: "기초를 닦았다면 이제 변칙적인 무공을 익힐 차례입니다. [심화 연마] 탭을 눌러 치명타와 회피 등의 신묘한 기술들을 확인하세요.",
    targetId: "upgrade-tab-technique",
    actionType: "click"
  },
  upgrade_tab_mastery: {
    id: "upgrade_tab_mastery",
    title: "천명 비전",
    message: "진정한 고수는 하늘의 뜻을 읽는 법입니다. [천명 비전]에서 강호의 기연과 수행의 효율을 극한으로 끌어올리는 법을 배우세요.",
    targetId: "upgrade-tab-mastery",
    actionType: "click"
  },
  upgrade_finish_goto_training: {
    id: "upgrade_finish_goto_training",
    title: "수련 재개",
    message: "환골탈태의 기연을 얻어 기맥이 뚫렸으니, 이제 무도의 극의를 향해 정진할 때입니다. 더욱 강성해진 신법과 내공으로 천하제일을 향한 수련을 이어가십시오.",
    actionType: "any"
  },
  tower_unlock: {
    id: "tower_unlock",
    title: "무한의 탑",
    message: "허수아비 100번 처치 보상으로 [탑]이 열렸습니다. 자신의 한계를 시험하고 보상을 획득하세요.",
    targetId: "nav-tower",
    actionType: "click"
  },
  master_unlock: {
    id: "master_unlock",
    title: "고수와의 대결",
    message: "허수아비 150번 처치 보상으로 [대결]이 열렸습니다. 강력한 고수들을 처단하고 명성을 쌓으세요.",
    targetId: "nav-master",
    actionType: "click"
  },
  library_unlock: {
    id: "library_unlock",
    title: "비급 개방",
    message: "허수아비 80번 처치 보상으로 [비급]이 열렸습니다. 획득한 비급 조각과 재료로 새로운 무공을 제작하세요.",
    targetId: "nav-library",
    actionType: "click"
  },
  library_cost_guide: {
    id: "library_cost_guide",
    title: "제작 비용 확인",
    message: "무공을 제작하려면 조각, 재료, 인연 등 다양한 자원이 필요합니다. 필요한 자원을 모두 모아 무공을 완성하세요.",
    actionType: "any"
  },
  library_complete: {
    id: "library_complete",
    title: "무공 습득 완료",
    message: "새로운 무공을 익혔습니다! 이제 더욱 강력한 초식으로 적을 제압할 수 있습니다.",
    actionType: "any"
  },
  inn_event: {
    id: "inn_event",
    title: "객잔 무뢰배",
    message: "허수아비 300번 처치 시 [객잔]에서 무뢰배들이 나타납니다! [객잔]으로 이동하여 그들을 추격하세요.",
    targetId: "nav-inn",
    actionType: "click"
  }
};

export const TOWER_BUFF_POOL = [
  { id: "atk_up", name: "천마의 가속", description: "공격력 +30%", bonus: { atk: 1.3 }, penalty: {} },
  { id: "def_up", name: "철벽의 기운", description: "받는 피해 -20%", bonus: { defBuff: 0.8 }, penalty: {} },
  { id: "speed_up", name: "신법의 깨달음", description: "자동 공격 속도 +20%", bonus: { towerSpeed: 1.2 }, penalty: {} },
  { id: "crit_up", name: "필멸의 일격", description: "치명타 확률 +5%", bonus: { critRate: 5 }, penalty: {} },
  { id: "ki_up", name: "영천의 기운", description: "Ki 게이지 획득 +50%", bonus: { kiGain: 1.5 }, penalty: {} },
];

export const TOWER_ARTIFACT_POOL = TOWER_ROGUE_BUFF_POOL;

export const TOWER_THEMES: Record<number, any> = {
  1: { name: "석조의 시련", color: "#64748b", effect: "none", desc: "고요한 돌의 기운이 감도는 층입니다." },
  21: { name: "혹한의 감옥", color: "#38bdf8", effect: "slow", desc: "뼈를 깎는 추위가 공격 속도를 늦춥니다." },
  41: { name: "염화의 지옥", color: "#f87171", effect: "burn", desc: "타오르는 열기가 매초 체력을 깎습니다." },
  61: { name: "독무의 미궁", color: "#a855f7", effect: "poison", desc: "독안개가 회복 효율을 방해합니다." },
  81: { name: "무극의 심연", color: "#1e293b", effect: "void", desc: "모든 기운이 억제되는 극한의 공간입니다." },
};

export function getTowerTheme(floor: number) {
  const keys = Object.keys(TOWER_THEMES).map(Number).sort((a, b) => b - a);
  const key = keys.find(k => floor >= k) || 1;
  return TOWER_THEMES[key];
}

export function generateTowerBuffs(floor: number) {
  const pool = [...TOWER_BUFF_POOL].sort(() => 0.5 - Math.random());
  return pool.slice(0, 3);
}

export function generateTowerArtifacts(floor: number, luck: number = 0) {
  const getWeight = (art: any) => getTierWeight(art.tier);
  const pool = [...TOWER_ARTIFACT_POOL];
  const selected: any[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, art) => sum + getWeight(art), 0);
    let r = Math.random() * totalWeight;
    let currentSum = 0;
    for (let j = 0; j < pool.length; j++) {
      currentSum += getWeight(pool[j]);
      if (r <= currentSum) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }
  return selected;
}

export function generateTowerEnemy(floor: number, type: "small" | "elite" | "boss" = "small", wave: number = 1) {
  const theme = getTowerTheme(floor);
  const isBoss = type === "boss";
  const isElite = type === "elite";
  const level = floor;
  const baseStats = getTargetPlayerStats(level + 10);

  let traits: string[] = [];
  if (isBoss) traits.push("보스", "피해 상한");
  if (isElite) traits.push("정예");
  if (theme.effect === "slow") traits.push("한기 (공속 저하)");
  if (theme.effect === "burn") traits.push("화염 (지속 피해)");
  if (theme.effect === "poison") traits.push("맹독 (치유 저하)");
  if (theme.effect === "void") traits.push("공허 (능력 억제)");

  let hpMult = isBoss ? 3.5 : isElite ? 1.5 : 0.4;
  let atkMult = isBoss ? 1.5 : isElite ? 1.2 : 0.6;

  // 초반 층 난이도 조절 (HP/ATK 감쇠)
  if (floor <= 5) {
    hpMult *= 0.5;
    atkMult *= 0.3;
  } else if (floor <= 10) {
    hpMult *= 0.7;
    atkMult *= 0.5;
  }
  let defMult = isElite || isBoss ? 1.2 : 0.8;
  let eva = Math.min(40, floor * 0.5);
  let critRes = Math.min(40, floor * 0.5);
  let reflect = floor > 40 ? 15 : 0;
  let lifeSteal = floor > 60 ? 10 : 0;
  let ignoreEva = floor > 80 ? 30 : 0;

  const hp = Math.floor(baseStats.hp * 2.5 * hpMult);
  const atk = Math.floor(baseStats.atk * 0.5 * atkMult);
  const def = Math.floor(baseStats.def * 0.3 * defMult);

  const icons = ["👹", "💀", "🧛", "🧟", "👻", "👺", "🧞", "🕷️", "🦂", "🦇"];
  const icon = isBoss ? "🐉" : isElite ? "🦁" : icons[Math.floor(Math.random() * icons.length)];

  return {
    id: `${floor}_${wave}_${type}_${Math.random().toString(36).substr(2, 5)}`,
    name: isBoss ? `[층 보스] ${floor}층 ${theme.name} 수호자` : isElite ? `[정예] ${floor}층 경비병` : `${floor}층 시험자`,
    maxHp: hp,
    hp: hp,
    maxMp: 100,
    mp: 100,
    atk: atk,
    def: def,
    eva,
    critRes,
    reflect,
    lifeSteal,
    ignoreEva,
    traits,
    type,
    icon
  };
}

export function generateTowerWave(floor: number, wave: number): TowerEnemy[] {
  const isBossFloor = floor % 10 === 0;
  const isEliteFloor = floor % 5 === 0;

  const enemies: TowerEnemy[] = [];
  
  if (isBossFloor && wave === 3) {
    // 10층 보스 웨이브
    enemies.push(generateTowerEnemy(floor, "boss", wave));
    const smallCount = floor <= 10 ? 2 : 6; 
    for (let i = 0; i < smallCount; i++) enemies.push(generateTowerEnemy(floor, "small", wave));
  } else if (isEliteFloor && wave === 3) {
    // 5층 정예 웨이브
    enemies.push(generateTowerEnemy(floor, "elite", wave));
    const smallCount = floor <= 5 ? 1 : 4;
    for (let i = 0; i < smallCount; i++) enemies.push(generateTowerEnemy(floor, "small", wave));
  } else {
    // 일반 웨이브: 초반 층은 개수 대폭 축소
    let count = 3 + Math.floor(Math.random() * 4);
    if (floor <= 3) count = 1 + Math.floor(Math.random() * 2); // 1~2마리
    else if (floor <= 10) count = 2 + Math.floor(Math.random() * 2); // 2~3마리
    
    for (let i = 0; i < count; i++) enemies.push(generateTowerEnemy(floor, "small", wave));
  }

  return enemies;
}

export const STAT_UPGRADE_BASES: Record<string, { gold: number; rep: number }> = {
  atk: { gold: 500, rep: 130 },
  def: { gold: 500, rep: 130 },
  hpRec: { gold: 500, rep: 130 },
  mpRec: { gold: 500, rep: 130 },
  hpRecovery: { gold: 500, rep: 130 },
  critRate: { gold: 3000, rep: 800 },
  critDmg: { gold: 3000, rep: 800 },
  eva: { gold: 3000, rep: 800 },
  luck: { gold: 10000, rep: 2500 },
  autoGain: { gold: 10000, rep: 2500 },
  offlineLimit: { gold: 10000, rep: 2500 },
};

const DUEL_TIERS = [
  { name: "무명소졸", min: 0 },
  { name: "초출강호", min: 200 },
  { name: "일류고수", min: 500 },
  { name: "절정고수", min: 1000 },
  { name: "초절정", min: 2000 },
  { name: "화경", min: 4000 },
  { name: "현경", min: 8000 },
  { name: "생사경", min: 15000 },
  { name: "신화경", min: 30000 },
  { name: "천인합일", min: 60000 },
];

function getDuelTier(rating: number) {
  for (let i = DUEL_TIERS.length - 1; i >= 0; i--) {
    if (rating >= DUEL_TIERS[i].min) return DUEL_TIERS[i].name;
  }
  return "무명소졸";
}

// --- 악적 생성 및 밸런스 상수 ---
const DUEL_BALANCING = {
  COMBAT_TIME: 40,        // 전체 전투 시간
  BASELINE_TIME: 35,      // 밸런스 기준 시간 (유저에게 5초 여유)
  USER_TAP_PER_SEC: 3,    // 초당 유저 공격 횟수 기준
  TOTAL_BASELINE_HITS: 105, // 35초 * 3회 = 105회 타격 기준
  BERSERK_TIME: 30,       // 광폭화 발동 시간 (시작 후 30초)
  NORMAL_BERSERK: { atk: 1.35, spd: 1.5 },
  BOSS_BERSERK: { atk: 1.5, spd: 1.75 }
};

/**
 * 유저 강화 레벨별 목표 스탯 계산 (밸런스 기준점)
 * @param level 강화 레벨
 */
function getTargetPlayerStats(level: number) {
  return {
    atk: 10 + level * 150,       // Reduced from 250 for better early curve
    def: 50 + level * 150,       // Reduced from 250
    hp: 150 + level * 1500,      // Reduced from 2500
    critRate: 0.1 + level * 0.1, // %
    critDmg: 150 + level,       // %
    eva: 0.1 + level * 0.1       // %
  };
}

function generateEnemy(level: number) {
  const rivalIdx = (level - 1) % MASTER_RIVALS.length;
  const rivalTemplate = MASTER_RIVALS[rivalIdx] || { name: `이름 없는 고수 (Lv.${level})`, hpMult: 1, atkMult: 1 };
  const isBoss = (level % 10 === 0);

  const refPlayer = getTargetPlayerStats(level + 1);
  const rivalDef = Math.floor(refPlayer.atk * 0.01); // 기존 20%에서 1%로 대폭 축소 (타격감 강화)
  const defMultiplier = 100 / (100 + rivalDef);
  const avgDmgPerHitRaw = refPlayer.atk * defMultiplier;
  const avgDmgPerHit = avgDmgPerHitRaw * (1 + (refPlayer.critRate / 100) * (refPlayer.critDmg / 100 - 1));

  // Multipliers applied here
  const hpMult = rivalTemplate.hpMult || 1.0;
  const atkMult = rivalTemplate.atkMult || 1.0;
  const bossMult = isBoss ? 2.5 : 1.0;

  const rivalHp = Math.floor(avgDmgPerHit * DUEL_BALANCING.TOTAL_BASELINE_HITS * hpMult * bossMult);
  const estimatedHitsTaken = 35 / 2.2; // 기존 1.2에서 2.2로 상향 (적 공격력 약 80% 강화)
  const playerDefMultiplier = 100 / (100 + refPlayer.def);
  const requiredDmgPerHit = refPlayer.hp / estimatedHitsTaken;
  const rivalAtk = Math.floor((requiredDmgPerHit / playerDefMultiplier) * atkMult * (isBoss ? 1.5 : 1.0));

  return {
    name: isBoss ? `[보스] ${rivalTemplate.name}` : rivalTemplate.name,
    hp: rivalHp,
    maxHp: rivalHp,
    atk: rivalAtk,
    def: rivalDef,
    isBoss: isBoss
  };
}



function getDummyStats(realm: string, star: number, totalAtk: number = 10) {
  const realms = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realms.indexOf(realm);

  let baseHp = 1000;
  let atkBase = 10;
  let defBase = 0;
  let evaBase = 0;

  if (currentRealmIndex !== -1) {
    const settings = REALM_SETTINGS[realm];
    baseHp = settings.dummyHp;
    atkBase = 10 * Math.pow(2, currentRealmIndex);
    // 방어력: 경지가 오를수록 기하급수적으로 상승 (전투력 인플레이션 대비)
    defBase = currentRealmIndex > 0 ? 50 * Math.pow(7, currentRealmIndex - 1) : 0;
    // 회피율: 경지당 1.2%, 성당 0.2% 추가
    evaBase = currentRealmIndex * 1.2;
  } else if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    baseHp = REALM_SETTINGS["천인합일"].dummyHp * Math.pow(2.5, level);
    atkBase = 10 * Math.pow(2, 10) * Math.pow(1.5, level);
    defBase = 50 * Math.pow(7, 9) * Math.pow(1.8, level);
    evaBase = 12 + level * 0.5;
  }

  let hp = Math.floor(baseHp * Math.pow(1.5, star - 1));
  const def = Math.floor(defBase * (1 + (star - 1) * 0.15));
  const eva = Math.min(25, evaBase + (star - 1) * 0.2); // 최대 25% 제한

  // 유저의 실제 전투력을 반영한 동적 스케일링 (한방컷 방지)
  // 유저 공격력이 상승하면 악적의 최소 HP도 비례하여 상승 (최소 6~10타 버티도록)
  const expectedHitSurvive = 8;
  const minimumHp = totalAtk * expectedHitSurvive;
  if (hp < minimumHp) {
    hp = Math.floor(minimumHp);
  }

  return { hp, def, eva, atk: Math.floor(atkBase * (1 + star * 0.2)) };
}

export function getRealmSettings(realm: string) {
  if (REALM_SETTINGS[realm]) return REALM_SETTINGS[realm];
  if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    const base = REALM_SETTINGS["천인합일"];
    return { bonus: base.bonus * Math.pow(1.5, level), minTouches: base.minTouches + (level * 10000000000000), dummyHp: base.dummyHp * Math.pow(2.5, level), dummyType: "heaven", label: `환골탈퇴 ${level}성의 경지`, hp: base.hp * Math.pow(1.3, level), mp: base.mp * Math.pow(1.3, level), goldMultiplier: base.goldMultiplier * Math.pow(1.5, level) };
  }
  return REALM_SETTINGS["필부"];
}

interface GameState {
  game: GameSaveData;
  setPlayerInfo: (info: any) => void;
  addExp: (amount: number, isAuto?: boolean, manualDamage?: number) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  importGameData: (data: any) => void;
  autoTrain: (multiplier?: number) => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
  breakthrough: () => void;
  canBreakthrough: () => boolean;
  getNextRealmName: () => string | null;
  getTotalAttack: () => number;
  getTotalCritRate: () => number;
  getTotalCritDmg: () => number;
  getTotalDefense: () => number;
  getTotalHp: () => number;
  getTotalEvasion: () => number;
  getTotalSpeed: () => number;
  getTotalLuck: () => number;

  getTotalMp: () => number;
  getTotalHpRecovery: () => number;
  getTotalMpRecovery: () => number;
  getTotalCombatPower: () => number;
  addWeapon: (weapon: OwnedWeapon) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resolveTimingMission: (payload: any) => void;
  startMasterDuel: (isSpecialBoss?: boolean, isGiru?: boolean) => void;
  updateMasterDuel: (dt: number) => void;
  claimDuelReward: () => void;
  markInnEntryHandled: () => void;
  resetGame: () => void;
  setQuickSlot: (index: number, id: ConsumableId | null) => void;
  buyPotion: (id: ConsumableId, quantity: number) => void;
  useConsumable: (id: ConsumableId) => void;
  useSkill: (skillName: string) => void;
  setSelectedMasterLevel: (level: number) => void;
  syncToCloud: (force?: boolean) => Promise<void>;
  syncFromCloud: () => Promise<void>;
  isSyncingFromCloud: boolean;
  isSyncingToCloud: boolean;
  lastSyncTime: number;
  lastSyncHash: string;
  lastLocalSaveTime: number;
  learnSkill: (skill: any, priceOrReqs: number | any) => void;
  refineSkill: (skillId: string) => void;
  synthesizeSkill: (recipeId: string) => void;
  upgradeStat: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  getUpgradeCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  getReputationCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  spendPoints: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  sellItem: (itemId: string) => void;
  dismantleItem: (itemId: string) => void;
  sellConsumable: (id: ConsumableId) => void;
  claimQuestReward: (questId: string) => void;
  rerollQuest: (questId: string) => void;
  refreshQuests: () => void;
  updateQuestProgress: (targetType: string, amount: number) => void;
  getMultiUpgradeCost: (key: string, count: number, mode: 'gold' | 'reputation') => number;
  upgradeStatMulti: (key: string, count: number, mode: 'gold' | 'reputation') => void;
  updateBuffs: (dt: number) => void;
  checkOfflineRewards: () => void;
  claimOfflineRewards: () => void;
  clearLastReward: () => void;
  getOptionSum: (stat: string) => number;
  getOptionCount: (stat: string) => number;
  getStableAttack: () => number;
  getInnBonus: () => { name: string; atk: number; gold: number; exp: number; critDmg: number };
  triggerMovementBuff: () => void;
  enhanceWeapon: (itemId: string, useBlessedOil: boolean, useHeavenlyTalisman: boolean) => { success: boolean; message: string };
  rerollWeaponOptions: (itemId: string, lockedOptionIndex?: number) => { success: boolean; message: string };
  infuseSoul: (itemId: string, type: string) => { success: boolean; message: string };
  applyOil: (itemId: string, oilId: ConsumableId) => { success: boolean; message: string };
  triggerOilEffects: () => { hitCount: number; ohk: boolean; buffsTriggered: string[] };
  processAttackGauge: () => number;
  toggleAudio: () => void;
  triggerUltimate: () => void;
  buyBossShopItem: (itemType: string) => void;
  parryBossAttack: () => void;
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean, oilRes?: any) => { totalDamage: number; isCrit: boolean; effect: any; isCounter: boolean; extraHits: number; };
  restoreMp: (amount: number) => void;
  getSetCounts: () => Record<string, number>;
  openPaewangBox: () => { success: boolean; item?: OwnedWeapon; message?: string };
  applyOilResults: (oilRes: any) => void;
  triggerYabawiEvent: () => void;
  useGamblingToken: () => boolean;
  giveGamblingToken: (tokens: number, fragments?: number) => void;
  synthesizeTujeonTokens: () => boolean;
  combatAnalysis: CombatAnalysis;
  startCombatAnalysis: (duration?: number) => void;
  stopCombatAnalysis: () => void;
  logCombatDamage: (entry: Omit<CombatLogEntry, 'timestamp'>) => void;
  updateCombatAnalysis: (dt: number) => void;
  startTower: () => void;
  updateTower: (dt: number) => void;
  tapTower: (bonusDmg?: number, isWeakness?: boolean) => void;
  selectTowerBuff: (buff: any) => void;
  selectTowerArtifact: (art: any) => void;
  handleTowerEvent: (type: "REST" | "BUFF" | "DANGER" | "MERCHANT") => void;
  leaveTower: () => void;
  toggleTowerAuto: () => void;
  useTowerComboSkill: () => void;
  toggleEquipSkill: (skillName: string) => void;
  triggerCombatTrap: (multiplier: number) => void;
  visitGiru: () => void;
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string }) => { success: boolean; message: string; event?: any };
  setLowPowerMode: (enabled: boolean) => void;
  setAutoFps: (enabled: boolean) => void;
  setActiveUpgradeDesc: (desc: any) => void;
  setUpgradeMultiplier: (m: number) => void;
  setSelectedForgeItem: (itemId: string | null) => void;
  setSelectedForgeOil: (oilId: string | null) => void;
  setActiveTab: (tab: any) => void;
  startFootworkGame: () => void;
  handleFootworkStep: (choice: number) => { success: boolean; combo: number; timeBonus: number; isClear: boolean };
  updateFootwork: (dt: number) => void;
  closeDawnSettlement: () => void;
  getNightBuffs: () => any;
  addGiruGift: (giftId: string, count: number) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  buyGiruInformation: (type: "TREASURE_FORECAST" | "BOSS_RAID_CLUE") => void;
  triggerGodMode: () => void;
  getStatUpgradeBonus: (k: string) => number;
  setTutorialStep: (stepId: string) => void;
  completeTutorialStep: (stepId: string) => void;
  towerAttackTimer: number;
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  game: { ...defaultGameData, ...loadGame() },
  isSyncingFromCloud: false,
  isSyncingToCloud: false,
  lastSyncTime: 0,
  lastSyncHash: "",
  lastLocalSaveTime: 0,
  towerAttackTimer: 0,
  combatAnalysis: {
    isActive: false,
    timeLeft: 0,
    log: [],
    results: null
  },

  setPlayerInfo: (info: any) => { 
    set((s: any) => ({ 
      game: { 
        ...s.game, 
        ...info, 
        isInitialized: true, 
        tutorialProgress: { 
          isActive: true, 
          currentStepId: "start_faction",
          completedStepIds: []
        } 
      } 
    })); 
    get().triggerSave(); 
  },

  triggerYabawiEvent: () => {
    set((s: any) => ({
      game: {
        ...s.game,
        yabawiEvent: { active: true, expiresAt: Date.now() + 3 * 60 * 1000 }
      }
    }));
    get().triggerSave(true);
  },
  useGamblingToken: () => {
    const { game } = get();
    if (game.tujeonTokens > 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          tujeonTokens: s.game.tujeonTokens - 1,
          yabawiEvent: null // 이벤트 성공적으로 사용 시 팝업 닫힘
        }
      }));
      get().triggerSave(true);
      return true;
    }
    return false;
  },
  giveGamblingToken: (tokens: number, fragments: number = 0) => {
    if (tokens > 0) {
      get().addWeapon({
        id: `token_${Date.now()}`,
        name: "투전패",
        type: "material",
        count: tokens,
        icon: "🎴",
        slot: "materials",
        realm: get().game.realm,
        price: 5000
      });
    }
    if (fragments > 0) {
      get().addWeapon({
        id: `token_frag_${Date.now()}`,
        name: "투전패 조각",
        type: "material",
        count: fragments,
        icon: "🧩",
        slot: "materials",
        realm: get().game.realm,
        price: 500
      });
    }
  },
  synthesizeTujeonTokens: () => {
    const fragments = (get() as any).getMaterialCount("투전패 조각");
    if (fragments < 10) return false;
    
    const gainedTokens = Math.floor(fragments / 10);
    const toConsume = gainedTokens * 10;
    
    (get() as any).consumeMaterial("투전패 조각", toConsume);
    get().addWeapon({
      id: `token_${Date.now()}`,
      name: "투전패",
      type: "material",
      count: gainedTokens,
      icon: "🎴",
      slot: "materials",
      realm: get().game.realm,
      price: 5000
    });
    
    return true;
  },
  getSetCounts: () => {
    const { game } = get();
    const counts: Record<string, number> = {};
    if (!game.equippedGear) return counts;
    Object.values(game.equippedGear).forEach(id => {
      if (!id) return;
      const item = game.ownedWeapons.find(w => w.id === id);
      if (item?.setGroupId) {
        // Only count pieces of the same realm to trigger the set effect?
        // User said: "같은 '경지' 기준으로 묶임".
        // But also said "공격 세트", "생존 세트".
        // So we count setGroupId.
        counts[item.setGroupId] = (counts[item.setGroupId] || 0) + 1;
      }
    });
    return counts;
  },
  getOptionSum: (stat: string) => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    return eq.reduce((sum, item) => {
      const options = item.randomOptions?.filter(o => o.stat === stat) || [];
      const enhBonus = (item.enhancement || 0) * 0.1;
      const optVal = options.reduce((s, o) => s + (o.value + enhBonus), 0);
      return sum + optVal;
    }, 0);
  },
  getOptionCount: (stat: string) => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    return eq.filter(item => item.randomOptions?.some(o => o.stat === stat)).length;
  },
  getMaterialCount: (name: string) => {
    const { game } = get();
    // 1. 인연 점수 처리
    if (name.endsWith(" 인연")) {
      const faction = name.replace(" 인연", "");
      return (game.factionBonds && game.factionBonds[faction]) || 0;
    }
    // 2. 심득 포인트 처리
    if (name === "무학 심득" || name === "심득") {
      return game.wisdom || 0;
    }
    // 3. 재료 맵 및 인벤토리 아이템 처리
    let count = game.ownedWeapons
      .filter(w => w.name === name)
      .reduce((sum, w) => sum + (w.count || 0), 0);
    
    // 추가 맵 데이터 합산 (상점/대결 보상용)
    if (name === "일반 재료") count += (game.materials?.standard_material || 0);
    if (name === "진귀한 재료") count += (game.materials?.rare_material || 0);
    if (name === "영험한 재료") count += (game.materials?.epic_material || 0);
    if (name === "천외기보") count += (game.materials?.mythic_material || 0);
    
    if (name === "장비 조각") count += (game.gearFragments?.standard_gear_fragment || 0) + (game.gearPieces || 0);
    if (name === "신기 파편") count += (game.divineWeaponShards?.standard_divine_shard || 0);

    // 4. 비급 조각 맵 합산 (Library/Inventory 연동용)
    if (game.manualFragments && game.manualFragments[name]) {
      count += game.manualFragments[name];
    }

    return count;
  },
  consumeMaterial: (name: string, amount: number) => {
    set((s: any) => {
      // 1. 인연 점수 처리
      if (name.endsWith(" 인연")) {
        const faction = name.replace(" 인연", "");
        const nextBonds = { ...(s.game.factionBonds || {}) };
        nextBonds[faction] = Math.max(0, (nextBonds[faction] || 0) - amount);
        return { game: { ...s.game, factionBonds: nextBonds } };
      }

      // 2. 심득 포인트 처리
      if (name === "무학 심득" || name === "심득") {
        return { 
          game: { 
            ...s.game, 
            wisdom: Math.max(0, (s.game.wisdom || 0) - amount),
            insights: Math.max(0, (s.game.insights || 0) - amount) 
          } 
        };
      }

      // 3. 인벤토리 아이템 처리
      const owned = [...s.game.ownedWeapons];
      let remaining = amount;
      for (let i = owned.length - 1; i >= 0; i--) {
        if (owned[i].name === name) {
          const count = owned[i].count || 0;
          if (count <= remaining) {
            remaining -= count;
            owned.splice(i, 1);
          } else {
            owned[i] = { ...owned[i], count: count - remaining };
            remaining = 0;
            break;
          }
        }
      }
      return { game: { ...s.game, ownedWeapons: owned } };
    });
  },
  getNightBuffs: () => {
    const { game } = get();
    const buffs = {
      atk: 1,
      crit: 0,
      exp: 1,
      gold: 1,
      touch: 1,
      insight: 1,
      drop: 1,
      stoneDrop: 1,
      gambleWin: 0,
      mobSpawn: 1,
    };

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        const eff = b.effect;
        if (eff === "atk_up_10") buffs.atk += 0.1;
        else if (eff === "atk_up_20") buffs.atk += 0.2;
        else if (eff === "atk_up_30") buffs.atk += 0.3;
        else if (eff === "atk_boost_oldman") buffs.atk += 0.15;
        else if (eff === "crit_rate_up_5") buffs.crit += 5;
        else if (eff === "exp_gain_up_10") buffs.exp += 0.1;
        else if (eff === "gold_gain_up_10") buffs.gold += 0.1;
        else if (eff === "touch_eff_up_10") buffs.touch += 0.1;
        else if (eff === "insight_gain_up_5") buffs.insight += 0.05;
        else if (eff === "insight_gain_up_10") buffs.insight += 0.1;
        else if (eff === "insight_gain_up_20") buffs.insight += 0.2;
        else if (eff === "drop_up_20") buffs.drop += 0.2;
        else if (eff === "stone_drop_up_5") buffs.stoneDrop += 0.05;
        else if (eff === "stone_drop_up_10") buffs.stoneDrop += 0.1;
        else if (eff === "gamble_win_up_5") buffs.gambleWin += 5;
        else if (eff === "gamble_win_up_10") buffs.gambleWin += 10;
        else if (eff === "mob_spawn_up_10") buffs.mobSpawn += 0.1;
      });
    }
    return buffs;
  },
  getTotalAttack: () => {
    const { game } = get(); const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearAtk = eq.reduce((s, i) => s + (i.attackBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const realmMult = REALM_SETTINGS[game.realm]?.bonus || 1;

    // [재설계] 단계별 공격력 성장 공식 적용
    let upgradeAtk = get().getStatUpgradeBonus("atk");

    const mWeapon = game.ownedWeapons.find(w => w.id === (game.equippedGear?.mainWeapon || game.equippedWeaponId));
    const innBonus = get().getInnBonus();
    // 아이템 공격력% 보너스 (상한 200%)
    const optionAtkPct = Math.min(200, get().getOptionSum("atk_pct"));
    const optionAtkFlat = get().getOptionSum("atk");

    const nightBuffs = get().getNightBuffs();
    const nightAtkMult = nightBuffs.atk;

    let moveAtkMult = 1;
    if (game.movementBuff && game.movementBuff.data.atk) {
      moveAtkMult = game.movementBuff.data.atk;
    }

    const setCounts = get().getSetCounts();
    let setAtkMult = 1;
    let finalDmgMult = 1;
    
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces) {
            if (eff.stats.attackMultiplier) setAtkMult += eff.stats.attackMultiplier;
            if (eff.stats.finalDamageMultiplier) finalDmgMult += eff.stats.finalDamageMultiplier;
          }
        });
      }
    });

    const breakthroughAtk = game.breakthroughStats?.atk || 0;
    let final = (game.baseAttack + gearAtk + upgradeAtk + optionAtkFlat + breakthroughAtk) * (mWeapon?.attackMultiplier || 1) * realmMult * game.attackMultiplier * (1 + (faction?.bonusStats?.atk || 0) / 100) * (1 + innBonus.atk) * (1 + optionAtkPct / 100) * moveAtkMult * setAtkMult * finalDmgMult * nightAtkMult;

    // Special Training: Aura Type (Atk Bonus)
    if (faction?.specialTraining?.type === 'aura') {
      const specLevel = game.upgradeLevels?.eva || 0;
      final *= (1 + (specLevel * 0.002)); // 0.2% per level
    }

    // 연마유 광폭 버프 (공격력 3배)
    if (game.oilBuffs?.oil_atk_3 > 0) {
      final *= 3;
    }


    // Final Damage Synergy
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.finalDmg) final *= (1 + syn[5].finalDmg);
    });

    if (game.movementBuff && game.movementBuff.data.nextHit) {
      final *= game.nextHitMultiplier;
    }

    if (game.faction === "무당") { const combo = (game.lastAttackTime && (Date.now() - game.lastAttackTime < 1500)) ? game.comboCount : 0; final *= (1 + Math.min(combo * 0.05, 1.0)); }
    return Math.floor(final);
  },
  getStableAttack: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const gAtk = eq.reduce((s, i) => s + (i.attackBonus || 0), 0); const uAtk = get().getStatUpgradeBonus("atk");
    return Math.floor((game.baseAttack + gAtk + uAtk) * (REALM_SETTINGS[game.realm]?.bonus || 1));
  },
  getTotalCritRate: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const skillBonus = (game.learnedSkills || []).reduce((acc: number, sk: any) => acc + (sk.crit || 0), 0);

    let setCrit = 0;
    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces && eff.stats.critRate) setCrit += eff.stats.critRate;
        });
      }
    });

    const nightBuffs = get().getNightBuffs();
    const breakthroughCrit = game.breakthroughStats?.critRate || 0;
    let finalCrit = (game.critRate || 5) + eq.reduce((s, i) => s + (i.critBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + get().getStatUpgradeBonus("critRate") + get().getOptionSum("crit_rate") + breakthroughCrit + skillBonus + setCrit + nightBuffs.crit;

    // 최종 상한 적용 (50%)
    finalCrit = Math.min(50, finalCrit);

    // 연마유 영안 버프 (치명타 50% 상승 - 감쇠 및 상한 이후 합산)
    if (game.oilBuffs?.oil_eye > 0) {
      finalCrit = Math.min(100, finalCrit + 50);
    }

    return finalCrit;
  },
  getTotalCritDmg: () => {
    const { game } = get();
    let moveMult = 1;
    if (game.movementBuff && game.movementBuff.data.critDmgMult) moveMult = game.movementBuff.data.critDmgMult;
    const breakthroughCritDmg = game.breakthroughStats?.critDmg || 0;
    const base = 150 + game.ownedWeapons.filter((w: any) => Object.values(game.equippedGear || {}).includes(w.id)).reduce((s: any, i: any) => s + (i.critDmgBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + get().getStatUpgradeBonus("critDmg") + (get().getInnBonus().critDmg) + get().getOptionSum("crit_dmg_pct") + breakthroughCritDmg;

    let bonus = 0;
    if (game.movementBuff && game.movementBuff.data.critDmg) bonus = game.movementBuff.data.critDmg;

    let setBonus = 0;
    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 3 && syn[3]?.critDmg) setBonus += syn[3].critDmg;
    });

    let auraBonus = 0;
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'aura') {
      const specLevel = game.upgradeLevels?.eva || 0;
      auraBonus = specLevel * 1; // 1% per level
    }

    let finalCritDmg = (base + bonus + setBonus + auraBonus) * moveMult;

    // 최종 상한 적용 (280%)
    finalCritDmg = Math.min(280, finalCritDmg);

    // 연마유 파천 버프 (치명 피해 3배)
    if (game.oilBuffs?.oil_crit_3 > 0) {
      finalCritDmg *= 3;
    }


    return finalCritDmg;
  }, getTotalHpRecovery: () => {
    const { game } = get();
    const maxHp = get().getTotalHp();
    const baseRegen = Math.max(1, Math.floor(maxHp * 0.01));

    // [재설계] 단계당 고정 회복 추가
    const upgradeRegen = get().getStatUpgradeBonus("hpRecovery");

    let specBonus = 0;
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      specBonus = specLevel * 100; // +100 per level
    }

    const breakthroughHpRec = game.breakthroughStats?.hpRec || 0;
    
    // 장비 보너스 (반지 하이브리드 재생 등)
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const equipFlatRegen = eq.reduce((s, i) => s + (i.hpRegenBonus || 0), 0);
    const equipPctRegen = eq.reduce((s, i) => s + (i.hpRegenPctBonus || 0), 0);

    return baseRegen + upgradeRegen + specBonus + breakthroughHpRec + equipFlatRegen + Math.floor(maxHp * equipPctRegen);
  },
  getTotalMpRecovery: () => {
    const { game } = get();
    const maxMp = get().getTotalMp();
    return Math.max(1, Math.floor(maxMp * 0.01)) + get().getStatUpgradeBonus("mpRec");
  },
  getTotalDefense: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    let moveMult = 1;
    if (game.movementBuff && game.movementBuff.data.def) moveMult = game.movementBuff.data.def;
    const setCounts = get().getSetCounts();
    let setDefMult = 1;
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces && eff.stats.defenseMultiplier) setDefMult += eff.stats.defenseMultiplier;
        });
      }
    });

    const faction = FACTIONS.find(f => f.name === game.faction);
    const optionDefPct = Math.min(180, get().getOptionSum("def_pct"));

    // [재설계] 방어력 성장 공식: 무기 공격력 기준 비율 적용 (도포)
    const mWeapon = game.ownedWeapons.find(w => w.id === game.equippedGear?.mainWeapon);
    const baseWeaponAtk = mWeapon?.attackBonus || 10;
    
    const defUpgradeBonus = get().getStatUpgradeBonus("def");
    const breakthroughDef = game.breakthroughStats?.def || 0;

    let finalDef = (game.def + eq.reduce((s, i) => s + (i.defenseBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + defUpgradeBonus + breakthroughDef) * (1 + (faction?.bonusStats?.def || 0) / 100) * moveMult * setDefMult * (1 + optionDefPct / 100);

    // Special Training: Armor Type (Def Bonus)
    if (faction?.specialTraining?.type === 'armor') {
      const specLevel = game.upgradeLevels?.eva || 0;
      finalDef *= (1 + (specLevel * 0.005)); // 0.5% per level
    }

    return Math.floor(finalDef);
  },
  getTotalHp: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    
    const setCounts = get().getSetCounts();
    let setHpMult = 1;
    let setHpRegen = 0;
    
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces) {
            if (eff.stats.hpRegenPct) setHpRegen += eff.stats.hpRegenPct;
            // Note: Survival set has defense/dmg reduction, not flat HP mult in Request
          }
        });
      }
    });

    const hpUpgradeBonus = get().getStatUpgradeBonus("hpRec") * 10; // Upgrade adds to base HP too
    const breakthroughHp = game.breakthroughStats?.hp || 0;

    let baseTotal = (game.maxHp + eq.reduce((s, i) => s + (i.hpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + hpUpgradeBonus + get().getOptionSum("hp") + breakthroughHp) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.hp || 0) / 100) * setHpMult;

    const faction = FACTIONS.find(f => f.name === game.faction);
    const optionHpPct = Math.min(220, get().getOptionSum("hp_pct"));

    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      baseTotal *= (1 + (specLevel * 0.001)); // 0.1% per level
    }

    return Math.floor(baseTotal * (1 + optionHpPct / 100));
  },
  getTotalEvasion: () => {
    const { game } = get();
    const factionData = FACTIONS.find(f => f.name === game.faction);
    const factionBaseEva = factionData?.bonusStats?.eva || 0;
    const breakthroughEva = game.breakthroughStats?.eva || 0;
    let eva = (game.eva || 0) + get().getStatUpgradeBonus("eva") + get().getOptionSum("eva") + factionBaseEva + breakthroughEva;
    
    // Add flat evade from equipment
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    eva += eq.reduce((s, i) => s + (i.evadeBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);

    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces && eff.stats.evasion) eva += eff.stats.evasion;
        });
      }
    });

    // 최종 상한 적용 (기본 50%, 무당은 80%)
    let cap = 50;
    if (game.faction === "무당") {
      cap = 80;
      eva += 25; // 무당 기본 회피 보너스 (상향!)
    }

    if (game.movementBuff && game.movementBuff.data.evaCap) cap = game.movementBuff.data.evaCap;
    
    // 연마유 무영 버프 (회피율 3배)
    if (game.oilBuffs?.oil_eva_3 > 0) {
      eva = Math.min(100, eva * 3);
    }

    return Math.min(cap, eva);
  }, getTotalLuck: () => {
    const { game } = get();
    let luck = get().getStatUpgradeBonus("luck");
    if (game.oilBuffs?.oil_luck_3 > 0) luck *= 3;
    return luck;
  }, getTotalSpeed: () => {
    const { game } = get();
    // 신법가속(Speed)은 오직 장갑 슬롯에서만 가져옴
    const glovesId = game.equippedGear?.gloves;
    const gloves = game.ownedWeapons.find(w => w.id === glovesId);
    
    let speedPct = 0;
    if (gloves) {
      (gloves.randomOptions || []).forEach(o => {
        if (o.stat === "speed_pct") speedPct += o.value;
      });
    }

    // 최종 공속 증가 상한 (신기 등급 최대 25%이므로 100%면 충분)
    return Math.min(100, speedPct);
  },
  processAttackGauge: () => {
    const { getTotalSpeed } = get();
    const speed = getTotalSpeed();
    if (speed <= 0) return 0;
    
    let extraHits = 0;
    set((s: any) => {
      let nextGauge = (s.game.speedGauge || 0) + speed;
      while (nextGauge >= 100) {
        extraHits += 1;
        nextGauge -= 100;
      }
      return { game: { ...s.game, speedGauge: nextGauge } };
    });
    return extraHits;
  },
  getTotalMp: () => {
    const { game } = get();
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));

    const setCounts = get().getSetCounts();
    let setMpMult = 1;
    Object.entries(setCounts).forEach(([setId, count]) => {
      const group = (SET_GROUPS as any[]).find(g => g.id === setId);
      if (group) {
        group.effects.forEach((eff: any) => {
          if (count >= eff.pieces && eff.stats.maxMpMultiplier) setMpMult += eff.stats.maxMpMultiplier;
        });
      }
    });

    const optionMpPct = Math.min(200, get().getOptionSum("mp_pct"));
    const breakthroughMp = game.breakthroughStats?.mp || 0;
    let baseTotal = (game.maxMp + eq.reduce((s, i) => s + (i.mpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + get().getStatUpgradeBonus("mpRec") + get().getOptionSum("mp") + breakthroughMp) * setMpMult;
    return Math.floor(baseTotal * (1 + optionMpPct / 100));
  },
  getInnBonus: () => {
    const r = get().game.duel.rating || 0;
    if (r >= 60000) return { name: "천인합일", atk: 0.5, gold: 1.0, exp: 1.0, critDmg: 300, critRate: 15 };
    if (r >= 30000) return { name: "신화경", atk: 0.35, gold: 0.8, exp: 0.8, critDmg: 200, critRate: 10 };
    if (r >= 15000) return { name: "생사경", atk: 0.25, gold: 0.6, exp: 0.6, critDmg: 150, critRate: 8 };
    if (r >= 8000) return { name: "현경", atk: 0.2, gold: 0.5, exp: 0.5, critDmg: 100, critRate: 5 };
    if (r >= 4000) return { name: "화경", atk: 0.15, gold: 0.35, exp: 0.35, critDmg: 60, critRate: 3 };
    if (r >= 2000) return { name: "초절정", atk: 0.1, gold: 0.25, exp: 0.25, critDmg: 40, critRate: 2 };
    if (r >= 1000) return { name: "절정고수", atk: 0.05, gold: 0.2, exp: 0.2, critDmg: 20, critRate: 0 };
    if (r >= 500) return { name: "일류고수", atk: 0, gold: 0.15, exp: 0.15, critDmg: 10, critRate: 0 };
    if (r >= 200) return { name: "초출강호", atk: 0, gold: 0.1, exp: 0.05, critDmg: 0, critRate: 0 };
    return { name: "무명소졸", atk: 0, gold: 0, exp: 0, critDmg: 0, critRate: 0 };
  },
  getTotalCombatPower: () => {
    const atkBase = get().getTotalAttack() * 2 + get().getTotalHp() / 10 + get().getTotalDefense() * 5;
    const critMult = 1 + get().getTotalCritRate() / 100;
    const speedMult = 1 + get().getTotalSpeed() / 100;
    return Math.floor(atkBase * critMult * speedMult);
  },

  addExp: (amount: number, isAuto = false, manualDamage?: number) => {
    const { game } = get();
    // 사용자 요청에 따라 무뢰배 이벤트 대기 중에는 모든 수련(터치 포함) 중단
    if (game.pendingInnEntry || game.timingMission.available) return;
    // 전투 중이거나 탑 내부일 때 중단
    if (game.masterDuel.isPlaying || game.tower?.isInside) return;
    const totalAtk = get().getTotalAttack(); const autoLv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + (autoLv * 0.0003); const goldB = 1 + (autoLv * 0.0005);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const innBonus = get().getInnBonus();
    const nightBuffs = get().getNightBuffs();
    const nightExpMult = nightBuffs.exp;
    const nightGoldMult = nightBuffs.gold;
    const nightTouchMult = nightBuffs.touch;

    const finalExp = amount * nightExpMult * eq.reduce((a, i) => a * (1 + (i.expMultiplier || 0)), 1) * (1 + (FACTIONS.find(f => f.name === game.faction)?.expBonus || 0) / 100) * expB * (1 + innBonus.exp) * (1 + get().getOptionSum("exp_pct") / 100);
    const factionCoinBonus = (FACTIONS.find(f => f.name === game.faction)?.coinBonus || 0) / 100;
    const itemGoldB = eq.reduce((a, i) => a + (i.goldMultiplier || 0), 1);
    const finalGoldB = goldB * (1 + innBonus.gold) * nightGoldMult * (1 + factionCoinBonus) * itemGoldB;

    let killsAdded = 0;
    let milestoneToTrigger: string | null = null;
    set((s: any) => {
      const now = Date.now();
      let combo = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;
      let tKills = s.game.totalDummyKills;
      let rep = s.game.reputation || 0;
      let eGold = 0;
      let lastR = s.game.lastReward;
      const nTouches = s.game.touches + (nightTouchMult + eq.reduce((a, i) => a + (i.touchMultiplier || 0), 0)) * amount;

      // [추가] 튜토리얼 마지막 단계에서 터치 발생 시 튜토리얼 강제 종료
      if (s.game.tutorialProgress.isActive && 
         (s.game.tutorialProgress.currentStepId === "restart_training" || 
          s.game.tutorialProgress.currentStepId === "check_final_infused_options")) {
        // 타이머 없이 즉시 종료 처리하여 터치 반응성 보장
        s.game.tutorialProgress.isActive = false;
        s.game.tutorialProgress.currentStepId = "";
      }

      const stats = getDummyStats(s.game.realm, s.game.star, totalAtk);

      let pIE = s.game.pendingInnEntry;
      let iEV = s.game.innEventVersion || 0;
      let currentIdx = s.game.innEventIndex || 0;
      
      let qT = s.game.questTarget;
      let cMT = s.game.currentMissionTitle;
      let uTabs = [...(s.game.unlockedTabs || [])];
      let uET = s.game.unlockEffectText;
      let aB = s.game.activeBuff;
      let aM = s.game.attackMultiplier || 1;
      let bTL = s.game.buffTimeLeft || 0;
      let extraHitsFromSpeed = 0;

      // 자동 수련(Auto Attack)인 경우 게이지 처리
      if (isAuto) {
        // amount가 1 이상일 때만 게이지를 쌓음 (일반적으로 1초당 여러번 호출될 수 있으므로)
        // 여기서는 amount 횟수만큼 게이지를 체크함
        const times = Math.max(1, Math.floor(amount));
        for (let i = 0; i < times; i++) {
          extraHitsFromSpeed += get().processAttackGauge();
        }
      }

      const hitCount = Math.max(1, Math.floor(amount + extraHitsFromSpeed));
      const rG = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
      let currentDummyHp = s.game.dummyHp;
      let totalDamageDealt = 0;

      for (let i = 0; i < hitCount; i++) {
        let isHitDodged = Math.random() < stats.eva / 100;
        let dmg = 0;
        if (manualDamage !== undefined) {
          dmg = manualDamage;
        } else {
          const critRate = get().getTotalCritRate() / 100;
          const critDmg = get().getTotalCritDmg() / 100;
          const avgCritMult = 1 + critRate * (critDmg - 1);
          const skillBonus = (s.game.learnedSkills || []).length > 0 ? 1.2 : 1.0;
          const baseDmg = isHitDodged ? 0 : Math.max(1, totalAtk - stats.def);
          dmg = baseDmg * avgCritMult * skillBonus;
        }

        const softCap = stats.hp * 0.15;
        if (dmg > softCap) {
          dmg = softCap + (dmg - softCap) * 0.1;
        }

        totalDamageDealt += dmg;
        currentDummyHp -= dmg;
        if (currentDummyHp <= 0) {
          tKills += 1;
          killsAdded += 1;
          const isTreasureForecast = s.game.nextDayEvent?.type === "TREASURE_FORECAST";
          let kG = (s.game.attackMultiplier > 1 ? 50 * rG : 25 * rG) * finalGoldB;
          if (isTreasureForecast) {
            kG *= 3;
            lastR = "💰 TREASURE!";
          }
          eGold += kG;
          currentDummyHp = stats.hp;
        }
        if (isHitDodged) lastR = "빗나감!";
      }

      const intervals = [300, 400, 500, 600, 700, 800, 900, 1000];
      const isTreasureForecast = s.game.nextDayEvent?.type === "TREASURE_FORECAST";
      const spawnBonus = isTreasureForecast ? 1.5 : 0;
      const targetInterval = Math.floor(intervals[currentIdx % 8] / (nightBuffs.mobSpawn + spawnBonus));
      const killGap = tKills - (s.game.lastInnEventKillCount || 0);

      let nTM = { ...s.game.timingMission };

      if (tKills >= 300 && killGap >= targetInterval && !nTM.available && !s.game.tutorialProgress.isActive) {
        const miniGames = ["breath", "dodge", "puzzle", "pulse"];
        const selectedGame = miniGames[iEV % 4];
        const RIVAL_NAMES = ["흑풍낭인", "독고패", "철권마웅", "살수 무영", "청도방 무뢰배", "혈검 귀수", "낙양 망나니", "산적 두목", "비도 갈천", "광마 서걸", "쌍검객", "무정사", "혈랑도", "철기방 졸개", "비연수", "금강권"];
        const randomRivalName = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];

        pIE = true;
        iEV += 1;
        nTM = {
          ...nTM,
          available: true,
          selectedGameType: selectedGame as any,
          rivalName: `${randomRivalName} (${iEV}차)`,
          requiredHits: 1,
          isPractice: false,
          currentStage: 1,
          unlocked: true,
        };
        currentIdx = (currentIdx + 1) % 8;
        setTimeout(() => useGameStore.setState((p: any) => ({ game: { ...p.game, activeTab: "inn" } })), 1000);
      }

      if (hitCount > 0) {
        const firstHitDodged = Math.random() < stats.eva / 100;
        if (firstHitDodged) get().triggerMovementBuff();

        if (s.game.movementBuff) {
          if (s.game.movementBuff.data.lifeSteal) {
            const lsRatio = s.game.movementBuff.data.lifeSteal / 100;
            const healAmt = totalDamageDealt * lsRatio;
            if (healAmt > 0) get().heal(healAmt);
          }
          if (s.game.movementBuff.data.healPerTouch) {
            const healAmt = get().getTotalHp() * (s.game.movementBuff.data.healPerTouch / 100) * hitCount;
            get().heal(healAmt);
          }
        }
      }

      const finalKills = tKills;
      const finalKillGap = tKills >= 300 ? killGap : tKills;

      rep += eGold;
      const stats_hp = stats.hp;
      let qT_val = qT;
      let cMT_val = cMT;
      let uTabs_val = uTabs;
      let uET_val = uET;
      let aM_val = aM;
      let bTL_val = bTL;
      let aB_val = aB;

      if (finalKills >= qT_val) {
        if (qT_val === 10) {
          qT_val = 30;
          cMT_val = "허수아비 누적 처치 30번\n[개방: 대장간/장비]";
          uET_val = null;
          aM_val = 10; bTL_val = 30; aB_val = "무아지경";
          milestoneToTrigger = "trance_achieved";
        } else if (qT_val === 30) {
          qT_val = 50;
          cMT_val = "허수아비 누적 처치 50번\n[개방: 강화]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "forge", "inventory"]));
          milestoneToTrigger = "forge_unlock";
        } else if (qT_val === 50) {
          qT_val = 80;
          cMT_val = "허수아비 누적 처치 80번\n[개방: 비급/기루/도박]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "upgrade"]));
          milestoneToTrigger = "upgrade_unlock";
        } else if (qT_val === 80) {
          qT_val = 100;
          cMT_val = "허수아비 누적 처치 100번\n[개방: 무한의 탑]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "library", "giru", "gambling"]));
          milestoneToTrigger = "library_unlock";
        } else if (qT_val === 100) {
          qT_val = 150;
          cMT_val = "허수아비 누적 처치 150번\n[개방: 대결]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "tower"]));
          milestoneToTrigger = "tower_unlock";
        } else if (qT_val === 150) {
          qT_val = 290;
          cMT_val = "허수아비 누적 처치 290번\n[개방: 객잔]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "master"]));
          milestoneToTrigger = "master_unlock";
        } else if (qT_val === 290) {
          qT_val = 300; 
          cMT_val = "허수아비 누적 처치 290번\n[개방: 객잔]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "inn"]));
          pIE = false;
          milestoneToTrigger = "inn_event";
        } else if (finalKills >= 300) {
          qT_val = targetInterval;
          cMT_val = `객잔 무뢰배 추격 (${iEV + 1}차)\n허수아비를 ${targetInterval}회 더 처단하세요.`;
          uET_val = null;
        }
        if (uET_val) lastR = uET_val;
      }

      return {
        game: {
          ...s.game,
          timingMission: nTM,
          coins: s.game.coins + eGold,
          reputation: rep,
          exp: s.game.exp + finalExp,
          dummyHp: currentDummyHp,
          maxDummyHp: stats_hp,
          totalDummyKills: finalKills,
          activeQuests: s.game.activeQuests,
          dummyKills: finalKillGap,
          questTarget: finalKills >= 300 ? targetInterval : qT_val,
          currentMissionTitle: cMT_val,
          unlockedTabs: uTabs_val,
          unlockEffectText: uET_val,
          attackMultiplier: aM_val,
          buffTimeLeft: bTL_val,
          activeBuff: aB_val,
          pendingInnEntry: pIE,
          innEventVersion: iEV,
          innEventIndex: currentIdx,
          lastInnEventKillCount: (finalKillGap >= targetInterval) ? finalKills : s.game.lastInnEventKillCount,
          touches: nTouches,
          comboCount: combo,
          lastAttackTime: now,
          lastReward: lastR,
          timeRemaining: (s.game.timeState === "day") ? Math.max(0, s.game.timeRemaining - (amount * 0.1)) : s.game.timeRemaining
        }
      };
    });
    if (milestoneToTrigger && !get().game.tutorialProgress.completedStepIds.includes(milestoneToTrigger)) {
      get().setTutorialStep(milestoneToTrigger);
    }
    get().updateQuestProgress("dummy_hit", Math.max(1, Math.floor(amount)));
    if (killsAdded > 0) {
      get().updateQuestProgress("dummy_kill", killsAdded);
    }
    get().triggerSave();
  },

  updateQuestProgress: (targetType: string, amount: number = 1) => {
    set((s: any) => {
      if (!s.game.activeQuests) return s;
      let changed = false;
      const nextQuests = s.game.activeQuests.map((q: any) => {
        if (q.status === "active") {
          // 목표 유형별 특별 처리
          const tid = q.templateId || q.id;
          if (q.targetType === "reach_upgrade_level") {
             const parts = tid.split("_");
             const key = parts[3] || parts[2]; // Handle q_adaptive_stat_... vs q_stat_...
             const currentLv = s.game.upgradeLevels?.[key] || 0;
             if (currentLv >= q.targetCount) {
                changed = true;
                setTimeout(() => alert(`[임무 완료] ${q.title}`), 500);
                return { ...q, currentCount: q.targetCount, status: "completed" };
             }
          }
          if (q.targetType === "reach_duel_rating") {
             const currentRating = s.game.duel?.rating || 0;
             if (currentRating >= q.targetCount) {
                changed = true;
                setTimeout(() => alert(`[임무 완료] ${q.title}`), 500);
                return { ...q, currentCount: q.targetCount, status: "completed" };
             }
          }
          if (q.targetType === "tower_floor_milestone") {
             const currentHighest = s.game.tower?.highestFloor || 0;
             if (currentHighest >= q.targetCount) {
                changed = true;
                setTimeout(() => alert(`[임무 완료] ${q.title}`), 500);
                return { ...q, currentCount: q.targetCount, status: "completed" };
             }
          }

          // 도박 승리 (판돈 조건 체크)
          if (targetType === "gamble_win") {
             const betAmount = amount; 
             if (tid === "q_chowoon_1") {
                if (betAmount >= 5000000) {
                   const nextCount = q.currentCount + 1;
                   const isDone = nextCount >= q.targetCount;
                   if (isDone) setTimeout(() => alert(`[퀘스트 완료] ${q.title}`), 500);
                   changed = true;
                   return { ...q, currentCount: Math.min(q.targetCount, nextCount), status: isDone ? "completed" : "active" };
                } else {
                   return q; // 조건 미달 시 무시
                }
             }
          }
          
          if (q.targetType === targetType) {
            const nextCount = q.currentCount + amount;
            const isDone = nextCount >= q.targetCount;
            if (isDone) {
              setTimeout(() => {
                alert(`[퀘스트 완료] ${q.title}\n월향루에서 보상을 받으세요!`);
              }, 500);
            }
            changed = true;
            return { ...q, currentCount: Math.min(q.targetCount, nextCount), status: isDone ? "completed" : "active" };
          }
        }
        return q;
      });
      if (!changed) return s;
      return { game: { ...s.game, activeQuests: nextQuests } };
    });
  },
  refreshQuests: () => {
    set((s: any) => {
      const newQuests = getNextAdaptiveQuests(s.game).map((q, idx) => ({
        ...q,
        templateId: q.id,
        id: `q_${q.id}_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`
      }));
      return {
        game: {
          ...s.game,
          activeQuests: newQuests
        }
      };
    });
  },

  claimQuestReward: (questId: string) => {
    const { game, addCoins, updateQuestProgress, refreshQuests } = get();
    const quest = (game.activeQuests || []).find((q: any) => q.id === questId);
    if (!quest || quest.status !== "completed") return;

    set((s: any) => {
      const reward = quest.reward || {};
      const nextConsumables = { ...(s.game.consumables || {}) };
      
      // 특별 보상 처리 (아이템 등)
      if (reward.item === "oil_box") {
        nextConsumables.oil_box = (nextConsumables.oil_box || 0) + 1;
      }
      const nextGearPieces = reward.item === "gear_piece_10" 
        ? (s.game.gearPieces || 0) + 10 
        : (s.game.gearPieces || 0);

      const msg = `🎁 임무 보상 획득!\n금화 ${(reward.gold || 0).toLocaleString()}냥, 명성 ${(reward.favor ? reward.favor * 1000 : 0).toLocaleString()} 획득`;

      const nextQuests = s.game.activeQuests.filter((q: any) => q.id !== questId);

      if (reward && reward.token && reward.token > 0) {
        setTimeout(() => get().addWeapon({
          id: `token_${Date.now()}`,
          name: "투전패",
          type: "material",
          count: reward.token,
          icon: "🎴",
          slot: "materials",
          realm: s.game.realm,
          price: 5000
        }), 0);
      }

      return {
        game: {
          ...s.game,
          coins: s.game.coins + (reward.gold || 0),
          reputation: (s.game.reputation || 0) + (reward.favor ? reward.favor * 1000 : 0),
          exp: (s.game.exp || 0) + (reward.exp || 0),
          gearPieces: nextGearPieces,
          npcFavors: (() => {
             const nextFavors = { ...(s.game.npcFavors || {}) };
             if (quest.npcId && reward.favor) {
                const nameMap: any = { yeonhwa: "연화", seolmae: "설매", chowoon: "초운", sohee: "소희", oldman: "백노인" };
                const kname = nameMap[quest.npcId] || quest.npcId;
                nextFavors[kname] = (nextFavors[kname] || 0) + reward.favor;
             }
             return nextFavors;
          })(),
          consumables: nextConsumables,
          activeQuests: nextQuests,
          lastReward: msg
        }
      };
    });

    // 보상 수령 후 즉시 새로운 퀘스트 보충
    refreshQuests();
    get().triggerSave(true);
    alert(`[임무 보상 수령 완료]`);
  },

  rerollQuest: (questId: string) => {
    const { game, refreshQuests } = get();
    const count = game.questRerollCount || 0;
    if (count >= 2) {
      alert("오늘은 더 이상 임무를 갱신할 수 없습니다. (일일 최대 2회)");
      return;
    }

    set((s: any) => {
      const nextQuests = (s.game.activeQuests || []).filter((q: any) => q.id !== questId);
      return {
        game: {
          ...s.game,
          activeQuests: nextQuests,
          questRerollCount: count + 1
        }
      };
    });

    // 제거 후 즉시 새로운 퀘스트 보충
    refreshQuests();
    get().triggerSave(true);
    alert(`임무를 갱신했습니다. (남은 횟수: ${1 - count}회)`);
  },

  addWeapon: (w: any) => {
    set((s: any) => {
      // 스택 가능한 아이템(재료 등)인 경우
      if (w.type === "material") {
        const owned = [...s.game.ownedWeapons];
        let remaining = w.count || 1;
        
        // 1. 기존 스택에 먼저 채움
        for (let i = 0; i < owned.length; i++) {
          if (owned[i].name === w.name && (owned[i].count || 0) < 99) {
            const canAdd = 99 - (owned[i].count || 0);
            const toAdd = Math.min(canAdd, remaining);
            owned[i] = { ...owned[i], count: (owned[i].count || 0) + toAdd };
            remaining -= toAdd;
            if (remaining <= 0) break;
          }
        }
        
        // 2. 남은 수량이 있으면 새로운 스택 생성
        while (remaining > 0) {
          const toAdd = Math.min(99, remaining);
          owned.push({ ...w, id: `${w.id}_${Date.now()}_${owned.length}`, count: toAdd });
          remaining -= toAdd;
        }
        
        return { game: { ...s.game, ownedWeapons: owned } };
      }

      // 일반 장비는 그대로 추가
      return { game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, w] } };
    });
    get().triggerSave(true);
    if (w.tier === "신기" || w.tier === "보구" || w.tier === "명품") {
      get().syncToCloud(true);
    }
  },
  addCoins: (amount: number) => {
    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + amount } }));
    get().triggerSave(true);
  },

  learnSkill: (skill: any, reqs: any) => {
    set((s: any) => {
      const g = s.game;
      
      // 1. Sufficiency Check
      if (typeof reqs === 'number') {
        if (g.coins < reqs) return s;
      } else if (reqs && typeof reqs === 'object') {
        if (g.coins < (reqs.goldCost || 0)) return s;
        if (reqs.requiredFragments > 0) {
          if ((get() as any).getMaterialCount(reqs.fragmentId) < reqs.requiredFragments) return s;
        }
        if (reqs.requiredMaterials > 0) {
          if ((get() as any).getMaterialCount("일반 재료") < reqs.requiredMaterials) return s;
        }
        if (reqs.requiredGearFragments > 0) {
          if ((get() as any).getMaterialCount("장비 조각") < reqs.requiredGearFragments) return s;
        }
        if (reqs.requiredDivineWeaponShards > 0) {
          if ((get() as any).getMaterialCount("신기 파편") < reqs.requiredDivineWeaponShards) return s;
        }
        if (reqs.requiredBonds > 0) {
          const bondName = `${reqs.bondId} 인연`;
          if ((get() as any).getMaterialCount(bondName) < reqs.requiredBonds) return s;
        }
        if (reqs.requiredInsights > 0) {
          if ((g.insights || 0) < reqs.requiredInsights) return s;
        }
      }

      // 2. Consumption Logic
      let nextGame = { ...g };
      if (typeof reqs === 'number') {
        nextGame.coins -= reqs;
      } else if (reqs && typeof reqs === 'object') {
        nextGame.coins -= (reqs.goldCost || 0);
        
        // --- 헬퍼: 재료 차감 로직 (nested set 방지용) ---
        const deductMaterial = (name: string, amount: number) => {
          const owned = [...(nextGame.ownedWeapons || [])];
          let remaining = amount;
          for (let i = owned.length - 1; i >= 0; i--) {
            if (owned[i].name === name) {
              const count = owned[i].count || 0;
              if (count <= remaining) {
                remaining -= count;
                owned.splice(i, 1);
              } else {
                owned[i] = { ...owned[i], count: count - remaining };
                remaining = 0;
                break;
              }
            }
          }
          nextGame.ownedWeapons = owned;
        };

        if (reqs.requiredFragments > 0) {
          deductMaterial(reqs.fragmentId, reqs.requiredFragments);
        }
        if (reqs.requiredMaterials > 0) {
          deductMaterial(reqs.materialId || "일반 재료", reqs.requiredMaterials);
        }
        if (reqs.requiredGearFragments > 0) {
          deductMaterial("장비 조각", reqs.requiredGearFragments);
        }
        if (reqs.requiredDivineWeaponShards > 0) {
          deductMaterial("신기 파편", reqs.requiredDivineWeaponShards);
        }
        if (reqs.requiredBonds > 0) {
          const faction = reqs.bondId;
          const nextBonds = { ...(nextGame.factionBonds || {}) };
          nextBonds[faction] = Math.max(0, (nextBonds[faction] || 0) - reqs.requiredBonds);
          nextGame.factionBonds = nextBonds;
        }
        if (reqs.requiredInsights > 0) {
          nextGame.wisdom = Math.max(0, (nextGame.wisdom || 0) - reqs.requiredInsights);
          nextGame.insights = Math.max(0, (nextGame.insights || 0) - reqs.requiredInsights);
        }
      }

      const isAlreadyLearned = g.learnedSkills.some((s: any) => (s.id || s.name) === (skill.id || skill.name));
      if (isAlreadyLearned) return s;

      const nextMartial = ensureLearnedSkill(g.martialArtsSkills || [], skill.id || skill.name);
      const equipped = g.masterDuel.equippedSkillIds || [];
      const nextEquipped = (equipped.length < 4 && !equipped.includes(skill.name))
        ? [...equipped, skill.name]
        : equipped;

      return {
        game: {
          ...nextGame,
          learnedSkills: [...nextGame.learnedSkills, skill],
          martialArtsSkills: nextMartial,
          masterDuel: {
            ...nextGame.masterDuel,
            equippedSkillIds: nextEquipped
          }
        }
      };
    });
    get().triggerSave(true);
  },

  refineSkill: (skillId: string) => {
    const { game } = get();
    const learned = (game.martialArtsSkills || []).find(s => s.skillId === skillId);
    if (!learned) return;

    const wisdomCost = getRefineWisdomCost(learned.stars);
    const goldCost = getRefineGoldCost(learned.stars);

    if (game.coins < goldCost || game.wisdom < wisdomCost) return;

    set((s: any) => ({
      game: {
        ...s.game,
        coins: s.game.coins - goldCost,
        wisdom: s.game.wisdom - wisdomCost,
        martialArtsSkills: refineLearnedSkill(s.game.martialArtsSkills, skillId)
      }
    }));
    get().updateQuestProgress("refine_skill", 1);
    get().triggerSave(true);
    get().syncToCloud(true);
  },

  synthesizeSkill: (recipeId: string) => {
    const { game } = get();
    const recipe = MARTIAL_SYNTHESIS_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const canDo = canSynthesize(recipe, game.martialArtsSkills || [], game.wisdom, game.coins || 0);
    if (!canDo) return;

    const skillData = {
      name: recipe.resultName,
      level: 1,
      exp: 0,
      maxExp: 100,
      type: recipe.resultCategory,
      value: 100,
      skillId: recipe.id,
      stars: 1,
      mpCost: recipe.resultGrade === "mythic" ? 15000 : 
              recipe.resultGrade === "legendary" ? 4000 :
              recipe.resultGrade === "epic" ? 1000 : 250
    };

    set((s: any) => {
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const nextEquipped = (equipped.length < 4 && !equipped.includes(recipe.resultName))
        ? [...equipped, recipe.resultName]
        : equipped;

      return {
        game: {
          ...s.game,
          coins: s.game.coins - recipe.goldCost,
          wisdom: s.game.wisdom - recipe.wisdomCost,
          learnedSkills: [...s.game.learnedSkills, skillData],
          martialArtsSkills: ensureLearnedSkill(s.game.martialArtsSkills || [], recipe.id),
          masterDuel: {
            ...s.game.masterDuel,
            equippedSkillIds: nextEquipped
          }
        }
      };
    });
    get().triggerSave(true);
    get().syncToCloud(true);
  },
  autoTrain: (mult = 1) => {
    const { game, addExp } = get();
    if (game.pendingInnEntry || game.timingMission.available) return;
    const baseGain = 1.0 + (game.upgradeLevels.autoGain || 0) * 0.01;
    addExp(baseGain * mult, true);
  },
  takeDamage: (amount: number) => set((s: any) => {
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;

    // 무당 태극보: 완전 면역
    if (s.game.movementBuff && s.game.movementBuff.data.invincible) amount = 0;
    if (amount <= 0) return s;

    // 사마세가 마영보(압기보): 내력 방어막
    if (s.game.movementBuff && s.game.movementBuff.data.manaShield) {
      const shieldRate = s.game.movementBuff.data.manaShield;
      const mpDmg = Math.floor(amount * shieldRate);
      const actualMpDmg = Math.min(nextMp, mpDmg);
      nextMp = Math.max(0, nextMp - actualMpDmg);
      amount -= actualMpDmg;
    }

    nextHp = Math.max(0, nextHp - amount);
    return { game: { ...s.game, hp: nextHp, mp: nextMp } };
  }),
  heal: (a: number) => set((s: any) => ({ game: { ...s.game, hp: Math.min(get().getTotalHp(), s.game.hp + a) } })),
  restoreMp: (amount: number) => {
    set((s: any) => ({ game: { ...s.game, mp: Math.min(get().getTotalMp(), s.game.mp + amount) } }));
  },

  openPaewangBox: () => {
    const { game } = get();
    if ((game.bossTokens || 0) < 500) {
      return { success: false, message: "혈투의 징표가 부족합니다." };
    }

    const realms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const rIdx = Math.max(0, realms.indexOf(game.realm));
    const randAcce = Math.random();
    const slot: EquipSlot = randAcce < 0.33 ? "necklace" : (randAcce < 0.66 ? "ring" : "bracelet");
    const baseName = slot === "necklace" ? "목걸이" : (slot === "ring" ? "반지" : "팔찌");

    // Base stats: 사용자 요청 반영 (기본 공3000, 생3000, 내1500)
    const rFactor = 1 + rIdx * 0.2;
    const baseItem: any = {
      id: `paewang_${slot}_${Date.now()}`,
      name: `[패왕] ${game.realm}의 ${baseName}`,
      slot,
      realm: game.realm as any,
      attackBonus: Math.floor(3000 * rFactor),
      mpBonus: Math.floor(1500 * rFactor),
      hpBonus: Math.floor(3000 * rFactor),
      price: 10000000,
      icon: slot === "necklace" ? "📿" : (slot === "ring" ? "💍" : "📿"),
      description: "패왕의 보물상자에서 획득한 신기 장신구입니다."
    };

    const divineItem = rollPaewangItem(baseItem, 20, game.upgradeLevels?.luck || 0, rIdx);

    set((s: any) => ({
      game: {
        ...s.game,
        bossTokens: (s.game.bossTokens || 0) - 500,
        ownedWeapons: [...s.game.ownedWeapons, divineItem]
      }
    }));

    get().triggerSave(true);
    get().syncToCloud(true);
    return { success: true, item: divineItem };
  },

  triggerSave: (i = false) => {
    if (i) {
      if (debounceTimer) clearTimeout(debounceTimer);
      // 즉시 저장 시에도 최소한의 안전장치 (1초)
      const now = Date.now();
      const lastSave = (get() as any).lastLocalSaveTime || 0;
      if (now - lastSave < 1000) return;

      saveGame({ ...get().game, lastSaveTime: now });
      (set as any)({ lastLocalSaveTime: now });
      debounceTimer = null;
      return;
    }
    if (!debounceTimer) {
      debounceTimer = setTimeout(() => {
        saveGame({ ...get().game, lastSaveTime: Date.now() });
        debounceTimer = null;
      }, 60000);
    }
  },
  importGameData: (data: any) => {
    set((s: any) => ({
      game: {
        ...s.game,
        ...data,
        tower: { ...s.game.tower, ...(data.tower || {}) }
      }
    }));
    get().triggerSave(true);
  },

  upgradeStat: (k: keyof GameSaveData["statUpgrades"]) => { const s = get(); s.upgradeStatMulti(k, 1, 'gold'); },
  getUpgradeCost: (k: keyof GameSaveData["statUpgrades"]) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = STAT_UPGRADE_BASES[k]?.gold || 1500;
    return Math.floor(base * Math.pow(1.0115, cL));
  },
  getReputationCost: (k: keyof GameSaveData["statUpgrades"]) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = STAT_UPGRADE_BASES[k]?.rep || 400;
    return Math.floor(base * Math.pow(1.0115, cL));
  },
  spendPoints: (k: keyof GameSaveData["statUpgrades"]) => { },
  getMultiUpgradeCost: (k: string, c: number, m: string) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = m === 'gold' ? (STAT_UPGRADE_BASES[k]?.gold || 1500) : (STAT_UPGRADE_BASES[k]?.rep || 400);
    // 등비수열의 합 공식: a * (r^n - 1) / (r - 1)
    const r = 1.0115;
    const a = base * Math.pow(r, cL);
    return Math.floor(a * (Math.pow(r, c) - 1) / (r - 1));
  },
  upgradeStatMulti: (k: string, c: number, m: string) => {
    const s = get();
    const cost = s.getMultiUpgradeCost(k, c, m as any);
    if ((m === 'gold' ? s.game.coins : s.game.reputation) < cost) return;
    set((s: any) => {
      const n = { ...s.game };
      if (m === 'gold') n.coins -= cost; else n.reputation -= cost;
      n.upgradeLevels = { ...n.upgradeLevels, [k]: (n.upgradeLevels[k] || 0) + c };
      return { game: n };
    });
    get().triggerSave(true);
  },

  getStatUpgradeBonus: (k: string) => {
    const { game } = get();
    const level = (game.upgradeLevels as any)[k] || 0;
    if (level <= 0) return 0;

    if (k === 'atk') {
      let tempAtk = game.baseAttack;
      for (let i = 1; i <= level; i++) {
        if (i <= 10) tempAtk += 2;
        else if (i <= 30) tempAtk = tempAtk * 1.04 + 2;
        else if (i <= 300) tempAtk *= 1.02;
        else if (i <= 600) tempAtk += 400;
        else tempAtk += 700;
      }
      return (tempAtk - game.baseAttack) * 2;
    }
    if (k === 'hpRec') {
      let tempHp = 1000;
      for (let i = 1; i <= level; i++) {
        if (i <= 30) tempHp *= 1.04;
        else if (i <= 300) tempHp *= 1.02;
        else if (i <= 600) tempHp += 2000;
        else tempHp += 4000;
      }
      return tempHp - 1000;
    }
    if (k === 'def') {
      let tempDef = 100;
      for (let i = 1; i <= level; i++) {
        if (i <= 30) tempDef *= 1.04;
        else if (i <= 300) tempDef *= 1.02;
        else if (i <= 600) tempDef += 200;
        else tempDef += 400;
      }
      return tempDef - 100;
    }
    if (k === 'mpRec') {
      let tempMp = 200;
      for (let i = 1; i <= level; i++) {
        if (i <= 30) tempMp *= 1.04;
        else if (i <= 300) tempMp *= 1.02;
        else if (i <= 600) tempMp += 500;
        else tempMp += 1000;
      }
      return tempMp - 200;
    }
    if (k === 'hpRecovery') {
      let tempRegen = 20;
      for (let i = 1; i <= level; i++) {
        if (i <= 30) tempRegen *= 1.04;
        else if (i <= 300) tempRegen *= 1.02;
        else if (i <= 600) tempRegen += 100;
        else tempRegen += 200;
      }
      return tempRegen - 20;
    }
    if (k === 'critRate') return level * 0.05;
    if (k === 'critDmg') return level * 0.5;
    if (k === 'eva') return level * 0.05;

    const inc = STAT_INCREMENTS[k] || 0;
    return level * inc;
  },

  breakthrough: () => {
    const { game } = get();
    const list = Object.keys(REALM_SETTINGS);
    const realmIdx = list.indexOf(game.realm);
    
    // 누적 돌파 횟수 계산 (필부 1성->2성이 첫 돌파)
    const breakthroughCount = (realmIdx * 10) + game.star;
    const rewardAmount = 40000 + (breakthroughCount * 10000);

    // --- [신규] 모든 능력치 +5% 보상 계산 (장비 기준) ---
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    
    // 1. 장비 기본 스탯 + 강화 보너스
    const gearAtk = eq.reduce((s, i) => s + (i.attackBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearDef = eq.reduce((s, i) => s + (i.defenseBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearHp = eq.reduce((s, i) => s + (i.hpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearMp = eq.reduce((s, i) => s + (i.mpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    
    // 2. 옵션 스탯 합산
    const optAtk = get().getOptionSum("atk");
    const optDef = get().getOptionSum("def");
    const optHp = get().getOptionSum("hp");
    const optMp = get().getOptionSum("mp");
    const optCritRate = get().getOptionSum("crit_rate");
    const optCritDmg = get().getOptionSum("crit_dmg_pct");
    const optEva = get().getOptionSum("eva");
    const optSpeed = get().getOptionSum("speed");
    const optHpRec = get().getOptionSum("hp_rec");

    // 3. 5% 보너스 계산 (정수형 변환)
    const bonusAtk = Math.floor((gearAtk + optAtk) * 0.05);
    const bonusDef = Math.floor((gearDef + optDef) * 0.05);
    const bonusHp = Math.floor((gearHp + optHp) * 0.05);
    const bonusMp = Math.floor((gearMp + optMp) * 0.05);
    const bonusCritRate = Number(((optCritRate) * 0.05).toFixed(3));
    const bonusCritDmg = Number(((optCritDmg) * 0.05).toFixed(3));
    const bonusEva = Number(((optEva) * 0.05).toFixed(3));
    const bonusSpeed = Number(((optSpeed) * 0.05).toFixed(3));
    const bonusHpRec = Math.floor((optHpRec) * 0.05);

    const nextBreakthroughStats = {
      atk: (game.breakthroughStats?.atk || 0) + bonusAtk,
      def: (game.breakthroughStats?.def || 0) + bonusDef,
      hp: (game.breakthroughStats?.hp || 0) + bonusHp,
      mp: (game.breakthroughStats?.mp || 0) + bonusMp,
      critRate: (game.breakthroughStats?.critRate || 0) + bonusCritRate,
      critDmg: (game.breakthroughStats?.critDmg || 0) + bonusCritDmg,
      eva: (game.breakthroughStats?.eva || 0) + bonusEva,
      speed: (game.breakthroughStats?.speed || 0) + bonusSpeed,
      hpRec: (game.breakthroughStats?.hpRec || 0) + bonusHpRec,
    };

    if (game.star < 10) {
      const nV = game.star + 1;
      const st = getDummyStats(game.realm, nV);
      set((s: any) => ({
        game: {
          ...s.game,
          star: nV,
          dummyHp: st.hp,
          maxDummyHp: st.hp,
          coins: s.game.coins + rewardAmount,
          reputation: (s.game.reputation || 0) + rewardAmount,
          breakthroughStats: nextBreakthroughStats
        }
      }));
      alert(`✨ 돌파 성공! [${game.realm} ${nV}성]에 도달했습니다!\n보상: ${rewardAmount.toLocaleString()}냥, 명성 ${rewardAmount.toLocaleString()}\n추가 보상: 모든 능력치 +5% (각성 보너스 누적)`);
    }
    else {
      const nxt = get().getNextRealmName();
      if (nxt) {
        const st = getDummyStats(nxt, 1);
        const nextTabs = [...game.unlockedTabs];
        if (game.totalDummyKills >= 400 && !nextTabs.includes("tower")) nextTabs.push("tower");
        if (nxt !== "필부" && !nextTabs.includes("giru")) nextTabs.push("giru");
        if (nxt !== "필부" && !nextTabs.includes("gambling")) nextTabs.push("gambling");

        set((s: any) => ({
          game: {
            ...s.game,
            realm: nxt,
            star: 1,
            hp: getRealmSettings(nxt).hp,
            maxHp: getRealmSettings(nxt).hp,
            dummyHp: st.hp,
            maxDummyHp: st.hp,
            unlockedTabs: nextTabs,
            coins: s.game.coins + rewardAmount,
            reputation: (s.game.reputation || 0) + rewardAmount,
            breakthroughStats: nextBreakthroughStats
          }
        }));

        alert(`✨ 경지 돌파! 새로운 경지 [${nxt}]에 도달했습니다!\n보상: ${rewardAmount.toLocaleString()}냥, 명성 ${rewardAmount.toLocaleString()}\n추가 보상: 모든 능력치 +5% (각성 보너스 누적)`);

        // 경지 돌파 시 투전판 이벤트 확정 발생
        if (!get().game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500);
        }
      }
    }

    get().triggerSave(true);
    get().syncToCloud(true);
  },
  canBreakthrough: () => { const { game } = get(); const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(game.realm); const cur = REALM_SETTINGS[game.realm]; const nxt = REALM_SETTINGS[list[idx + 1]] || cur; return game.touches >= (cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star)); },
  getNextRealmName: () => { const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(get().game.realm); return idx < list.length - 1 ? list[idx + 1] : (get().game.realm === "천인합일" ? "환골탈퇴 1성" : null); },
  updateBuffs: (dt: number) => set((s: any) => {
    const nextSkillCooldowns = { ...s.game.skillCooldowns };
    let hasCooldown = false;
    Object.keys(nextSkillCooldowns).forEach(name => {
      if (nextSkillCooldowns[name] > 0) {
        nextSkillCooldowns[name] = Math.max(0, nextSkillCooldowns[name] - dt);
        hasCooldown = true;
      }
    });

    const nextOilBuffs = { ...(s.game.oilBuffs || {}) };
    let hasOilBuff = false;
    Object.keys(nextOilBuffs).forEach(key => {
      if (nextOilBuffs[key] > 0) {
        nextOilBuffs[key] = Math.max(0, nextOilBuffs[key] - dt);
        hasOilBuff = true;
      }
    });

    const newBuffTimeLeft = Math.max(0, s.game.buffTimeLeft - dt);

    // 신법(보법) 버프 업데이트
    let nextMoveBuff = s.game.movementBuff;
    let nextManaShield = s.game.isManaShieldActive;
    let nextHitMult = s.game.nextHitMultiplier;

    if (nextMoveBuff) {
      const nextTime = nextMoveBuff.timeLeft - dt;
      if (nextTime <= 0) {
        nextMoveBuff = null;
        nextManaShield = false;
        nextHitMult = 1;
      } else {
        nextMoveBuff = { ...nextMoveBuff, timeLeft: nextTime };
      }
    }

    // --- Global Regeneration (1초 단위 정산) ---
    // dt는 초 단위입니다. (보통 0.04 ~ 0.2초 사이)
    const regenAccumulator = (s.game.regenAccumulator || 0) + dt;
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    let finalAccumulator = regenAccumulator;

    if (regenAccumulator >= 1.0) {
      const hpRec = get().getTotalHpRecovery();
      const mpRec = get().getTotalMpRecovery();
      nextHp = Math.min(get().getTotalHp(), nextHp + hpRec);
      nextMp = Math.min(get().getTotalMp(), nextMp + mpRec);
      finalAccumulator -= 1.0;
    }

    // 이전에 이미 버프가 없고 쿨다운도 없다면 일찍 반환
    if (s.game.buffTimeLeft <= 0 && !s.game.activeBuff && !hasCooldown && !hasOilBuff && !s.game.movementBuff &&
      nextHp === s.game.hp && nextMp === s.game.mp && finalAccumulator === s.game.regenAccumulator) return s;

    // --- 도전권 충전 (5분당 1개, 최대 10개까지 자연 충전) ---
    const md = s.game.masterDuel;
    let newTickets = md.charges || 0;
    let newChargeTime = md.lastRechargeTime || Date.now();
    const chargeInterval = 5 * 60 * 1000;
    const baseMax = md.maxCharges || 10;
    const hardMax = 12; // 오버차지 포함 최대치

    if (newTickets < baseMax) {
      const now = Date.now();
      const elapsed = now - (newChargeTime || now);
      if (elapsed >= chargeInterval) {
        const gained = Math.floor(elapsed / chargeInterval);
        newTickets = Math.min(baseMax, newTickets + gained);
        newChargeTime = (newChargeTime || now) + (gained * chargeInterval);
      }
    }

    return {
      game: {
        ...s.game,
        hp: nextHp,
        mp: nextMp,
        regenAccumulator: finalAccumulator,
        skillCooldowns: nextSkillCooldowns,
        oilBuffs: nextOilBuffs,
        attackMultiplier: newBuffTimeLeft > 0 ? s.game.attackMultiplier : 1,
        activeBuff: newBuffTimeLeft > 0 ? s.game.activeBuff : null,
        buffTimeLeft: newBuffTimeLeft,
        movementBuff: nextMoveBuff,
        isManaShieldActive: nextManaShield,
        nextHitMultiplier: nextHitMult,
        masterDuel: {
          ...s.game.masterDuel,
          charges: newTickets,
          lastRechargeTime: newChargeTime
        }
      }
    };
  }),
  setQuickSlot: (index: number, id: ConsumableId | null) => {
    set((s: any) => {
      const next = [...s.game.quickSlots];
      next[index] = id;
      return { game: { ...s.game, quickSlots: next } };
    });
    get().triggerSave(true);
  },
  buyPotion: (id: ConsumableId, q: number) => {
    set((s: any) => {
      const realmIdx = REALM_ORDER.indexOf(s.game.realm);
      const basePrices: Record<string, number> = {
        hp_small: 500, hp_medium: 2000, hp_large: 5000,
        mp_small: 500, mp_medium: 2000, mp_large: 5000,
        trance_2: 200000, trance_5: 1500000, trance_10: 10000000
      };
      const basePrice = basePrices[id] || 5000;
      const price = Math.floor(basePrice * Math.pow(2.0, Math.max(0, realmIdx))) * q;

      if (s.game.coins < price) return s;
      return { game: { ...s.game, coins: s.game.coins - price, consumables: { ...s.game.consumables, [id]: (s.game.consumables[id] || 0) + q } } };
    });
    get().updateQuestProgress("buy_potion", q);
    get().triggerSave(true);
  },
  useConsumable: (id: string) => set((s: any) => {
    if ((s.game.consumables[id] || 0) <= 0) return s;
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    const maxHp = get().getTotalHp();
    const maxMp = get().getTotalMp();

    if (id === "hp_small") nextHp = Math.min(maxHp, nextHp + maxHp * 0.2);
    else if (id === "hp_medium") nextHp = Math.min(maxHp, nextHp + maxHp * 0.5);
    else if (id === "hp_large") nextHp = maxHp;
    else if (id === "mp_small") nextMp = Math.min(maxMp, nextMp + maxMp * 0.2);
    else if (id === "mp_medium") nextMp = Math.min(maxMp, nextMp + maxMp * 0.5);
    else if (id === "mp_large") nextMp = maxMp;

    // 전투 중 물약 사용 퀘스트 추적
    const isCombat = s.game.masterDuel.isPlaying || s.game.tower?.isInside;
    if (isCombat) {
       get().updateQuestProgress("use_potion_combat", 1);
    }
    else if (id.startsWith("trance_")) {
      const multiplier = parseInt(id.split("_")[1]);
      return {
        game: {
          ...s.game,
          attackMultiplier: multiplier,
          buffTimeLeft: 10, // 10초간 지속
          activeBuff: "무아지경",
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
        }
      };
    }
    else if (id === "paewang_box") {
      const currentRealm = s.game.realm || "필부";
      const rIdx = REALM_ORDER.indexOf(currentRealm as any);
      
      let baseList = FORGE_ITEMS.filter(i => i.realm === currentRealm);
      if (baseList.length === 0) {
        baseList = FORGE_ITEMS.filter(i => i.realm === "천인합일");
      }
      
      const base = baseList[Math.floor(Math.random() * baseList.length)];
      
      const newItem = rollPaewangItem(
        { ...base, id: `paewang_${Date.now()}` }, 
        1, 
        s.game.upgradeLevels?.luck || 0, 
        rIdx === -1 ? 10 : rIdx
      );

      return {
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, newItem],
          consumables: {
            ...s.game.consumables,
            [id]: Math.max(0, (s.game.consumables[id] || 0) - 1)
          },
          pendingReward: {
            title: "패왕의 보물상자 개봉",
            items: [{ icon: newItem.icon, name: newItem.name, color: "#ff3e3e" }]
          }
        }
      };
    }

    else if (id === "stone_box_tujeon") {
      return {
        game: {
          ...s.game,
          enhancementStones: (s.game.enhancementStones || 0) + 30,
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "상자 개봉 완료",
            items: [{ icon: "🪨", name: "현철 강화석", count: 30, color: "#6ad7ff" }]
          }
        }
      };
    }
    else if (id === "rare_box_tujeon" || id === "night_gear_box") {
      const luck = s.game.statUpgrades?.luck || 0;
      const newItem = generateRandomGear(s.game.realm, 0, luck);
      // 등급 보정 (희귀/영웅)
      if (id === "rare_box_tujeon") newItem.tier = "명품";
      else newItem.tier = "보구";
      
      const tierColor = newItem.tier === "보구" ? "#a822f3" : "#4facfe";
      const slotNames: any = { mainWeapon: "무기", subWeapon: "보조", gloves: "장갑", shoes: "신발", robe: "도포", necklace: "목걸이", ring: "반지", bracelet: "팔찌" };

      return {
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, newItem],
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "새로운 장비 획득",
            items: [{ 
              icon: newItem.icon, 
              name: newItem.name, 
              color: tierColor,
              slotName: slotNames[newItem.slot] || newItem.slot 
            }]
          }
        }
      };
    }
    else if (id === "gear_piece_bundle") {
      return {
        game: {
          ...s.game,
          gearPieces: (s.game.gearPieces || 0) + 5,
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "조각 묶음 해제",
            items: [{ icon: "⚔️", name: "야행 장비 조각", count: 5, color: "#ff6bd6" }]
          }
        }
      };
    }
    else if (id === "manual_fragment_bundle") {
      const { faction, realm } = s.game;
      const userRealmIdx = REALM_ORDER.indexOf(realm as any);
      
      const targetSkills = MARTIAL_COMPENDIUM.filter(sk => 
        sk.factionName === faction && 
        REALM_ORDER.indexOf(sk.realm as any) <= userRealmIdx
      );
      
      const randomSkill = targetSkills.length > 0 
        ? targetSkills[Math.floor(Math.random() * targetSkills.length)]
        : MARTIAL_COMPENDIUM[0];
        
      const fragName = `${randomSkill.name} 조각`;
      const fragCount = 10;
      
      const newItem: OwnedWeapon = {
        id: `frag_${randomSkill.id}_${Date.now()}`,
        name: fragName,
        type: "material",
        count: fragCount,
        icon: "📜",
        slot: "materials" as any,
        realm: randomSkill.realm as any,
        price: 1000
      };

      setTimeout(() => get().addWeapon(newItem), 0);

      return {
        game: {
          ...s.game,
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "비급 주머니 해제",
            items: [{ 
              icon: "📜", 
              name: fragName, 
              count: fragCount, 
              color: "#ffd700" 
            }]
          }
        }
      };
    }

    return {
      game: {
        ...s.game,
        hp: nextHp,
        mp: nextMp,
        consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
      }
    };
  }),
  equipItem: (id: string) => {
    const { game } = get();
    const it = game.ownedWeapons.find((w: any) => w.id === id); 
    if (!it) return; 
    
    if (game.tutorialProgress.currentStepId === "equip_weapon") {
      setTimeout(() => get().setTutorialStep("goto_forge_refine"), 100);
    }

    set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } }));
    get().triggerSave(true);
    get().syncToCloud(true);
  },
  unequipItem: (slot: EquipSlot) => {
    set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null } } }));
    get().triggerSave(true);
    get().syncToCloud(true);
  },
  sellItem: (id: string) => set((s: any) => {
    const it = s.game.ownedWeapons.find((w: any) => w.id === id);
    if (!it) return s;
    const p = (it.name.includes("[패왕]") || it.tier === "신기") ? 40000000 : Math.floor((it.price || 0) * 0.25);
    return { game: { ...s.game, coins: s.game.coins + p, ownedWeapons: s.game.ownedWeapons.filter((w: any) => w.id !== id) } };
  }),
  dismantleItem: (id: string) => set((s: any) => {
    const it = s.game.ownedWeapons.find((w: any) => w.id === id);
    if (!it) return s;
    
    const userRealmIdx = REALM_ORDER.indexOf(s.game.realm);
    let materials = 0;
    
    if (userRealmIdx >= 4) { // 절정 이상
      if (it.tier === "국보") materials = 25;
      else if (it.tier === "신기" || it.name.includes("[패왕]")) materials = 100;
    } else { // 절정 미만
      if (it.tier === "명품") materials = 2;
      else if (it.tier === "보구") materials = 8;
      else if (it.tier === "국보") materials = 30;
      else if (it.tier === "신기" || it.name.includes("[패왕]")) materials = 150;
    }

    const nextMaterials = (s.game.advancedMaterials || 0) + materials;
    return { 
      game: { 
        ...s.game, 
        advancedMaterials: nextMaterials, 
        ownedWeapons: s.game.ownedWeapons.filter((w: any) => w.id !== id) 
      } 
    };
  }),
  sellConsumable: (id: ConsumableId) => set((s: any) => {
    if ((s.game.consumables[id] || 0) <= 0) return s;
    const prices: Record<string, number> = { hp_small: 250, hp_medium: 1000, hp_large: 5000, mp_small: 250, mp_medium: 1000, mp_large: 5000 };
    const price = prices[id] || 500;
    return { game: { ...s.game, coins: s.game.coins + price, consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 } } };
  }),

  checkOfflineRewards: () => {
    const { game } = get(); const offMs = Date.now() - (game.lastSaveTime || Date.now()); if (offMs < 60000) return;
    const limitBonus = get().getStatUpgradeBonus('offlineLimit');
    const maxOffSec = 43200 * (1 + limitBonus);
    const offSec = Math.min(offMs / 1000, maxOffSec);
    const lv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + lv * 0.01;
    const goldB = 1 + lv * 0.01;
    const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec);
    const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
    const touchesPerSec = (1 + lv * 0.01) * expB;
    const eTouches = Math.floor(touchesPerSec * offSec);

    // 명상 효율: 오프라인 시간 비례 (최대 100%)
    const efficiency = Math.min(100, Math.floor((offSec / maxOffSec) * 100));

    // 다음 경지까지 예상 시간
    const curR = REALM_SETTINGS[game.realm];
    const nxtR = get().getNextRealmName() ? (REALM_SETTINGS[get().getNextRealmName()!] || curR) : curR;
    const reqTouches = (curR.minTouches + Math.floor(((nxtR.minTouches - curR.minTouches) / 10) * game.star));
    const remain = Math.max(0, reqTouches - game.touches);
    const estHours = Math.ceil(remain / (touchesPerSec * 3600));

    set((s: any) => {
      const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
      const touchesPerSec = (1 + lv * 0.01) * expB;
      // [수정] 오프라인 수련치 보상 1/10 효율 적용
      const eTouches = Math.floor(touchesPerSec * offSec * 0.04);
      const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec);

      return {
        game: {
          ...s.game,
          lastSaveTime: Date.now(),
          coins: s.game.coins + eGold,
          exp: s.game.exp + eExp,
          touches: s.game.touches + eTouches,
          reputation: (s.game.reputation || 0) + eGold,
          lastOfflineRewards: {
            gold: eGold,
            exp: eExp,
            touches: eTouches,
            duration: Math.round(offSec / 36) / 100,
            efficiency,
            estimatedHoursToNextRealm: estHours > 1000 ? 999 : estHours
          }
        }
      };
    });
    get().triggerSave(true);
  },
  claimOfflineRewards: () => {
    set((s: any) => ({ game: { ...s.game, lastOfflineRewards: null } }));
    get().triggerSave(true);
  },
  clearLastReward: () => set((s: any) => ({ game: { ...s.game, lastReward: null } })),
  clearUnlockEffect: () => {
    set((s: any) => ({ game: { ...s.game, unlockEffectText: null } }));
    get().triggerSave(true);
  },
  resolveTimingMission: (p: any) => {
    const { game } = get();
    if (p.success) {
      if (game.timingMission.isPractice) {
        // 연습 보상 정산 및 수련장 복춘
        const r = 300 * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1);
        set((s: any) => ({ game: { ...s.game, coins: s.game.coins + r, timingMission: { ...s.game.timingMission, available: false }, activeTab: "training" } }));
      } else {
        // 실제 임무 보상 정산 및 수련장 복귀
        const actualStage = Math.min(15, p.maxStage || 0);
        const r = p.gold || (1000 * Math.pow(1.4, actualStage) * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1));
        const repGain = r;

        let newConsumables = { ...game.consumables };
        if (p.item) {
          const itemKey = (p.item === "체력 환약" ? "hp_medium" : (p.item === "내력 환약" ? "mp_medium" : "hp_small")) as keyof typeof newConsumables;
          newConsumables[itemKey] = (newConsumables[itemKey] || 0) + 1;
        }

        // 객잔 등급 정산
        const ratingGain = 10 + actualStage * 3;
        const newRating = (game.duel.rating || 100) + ratingGain;
        const newTier = getDuelTier(newRating);

        // 투전판 명패 드롭 (첫 판 무료, 이후 5% 확률)
        const isFirstWin = (game.duel.totalWins || 0) === 0;
        let tokenGained = isFirstWin ? 1 : (Math.random() < 0.05 ? 1 : 0);

        // 투전판 이벤트 발생 확률 0.1%
        if (Math.random() < 0.001 && !game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500); // 딜레이를 주어 상태 업데이트 후 실행
        }

        const score = p.score || 0;
        let tranceMultiplier = 1;
        if (score >= 1600001) tranceMultiplier = 12;
        else if (score >= 1300001) tranceMultiplier = 11;
        else if (score >= 1000001) tranceMultiplier = 10;
        else if (score >= 800001) tranceMultiplier = 9;
        else if (score >= 590001) tranceMultiplier = 8;
        else if (score >= 460001) tranceMultiplier = 7;
        else if (score >= 310001) tranceMultiplier = 6;
        else if (score >= 190001) tranceMultiplier = 5;
        else if (score >= 100001) tranceMultiplier = 4;
        else if (score >= 30001) tranceMultiplier = 3;
        else if (score >= 10000) tranceMultiplier = 2;

        const stoneGain = p.stones || (Math.floor(actualStage * 1.5) + 1);
        const wisdomGain = p.wisdom || 0;

        const realmOrder = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
        const userRealmIdx = realmOrder.indexOf(game.realm);
        const isLowRealm = userRealmIdx <= 3; // 필부 ~ 일류

        // --- 무공 조각 보상 추가 ---
        const faction = game.faction || "강호공용";
        const factionSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
        const randomSkill = factionSkills[Math.floor(Math.random() * factionSkills.length)];
        const fragmentName = randomSkill ? `${randomSkill.name} 조각` : "일반 비급 조각";
        
        // --- 보상 수량 산출 (경지, 스테이지, 점수 가중치 적용) ---
        const realmWeight = (userRealmIdx + 1); // 경지 (1~11)
        const stageWeight = (1 + actualStage * 0.1); // 스테이지 가중치
        const scoreWeight = (1 + score / 500000); // 점수 가중치
        
        // 무공 조각 수량 결정 (경지가 낮을수록 적게, 단계/점수가 높을수록 많게)
        let fragmentCount = Math.floor(0.4 * realmWeight * stageWeight * scoreWeight);
        if (fragmentCount < 1) fragmentCount = 1;
        
        // 일반 재료 수량 결정
        let materialCount = Math.floor(realmWeight * stageWeight * scoreWeight);
        if (materialCount < 1) materialCount = 1;

        const nextFragments = { ...(game.manualFragments || {}) };
        if (fragmentCount > 0) {
          nextFragments[fragmentName] = (nextFragments[fragmentName] || 0) + fragmentCount;
        }

        const finalGold = Math.floor(r);
        const finalRep = finalGold;

        const pendingRewardItems = [
          { icon: "💰🌟", name: "금화/명성", count: finalGold, color: "#ffd700" },
          { icon: "💎", name: "강화석", count: stoneGain, color: "#aaaaff" },
          { icon: "💡", name: "심득", count: wisdomGain, color: "#66ccff" }
        ];

        if (fragmentCount > 0) {
          pendingRewardItems.push({ icon: "📜", name: fragmentName, count: fragmentCount, color: "#ff5555" });
        }
        if (materialCount > 0) {
          pendingRewardItems.push({ icon: "📦", name: "일반 재료", count: materialCount, color: "#888888" });
        }

        const pendingReward = {
          title: "객잔 시련 완수 보상",
          items: pendingRewardItems
        };

        set((s: any) => {
          const nextOwned = [...s.game.ownedWeapons];
          if (materialCount > 0) {
            const existing = nextOwned.find(w => w.name === "일반 재료");
            if (existing) {
              existing.count = (existing.count || 0) + materialCount;
            } else {
              nextOwned.push({
                id: `material_standard_${Date.now()}`,
                name: "일반 재료",
                type: "material",
                count: materialCount,
                icon: "📦",
                slot: "materials",
                realm: "필부",
                price: 100
              });
            }
          }

          return {
            game: {
              ...s.game,
              coins: s.game.coins + r,
              reputation: Math.max(0, (s.game.reputation || 0) + repGain),
              enhancementStones: (s.game.enhancementStones || 0) + stoneGain,
              wisdom: (s.game.wisdom || 0) + wisdomGain,
              consumables: newConsumables,
              manualFragments: nextFragments,
              ownedWeapons: nextOwned,
              pendingReward: p.skipPopup ? null : pendingReward,
              activeBuff: tranceMultiplier > 1 ? "무아지경" : s.game.activeBuff,
              attackMultiplier: tranceMultiplier > 1 ? tranceMultiplier : s.game.attackMultiplier,
              buffTimeLeft: tranceMultiplier > 1 ? 15 : s.game.buffTimeLeft,
              showInnVictoryEffect: true,
              lastInnScore: score,
              innHighScore: Math.max(game.innHighScore || 0, score),
              timingMission: { ...s.game.timingMission, available: false },
              pendingInnEntry: false,
              activeTab: "training",
            tujeonTokens: (s.game.tujeonTokens || 0) + tokenGained,
            duel: {
              ...s.game.duel,
              rating: newRating,
              tier: newTier,
              totalWins: (s.game.duel.totalWins || 0) + 1,
              winStreak: (s.game.duel.winStreak || 0) + 1
            }
          }
        };
      });

        // 3초 후 승리 이펙트 종료
        setTimeout(() => {
          set((s: any) => ({ game: { ...s.game, showInnVictoryEffect: false } }));
        }, 3000);
      }
    } else {
      // 실패/후퇴 시 수련장으로 즉시 복귀
      set((s: any) => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false, activeTab: "training" } }));
    }
    get().triggerSave(true);
  },
  incrementCombo: () => set((s: any) => ({ game: { ...s.game, comboCount: (s.game.comboCount || 0) + 1, lastAttackTime: Date.now() } })),
  subtractTujeonTokens: (amount: number) => set((s: any) => ({
    game: {
      ...s.game,
      tujeonTokens: Math.max(0, (s.game.tujeonTokens || 0) - amount)
    }
  })),
  setSelectedMasterLevel: (l: number) => set((s: any) => { const e = generateEnemy(l); return { game: { ...s.game, masterDuel: { ...s.game.masterDuel, selectedLevel: l, rivalName: e.name, rivalHp: e.hp, rivalMaxHp: e.hp, lastWinReward: undefined } } }; }),
  startMasterDuel: (isSpecialBoss = false, isGiru = false) => {
    const { game } = get();
    if (isGiru) {
      if (!game.masterDuel.isGiruEncounter) return;
      set((s: any) => ({
        game: {
          ...s.game,
          masterDuel: {
            ...s.game.masterDuel,
            isPlaying: true,
            timeLeft: 40,
            lastAttackTime: Date.now()
          }
        }
      }));
      return;
    }
    if (game.masterDuel.charges <= 0 && !isSpecialBoss) return;

    let e: any;
    if (isSpecialBoss && game.nextDayEvent?.type === "BOSS_RAID_CLUE") {
      const baseEnemy = generateEnemy(game.masterDuel.selectedLevel + 20);
      e = {
        ...baseEnemy,
        name: `🔥 특수 보스: ${game.nextDayEvent.bossId}`,
        hp: baseEnemy.hp * 3,
        atk: baseEnemy.atk * 1.5,
        isBoss: true
      };
    } else {
      e = generateEnemy(game.masterDuel.selectedLevel);
    }
    const isZhuge = game.faction === "제갈세가";
    const statMult = isZhuge ? 1.05 : 1.0;

    // 사마세가 보호막 초기화
    const isSama = game.faction === "사마세가";
    const initialShield = isSama ? get().getTotalMp() * 0.2 : 0;

    const now = Date.now();
    // 10분 이상 지났으면 연속 처치 초기화
    let streak = game.masterDuel.streakCount || 0;
    if (now - (game.masterDuel.lastAttackTime || 0) > 10 * 60 * 1000) {
      streak = 0;
    }

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          charges: isSpecialBoss ? s.game.masterDuel.charges : s.game.masterDuel.charges - 1,
          streakCount: streak,
          lastAttackTime: now,
          isPlaying: true,
          lives: 3,
          rivalHp: e.hp,
          rivalMaxHp: e.hp,
          rivalAtk: e.atk,
          rivalDef: e.def,
          rivalName: e.name,
          isBoss: e.isBoss,
          timeLeft: isSpecialBoss ? 60 : 40,
          rivalAttackTimer: 0,
          chargeTimer: 0,
          lastEffect: null,
          damageTakenAccumulator: 0,
          isBerserk: false,
          rivalDebuffs: {},
          factionState: {
            comboCount: 0,
            counterReady: false,
            critStack: 0,
            slowStack: 0,
            poisonStack: 0,
            shield: initialShield,
            nextCritBonus: 0,
            evasionBuff: 0,
            internalCDs: {},
            statMult: statMult // 제갈세가 버프용
          }
        },
        nextDayEvent: isSpecialBoss ? { ...s.game.nextDayEvent, isUsed: true } : s.game.nextDayEvent
      }
    }));
  },
  updateMasterDuel: (dt: number) => set((s: any) => {
    if (!s.game.masterDuel.isPlaying) return s;
    const now = Date.now();

    const masterDuel = s.game.masterDuel;
    const faction = s.game.faction;
    let fState = { ...(masterDuel.factionState || {}) };

    // 스턴 타이머 처리
    let nextStunTimer = Math.max(0, (masterDuel.stunTimer || 0) - dt);
    let nextIsStunned = nextStunTimer > 0;
    let rivalHp = masterDuel.rivalHp;

    // 제갈세가 팔괘보: 적 시간 정지 혹은 스턴 상태인 경우 타이머 정지
    const isFrozen = s.game.movementBuff && s.game.movementBuff.data.freeze;
    const isTargetPaused = isFrozen || nextIsStunned;

    const tLeft = Math.max(0, masterDuel.timeLeft - dt);

    // 30초 광폭화 체크
    const duelDuration = 40 - tLeft;
    const isBerserk = duelDuration >= 30;
    const berserkAtkMult = isBerserk ? 1.5 : 1.0;
    const berserkSpeedMult = isBerserk ? 1.3 : 1.0;

    const rivalAtk = masterDuel.rivalAtk * berserkAtkMult;
    const rivalSpeed = 1.0 * berserkSpeedMult;
    const attackInterval = 1 / rivalSpeed;

    // 시간 초과 패배 처리
    if (tLeft <= 0) {
      return {
        game: {
          ...s.game,
          masterDuel: { ...masterDuel, isPlaying: false, timeLeft: 0, lastWinReward: "시간 초과 (패배)", damageTakenAccumulator: 0, lastEffect: null }
        }
      };
    }

    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    let dmgAccum = 0;
    let effect = masterDuel.lastEffect;

    // 1. 적 공격 타이머 처리 (일반 공격)
    let nextRivalTimer = (masterDuel.rivalAttackTimer || 0) + (isTargetPaused ? 0 : dt * rivalSpeed);

    if (!isTargetPaused && nextRivalTimer >= 1.0) {
      nextRivalTimer = 0;
      const playerEva = get().getTotalEvasion() / 100;
      if (Math.random() < playerEva) {
        effect = "DODGE";
        dmgAccum = 0;
      } else {
        const playerDef = get().getTotalDefense();
        const defenseMultiplier = 100 / (100 + playerDef);
        let damage = Math.floor(rivalAtk * defenseMultiplier);
        if (Math.random() < 0.1) damage = Math.floor(damage * 1.5);
        damage = Math.max(damage, Math.floor(rivalAtk * 0.05));
        if (fState.shield > 0) {
          const shieldDmg = Math.min(fState.shield, damage);
          fState.shield -= shieldDmg;
          damage -= shieldDmg;
        }
        nextHp = Math.max(0, nextHp - damage);
        dmgAccum = damage;
      }
    }

    // 2. 적 강력한 공격 충전 타이머 (보스인 경우)
    let nextChargeTimer = (masterDuel.chargeTimer || 0);
    if (!isTargetPaused && masterDuel.isBoss) {
      nextChargeTimer += dt;
      if (nextChargeTimer >= 5.0) {
        // 5초 도달 시 강력한 공격
        const bossDmg = Math.floor(rivalAtk * 1.5);
        nextHp = Math.max(0, nextHp - bossDmg);
        dmgAccum = bossDmg;
        nextChargeTimer = 0;
      }
    }

    const isPlayerDead = nextHp <= 0;
    let finalIsPlaying = !isPlayerDead;
    let finalLastWinReward = masterDuel.lastWinReward;

    if (isPlayerDead) {
      finalIsPlaying = false;
      finalLastWinReward = "기운이 다했습니다 (패배)";
    }

    return {
      game: {
        ...s.game,
        lastActivityHeartbeat: now,
        hp: Math.max(0, nextHp),
        mp: Math.max(0, nextMp),
        masterDuel: {
          ...masterDuel,
          playerHp: Math.max(0, nextHp),
          playerMp: Math.max(0, nextMp),
          timeLeft: tLeft,
          isPlaying: finalIsPlaying,
          rivalHp: rivalHp,
          lastWinReward: finalLastWinReward,
          rivalAttackTimer: nextRivalTimer,
          chargeTimer: nextChargeTimer,
          damageTakenAccumulator: dmgAccum,
          lastEffect: effect,
          isBerserk,
          isStunned: nextIsStunned,
          stunTimer: nextStunTimer,
          factionState: fState,
          ultimateGauge: masterDuel.ultimateGauge || 0
        }
      }
    };
  }),
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean, oilRes?: any) => {
    const { game, processAttackGauge } = get();
    if (!game.masterDuel.isPlaying) return { totalDamage: 0, isCrit: false, effect: null, isCounter: false, extraHits: 0 };

    // 신법가속(Speed) 게이지 처리 (원본 공격 1회당 1회 처리)
    const extraHitsCount = processAttackGauge();

    let result = { totalDamage: 0, isCrit: false, effect: null as any, isCounter: false, extraHits: extraHitsCount };

    set((s: any) => {
      if (!s.game.masterDuel.isPlaying) return s;

      const masterDuel = s.game.masterDuel;
      const faction = s.game.faction;
      let fState = { ...(masterDuel.factionState || {}) };
      const now = Date.now();

      const statMult = fState.statMult || 1.0;
      let playerAtk = get().getTotalAttack() * statMult;
      let playerCritRate = get().getTotalCritRate();
      let playerCritDmg = get().getTotalCritDmg() / 100;

      let rivalDef = masterDuel.rivalDef;
      let rivalHp = masterDuel.rivalHp;
      let playerHp = s.game.hp;
      let playerMp = s.game.mp;

      let damageMultiplier = 1.0;
      let bonusFlatDamage = (bonusDmg || 0);

      if (s.game.movementBuff && s.game.movementBuff.data.weakness) {
        damageMultiplier *= s.game.movementBuff.data.weakness;
      }

      // 1. 회피 판정 (사용자 기획 ✅ 5)
      const rivalEva = (masterDuel.isBoss ? 15 : 10) / 100; // 보스 15%, 일반 10%
      if (Math.random() < rivalEva) {
        result = { totalDamage: 0, isCrit: false, effect: "DODGE" as any, isCounter: false, extraHits: extraHitsCount };
        return { game: { ...s.game, masterDuel: { ...masterDuel, lastEffect: "DODGE", damageTakenAccumulator: 0, factionState: fState } } };
      }

      // 2. 기본 대미지 및 방어력 적용 (사용자 기획 ✅ 3)
      // [재설계] 방어력 공식: 피해 감소 = 방어력 / (방어력 + 1000)
      const damageReduction = rivalDef / (rivalDef + 1000);
      let baseDamage = Math.floor(playerAtk * (1 - damageReduction));

      // 3. 치명타 판정 (사용자 기획 ✅ 4)
      let isCrit = false;
      const finalCritRate = faction === "점창파" ? playerCritRate + (fState.critStack || 0) : playerCritRate;
      if (Math.random() < finalCritRate / 100) {
        isCrit = true;
        baseDamage = Math.floor(baseDamage * playerCritDmg);
      }

      let totalDamage = baseDamage;
      let effect = isCrit ? "CRITICAL" : null;

      // --- 반격 타이밍 체크 (추가 ✅) ---
      const timing = masterDuel.rivalAttackTimer || 0;
      let isCounter = false;
      // 0.85 ~ 1.0 사이 (맨끝 허용된 부분)
      if (timing >= 0.85 && timing <= 1.0) {
        isCounter = true;
        totalDamage = Math.floor(totalDamage * 3.5); // 추가 250% = 3.5배
        effect = "PARRY"; // UI에서 반격으로 표시
      }

      // 4. 문파 특수 효과 적용 (사용자 기획 ✅ 8, 9)
      if (faction === "화산파") {
        fState.comboCount = (fState.comboCount || 0) + 1;
        if (fState.comboCount >= 4) {
          totalDamage *= 2.0;
          fState.comboCount = 0;
        }
        if (isCrit) totalDamage += baseDamage * 0.8;
      }

      if (faction === "무당" && fState.counterReady) {
        totalDamage *= 2.0;
        fState.counterReady = false;
      }
      if (faction === "점창파") {
        fState.critStack = Math.min(10, (fState.critStack || 0) + 2);
        if (Math.random() < 0.3) totalDamage += baseDamage * 0.5;
      }
      if (faction === "공동파" && Math.random() < 0.15) {
        masterDuel.isStunned = true;
        masterDuel.stunTimer = 1.0;
      }
      if (faction === "곤륜파") {
        fState.slowStack = (fState.slowStack || 0) + 1;
        if (fState.slowStack >= 5) {
          masterDuel.isStunned = true;
          masterDuel.stunTimer = 1.0;
          fState.slowStack = 0;
          effect = "STUN";
        }
      }
      if (faction === "사천당가") {
        fState.poisonStack = (fState.poisonStack || 0) + 1;
      }

      totalDamage += bonusFlatDamage;
      totalDamage *= damageMultiplier;
      totalDamage = Math.max(totalDamage, playerAtk * 0.05);

      // 보스 피해 감쇠 (한방컷 방지 및 타격감 유지)
      const bossMaxHp = masterDuel.rivalMaxHp || rivalHp;
      const bossSoftCap = bossMaxHp * 0.15; // 1타격당 보스 체력의 15%까지만 정상 데미지
      if (totalDamage > bossSoftCap) {
        totalDamage = bossSoftCap + (totalDamage - bossSoftCap) * 0.1;
      }

      const finalOilRes = oilRes || get().triggerOilEffects();
      const nextMD = { ...masterDuel };
      const nextBuffs = { ...(s.game.oilBuffs || {}) };

      if (finalOilRes.buffsTriggered.includes("oil_demon")) totalDamage *= 10;
      if (finalOilRes.buffsTriggered.includes("oil_thunder")) {
        nextMD.isStunned = true;
        nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
      }
      if (finalOilRes.buffsTriggered.includes("oil_formless")) {
        totalDamage += rivalHp * 0.1;
      }

      // 반격 성공 시 이펙트 추가 통보용 결과 데이터 확장
      // 신법가속 추가타 적용 (원본 대미지와 동일하게 합산)
      const hitTotal = 1 + extraHitsCount;
      const finalAppliedDamage = totalDamage * hitTotal;
      
      result = { totalDamage: finalAppliedDamage, isCrit, effect, isCounter, extraHits: extraHitsCount };

      finalOilRes.buffsTriggered.forEach((k: string) => {
        if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") nextBuffs[k] = 5;
        else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
          nextBuffs[k] = 1;
          if (k === "oil_clarity") {
            playerHp = Math.min(get().getTotalHp(), playerHp + get().getTotalHp() * 0.2);
            playerMp = Math.min(get().getTotalMp(), playerMp + get().getTotalMp() * 0.2);
          }
        } else nextBuffs[k] = 10;
      });

      if (faction === "일월신교") {
        playerHp = Math.min(get().getTotalHp(), playerHp + finalAppliedDamage * 0.1);
        playerMp = Math.min(get().getTotalMp(), playerMp + finalAppliedDamage * 0.05);
      }
      if (finalOilRes.buffsTriggered.includes("oil_vampire")) {
        playerHp = Math.min(get().getTotalHp(), playerHp + finalAppliedDamage * 0.5);
      }

      const nHp = Math.max(0, rivalHp - finalAppliedDamage);
      const nGauge = Math.min(100, (masterDuel.ultimateGauge || 0) + (isWeakness ? 5 : 2));

      if (nHp <= 0) {
        // 연속 처치 보너스 계산
        let streakBonus = 1.0;
        const currentStreak = masterDuel.streakCount || 0;
        if (currentStreak >= 9) streakBonus = 1.2; // 이번이 10회째가 됨
        else if (currentStreak >= 4) streakBonus = 1.1; // 이번이 5회째가 됨
        else if (currentStreak >= 2) streakBonus = 1.05; // 이번이 3회째가 됨

        const level = masterDuel.selectedLevel;
        // 기본 보상 2배 상향 (900 -> 1800)
        const baseGold = 1800 * Math.pow(level, 1.2);
        const goldGain = Math.floor(baseGold * streakBonus * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.05));
        const reputationGain = goldGain; // 명성도 동일하게 적용

        const expGain = Math.floor(90 * Math.pow(level, 1.1) * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.1));
        const rewardBase = 5 + (level - 1) * 0.7;
        const bossTokenGain = Math.floor(rewardBase);
        const wisdomGain = Math.floor(rewardBase);
        const oilChance = Math.random() < Math.min(0.10, 0.01 + (level * 0.0025));
        const oilKeys = ["oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed", "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire", "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye", "oil_demon", "oil_triple_hit", "oil_formless", "oil_blessed"];
        const oilId = oilChance ? oilKeys[Math.floor(Math.random() * oilKeys.length)] : null;

        const oilNameMap: Record<string, string> = { oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유", oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유", oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "청명유", oil_eye: "영안유", oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유" };

        let bonusText = streakBonus > 1 ? ` (보너스 +${Math.round((streakBonus - 1) * 100)}%)` : "";
        let msg = `[처단 완료] 연속 ${currentStreak + 1}회${bonusText}\n금화 +${goldGain.toLocaleString()}\n명성 +${reputationGain.toLocaleString()}\n징표 ${bossTokenGain.toLocaleString()}\n심득 +${wisdomGain.toLocaleString()}\n수련 정진 +${expGain.toLocaleString()}`;
        if (oilId) msg += `\n[획득] ${oilNameMap[oilId] || oilId}`;
        
        // 타임 어택 퀘스트 추적 (20초 이내 승리)
        if (masterDuel.timeLeft >= 20) {
           get().updateQuestProgress("time_attack_win", 1);
        }

        get().updateQuestProgress("reach_duel_rating", 0); // 등급 도달 체크용

        const nextConsumables = { ...s.game.consumables };
        if (oilId) nextConsumables[oilId] = (nextConsumables[oilId] || 0) + 1;

        const nextFragments = { ...(s.game.manualFragments || {}) };
        const nextBonds = { ...(s.game.factionBonds || {}) };
        const nextMaterials = { ...(s.game.materials || {}) };
        const nextGearFrags = { ...(s.game.gearFragments || {}) };
        const nextDivineShards = { ...(s.game.divineWeaponShards || {}) };
        let nextInsights = s.game.insights || 0;

        // --- 기루 기연(Info) 보상 지급 ---
        if (masterDuel.rewards) {
          const r = masterDuel.rewards;
          if (r.manualFragments) {
            Object.entries(r.manualFragments).forEach(([k, v]: any) => {
              nextFragments[k] = (nextFragments[k] || 0) + v;
            });
          }
          if (r.materials) {
            Object.entries(r.materials).forEach(([k, v]: any) => {
              nextMaterials[k] = (nextMaterials[k] || 0) + v;
            });
          }
          if (r.gearFragments) {
            Object.entries(r.gearFragments).forEach(([k, v]: any) => {
              nextGearFrags[k] = (nextGearFrags[k] || 0) + v;
            });
          }
          if (r.divineWeaponShards) {
            Object.entries(r.divineWeaponShards).forEach(([k, v]: any) => {
              nextDivineShards[k] = (nextDivineShards[k] || 0) + v;
            });
          }
          if (r.factionBonds) {
            Object.entries(r.factionBonds).forEach(([f, v]: any) => {
              nextBonds[f] = (nextBonds[f] || 0) + v;
            });
          }
          if (r.insights) nextInsights += r.insights;
        }

        const isGiru = !!masterDuel.isGiruEncounter;
        const rawItems: any[] = [];

        // [신규] 필부 경지 기루 특별 보상 (1회성)
        let specialRewardGiven = false;
        if (isGiru && s.game.realm === "필부" && !(s.game.giruRewardsClaimed || {})["philbu_special"]) {
          const userFaction = FACTIONS.find(f => f.name === s.game.faction);
          const introManualName = userFaction?.martial?.필부?.name || "기초 무공";
          const basicFootworkName = userFaction?.movement?.entry || "기초 보법";
          
          const introManual = `${introManualName} 조각`;
          const basicFootwork = `${basicFootworkName} 조각`;
          
          nextFragments[introManual] = (nextFragments[introManual] || 0) + 10;
          nextFragments[basicFootwork] = (nextFragments[basicFootwork] || 0) + 20;
          
          rawItems.push({ icon: "📜", name: introManual, count: 10, color: "#ffd700" });
          rawItems.push({ icon: "📜", name: basicFootwork, count: 20, color: "#ffd700" });
          specialRewardGiven = true;
        }

        // --- 보상 처리 로직 ---
        const faction = game.faction || "강호공용";
        
        let fragmentCount = 0;
        let bondGain = 0;
        let materialGain = 0;
        let fragmentName = "일반 비급 조각";

        // 1. 일반 악적 대결 보상 계산 (기연 대결이 아닐 때만 수행)
        if (!isGiru) {
          const realmOrder = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
          const userRealmIdx = realmOrder.indexOf(game.realm);
          
          const factionSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
          const randomSkill = factionSkills[Math.floor(Math.random() * factionSkills.length)];
          fragmentName = randomSkill ? `${randomSkill.name} 조각` : "일반 비급 조각";

          // 경지에 따른 드랍 확률 결정 (유저 요청: 경지가 높을수록 수급을 어렵게)
          let dropChance = 0.1; // 기본 10%
          if (userRealmIdx === 0) dropChance = 0.7; // 필부: 70%
          else if (userRealmIdx === 1) dropChance = 0.5; // 삼류: 50%
          else if (userRealmIdx === 2) dropChance = 0.3; // 이류: 30%
          else if (userRealmIdx === 3) dropChance = 0.15; // 일류: 15%
          else if (userRealmIdx >= 4) dropChance = 0.1; // 절정 이상: 10%

          if (Math.random() < dropChance) {
            fragmentCount = 1; // 수량은 1개로 제한하여 희소성 부여
            bondGain = 1;
            materialGain = 3;
          }

          if (fragmentCount > 0) nextFragments[fragmentName] = (nextFragments[fragmentName] || 0) + fragmentCount;
          if (bondGain > 0) nextBonds[faction] = (nextBonds[faction] || 0) + bondGain;
          if (materialGain > 0) nextMaterials["standard_material"] = (nextMaterials["standard_material"] || 0) + materialGain;
        }

        // 2. 최종 팝업용 아이템 목록 (rawItems) 구성 (위에서 정의된 rawItems 사용)
        if (!isGiru) {
          // 일반 대결: 재화 및 기본 보상 추가
          const cleanGold = Math.floor(goldGain / 100) * 100;
          const cleanRep = Math.floor(reputationGain / 10) * 10;

          rawItems.push({ icon: "💰", name: "금화", count: cleanGold || goldGain, color: "#ffd700" });
          rawItems.push({ icon: "🌟", name: "명성", count: cleanRep || reputationGain, color: "#ff88ff" });
          rawItems.push({ icon: "🩸", name: "혈투의 징표", count: bossTokenGain, color: "#ff4d4d" });
          rawItems.push({ icon: "💡", name: "심득", count: wisdomGain, color: "#66ccff" });

          if (fragmentCount > 0) rawItems.push({ icon: "📜", name: fragmentName, count: fragmentCount, color: "#ff5555" });
          if (bondGain > 0) rawItems.push({ icon: "🤝", name: `${faction} 인연`, count: bondGain, color: "#55ff55" });
          if (materialGain > 0) rawItems.push({ icon: "📦", name: "일반 재료", count: materialGain, color: "#888888" });
          if (oilId) rawItems.push({ icon: "🧴", name: oilNameMap[oilId] || oilId, count: 1, color: "#ffcc00" });
        }

        // 기연(Giru) 추가 보상 표시
        if (masterDuel.rewards) {
          const r = masterDuel.rewards;
          if (r.manualFragments) {
            Object.entries(r.manualFragments).forEach(([k, v]: any) => {
              const displayName = getManualFragmentDisplayName(k);
              rawItems.push({ icon: "📜", name: displayName, count: v, color: "#ff5555" });
            });
          }
          if (r.materials) {
            Object.entries(r.materials).forEach(([k, v]: any) => {
              let displayName = k;
              if (k === "standard_material") displayName = "일반 재료";
              rawItems.push({ icon: "📦", name: displayName, count: v, color: "#888" });
            });
          }
          if (r.factionBonds) {
            Object.entries(r.factionBonds).forEach(([f, v]: any) => {
              if (v > 0) rawItems.push({ icon: "🤝", name: `${f} 인연`, count: v, color: "#55ff55" });
            });
          }
          if (r.gearFragments) {
            Object.entries(r.gearFragments).forEach(([k, v]: any) => {
              rawItems.push({ icon: "⚙️", name: "장비 파편", count: v, color: "#cc88ff" });
            });
          }
          if (r.divineWeaponShards) {
            Object.entries(r.divineWeaponShards).forEach(([k, v]: any) => {
              let displayName = "신물 파편";
              rawItems.push({ icon: "💎", name: displayName, count: v, color: "#ffcc00" });
            });
          }
          if (r.insights) {
             rawItems.push({ icon: "🧠", name: "통찰", count: r.insights, color: "#00eeff" });
          }
        }

        // 중복 아이템 병합 로직 (예: 인연 점수 x3, x1 -> x4)
        const mergedItemsMap = new Map<string, any>();
        rawItems.forEach(item => {
          if (mergedItemsMap.has(item.name)) {
            mergedItemsMap.get(item.name).count += item.count;
          } else {
            mergedItemsMap.set(item.name, { ...item });
          }
        });

        const pendingReward: { title: string; items: any[] } = {
          title: masterDuel.isGiruEncounter ? `[기연] ${masterDuel.rivalName} 처단` : (masterDuel.isBoss ? "악적 처단 보상 (보스)" : "악적 처단 보상"),
          items: Array.from(mergedItemsMap.values())
        };

        const nextLevel = level + 1;
        const nextMaxLevel = Math.max(masterDuel.currentLevel, nextLevel);
        const nextEnemy = generateEnemy(nextLevel);

        result = { totalDamage: finalAppliedDamage, isCrit, effect, isCounter: false, extraHits: extraHitsCount };
        return {
          game: {
            ...s.game,
            coins: s.game.coins + goldGain,
            reputation: (s.game.reputation || 0) + reputationGain,
            bossTokens: (s.game.bossTokens || 0) + bossTokenGain,
            wisdom: (s.game.wisdom || 0) + wisdomGain,
            touches: (s.game.touches || 0) + expGain,
            hp: playerHp, mp: playerMp,
            consumables: nextConsumables,
            manualFragments: nextFragments,
            materials: nextMaterials,
            gearFragments: nextGearFrags,
            divineWeaponShards: nextDivineShards,
            factionBonds: nextBonds,
            insights: nextInsights,
            oilBuffs: nextBuffs,
            pendingReward,
            masterDuel: {
              ...nextMD,
              isPlaying: false,
              isGiruEncounter: false, // 기연 종료
              rewards: null,
              infoTier: null,
              currentLevel: nextMaxLevel,
              selectedLevel: nextLevel,
              rivalHp: nextEnemy.hp,
              rivalMaxHp: nextEnemy.hp,
              rivalAtk: nextEnemy.atk,
              rivalName: nextEnemy.name,
              lastWinReward: msg,
              damageTakenAccumulator: 0,
              lastEffect: null,
              ultimateGauge: 0,
              factionState: { ...fState, comboCount: 0, shield: 0, slowStack: 0, poisonStack: 0 },
              lastDefeatTimes: { ...(nextMD.lastDefeatTimes || {}), [level]: now },
              streakCount: (masterDuel.challengeTickets === 0) ? 0 : currentStreak + 1, // 0개가 되면 초기화
              lastAttackTime: now
            },
            giruRewardsClaimed: {
              ...(s.game.giruRewardsClaimed || {}),
              philbu_special: (s.game.giruRewardsClaimed || {})["philbu_special"] || specialRewardGiven
            }
          }
        };
      }

      result = { totalDamage: finalAppliedDamage, isCrit, effect, isCounter: false, extraHits: extraHitsCount };
      return {
        game: {
          ...s.game,
          hp: playerHp, mp: playerMp,
          oilBuffs: nextBuffs,
          masterDuel: {
            ...nextMD, rivalHp: nHp, lastEffect: effect, damageTakenAccumulator: 0, ultimateGauge: nGauge, factionState: fState
          }
        }
      };
    });
    get().triggerSave();
    return result;
  },

  triggerUltimate: () => {
    const { game } = get();
    if (!game.masterDuel.isPlaying || (game.masterDuel.ultimateGauge || 0) < 100) return;

    const dmg = get().getTotalAttack() * 25;
    const nHp = Math.max(0, game.masterDuel.rivalHp - dmg);

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          ultimateGauge: 0,
          rivalHp: nHp,
          isStunned: true,
          stunTimer: 3,
          lastEffect: "ULTIMATE"
        }
      }
    }));

    if (nHp <= 0) get().tapMasterDuel(0); // Trigger win logic
  },

  triggerCombatTrap: (multiplier: number) => {
    const { game } = get();
    if (!game.masterDuel.isPlaying) return;

    const rivalAtk = game.masterDuel.rivalAtk || 100;
    const playerDef = get().getTotalDefense();
    const defenseMultiplier = 100 / (100 + playerDef);

    // 함정 대미지: 악적 공격력 * 배수 * 방어력 보정
    const rawDmg = Math.floor(rivalAtk * multiplier * defenseMultiplier);
    const finalDmg = Math.max(rawDmg, Math.floor(rivalAtk * 0.5));

    set((s: any) => ({
      game: {
        ...s.game,
        hp: Math.max(0, s.game.hp - finalDmg),
        masterDuel: {
          ...s.game.masterDuel,
          damageTakenAccumulator: finalDmg,
          lastEffect: "BLEED" // 시각적으로 붉게 반짝이도록 설정
        }
      }
    }));

    // 승패 체크
    if (get().game.hp <= 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "함정에 빠져 치명상을 입었습니다 (패배)" }
        }
      }));
    }
  },

  parryBossAttack: () => {
    const { game } = get();
    if (!game.masterDuel.isPlaying || (game.masterDuel.chargeTimer || 0) < 4.5) return;

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          chargeTimer: 0,
          rivalHp: Math.max(0, s.game.masterDuel.rivalHp - get().getTotalAttack() * 5),
          isStunned: true,
          stunTimer: 2,
          lastEffect: "PARRY"
        }
      }
    }));
  },

  buyBossShopItem: (type: string) => {
    const { game } = get();
    let price = 0;
    if (type === "stone_pack") price = 60;
    else if (type === "exp_scroll") price = 300;
    else if (type === "charm_luck") price = 300;
    else if (type === "oil_demon") price = 400;
    else if (type === "oil_triple_hit") price = 400;
    else if (type === "oil_formless") price = 400;
    else if (type === "paewang_box") price = 500;
    else if (type === "oil_blessed") price = 100;
    else if (type === "trance_pill") price = 10;

    if ((game.bossTokens || 0) < price) return;

    set((s: any) => {
      const nextGame = {
        ...s.game,
        bossTokens: (s.game.bossTokens || 0) - price
      };

      if (type === "stone_pack") {
        nextGame.enhancementStones = (nextGame.enhancementStones || 0) + 20;
      } else if (type === "exp_scroll") {
        const realms = REALM_ORDER;
        const rIdx = realms.indexOf(s.game.realm);

        let percent = 0.5;
        if (s.game.realm === "필부") percent = 8;
        else if (s.game.realm === "삼류") percent = 6.5;
        else if (s.game.realm === "이류") percent = 5;
        else if (s.game.realm === "일류") percent = 3;
        else if (s.game.realm === "절정") percent = 1;
        else percent = 0.5;

        const cur = REALM_SETTINGS[s.game.realm];
        const nxt = REALM_SETTINGS[realms[rIdx + 1]] || cur;

        // [수정] 다음 '성'이 아니라 다음 '경지' 도달까지 필요한 잔여 숙련도 기준으로 변경
        const target = nxt.minTouches;

        const remaining = Math.max(0, target - s.game.touches);
        const gain = Math.floor(remaining * (percent / 100));

        nextGame.touches += gain;
      } else if (type === "charm_luck") {
        nextGame.consumables.charm_luck = (nextGame.consumables.charm_luck || 0) + 1;
      } else if (type.startsWith("oil_")) {
        nextGame.consumables[type as ConsumableId] = (nextGame.consumables[type as ConsumableId] || 0) + 1;
      } else if (type === "paewang_box") {
        nextGame.consumables.paewang_box = (nextGame.consumables.paewang_box || 0) + 1;
      } else if (type === "trance_pill") {
        nextGame.consumables.trance_2 = (nextGame.consumables.trance_2 || 0) + 1;
      }

      return { game: nextGame };
    });
    get().triggerSave(true);
  },

  triggerMovementBuff: () => {
    const { game } = get();
    if (!game.faction) return;

    const learned = game.martialArtsSkills.filter(s =>
      s.unlocked &&
      (s.skillId.includes("보법") || s.skillId.includes("신법") || s.skillId.includes("보")) &&
      s.skillId.includes(game.faction as string)
    );

    if (learned.length === 0) return;

    const stars = Math.max(...learned.map(s => s.stars));
    const buffData = getMovementBuff(game.faction, stars);

    if (!buffData) return;

    set((s: any) => {
      let nextHp = s.game.hp;
      if (buffData.multipliers.instantHeal) {
        nextHp = Math.min(get().getTotalHp(), nextHp + get().getTotalHp() * (buffData.multipliers.instantHeal / 100));
      }

      return {
        game: {
          ...s.game,
          hp: nextHp,
          movementBuff: {
            skillId: "active_movement",
            name: buffData.name,
            timeLeft: buffData.duration,
            stars: stars,
            data: buffData.multipliers
          },
          isManaShieldActive: !!buffData.multipliers.manaShield,
          nextHitMultiplier: buffData.multipliers.nextHit || 1
        }
      };
    });
    get().triggerSave(true);
  },

  enhanceWeapon: (itemId: string, useBlessedOil: boolean, useHeavenlyTalisman: boolean) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };

    const curLv = item.enhancement || 0;
    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const rSettings = REALM_SETTINGS[item.realm || "필부"] || REALM_SETTINGS["필부"];
    const rMult = rSettings.rewardMultiplier || 1;
    const starFactor = 1 + (game.star - 1) * 0.1;

    const tierMultiplier = item.tier === "신기" ? 5 : item.tier === "보구" ? 2.5 : item.tier === "명품" ? 1.5 : 1;

    let goldCost, repCost, stoneCost;
    if ((item.realm || "필부") === "필부") {
      goldCost = 1000;
      repCost = 1000;
      stoneCost = 1;
    } else {
      const itemPrice = item.price || 5000;
      const growthFactor = Math.pow(1.15, curLv);
      goldCost = Math.floor(itemPrice * growthFactor * tierMultiplier);
      repCost = Math.floor(itemPrice * growthFactor * tierMultiplier);
      stoneCost = Math.max(1, Math.round((itemPrice / 1000) * Math.pow(1.1, curLv) * tierMultiplier));
    }

    const stepId = game.tutorialProgress.currentStepId;
    const isTutorial = stepId === "click_refine_start" || stepId === "check_refine_result";

    if (!isTutorial) {
      if (game.coins < goldCost) return { success: false, message: "금화가 부족합니다." };
      if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };
    }
    if (useBlessedOil && (game.consumables["oil_blessed"] || 0) <= 0) return { success: false, message: "축복받은 기름이 부족합니다." };
    if (useHeavenlyTalisman && (game.consumables["charm_luck"] || 0) <= 0) return { success: false, message: "천운의 부적이 부족합니다." };

    const successRates: Record<number, number> = {
      0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100, 7: 100, 8: 100, 9: 100,
      10: 100,
      11: 45, 12: 45, 13: 45, 14: 45, 15: 45,
      16: 25, 17: 25, 18: 25, 19: 25, 20: 25,
      21: 10, 22: 10, 23: 10, 24: 10, 25: 10,
      26: 3, 27: 3, 28: 3, 29: 3, 30: 3,
    };
    const baseRate = successRates[curLv] ?? 1;
    let totalRate = baseRate;
    const isInnBuffActive = Date.now() < (game.innBuffEndTime || 0);
    if (isInnBuffActive) totalRate += 5;
    if (useBlessedOil) totalRate += 5;
    const success = isTutorial || (Math.random() * 100 < totalRate);

    set((s: any) => {
      const nextConsumables = { ...s.game.consumables };
      if (useBlessedOil && nextConsumables["oil_blessed"] > 0) nextConsumables["oil_blessed"] -= 1;
      if (useHeavenlyTalisman && nextConsumables["charm_luck"] > 0) nextConsumables["charm_luck"] -= 1;

      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          if (success) {
            const nextLv = curLv + 1;
            // 모든 능력치에 대해 추천 1번 공식 (* 1.15 + 5) 적용
            const nextAtk = w.attackBonus ? Math.floor(w.attackBonus * 1.15) + 5 : w.attackBonus;
            const nextDef = w.defenseBonus ? Math.floor(w.defenseBonus * 1.15) + 5 : w.defenseBonus;
            const nextHp = w.hpBonus ? Math.floor(w.hpBonus * 1.15) + 5 : w.hpBonus;
            
            // 랜덤 옵션 스케일링
            const isGloveOrShoe = w.slot === "gloves" || w.slot === "shoes";
            const nextOptions = (w.randomOptions || []).map((o: any) => {
              const isPercentage = o.label.includes("%");
              let increment = 0.1;
              if (isGloveOrShoe && isPercentage) {
                increment = 0.003;
              }
              const nextVal = Number(((o.value || 0) + increment).toFixed(5));
              const baseLabel = o.label.split(" +")[0];
              return {
                ...o,
                value: nextVal,
                label: isPercentage ? `${baseLabel} +${nextVal.toFixed(3)}%` : `${baseLabel} +${nextVal}`
              };
            });
            
            return { 
              ...w, 
              enhancement: nextLv, 
              attackBonus: nextAtk, 
              defenseBonus: nextDef,
              hpBonus: nextHp,
              randomOptions: nextOptions,
              options: nextOptions,
              description: nextAtk ? `공격 +${nextAtk}` : w.description
            };
          } else if (curLv >= 21 && !useHeavenlyTalisman) {
            return { ...w, enhancement: curLv - 1 };
          }
        }
        return w;
      });

     return {
  game: {
    ...s.game,
    coins: isTutorial ? s.game.coins : s.game.coins - goldCost,
    reputation: isTutorial ? s.game.reputation : s.game.reputation - repCost,
    enhancementStones: isTutorial
      ? s.game.enhancementStones
      : (s.game.enhancementStones || 0) - stoneCost,
    consumables: nextConsumables,
    ownedWeapons: nextWeapons
  }
};
    });

    get().triggerSave(true);
    // 튜토리얼 단계 자동 전환은 TutorialOverlay 또는 ForgePanel에서 처리하도록 제거 (결과 확인 단계를 위해)

    get().updateQuestProgress("enhance_item", 1);
    let failMsg = "강화에 실패했습니다.";
    if (curLv >= 21) {
      failMsg = useHeavenlyTalisman
        ? "강화에 실패했으나 천운의 부적이 단계 하락을 방어했습니다."
        : "강화에 실패하여 강화 단계가 하락했습니다.";
    } else if (curLv >= 11) {
      failMsg = "강화에 실패했습니다. (안전 구간이므로 단계가 유지됩니다)";
    }
    const successMsg = isTutorial 
      ? `무명철검 +${curLv + 1}강 강화 성공! (공격력 10 → 22)`
      : `${curLv + 1}강 강화 성공!`;
    return { success, message: success ? successMsg : failMsg };
  },

  rerollWeaponOptions: (itemId: string, lockedOptionIndex?: number) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    let goldCost = 0;
    let repCost, stoneCost;
    if ((item.realm || "필부") === "필부") {
      goldCost = 1000;
      repCost = 1000;
      stoneCost = 1;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(30000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(10 * stoneScale);
    }

    // 옵션 고정 시 비용 2배
    if (lockedOptionIndex !== undefined) {
      goldCost *= 2;
      repCost *= 2;
      stoneCost *= 2;
    }

    const stepId = game.tutorialProgress.currentStepId;
    const isTutorial = stepId === "click_reroll_start" || stepId === "check_reroll_result";
    
    if (!isTutorial) {
      if (game.coins < goldCost) return { success: false, message: "금화가 부족합니다." };
      if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };
    }

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          // 튜토리얼 중에는 무조건 신기 등급 수준의 행운(500) 부여하여 최상급 옵션 3개 이상 보장
          let rolled = rollTierAndOptions(
            w, 
            realmIdx, 
            isTutorial ? 500 : get().getTotalLuck(), 
            realmIdx,
            isTutorial ? "명품" : undefined,
            lockedOptionIndex // 고정 옵션 인덱스 전달
          );
          
          // 튜토리얼 중이면 확실히 옵션이 바뀐 것을 보여주기 위해 강제로 새로운 옵션 세트 주입
          if (isTutorial) {
            const targetCount = getItemOptionCount(rolled.tier || "평범");
            const tutorialPool: any[] = [
              { stat: "atk_pct", label: "공격력", value: 15, grade: "최상급" },
              { stat: "crit_rate", label: "치명타 확률", value: 5, grade: "최상급" },
              { stat: "crit_dmg_pct", label: "치명타 피해", value: 20, grade: "최상급" },
              { stat: "hp_pct", label: "생명력", value: 15, grade: "최상급" }
            ];
            rolled.randomOptions = tutorialPool.slice(0, targetCount).map(o => ({
              ...o,
              label: `${o.label} +${o.value}%`
            }));
          }

          // 최종 보정: 혹시 모를 버그나 레거시 데이터 방지를 위해 옵션 개수 강제 고정
          rolled = fixItemOptions(rolled);

          return { ...rolled, enhancement: w.enhancement };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          coins: isTutorial ? s.game.coins : s.game.coins - goldCost,
          reputation: isTutorial ? s.game.reputation : s.game.reputation - repCost,
          enhancementStones: isTutorial ? s.game.enhancementStones : (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    get().updateQuestProgress("refine_item", 1);
    return { success: true, message: "기연 재연마 성공!" };
  },

  infuseSoul: (itemId: string, type: string) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };
    if ((item.enhancement || 0) < 10) return { success: false, message: "10강 이상 장비만 가능합니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    let goldCost = 0;
    let repCost, stoneCost;
    if ((item.realm || "필부") === "필부") {
      goldCost = 1000;
      repCost = 1000;
      stoneCost = 1;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(200000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(100 * stoneScale);
    }

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    const souls: Record<string, any> = {
      vampire: { name: "흡성대법", desc: "공격 시 HP의 2% 회복" },
      haste: { name: "신법가속", desc: "스킬 쿨타임 20% 감소" },
      destruct: { name: "파멸의 일격", desc: "방어력 무시 피해 발생" }
    };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) return { ...w, soulEffect: souls[type] };
        return w;
      });

      return {
        game: {
          ...s.game,
          coins: s.game.coins - goldCost,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `${souls[type].name} 영혼 주입 성공!` };
  },

  applyOil: (itemId: string, oilId: ConsumableId) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };
    if ((game.consumables[oilId] || 0) <= 0) return { success: false, message: "기름이 부족합니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    let goldCost = 0;
    let repCost, stoneCost;
    if ((item.realm || "필부") === "필부") {
      goldCost = 1000;
      repCost = 1000;
      stoneCost = 1;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(80000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(20 * stoneScale);
    }

    const stepId = game.tutorialProgress.currentStepId;
    const isTutorial = stepId === "click_infuse_start" || stepId === "check_forge_result";

    if (!isTutorial) {
      if (game.coins < goldCost) return { success: false, message: "금화가 부족합니다." };
      if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };
    }

    const oilNames: Record<string, string> = {
      oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유",
      oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유",
      oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "천명유", oil_eye: "영안유",
      oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유"
    };

    const oilDetails: Record<string, { chance: number, desc: string }> = {
      oil_atk_3: { chance: 2, desc: "2% 확률로 공격력 3배 (5초)" },
      oil_crit_3: { chance: 2, desc: "2% 확률로 치댐 3배 (5초)" },
      oil_thunder: { chance: 5, desc: "5% 확률로 500% 대미지 + 기절" },
      oil_poison: { chance: 5, desc: "5% 확률로 적 방어력 50% 감소 (10초)" },
      oil_bleed: { chance: 5, desc: "5% 확률로 출혈 (최대 HP 10% 지속피해)" },
      oil_eva_3: { chance: 5, desc: "5% 확률로 회피율 3배 (10초)" },
      oil_def_3: { chance: 7, desc: "7% 확률로 모든 피해 50% 감소 (10초)" },
      oil_reflect: { chance: 7, desc: "7% 확률로 받은 피해 200% 반사 (10초)" },
      oil_vajra: { chance: 5, desc: "5% 확률로 5초간 무적 상태" },
      oil_vampire: { chance: 5, desc: "5% 확률로 대미지 50% 흡혈" },
      oil_speed_3: { chance: 5, desc: "5% 확률로 공속 2배 (10초)" },
      oil_luck_3: { chance: 5, desc: "5% 확률로 전리품 등급 상승 확률 증가" },
      oil_clarity: { chance: 8, desc: "8% 확률로 상이상 즉시 해제" },
      oil_eye: { chance: 15, desc: "15% 확률로 적의 공격 반드시 회피" },
      oil_demon: { chance: 2, desc: "2% 확률로 일격필살(1000% 대미지) 발동" },
      oil_triple_hit: { chance: 5, desc: "5% 확률로 3배 연타 공격 발동" },
      oil_formless: { chance: 3, desc: "3% 확률로 적 현재 체력 10% 즉시 삭감" }
    };

    set((s: any) => {
      const nextConsumables = { ...s.game.consumables, [oilId]: s.game.consumables[oilId] - 1 };
      const updatedWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          const detail = oilDetails[oilId] || { chance: 15, desc: "발동 시 특수 효과" };
          return {
            ...w,
            oilEffect: {
              label: `${oilNames[oilId]}: ${detail.desc}`,
              key: oilId,
              chance: detail.chance
            }
          };
        }
        // [마이그레이션] 기존 천마유/삼연유 아이템들 수치 최신화
        if (w.oilEffect?.key === "oil_demon") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 2,
              label: "천마유: [천마] 공격 시 2% 확률로 일격필살(1000% 대미지) 발동"
            }
          };
        }
        if (w.oilEffect?.key === "oil_triple_hit") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 5,
              label: "삼연유: 5% 확률로 3배 연타 공격 발동"
            }
          };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          coins: isTutorial ? s.game.coins : s.game.coins - goldCost,
          reputation: isTutorial ? s.game.reputation : s.game.reputation - repCost,
          enhancementStones: isTutorial ? s.game.enhancementStones : (s.game.enhancementStones || 0) - stoneCost,
          consumables: nextConsumables,
          ownedWeapons: updatedWeapons
        }
      };
    });

    get().triggerSave(true);
    // 튜토리얼 단계 자동 전환은 TutorialOverlay 또는 ForgePanel에서 처리하도록 제거

    get().updateQuestProgress("apply_oil", 1);
    return { success: true, message: `${oilNames[oilId]} 주입 성공!` };
  },

  triggerOilEffects: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedWeapons = game.ownedWeapons.filter((w: any) => equippedIds.includes(w.id));

    let hitCount = 1;
    let ohk = false;
    const buffsToTrigger: string[] = [];

    equippedWeapons.forEach((w: any) => {
      if (!w.oilEffect) return;
      const oil = w.oilEffect;

      // 스크린샷 기준 공식 확률 적용

      // 무상유: 3% 확률 적 현재 체력 10% 삭감
      if (oil.key === "oil_formless" && Math.random() < 0.03) buffsToTrigger.push("oil_formless");

      // 삼연유: 5% 확률 3연타
      if (oil.key === "oil_triple_hit" && Math.random() < 0.05) {
        hitCount = 3;
        buffsToTrigger.push("oil_triple_hit");
      }

      // 천마유: 2% 확률로 1000% 대미지
      if (oil.key === "oil_demon" && Math.random() < 0.02) buffsToTrigger.push("oil_demon");

      // 파천유(치명3배): 2%
      if (oil.key === "oil_crit_3" && Math.random() < 0.02) buffsToTrigger.push("oil_crit_3");

      // 광폭유(공격3배): 2%
      if (oil.key === "oil_atk_3" && Math.random() < 0.02) buffsToTrigger.push("oil_atk_3");

      // 무영유(회피3배): 5%
      if (oil.key === "oil_eva_3" && Math.random() < 0.05) buffsToTrigger.push("oil_eva_3");

      // 강철유(피해감소 50%): 7%
      if (oil.key === "oil_def_3" && Math.random() < 0.07) buffsToTrigger.push("oil_def_3");

      // 반탄유(200% 반사): 7%
      if (oil.key === "oil_reflect" && Math.random() < 0.07) buffsToTrigger.push("oil_reflect");

      // 질풍유(공속 2배): 5%
      if (oil.key === "oil_speed_3" && Math.random() < 0.05) buffsToTrigger.push("oil_speed_3");

      // 기연유: 5%
      if (oil.key === "oil_luck_3" && Math.random() < 0.05) buffsToTrigger.push("oil_luck_3");

      // 뇌전유: 5% 확률로 500% 대미지 + 기절
      if (oil.key === "oil_thunder" && Math.random() < 0.05) buffsToTrigger.push("oil_thunder");

      // 만독유: 5% 확률 적 방어력 50% 감소
      if (oil.key === "oil_poison" && Math.random() < 0.05) buffsToTrigger.push("oil_poison");

      // 혈염유: 5% 확률 출혈
      if (oil.key === "oil_bleed" && Math.random() < 0.05) buffsToTrigger.push("oil_bleed");

      // 금강유: 5% 확률 5초 무적
      if (oil.key === "oil_vajra" && Math.random() < 0.05) buffsToTrigger.push("oil_vajra");

      // 흡성유: 5% 확률 50% 흡혈
      if (oil.key === "oil_vampire" && Math.random() < 0.05) buffsToTrigger.push("oil_vampire");

      // 영안유: 15% 확률로 적 공격 회피
      if (oil.key === "oil_eye" && Math.random() < 0.15) buffsToTrigger.push("oil_eye");

      // 청명유: 8% 확률 즉시 회복
      if (oil.key === "oil_clarity" && Math.random() < 0.08) {
        buffsToTrigger.push("oil_clarity");
      }
    });

    return { hitCount, ohk: false, buffsTriggered: buffsToTrigger };
  },

  applyOilResults: (oilRes: any) => {
    if (!oilRes || oilRes.buffsTriggered.length === 0) return;

    set((s: any) => {
      const nextBuffs = { ...(s.game.oilBuffs || {}) };
      const nextMD = { ...s.game.masterDuel };

      oilRes.buffsTriggered.forEach((k: string) => {
        if (k === "oil_thunder") {
          if (nextMD.isPlaying) {
            nextMD.isStunned = true;
            nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
          }
        } else if (k === "oil_poison" || k === "oil_bleed") {
          if (nextMD.isPlaying) {
            const debuffs = { ...(nextMD.rivalDebuffs || {}) };
            debuffs[k === "oil_poison" ? "armor_break" : "bleed"] = 10;
            nextMD.rivalDebuffs = debuffs;
          }
        } else if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") {
          nextBuffs[k] = 5;
        } else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
          nextBuffs[k] = 1;
          if (k === "oil_clarity") {
            s.game.hp = Math.min(get().getTotalHp(), s.game.hp + get().getTotalHp() * 0.2);
            s.game.mp = Math.min(get().getTotalMp(), s.game.mp + get().getTotalMp() * 0.2);
          }
        } else {
          nextBuffs[k] = 10;
        }
      });

      return { game: { ...s.game, oilBuffs: nextBuffs, masterDuel: nextMD } };
    });
  },

  toggleAudio: () => set((s: any) => ({ game: { ...s.game, isAudioMuted: !s.game.isAudioMuted } })),

  claimDuelReward: () => {
    set((s: any) => ({ game: { ...s.game, pendingReward: null, timingMission: { ...s.game.timingMission, available: false } } }));
    get().triggerSave(true);
    get().syncToCloud(true);
  },
  markInnEntryHandled: () => set((s: any) => ({ game: { ...s.game, pendingInnEntry: false } })),
  useSkill: (name: string) => {
    const { game } = get();
    const skBase = game.learnedSkills.find((s: any) => s.name === name);
    if (!skBase) return;

    // 도감에서 원본 데이터 가져오기 (타입 판별 정확도 향상)
    const sk = MARTIAL_COMPENDIUM.find(m => m.name === name && m.factionName === game.faction) || skBase;

    const mpCost = sk.mpCost || 50;

    if (game.mp < mpCost || (game.skillCooldowns[name] || 0) > 0) return;

    set((s: any) => ({
      game: {
        ...s.game,
        mp: Math.max(0, s.game.mp - mpCost),
        skillCooldowns: { ...s.game.skillCooldowns, [name]: 10 }
      }
    }));

    // 보법/신법 계열인 경우 버프 트리거 (이름에 '보'나 '신법'이 포함된 경우도 포함하여 어택 로직 완전 차단)
    const isMovement = (sk as any).skillType === "movement" || (sk as any).type === "movement" || (sk as any).category === "movement" || name.includes("보") || name.includes("신법");

    if (isMovement) {
      get().triggerMovementBuff();
      if (game.masterDuel.isPlaying) {
        const learned = game.martialArtsSkills.find(ms => ms.skillId.includes(name.replace(/\s+/g, "_").toLowerCase()));
        const stars = learned?.stars || 0;
        const buffData = getMovementBuff(game.faction, stars);

        set((s: any) => ({
          game: {
            ...s.game,
            masterDuel: {
              ...s.game.masterDuel,
              lastEffect: "DODGE",
              skillEffect: {
                name: name,
                description: buffData ? buffData.description : "보법 발동",
                timeLeft: buffData ? buffData.duration : 3.0
              }
            }
          }
        }));
        // 1초 후 이펙트 제거
        setTimeout(() => {
          set((s: any) => ({
            game: {
              ...s.game,
              masterDuel: { ...s.game.masterDuel, lastEffect: null }
            }
          }));
        }, 1000);
      }
      return;
    }

    // 공격 무공인 경우 대미지 적용 및 연마유 효과 트리거
    if (game.masterDuel.isPlaying) {
      const oilRes = get().triggerOilEffects();
      const faction = game.faction;
      const masterDuel = game.masterDuel;
      const fState = { ...(masterDuel.factionState || {}) };

      // 1. 기초 공격력 및 스탯 보정
      const statMult = fState.statMult || 1.0;
      let playerAtk = get().getTotalAttack() * statMult;
      let playerCritRate = get().getTotalCritRate();
      let playerCritDmg = get().getTotalCritDmg() / 100;

      // 2. 무공 자체 배수 및 성급(Refinement) 보정
      const learned = game.martialArtsSkills.find(ms => ms.skillId === (sk as any).id || ms.skillId === (sk as any).skillId);
      const stars = learned?.stars || 0;
      const refineMult = getRefineBonusMultiplier(stars);
      const baseMultiplier = sk.multiplier || 3;
      const totalMultiplier = baseMultiplier * refineMult;

      // 3. 방어력 및 관통 보정
      let rivalDef = masterDuel.rivalDef || 0;
      if (faction === "남궁세가") rivalDef = 0; // 남궁세가: 무공 시 방어 무시
      if (faction === "일월신교") rivalDef *= 0.5;
      const defenseMultiplier = 100 / (100 + Math.max(0, rivalDef));

      let dmg = playerAtk * totalMultiplier * defenseMultiplier;

      // 4. 치명타 판정
      if (faction === "청성파") playerCritRate += (fState.nextCritBonus || 0);
      let isCrit = Math.random() < playerCritRate / 100;
      if (isCrit) dmg *= playerCritDmg;

      // 5. 문파별 특수 보정
      let damageMultiplier = 1.0;
      if (faction === "천마신교") {
        damageMultiplier *= 5.0; // 천마신교: 무공 발동 시 피해 5배
        fState.nextCritBonus = 20; // 5초간 치명타율 +20% (간략화)
      }
      if (faction === "하북팽가") damageMultiplier *= 1.5; // 하북팽가: 무공 피해 증가

      // 6. 연마유 특수 효과
      let ohkMult = 1;
      if (oilRes.buffsTriggered.includes("oil_thunder")) ohkMult += 5;
      if (oilRes.buffsTriggered.includes("oil_demon")) ohkMult += 10;

      let totalDmg = dmg * damageMultiplier * ohkMult;

      set((s: any) => {
        const nextBuffs = { ...(s.game.oilBuffs || {}) };
        const nextMD = { ...s.game.masterDuel };

        // 연마유 버프 적용 (스킬에서도 동일하게 버프 발생)
        oilRes.buffsTriggered.forEach((k: string) => {
          if (k === "oil_thunder") {
            nextMD.isStunned = true;
            nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
          } else if (k === "oil_poison" || k === "oil_bleed") {
            const debuffs = { ...(nextMD.rivalDebuffs || {}) };
            debuffs[k === "oil_poison" ? "armor_break" : "bleed"] = 10;
            nextMD.rivalDebuffs = debuffs;
          } else if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") nextBuffs[k] = 5;
          else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
            nextBuffs[k] = 1;
            if (k === "oil_clarity") {
              s.game.hp = Math.min(get().getTotalHp(), s.game.hp + get().getTotalHp() * 0.2);
              s.game.mp = Math.min(get().getTotalMp(), s.game.mp + get().getTotalMp() * 0.2);
            }
          }
          else nextBuffs[k] = 10;
        });

        if (oilRes.buffsTriggered.includes("oil_formless")) {
          totalDmg += nextMD.rivalHp * 0.10;
        }

        if (oilRes.buffsTriggered.includes("oil_vampire")) {
          s.game.hp = Math.min(get().getTotalHp(), s.game.hp + totalDmg * 0.5);
        }

        const nHp = Math.max(0, nextMD.rivalHp - totalDmg);
        const result = {
          game: {
            ...s.game,
            oilBuffs: nextBuffs,
            masterDuel: {
              ...nextMD,
              rivalHp: nHp
            }
          }
        };
        if (nHp <= 0) {
          setTimeout(() => get().tapMasterDuel(0), 100);
        }
        return result;
      });
      return { totalDmg, isCrit };
    }
    return { totalDmg: 0, isCrit: false };
  },
  startInnCombat: (stage: number) => set((s: any) => {
    const stageConfig = getInnStageConfig(stage);
    return {
      game: {
        ...s.game,
        timingMission: {
          ...s.game.timingMission,
          currentStage: stage,
          combatState: {
            playerHp: 100,
            playerMaxHp: 100,
            enemyHp: stageConfig.relativeTarget,
            enemyMaxHp: stageConfig.relativeTarget,
            isBleeding: false,
            bleedRemainSec: 0,
            bleedScorePerSec: 0,
            isCounterDotActive: false,
            counterDotRemainSec: 0,
            counterDotPerSec: 0,
            counterCooldownRemainSec: 0,
            playerHitFlash: false,
            enemyHitFlash: false,
            lastMatchScore: 0,
            phase: "playing",
            dialogue: null
          }
        }
      }
    };
  }),


  applyInnPuzzleScore: (gainedScore: number) => {
    const { game } = get();
    const combat = game.timingMission.combatState;
    if (!combat || combat.phase !== "playing") return;

    const stageConfig = getInnStageConfig(game.timingMission.currentStage);
    const threshold = Math.floor(stageConfig.targetScore * stageConfig.finisherThresholdRate);
    const isFinisher = gainedScore >= threshold;

    set((s: any) => {
      const nextCombat = { ...s.game.timingMission.combatState! };
      nextCombat.lastMatchScore = gainedScore;
      nextCombat.enemyHitFlash = true;

      if (isFinisher) {
        const bleedPerSec = Math.max(1, Math.floor(gainedScore / 80));
        nextCombat.isBleeding = true;
        nextCombat.bleedRemainSec = stageConfig.finisherBleedDurationSec;
        nextCombat.bleedScorePerSec = Math.max(nextCombat.bleedScorePerSec || 0, bleedPerSec);
        nextCombat.phase = "finisher";
        nextCombat.dialogue = {
          actor: "player",
          text: "받아라. 오늘이 네 마지막 밤이다.",
          duration: 1800
        };
      }

      return {
        game: {
          ...s.game,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });

    // Reset flashes and phase after delay
    setTimeout(() => {
      set((s: any) => {
        const c = s.game.timingMission.combatState;
        if (!c) return s;
        return {
          game: {
            ...s.game,
            timingMission: {
              ...s.game.timingMission,
              combatState: { ...c, enemyHitFlash: false, phase: c.phase === "finisher" ? "playing" : c.phase, dialogue: c.phase === "finisher" ? null : c.dialogue }
            }
          }
        };
      });
    }, 800);
  },

  updateInnCombat: (dt: number, currentScore: number) => {
    const now = Date.now();
    set((s: any) => {
      const { game } = s;
      const combat = game.timingMission.combatState;
      if (!combat || (combat.phase !== "playing" && combat.phase !== "counter" && combat.phase !== "finisher")) return s;

      const stage = game.timingMission.currentStage;
      const stageConfig = getInnStageConfig(stage);
      const nextCombat = { ...combat };

      // 1. Enemy HP calculation (Relative to current stage)
      nextCombat.enemyHp = Math.max(0, stageConfig.relativeTarget - (currentScore - stageConfig.prevTarget));

      // 2. Player HP Drain (every 2s)
      s.innDrainAccumulator = (s.innDrainAccumulator || 0) + dt;
      if (s.innDrainAccumulator >= stageConfig.playerDrainIntervalSec) {
        s.innDrainAccumulator -= stageConfig.playerDrainIntervalSec;
        nextCombat.playerHp = Math.max(0, nextCombat.playerHp - stageConfig.playerDrainPerTick);
        nextCombat.playerHitFlash = true;
        setTimeout(() => set((ss: any) => {
          const cc = ss.game.timingMission.combatState;
          if (!cc) return ss;
          return { game: { ...ss.game, timingMission: { ...ss.game.timingMission, combatState: { ...cc, playerHitFlash: false } } } };
        }), 150);
      }

      // 3. Bleed logic (1s tick)
      if (nextCombat.isBleeding) {
        s.innBleedAccumulator = (s.innBleedAccumulator || 0) + dt;
        if (s.innBleedAccumulator >= 1.0) {
          s.innBleedAccumulator -= 1.0;
          nextCombat.bleedRemainSec -= 1;
          if (nextCombat.bleedRemainSec <= 0) {
            nextCombat.isBleeding = false;
            nextCombat.bleedScorePerSec = 0;
          }
        }
      }

      // 4. Counter logic
      if (nextCombat.isCounterDotActive) {
        s.innCounterAccumulator = (s.innCounterAccumulator || 0) + dt;
        if (s.innCounterAccumulator >= 1.0) {
          s.innCounterAccumulator -= 1.0;
          nextCombat.playerHp = Math.max(0, nextCombat.playerHp - 3);
          nextCombat.counterDotRemainSec -= 1;
          if (nextCombat.counterDotRemainSec <= 0) {
            nextCombat.isCounterDotActive = false;
            nextCombat.counterDotPerSec = 0;
          }
        }
      }

      // 5. Counter Cooldown
      if (nextCombat.counterCooldownRemainSec > 0) {
        nextCombat.counterCooldownRemainSec -= dt;
      }

      return {
        game: {
          ...s.game,
          lastActivityHeartbeat: now,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });
  },

  handleInnSecondTick: (scoreGainedThisSecond: number) => {
    const { game } = get();
    const combat = game.timingMission.combatState;
    if (!combat || combat.phase !== "playing") return;

    const stageConfig = getInnStageConfig(game.timingMission.currentStage);

    set((s: any) => {
      const nextCombat = { ...s.game.timingMission.combatState! };
      const log = [...(nextCombat.recentScoreLog || [])];
      log.push(scoreGainedThisSecond);
      if (log.length > stageConfig.counterCheckWindowSec) log.shift();
      nextCombat.recentScoreLog = log;

      // Check for counter
      const recentTotal = log.reduce((a, b) => a + b, 0);
      const expected10s = (stageConfig.targetScore / stageConfig.durationSec) * stageConfig.counterCheckWindowSec;

      if (log.length >= stageConfig.counterCheckWindowSec &&
        nextCombat.counterCooldownRemainSec <= 0 &&
        !nextCombat.isCounterDotActive &&
        recentTotal < expected10s * stageConfig.counterThresholdRate) {

        // Trigger counter
        nextCombat.phase = "counter";
        nextCombat.isCounterDotActive = true;
        nextCombat.counterDotRemainSec = stageConfig.counterDotDurationSec;
        nextCombat.counterDotPerSec = Math.max(1, Math.floor(expected10s / 50));
        nextCombat.counterCooldownRemainSec = stageConfig.counterCooldownSec;
        nextCombat.dialogue = {
          actor: "enemy",
          text: "하찮은 수로는 날 꺾지 못한다!",
          duration: 1800
        };
        setTimeout(() => {
          set((ss: any) => {
            const cc = ss.game.timingMission.combatState;
            if (!cc) return ss;
            return {
              game: {
                ...ss.game,
                timingMission: {
                  ...ss.game.timingMission,
                  combatState: { ...cc, phase: "playing", dialogue: null }
                }
              }
            };
          });
        }, 1800);
      }

      return {
        game: {
          ...s.game,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });
  },
  syncToCloud: async (force: boolean = false) => {
    const { isSyncingToCloud, isSyncingFromCloud, lastSyncTime, lastSyncHash, game } = get();
    
    // 1. 진행 중이거나 너무 빈번한 요청 방지 (주기적 저장은 30초, 강제 저장은 락만 체크)
    const now = Date.now();
    if (isSyncingToCloud || isSyncingFromCloud) return;
    if (!force && (now - lastSyncTime < 30000)) return; 

    // 2. 데이터 변경 여부 확인 (해시 비교로 무의미한 업로드 방지)
    // touches나 gold가 계속 변하므로 중요 데이터 위주로 비교하거나 전체 비교 후 스킵
    const currentHash = JSON.stringify({
      realm: game.realm,
      totalKills: game.totalDummyKills,
      coins: Math.floor(game.coins / 100) * 100, // 금화는 100단위로 뭉뚱그려 비교 (사소한 변화 무시)
      exp: Math.floor(game.exp / 100) * 100,
      equipped: game.equippedGear,
      weaponsCount: game.ownedWeapons.length,
      star: game.star
    });
    
    if (currentHash === lastSyncHash) {
      console.log("변경 사항 없음 - 클라우드 동기화 스킵");
      return;
    }

    set({ isSyncingToCloud: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSyncingToCloud: false });
        return;
      }

      await saveGameToFirebase(user.id, game);
      console.log("클라우드(Firebase) 동기화 성공");
      set({ lastSyncTime: Date.now(), lastSyncHash: currentHash });
    } catch (e: any) {
      console.warn("클라우드 동기화 중 에러 발생:", e);
      // Firebase stream exhaustion 에러 발생 시 로그 출력
      if (e.message?.includes("exhausted")) {
        console.error("Firestore Write Stream Exhausted! 요청 간격을 조절합니다.");
      }
      get().triggerSave(true); 
      set({ isSyncingToCloud: false });
    }
  },
  syncFromCloud: async () => {
    const { isSyncingFromCloud, isSyncingToCloud } = get();
    if (isSyncingFromCloud || isSyncingToCloud) return;
    set({ isSyncingFromCloud: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cloudData = await loadGameFromFirebase(user.id);
      if (cloudData && cloudData.realm) {
        set((s: any) => ({ game: { ...s.game, ...cloudData, isInitialized: true } }));
        saveGame(get().game);
        console.log("클라우드(Firebase) 데이터 로드 성공");
      } else {
        // 클라우드에 데이터가 없는 경우 (신규 유저)
        // 로컬 데이터가 이미 있다면(경지나 처치수가 있다면) 초기화하지 않고 클라우드로 업로드 시도
        const currentLocal = get().game;
        if (currentLocal.totalDummyKills > 0 || currentLocal.realm !== "필부") {
          console.log("클라우드 데이터 없음 - 현재 로컬 데이터를 클라우드에 보존합니다.");
          await saveGameToFirebase(user.id, currentLocal);
        } else {
          console.log("신규 유저로 감지되어 초기화합니다.");
          set((s: any) => ({ game: { ...defaultGameData, isInitialized: true } }));
          saveGame(get().game);
        }
      }
    } catch (e) {
      console.warn("데이터 불러오기 중 에러 발생:", e);
    } finally {
      set({ isSyncingFromCloud: false });
    }
  }, resetGame: async () => {
    const { isSyncingToCloud, isSyncingFromCloud } = get();
    if (isSyncingToCloud || isSyncingFromCloud) return;
    if (typeof window !== "undefined") {
      // 1. 클라우드 데이터 초기화 시도
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveGameToFirebase(user.id, defaultGameData);
          console.log("클라우드 데이터 초기화 성공");
        }
      } catch (e) {
        console.error("클라우드 초기화 실패:", e);
      }

      // 2. 메모리 상태 초기화
      set({ game: { ...defaultGameData, isInitialized: true } });

      // 3. 모든 버전의 세이브 키 삭제
      for (let i = 1; i <= 20; i++) {
        localStorage.removeItem(`murimbook-game-save-v${i}`);
      }
      localStorage.removeItem("murimbook-game-save");

      // 4. 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  },

  startCombatAnalysis: (duration = 10) => {
    set((s: any) => ({
      combatAnalysis: {
        isActive: true,
        timeLeft: duration,
        log: [],
        results: null,
        startTime: Date.now()
      }
    }));
  },
  stopCombatAnalysis: () => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    const log = combatAnalysis.log;
    const totalDamage = log.reduce((acc, entry) => acc + entry.damage, 0);
    const lastHit = log[log.length - 1]?.timestamp || Date.now();
    const durationMs = lastHit - (combatAnalysis as any).startTime;
    const effectiveDuration = Math.max(1, durationMs / 1000);
    const dps = totalDamage / effectiveDuration;

    const breakdown: Record<string, any> = {};
    const skillDetails: Record<string, number> = {};
    let critCount = 0;

    log.forEach(entry => {
      if (!breakdown[entry.source]) {
        breakdown[entry.source] = { total: 0, dps: 0, percent: 0, count: 0 };
      }
      breakdown[entry.source].total += entry.damage;
      breakdown[entry.source].count += 1;
      if (entry.isCritical) critCount++;
      if (entry.skillName) {
        skillDetails[entry.skillName] = (skillDetails[entry.skillName] || 0) + entry.damage;
      }
    });

    Object.keys(breakdown).forEach(source => {
      breakdown[source].dps = breakdown[source].total / effectiveDuration;
      breakdown[source].percent = totalDamage > 0 ? (breakdown[source].total / totalDamage) * 100 : 0;
    });

    set((s: any) => ({
      combatAnalysis: {
        ...s.combatAnalysis,
        isActive: false,
        results: {
          totalDamage,
          dps,
          breakdown,
          critCount,
          hitCount: log.length,
          skillDetails,
          startTime: (s.combatAnalysis as any).startTime,
          endTime: Date.now()
        }
      }
    }));
  },
  logCombatDamage: (entry: Omit<CombatLogEntry, 'timestamp'>) => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    set((s: any) => ({
      combatAnalysis: {
        ...s.combatAnalysis,
        log: [...s.combatAnalysis.log, { ...entry, timestamp: Date.now() }]
      }
    }));
  },
  updateCombatAnalysis: (dt: number) => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    const nextTime = Math.max(0, combatAnalysis.timeLeft - dt);
    if (nextTime <= 0) {
      get().stopCombatAnalysis();
    } else {
      set((s: any) => ({
        combatAnalysis: {
          ...s.combatAnalysis,
          timeLeft: nextTime
        }
      }));
    }
  },

  startTower: () => {
    const { game } = get();
    if (game.tower.isInside) return;

    const floor = 1;
    const enemies = generateTowerWave(floor, 1);
    const maxHp = 1650; // Tower Baseline MaxHP (equivalent to level 1 stats)

    set((s: any) => ({
      game: {
        ...s.game,
        activeTab: "tower",
        tower: {
          ...s.game.tower,
          isInside: true,
          currentFloor: floor,
          hp: maxHp,
          maxHp: maxHp,
          mp: 100,
          maxMp: 100,
          activeBuffs: [],
          artifacts: [],
          combo: 0,
          lastTapTime: 0,
          enemies: enemies,
          currentWave: 1,
          totalWaves: 3,
          eventRoom: null,
          pendingBuffChoices: null,
          pendingArtifactChoices: null,
          startTime: Date.now(),
          isAutoMode: false,
          kiGauge: 0,
          autoAttackTimer: 0
        }
      }
    }));
    get().triggerSave(true);
  },

  leaveTower: () => {
    set((s: any) => ({
      game: {
        ...s.game,
        lastActivityHeartbeat: Date.now(),
        tower: {
          ...s.game.tower,
          isInside: false,
          enemy: null,
          eventRoom: null,
          pendingBuffChoices: null
        }
      }
    }));
    get().triggerSave(true);
  },

  tapTower: (bonusDmg?: number, isWeakness?: boolean) => {
    const { game, processAttackGauge } = get();
    const tower = game.tower;
    if (!tower.isInside || tower.enemies.length === 0 || tower.eventRoom || tower.pendingBuffChoices || tower.pendingArtifactChoices) return;

    const extraHitsCount = processAttackGauge();

    set((s: any) => {
      const t = s.game.tower;
      if (t.enemies.length === 0) return s;
      
      const frontEnemy = t.enemies[0];
      const now = Date.now();

      const activeIds = t.artifacts.map((a: any) => a.id);
      const artifactTags: Record<string, number> = {};
      t.artifacts.forEach((art: any) => {
        (art.tags || []).forEach((tag: string) => {
          artifactTags[tag] = (artifactTags[tag] || 0) + 1;
        });
      });

      const hasInfiniteCombo = t.artifacts.some((a: any) => a.effect.type === "INFINITE_COMBO");
      let nextCombo = (now - t.lastTapTime < 1500 || hasInfiniteCombo) ? t.combo + 1 : 1;

      const baseAtk = 2500 + (t.currentFloor * 200);
      let atkMult = 1.0;
      let critRate = 15;
      let critDmgMult = 2.0;
      let lifestealPct = 0;
      let reflectPct = 0;
      let bonusHits = extraHitsCount;
      let mpRecoverPct = 0;
      let kiGainMult = 1.0;
      let lastReward = t.lastReward;

      t.activeBuffs.forEach((b: any) => {
        if (b.bonus.atk) atkMult *= b.bonus.atk;
        if (b.bonus.critRate) critRate += b.bonus.critRate;
        if (b.bonus.vamp) lifestealPct += b.bonus.vamp;
        if (b.bonus.kiGain) kiGainMult *= b.bonus.kiGain;
        if (b.penalty.atk) atkMult *= b.penalty.atk;
      });

      t.artifacts.forEach((art: any) => {
        const eff = art.effect;
        if (eff.type === "ATK_PCT") atkMult *= (1 + eff.value / 100);
        if (eff.type === "MULTI_HIT" && Math.random() < (eff.chance / 100)) bonusHits += (eff.value - 1);
        if (eff.type === "LIFE_STEAL" || eff.type === "LIFE_STEAL_HASTE") lifestealPct += eff.value;
        if (eff.type === "REFLECT" || eff.type === "VAJRA") reflectPct += eff.value;
        if (eff.type === "MP_RESTORE") mpRecoverPct += eff.value;
        if (eff.type === "COSMIC_HITS") {
           bonusHits += (eff.value - 1);
           atkMult *= 1.5;
        }
        if (eff.type === "CRIT_RATE") critRate += eff.value;
        if (eff.type === "CRIT_DMG_PCT") critDmgMult += (eff.value / 100);
        if (eff.type === "GOD_EYE") {
          critRate += eff.value;
          if (Math.random() < 0.5) bonusHits += 1;
        }
      });

      TOWER_SYNERGIES.forEach(syn => {
        let isSynActive = false;
        if (syn.requiredTags) {
          isSynActive = syn.requiredTags.every(tag => (artifactTags[tag] || 0) >= 1);
          if (syn.id === "BLOOD_MOON") isSynActive = (artifactTags["lifesteal"] || 0) >= 2;
          if (syn.id === "COMBO_MASTER") isSynActive = (artifactTags["combo"] || 0) >= 2;
          if (syn.id === "CRITICAL_BURST") isSynActive = (artifactTags["critical"] || 0) >= 2;
          if (syn.id === "SPEED_DEMON") isSynActive = (artifactTags["speed"] || 0) >= 3;
        } else if (syn.requiredIds) {
          isSynActive = syn.requiredIds.every(id => activeIds.includes(id));
        }

        if (isSynActive) {
          const eff = syn.bonusEffect;
          if (eff.type === "REFLECT_DOUBLE") reflectPct += 100;
          if (eff.type === "COMBO_ATK_BONUS") atkMult *= (1 + (nextCombo * eff.value / 100));
          if (eff.type === "CRIT_DMG_BONUS") critDmgMult += (eff.value / 100);
          if (eff.type === "SPEED_MULTI_HIT" && Math.random() < 0.1) bonusHits += eff.value;
        }
      });

      if (Math.random() < (frontEnemy.eva - (frontEnemy.ignoreEva || 0)) / 100) {
        return { game: { ...s.game, tower: { ...t, lastTapTime: now, combo: nextCombo, lastReward: "빗나감!" } } };
      }

      const defenseMultiplier = 100 / (100 + frontEnemy.def);
      const isCrit = Math.random() < (critRate - (frontEnemy.critRes || 0)) / 100;
      const finalAtk = baseAtk * atkMult;
      let damage = Math.floor(finalAtk * defenseMultiplier * (isCrit ? critDmgMult : 1)) + (bonusDmg || 0);

      t.artifacts.forEach((art: any) => {
        const eff = art.effect;
        if (eff.type === "COMBO_DAMAGE" && nextCombo % 5 === 0) damage += baseAtk * (eff.value / 100);
        if (eff.type === "COMBO_BURST" && nextCombo % 10 === 0) {
          damage += baseAtk * eff.value;
          lastReward = "💥 연환파격 발동!";
        }
      });

      if (frontEnemy.traits.includes("피해 상한")) {
        damage = Math.min(damage, frontEnemy.maxHp * 0.1);
      }

      const finalAppliedDamage = damage * (1 + bonusHits);
      const splashCount = 1 + Math.floor(Math.random() * 3);
      const splashDamage = finalAppliedDamage * 0.4;

      const nextEnemies = [...t.enemies];
      nextEnemies[0] = { ...nextEnemies[0], hp: Math.max(0, nextEnemies[0].hp - finalAppliedDamage) };
      for (let i = 1; i < Math.min(nextEnemies.length, 1 + splashCount); i++) {
        nextEnemies[i] = { ...nextEnemies[i], hp: Math.max(0, nextEnemies[i].hp - splashDamage) };
      }

      const hasBloodMoon = (artifactTags["lifesteal"] || 0) >= 2 && TOWER_SYNERGIES.find(sy => sy.id === "BLOOD_MOON");
      if (hasBloodMoon && nextEnemies[0].hp > 0 && !nextEnemies[0].traits.includes("보스") && Math.random() < 0.1) {
        nextEnemies[0].hp = 0;
        lastReward = "🌑 핏빛 달의 심판! 즉사!";
      }

      const filteredEnemies = nextEnemies.filter(e => e.hp > 0);
      let playerHp = t.hp;
      if (lifestealPct > 0) playerHp = Math.min(t.maxHp, playerHp + finalAppliedDamage * (lifestealPct / 100));
      const totalMp = get().getTotalMp();
      const nextMp = Math.min(totalMp, s.game.mp + (totalMp * (mpRecoverPct / 100)));
      const nextKi = Math.min(100, t.kiGauge + (2 * kiGainMult));

      return {
        game: {
          ...s.game,
          lastActivityHeartbeat: now,
          mp: nextMp,
          tower: {
            ...t,
            hp: playerHp,
            combo: nextCombo,
            lastTapTime: now,
            lastReward: lastReward === t.lastReward && bonusHits > 0 ? `신법 추가타! (+${bonusHits})` : lastReward,
            enemies: filteredEnemies,
            kiGauge: nextKi
          }
        }
      };
    });
  },
  updateTower: (dt: number) => {
    const { tapTower } = get();
    const { game } = get();
    const t = game.tower;
    if (!t.isInside) return;

    const now = Date.now();
    let autoAttackCount = 0;

    set((s: any) => {
      const t = s.game.tower;
      if (!t.isInside) return s;

      // 1. Wave and Floor Progression Logic
      if (t.enemies.length === 0) {
        // Only progress if no choices are pending and not in an event room
        if (!t.pendingBuffChoices && !t.pendingArtifactChoices && !t.eventRoom) {
          if (t.currentWave < t.totalWaves) {
            // Next Wave in current floor
            const nextWave = t.currentWave + 1;
            return {
              game: {
                ...s.game,
                tower: {
                  ...t,
                  currentWave: nextWave,
                  enemies: generateTowerWave(t.currentFloor, nextWave),
                  lastReward: `제 ${nextWave}차 적군 공습!`,
                  autoAttackTimer: 0
                }
              }
            };
          } else {
            // All waves cleared -> Check for rewards/buffs before next floor
            const floor = t.currentFloor;
            const nextFloor = floor + 1;
            const highestFloor = Math.max(t.highestFloor, floor);
            const goldReward = floor * 5000;
            const fameReward = Math.floor(floor * 2.5);
            get().updateQuestProgress("tower_floor", 1);
            get().updateQuestProgress("tower_floor_milestone", floor);

            let pendingBuffs: any = null;
            let pendingArtifacts: any = null;
            let rewardMsg = `제 ${floor}층 돌파! 금화 +${goldReward.toLocaleString()}`;

            // Milestone Rewards (One-time)
            const isFirstClear = !s.game.towerFirstClearFloors.includes(floor);
            let firstClearRewards: string[] = [];
            if (isFirstClear) {
              if (floor === 10) {
                 firstClearRewards.push("명패 5개");
                 // Handled by Giru Quest usually, but let's add direct bonus if needed
              } else if (floor === 20) {
                 firstClearRewards.push("명패 5개", "연마유 상자");
              }
            }

            // Boss Drops (Every 10th floor)
            let bossDrop: OwnedWeapon | null = null;
            if (floor % 10 === 0) {
               const luck = get().getTotalLuck();
               const r = Math.random() * 100;
               let tier: ItemTier | null = null;
               if (r < 0.5) tier = "신기";
               else if (r < 2.5) tier = "국보";
               else if (r < 7.5) tier = "보구"; // 0.5 + 2 + 5

               if (tier) {
                  bossDrop = generateRandomGear(s.game.realm, 0, luck, tier);
                  rewardMsg = `✨ 희귀 보상 획득! [${tier}] ${bossDrop.name}`;
               }
            }

            // Repeat Reward: Duel Token Fragments (10% chance)
            let extraItems: any[] = [];
            if (Math.random() < 0.1) {
               extraItems.push({ icon: "🧩", name: "명패 조각", count: 1 });
            }

            if (floor % 10 === 0) {
              const pool = [...TOWER_ROGUE_BUFF_POOL].filter(b => b.tier === "신화" || b.tier === "우주" || b.tier === "최상급");
              const selected: any[] = [];
              for (let i = 0; i < 3 && pool.length > 0; i++) {
                const r = Math.floor(Math.random() * pool.length);
                selected.push(pool[r]);
                pool.splice(r, 1);
              }
              pendingArtifacts = selected;
            } else if (floor % 5 === 0) {
              pendingBuffs = generateTowerBuffs(nextFloor);
            }

            return {
              game: {
                ...s.game,
                coins: s.game.coins + goldReward,
                reputation: s.game.reputation + fameReward,
                tujeonTokenFragments: s.game.tujeonTokenFragments + (extraItems.length > 0 ? 1 : 0),
                ownedWeapons: bossDrop ? [...s.game.ownedWeapons, bossDrop] : s.game.ownedWeapons,
                towerFirstClearFloors: isFirstClear ? [...s.game.towerFirstClearFloors, floor] : s.game.towerFirstClearFloors,
                lastActivityHeartbeat: now,
                tower: {
                  ...t,
                  currentFloor: nextFloor,
                  highestFloor,
                  enemies: (pendingBuffs || pendingArtifacts) ? [] : generateTowerWave(nextFloor, 1),
                  currentWave: 1,
                  totalWaves: 3,
                  pendingBuffChoices: pendingBuffs,
                  pendingArtifactChoices: pendingArtifacts,
                  lastReward: rewardMsg,
                  autoAttackTimer: 0
                }
              }
            };
          }
        }
        return s;
      }

      // 2. Auto Attack Logic (Updates every frame)
      let nextAutoAttackTimer = t.autoAttackTimer || 0;
      autoAttackCount = 0;
      if (t.isAutoMode && t.enemies.length > 0 && !t.pendingBuffChoices && !t.pendingArtifactChoices && !t.eventRoom) {
        nextAutoAttackTimer += dt;
        let speedMult = 1.0;
        t.activeBuffs.forEach((b: any) => {
          if (b.bonus.towerSpeed) speedMult *= b.bonus.towerSpeed;
        });
        
        const interval = 0.2 / speedMult; // 200ms default (5 hits/sec)
        
        if (nextAutoAttackTimer >= interval) {
          autoAttackCount = Math.floor(nextAutoAttackTimer / interval);
          nextAutoAttackTimer %= interval;
        }
      }

      // 3. Enemy Attack Logic (1s Interval)
      const currentAtkTimer = s.towerAttackTimer || 0;
      const nextAtkTimer = currentAtkTimer + dt;

      if (nextAtkTimer >= 1.0) {
        const playerDef = get().getTotalDefense();
        const defMult = 100 / (100 + playerDef);
        const nextShieldTimer = Math.max(0, t.shieldTimer - 1.0);
        const envDmg = Math.floor(t.currentFloor * 0.3);

        // Balance: totalDamage = baseSum / numEnemies (effectively each deals 1/N damage)
        let totalEnemyDmg = 0;
        const enemyCount = t.enemies.length;
        t.enemies.forEach((e: TowerEnemy) => {
          totalEnemyDmg += Math.floor(e.atk * defMult);
        });
        
        // Apply Balance Formula (Option A)
        totalEnemyDmg = Math.floor(totalEnemyDmg / Math.max(1, enemyCount));

        // Apply buffs/penalties
        t.activeBuffs.forEach((b: any) => {
          if (b.penalty.dmgTaken) totalEnemyDmg *= b.penalty.dmgTaken;
          if (b.bonus.defBuff) totalEnemyDmg *= b.bonus.defBuff;
        });

        if (nextShieldTimer > 0) totalEnemyDmg = 0;

        let triggerShield = false;
        const shieldArt = t.artifacts.find((a: any) => a.effect.type === "SHIELD");
        if (shieldArt && nextShieldTimer <= 0 && totalEnemyDmg > 0) {
          if (Math.random() < (shieldArt.effect.chance || 10) / 100) triggerShield = true;
        }

        const shieldDuration = triggerShield ? (shieldArt.effect.value + (playerDef / 10000)) : nextShieldTimer;

        // Reflect logic
        let reflectPct = 0;
        const artifactTags: Record<string, number> = {};
        t.artifacts.forEach((art: any) => {
          (art.tags || []).forEach((tag: string) => {
            artifactTags[tag] = (artifactTags[tag] || 0) + 1;
          });
          const eff = art.effect;
          if (eff.type === "REFLECT" || eff.type === "VAJRA" || eff.type === "ABSOLUTE_DEFENSE") reflectPct += eff.value;
        });

        const nextEnemies = [...t.enemies];
        if (reflectPct > 0 && totalEnemyDmg > 0) {
          const reflectDmg = totalEnemyDmg * (reflectPct / 100);
          nextEnemies[0] = { ...nextEnemies[0], hp: Math.max(0, nextEnemies[0].hp - reflectDmg) };
        }

        const filteredEnemies = nextEnemies.filter(e => e.hp > 0);
        let nextHp = Math.max(0, t.hp - totalEnemyDmg - envDmg);
        let reward = t.lastReward;
        if (triggerShield) reward = "보호막이 발동되었습니다!";
        if (reflectPct > 50 && totalEnemyDmg > 0) reward = "공격을 반사했습니다!";

        // Survival check (Instant HP artifact)
        if (nextHp <= 0) {
          const artifact = t.artifacts.find((a: any) => a.effect.type === "INSTANT_HP");
          if (artifact) {
            nextHp = t.maxHp;
            const nextArtifacts = t.artifacts.filter((a: any) => a.id !== artifact.id);
            return {
              towerAttackTimer: 0,
              game: { ...s.game, tower: { ...t, hp: nextHp, artifacts: nextArtifacts, lastReward: "부활했습니다!", autoAttackTimer: nextAutoAttackTimer } }
            };
          }
        }

        const isDead = nextHp <= 0;
        return {
          towerAttackTimer: 0,
          game: {
            ...s.game,
            tower: {
              ...t,
              hp: nextHp,
              isInside: !isDead,
              enemies: filteredEnemies,
              shieldTimer: shieldDuration,
              autoAttackTimer: nextAutoAttackTimer,
              lastReward: isDead ? "도전 실패!" : reward
            }
          }
        };
      }

      // Default return: update timers
      return { 
        towerAttackTimer: nextAtkTimer, 
        game: { ...s.game, tower: { ...t, autoAttackTimer: nextAutoAttackTimer } } 
      };
    });

    for (let i = 0; i < autoAttackCount; i++) {
      tapTower();
    }
  },

  convertDivineItem: (id1: string, id2: string, targetBaseItem: OwnedWeapon) => {
    const { game } = get();
    const item1 = game.ownedWeapons.find(w => w.id === id1);
    const item2 = game.ownedWeapons.find(w => w.id === id2);
    
    if (!item1 || !item2 || item1.tier !== "신기" || item2.tier !== "신기") return { success: false, message: "신기 등급 아이템 2개가 필요합니다." };
    if (item1.id === item2.id) return { success: false, message: "서로 다른 아이템이어야 합니다." };

    const newItem = rollPaewangItem(targetBaseItem, 5, get().getTotalLuck(), REALM_ORDER.indexOf(game.realm));
    
    set((s: any) => ({
      game: {
        ...s.game,
        ownedWeapons: s.game.ownedWeapons.filter((w: OwnedWeapon) => w.id !== id1 && w.id !== id2).concat(newItem)
      }
    }));
    get().triggerSave(true);
    return { success: true, message: "새로운 신기 아이템으로 합성되었습니다!", item: newItem };
  },

  toggleTowerAuto: () => set((s: any) => ({
    game: {
      ...s.game,
      tower: { ...s.game.tower, isAutoMode: !s.game.tower.isAutoMode, autoAttackTimer: 0 }
    }
  })),

  useTowerComboSkill: () => {
    const { game, tapTower } = get();
    const t = game.tower;
    if (!t.isInside || t.enemies.length === 0 || t.kiGauge < 100) return;

    const frontEnemy = t.enemies[0];
    const isBoss = t.currentFloor % 10 === 0;
    const damagePercent = isBoss ? 0.1 : 0.2;
    const skillDamage = Math.floor(frontEnemy.maxHp * damagePercent);

    set((s: any) => ({
      game: {
        ...s.game,
        tower: { ...s.game.tower, kiGauge: 0, lastReward: `초식 발동! (${damagePercent * 100}% 대미지)` }
      }
    }));

    tapTower(skillDamage);
  },

  selectTowerBuff: (buff: any) => {
    set((s: any) => {
      const t = s.game.tower;
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            activeBuffs: [...t.activeBuffs, buff],
            pendingBuffChoices: null,
            enemies: generateTowerWave(t.currentFloor, 1)
          }
        }
      };
    });
  },

  handleTowerEvent: (type: "REST" | "BUFF" | "DANGER" | "MERCHANT") => {
    set((s: any) => {
      const t = s.game.tower;
      let nextHp = t.hp;
      let nextReward = t.lastReward;

      if (type === "REST") {
        nextHp = Math.min(t.maxHp, nextHp + t.maxHp * 0.3);
        nextReward = "휴식을 취해 체력을 30% 회복했습니다.";
      } else if (type === "BUFF") {
        nextReward = "특별한 기운을 받아 공격력이 일시적으로 상승합니다.";
      } else if (type === "DANGER") {
        nextHp = Math.max(1, nextHp - t.maxHp * 0.2);
        nextReward = "위험한 함정에 빠졌지만 기연을 얻었습니다.";
      } else if (type === "MERCHANT") {
        nextHp = t.maxHp;
        nextReward = "비밀 상인을 만나 비약을 마시고 체력을 모두 회복했습니다.";
      }

      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            hp: nextHp,
            eventRoom: null,
            enemies: generateTowerWave(t.currentFloor, 1),
            lastReward: nextReward
          }
        }
      };
    });
  },

  selectTowerArtifact: (art: any) => {
    set((s: any) => {
      const t = s.game.tower;
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            artifacts: [...t.artifacts, art],
            pendingArtifactChoices: null,
            enemies: generateTowerWave(t.currentFloor, 1)
          }
        }
      };
    });
  },
  toggleEquipSkill: (skillName: string) => {
    set((s: any) => {
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const isEquipped = equipped.includes(skillName);
      let nextEquipped = [...equipped];
      if (isEquipped) {
        nextEquipped = nextEquipped.filter((name: string) => name !== skillName);
      } else {
        if (nextEquipped.length >= 4) return s;
        nextEquipped.push(skillName);
      }
      return {
        game: {
          ...s.game,
          masterDuel: { ...s.game.masterDuel, equippedSkillIds: nextEquipped }
        }
      };
    });
    get().triggerSave(true);
  },

    setActiveUpgradeDesc: (desc: any) => set((s: any) => ({ game: { ...s.game, activeUpgradeDesc: desc } })),
  setUpgradeMultiplier: (m: number) => set((s: any) => ({ game: { ...s.game, upgradeMultiplier: m } })),
  setSelectedForgeItem: (itemId: string | null) => set((s: any) => ({ game: { ...s.game, selectedForgeItemId: itemId } })),
  setSelectedForgeOil: (oilId: string | null) => set((s: any) => ({ game: { ...s.game, selectedForgeOilId: oilId } })),

  setActiveTab: (tab: any) =>
    set((s: any) => {
      // Tutorial Logic
      if (s.game.tutorialProgress.isActive) {
        const { currentStepId } = s.game.tutorialProgress;
        if (tab === "quest" && currentStepId === "start_faction") {
          setTimeout(() => get().setTutorialStep("explain_quest_list"), 100);
        } else if (tab === "training" && currentStepId === "check_quest") {
          setTimeout(() => get().setTutorialStep("start_training"), 100);
        } else if (tab === "forge" && currentStepId === "forge_unlock") {
          setTimeout(() => get().setTutorialStep("buy_weapon"), 100);
        } else if (tab === "inventory" && currentStepId === "goto_inventory") {
          setTimeout(() => get().setTutorialStep("equip_weapon"), 100);
        } else if (tab === "forge" && currentStepId === "goto_forge_refine") {
          setTimeout(() => get().setTutorialStep("select_refine_tab"), 100);
          } else if (tab === "library" && currentStepId === "library_unlock") {
            setTimeout(() => get().setTutorialStep("library_cost_guide"), 100);
          } else if (tab === "tower" && currentStepId === "tower_unlock") {
            setTimeout(() => get().completeTutorialStep("tower_unlock"), 100);
          } else if (tab === "master" && currentStepId === "master_unlock") {
            setTimeout(() => get().completeTutorialStep("master_unlock"), 100);
          } else if (tab === "inn" && currentStepId === "inn_event") {
            setTimeout(() => get().completeTutorialStep("inn_event"), 100);
          } else if (tab === "training" && currentStepId === "final_back_to_training") {
            setTimeout(() => get().completeTutorialStep("final_back_to_training"), 100);
          }
      }

      // State Cleanup
      const game = s.game;
      let nextMD = { ...game.masterDuel };
      let nextTower = { ...(game.tower || {}) };
      let nextIsMini = game.isMinigameActive;

      if (tab !== "master") {
        nextMD.streakCount = 0;
        nextMD.isPlaying = false;
      }
      if (tab !== "tower") {
        nextTower.isInside = false;
      }
      if (tab !== "inn") {
        nextIsMini = false;
      }

      return {
        game: {
          ...game,
          activeTab: tab,
          showInnVictoryEffect: false,
          masterDuel: nextMD,
          tower: nextTower,
          isMinigameActive: nextIsMini
        }
      };
    }),

  visitGiru: () => {
    set((s: any) => ({ game: { ...s.game, activeTab: "giru" } }));
  },
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string }) => {
    const { game } = get();

    // --- Gift Action Special Handling ---
    if (actionId === "gift") {
      const giftId = extra?.giftId;
      if (!giftId) return { success: false, message: "선물을 선택해주세요." };

      const giftItem = GIRU_GIFT_ITEMS.find(g => g.id === giftId);
      if (!giftItem) return { success: false, message: "존재하지 않는 선물입니다." };

      if ((game.giruGifts?.[giftId] || 0) <= 0) {
        return { success: false, message: "해당 선물을 가지고 있지 않습니다." };
      }

      const npcData = GIRU_NPCS.find(n => n.id === npcId);
      const isPreferred = npcData?.preferredGifts.includes(giftId);
      const favorGain = (giftItem.bonusFavor || 5) + (isPreferred ? 10 : 0);

      set((s: any) => {
        const nextGifts = { ...(s.game.giruGifts || {}) };
        nextGifts[giftId] -= 1;
        if (nextGifts[giftId] <= 0) delete nextGifts[giftId];

        const nextFavors = { ...(s.game.npcFavors || {}) };
        nextFavors[npcId] = Math.min(300, (nextFavors[npcId] || 0) + favorGain);

        return {
          game: {
            ...s.game,
            giruGifts: nextGifts,
            npcFavors: nextFavors,
            nightLimits: {
              ...s.game.nightLimits,
              giluActionLeft: s.game.nightLimits.giluActionLeft - 1
            }
          }
        };
      });

      get().triggerSave(true);
      return {
        success: true,
        message: isPreferred
          ? `${npcData?.name}님이 선물을 매우 기뻐하며 받습니다! (호감도 +${favorGain})`
          : `${npcData?.name}님에게 선물을 주었습니다. (호감도 +${favorGain})`
      };
    }

    const action = GIRU_ACTIONS.find(a => a.id === actionId);
    if (!action) return { success: false, message: "잘못된 요청입니다." };

    // 밤 행동 제한 체크
    const limits = game.nightLimits || { giluActionLeft: 5, npcTalkCount: {}, infoTradeUsed: false };

    if (limits.giluActionLeft <= 0) {
      return { success: false, message: "오늘 밤에는 더 이상 월향루에서 시간을 보낼 수 없습니다." };
    }

    if (actionId === "info" && limits.infoTradeUsed) {
      return { success: false, message: "정보 거래는 하룻밤에 한 번만 가능합니다." };
    }

    const talkCount = (limits.npcTalkCount && limits.npcTalkCount[npcId]) || 0;
    if (actionId === "talk" && talkCount >= 2) {
      return { success: false, message: "이 NPC와는 오늘 밤 충분히 대화를 나눴습니다." };
    }

    let actualCost = action.cost;
    if (actionId === "info") {
      const tier = extra && (extra as any).infoTier ? (extra as any).infoTier : "low";
      actualCost = getInfoTierCost(tier);
    }
    
    if (game.coins < actualCost) return { success: false, message: "금전이 부족합니다." };

    const npcEvents = GIRU_EVENTS.filter(e => e.npcId === npcId && e.action === actionId);
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const possibleEvents = npcEvents.filter(e => {
      if (!e.condition) return true;
      if (e.condition.favorMin && favor < e.condition.favorMin) return false;
      return true;
    });

    if (possibleEvents.length === 0) {
      set((s: any) => {
        const nextFavors = { ...s.game.npcFavors };
        const gainedFavor = (action.favor || 0);
        nextFavors[npcId] = (nextFavors[npcId] || 0) + gainedFavor;

        const nextLimits = {
          ...s.game.nightLimits,
          giluActionLeft: s.game.nightLimits.giluActionLeft - 1,
          infoTradeUsed: actionId === "info" ? true : s.game.nightLimits.infoTradeUsed,
          npcTalkCount: {
            ...s.game.nightLimits.npcTalkCount,
            [npcId]: actionId === "talk" ? ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0) + 1 : ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0)
          }
        };

        let pendingReward = s.game.pendingReward;
        const claimed = s.game.giruRewardsClaimed || {};
        let nextConsumables = { ...s.game.consumables };
        let nextFragments = { ...(s.game.manualFragments || {}) };
        let nextClaimed = { ...claimed };

        // 호감도 단계별 보상 (100, 200, 300)
        [100, 200, 300].forEach(milestone => {
          const claimKey = `${npcId}_${milestone}`;
          if (nextFavors[npcId] >= milestone && !claimed[claimKey]) {
            const npcName = GIRU_NPCS.find(n => n.id === npcId)?.name || "NPC";
            const shardInfo = getRealmAppropriateShards(s.game);
            
            pendingReward = {
              title: `[호감] ${npcName}의 증표 (${milestone})`,
              items: [
                { icon: "🎁", name: "패왕의 보물상자", count: 1, color: "#ffd700" },
                { icon: shardInfo.icon, name: shardInfo.name, count: 50, color: "#ff3e3e", slotName: "재료" }
              ]
            };
            nextConsumables.paewang_box = (nextConsumables.paewang_box || 0) + 1;
            nextFragments[shardInfo.name] = (nextFragments[shardInfo.name] || 0) + 50;
            nextClaimed[claimKey] = true;
          }
        });

        return {
          game: {
            ...s.game,
            coins: s.game.coins - actualCost,
            npcFavors: nextFavors,
            nightLimits: nextLimits,
            consumables: nextConsumables,
            manualFragments: nextFragments,
            pendingReward,
            giruRewardsClaimed: nextClaimed
          }
        };
      });
      get().triggerSave(true);
      return { success: true, message: "대화를 나눴습니다." };
    }

    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

    let infoMsg = "";
    const gainedFavor = (event.result.favor || action.favor || 0);
    const nextFavors = { ...(get().game.npcFavors || {}) };
    nextFavors[npcId] = (nextFavors[npcId] || 0) + gainedFavor;

    // 호감도 단계별 보상 (100, 200, 300)
    let pendingReward = get().game.pendingReward;
    const claimed = get().game.giruRewardsClaimed || {};
    let nextClaimed = { ...claimed };
    let nextConsumables = { ...get().game.consumables };
    let nextFragments = { ...(get().game.manualFragments || {}) };

    [100, 200, 300].forEach(milestone => {
      const claimKey = `${npcId}_${milestone}`;
      if (nextFavors[npcId] >= milestone && !claimed[claimKey]) {
        const npcName = GIRU_NPCS.find(n => n.id === npcId)?.name || "NPC";
        const shardInfo = getRealmAppropriateShards(get().game);
        
        pendingReward = {
          title: `[호감] ${npcName}의 증표 (${milestone})`,
          items: [
            { icon: "🎁", name: "패왕의 보물상자", count: 1, color: "#ffd700" },
            { icon: shardInfo.icon, name: shardInfo.name, count: 50, color: "#ff3e3e", slotName: "재료" }
          ]
        };
        nextConsumables.paewang_box = (nextConsumables.paewang_box || 0) + 1;
        nextFragments[shardInfo.name] = (nextFragments[shardInfo.name] || 0) + 50;
        nextClaimed[claimKey] = true;
      }
    });

    set((s: any) => {
      const nextBuffs = [...(s.game.nightBuffs || [])];
      if (event.result.buff) {
        nextBuffs.push({
          id: event.id,
          name: event.effect,
          effect: event.result.buff,
          expiresAt: Date.now() + 30 * 60 * 1000
        });
      }

      const nextLimits = {
        ...s.game.nightLimits,
        giluActionLeft: s.game.nightLimits.giluActionLeft - 1,
        infoTradeUsed: actionId === "info" ? true : s.game.nightLimits.infoTradeUsed,
        npcTalkCount: {
          ...s.game.nightLimits.npcTalkCount,
          [npcId]: actionId === "talk" ? ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0) + 1 : ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0)
        }
      };

      let nextHp = s.game.hp;
      if (event.result.healPct) {
        const healAmt = get().getTotalHp() * (event.result.healPct / 100);
        nextHp = Math.min(get().getTotalHp(), nextHp + healAmt);
      }

      let nextMp = s.game.mp;
      if (event.result.mpHealPct) {
        const mpHealAmt = get().getTotalMp() * (event.result.mpHealPct / 100);
        nextMp = Math.min(get().getTotalMp(), nextMp + mpHealAmt);
      }

      // --- Info Trade Special Rewards ---
      let nextMaterials = s.game.advancedMaterials || 0;
      let nextBonds = { ...(s.game.factionBonds || {}) };

        // --- Info Trade Special Rewards ---
        if (actionId === "info" && extra && (extra as any).infoTier) {
          const tier = (extra as any).infoTier;
          const faction = s.game.faction || "무소속";
          
          let rivalName = "신비한 고수";
          let rivalRewards: any = {};

          let targetRealm = s.game.realm || "삼류";
          if (tier === "low") targetRealm = "이류";
          if (tier === "mid") targetRealm = "초절정";
          if (tier === "high") targetRealm = "현경";
          if (tier === "special") targetRealm = "천인합일";

          const dummyStats = getDummyStats(targetRealm, 1);
          let rivalHp = dummyStats.hp || 1000;
          let rivalAtk = dummyStats.atk || 10;
          let rivalDef = dummyStats.def || 0;
          let rivalEva = dummyStats.eva || 0;
          let rivalCritRate = 0;
          let rivalCritDmg = 150;

          // 보상용 무공 조각 결정 헬퍼
          const getFactionFragment = (grades: string[]) => {
            const possible = MARTIAL_COMPENDIUM.filter(sk => 
              (sk.factionName === faction || sk.factionName === "강호공용") && 
              grades.includes(sk.grade)
            );
            if (possible.length === 0) return "manual_fragment_common";
            const selected = possible[Math.floor(Math.random() * possible.length)];
            return `${selected.name} 조각`;
          };

          if (tier === "low") {
            rivalName = "월향루 무뢰배 대장";
            rivalHp *= 1.5; rivalAtk *= 1.2; rivalDef *= 1.2;
            const fragKey = getFactionFragment(["common"]);
            rivalRewards = {
              manualFragments: { [fragKey]: 3 },
              materials: { "standard_material": 5 },
              factionBonds: { [faction]: 1 }
            };
            infoMsg = `\n[기연] 월향루 근처에 무뢰배 대장이 나타났습니다! (${fragKey} 첩보)`;
          } else if (tier === "mid") {
            rivalName = `${faction} 배신자`;
            rivalHp *= 3.0; rivalAtk *= 1.8; rivalDef *= 1.8; rivalEva += 5;
            const fragKey = getFactionFragment(["rare", "epic"]);
            rivalRewards = {
              manualFragments: Math.random() < 0.6 ? { [fragKey]: 5 } : {},
              materials: Math.random() < 0.5 ? { "standard_material": 10 } : {},
              factionBonds: { [faction]: 1 }
            };
            infoMsg = `\n[기연] ${faction}의 기술을 훔친 배신자가 인근에 숨어들었습니다! (${fragKey} 첩보)`;
          } else if (tier === "high") {
            rivalName = "은둔 고수";
            rivalHp *= 6.0; rivalAtk *= 3.5; rivalDef *= 3.0; rivalEva += 15; rivalCritRate += 10;
            const fragKey = getFactionFragment(["epic", "legendary"]);
            rivalRewards = {
              manualFragments: Math.random() < 0.4 ? { [fragKey]: 8 } : {},
              materials: Math.random() < 0.3 ? { "standard_material": 20 } : {},
              gearFragments: Math.random() < 0.2 ? { "standard_gear_fragment": 5 } : {},
              factionBonds: { [faction]: 1 },
              insights: 50
            };
            infoMsg = `\n[기연] 소문의 은둔 고수가 강호에 모습을 드러났습니다! (${fragKey} 첩보)`;
          } else if (tier === "special") {
            rivalName = "강호의 전설";
            rivalHp *= 15.0; rivalAtk *= 8.0; rivalDef *= 8.0; rivalEva += 30; rivalCritRate += 30; rivalCritDmg += 50;
            const fragKey = getFactionFragment(["legendary", "mythic"]);
            rivalRewards = {
              manualFragments: Math.random() < 0.3 ? { [fragKey]: 12 } : {},
              materials: Math.random() < 0.2 ? { "standard_material": 30 } : {},
              gearFragments: Math.random() < 0.2 ? { "standard_gear_fragment": 10 } : {},
              divineWeaponShards: Math.random() < 0.1 ? { "standard_divine_shard": 1 } : {},
              factionBonds: { [faction]: 2 },
              insights: 100
            };
            infoMsg = `\n[기연] 전설적인 고수와 대결할 절호의 기회가 생겼습니다! (${fragKey} 첩보)`;
          }

          return {
            game: {
              ...s.game,
              coins: s.game.coins - actualCost,
              npcFavors: nextFavors,
              nightLimits: nextLimits,
              consumables: nextConsumables,
              manualFragments: nextFragments,
              pendingReward,
              giruRewardsClaimed: nextClaimed,
              masterDuel: {
                ...s.game.masterDuel,
                isPlaying: false, 
                rivalName,
                rivalHp: Math.floor(rivalHp),
                rivalMaxHp: Math.floor(rivalHp),
                rivalAtk: Math.floor(rivalAtk),
                rivalDef: Math.floor(rivalDef),
                rivalEva,
                rivalCritRate,
                rivalCritDmg,
                playerHp: get().getTotalHp(),
                playerMaxHp: get().getTotalHp(),
                rewards: rivalRewards,
                infoTier: tier,
                isGiruEncounter: true 
              }
            }
          };
        }

      if (event && event.result && event.result.token && event.result.token > 0) {
        setTimeout(() => get().addWeapon({
          id: `token_${Date.now()}`,
          name: "투전패",
          type: "material",
          count: event.result.token,
          icon: "🎴",
          slot: "materials",
          realm: s.game.realm,
          price: 5000
        }), 0);
      }

      return {
        game: {
          ...s.game,
          coins: s.game.coins - (action.cost || 0),
          hp: nextHp,
          mp: nextMp,
          npcFavors: nextFavors,
          nightBuffs: nextBuffs,
          nightLimits: nextLimits,
          consumables: nextConsumables,
          pendingReward,
          giruRewardsClaimed: nextClaimed
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: event.text + (infoMsg || ""), event };
  },

  setLowPowerMode: (enabled: boolean) => {
    set((s: any) => ({
      game: {
        ...s.game,
        options: {
          ...(s.game.options || { autoFps: true }),
          lowPowerMode: enabled,
        },
      },
    }));
    get().triggerSave(true);
  },

  setAutoFps: (enabled: boolean) =>
    set((s: any) => ({
      game: {
        ...s.game,
        options: {
          ...(s.game.options || { lowPowerMode: false }),
          autoFps: enabled,
        },
      },
    })),



  startFootworkGame: () => {
    set((s: any) => {
      const stage = s.game.footworkGame.stage || 1;
      const laneCount = stage <= 3 ? 2 : (stage <= 5 ? 3 : (stage <= 7 ? 4 : 5));
      const initialSequence: number[] = [];
      let lastLane = Math.floor(Math.random() * laneCount);
      for (let i = 0; i < 15; i++) {
        if (Math.random() < 0.4) {
          initialSequence.push(lastLane);
        } else {
          lastLane = Math.floor(Math.random() * laneCount);
          initialSequence.push(lastLane);
        }
      }

      return {
        game: {
          ...s.game,
          footworkGame: {
            ...s.game.footworkGame,
            laneCount,
            timeLeft: 30,
            maxTime: 45,
            combo: 0,
            score: 0,
            isPlaying: true,
            sequence: initialSequence,
            currentAnswer: initialSequence[0]
          }
        }
      };
    });
  },

  handleFootworkStep: (choice: number) => {
    const { game } = get();
    const fg = game.footworkGame;
    if (!fg.isPlaying) return { success: false, combo: 0, timeBonus: 0, isClear: false };

    let success = choice === fg.currentAnswer;
    let nextCombo = 0;
    let timeBonus = 0;
    let isClear = false;

    set((s: any) => {
      const currentFG = s.game.footworkGame;
      nextCombo = success ? currentFG.combo + 1 : 0;
      let nextTime = success ? Math.min(currentFG.maxTime, currentFG.timeLeft + 0.4) : Math.max(0, currentFG.timeLeft - 1.5);
      let nextScore = success ? currentFG.score + 20 : currentFG.score;

      if (success) {
        if (nextCombo > 0 && nextCombo % 10 === 0) {
          nextTime = Math.min(currentFG.maxTime, nextTime + 2.5);
          timeBonus = 2.5;
        }

        // Target hits to clear stage: scale with stage
        const targetHits = 20 + (currentFG.stage * 5);
        if (currentFG.score / 20 >= targetHits) {
          isClear = true;
        }
      }

      const generateNextLane = (prev: number, count: number) => {
        // 40% chance to repeat the same lane to create '연타' (spam) clusters
        if (Math.random() < 0.4) return prev;
        return Math.floor(Math.random() * count);
      };

      const laneCount = currentFG.laneCount;
      let nextSequence = currentFG.sequence;
      if (success) {
        const lastInSeq = currentFG.sequence[currentFG.sequence.length - 1];
        nextSequence = [...currentFG.sequence.slice(1), generateNextLane(lastInSeq, laneCount)];
      }
      const nextAnswer = nextSequence[0];

      return {
        game: {
          ...s.game,
          footworkGame: {
            ...currentFG,
            combo: nextCombo,
            timeLeft: nextTime,
            score: nextScore,
            sequence: nextSequence,
            currentAnswer: nextAnswer,
            bestCombo: Math.max(currentFG.bestCombo || 0, nextCombo),
            isPlaying: !isClear && nextTime > 0
          }
        }
      };
    });

    return { success, combo: nextCombo, timeBonus, isClear };
  },

  updateFootwork: (dt: number) => {
    set((s: any) => {
      const fg = s.game.footworkGame;
      if (!fg.isPlaying) return s;

      const nextTime = Math.max(0, fg.timeLeft - dt);
      return {
        game: {
          ...s.game,
          footworkGame: {
            ...fg,
            timeLeft: nextTime,
            isPlaying: nextTime > 0
          }
        }
      };
    });
  },
  updateTime: (dt: number) => {
    set((s: any) => {
      const { activeTab, isMinigameActive, masterDuel, tower, lastActivityHeartbeat } = s.game;
      
      // 1. 실제 시간 정지가 필요한 상황인지 엄격하게 판단
      const isHeartbeatActive = (Date.now() - (lastActivityHeartbeat || 0)) < 10000; 
      const isActuallyPlayingMinigame = isMinigameActive && activeTab === "inn" && isHeartbeatActive;
      const isActuallyInMasterDuel = masterDuel.isPlaying && activeTab === "master" && isHeartbeatActive;
      const isActuallyInTower = tower?.isInside && activeTab === "tower" && isHeartbeatActive;

      // 2. 복구 로직 변수 계산
      let nextIsMini = isMinigameActive;
      let nextMasterIsPlaying = masterDuel.isPlaying;
      let nextTowerIsInside = tower?.isInside;

      const needsRecovery = 
        (isMinigameActive && activeTab !== "inn") ||
        (masterDuel.isPlaying && activeTab !== "master") ||
        (tower?.isInside && activeTab !== "tower");

      if (needsRecovery) {
        nextIsMini = activeTab === "inn" ? isMinigameActive : false;
        nextMasterIsPlaying = activeTab === "master" ? masterDuel.isPlaying : false;
        nextTowerIsInside = (activeTab === "tower" && tower) ? tower.isInside : false;
      }

      // 3. 진짜 플레이 중인 경우 타이머 정지 (단, 복구 로직은 반영)
      if (!needsRecovery && (isActuallyPlayingMinigame || isActuallyInMasterDuel || isActuallyInTower)) {
        return s;
      }

      // 4. 시간 흐름 로직
      let nextTimeState = s.game.timeState || "day";
      let currentTR = s.game.timeRemaining;
      if (typeof currentTR !== 'number' || isNaN(currentTR)) currentTR = 300;
      
      let nextTimeRemaining = currentTR - dt;
      let nextNightLimits = s.game.nightLimits;
      let triggerSettlement = false;

      if (nextTimeRemaining <= 0) {
        if (nextTimeState === "day") {
          nextTimeState = "dusk";
          nextTimeRemaining = 60;
        } else if (nextTimeState === "dusk") {
          nextTimeState = "night";
          nextTimeRemaining = 300;
          nextNightLimits = { giluActionLeft: 5, npcTalkCount: {}, infoTradeUsed: false };
        } else if (nextTimeState === "night") {
          nextTimeState = "dawn";
          nextTimeRemaining = 60;
          triggerSettlement = true;
        } else if (nextTimeState === "dawn") {
          nextTimeState = "day";
          nextTimeRemaining = 300;
          const nextDayCount = (s.game.dayCount || 1) + 1;
          const nextEvent = s.game.nextDayEvent ? { ...s.game.nextDayEvent, isUsed: false } : null;
          
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              dayCount: nextDayCount,
              nextDayEvent: nextEvent,
              nightLimits: nextNightLimits,
              showDawnSettlement: false,
              isMinigameActive: nextIsMini,
              masterDuel: { ...s.game.masterDuel, isPlaying: nextMasterIsPlaying },
              tower: { ...s.game.tower, isInside: nextTowerIsInside }
            }
          };
        }
      }

      return {
        game: {
          ...s.game,
          timeState: nextTimeState,
          timeRemaining: nextTimeRemaining,
          nightLimits: nextNightLimits,
          showDawnSettlement: (nextTimeRemaining <= 0 && nextTimeState === "dawn") ? true : s.game.showDawnSettlement,
          isMinigameActive: nextIsMini,
          masterDuel: { ...s.game.masterDuel, isPlaying: nextMasterIsPlaying },
          tower: { ...s.game.tower, isInside: nextTowerIsInside }
        }
      };
    });
  },
  closeDawnSettlement: () => set((s: any) => ({ game: { ...s.game, showDawnSettlement: false } })),

  buyGiruInformation: (type: "TREASURE_FORECAST" | "BOSS_RAID_CLUE") => set((s: any) => {
    if (s.game.coins < 100000) return s;

    let nextEvent: any;
    if (type === "TREASURE_FORECAST") {
      const areas = ["낙양", "장안", "항주", "성도"];
      const area = areas[Math.floor(Math.random() * areas.length)];
      nextEvent = {
        type: "TREASURE_FORECAST",
        targetArea: area,
        clueText: `내일 ${area} 지역에 보물 무뢰배들이 나타날 것입니다.`,
        isUsed: false
      };
    } else {
      const bosses = ["어둠의 검객", "피의 군주", "무영객"];
      const boss = bosses[Math.floor(Math.random() * bosses.length)];
      nextEvent = {
        type: "BOSS_RAID_CLUE",
        bossId: boss,
        clueText: `내일 보스 [${boss}]의 은신처가 발견될 것입니다.`,
        isUsed: false
      };
    }

    return {
      game: {
        ...s.game,
        coins: s.game.coins - 100000,
        nextDayEvent: nextEvent,
        nightLimits: { ...s.game.nightLimits, infoTradeUsed: true }
      }
    };
  }),

  addGiruGift: (giftId: string, count: number) => set((s: any) => {
    const nextGifts = { ...(s.game.giruGifts || {}) };
    nextGifts[giftId] = (nextGifts[giftId] || 0) + count;
    if (nextGifts[giftId] <= 0) delete nextGifts[giftId];
    return { game: { ...s.game, giruGifts: nextGifts } };
  }),

  acceptQuest: (questId: string) => set((s: any) => {
    // questId might be a templateId or a uniqueId
    const questData = GIRU_QUESTS.find(q => q.id === questId) || 
                      (s.game.activeQuests || []).find((q: any) => q.id === questId); 
    
    if (!questData) return s;
    
    const baseId = questData.templateId || questData.id;
    const exists = (s.game.activeQuests || []).some((q: any) => (q.templateId || q.id) === baseId);
    if (exists) return s;

    const uniqueId = `q_${baseId}_${Date.now()}_${s.game.activeQuests?.length || 0}_${Math.floor(Math.random() * 1000)}`;

    return { 
      game: { 
        ...s.game, 
        activeQuests: [...(s.game.activeQuests || []), { ...questData, id: uniqueId, templateId: baseId, status: "active" as const }] 
      } 
    };
  }),

  completeQuest: (questId: string) => set((s: any) => {
    const quests = [...(s.game.activeQuests || [])];
    const idx = quests.findIndex(q => q.id === questId);
    if (idx === -1) return s;
    // status "rewarded" means the quest is done and reward collected
    quests[idx].status = "rewarded";
    return { game: { ...s.game, activeQuests: quests } };
  }),

  triggerGodMode: () => {
    const trillion = 1000000000000;
    set((s: any) => ({
      game: {
        ...s.game,
        coins: trillion,
        reputation: trillion,
        hp: 1000000,
        maxHp: 1000000,
        unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "upgrade", "forge", "inventory", "inn", "master", "library", "tower", "giru", "gambling", "quest"])),
      }
    }));
  },

  setTutorialStep: (stepId: string) => set((s: any) => {
    if (s.game.tutorialProgress.completedStepIds.includes(stepId)) return s;
    return {
      game: {
        ...s.game,
        tutorialProgress: {
          ...s.game.tutorialProgress,
          isActive: true,
          currentStepId: stepId
        }
      }
    };
  }),

  prevTutorialStep: () => set((s: any) => {
    const currentId = s.game.tutorialProgress.currentStepId;
    const prevMap: Record<string, string> = {
      "explain_quest_list": "start_faction",
      "check_quest": "explain_quest_list",
      "explain_mission_bar": "check_quest",
      "click_status_detailed": "explain_mission_bar",
      "explain_status_panel": "click_status_detailed",
      "explain_time_cycle": "explain_status_panel",
      "explain_night_only": "explain_time_cycle",
      "explain_auto_battle": "explain_night_only",
      "auto_training_info": "explain_auto_battle",
      "goto_forge_click": "forge_unlock",
      "buy_weapon": "goto_forge_click",
      "goto_inventory": "buy_weapon",
      "select_item_inventory": "goto_inventory",
      "click_equip_button": "select_item_inventory",
      "goto_forge_refine": "click_equip_button",
      "select_refine_tab": "goto_forge_refine",
      "select_item_to_refine": "select_refine_tab",
      "check_refine_preview": "select_item_to_refine",
      "click_refine_start": "check_refine_preview",
      "check_refine_result": "select_item_to_refine",
      "select_reroll_tab": "check_refine_result",
      "select_item_to_reroll": "select_reroll_tab",
      "check_current_options": "select_item_to_reroll",
      "click_reroll_start": "check_current_options",
      "check_reroll_result": "select_item_to_reroll",
      "select_infuse_tab": "check_reroll_result",
      "select_item_to_infuse": "select_infuse_tab",
      "select_oil": "select_item_to_infuse",
      "click_infuse_start": "select_oil",
      "check_forge_result": "select_item_to_infuse",
      "goto_inventory_final": "check_forge_result",
      "select_infused_item": "goto_inventory_final",
      "check_final_infused_options": "select_infused_item",
      "goto_craft_tab_for_potion": "check_final_infused_options",
      "select_potion_category": "goto_craft_tab_for_potion",
      "buy_hp_potion": "select_potion_category",
      "goto_inventory_potion": "buy_hp_potion",
      "select_medicine_tab": "goto_inventory_potion",
      "guide_potion_setup": "select_medicine_tab",
      "actual_final_back_to_training": "check_final_infused_options",
      "restart_training": "actual_final_back_to_training",
      "upgrade_guide_info": "upgrade_unlock",
      "upgrade_popup_any": "upgrade_guide_info",
      "upgrade_mult_10": "upgrade_popup_any",
      "upgrade_atk_gold": "upgrade_mult_10",
      "upgrade_hp_gold": "upgrade_atk_gold",
      "upgrade_tab_technique": "upgrade_hp_gold",
      "upgrade_tab_mastery": "upgrade_tab_technique",
      "upgrade_finish_goto_training": "upgrade_tab_mastery"
    };
    const prevId = prevMap[currentId];
    if (!prevId) return s;
    return { game: { ...s.game, tutorialProgress: { ...s.game.tutorialProgress, currentStepId: prevId } } };
  }),

  completeTutorialStep: (stepId: string) => set((s: any) => {
    const nextCompleted = Array.from(new Set([...s.game.tutorialProgress.completedStepIds, stepId]));
    let nextStepId = null;
    let extraState: any = {};

    const findTutorialTargetId = (game: any) => {
      return game.selectedForgeItemId || 
             game.equippedGear?.mainWeapon || 
             game.ownedWeapons.find((w: any) => w.id?.includes("tutorial") || w.name?.includes("무명철검"))?.id ||
             game.ownedWeapons[0]?.id;
    };

    if (stepId === "click_equip_button") {
      const weapons = s.game.ownedWeapons;
      if (weapons && weapons.length > 0) {
        const lastWeapon = weapons[weapons.length - 1];
        if (s.game.equippedGear?.[lastWeapon.slot] !== lastWeapon.id) {
          extraState.equippedGear = { ...s.game.equippedGear, [lastWeapon.slot]: lastWeapon.id };
          nextStepId = "goto_forge_refine";
        }
      }
    }

    if (stepId === "start_faction") nextStepId = "explain_quest_list";
    if (stepId === "explain_quest_list") nextStepId = "check_quest";
    if (stepId === "check_quest") nextStepId = "explain_mission_bar";
    if (stepId === "explain_mission_bar") nextStepId = "click_status_detailed";
    if (stepId === "click_status_detailed") nextStepId = "explain_status_panel";
    if (stepId === "explain_status_panel") nextStepId = "explain_time_cycle";
    if (stepId === "explain_time_cycle") nextStepId = "explain_night_only";
    if (stepId === "explain_night_only") nextStepId = "explain_auto_battle";
    if (stepId === "explain_auto_battle") nextStepId = "auto_training_info";
    
    if (stepId === "forge_unlock") {
      nextStepId = "goto_forge_click";
      extraState.ownedWeapons = s.game.ownedWeapons.filter((w: any) => 
        !(w.name?.includes("무명철검")) || w.id === "필부_mainWeapon_tutorial_fixed"
      );
      extraState.equippedWeaponId = s.game.equippedWeaponId?.includes("무명철검") ? null : s.game.equippedWeaponId;
      extraState.equippedGear = {
        ...s.game.equippedGear,
        mainWeapon: s.game.equippedGear?.mainWeapon?.name?.includes("무명철검") ? null : s.game.equippedGear?.mainWeapon
      };
    }

    if (stepId === "goto_forge_click") nextStepId = "buy_weapon";
    
    if (stepId === "buy_weapon") {
      nextStepId = "goto_inventory";
      const tid = "필부_mainWeapon_tutorial_fixed";
      const others = s.game.ownedWeapons.filter((w: any) => w.id !== tid && !(w.name?.includes("무명철검")));
      const item = {
        id: tid, name: "무명철검", slot: "mainWeapon", icon: "⚔️", type: "weapon", realm: "필부", tier: "보구",
        price: 5000, attackBonus: 10, description: "공격 +10", enhancement: 0,
        randomOptions: [
          { stat: "atk_pct", label: "공격력 +10%", value: 10, grade: "최상급" },
          { stat: "crit_rate", label: "치명타 확률 +4%", value: 4, grade: "최상급" }
        ]
      };
      extraState.ownedWeapons = [...others, item];
    }

    if (stepId === "goto_inventory") nextStepId = "select_item_inventory";
    if (stepId === "select_item_inventory") nextStepId = "click_equip_button";
    if (stepId === "goto_forge_refine") nextStepId = "select_refine_tab";
    if (stepId === "select_refine_tab") nextStepId = "select_item_to_refine";
    
    if (stepId === "select_item_to_refine") {
      nextStepId = "check_refine_preview";
      const tid = findTutorialTargetId(s.game);
      if (tid) { extraState.selectedForgeItemId = tid; extraState.selectedForgeItem = tid; }
    }
    if (stepId === "check_refine_preview") nextStepId = "click_refine_start";
    
    if (stepId === "click_refine_start") {
      nextStepId = "check_refine_result";
      const tid = findTutorialTargetId(s.game);
      if (tid) {
        extraState.ownedWeapons = (extraState.ownedWeapons || s.game.ownedWeapons).map((w: any) => {
          if (w.id !== tid) return w;
          const nextAtk = Math.floor((w.attackBonus || 0) * 1.15) + 5;
          const nextOptions = (w.randomOptions || []).map((o: any) => {
            const nextVal = Number(((o.value || 0) + 0.1).toFixed(1));
            const baseLabel = o.label.split(" +")[0];
            return { ...o, value: nextVal, label: `${baseLabel} +${nextVal}%` };
          });
          return { 
            ...w, 
            enhancement: (w.enhancement || 0) + 1, 
            attackBonus: nextAtk, 
            randomOptions: nextOptions,
            options: nextOptions,
            description: `공격 +${nextAtk}` 
          };
        });
      }
    }

    if (stepId === "check_refine_result") nextStepId = "select_reroll_tab";
    if (stepId === "select_reroll_tab") nextStepId = "select_item_to_reroll";
    if (stepId === "select_item_to_reroll") {
      nextStepId = "check_current_options";
      const tid = findTutorialTargetId(s.game);
      if (tid) { extraState.selectedForgeItemId = tid; extraState.selectedForgeItem = tid; }
    }
    if (stepId === "check_current_options") nextStepId = "click_reroll_start";
    
    if (stepId === "click_reroll_start") {
      nextStepId = "check_reroll_result";
      const tid = findTutorialTargetId(s.game);
      if (tid) {
        const targetW = s.game.ownedWeapons.find((w: any) => w.id === tid);
        const count = targetW?.randomOptions?.length || 2;
        // 튜토리얼 재연마 시에는 변화를 확실히 보여주기 위해 다른 옵션(치명타 피해, 생명력)이 나오도록 설정
        const pool = [
          { stat: "crit_dmg_pct", label: "치명타 피해", val: 20 }, 
          { stat: "hp_pct", label: "생명력", val: 25 },
          { stat: "atk_pct", label: "공격력", val: 10 }
        ];
        const opts = pool.slice(0, count).map(o => ({ stat: o.stat, label: `${o.label} +${o.val}%`, value: o.val, grade: "최상급" }));
        extraState.ownedWeapons = (extraState.ownedWeapons || s.game.ownedWeapons).map((w: any) => 
          w.id === tid ? { ...w, randomOptions: opts, options: opts } : w
        );
      }
    }

    if (stepId === "check_reroll_result") {
      nextStepId = "select_infuse_tab";
      extraState.consumables = { ...s.game.consumables, oil_atk_3: 1, oil_crit_3: 1, oil_thunder: 1 };
    }
    if (stepId === "select_infuse_tab") nextStepId = "select_item_to_infuse";
    if (stepId === "select_item_to_infuse") {
      nextStepId = "select_oil";
      const tid = findTutorialTargetId(s.game);
      if (tid) { extraState.selectedForgeItemId = tid; extraState.selectedForgeOilId = "oil_atk_3"; }
    }
    
    if (stepId === "click_infuse_start") {
      nextStepId = "check_forge_result";
      const tid = findTutorialTargetId(s.game);
      const oilId = s.game.selectedForgeOilId || "oil_atk_3";
      if (tid) {
        const names: any = { oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유" };
        extraState.ownedWeapons = (extraState.ownedWeapons || s.game.ownedWeapons).map((w: any) => 
          w.id === tid ? { ...w, oilEffect: { label: `${names[oilId]}: 효과 적용`, id: oilId, active: true } } : w
        );
      }
    }

    if (stepId === "check_forge_result") nextStepId = "goto_inventory_final";
    if (stepId === "goto_inventory_final") nextStepId = "select_infused_item";
    if (stepId === "select_infused_item") nextStepId = "check_final_infused_options";
    if (stepId === "check_final_infused_options") nextStepId = "goto_craft_tab_for_potion";
    if (stepId === "goto_craft_tab_for_potion") nextStepId = "select_potion_category";
    if (stepId === "select_potion_category") nextStepId = "buy_hp_potion";
    if (stepId === "buy_hp_potion") nextStepId = "goto_inventory_potion";
    if (stepId === "goto_inventory_potion") nextStepId = "select_medicine_tab";
    if (stepId === "select_medicine_tab") nextStepId = "guide_potion_setup";
    if (stepId === "guide_potion_setup") nextStepId = "actual_final_back_to_training";
    if (stepId === "actual_final_back_to_training") nextStepId = "restart_training";
    if (stepId === "restart_training") {
      nextStepId = null;
      setTimeout(() => {
  set((s: any) => ({
    game: {
      ...s.game,
      isMinigameActive: true,
    },
  }));
        // 튜토리얼 완전 종료
        set((s: any) => ({
          game: {
            ...s.game,
            tutorialProgress: {
              ...s.game.tutorialProgress,
              isActive: false,
              currentStepId: "",
            },
          },
        }));
      }, 100);
    }

    if (stepId === "upgrade_unlock") nextStepId = "upgrade_guide_info";
    if (stepId === "upgrade_guide_info") nextStepId = "upgrade_popup_any";
    if (stepId === "upgrade_popup_any") {
      nextStepId = "upgrade_mult_10";
      setTimeout(() => { get().setActiveUpgradeDesc(null); get().setUpgradeMultiplier(1); }, 50);
    }
    if (stepId === "upgrade_mult_10") { nextStepId = "upgrade_atk_gold"; get().setUpgradeMultiplier(10); }
    if (stepId === "upgrade_atk_gold") { nextStepId = "upgrade_hp_gold"; get().upgradeStatMulti('atk', 10, 'gold'); }
    if (stepId === "upgrade_hp_gold") { nextStepId = "upgrade_tab_technique"; get().upgradeStatMulti('hpRec', 10, 'gold'); }
    if (stepId === "upgrade_tab_technique") nextStepId = "upgrade_tab_mastery";
    if (stepId === "upgrade_tab_mastery") nextStepId = "upgrade_finish_goto_training";
    if (stepId === "upgrade_finish_goto_training") { nextStepId = null; setTimeout(() => { get().setActiveTab("training"); }, 100); }
    
    if (stepId === "library_unlock") nextStepId = "library_cost_guide";
    if (stepId === "library_cost_guide") nextStepId = "library_complete";
    if (stepId === "library_complete") { nextStepId = null; setTimeout(() => { get().setActiveTab("training"); }, 100); }

    const isLast = stepId === "auto_training_info" || stepId === "restart_training" || stepId === "upgrade_finish_goto_training" || stepId === "trance_achieved" || stepId === "library_complete" || stepId === "tower_unlock" || stepId === "master_unlock" || stepId === "inn_event";
    
    return {
      game: {
        ...s.game,
        ...extraState,
        hasStarted: isLast ? true : s.game.hasStarted,
        tutorialProgress: {
          ...s.game.tutorialProgress,
          isActive: !isLast,
          currentStepId: isLast ? null : nextStepId || s.game.tutorialProgress.currentStepId,
          completedStepIds: nextCompleted
        }
      }
    };
  }),
}));

export function shouldPauseHeavyLoop() {
  if (typeof document === 'undefined') return false;
  return document.hidden;
}

export function getBatteryInterval(normal: number, low: number) {
  const game = useGameStore.getState().game;
  return game.options?.lowPowerMode ? low : normal;
}
