"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType, CombatAnalysis, CombatLogEntry, CombatLogSource, NextDayEvent, Quest } from "./types";
import { FACTIONS } from "./factions";
import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS, GIRU_GIFT_ITEMS, GIRU_QUESTS, ROGUE_QUEST_REWARDS, getNextAdaptiveQuests } from "./nightSystem";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, SYNERGY_CONFIG, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions, rollPaewangItem, getEnhancementMultiplier, FORGE_ITEMS, generateRandomGear, SET_GROUPS } from "./items";
import { getMovementBuff } from "./movementLogic";
import {
  ensureLearnedSkill,
  refineLearnedSkill,
  getRefineWisdomCost,
  getRefineGoldCost,
  canSynthesize,
  MARTIAL_COMPENDIUM,
  getRefineBonusMultiplier
} from "./martialArtsSystem";
import { MARTIAL_SYNTHESIS_RECIPES } from "./martialArtsRecipes";
import { saveGameToFirebase, loadGameFromFirebase } from "@/lib/gameSave";
import { supabase } from "@/lib/supabaseClient";


export function formatCompactNumber(num: number): string {
  if (num < 0) return "0";
  if (num < 10000) return Math.floor(num).toLocaleString();
  if (num < 100000000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, "") + "留?;
  }
  if (num < 1000000000000) {
    return (num / 100000000).toFixed(1).replace(/\.0$/, "") + "??;
  }
  if (num < 10000000000000000) {
    return (num / 1000000000000).toFixed(1).replace(/\.0$/, "") + "議?;
  }
  return (num / 10000000000000000).toFixed(1).replace(/\.0$/, "") + "寃?;
}

export const REALM_SETTINGS: Record<string, any> = {
  ?꾨?: { bonus: 1.0, minTouches: 0, dummyHp: 300, dummyType: "straw", label: "?≪? 吏싲뜑誘?, hp: 150, mp: 300, goldMultiplier: 1 },
  ?쇰쪟: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: "straw", label: "留먮씪鍮꾪??댁쭊 吏싲뜑誘?, hp: 300, mp: 800, goldMultiplier: 3 },
  ?대쪟: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: "wood", label: "?듬굹臾?紐⑹씤", hp: 600, mp: 2000, goldMultiplier: 8 },
  ?쇰쪟: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: "leather", label: "媛二?紐⑷꺽??, hp: 1200, mp: 5000, goldMultiplier: 20 },
  ?덉젙: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: "iron", label: "泥?컯泥?紐⑹씤", hp: 2500, mp: 12000, goldMultiplier: 50 },
  珥덉젅?? { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: "spirit", label: "湲곗슫 ?쒕┛ 紐⑷꺽??, hp: 5000, mp: 30000, goldMultiplier: 150 },
  ?붽꼍: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: "master", label: "?붽꼍???섏쁺", hp: 12000, mp: 70000, goldMultiplier: 400 },
  ?꾧꼍: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: "legend", label: "?꾧꼍???꾩꽕", hp: 25000, mp: 150000, goldMultiplier: 1000 },
  ?앹궗寃? { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: "life-death", label: "?앹궗??臾명꽦", hp: 50000, mp: 400000, goldMultiplier: 2500 },
  ?좏솕寃? { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: "myth", label: "?좏솕???뺤긽", hp: 120000, mp: 1000000, goldMultiplier: 7000 },
  泥쒖씤?⑹씪: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: "heaven", label: "泥쒖씤?⑹씪??寃쎌?", hp: 300000, mp: 3000000, goldMultiplier: 20000 },
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

export const REALM_ORDER = ["?꾨?", "?쇰쪟", "?대쪟", "?쇰쪟", "?덉젙", "珥덉젅??, "?붽꼍", "?꾧꼍", "?앹궗寃?, "?좏솕寃?, "泥쒖씤?⑹씪"];

export const STAT_UPGRADE_CONFIG: Record<string, { name: string; resources: string[] }> = {
  hpRec: { name: "?앸챸??, resources: ["gold"] },
  hpRecovery: { name: "?ъ깮", resources: ["gold"] },
  mpRec: { name: "?닿났", resources: ["gold"] },
  atk: { name: "怨듦꺽??, resources: ["gold"] },
  def: { name: "諛⑹뼱??, resources: ["gold"] },
  critRate: { name: "移섎챸? ?뺣쪧", resources: ["gold", "reputation"] },
  critDmg: { name: "移섎챸? ?쇳빐", resources: ["gold", "reputation"] },
  eva: { name: "?뚰뵾??, resources: ["gold", "reputation"] },
  luck: { name: "湲곗슫/?됱슫", resources: ["gold", "reputation"] },
  autoGain: { name: "?섎젴 ?⑥쑉", resources: ["gold", "reputation"] },
  offlineLimit: { name: "?섎젴 ?쒓컙", resources: ["gold", "reputation"] },
};

export const STAT_INCREMENTS: Record<string, number> = {
  atk: 250,
  def: 250,
  hpRec: 2500,
  hpRecovery: 10,
  mpRec: 100,
  critRate: 0.001,
  critDmg: 1,
  eva: 0.001,
  luck: 0.00001,
  autoGain: 0.01,
  offlineLimit: 0.5,
};

export const TUTORIAL_STEPS: Record<string, any> = {
  start_faction: {
    id: "start_faction",
    title: "媛뺥샇 ?낆꽦",
    message: "臾명뙆瑜??좏깮?섍퀬 媛뺥샇??諛쒖쓣 ?ㅼ??듬땲?? 癒쇱? [?꾨Т] ??쓣 ?뺤씤?섏뿬 ?욎쑝濡쒖쓽 諛⑺뼢???≪쑝?몄슂.",
    targetId: "nav-quest",
    actionType: "click"
  },
  check_quest: {
    id: "check_quest",
    title: "?꾨Т ?뺤씤",
    message: "?꾨Т瑜??섑뻾?섍퀬 媛뺥빐?몄꽌 媛뺥샇???대쫫???좊━?몄슂. ?댁젣 ?섎젴?μ쑝濡??대룞?⑹떆??",
    targetId: "nav-training",
    actionType: "click"
  },
  explain_quest_list: {
    id: "explain_quest_list",
    title: "?꾨Т ?곸꽭",
    message: "?꾨Т ?댁슜怨?蹂댁긽 ?댁뿭???닿납?먯꽌 ?뺤씤?????덉뒿?덈떎. 泥?踰덉㎏ ?꾨Т??'?덉닔?꾨퉬 100留덈━ 泥섏튂'瑜??뺤씤?섍퀬 ?섎젴?μ쑝濡??대룞?대큶?쒕떎.",
    targetId: "quest-item-first",
    actionType: "any"
  },
  start_training: {
    id: "start_training",
    title: "湲곗큹 ?섎젴",
    message: "?섎젴?μ뿉???덉닔?꾨퉬瑜?泥섏튂?섏뿬 源⑤떖?뚯쓣 ?살쑝?몄슂. ?붾㈃???곗튂??怨듦꺽?????덉뒿?덈떎.",
    targetId: "training-area",
    actionType: "click"
  },
  explain_mission_bar: {
    id: "explain_mission_bar",
    title: "?꾨Т 諛??곹깭 ?뺤씤",
    message: "?섎떒???꾨Т ?ъ떆李쎌뿉?쒕뒗 ?꾩옱 吏꾪뻾以묒씤 ?꾨Т瑜??뺤씤?????덉뒿?덈떎. ?곷떒? ?곹깭瑜?諛붾줈 ?뺤씤?????덈뒗 李쎌엯?덈떎. ?쒖꽌??湲덊솕,紐낆꽦,?섎젴移?怨듦꺽?μ엯?덈떎.",
    targetId: "player-status-button",
    actionType: "any"
  },
  click_status_detailed: {
    id: "click_status_detailed",
    title: "?곹깭李??뺤씤",
    message: "?곹깭李?踰꾪듉???뚮윭 ?곸꽭 ?뺣낫瑜??뺤씤?섏꽭??",
    targetId: "player-status-button",
    actionType: "click"
  },
  explain_status_panel: {
    id: "explain_status_panel",
    title: "?깆랬???곸꽭",
    message: "媛쒖씤 ?λ젰移섏? ?꾪닾?? 洹몃━怨??ㅼ쓬 源⑤떖??寃쎌?)源뚯????곸꽭???뺣낫瑜??뺤씤?????덉뒿?덈떎.",
    targetId: null,
    actionType: "any"
  },
  auto_training_info: {
    id: "auto_training_info",
    title: "?먮룞 ?섎젴 ?덈궡",
    message: "珥덈떦 5踰덉쓽 ?먮룞 ?섎젴??吏꾪뻾 以묒엯?덈떎. 寃쎌?媛 ?믪븘吏덉닔濡??덉닔?꾨퉬???앸챸?λ룄 ?믪븘吏?? 吏곸젒 ?곗튂?댁빞 ??鍮⑤━ 媛뺥빐吏????덉뒿?덈떎!",
    targetId: "training-area",
    actionType: "any"
  },
  explain_time_cycle: {
    id: "explain_time_cycle",
    title: "?쒓컙???먮쫫",
    message: "?섎（????5遺? 洹몃━怨??⑺샎(1遺? 洹몃━怨?諛?5遺? 洹몃━怨??덈꼍(1遺??쇰줈 ?뚯븘媛묐땲??",
    targetId: "time-status-bar",
    actionType: "any"
  },
  explain_night_only: {
    id: "explain_night_only",
    title: "諛ㅼ쓽 ?쒕룞",
    message: "湲곕（? ?꾨컯? 諛ㅼ뿉留??댁슜?????덉뒿?덈떎.",
    targetId: "nav-giru",
    actionType: "any"
  },

  explain_auto_battle: {
    id: "explain_auto_battle",
    title: "?먮룞 ?꾪닾",
    message: "?먮룞 ?꾪닾(?섎젴)??吏곸젒 ?곗튂?섏? ?딆븘??吏?띿쟻?쇰줈 ?깆옣???꾩?以띾땲??",
    targetId: "training-area",
    actionType: "any"
  },
  trance_achieved: {
    id: "trance_achieved",
    title: "臾댁븘吏寃?吏꾩엯",
    message: "異뺥븯?⑸땲?? 臾댁븘吏寃??곹깭?먯꽌??怨듦꺽?μ씠 10諛곕줈 ?곸듅?⑸땲?? ??鍮좊Ⅴ寃??덉닔?꾨퉬瑜?泥섎떒?섏꽭??",
    targetId: null,
    actionType: "any"
  },
  forge_unlock: {
    id: "forge_unlock",
    title: "??κ컙 媛쒕갑",
    message: "?덉닔?꾨퉬 30踰?泥섏튂 蹂댁긽?쇰줈 [??κ컙]???대졇?듬땲?? ?λ퉬瑜?留덈젴?섏뿬 ??媛뺥빐吏??쒓컙?낅땲??",
    targetId: null,
    actionType: "any"
  },
  goto_forge_click: {
    id: "goto_forge_click",
    title: "??κ컙 ?대룞",
    message: "臾대┝? ?꾪뿕??怨녹엯?덈떎. ?먯떊??蹂댄샇?섍퀬 媛뺥솕?섍린 ?꾪븳 ?꾩닔 ?μ냼?낅땲??",
    targetId: "nav-forge",
    actionType: "click"
  },
  buy_weapon: {
    id: "buy_weapon",
    title: "?λ퉬 援ъ엯",
    message: "癒쇱? [臾대챸泥좉?]??援ъ엯?섏꽭?? ?쒗넗由ъ뼹 吏꾪뻾???꾪빐 ?밸퀎??[紐낇뭹] ?깃툒???λ퉬媛 以鍮꾨맆 寃껋엯?덈떎.",
    targetId: "forge-buy-weapon-?꾨?_mainWeapon",
    actionType: "click"
  },
  goto_inventory: {
    id: "goto_inventory",
    title: "媛諛??뺤씤",
    message: "?λ퉬瑜??뚮윭??援ъ엯???λ퉬瑜?李⑹슜?섎윭 媛묐땲??",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_item_inventory: {
    id: "select_item_inventory",
    title: "?꾩씠???좏깮",
    message: "諛⑷툑 援ъ엯??臾닿린瑜??좏깮?섏꽭??",
    targetId: "inv-item-list-first",
    actionType: "click"
  },
  click_equip_button: {
    id: "click_equip_button",
    title: "?μ갑?섍린",
    message: "[?μ갑?섍린] 踰꾪듉???뚮윭 臾닿린瑜?李⑹슜?⑸땲??",
    targetId: "inv-equip-btn",
    actionType: "click"
  },
  goto_forge_refine: {
    id: "goto_forge_refine",
    title: "?λ퉬 ?쒕젴 ?좊룄",
    message: "?댁젣 ?λ퉬瑜??쒕젴?섏뿬 ?깅뒫??洹뱁븳?쇰줈 ?뚯뼱?щ젮 遊낆떆?? ?ㅼ떆 ??κ컙?쇰줈 ?대룞?섏꽭??",
    targetId: "nav-forge",
    actionType: "click"
  },
  select_refine_tab: {
    id: "select_refine_tab",
    title: "?λ퉬 ?쒕젴",
    message: "[?λ퉬 ?쒕젴] 硫붾돱瑜??좏깮?섏꽭??",
    targetId: "forge-main-tab-enhance",
    actionType: "click"
  },
  select_item_to_refine: {
    id: "select_item_to_refine",
    title: "????좏깮",
    message: "?쒕젴???꾩씠???꾩옱 李⑹슜 以묒씤 臾닿린)???좏깮?섏꽭??",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  check_refine_preview: {
    id: "check_refine_preview",
    title: "媛뺥솕 ?섏튂 ?뺤씤",
    message: "?λ퉬瑜??쒕젴?섎㈃ 怨듦꺽?μ쓣 ?ы븿??湲곕낯 ?λ젰移섍? ?ш쾶 ?곸듅?⑸땲?? ?꾩옱 ?섏튂? ?쒕젴 ???덉긽 ?섏튂瑜??뺤씤?대낫?몄슂.",
    targetId: "forge-refine-stat-preview",
    actionType: "any"
  },
  click_refine_start: {
    id: "click_refine_start",
    title: "?쒕젴 ?쒖옉",
    message: "[?쒕젴 ?쒖옉]???뚮윭 ?λ퉬瑜?媛뺥솕?⑸땲?? 怨듦꺽?μ씠 ?곸듅?⑸땲??",
    targetId: "forge-refine-start-btn",
    actionType: "click"
  },
  check_refine_result: {
    id: "check_refine_result",
    title: "?쒕젴 寃곌낵 ?뺤씤",
    message: "?쒕젴???깃났?섏뿬 ?λ퉬??媛뺥솕 ?섏튂媛 ?곸듅?덉뒿?덈떎! +1媛뺣떦 ?λ퉬??湲곕낯 ?λ젰移섍? 10%??以묒꺽?섏뼱 利앷??⑸땲?? ?댁젣 ??媛뺣젰?댁쭊 怨듦꺽?μ쓣 ?뺤씤?대낫?몄슂.",
    targetId: "forge-info-box-header",
    actionType: "any"
  },
  select_reroll_tab: {
    id: "select_reroll_tab",
    title: "?ъ뿰留??좏깮",
    message: "?ㅼ쓬? [?ъ뿰留??낅땲?? ?λ퉬???④낵瑜?臾댁옉?꾨줈 ?덈∼寃?蹂寃쏀븷 ???덉뒿?덈떎.",
    targetId: "forge-tab-reroll",
    actionType: "click"
  },
  select_item_to_reroll: {
    id: "select_item_to_reroll",
    title: "????좏깮",
    message: "?ъ뿰留덊븷 ?꾩씠?쒖쓣 ?ㅼ떆 ?쒕쾲 ?좏깮?댁＜?몄슂.",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  check_current_options: {
    id: "check_current_options",
    title: "?꾩옱 ?듭뀡 ?뺤씤",
    message: "?ъ뿰留덈? ?섍린?? ?꾩옱 ?λ퉬??遺?щ맂 ?듭뀡?ㅼ쓣 ?뺤씤?대낫?몄슂. ?좎??섍퀬 ?띠? ?듭뀡???덈떎硫??놁뿉 諛뺤뒪瑜?泥댄겕?섎㈃ 洹??듭뀡? ?좎??⑸땲??",
    targetId: "forge-item-options-list",
    actionType: "any"
  },
  click_reroll_start: {
    id: "click_reroll_start",
    title: "?ъ뿰留??ㅽ뻾",
    message: "[?ъ뿰留??쒖옉] 踰꾪듉???뚮윭 ?덈줈???듭뀡???띾뱷?대낫?몄슂.",
    targetId: "forge-reroll-start-btn",
    actionType: "click"
  },
  check_reroll_result: {
    id: "check_reroll_result",
    title: "?ъ뿰留?寃곌낵 ?뺤씤",
    message: "?ъ뿰留덈? ?듯빐 ?λ퉬???덈줈???듭뀡?ㅼ씠 遺?щ릺?덉뒿?덈떎! ?대뼡 ?④낵?ㅼ씠 異붽??섏뿀?붿? ?뺤씤?대낫?몄슂.",
    targetId: "forge-item-options-list",
    actionType: "any"
  },
  select_infuse_tab: {
    id: "select_infuse_tab",
    title: "?곕쭏 ???좏깮",
    message: "留덉?留됱쑝濡?[?곕쭏]?낅땲?? ?뱀닔 ?щ즺??湲곕쫫??諛쒕씪 ?λ퉬???밸퀎???④낵瑜?遺?ы빀?덈떎.",
    targetId: "forge-tab-infuse",
    actionType: "click"
  },
  select_item_to_infuse: {
    id: "select_item_to_infuse",
    title: "????좏깮",
    message: "?곕쭏???꾩씠?쒖쓣 ?좏깮?섏꽭??",
    targetId: "forge-refine-target-slot",
    actionType: "click"
  },
  select_oil: {
    id: "select_oil",
    title: "?곕쭏???좏깮",
    message: "怨듦꺽?μ쓣 ????믪뿬二쇰뒗 [愿묓룺?? ??2醫낆쓣 誘몃━ 吏湲됲빐?쒕졇?듬땲?? 愿묓룺?좊? ?뚮윭 ?곕쭏?섏꽭??",
    targetId: "forge-oil-item-oil_atk_3",
    actionType: "click"
  },
  click_infuse_start: {
    id: "click_infuse_start",
    title: "?곕쭏 ?쒖옉",
    message: "[?곕쭏?섍린] 踰꾪듉???뚮윭 臾닿린???④낵瑜??곸슜?⑸땲??",
    targetId: "forge-infuse-start-btn",
    actionType: "click"
  },
  check_forge_result: {
    id: "check_forge_result",
    title: "?곕쭏 ?꾨즺",
    message: "?곕쭏?쒓? 臾닿린???깃났?곸쑝濡??ㅻŉ?ㅼ뿀?듬땲?? ?댁젣 ?섎떒??[?λ퉬] ??쓣 ?뚮윭 ?④낵瑜??뺤씤?대낵源뚯슂?",
    targetId: "nav-inventory",
    actionType: "click"
  },
  goto_inventory_final: {
    id: "goto_inventory_final",
    title: "?λ퉬 ?뺤씤",
    message: "[?λ퉬] ??쑝濡??대룞?섏뿬 ?꾩씠?쒖쓣 ?뺤씤?⑸땲??",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_infused_item: {
    id: "select_infused_item",
    title: "?꾩씠???대┃",
    message: "?곕쭏??臾닿린瑜??대┃?섏뿬 ?곸꽭 ?뺣낫瑜??뺤씤?섏꽭??",
    targetId: "inv-item-list-first",
    actionType: "click"
  },
  check_final_infused_options: {
    id: "check_final_infused_options",
    title: "?④낵 ?곸슜 ?뺤씤",
    message: "?꾩씠???ㅻ챸 ?섎떒??[愿묓룺?? ?④낵媛 ?곸슜??寃껋씠 蹂댁씠?쒕굹?? ?댁젣 ?ㅼ떆 媛뺥빐吏??곹깭濡??섎젴???쒖옉?⑹떆?? ?섎떒??[?섎젴] ??쓣 ?대┃?섏꽭??",
    targetId: "nav-training",
    actionType: "click"
  },
  actual_final_back_to_training: {
    id: "actual_final_back_to_training",
    title: "?섎젴 蹂듦?",
    message: "[?섎젴] ??쓣 ?뚮윭 硫붿씤 ?붾㈃?쇰줈 ?뚯븘媛묐땲??",
    targetId: "main-nav-training",
    actionType: "click"
  },
  restart_training: {
    id: "restart_training",
    title: "?섎젴 ?ш컻",
    message: "?댁젣 [?섎젴 ?쒖옉] 踰꾪듉???뚮윭 ?ㅼ떆 媛뺥빐吏??쒓컙?낅땲??",
    targetId: "training-start-btn",
    actionType: "click"
  },
  select_potion_category: {
    id: "select_potion_category",
    title: "?뚮났???좏깮",
    message: "??κ컙?먯꽌??臾닿린肉먮쭔 ?꾨땲???뚮났?쒕룄 ?쒖옉?????덉뒿?덈떎. [?뚮났?? 移댄뀒怨좊━瑜??좏깮?섏꽭??",
    targetId: "forge-realm-?뚮났??,
    actionType: "click"
  },
  buy_hp_potion: {
    id: "buy_hp_potion",
    title: "?뚮났??援ъ엯",
    message: "?앹〈???꾩닔?곸씤 [?앸챸???뚮났????]瑜?援ъ엯??遊낆떆??",
    targetId: "forge-buy-potion-potion_hp_1",
    actionType: "click"
  },
  goto_inventory_potion: {
    id: "goto_inventory_potion",
    title: "?λ퉬???대룞",
    message: "援ъ엯??臾쇱빟???μ갑?섎윭 ?ㅼ떆 媛諛??λ퉬) ??쑝濡??대룞?⑸땲??",
    targetId: "nav-inventory",
    actionType: "click"
  },
  select_medicine_tab: {
    id: "select_medicine_tab",
    title: "?됰궘 ?좏깮",
    message: "?뚮え?덉쓣 ?뺤씤?????덈뒗 [?됰궘] 硫붾돱瑜??좏깮?섏꽭??",
    targetId: "inv-slot-medicine",
    actionType: "click"
  },
  guide_potion_setup: {
    id: "guide_potion_setup",
    title: "臾쇱빟 ?μ갑",
    message: "?뚰삎?뚮났?쒕? 袁??뚮윭???꾨옒??[臾쇱빟 ?μ갑] ?щ’?쇰줈 ?뚯뼱???볦쑝硫??μ갑?⑸땲?? ?寃????먮룞?쇰줈 ?ъ슜?섏뼱 ?앹〈???뺤뒿?덈떎.",
    targetId: "inv-medicine-item-first",
    secondTargetId: "inv-quick-slot-0",
    actionType: "any"
  },

  upgrade_unlock: {
    id: "upgrade_unlock",
    title: "媛뺥솕 媛쒕갑",
    message: "?덉닔?꾨퉬 50踰?泥섏튂 蹂댁긽?쇰줈 [媛뺥솕]媛 ?대졇?듬땲?? ?띾뱷??湲덊솕? 紐낆꽦?쇰줈 ?λ젰移섎? ?곴뎄???곸듅?쒗궎?몄슂.",
    targetId: "nav-upgrade",
    actionType: "click"
  },
  upgrade_guide_info: {
    id: "upgrade_guide_info",
    title: "?곸꽭 ?뺣낫 ?뺤씤",
    message: "媛???ぉ???꾨Ⅴ硫?洹?臾닿났??媛吏?源딆? ?산낵 ?먯꽭???뺣낫瑜?蹂????덉뒿?덈떎. [怨듦꺽?? ??ぉ???뚮윭蹂댁꽭??",
    targetId: "upgrade-item-atk",
    actionType: "click"
  },
  upgrade_popup_any: {
    id: "upgrade_popup_any",
    title: "?뺣낫 ?뺤씤 ?꾨즺",
    message: "?λ젰???ㅻ챸???뺤씤?섏뀲?섏슂? ?ㅻ챸李쎌쓣 ?뚮윭 ?リ퀬 ?섎젴??怨꾩냽?섏꽭??",
    targetId: "upgrade-description-popup",
    actionType: "click"
  },
  upgrade_mult_10: {
    id: "upgrade_mult_10",
    title: "?섎젴??媛??,
    message: "???④퀎???ㅻⅤ???섎젴?쇰줈??遺議깊빀?덈떎. ?댁젣 ??踰덉뿉 10?④퀎???깆옣???띾룄瑜??뚯뼱?щ젮 蹂댁떗?쒖삤. [x10]???좏깮?섏꽭??",
    targetId: "upgrade-mult-10",
    actionType: "click"
  },
  upgrade_atk_gold: {
    id: "upgrade_atk_gold",
    title: "怨듦꺽??媛뺥솕",
    message: "?⑥쑉??洹밸??붾릺?덉쑝?? ?댁젣 怨듦꺽?μ쓣 ????곸듅?쒗궗 李⑤??낅땲?? [怨듦꺽?? 媛뺥솕 踰꾪듉???뚮윭蹂댁꽭??",
    targetId: "upgrade-btn-atk-gold",
    actionType: "click"
  },
  upgrade_hp_gold: {
    id: "upgrade_hp_gold",
    title: "?앸챸??媛뺥솕",
    message: "媛뺤씤???≪껜??臾댁씤??洹쇰낯?낅땲?? [?앸챸????媛뺥솕?섏뿬 ?딆엫?녿뒗 ?寃⑹뿉??援댄븯吏 ?딅뒗 ?좎껜瑜?留뚮뱶?몄슂.",
    targetId: "upgrade-btn-hpRec-gold",
    secondTargetId: "upgrade-mult-10",
    actionType: "click"
  },
  upgrade_tab_technique: {
    id: "upgrade_tab_technique",
    title: "?ы솕 ?곕쭏",
    message: "湲곗큹瑜???븯?ㅻ㈃ ?댁젣 蹂移숈쟻??臾닿났???듯옄 李⑤??낅땲?? [?ы솕 ?곕쭏] ??쓣 ?뚮윭 移섎챸?? ?뚰뵾 ?깆쓽 ?좊쵖??湲곗닠?ㅼ쓣 ?뺤씤?섏꽭??",
    targetId: "upgrade-tab-technique",
    actionType: "click"
  },
  upgrade_tab_mastery: {
    id: "upgrade_tab_mastery",
    title: "泥쒕챸 鍮꾩쟾",
    message: "吏꾩젙??怨좎닔???섎뒛???살쓣 ?쎈뒗 踰뺤엯?덈떎. [泥쒕챸 鍮꾩쟾]?먯꽌 媛뺥샇??湲곗뿰怨??섑뻾???⑥쑉??洹뱁븳?쇰줈 ?뚯뼱?щ━??踰뺤쓣 諛곗슦?몄슂.",
    targetId: "upgrade-tab-mastery",
    actionType: "click"
  },
  upgrade_finish_goto_training: {
    id: "upgrade_finish_goto_training",
    title: "?섎젴 ?ш컻",
    message: "?섍낏?덊깭??湲곗뿰???살뼱 湲곕㎘???ル졇?쇰땲, ?댁젣 臾대룄??洹뱀쓽瑜??ν빐 ?뺤쭊???뚯엯?덈떎. ?붿슧 媛뺤꽦?댁쭊 ?좊쾿怨??닿났?쇰줈 泥쒗븯?쒖씪???ν븳 ?섎젴???댁뼱媛??떆??",
    actionType: "any"
  },
  tower_unlock: {
    id: "tower_unlock",
    title: "臾댄븳????,
    message: "?덉닔?꾨퉬 100踰?泥섏튂 蹂댁긽?쇰줈 [?????대졇?듬땲?? ?먯떊???쒓퀎瑜??쒗뿕?섍퀬 蹂댁긽???띾뱷?섏꽭??",
    targetId: "nav-tower",
    actionType: "click"
  },
  master_unlock: {
    id: "master_unlock",
    title: "怨좎닔????寃?,
    message: "?덉닔?꾨퉬 150踰?泥섏튂 蹂댁긽?쇰줈 [?寃????대졇?듬땲?? 媛뺣젰??怨좎닔?ㅼ쓣 泥섎떒?섍퀬 紐낆꽦???볦쑝?몄슂.",
    targetId: "nav-master",
    actionType: "click"
  },
  inn_event: {
    id: "inn_event",
    title: "媛앹옍 臾대ː諛?,
    message: "?덉닔?꾨퉬 300踰?泥섏튂 ??[媛앹옍]?먯꽌 臾대ː諛곕뱾???섑??⑸땲?? [媛앹옍]?쇰줈 ?대룞?섏뿬 洹몃뱾??異붽꺽?섏꽭??",
    targetId: "nav-inn",
    actionType: "click"
  }
};

export const TOWER_BUFF_POOL = [
  { id: "atk_up", name: "泥쒕쭏????, description: "怨듦꺽??+20% / 諛⑹뼱??-10%", bonus: { atk: 1.2 }, penalty: { def: 0.9 } },
  { id: "eva_up", name: "?덇났?듬낫", description: "?뚰뵾??+15% / 泥대젰 -10%", bonus: { eva: 15 }, penalty: { hp: 0.9 } },
  { id: "crit_up", name: "?댁닔吏媛?, description: "移섎챸? ?뺣쪧 +15% / 諛쏅뒗 ?쇳빐 +10%", bonus: { critRate: 15 }, penalty: { dmgTaken: 1.1 } },
  { id: "def_up", name: "湲덇컯遺덇눼", description: "諛⑹뼱??+25% / 怨듦꺽??-10%", bonus: { def: 1.25 }, penalty: { atk: 0.9 } },
  { id: "vamp_up", name: "?≪꽦?踰?, description: "?≫삁 5% / 理쒕? 泥대젰 -15%", bonus: { vamp: 5 }, penalty: { maxHp: 0.85 } },
];

export const TOWER_ARTIFACT_POOL = [
  { id: "art_thunder", name: "?뚯쟾???뺤닔", tier: "RARE", description: "10肄ㅻ낫留덈떎 ?곸뿉寃?怨듦꺽??5諛곗쓽 ?숇ː ?쇳빐", effect: { type: "COMBO_BOLT", value: 5, chance: 1 } },
  { id: "art_vamp", name: "?≫삁 洹硫?, tier: "COMMON", description: "怨듦꺽 ???쇳빐?됱쓽 3%瑜??앸챸?μ쑝濡??≪닔", effect: { type: "LIFE_STEAL", value: 3 } },
  { id: "art_shield", name: "?⑷툑 媛묒＜", tier: "RARE", description: "?쇨꺽 ??10% ?뺣쪧濡?臾댁쟻 蹂댄샇留??앹꽦 (3珥?", effect: { type: "SHIELD", value: 3, chance: 10 } },
  { id: "art_mp", name: "?곸쿇???댁뒳", tier: "COMMON", description: "??븷 ?뚮쭏???닿났 2% ?뚮났", effect: { type: "MP_RESTORE", value: 2 } },
  { id: "art_inst_hp", name: "留뚮뀈??, tier: "LEGENDARY", description: "?щ쭩 ?꾧린 ??利됱떆 泥대젰 100% ?뚮났 (痢듬떦 1??", effect: { type: "INSTANT_HP", value: 100 } },
];

export const TOWER_THEMES: Record<number, any> = {
  1: { name: "?앹“???쒕젴", color: "#64748b", effect: "none", desc: "怨좎슂???뚯쓽 湲곗슫??媛먮룄??痢듭엯?덈떎." },
  21: { name: "?뱁븳??媛먯삦", color: "#38bdf8", effect: "slow", desc: "堉덈? 源롫뒗 異붿쐞媛 怨듦꺽 ?띾룄瑜???땅?덈떎." },
  41: { name: "?쇳솕??吏??, color: "#f87171", effect: "burn", desc: "??ㅻⅤ???닿린媛 留ㅼ큹 泥대젰??源롮뒿?덈떎." },
  61: { name: "?낅Т??誘멸턿", color: "#a855f7", effect: "poison", desc: "?낆븞媛쒓? ?뚮났 ?⑥쑉??諛⑺빐?⑸땲??" },
  81: { name: "臾닿레???ъ뿰", color: "#1e293b", effect: "void", desc: "紐⑤뱺 湲곗슫???듭젣?섎뒗 洹뱁븳??怨듦컙?낅땲??" },
};

export function getTowerTheme(floor: number) {
  const keys = Object.keys(TOWER_THEMES).map(Number).sort((a, b) => b - a);
  const key = keys.find(k => floor >= k) || 1;
  return TOWER_THEMES[key];
}

export function generateTowerEnemy(floor: number) {
  const theme = getTowerTheme(floor);
  const isBoss = floor % 10 === 0;
  const level = floor;
  const baseStats = getTargetPlayerStats(level + 10);

  let traits: string[] = [];
  if (isBoss) traits.push("蹂댁뒪", "?쇳빐 ?곹븳");
  if (theme.effect === "slow") traits.push("?쒓린 (怨듭냽 ???");
  if (theme.effect === "burn") traits.push("?붿뿼 (吏???쇳빐)");
  if (theme.effect === "poison") traits.push("留밸룆 (移섏쑀 ???");
  if (theme.effect === "void") traits.push("怨듯뿀 (?λ젰 ?듭젣)");

  let hpMult = isBoss ? 3.0 : 1.0;
  // 珥덈컲 痢??쒖씠???꾪솕 (1痢?30% ?섑뼢, 7痢듬????뺤긽??
  if (!isBoss) {
    hpMult *= Math.min(1.0, 0.7 + (floor - 1) * 0.05);
  }
  let atkMult = isBoss ? 1.5 : 1.0;
  let defMult = 1.0;
  let eva = Math.min(40, floor * 0.5);
  let critRes = Math.min(40, floor * 0.5);
  let reflect = floor > 40 ? 15 : 0;
  let lifeSteal = floor > 60 ? 10 : 0;
  let ignoreEva = floor > 80 ? 30 : 0;

  const hp = Math.floor(baseStats.hp * 2.5 * hpMult);
  const atk = Math.floor(baseStats.atk * 0.5 * atkMult);
  const def = Math.floor(baseStats.def * 0.3 * defMult);

  return {
    name: isBoss ? `[痢?蹂댁뒪] ${floor}痢?${theme.name} ?섑샇?? : `${floor}痢??쒗뿕??,
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
    traits
  };
}

export const STAT_UPGRADE_BASES: Record<string, { gold: number; rep: number }> = {
  atk: { gold: 1500, rep: 400 },
  def: { gold: 1500, rep: 400 },
  hpRec: { gold: 1500, rep: 400 },
  mpRec: { gold: 1500, rep: 400 },
  critRate: { gold: 3000, rep: 800 },
  critDmg: { gold: 3000, rep: 800 },
  eva: { gold: 3000, rep: 800 },
  luck: { gold: 10000, rep: 2500 },
  autoGain: { gold: 10000, rep: 2500 },
  offlineLimit: { gold: 10000, rep: 2500 },
};

const DUEL_TIERS = [
  { name: "臾대챸?뚯「", min: 0 },
  { name: "珥덉텧媛뺥샇", min: 200 },
  { name: "?쇰쪟怨좎닔", min: 500 },
  { name: "?덉젙怨좎닔", min: 1000 },
  { name: "珥덉젅??, min: 2000 },
  { name: "?붽꼍", min: 4000 },
  { name: "?꾧꼍", min: 8000 },
  { name: "?앹궗寃?, min: 15000 },
  { name: "?좏솕寃?, min: 30000 },
  { name: "泥쒖씤?⑹씪", min: 60000 },
];

function getDuelTier(rating: number) {
  for (let i = DUEL_TIERS.length - 1; i >= 0; i--) {
    if (rating >= DUEL_TIERS[i].min) return DUEL_TIERS[i].name;
  }
  return "臾대챸?뚯「";
}

// --- ?낆쟻 ?앹꽦 諛?諛몃윴???곸닔 ---
const DUEL_BALANCING = {
  COMBAT_TIME: 40,        // ?꾩껜 ?꾪닾 ?쒓컙
  BASELINE_TIME: 35,      // 諛몃윴??湲곗? ?쒓컙 (?좎??먭쾶 5珥??ъ쑀)
  USER_TAP_PER_SEC: 3,    // 珥덈떦 ?좎? 怨듦꺽 ?잛닔 湲곗?
  TOTAL_BASELINE_HITS: 105, // 35珥?* 3??= 105???寃?湲곗?
  BERSERK_TIME: 30,       // 愿묓룺??諛쒕룞 ?쒓컙 (?쒖옉 ??30珥?
  NORMAL_BERSERK: { atk: 1.35, spd: 1.5 },
  BOSS_BERSERK: { atk: 1.5, spd: 1.75 }
};

/**
 * ?좎? 媛뺥솕 ?덈꺼蹂?紐⑺몴 ?ㅽ꺈 怨꾩궛 (諛몃윴??湲곗???
 * @param level 媛뺥솕 ?덈꺼
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
  const rivalTemplate = MASTER_RIVALS[rivalIdx] || { name: `?대쫫 ?녿뒗 怨좎닔 (Lv.${level})`, hpMult: 1, atkMult: 1 };
  const isBoss = (level % 10 === 0);

  const refPlayer = getTargetPlayerStats(level + 1);
  const rivalDef = Math.floor(refPlayer.atk * 0.01); // 湲곗〈 20%?먯꽌 1%濡????異뺤냼 (?寃⑷컧 媛뺥솕)
  const defMultiplier = 100 / (100 + rivalDef);
  const avgDmgPerHitRaw = refPlayer.atk * defMultiplier;
  const avgDmgPerHit = avgDmgPerHitRaw * (1 + (refPlayer.critRate / 100) * (refPlayer.critDmg / 100 - 1));

  // Multipliers applied here
  const hpMult = rivalTemplate.hpMult || 1.0;
  const atkMult = rivalTemplate.atkMult || 1.0;
  const bossMult = isBoss ? 2.5 : 1.0;

  const rivalHp = Math.floor(avgDmgPerHit * DUEL_BALANCING.TOTAL_BASELINE_HITS * hpMult * bossMult);
  const estimatedHitsTaken = 35 / 1.2;
  const playerDefMultiplier = 100 / (100 + refPlayer.def);
  const requiredDmgPerHit = refPlayer.hp / estimatedHitsTaken;
  const rivalAtk = Math.floor((requiredDmgPerHit / playerDefMultiplier) * atkMult * (isBoss ? 1.5 : 1.0));

  return {
    name: isBoss ? `[蹂댁뒪] ${rivalTemplate.name}` : rivalTemplate.name,
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
    // 諛⑹뼱?? 寃쎌?媛 ?ㅻ??섎줉 湲고븯湲됱닔?곸쑝濡??곸듅 (?꾪닾???명뵆?덉씠???鍮?
    defBase = currentRealmIndex > 0 ? 50 * Math.pow(7, currentRealmIndex - 1) : 0;
    // ?뚰뵾?? 寃쎌???1.2%, ?깅떦 0.2% 異붽?
    evaBase = currentRealmIndex * 1.2;
  } else if (realm.startsWith("?섍낏?덊눜")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    baseHp = REALM_SETTINGS["泥쒖씤?⑹씪"].dummyHp * Math.pow(2.5, level);
    atkBase = 10 * Math.pow(2, 10) * Math.pow(1.5, level);
    defBase = 50 * Math.pow(7, 9) * Math.pow(1.8, level);
    evaBase = 12 + level * 0.5;
  }

  let hp = Math.floor(baseHp * Math.pow(1.5, star - 1));
  const def = Math.floor(defBase * (1 + (star - 1) * 0.15));
  const eva = Math.min(25, evaBase + (star - 1) * 0.2); // 理쒕? 25% ?쒗븳

  // ?좎????ㅼ젣 ?꾪닾?μ쓣 諛섏쁺???숈쟻 ?ㅼ??쇰쭅 (?쒕갑而?諛⑹?)
  // ?좎? 怨듦꺽?μ씠 ?곸듅?섎㈃ ?낆쟻??理쒖냼 HP??鍮꾨??섏뿬 ?곸듅 (理쒖냼 6~10? 踰꾪떚?꾨줉)
  const expectedHitSurvive = 8;
  const minimumHp = totalAtk * expectedHitSurvive;
  if (hp < minimumHp) {
    hp = Math.floor(minimumHp);
  }

  return { hp, def, eva, atk: Math.floor(atkBase * (1 + star * 0.2)) };
}

export function getRealmSettings(realm: string) {
  if (REALM_SETTINGS[realm]) return REALM_SETTINGS[realm];
  if (realm.startsWith("?섍낏?덊눜")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    const base = REALM_SETTINGS["泥쒖씤?⑹씪"];
    return { bonus: base.bonus * Math.pow(1.5, level), minTouches: base.minTouches + (level * 10000000000000), dummyHp: base.dummyHp * Math.pow(2.5, level), dummyType: "heaven", label: `?섍낏?덊눜 ${level}?깆쓽 寃쎌?`, hp: base.hp * Math.pow(1.3, level), mp: base.mp * Math.pow(1.3, level), goldMultiplier: base.goldMultiplier * Math.pow(1.5, level) };
  }
  return REALM_SETTINGS["?꾨?"];
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
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  isSyncingFromCloud: boolean;
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
  toggleAudio: () => void;
  triggerUltimate: () => void;
  buyBossShopItem: (itemType: string) => void;
  parryBossAttack: () => void;
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean, oilRes?: any) => { totalDamage: number; isCrit: boolean; effect: any; };
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
  toggleEquipSkill: (skillName: string) => void;
  triggerCombatTrap: (multiplier: number) => void;
  visitGiru: () => void;
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string, infoTier?: "low" | "mid" | "high" | "special" }) => { success: boolean; message: string; event?: any };
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
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  game: { ...defaultGameData, ...loadGame() },
  isSyncingFromCloud: false,
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
    if (game.gamblingTokens > 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          gamblingTokens: s.game.gamblingTokens - 1,
          yabawiEvent: null // ?대깽???깃났?곸쑝濡??ъ슜 ???앹뾽 ?ロ옒
        }
      }));
      get().triggerSave(true);
      return true;
    }
    return false;
  },
  giveGamblingToken: (tokens: number, fragments: number = 0) => {
    set((s: any) => ({
      game: {
        ...s.game,
        gamblingTokens: (s.game.gamblingTokens || 0) + tokens,
        gamblingTokenFragments: (s.game.gamblingTokenFragments || 0) + fragments
      }
    }));
    get().triggerSave(true);
  },
  synthesizeTujeonTokens: () => {
    set((s: any) => {
      const fragments = s.game.gamblingTokenFragments || 0;
      if (fragments < 5) return s;
      const gainedTokens = Math.floor(fragments / 5);
      const remainingFragments = fragments % 5;
      return {
        game: {
          ...s.game,
          gamblingTokens: (s.game.gamblingTokens || 0) + gainedTokens,
          gamblingTokenFragments: remainingFragments
        }
      };
    });
    get().triggerSave(true);
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
        // User said: "媛숈? '寃쎌?' 湲곗??쇰줈 臾띠엫".
        // But also said "怨듦꺽 ?명듃", "?앹〈 ?명듃".
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

    // [?ъ꽕怨? ?④퀎蹂?怨듦꺽???깆옣 怨듭떇 ?곸슜
    let upgradeAtk = get().getStatUpgradeBonus("atk");

    const mWeapon = game.ownedWeapons.find(w => w.id === (game.equippedGear?.mainWeapon || game.equippedWeaponId));
    const innBonus = get().getInnBonus();
    // ?꾩씠??怨듦꺽?? 蹂대꼫??(?곹븳 200%)
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

    // ?곕쭏??愿묓룺 踰꾪봽 (怨듦꺽??3諛?
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

    if (game.faction === "臾대떦") { const combo = (game.lastAttackTime && (Date.now() - game.lastAttackTime < 1500)) ? game.comboCount : 0; final *= (1 + Math.min(combo * 0.05, 1.0)); }
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

    // 理쒖쥌 ?곹븳 ?곸슜 (50%)
    finalCrit = Math.min(50, finalCrit);

    // ?곕쭏???곸븞 踰꾪봽 (移섎챸? 50% ?곸듅 - 媛먯뇿 諛??곹븳 ?댄썑 ?⑹궛)
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
    const base = 150 + game.ownedWeapons.filter((w: any) => Object.values(game.equippedGear || {}).includes(w.id)).reduce((s: any, i: any) => s + (i.critDmgBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + get().getStatUpgradeBonus("critDmg") + (get().getInnBonus().critDmg) + get().getOptionSum("crit_dmg") + breakthroughCritDmg;

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

    // 理쒖쥌 ?곹븳 ?곸슜 (280%)
    finalCritDmg = Math.min(280, finalCritDmg);

    // ?곕쭏???뚯쿇 踰꾪봽 (移섎챸 ?쇳빐 3諛?
    if (game.oilBuffs?.oil_crit_3 > 0) {
      finalCritDmg *= 3;
    }


    return finalCritDmg;
  }, getTotalHpRecovery: () => {
    const { game } = get();
    const maxHp = get().getTotalHp();
    const baseRegen = Math.max(1, Math.floor(maxHp * 0.01));

    // [?ъ꽕怨? ?④퀎??怨좎젙 ?뚮났 異붽?
    const upgradeRegen = get().getStatUpgradeBonus("hpRecovery");

    let specBonus = 0;
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      specBonus = specLevel * 100; // +100 per level
    }

    const breakthroughHpRec = game.breakthroughStats?.hpRec || 0;
    return baseRegen + upgradeRegen + specBonus + breakthroughHpRec;
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

    // [?ъ꽕怨? 諛⑹뼱???깆옣 怨듭떇: 臾닿린 怨듦꺽??湲곗? 鍮꾩쑉 ?곸슜 (?꾪룷)
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

    // 理쒖쥌 ?곹븳 ?곸슜 (湲곕낯 50%, 臾대떦? 80%)
    let cap = 50;
    if (game.faction === "臾대떦") {
      cap = 80;
      eva += 25; // 臾대떦 湲곕낯 ?뚰뵾 蹂대꼫??(?곹뼢!)
    }

    if (game.movementBuff && game.movementBuff.data.evaCap) cap = game.movementBuff.data.evaCap;
    
    // ?곕쭏??臾댁쁺 踰꾪봽 (?뚰뵾??3諛?
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
    const equippedWeapons = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const breakthroughSpeed = game.breakthroughStats?.speed || 0;
    const baseSpeed = 100 + equippedWeapons.reduce((s, i) => s + (i.speedBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + breakthroughSpeed;

    // ?꾩씠??怨듭냽% 蹂대꼫??
    let speedPct = get().getOptionSum("speed_pct");
    const speedOptionCount = get().getOptionCount("speed_pct");

    // 以묐났 ?⑤꼸??(1 - 0.04 * (count - 1))
    if (speedOptionCount > 1) {
      speedPct *= (1 - 0.04 * (speedOptionCount - 1));
    }

    // 理쒖쥌 怨듭냽 利앷? ?곹븳 (100%)
    speedPct = Math.min(100, speedPct);

    let finalSpeed = baseSpeed * (1 + speedPct / 100);

    if (game.oilBuffs?.oil_speed_3 > 0) finalSpeed *= 2;
    return finalSpeed;
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
    if (r >= 60000) return { name: "泥쒖씤?⑹씪", atk: 0.5, gold: 1.0, exp: 1.0, critDmg: 300, critRate: 15 };
    if (r >= 30000) return { name: "?좏솕寃?, atk: 0.35, gold: 0.8, exp: 0.8, critDmg: 200, critRate: 10 };
    if (r >= 15000) return { name: "?앹궗寃?, atk: 0.25, gold: 0.6, exp: 0.6, critDmg: 150, critRate: 8 };
    if (r >= 8000) return { name: "?꾧꼍", atk: 0.2, gold: 0.5, exp: 0.5, critDmg: 100, critRate: 5 };
    if (r >= 4000) return { name: "?붽꼍", atk: 0.15, gold: 0.35, exp: 0.35, critDmg: 60, critRate: 3 };
    if (r >= 2000) return { name: "珥덉젅??, atk: 0.1, gold: 0.25, exp: 0.25, critDmg: 40, critRate: 2 };
    if (r >= 1000) return { name: "?덉젙怨좎닔", atk: 0.05, gold: 0.2, exp: 0.2, critDmg: 20, critRate: 0 };
    if (r >= 500) return { name: "?쇰쪟怨좎닔", atk: 0, gold: 0.15, exp: 0.15, critDmg: 10, critRate: 0 };
    if (r >= 200) return { name: "珥덉텧媛뺥샇", atk: 0, gold: 0.1, exp: 0.05, critDmg: 0, critRate: 0 };
    return { name: "臾대챸?뚯「", atk: 0, gold: 0, exp: 0, critDmg: 0, critRate: 0 };
  },
  getTotalCombatPower: () => Math.floor((get().getTotalAttack() * 2 + get().getTotalHp() / 10 + get().getTotalDefense() * 5) * (1 + get().getTotalCritRate() / 100)),

  addExp: (amount: number, isAuto = false, manualDamage?: number) => {
    const { game } = get();
    // ?ъ슜???붿껌???곕씪 臾대ː諛??대깽???湲?以묒뿉??紐⑤뱺 ?섎젴(?곗튂 ?ы븿) 以묐떒
    if (game.pendingInnEntry || game.timingMission.available) return;
    // ?꾪닾 以묒씠嫄곕굹 ???대?????以묐떒
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

      // [異붽?] ?쒗넗由ъ뼹 留덉?留??④퀎?먯꽌 ?곗튂 諛쒖깮 ???쒗넗由ъ뼹 媛뺤젣 醫낅즺
      if (s.game.tutorialProgress.isActive && 
         (s.game.tutorialProgress.currentStepId === "restart_training" || 
          s.game.tutorialProgress.currentStepId === "check_final_infused_options")) {
        // ??대㉧ ?놁씠 利됱떆 醫낅즺 泥섎━?섏뿬 ?곗튂 諛섏쓳??蹂댁옣
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
      let aM = s.game.attackMultiplier;
      let bTL = s.game.buffTimeLeft;
      let aB = s.game.activeBuff;

      const hitCount = Math.max(1, Math.floor(amount));
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
            lastR = "?뮥 TREASURE!";
          }
          eGold += kG;
          currentDummyHp = stats.hp;
        }
        if (isHitDodged) lastR = "鍮쀫굹媛?";
      }

      const intervals = [300, 400, 500, 600, 700, 800, 900, 1000];
      const isTreasureForecast = s.game.nextDayEvent?.type === "TREASURE_FORECAST";
      const spawnBonus = isTreasureForecast ? 1.5 : 0;
      const targetInterval = Math.floor(intervals[currentIdx % 8] / (nightBuffs.mobSpawn + spawnBonus));
      const killGap = tKills - (s.game.lastInnEventKillCount || 0);

      let nTM = { ...s.game.timingMission };
      if (tKills >= 400 && killGap >= targetInterval && !nTM.available && !s.game.tutorialProgress.isActive) {
        const miniGames = ["breath", "dodge", "puzzle", "pulse"];
        const gameIdx = iEV % 4;
        const selectedGame = miniGames[gameIdx];
        const RIVAL_NAMES = ["?묓뭾??씤", "?낃퀬??, "泥좉텒留덉썒", "?댁닔 臾댁쁺", "泥?룄諛?臾대ː諛?, "?덇? 洹??, "?숈뼇 留앸굹??, "?곗쟻 ?먮ぉ", "鍮꾨룄 媛덉쿇", "愿묐쭏 ?쒓구", "?띻?媛?, "臾댁젙??, "?덈옉??, "泥좉린諛?議멸컻", "鍮꾩뿰??, "湲덇컯沅?];
        const randomRivalName = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];

        pIE = true;
        iEV += 1;
        nTM = {
          ...nTM,
          available: true,
          selectedGameType: selectedGame as any,
          rivalName: `${randomRivalName} (${iEV}李?`,
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
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 30踰?n[媛쒕갑: ??κ컙/?λ퉬]";
          uET_val = null;
          aM_val = 10; bTL_val = 30; aB_val = "臾댁븘吏寃?;
          milestoneToTrigger = "trance_achieved";
        } else if (qT_val === 30) {
          qT_val = 50;
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 50踰?n[媛쒕갑: 媛뺥솕]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "forge", "inventory"]));
          milestoneToTrigger = "forge_unlock";
        } else if (qT_val === 50) {
          qT_val = 80;
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 80踰?n[媛쒕갑: 鍮꾧툒/湲곕（/?꾨컯]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "upgrade"]));
          milestoneToTrigger = "upgrade_unlock";
        } else if (qT_val === 80) {
          qT_val = 100;
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 100踰?n[媛쒕갑: 臾댄븳????";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "library", "giru", "gambling"]));
          milestoneToTrigger = "library_unlock";
        } else if (qT_val === 100) {
          qT_val = 150;
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 150踰?n[媛쒕갑: ?寃?";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "tower"]));
          milestoneToTrigger = "tower_unlock";
        } else if (qT_val === 150) {
          qT_val = 290;
          cMT_val = "?덉닔?꾨퉬 ?꾩쟻 泥섏튂 290踰?n[媛쒕갑: 媛앹옍]";
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "master"]));
          milestoneToTrigger = "master_unlock";
        } else if (qT_val === 290) {
          qT_val = targetInterval;
          cMT_val = `媛앹옍 臾대ː諛?異붽꺽 (${iEV + 1}李?\n?덉닔?꾨퉬瑜?${targetInterval}????泥섎떒?섏꽭??`;
          uET_val = null;
          uTabs_val = Array.from(new Set([...uTabs_val, "inn"]));
          pIE = false;
          milestoneToTrigger = "inn_event";
        } else if (qT_val >= targetInterval) {
          qT_val = targetInterval;
          cMT_val = `媛앹옍 臾대ː諛?異붽꺽 (${iEV + 1}李?\n?덉닔?꾨퉬瑜?${targetInterval}????泥섎떒?섏꽭??`;
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
    if (milestoneToTrigger) get().setTutorialStep(milestoneToTrigger);
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
          // 紐⑺몴 ?좏삎蹂??밸퀎 泥섎━
          if (q.targetType === "reach_upgrade_level") {
             const key = q.id.split("_")[2]; // q_stat_atk_5 -> atk
             const currentLv = s.game.upgradeLevels?.[key] || 0;
             if (currentLv >= q.targetCount) {
                changed = true;
                setTimeout(() => alert(`[?꾨Т ?꾨즺] ${q.title}`), 500);
                return { ...q, currentCount: q.targetCount, status: "completed" };
             }
          }
          if (q.targetType === "reach_duel_rating") {
             const currentRating = s.game.duel?.rating || 0;
             if (currentRating >= q.targetCount) {
                changed = true;
                setTimeout(() => alert(`[?꾨Т ?꾨즺] ${q.title}`), 500);
                return { ...q, currentCount: q.targetCount, status: "completed" };
             }
          }

          // ?꾨컯 ?밸━ (?먮룉 議곌굔 泥댄겕)
          if (targetType === "gamble_win") {
             const betAmount = amount; // gamble_win ?쒖뿉??amount瑜??먮룉?쇰줈 ?꾨떖?쒕떎怨?媛??
             if (q.id === "q_chowoon_1") {
                if (betAmount >= 5000000) {
                   const nextCount = q.currentCount + 1;
                   const isDone = nextCount >= q.targetCount;
                   if (isDone) setTimeout(() => alert(`[?섏뒪???꾨즺] ${q.title}`), 500);
                   changed = true;
                   return { ...q, currentCount: Math.min(q.targetCount, nextCount), status: isDone ? "completed" : "active" };
                } else {
                   return q; // 議곌굔 誘몃떖 ??臾댁떆
                }
             }
          }
          
          if (q.targetType === targetType) {
            const nextCount = q.currentCount + amount;
            const isDone = nextCount >= q.targetCount;
            if (isDone) {
              setTimeout(() => {
                alert(`[?섏뒪???꾨즺] ${q.title}\n?뷀뼢猷⑥뿉??蹂댁긽??諛쏆쑝?몄슂!`);
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
    set((s: any) => ({
      game: {
        ...s.game,
        activeQuests: getNextAdaptiveQuests(s.game)
      }
    }));
  },

  claimQuestReward: (questId: string) => {
    const { game, addCoins, updateQuestProgress, refreshQuests } = get();
    const quest = (game.activeQuests || []).find((q: any) => q.id === questId);
    if (!quest || quest.status !== "completed") return;

    set((s: any) => {
      const reward = quest.reward;
      const nextConsumables = { ...(s.game.consumables || {}) };
      
      // ?밸퀎 蹂댁긽 泥섎━ (?꾩씠????
      if (reward.item === "oil_box") {
        nextConsumables.oil_box = (nextConsumables.oil_box || 0) + 1;
      }
      if (reward.item === "gear_piece_10") {
        s.game.gearPieces = (s.game.gearPieces || 0) + 10;
      }

      // ?섏뒪???쒓굅 (?먮뒗 ?곹깭 蹂寃????꾪꽣留?
      const nextQuests = s.game.activeQuests.filter((q: any) => q.id !== questId);

      return {
        game: {
          ...s.game,
          coins: s.game.coins + (reward.gold || 0),
          reputation: (s.game.reputation || 0) + (reward.favor ? reward.favor * 1000 : 0),
          exp: (s.game.exp || 0) + (reward.exp || 0),
          gamblingTokens: (s.game.gamblingTokens || 0) + (reward.token || 0),
          npcFavors: (() => {
             const nextFavors = { ...(s.game.npcFavors || {}) };
             if (quest.npcId && reward.favor) {
                // ?쒓? ?대쫫 留ㅼ묶 (?꾩떆)
                const nameMap: any = { yeonhwa: "?고솕", seolmae: "?ㅻℓ", chowoon: "珥덉슫", sohee: "?뚰씗", oldman: "諛깅끂?? };
                const kname = nameMap[quest.npcId] || quest.npcId;
                nextFavors[kname] = (nextFavors[kname] || 0) + reward.favor;
             }
             return nextFavors;
          })(),
          consumables: nextConsumables,
          activeQuests: nextQuests
        }
      };
    });

    // 蹂댁긽 ?섎졊 ??利됱떆 ?덈줈???섏뒪??蹂댁땐
    refreshQuests();
    get().triggerSave(true);
    alert(`[?꾨Т 蹂댁긽 ?섎졊 ?꾨즺]`);
  },

  rerollQuest: (questId: string) => {
    const { game, refreshQuests } = get();
    const count = game.questRerollCount || 0;
    if (count >= 2) {
      alert("?ㅻ뒛? ???댁긽 ?꾨Т瑜?媛깆떊?????놁뒿?덈떎. (?쇱씪 理쒕? 2??");
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

    // ?쒓굅 ??利됱떆 ?덈줈???섏뒪??蹂댁땐
    refreshQuests();
    get().triggerSave(true);
    alert(`?꾨Т瑜?媛깆떊?덉뒿?덈떎. (?⑥? ?잛닔: ${1 - count}??`);
  },

  addWeapon: (w: any) => {
    set((s: any) => ({ game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, w] } }));
    get().triggerSave(true);
  },
  addCoins: (amount: number) => {
    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + amount } }));
    get().triggerSave(true);
  },

  learnSkill: (skill: any, priceOrReqs: any) => {
    set((s: any) => {
      const nextMartial = ensureLearnedSkill(s.game.martialArtsSkills || [], skill.id || skill.name);
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const nextEquipped = (equipped.length < 4 && !equipped.includes(skill.name))
        ? [...equipped, skill.name]
        : equipped;

      let nextGame = { ...s.game };
      if (typeof priceOrReqs === 'number') {
        nextGame.coins -= priceOrReqs;
      } else if (priceOrReqs && typeof priceOrReqs === 'object') {
        nextGame.coins -= (priceOrReqs.goldCost || 0);
        if (priceOrReqs.requiredFragments > 0) {
          nextGame.manualFragments = { ...nextGame.manualFragments, [priceOrReqs.fragmentId]: (nextGame.manualFragments?.[priceOrReqs.fragmentId] || 0) - priceOrReqs.requiredFragments };
        }
        if (priceOrReqs.requiredAdvancedMaterials > 0) {
          nextGame.advancedMaterials = (nextGame.advancedMaterials || 0) - priceOrReqs.requiredAdvancedMaterials;
        }
        if (priceOrReqs.requiredLegendaryGearFragments > 0) {
          nextGame.legendaryGearFragments = (nextGame.legendaryGearFragments || 0) - priceOrReqs.requiredLegendaryGearFragments;
        }
        if (priceOrReqs.requiredBonds > 0) {
          nextGame.factionBonds = { ...nextGame.factionBonds, [priceOrReqs.bondId]: (nextGame.factionBonds?.[priceOrReqs.bondId] || 0) - priceOrReqs.requiredBonds };
        }
      }

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

    // 臾대떦 ?쒓레蹂? ?꾩쟾 硫댁뿭
    if (s.game.movementBuff && s.game.movementBuff.data.invincible) amount = 0;
    if (amount <= 0) return s;

    // ?щ쭏?멸? 留덉쁺蹂??뺢린蹂?: ?대젰 諛⑹뼱留?
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
      return { success: false, message: "?덊닾??吏뺥몴媛 遺議깊빀?덈떎." };
    }

    const realms = ["?꾨?", "?쇰쪟", "?대쪟", "?쇰쪟", "?덉젙", "珥덉젅??, "?붽꼍", "?꾧꼍", "?앹궗寃?, "?좏솕寃?, "泥쒖씤?⑹씪"];
    const rIdx = Math.max(0, realms.indexOf(game.realm));
    const randAcce = Math.random();
    const slot: EquipSlot = randAcce < 0.33 ? "necklace" : (randAcce < 0.66 ? "ring" : "bracelet");
    const baseName = slot === "necklace" ? "紐⑷구?? : (slot === "ring" ? "諛섏?" : "?붿컡");

    // Base stats: ?ъ슜???붿껌 諛섏쁺 (湲곕낯 怨?000, ??000, ??500)
    const rFactor = 1 + rIdx * 0.2;
    const baseItem: any = {
      id: `paewang_${slot}_${Date.now()}`,
      name: `[?⑥솗] ${game.realm}??${baseName}`,
      slot,
      realm: game.realm as any,
      attackBonus: Math.floor(3000 * rFactor),
      mpBonus: Math.floor(1500 * rFactor),
      hpBonus: Math.floor(3000 * rFactor),
      price: 10000000,
      icon: slot === "necklace" ? "?벩" : (slot === "ring" ? "?뭾" : "?벩"),
      description: "?⑥솗??蹂대Ъ?곸옄?먯꽌 ?띾뱷???좉린 ?μ떊援ъ엯?덈떎."
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
    return { success: true, item: divineItem };
  },

  triggerSave: (i = false) => { if (i) { if (debounceTimer) clearTimeout(debounceTimer); saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; return; } if (!debounceTimer) debounceTimer = setTimeout(() => { saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; }, 60000); },
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
    return Math.floor(base * Math.pow(1.28, cL));
  },
  getReputationCost: (k: keyof GameSaveData["statUpgrades"]) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = STAT_UPGRADE_BASES[k]?.rep || 400;
    return Math.floor(base * Math.pow(1.28, cL));
  },
  spendPoints: (k: keyof GameSaveData["statUpgrades"]) => { },
  getMultiUpgradeCost: (k: string, c: number, m: string) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = m === 'gold' ? (STAT_UPGRADE_BASES[k]?.gold || 1500) : (STAT_UPGRADE_BASES[k]?.rep || 400);
    // ?깅퉬?섏뿴????怨듭떇: a * (r^n - 1) / (r - 1)
    const r = 1.28;
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
        else tempAtk *= 1.06;
      }
      return tempAtk - game.baseAttack;
    }
    if (k === 'hpRec') {
      return game.maxHp * (Math.pow(1.08, level) - 1);
    }
    if (k === 'def') {
      return 50 * (Math.pow(1.08, level) - 1);
    }
    if (k === 'mpRec') return level * 100;
    if (k === 'hpRecovery') return level * 10;
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
    
    // ?꾩쟻 ?뚰뙆 ?잛닔 怨꾩궛 (?꾨? 1??>2?깆씠 泥??뚰뙆)
    const breakthroughCount = (realmIdx * 10) + game.star;
    const rewardAmount = 40000 + (breakthroughCount * 10000);

    // --- [?좉퇋] 紐⑤뱺 ?λ젰移?+5% 蹂댁긽 怨꾩궛 (?λ퉬 湲곗?) ---
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    
    // 1. ?λ퉬 湲곕낯 ?ㅽ꺈 + 媛뺥솕 蹂대꼫??
    const gearAtk = eq.reduce((s, i) => s + (i.attackBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearDef = eq.reduce((s, i) => s + (i.defenseBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearHp = eq.reduce((s, i) => s + (i.hpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const gearMp = eq.reduce((s, i) => s + (i.mpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    
    // 2. ?듭뀡 ?ㅽ꺈 ?⑹궛
    const optAtk = get().getOptionSum("atk");
    const optDef = get().getOptionSum("def");
    const optHp = get().getOptionSum("hp");
    const optMp = get().getOptionSum("mp");
    const optCritRate = get().getOptionSum("crit_rate");
    const optCritDmg = get().getOptionSum("crit_dmg");
    const optEva = get().getOptionSum("eva");
    const optSpeed = get().getOptionSum("speed");
    const optHpRec = get().getOptionSum("hp_rec");

    // 3. 5% 蹂대꼫??怨꾩궛 (?뺤닔??蹂??
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
      alert(`???뚰뙆 ?깃났! [${game.realm} ${nV}?????꾨떖?덉뒿?덈떎!\n蹂댁긽: ${rewardAmount.toLocaleString()}?? 紐낆꽦 ${rewardAmount.toLocaleString()}\n異붽? 蹂댁긽: 紐⑤뱺 ?λ젰移?+5% (媛곸꽦 蹂대꼫???꾩쟻)`);
    }
    else {
      const nxt = get().getNextRealmName();
      if (nxt) {
        const st = getDummyStats(nxt, 1);
        const nextTabs = [...game.unlockedTabs];
        if (game.totalDummyKills >= 400 && !nextTabs.includes("tower")) nextTabs.push("tower");
        if (nxt !== "?꾨?" && !nextTabs.includes("giru")) nextTabs.push("giru");
        if (nxt !== "?꾨?" && !nextTabs.includes("gambling")) nextTabs.push("gambling");

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

        alert(`??寃쎌? ?뚰뙆! ?덈줈??寃쎌? [${nxt}]???꾨떖?덉뒿?덈떎!\n蹂댁긽: ${rewardAmount.toLocaleString()}?? 紐낆꽦 ${rewardAmount.toLocaleString()}\n異붽? 蹂댁긽: 紐⑤뱺 ?λ젰移?+5% (媛곸꽦 蹂대꼫???꾩쟻)`);

        // 寃쎌? ?뚰뙆 ???ъ쟾???대깽???뺤젙 諛쒖깮
        if (!get().game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500);
        }
      }
    }

    get().triggerSave(true);
  },
  canBreakthrough: () => { const { game } = get(); const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(game.realm); const cur = REALM_SETTINGS[game.realm]; const nxt = REALM_SETTINGS[list[idx + 1]] || cur; return game.touches >= (cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star)); },
  getNextRealmName: () => { const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(get().game.realm); return idx < list.length - 1 ? list[idx + 1] : (get().game.realm === "泥쒖씤?⑹씪" ? "?섍낏?덊눜 1?? : null); },
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

    // ?좊쾿(蹂대쾿) 踰꾪봽 ?낅뜲?댄듃
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

    // --- Global Regeneration (1珥??⑥쐞 ?뺤궛) ---
    // dt??珥??⑥쐞?낅땲?? (蹂댄넻 0.04 ~ 0.2珥??ъ씠)
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

    // ?댁쟾???대? 踰꾪봽媛 ?녾퀬 荑⑤떎?대룄 ?녿떎硫??쇱컢 諛섑솚
    if (s.game.buffTimeLeft <= 0 && !s.game.activeBuff && !hasCooldown && !hasOilBuff && !s.game.movementBuff &&
      nextHp === s.game.hp && nextMp === s.game.mp && finalAccumulator === s.game.regenAccumulator) return s;

    // --- ?꾩쟾沅?異⑹쟾 (5遺꾨떦 1媛? 理쒕?移섍퉴吏) ---
    const md = s.game.masterDuel;
    let newTickets = md.challengeTickets;
    let newChargeTime = md.lastChargeTime;
    const chargeInterval = 5 * 60 * 1000;
    const maxCap = md.overChargeMaxTickets || 12;

    if (newTickets < maxCap) {
      const now = Date.now();
      const elapsed = now - (newChargeTime || now);
      if (elapsed >= chargeInterval) {
        const gained = Math.floor(elapsed / chargeInterval);
        newTickets = Math.min(maxCap, newTickets + gained);
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
          challengeTickets: newTickets,
          lastChargeTime: newChargeTime
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

    // ?꾪닾 以?臾쇱빟 ?ъ슜 ?섏뒪??異붿쟻
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
          buffTimeLeft: 10, // 10珥덇컙 吏??
          activeBuff: "臾댁븘吏寃?,
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
        }
      };
    }
    else if (id === "paewang_box") {
      const baseList = FORGE_ITEMS.filter(i => i.realm === "泥쒖씤?⑹씪" || i.realm === "?좏솕寃?);
      const base = baseList[Math.floor(Math.random() * baseList.length)];
      const newItem = rollPaewangItem({ ...base, id: `paewang_${Date.now()}` }, 1, s.game.upgradeLevels?.luck || 0, 10);

      const slotNames: any = { mainWeapon: "臾닿린", subWeapon: "蹂댁“", gloves: "?κ컩", shoes: "?좊컻", robe: "?꾪룷", necklace: "紐⑷구??, ring: "諛섏?", bracelet: "?붿컡" };

      return {
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, newItem],
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "?⑥솗???좊Ъ 媛쒕큺",
            items: [{ 
              icon: newItem.icon, 
              name: newItem.name, 
              color: "#ff9d00",
              slotName: slotNames[newItem.slot] || newItem.slot 
            }]
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
            title: "?곸옄 媛쒕큺 ?꾨즺",
            items: [{ icon: "?え", name: "?꾩쿋 媛뺥솕??, count: 30, color: "#6ad7ff" }]
          }
        }
      };
    }
    else if (id === "rare_box_tujeon" || id === "night_gear_box") {
      const luck = s.game.statUpgrades?.luck || 0;
      const newItem = generateRandomGear(s.game.realm, 0, luck);
      // ?깃툒 蹂댁젙 (?ш?/?곸썒)
      if (id === "rare_box_tujeon") newItem.tier = "紐낇뭹";
      else newItem.tier = "蹂닿뎄";
      
      const tierColor = newItem.tier === "蹂닿뎄" ? "#a822f3" : "#4facfe";
      const slotNames: any = { mainWeapon: "臾닿린", subWeapon: "蹂댁“", gloves: "?κ컩", shoes: "?좊컻", robe: "?꾪룷", necklace: "紐⑷구??, ring: "諛섏?", bracelet: "?붿컡" };

      return {
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, newItem],
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "?덈줈???λ퉬 ?띾뱷",
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
            title: "議곌컖 臾띠쓬 ?댁젣",
            items: [{ icon: "?뷂툘", name: "?쇳뻾 ?λ퉬 議곌컖", count: 5, color: "#ff6bd6" }]
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
        
      const fragId = randomSkill.grade === "common" ? "common_fragment" : `${randomSkill.id}_議곌컖`;
      const fragCount = 10;

      return {
        game: {
          ...s.game,
          manualFragments: {
            ...s.game.manualFragments,
            [fragId]: (s.game.manualFragments?.[fragId] || 0) + fragCount
          },
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 },
          pendingReward: {
            title: "鍮꾧툒 二쇰㉧???댁젣",
            items: [{ 
              icon: "?뱶", 
              name: `${randomSkill.name} 議곌컖`, 
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
  equipItem: (id: string) => set((s: any) => { 
    const it = s.game.ownedWeapons.find((w: any) => w.id === id); 
    if (!it) return s; 
    
    if (s.game.tutorialProgress.currentStepId === "equip_weapon") {
      setTimeout(() => get().setTutorialStep("goto_forge_refine"), 100);
    }
    
    return { game: { ...s.game, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } }; 
  }),
  unequipItem: (slot: EquipSlot) => set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null } } })),
  sellItem: (id: string) => set((s: any) => {
    const it = s.game.ownedWeapons.find((w: any) => w.id === id);
    if (!it) return s;
    const p = (it.name.includes("[?⑥솗]") || it.tier === "?좉린") ? 40000000 : Math.floor((it.price || 0) * 0.25);
    return { game: { ...s.game, coins: s.game.coins + p, ownedWeapons: s.game.ownedWeapons.filter((w: any) => w.id !== id) } };
  }),
  dismantleItem: (id: string) => set((s: any) => {
    const it = s.game.ownedWeapons.find((w: any) => w.id === id);
    if (!it) return s;
    
    const userRealmIdx = REALM_ORDER.indexOf(s.game.realm);
    let materials = 0;
    
    if (userRealmIdx >= 4) { // ?덉젙 ?댁긽
      if (it.tier === "援?낫") materials = 25;
      else if (it.tier === "?좉린" || it.name.includes("[?⑥솗]")) materials = 100;
    } else { // ?덉젙 誘몃쭔
      if (it.tier === "紐낇뭹") materials = 2;
      else if (it.tier === "蹂닿뎄") materials = 8;
      else if (it.tier === "援?낫") materials = 30;
      else if (it.tier === "?좉린" || it.name.includes("[?⑥솗]")) materials = 150;
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
    const offSec = Math.min(offMs / 1000, 3600 + (game.upgradeLevels.offlineLimit || 0) * 30);
    const lv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + lv * 0.01;
    const goldB = 1 + lv * 0.01;
    const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec);
    const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
    const touchesPerSec = (1 + lv * 0.01) * expB;
    const eTouches = Math.floor(touchesPerSec * offSec);

    // 紐낆긽 ?⑥쑉: ?ㅽ봽?쇱씤 ?쒓컙 鍮꾨? (理쒕? 100%)
    const efficiency = Math.min(100, Math.floor((offSec / (3600 + (game.upgradeLevels.offlineLimit || 0) * 30)) * 100));

    // ?ㅼ쓬 寃쎌?源뚯? ?덉긽 ?쒓컙
    const curR = REALM_SETTINGS[game.realm];
    const nxtR = get().getNextRealmName() ? (REALM_SETTINGS[get().getNextRealmName()!] || curR) : curR;
    const reqTouches = (curR.minTouches + Math.floor(((nxtR.minTouches - curR.minTouches) / 10) * game.star));
    const remain = Math.max(0, reqTouches - game.touches);
    const estHours = Math.ceil(remain / (touchesPerSec * 3600));

    set((s: any) => {
      const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
      const touchesPerSec = (1 + lv * 0.01) * expB;
      // [?섏젙] ?ㅽ봽?쇱씤 ?섎젴移?蹂댁긽 1/10 ?⑥쑉 ?곸슜
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
        // ?곗뒿 蹂댁긽 ?뺤궛 諛??섎젴??蹂듭텣
        const r = 300 * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1);
        set((s: any) => ({ game: { ...s.game, coins: s.game.coins + r, timingMission: { ...s.game.timingMission, available: false }, activeTab: "training" } }));
      } else {
        // ?ㅼ젣 ?꾨Т 蹂댁긽 ?뺤궛 諛??섎젴??蹂듦?
        const actualStage = Math.min(15, p.maxStage || 0);
        const r = p.gold || (1000 * Math.pow(1.4, actualStage) * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1));
        const repGain = p.rep || (50 + actualStage * 30);

        let newConsumables = { ...game.consumables };
        if (p.item) {
          const itemKey = (p.item === "泥대젰 ?섏빟" ? "hp_medium" : (p.item === "?대젰 ?섏빟" ? "mp_medium" : "hp_small")) as keyof typeof newConsumables;
          newConsumables[itemKey] = (newConsumables[itemKey] || 0) + 1;
        }

        // 媛앹옍 ?깃툒 ?뺤궛
        const ratingGain = 10 + actualStage * 3;
        const newRating = (game.duel.rating || 100) + ratingGain;
        const newTier = getDuelTier(newRating);

        // ?ъ쟾??紐낇뙣 ?쒕∼ (泥???臾대즺, ?댄썑 5% ?뺣쪧)
        const isFirstWin = (game.duel.totalWins || 0) === 0;
        let tokenGained = isFirstWin ? 1 : (Math.random() < 0.05 ? 1 : 0);

        // ?ъ쟾???대깽??諛쒖깮 ?뺣쪧 0.1%
        if (Math.random() < 0.001 && !game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500); // ?쒕젅?대? 二쇱뼱 ?곹깭 ?낅뜲?댄듃 ???ㅽ뻾
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

        set((s: any) => ({
          game: {
            ...s.game,
            coins: s.game.coins + r,
            reputation: Math.max(0, (s.game.reputation || 0) + repGain),
            enhancementStones: (s.game.enhancementStones || 0) + stoneGain,
            wisdom: (s.game.wisdom || 0) + wisdomGain,
            consumables: newConsumables,
            activeBuff: tranceMultiplier > 1 ? "臾댁븘吏寃? : s.game.activeBuff,
            attackMultiplier: tranceMultiplier > 1 ? tranceMultiplier : s.game.attackMultiplier,
            buffTimeLeft: tranceMultiplier > 1 ? 15 : s.game.buffTimeLeft, // 臾댁븘吏寃?吏?띿떆媛?15珥?
            showInnVictoryEffect: true,
            lastInnScore: score,
            innHighScore: Math.max(game.innHighScore || 0, score),
            timingMission: { ...s.game.timingMission, available: false },
            pendingInnEntry: false, // Ensure the overlay is removed
            activeTab: "training",
            gamblingTokens: (s.game.gamblingTokens || 0) + tokenGained,
            duel: {
              ...s.game.duel,
              rating: newRating,
              tier: newTier,
              totalWins: (s.game.duel.totalWins || 0) + 1,
              winStreak: (s.game.duel.winStreak || 0) + 1
            }
          }
        }));

        // 3珥????밸━ ?댄럺??醫낅즺
        setTimeout(() => {
          set((s: any) => ({ game: { ...s.game, showInnVictoryEffect: false } }));
        }, 3000);
      }
    } else {
      // ?ㅽ뙣/?꾪눜 ???섎젴?μ쑝濡?利됱떆 蹂듦?
      set((s: any) => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false, activeTab: "training" } }));
    }
    get().triggerSave(true);
  },
  incrementCombo: () => set((s: any) => ({ game: { ...s.game, comboCount: (s.game.comboCount || 0) + 1, lastAttackTime: Date.now() } })),
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
            timeLimit: 40,
            lastAttackTime: Date.now()
          }
        }
      }));
      return;
    }
    if (game.masterDuel.challengeTickets <= 0 && !isSpecialBoss) return;

    let e: any;
    if (isSpecialBoss && game.nextDayEvent?.type === "BOSS_RAID_CLUE") {
      const baseEnemy = generateEnemy(game.masterDuel.selectedLevel + 20);
      e = {
        ...baseEnemy,
        name: `?뵦 ?뱀닔 蹂댁뒪: ${game.nextDayEvent.bossId}`,
        hp: baseEnemy.hp * 3,
        atk: baseEnemy.atk * 1.5,
        isBoss: true
      };
    } else {
      e = generateEnemy(game.masterDuel.selectedLevel);
    }
    const isZhuge = game.faction === "?쒓컝?멸?";
    const statMult = isZhuge ? 1.05 : 1.0;

    // ?щ쭏?멸? 蹂댄샇留?珥덇린??
    const isSama = game.faction === "?щ쭏?멸?";
    const initialShield = isSama ? get().getTotalMp() * 0.2 : 0;

    const now = Date.now();
    // 10遺??댁긽 吏?ъ쑝硫??곗냽 泥섏튂 珥덇린??
    let streak = game.masterDuel.streakCount || 0;
    if (now - (game.masterDuel.lastAttackTime || 0) > 10 * 60 * 1000) {
      streak = 0;
    }

    const rewards = game.nextDayEvent?.rewards || null;

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          challengeTickets: isSpecialBoss ? s.game.masterDuel.challengeTickets : s.game.masterDuel.challengeTickets - 1,
          streakCount: streak,
          lastAttackTime: now,
          isPlaying: true,
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
          rewards: rewards, // Transfer rewards here
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
            statMult: statMult // ?쒓컝?멸? 踰꾪봽??
          }
        },
        nextDayEvent: (game.nextDayEvent && (game.nextDayEvent.type === "GIRU_INFO_EVENT" || game.nextDayEvent.type === "BOSS_RAID_CLUE")) 
          ? { ...game.nextDayEvent, isUsed: true } 
          : game.nextDayEvent
      }
    }));
  },
  updateMasterDuel: (dt: number) => set((s: any) => {
    if (!s.game.masterDuel.isPlaying) return s;
    const now = Date.now();

    const masterDuel = s.game.masterDuel;
    const faction = s.game.faction;
    let fState = { ...(masterDuel.factionState || {}) };

    // ?ㅽ꽩 ??대㉧ 泥섎━
    let nextStunTimer = Math.max(0, (masterDuel.stunTimer || 0) - dt);
    let nextIsStunned = nextStunTimer > 0;
    let rivalHp = masterDuel.rivalHp;

    // ?쒓컝?멸? ?붽킌蹂? ???쒓컙 ?뺤? ?뱀? ?ㅽ꽩 ?곹깭??寃쎌슦 ??대㉧ ?뺤?
    const isFrozen = s.game.movementBuff && s.game.movementBuff.data.freeze;
    const isTargetPaused = isFrozen || nextIsStunned;

    const tLeft = Math.max(0, masterDuel.timeLeft - dt);

    // 30珥?愿묓룺??泥댄겕
    const duelDuration = 40 - tLeft;
    const isBerserk = duelDuration >= 30;
    const berserkAtkMult = isBerserk ? 1.5 : 1.0;
    const berserkSpeedMult = isBerserk ? 1.3 : 1.0;

    const rivalAtk = masterDuel.rivalAtk * berserkAtkMult;
    const rivalSpeed = 1.0 * berserkSpeedMult;
    const attackInterval = 1 / rivalSpeed;

    // ?쒓컙 珥덇낵 ?⑤같 泥섎━
    if (tLeft <= 0) {
      return {
        game: {
          ...s.game,
          masterDuel: { ...masterDuel, isPlaying: false, timeLeft: 0, lastWinReward: "?쒓컙 珥덇낵 (?⑤같)", damageTakenAccumulator: 0, lastEffect: null }
        }
      };
    }

    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    let dmgAccum = 0;
    let effect = masterDuel.lastEffect;

    // 1. ??怨듦꺽 ??대㉧ 泥섎━ (?쇰컲 怨듦꺽)
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

    // 2. ??媛뺣젰??怨듦꺽 異⑹쟾 ??대㉧ (蹂댁뒪??寃쎌슦)
    let nextChargeTimer = (masterDuel.chargeTimer || 0);
    if (!isTargetPaused && masterDuel.isBoss) {
      nextChargeTimer += dt;
      if (nextChargeTimer >= 5.0) {
        // 5珥??꾨떖 ??媛뺣젰??怨듦꺽
        const bossDmg = Math.floor(rivalAtk * 1.5);
        nextHp = Math.max(0, nextHp - bossDmg);
        dmgAccum = bossDmg;
        nextChargeTimer = 0;
      }
    }

    const isPlayerDead = nextHp <= 0;

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
          isPlaying: !isPlayerDead,
          rivalHp: rivalHp,
          lastWinReward: isPlayerDead ? "湲곗슫???ㅽ뻽?듬땲??(?⑤같)" : masterDuel.lastWinReward,
          rivalAttackTi        const nextFragments = { ...(s.game.manualFragments || {}) };
        const nextBonds = { ...(s.game.factionBonds || {}) };
        let nextMaterials = s.game.advancedMaterials || 0;
        let nextLegendaryGearFragments = s.game.legendaryGearFragments || 0;
        let nextDivineWeaponShards = s.game.divineWeaponShards || 0;
        let nextWisdom = s.game.wisdom || 0;

        // --- 湲곕（ 湲곗뿰(Info) 蹂댁긽 吏湲?---
        if (masterDuel.rewards) {
          const r = masterDuel.rewards;
          if (r.gold) {
             msg += `\n[湲곗뿰] 異붽? 湲덊솕 +${r.gold.toLocaleString()}`;
             // Gold is handled in the final return by adding it to goldGain if needed, 
             // but here we can just update a local variable and add it to the final gold.
          }
          if (r.advancedMaterials) {
            nextMaterials += r.advancedMaterials;
            msg += `\n[?띾뱷] ?곴툒 ?щ즺 +${r.advancedMaterials}媛?;
          }
          if (r.legendaryGearFragments) {
            nextLegendaryGearFragments += r.legendaryGearFragments;
            msg += `\n[?띾뱷] ?꾩꽕 ?λ퉬 議곌컖 +${r.legendaryGearFragments}媛?;
          }
          if (r.divineWeaponShards) {
            nextDivineWeaponShards += r.divineWeaponShards;
            msg += `\n[?띾뱷] ?좊퀝?닿린 ?뚰렪 +${r.divineWeaponShards}媛?;
          }
          if (r.wisdom) {
            nextWisdom += r.wisdom;
            msg += `\n[?띾뱷] ?щ뱷(吏?? +${r.wisdom}`;
          }
          if (r.factionBonds) {
            Object.entries(r.factionBonds).forEach(([f, v]: any) => {
              nextBonds[f] = (nextBonds[f] || 0) + v;
              msg += `\n[?띾뱷] ${f} ?몄뿰 +${v}`;
            });
          }
          if (r.manualFragments) {
            Object.entries(r.manualFragments).forEach(([k, v]: any) => {
              if (k === "random_faction") {
                const targetSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
                const randomSkill = targetSkills[Math.floor(Math.random() * targetSkills.length)];
                const fragId = `manual_fragment_${randomSkill.grade}`;
                nextFragments[fragId] = (nextFragments[fragId] || 0) + v;
                const gradeName = ({ common: "?쇰컲", rare: "吏꾪뭹", epic: "紐낇뭹", legendary: "?꾩꽕", mythic: "?좏솕" } as any)[randomSkill.grade] || "???";
                msg += `\n[?띾뱷] ${gradeName} 鍮꾧툒 議곌컖 ${v}媛?;
              } else if (k === "all_faction") {
                const targetSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
                const grades = Array.from(new Set(targetSkills.map(s => s.grade)));
                grades.forEach(grade => {
                  const fragId = `manual_fragment_${grade}`;
                  nextFragments[fragId] = (nextFragments[fragId] || 0) + v;
                });
                msg += `\n[?띾뱷] 臾명뙆 ?깃툒蹂?鍮꾧툒 議곌컖 媛?${v}媛쒖뵫`;
              } else {
                nextFragments[k] = (nextFragments[k] || 0) + v;
                const gradeKey = k.replace("manual_fragment_", "");
                const gradeName = ({ common: "?쇰컲", rare: "吏꾪뭹", epic: "紐낇뭹", legendary: "?꾩꽕", mythic: "?좏솕" } as any)[gradeKey] || "鍮꾧툒";
                msg += `\n[?띾뱷] ${gradeName} 議곌컖 +${v}媛?;
              }
            });
          }
        }
        
        const finalGoldGain = goldGain + (masterDuel.rewards?.gold || 0);
궗?⑹옄 湲고쉷 ??3)
      // [?ъ꽕怨? 諛⑹뼱??怨듭떇: ?쇳빐 媛먯냼 = 諛⑹뼱??/ (諛⑹뼱??+ 1000)
      const damageReduction = rivalDef / (rivalDef + 1000);
      let baseDamage = Math.floor(playerAtk * (1 - damageReduction));

      // 3. 移섎챸? ?먯젙 (?ъ슜??湲고쉷 ??4)
      let isCrit = false;
      const finalCritRate = faction === "?먯갹?? ? playerCritRate + (fState.critStack || 0) : playerCritRate;
      if (Math.random() < finalCritRate / 100) {
        isCrit = true;
        baseDamage = Math.floor(baseDamage * playerCritDmg);
      }

      let totalDamage = baseDamage;
      let effect = isCrit ? "CRITICAL" : null;

      // --- 諛섍꺽 ??대컢 泥댄겕 (異붽? ?? ---
      const timing = masterDuel.rivalAttackTimer || 0;
      let isCounter = false;
      // 0.85 ~ 1.0 ?ъ씠 (留⑤걹 ?덉슜??遺遺?
      if (timing >= 0.85 && timing <= 1.0) {
        isCounter = true;
        totalDamage = Math.floor(totalDamage * 3.5); // 異붽? 250% = 3.5諛?
        effect = "PARRY"; // UI?먯꽌 諛섍꺽?쇰줈 ?쒖떆
      }

      // 4. 臾명뙆 ?뱀닔 ?④낵 ?곸슜 (?ъ슜??湲고쉷 ??8, 9)
      if (faction === "?붿궛??) {
        fState.comboCount = (fState.comboCount || 0) + 1;
        if (fState.comboCount >= 4) {
          totalDamage *= 2.0;
          fState.comboCount = 0;
        }
        if (isCrit) totalDamage += baseDamage * 0.8;
      }

      if (faction === "臾대떦" && fState.counterReady) {
        totalDamage *= 2.0;
        fState.counterReady = false;
      }
      if (faction === "?먯갹??) {
        fState.critStack = Math.min(10, (fState.critStack || 0) + 2);
        if (Math.random() < 0.3) totalDamage += baseDamage * 0.5;
      }
      if (faction === "怨듬룞?? && Math.random() < 0.15) {
        masterDuel.isStunned = true;
        masterDuel.stunTimer = 1.0;
      }
      if (faction === "怨ㅻ쪣??) {
        fState.slowStack = (fState.slowStack || 0) + 1;
        if (fState.slowStack >= 5) {
          masterDuel.isStunned = true;
          masterDuel.stunTimer = 1.0;
          fState.slowStack = 0;
          effect = "STUN";
        }
      }
      if (faction === "?ъ쿇?밴?") {
        fState.poisonStack = (fState.poisonStack || 0) + 1;
      }

      totalDamage += bonusFlatDamage;
      totalDamage *= damageMultiplier;
      totalDamage = Math.max(totalDamage, playerAtk * 0.05);

      // 蹂댁뒪 ?쇳빐 媛먯뇿 (?쒕갑而?諛⑹? 諛??寃⑷컧 ?좎?)
      const bossMaxHp = masterDuel.rivalMaxHp || rivalHp;
      const bossSoftCap = bossMaxHp * 0.15; // 1?寃⑸떦 蹂댁뒪 泥대젰??15%源뚯?留??뺤긽 ?곕?吏
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

      // 諛섍꺽 ?깃났 ???댄럺??異붽? ?듬낫??寃곌낵 ?곗씠???뺤옣
      result = { totalDamage, isCrit, effect, isCounter };

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

      if (faction === "?쇱썡?좉탳") {
        playerHp = Math.min(get().getTotalHp(), playerHp + totalDamage * 0.1);
        playerMp = Math.min(get().getTotalMp(), playerMp + totalDamage * 0.05);
      }
      if (finalOilRes.buffsTriggered.includes("oil_vampire")) {
        playerHp = Math.min(get().getTotalHp(), playerHp + totalDamage * 0.5);
      }

      const nHp = Math.max(0, rivalHp - totalDamage);
      const nGauge = Math.min(100, (masterDuel.ultimateGauge || 0) + (isWeakness ? 5 : 2));

      if (nHp <= 0) {
        // ?곗냽 泥섏튂 蹂대꼫??怨꾩궛
        let streakBonus = 1.0;
        const currentStreak = masterDuel.streakCount || 0;
        if (currentStreak >= 9) streakBonus = 1.2; // ?대쾲??10?뚯㎏媛 ??
        else if (currentStreak >= 4) streakBonus = 1.1; // ?대쾲??5?뚯㎏媛 ??
        else if (currentStreak >= 2) streakBonus = 1.05; // ?대쾲??3?뚯㎏媛 ??

        const level = masterDuel.selectedLevel;
        // 湲곕낯 蹂댁긽 2諛??곹뼢 (900 -> 1800)
        const baseGold = 1800 * Math.pow(level, 1.2);
        const goldGain = Math.floor(baseGold * streakBonus * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.05));
        const reputationGain = goldGain; // 紐낆꽦???숈씪?섍쾶 ?곸슜

        const expGain = Math.floor(90 * Math.pow(level, 1.1) * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.1));
        const rewardBase = 5 + (level - 1) * 0.7;
        const bossTokenGain = Math.floor(rewardBase);
        const wisdomGain = Math.floor(rewardBase);
        const oilChance = Math.random() < Math.min(0.10, 0.01 + (level * 0.0025));
        const oilKeys = ["oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed", "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire", "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye", "oil_demon", "oil_triple_hit", "oil_formless", "oil_blessed"];
        const oilId = oilChance ? oilKeys[Math.floor(Math.random() * oilKeys.length)] : null;

        const oilNameMap: Record<string, string> = { oil_atk_3: "愿묓룺??, oil_crit_3: "?뚯쿇??, oil_thunder: "?뚯쟾??, oil_poison: "留뚮룆??, oil_bleed: "?덉뿼??, oil_eva_3: "臾댁쁺??, oil_def_3: "媛뺤쿋??, oil_reflect: "諛섑깂??, oil_vajra: "湲덇컯??, oil_vampire: "?≪꽦??, oil_speed_3: "吏덊뭾??, oil_luck_3: "湲곗뿰??, oil_clarity: "泥?챸??, oil_eye: "?곸븞??, oil_demon: "泥쒕쭏??, oil_triple_hit: "?쇱뿰??, oil_formless: "臾댁긽?? };

        let bonusText = streakBonus > 1 ? ` (蹂대꼫??+${Math.round((streakBonus - 1) * 100)}%)` : "";
        let msg = `[泥섎떒 ?꾨즺] ?곗냽 ${currentStreak + 1}??{bonusText}\n湲덊솕 +${goldGain.toLocaleString()}\n紐낆꽦 +${reputationGain.toLocaleString()}\n吏뺥몴 ${bossTokenGain.toLocaleString()}\n?щ뱷 +${wisdomGain.toLocaleString()}\n?섎젴 ?뺤쭊 +${expGain.toLocaleString()}`;
        if (oilId) msg += `\n[?띾뱷] ${oilNameMap[oilId] || oilId}`;
        
        // ????댄깮 ?섏뒪??異붿쟻 (20珥??대궡 ?밸━)
        if (masterDuel.timeLeft >= 20) {
           get().updateQuestProgress("time_attack_win", 1);
        }

        get().updateQuestProgress("reach_duel_rating", 0); // ?깃툒 ?꾨떖 泥댄겕??

        const nextConsumables = { ...s.game.consumables };
        if (oilId) nextConsumables[oilId] = (nextConsumables[oilId] || 0) + 1;

        const nextFragments = { ...(s.game.manualFragments || {}) };
        const nextBonds = { ...(s.game.factionBonds || {}) };
        let nextMaterials = s.game.advancedMaterials || 0;

        // --- 湲곕（ 湲곗뿰(Info) 蹂댁긽 吏湲?---
        if (masterDuel.rewards) {
          const r = masterDuel.rewards;
          if (r.advancedMaterials) nextMaterials += r.advancedMaterials;
          if (r.factionBonds) {
            Object.entries(r.factionBonds).forEach(([f, v]: any) => {
              nextBonds[f] = (nextBonds[f] || 0) + v;
            });
          }
          if (r.manualFragments) {
            Object.entries(r.manualFragments).forEach(([k, v]: any) => {
              if (k === "random_faction") {
                const targetSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
                const randomSkill = targetSkills[Math.floor(Math.random() * targetSkills.length)];
                const fragId = `manual_fragment_${randomSkill.grade}`;
                nextFragments[fragId] = (nextFragments[fragId] || 0) + v;
                const gradeName = ({ common: "?쇰컲", rare: "吏꾪뭹", epic: "紐낇뭹", legendary: "?꾩꽕", mythic: "?좏솕" } as any)[randomSkill.grade] || "???";
                msg += `\n[?띾뱷] ${gradeName} 鍮꾧툒 議곌컖 ${v}媛?;
              } else if (k === "all_faction") {
                const targetSkills = MARTIAL_COMPENDIUM.filter(sk => sk.factionName === faction);
                // 紐⑤뱺 ?깃툒?????議곌컖 吏湲?(以묐났 ?쒓굅)
                const grades = Array.from(new Set(targetSkills.map(s => s.grade)));
                grades.forEach(grade => {
                  const fragId = `manual_fragment_${grade}`;
                  nextFragments[fragId] = (nextFragments[fragId] || 0) + v;
                });
                msg += `\n[?띾뱷] 臾명뙆 ?깃툒蹂?鍮꾧툒 議곌컖 媛?${v}媛쒖뵫`;
              } else {
                nextFragments[k] = (nextFragments[k] || 0) + v;
                msg += `\n[?띾뱷] 鍮꾧툒 議곌컖 ${v}媛?;
              }
            });
          }
        }
        const nextLevel = level + 1;
        const nextMaxLevel = Math.max(masterDuel.currentLevel, nextLevel);
        const nextEnemy = generateEnemy(nextLevel);

        result = { totalDamage, isCrit, effect, isCounter: false };
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
            advancedMaterials: nextMaterials,
            factionBonds: nextBonds,
            oilBuffs: nextBuffs,
            masterDuel: {
              ...nextMD,
              isPlaying: false,
              isGiruEncounter: false, // 湲곗뿰 醫낅즺
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
              streakCount: (masterDuel.challengeTickets === 0) ? 0 : currentStreak + 1, // 0媛쒓? ?섎㈃ 珥덇린??
              lastAttackTime: now
            }
          }
        };
      }

      result = { totalDamage, isCrit, effect, isCounter: false };
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

    // ?⑥젙 ?誘몄?: ?낆쟻 怨듦꺽??* 諛곗닔 * 諛⑹뼱??蹂댁젙
    const rawDmg = Math.floor(rivalAtk * multiplier * defenseMultiplier);
    const finalDmg = Math.max(rawDmg, Math.floor(rivalAtk * 0.5));

    set((s: any) => ({
      game: {
        ...s.game,
        hp: Math.max(0, s.game.hp - finalDmg),
        masterDuel: {
          ...s.game.masterDuel,
          damageTakenAccumulator: finalDmg,
          lastEffect: "BLEED" // ?쒓컖?곸쑝濡?遺됯쾶 諛섏쭩?대룄濡??ㅼ젙
        }
      }
    }));

    // ?뱁뙣 泥댄겕
    if (get().game.hp <= 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "?⑥젙??鍮좎졇 移섎챸?곸쓣 ?낆뿀?듬땲??(?⑤같)" }
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
        if (s.game.realm === "?꾨?") percent = 8;
        else if (s.game.realm === "?쇰쪟") percent = 6.5;
        else if (s.game.realm === "?대쪟") percent = 5;
        else if (s.game.realm === "?쇰쪟") percent = 3;
        else if (s.game.realm === "?덉젙") percent = 1;
        else percent = 0.5;

        const cur = REALM_SETTINGS[s.game.realm];
        const nxt = REALM_SETTINGS[realms[rIdx + 1]] || cur;

        // [?섏젙] ?ㅼ쓬 '?????꾨땲???ㅼ쓬 '寃쎌?' ?꾨떖源뚯? ?꾩슂???붿뿬 ?숇젴??湲곗??쇰줈 蹂寃?
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
      (s.skillId.includes("蹂대쾿") || s.skillId.includes("?좊쾿") || s.skillId.includes("蹂?)) &&
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
    if (!item) return { success: false, message: "?λ퉬瑜?李얠쓣 ???놁뒿?덈떎." };

    const curLv = item.enhancement || 0;
    const realmIdx = REALM_ORDER.indexOf(item.realm || "?꾨?");
    const rSettings = REALM_SETTINGS[item.realm || "?꾨?"] || REALM_SETTINGS["?꾨?"];
    const rMult = rSettings.rewardMultiplier || 1;
    const starFactor = 1 + (game.star - 1) * 0.1;

    const tierMultiplier = item.tier === "?좉린" ? 5 : item.tier === "蹂닿뎄" ? 2.5 : item.tier === "紐낇뭹" ? 1.5 : 1;

    let goldCost, repCost, stoneCost;
    if ((item.realm || "?꾨?") === "?꾨?") {
      goldCost = 5000;
      repCost = 5000;
      stoneCost = 5;
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
      if (game.coins < goldCost) return { success: false, message: "湲덊솕媛 遺議깊빀?덈떎." };
      if (game.reputation < repCost) return { success: false, message: "紐낆꽦??遺議깊빀?덈떎." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "媛뺥솕?앹씠 遺議깊빀?덈떎." };
    }
    if (useBlessedOil && (game.consumables["oil_blessed"] || 0) <= 0) return { success: false, message: "異뺣났諛쏆? 湲곕쫫??遺議깊빀?덈떎." };
    if (useHeavenlyTalisman && (game.consumables["charm_luck"] || 0) <= 0) return { success: false, message: "泥쒖슫??遺?곸씠 遺議깊빀?덈떎." };

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
            // 紐⑤뱺 ?λ젰移섏뿉 ???異붿쿇 1踰?怨듭떇 (* 1.15 + 5) ?곸슜
            const nextAtk = w.attackBonus ? Math.floor(w.attackBonus * 1.15) + 5 : w.attackBonus;
            const nextDef = w.defenseBonus ? Math.floor(w.defenseBonus * 1.15) + 5 : w.defenseBonus;
            const nextHp = w.hpBonus ? Math.floor(w.hpBonus * 1.15) + 5 : w.hpBonus;
            
            // ?쒕뜡 ?듭뀡?ㅼ? 0.1%???뺤쭅?섍쾶 利앷?
            const nextOptions = (w.randomOptions || []).map((o: any) => {
              const nextVal = Number(((o.value || 0) + 0.1).toFixed(1));
              const baseLabel = o.label.split(" +")[0];
              return {
                ...o,
                value: nextVal,
                label: `${baseLabel} +${nextVal}%`
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
              description: nextAtk ? `怨듦꺽 +${nextAtk}` : w.description
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
    // ?쒗넗由ъ뼹 ?④퀎 ?먮룞 ?꾪솚? TutorialOverlay ?먮뒗 ForgePanel?먯꽌 泥섎━?섎룄濡??쒓굅 (寃곌낵 ?뺤씤 ?④퀎瑜??꾪빐)

    get().updateQuestProgress("enhance_item", 1);
    let failMsg = "媛뺥솕???ㅽ뙣?덉뒿?덈떎.";
    if (curLv >= 11) {
      failMsg = useHeavenlyTalisman
        ? "媛뺥솕???ㅽ뙣?덉쑝??泥쒖슫??遺?곸씠 ?④퀎 ?섎씫??諛⑹뼱?덉뒿?덈떎."
        : "媛뺥솕???ㅽ뙣?섏뿬 媛뺥솕 ?④퀎媛 ?섎씫?덉뒿?덈떎.";
    }
    const successMsg = isTutorial 
      ? `臾대챸泥좉? +${curLv + 1}媛?媛뺥솕 ?깃났! (怨듦꺽??10 ??22)`
      : `${curLv + 1}媛?媛뺥솕 ?깃났!`;
    return { success, message: success ? successMsg : failMsg };
  },

  rerollWeaponOptions: (itemId: string, lockedOptionIndex?: number) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "?λ퉬瑜?李얠쓣 ???놁뒿?덈떎." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "?꾨?");
    const isPaewang = item.tier === "?좉린" || item.name.includes("[?⑥솗]");

    let repCost, stoneCost;
    if ((item.realm || "?꾨?") === "?꾨?") {
      repCost = 5000;
      stoneCost = 5;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(30000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(10 * stoneScale);
    }

    // ?듭뀡 怨좎젙 ??鍮꾩슜 2諛?
    if (lockedOptionIndex !== undefined) {
      repCost *= 2;
      stoneCost *= 2;
    }

    const stepId = game.tutorialProgress.currentStepId;
    const isTutorial = stepId === "click_reroll_start" || stepId === "check_reroll_result";
    
    if (!isTutorial) {
      if (game.reputation < repCost) return { success: false, message: "紐낆꽦??遺議깊빀?덈떎." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "媛뺥솕?앹씠 遺議깊빀?덈떎." };
    }

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          // ?쒗넗由ъ뼹 以묒뿉??臾댁“嫄??좉린 ?깃툒 ?섏????됱슫(500) 遺?ы븯??理쒖긽湲??듭뀡 3媛??댁긽 蹂댁옣
          let rolled = rollTierAndOptions(
            w, 
            realmIdx, 
            isTutorial ? 500 : get().getTotalLuck(), 
            realmIdx,
            isTutorial ? "紐낇뭹" : undefined,
            lockedOptionIndex // 怨좎젙 ?듭뀡 ?몃뜳???꾨떖
          );
          
          // ?쒗넗由ъ뼹 以묒씠硫??뺤떎???듭뀡??諛붾?寃껋쓣 蹂댁뿬二쇨린 ?꾪빐 媛뺤젣濡??덈줈???듭뀡 ?명듃 二쇱엯
          if (isTutorial) {
            rolled.randomOptions = [
              { stat: "atk_pct", label: "怨듦꺽??, value: 15, grade: "理쒖긽湲? },
              { stat: "crit_rate", label: "移섎챸? ?뺣쪧", value: 5, grade: "理쒖긽湲? },
              { stat: "crit_dmg", label: "移섎챸? ?쇳빐", value: 20, grade: "理쒖긽湲? }
            ];
          }
          return { ...rolled, enhancement: w.enhancement };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    get().updateQuestProgress("refine_item", 1);
    return { success: true, message: "湲곗뿰 ?ъ뿰留??깃났!" };
  },

  infuseSoul: (itemId: string, type: string) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "?λ퉬瑜?李얠쓣 ???놁뒿?덈떎." };
    if ((item.enhancement || 0) < 10) return { success: false, message: "10媛??댁긽 ?λ퉬留?媛?ν빀?덈떎." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "?꾨?");
    const isPaewang = item.tier === "?좉린" || item.name.includes("[?⑥솗]");

    let repCost, stoneCost;
    if ((item.realm || "?꾨?") === "?꾨?") {
      repCost = 5000;
      stoneCost = 5;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(200000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(100 * stoneScale);
    }

    if (game.reputation < repCost) return { success: false, message: "紐낆꽦??遺議깊빀?덈떎." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "媛뺥솕?앹씠 遺議깊빀?덈떎." };

    const souls: Record<string, any> = {
      vampire: { name: "?≪꽦?踰?, desc: "怨듦꺽 ??HP??2% ?뚮났" },
      haste: { name: "?좊쾿媛??, desc: "?ㅽ궗 荑⑦???20% 媛먯냼" },
      destruct: { name: "?뚮㈇???쇨꺽", desc: "諛⑹뼱??臾댁떆 ?쇳빐 諛쒖깮" }
    };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) return { ...w, soulEffect: souls[type] };
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `${souls[type].name} ?곹샎 二쇱엯 ?깃났!` };
  },

  applyOil: (itemId: string, oilId: ConsumableId) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "?λ퉬瑜?李얠쓣 ???놁뒿?덈떎." };
    if ((game.consumables[oilId] || 0) <= 0) return { success: false, message: "湲곕쫫??遺議깊빀?덈떎." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "?꾨?");
    const isPaewang = item.tier === "?좉린" || item.name.includes("[?⑥솗]");

    let repCost, stoneCost;
    if ((item.realm || "?꾨?") === "?꾨?") {
      repCost = 5000;
      stoneCost = 5;
    } else {
      const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
      repCost = Math.floor(80000 * repScale);
      const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
      stoneCost = Math.round(20 * stoneScale);
    }

    const stepId = game.tutorialProgress.currentStepId;
    const isTutorial = stepId === "click_infuse_start" || stepId === "check_forge_result";

    if (!isTutorial) {
      if (game.reputation < repCost) return { success: false, message: "紐낆꽦??遺議깊빀?덈떎." };
      if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "媛뺥솕?앹씠 遺議깊빀?덈떎." };
    }

    const oilNames: Record<string, string> = {
      oil_atk_3: "愿묓룺??, oil_crit_3: "?뚯쿇??, oil_thunder: "?뚯쟾??, oil_poison: "留뚮룆??, oil_bleed: "?덉뿼??,
      oil_eva_3: "臾댁쁺??, oil_def_3: "媛뺤쿋??, oil_reflect: "諛섑깂??, oil_vajra: "湲덇컯??, oil_vampire: "?≪꽦??,
      oil_speed_3: "吏덊뭾??, oil_luck_3: "湲곗뿰??, oil_clarity: "泥쒕챸??, oil_eye: "?곸븞??,
      oil_demon: "泥쒕쭏??, oil_triple_hit: "?쇱뿰??, oil_formless: "臾댁긽??
    };

    const oilDetails: Record<string, { chance: number, desc: string }> = {
      oil_atk_3: { chance: 2, desc: "2% ?뺣쪧濡?怨듦꺽??3諛?(5珥?" },
      oil_crit_3: { chance: 2, desc: "2% ?뺣쪧濡?移섎뙋 3諛?(5珥?" },
      oil_thunder: { chance: 5, desc: "5% ?뺣쪧濡?500% ?誘몄? + 湲곗젅" },
      oil_poison: { chance: 5, desc: "5% ?뺣쪧濡???諛⑹뼱??50% 媛먯냼 (10珥?" },
      oil_bleed: { chance: 5, desc: "5% ?뺣쪧濡?異쒗삁 (理쒕? HP 10% 吏?랁뵾??" },
      oil_eva_3: { chance: 5, desc: "5% ?뺣쪧濡??뚰뵾??3諛?(10珥?" },
      oil_def_3: { chance: 7, desc: "7% ?뺣쪧濡?紐⑤뱺 ?쇳빐 50% 媛먯냼 (10珥?" },
      oil_reflect: { chance: 7, desc: "7% ?뺣쪧濡?諛쏆? ?쇳빐 200% 諛섏궗 (10珥?" },
      oil_vajra: { chance: 5, desc: "5% ?뺣쪧濡?5珥덇컙 臾댁쟻 ?곹깭" },
      oil_vampire: { chance: 5, desc: "5% ?뺣쪧濡??誘몄? 50% ?≫삁" },
      oil_speed_3: { chance: 5, desc: "5% ?뺣쪧濡?怨듭냽 2諛?(10珥?" },
      oil_luck_3: { chance: 5, desc: "5% ?뺣쪧濡??꾨━???깃툒 ?곸듅 ?뺣쪧 利앷?" },
      oil_clarity: { chance: 8, desc: "8% ?뺣쪧濡??곸씠??利됱떆 ?댁젣" },
      oil_eye: { chance: 15, desc: "15% ?뺣쪧濡??곸쓽 怨듦꺽 諛섎뱶???뚰뵾" },
      oil_demon: { chance: 2, desc: "2% ?뺣쪧濡??쇨꺽?꾩궡(1000% ?誘몄?) 諛쒕룞" },
      oil_triple_hit: { chance: 5, desc: "5% ?뺣쪧濡?3諛??고? 怨듦꺽 諛쒕룞" },
      oil_formless: { chance: 3, desc: "3% ?뺣쪧濡????꾩옱 泥대젰 10% 利됱떆 ??컧" }
    };

    set((s: any) => {
      const nextConsumables = { ...s.game.consumables, [oilId]: s.game.consumables[oilId] - 1 };
      const updatedWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          const detail = oilDetails[oilId] || { chance: 15, desc: "諛쒕룞 ???뱀닔 ?④낵" };
          return {
            ...w,
            oilEffect: {
              label: `${oilNames[oilId]}: ${detail.desc}`,
              key: oilId,
              chance: detail.chance
            }
          };
        }
        // [留덉씠洹몃젅?댁뀡] 湲곗〈 泥쒕쭏???쇱뿰???꾩씠?쒕뱾 ?섏튂 理쒖떊??
        if (w.oilEffect?.key === "oil_demon") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 2,
              label: "泥쒕쭏?? [泥쒕쭏] 怨듦꺽 ??2% ?뺣쪧濡??쇨꺽?꾩궡(1000% ?誘몄?) 諛쒕룞"
            }
          };
        }
        if (w.oilEffect?.key === "oil_triple_hit") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 5,
              label: "?쇱뿰?? 5% ?뺣쪧濡?3諛??고? 怨듦꺽 諛쒕룞"
            }
          };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          consumables: nextConsumables,
          ownedWeapons: updatedWeapons
        }
      };
    });

    get().triggerSave(true);
    // ?쒗넗由ъ뼹 ?④퀎 ?먮룞 ?꾪솚? TutorialOverlay ?먮뒗 ForgePanel?먯꽌 泥섎━?섎룄濡??쒓굅

    get().updateQuestProgress("apply_oil", 1);
    return { success: true, message: `${oilNames[oilId]} 二쇱엯 ?깃났!` };
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

      // ?ㅽ겕由곗꺑 湲곗? 怨듭떇 ?뺣쪧 ?곸슜

      // 臾댁긽?? 3% ?뺣쪧 ???꾩옱 泥대젰 10% ??컧
      if (oil.key === "oil_formless" && Math.random() < 0.03) buffsToTrigger.push("oil_formless");

      // ?쇱뿰?? 5% ?뺣쪧 3?고?
      if (oil.key === "oil_triple_hit" && Math.random() < 0.05) {
        hitCount = 3;
        buffsToTrigger.push("oil_triple_hit");
      }

      // 泥쒕쭏?? 2% ?뺣쪧濡?1000% ?誘몄?
      if (oil.key === "oil_demon" && Math.random() < 0.02) buffsToTrigger.push("oil_demon");

      // ?뚯쿇??移섎챸3諛?: 2%
      if (oil.key === "oil_crit_3" && Math.random() < 0.02) buffsToTrigger.push("oil_crit_3");

      // 愿묓룺??怨듦꺽3諛?: 2%
      if (oil.key === "oil_atk_3" && Math.random() < 0.02) buffsToTrigger.push("oil_atk_3");

      // 臾댁쁺???뚰뵾3諛?: 5%
      if (oil.key === "oil_eva_3" && Math.random() < 0.05) buffsToTrigger.push("oil_eva_3");

      // 媛뺤쿋???쇳빐媛먯냼 50%): 7%
      if (oil.key === "oil_def_3" && Math.random() < 0.07) buffsToTrigger.push("oil_def_3");

      // 諛섑깂??200% 諛섏궗): 7%
      if (oil.key === "oil_reflect" && Math.random() < 0.07) buffsToTrigger.push("oil_reflect");

      // 吏덊뭾??怨듭냽 2諛?: 5%
      if (oil.key === "oil_speed_3" && Math.random() < 0.05) buffsToTrigger.push("oil_speed_3");

      // 湲곗뿰?? 5%
      if (oil.key === "oil_luck_3" && Math.random() < 0.05) buffsToTrigger.push("oil_luck_3");

      // ?뚯쟾?? 5% ?뺣쪧濡?500% ?誘몄? + 湲곗젅
      if (oil.key === "oil_thunder" && Math.random() < 0.05) buffsToTrigger.push("oil_thunder");

      // 留뚮룆?? 5% ?뺣쪧 ??諛⑹뼱??50% 媛먯냼
      if (oil.key === "oil_poison" && Math.random() < 0.05) buffsToTrigger.push("oil_poison");

      // ?덉뿼?? 5% ?뺣쪧 異쒗삁
      if (oil.key === "oil_bleed" && Math.random() < 0.05) buffsToTrigger.push("oil_bleed");

      // 湲덇컯?? 5% ?뺣쪧 5珥?臾댁쟻
      if (oil.key === "oil_vajra" && Math.random() < 0.05) buffsToTrigger.push("oil_vajra");

      // ?≪꽦?? 5% ?뺣쪧 50% ?≫삁
      if (oil.key === "oil_vampire" && Math.random() < 0.05) buffsToTrigger.push("oil_vampire");

      // ?곸븞?? 15% ?뺣쪧濡???怨듦꺽 ?뚰뵾
      if (oil.key === "oil_eye" && Math.random() < 0.15) buffsToTrigger.push("oil_eye");

      // 泥?챸?? 8% ?뺣쪧 利됱떆 ?뚮났
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

  claimDuelReward: () => set((s: any) => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false } } })),
  markInnEntryHandled: () => set((s: any) => ({ game: { ...s.game, pendingInnEntry: false } })),
  useSkill: (name: string) => {
    const { game } = get();
    const skBase = game.learnedSkills.find((s: any) => s.name === name);
    if (!skBase) return;

    // ?꾧컧?먯꽌 ?먮낯 ?곗씠??媛?몄삤湲?(????먮퀎 ?뺥솗???μ긽)
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

    // 蹂대쾿/?좊쾿 怨꾩뿴??寃쎌슦 踰꾪봽 ?몃━嫄?(?대쫫??'蹂???'?좊쾿'???ы븿??寃쎌슦???ы븿?섏뿬 ?댄깮 濡쒖쭅 ?꾩쟾 李⑤떒)
    const isMovement = (sk as any).skillType === "movement" || (sk as any).type === "movement" || (sk as any).category === "movement" || name.includes("蹂?) || name.includes("?좊쾿");

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
                description: buffData ? buffData.description : "蹂대쾿 諛쒕룞",
                timeLeft: buffData ? buffData.duration : 3.0
              }
            }
          }
        }));
        // 1珥????댄럺???쒓굅
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

    // 怨듦꺽 臾닿났??寃쎌슦 ?誘몄? ?곸슜 諛??곕쭏???④낵 ?몃━嫄?
    if (game.masterDuel.isPlaying) {
      const oilRes = get().triggerOilEffects();
      const faction = game.faction;
      const masterDuel = game.masterDuel;
      const fState = { ...(masterDuel.factionState || {}) };

      // 1. 湲곗큹 怨듦꺽??諛??ㅽ꺈 蹂댁젙
      const statMult = fState.statMult || 1.0;
      let playerAtk = get().getTotalAttack() * statMult;
      let playerCritRate = get().getTotalCritRate();
      let playerCritDmg = get().getTotalCritDmg() / 100;

      // 2. 臾닿났 ?먯껜 諛곗닔 諛??깃툒(Refinement) 蹂댁젙
      const learned = game.martialArtsSkills.find(ms => ms.skillId === (sk as any).id || ms.skillId === (sk as any).skillId);
      const stars = learned?.stars || 0;
      const refineMult = getRefineBonusMultiplier(stars);
      const baseMultiplier = sk.multiplier || 3;
      const totalMultiplier = baseMultiplier * refineMult;

      // 3. 諛⑹뼱??諛?愿??蹂댁젙
      let rivalDef = masterDuel.rivalDef || 0;
      if (faction === "?④턿?멸?") rivalDef = 0; // ?④턿?멸?: 臾닿났 ??諛⑹뼱 臾댁떆
      if (faction === "?쇱썡?좉탳") rivalDef *= 0.5;
      const defenseMultiplier = 100 / (100 + Math.max(0, rivalDef));

      let dmg = playerAtk * totalMultiplier * defenseMultiplier;

      // 4. 移섎챸? ?먯젙
      if (faction === "泥?꽦??) playerCritRate += (fState.nextCritBonus || 0);
      let isCrit = Math.random() < playerCritRate / 100;
      if (isCrit) dmg *= playerCritDmg;

      // 5. 臾명뙆蹂??뱀닔 蹂댁젙
      let damageMultiplier = 1.0;
      if (faction === "泥쒕쭏?좉탳") {
        damageMultiplier *= 5.0; // 泥쒕쭏?좉탳: 臾닿났 諛쒕룞 ???쇳빐 5諛?
        fState.nextCritBonus = 20; // 5珥덇컙 移섎챸???+20% (媛꾨왂??
      }
      if (faction === "?섎턿?쎄?") damageMultiplier *= 1.5; // ?섎턿?쎄?: 臾닿났 ?쇳빐 利앷?

      // 6. ?곕쭏???뱀닔 ?④낵
      let ohkMult = 1;
      if (oilRes.buffsTriggered.includes("oil_thunder")) ohkMult += 5;
      if (oilRes.buffsTriggered.includes("oil_demon")) ohkMult += 10;

      let totalDmg = dmg * damageMultiplier * ohkMult;

      set((s: any) => {
        const nextBuffs = { ...(s.game.oilBuffs || {}) };
        const nextMD = { ...s.game.masterDuel };

        // ?곕쭏??踰꾪봽 ?곸슜 (?ㅽ궗?먯꽌???숈씪?섍쾶 踰꾪봽 諛쒖깮)
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
          text: "諛쏆븘?? ?ㅻ뒛????留덉?留?諛ㅼ씠??",
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
          text: "?섏갖? ?섎줈????爰얠? 紐삵븳??",
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
  syncToCloud: async () => {
    const { isSyncingFromCloud } = get();
    if (isSyncingFromCloud) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Firebase Firestore??吏곸젒 ???
      await saveGameToFirebase(user.id, get().game);
      console.log("?대씪?곕뱶(Firebase) ?숆린???깃났");
    } catch (e) {
      console.warn("?대씪?곕뱶 ?숆린??以??먮윭 諛쒖깮:", e);
      get().triggerSave(true); // ?ㅽ뙣 ??濡쒖뺄?먮씪?????
    }
  },
  syncFromCloud: async () => {
    set({ isSyncingFromCloud: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cloudData = await loadGameFromFirebase(user.id);
      if (cloudData && cloudData.realm) {
        set((s: any) => ({ game: { ...s.game, ...cloudData, isInitialized: true } }));
        saveGame(get().game);
        console.log("?대씪?곕뱶(Firebase) ?곗씠??濡쒕뱶 ?깃났");
      } else {
        // ?대씪?곕뱶???곗씠?곌? ?녿뒗 寃쎌슦 (?좉퇋 ?좎?)
        // 濡쒖뺄 ?곗씠?곌? ?대? ?덈떎硫?寃쎌???泥섏튂?섍? ?덈떎硫? 珥덇린?뷀븯吏 ?딄퀬 ?대씪?곕뱶濡??낅줈???쒕룄
        const currentLocal = get().game;
        if (currentLocal.totalDummyKills > 0 || currentLocal.realm !== "?꾨?") {
          console.log("?대씪?곕뱶 ?곗씠???놁쓬 - ?꾩옱 濡쒖뺄 ?곗씠?곕? ?대씪?곕뱶??蹂댁〈?⑸땲??");
          await saveGameToFirebase(user.id, currentLocal);
        } else {
          console.log("?좉퇋 ?좎?濡?媛먯??섏뼱 珥덇린?뷀빀?덈떎.");
          set((s: any) => ({ game: { ...defaultGameData, isInitialized: true } }));
          saveGame(get().game);
        }
      }
    } catch (e) {
      console.warn("?곗씠??遺덈윭?ㅺ린 以??먮윭 諛쒖깮:", e);
    } finally {
      set({ isSyncingFromCloud: false });
    }
  }, resetGame: async () => {
    if (typeof window !== "undefined") {
      // 1. ?대씪?곕뱶 ?곗씠??珥덇린???쒕룄
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveGameToFirebase(user.id, defaultGameData);
          console.log("?대씪?곕뱶 ?곗씠??珥덇린???깃났");
        }
      } catch (e) {
        console.error("?대씪?곕뱶 珥덇린???ㅽ뙣:", e);
      }

      // 2. 硫붾え由??곹깭 珥덇린??
      set({ game: { ...defaultGameData, isInitialized: true } });

      // 3. 紐⑤뱺 踰꾩쟾???몄씠釉?????젣
      for (let i = 1; i <= 20; i++) {
        localStorage.removeItem(`murimbook-game-save-v${i}`);
      }
      localStorage.removeItem("murimbook-game-save");

      // 4. ?섏씠吏 ?덈줈怨좎묠
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
    const enemy = generateTowerEnemy(floor);
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
          enemy: enemy,
          eventRoom: null,
          pendingBuffChoices: null,
          pendingArtifactChoices: null,
          startTime: Date.now()
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
    const { game } = get();
    const tower = game.tower;
    if (!tower.isInside || !tower.enemy || tower.eventRoom || tower.pendingBuffChoices || tower.pendingArtifactChoices) return;

    set((s: any) => {
      const t = s.game.tower;
      const enemy = t.enemy!;
      const now = Date.now();

      // 肄ㅻ낫 濡쒖쭅 (1.5珥??대궡 ????肄ㅻ낫 ?좎?)
      let nextCombo = (now - t.lastTapTime < 1500) ? t.combo + 1 : 1;

      // 臾댄븳???λ젰移??뺤긽?? Baseline???꾩옱 痢듭닔 媛以묒튂 遺??
      let atk = 2500 + (t.currentFloor * 200);
      let critRate = 15;
      let critDmg = 2.0;
      let vamp = 0;
      let mpRecover = 0;

      // 1. 踰꾪봽 ?④낵 ?곸슜
      t.activeBuffs.forEach((b: any) => {
        if (b.bonus.atk) atk *= b.bonus.atk;
        if (b.bonus.critRate) critRate += b.bonus.critRate;
        if (b.bonus.vamp) vamp += b.bonus.vamp;
        if (b.penalty.atk) atk *= b.penalty.atk;
      });

      // 2. ?좊Ъ ?④낵 ?곸슜 (Artifacts)
      let extraDmg = 0;
      t.artifacts.forEach((art: any) => {
        if (art.effect.type === "LIFE_STEAL") vamp += art.effect.value;
        if (art.effect.type === "MP_RESTORE") mpRecover += art.effect.value;
        if (art.effect.type === "COMBO_BOLT" && nextCombo % 10 === 0) {
          extraDmg += atk * art.effect.value;
        }
      });

      if (Math.random() < (enemy.eva - (enemy.ignoreEva || 0)) / 100) {
        return { game: { ...s.game, tower: { ...t, lastTapTime: now, combo: nextCombo, lastReward: "鍮쀫굹媛?" } } };
      }

      const defenseMultiplier = 100 / (100 + enemy.def);
      let isCrit = Math.random() < (critRate - (enemy.critRes || 0)) / 100;
      let damage = Math.floor(atk * defenseMultiplier * (isCrit ? critDmg : 1)) + (bonusDmg || 0) + extraDmg;

      if (enemy.traits.includes("?쇳빐 ?곹븳")) {
        damage = Math.min(damage, enemy.maxHp * 0.1);
      }

      let rivalHp = Math.max(0, enemy.hp - damage);
      let playerHp = t.hp;
      let nextMp = Math.min(get().getTotalMp(), s.game.mp + (get().getTotalMp() * (mpRecover / 100)));

      if (vamp > 0) playerHp = Math.min(t.maxHp, playerHp + damage * (vamp / 100));

      if (enemy.reflect > 0 && Math.random() < 0.2) {
        playerHp = Math.max(0, playerHp - damage * (enemy.reflect / 100));
      }

      if (rivalHp <= 0) {
        const floor = t.currentFloor;
        const nextFloor = floor + 1;
        const highestFloor = Math.max(t.highestFloor, floor);
        const goldReward = floor * 5000;
        get().updateQuestProgress("tower_floor", 1);

        let event: any = null;
        let pendingBuffs: any = null;
        let pendingArtifacts: any = null;

        // 蹂댁긽 遺꾧린: 10痢듬쭏???좊Ъ, 5痢듬쭏??踰꾪봽, 洹????쒕뜡 ?대깽??
        if (floor % 10 === 0) {
          const luck = get().getTotalLuck();
          const getWeight = (art: any) => {
            if (art.tier === "LEGENDARY") return 5 + luck * 0.2;
            if (art.tier === "RARE") return 30 + luck * 0.5;
            return 100;
          };
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
          pendingArtifacts = selected;
        } else if (floor % 5 === 0) {
          const pool = [...TOWER_BUFF_POOL].sort(() => 0.5 - Math.random());
          pendingBuffs = pool.slice(0, 3);
        } else if (Math.random() < 0.25) {
          const rooms: ("REST" | "BUFF" | "DANGER" | "MERCHANT")[] = ["REST", "BUFF", "DANGER", "MERCHANT"];
          event = rooms[Math.floor(Math.random() * rooms.length)];
        }

        const nextEnemy = event || pendingBuffs || pendingArtifacts ? null : generateTowerEnemy(nextFloor);

        return {
          game: {
            ...s.game,
            lastActivityHeartbeat: now,
            mp: nextMp,
            coins: s.game.coins + goldReward,
            tower: {
              ...t,
              currentFloor: nextFloor,
              highestFloor,
              hp: playerHp,
              combo: 0,
              lastTapTime: 0,
              enemy: nextEnemy,
              eventRoom: event,
              pendingBuffChoices: pendingBuffs,
              pendingArtifactChoices: pendingArtifacts,
              lastReward: `??${floor}痢??뚰뙆! 湲덊솕 +${goldReward.toLocaleString()}`,
              lastClearFloor: floor
            }
          }
        };
      }

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
            enemy: { ...enemy, hp: rivalHp }
          }
        }
      };
    });
  },
  updateTower: (dt: number) => {
    const now = Date.now();
    set((s: any) => {
      const t = s.game.tower;
      if (!t.isInside || !t.enemy || t.eventRoom || t.pendingBuffChoices || t.pendingArtifactChoices) return s;
      const enemy = t.enemy!;
      const theme = getTowerTheme(t.currentFloor);

      // ?ㅻ뱶 ??대㉧ 泥섎━
      const nextShieldTimer = Math.max(0, (t.shieldTimer || 0) - dt);

      // ?섍꼍 ?誘몄?/?④낵 ?곸슜 (dt留덈떎 ?꾩쟻)
      let envDmg = 0;
      if (theme.effect === "burn" && nextShieldTimer <= 0) envDmg = t.maxHp * 0.005 * dt;

      const attackTimer = (s.towerAttackTimer || 0) + dt;
      if (attackTimer < 1.5) {
        if (envDmg > 0) {
          const nHp = Math.max(1, t.hp - envDmg); // ?섍꼍 ?誘몄?濡쒕뒗 二쎌? ?딆쓬
          return { towerAttackTimer: attackTimer, game: { ...s.game, tower: { ...t, hp: nHp } } };
        }
        return { towerAttackTimer: attackTimer };
      }

      let dmg = enemy.atk;
      const def = get().getTotalDefense();
      const defMult = 100 / (100 + def);
      let finalDmg = Math.floor(dmg * defMult);

      t.activeBuffs.forEach((b: any) => {
        if (b.penalty.def) finalDmg /= b.penalty.def;
        if (b.penalty.dmgTaken) finalDmg *= b.penalty.dmgTaken;
      });

      // ?ㅻ뱶 ?쒖꽦??以묒씠硫??誘몄? 臾댄슚
      if (nextShieldTimer > 0) finalDmg = 0;

      // ?ㅻ뱶 ?좊Ъ(?⑷툑 媛묒＜) ?몃━嫄?泥댄겕
      let triggerShield = false;
      const shieldArt = t.artifacts.find((a: any) => a.effect.type === "SHIELD");
      if (shieldArt && nextShieldTimer <= 0 && finalDmg > 0) {
        if (Math.random() < (shieldArt.effect.chance || 10) / 100) {
          triggerShield = true;
        }
      }

      const shieldDuration = triggerShield ? (shieldArt.effect.value + (def / 10000)) : nextShieldTimer;

      if (enemy.lifeSteal > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + finalDmg * (enemy.lifeSteal / 100));
      }

      let nextHp = Math.max(0, t.hp - finalDmg - envDmg);
      let reward = t.lastReward;
      if (triggerShield) reward = "?⑷툑 媛묒＜??湲곗슫??蹂댄샇留됱쓣 ?뺤꽦?덉뒿?덈떎!";

      // 遺???좊Ъ(留뚮뀈?? 泥댄겕
      if (nextHp <= 0) {
        const artifact = t.artifacts.find((a: any) => a.effect.type === "INSTANT_HP");
        if (artifact) {
          nextHp = t.maxHp;
          // ??踰??곕㈃ ?쒓굅? ?뱀? 荑⑤떎?? ?ш린?쒕뒗 痢듬떦 1?뚯씠誘濡??쇰떒 artifacts?먯꽌 ?대떦 痢듭뿉?쒕쭔 ?????덇쾶 flag 泥섎━?섍굅??..
          // ?ш린?쒕뒗 媛꾨떒?섍쾶 artifacts?먯꽌 ?쒓굅?섎뒗 寃껋쑝濡?援ы쁽 (?뚮え?덉꽦 ?좊Ъ)
          const nextArtifacts = t.artifacts.filter((a: any) => a.id !== artifact.id);
          return {
            towerAttackTimer: 0,
            game: { ...s.game, lastActivityHeartbeat: now, tower: { ...t, hp: nextHp, artifacts: nextArtifacts, lastReward: "留뚮뀈?쇱쓽 湲곗슫?쇰줈 遺?쒗뻽?듬땲??" } }
          };
        }
      }

      const isDead = nextHp <= 0;

      return {
        towerAttackTimer: 0,
        game: {
          ...s.game,
          lastActivityHeartbeat: now,
          tower: {
            ...t,
            hp: nextHp,
            shieldTimer: shieldDuration,
            isInside: !isDead,
            enemy: isDead ? null : enemy,
            lastReward: isDead ? "?꾩쟾 醫낅즺 (?щ쭩)" : reward
          }
        }
      };
    });
  },

  selectTowerBuff: (buff: any) => {
    set((s: any) => {
      const t = s.game.tower;
      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            activeBuffs: [...t.activeBuffs, buff],
            pendingBuffChoices: null,
            enemy: nextEnemy
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
      let nextCoins = s.game.coins;

      if (type === "REST") {
        nextHp = Math.min(t.maxHp, nextHp + t.maxHp * 0.3);
        nextReward = "?댁떇??痍⑦빐 泥대젰??30% ?뚮났?덉뒿?덈떎.";
      } else if (type === "BUFF") {
        nextReward = "?밸퀎??湲곗슫??諛쏆븘 怨듦꺽?μ씠 ?쇱떆?곸쑝濡??곸듅?⑸땲??";
      } else if (type === "DANGER") {
        nextHp = Math.max(1, nextHp - t.maxHp * 0.2);
        nextReward = "?꾪뿕???⑥젙??鍮좎죱吏留?湲곗뿰???살뿀?듬땲??";
      } else if (type === "MERCHANT") {
        // 鍮꾨? ?곸씤 議곗슦 ??蹂댁긽 (泥대젰 ? ?뚮났 ??
        nextHp = t.maxHp;
        nextReward = "鍮꾨? ?곸씤??留뚮굹 鍮꾩빟??留덉떆怨?泥대젰??紐⑤몢 ?뚮났?덉뒿?덈떎.";
      }

      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          coins: nextCoins,
          tower: {
            ...t,
            hp: nextHp,
            eventRoom: null,
            enemy: nextEnemy,
            lastReward: nextReward
          }
        }
      };
    });
  },

  selectTowerArtifact: (art: any) => {
    set((s: any) => {
      const t = s.game.tower;
      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            artifacts: [...t.artifacts, art],
            pendingArtifactChoices: null,
            enemy: nextEnemy
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
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string, infoTier?: "low" | "mid" | "high" | "special" }) => {
    const { game } = get();

    // --- Gift Action Special Handling ---
    if (actionId === "gift") {
      const giftId = extra?.giftId;
      if (!giftId) return { success: false, message: "?좊Ъ???좏깮?댁＜?몄슂." };

      const giftItem = GIRU_GIFT_ITEMS.find(g => g.id === giftId);
      if (!giftItem) return { success: false, message: "議댁옱?섏? ?딅뒗 ?좊Ъ?낅땲??" };

      if ((game.giruGifts?.[giftId] || 0) <= 0) {
        return { success: false, message: "?대떦 ?좊Ъ??媛吏怨??덉? ?딆뒿?덈떎." };
      }

      const npcData = GIRU_NPCS.find(n => n.id === npcId);
      const isPreferred = npcData?.preferredGifts.includes(giftId);
      const favorGain = (giftItem.bonusFavor || 5) + (isPreferred ? 10 : 0);

      set((s: any) => {
        const nextGifts = { ...(s.game.giruGifts || {}) };
        nextGifts[giftId] -= 1;
        if (nextGifts[giftId] <= 0) delete nextGifts[giftId];

        const nextFavors = { ...(s.game.npcFavors || {}) };
        nextFavors[npcId] = Math.min(100, (nextFavors[npcId] || 0) + favorGain);

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
          ? `${npcData?.name}?섏씠 ?좊Ъ??留ㅼ슦 湲곕퍙?섎ŉ 諛쏆뒿?덈떎! (?멸컧??+${favorGain})`
          : `${npcData?.name}?섏뿉寃??좊Ъ??二쇱뿀?듬땲?? (?멸컧??+${favorGain})`
      };
    }

    const action = GIRU_ACTIONS.find(a => a.id === actionId);
    if (!action) return { success: false, message: "?섎せ???붿껌?낅땲??" };

    // 諛??됰룞 ?쒗븳 泥댄겕
    const limits = game.nightLimits || { giluActionLeft: 5, npcTalkCount: {}, infoTradeUsed: false };

    if (limits.giluActionLeft <= 0) {
      return { success: false, message: "?ㅻ뒛 諛ㅼ뿉?????댁긽 ?뷀뼢猷⑥뿉???쒓컙??蹂대궪 ???놁뒿?덈떎." };
    }

    if (actionId === "info" && limits.infoTradeUsed) {
      return { success: false, message: "?뺣낫 嫄곕옒???섎；諛ㅼ뿉 ??踰덈쭔 媛?ν빀?덈떎." };
    }

    if (actionId === "info" && npcId === "yeonhwa") {
      const tier = extra?.infoTier || "low";
      const conf = INFO_TIER_CONFIG[tier];
      const rBonus = REALM_BONUS_CONFIG[game.realm || "?꾨?"] || { priceMult: 1 };
      const actualCost = Math.floor(conf.basePrice * rBonus.priceMult * getFavorDiscount(favor));

      if (game.coins < actualCost) return { success: false, message: "湲덉쟾??遺議깊빀?덈떎." };

      set((s: any) => {
        // Create NextDayEvent based on tier
        const areas = ["?숈뼇", "?μ븞", "??＜", "?깅룄", "媛쒕큺", "?좎＜"];
        const area = areas[Math.floor(Math.random() * areas.length)];
        const nextDayEvent: any = {
          type: "GIRU_INFO_EVENT",
          tierId: tier,
          tierName: tier === "low" ? "?섍툒 ?뺣낫" : tier === "mid" ? "以묎툒 ?뺣낫" : tier === "high" ? "怨좉툒 ?뺣낫" : "?밴툒 ?뺣낫",
          targetArea: area,
          isUsed: false,
          rewards: {}
        };

        // 蹂댁긽 ?ㅼ젙 (?ъ슜??媛?대뱶 諛섏쁺)
        const rewards: any = {};
        if (tier === "low") {
          rewards.gold = Math.floor(10000 * Math.random() + 5000);
          rewards.advancedMaterials = 2;
          rewards.manualFragments = { manual_fragment_common: 10 };
          nextDayEvent.clueText = `?댁씪 ${area} 吏??뿉???섍툒 鍮꾧툒???⑥꽌瑜?李얠쓣 ???덉쓣 寃껋엯?덈떎.`;
        } else if (tier === "mid") {
          rewards.advancedMaterials = 5;
          rewards.factionBonds = { [game.faction || "臾댁냼??]: 1 };
          rewards.manualFragments = { manual_fragment_rare: 15 };
          nextDayEvent.clueText = `?댁씪 ${area} 吏??뿉??臾명뙆 鍮꾧툒 議곌컖怨??몄뿰???ㅻ쭏由ш? 諛쒓껄???덉젙?낅땲??`;
        } else if (tier === "high") {
          rewards.manualFragments = { manual_fragment_epic: 30 };
          rewards.legendaryGearFragments = 2;
          rewards.wisdom = 50;
          nextDayEvent.clueText = `?댁씪 ${area} 吏??뿉???ш? 鍮꾧툒 議곌컖怨??꾩꽕?곸씤 ?λ퉬???뚰렪???섑???寃껋엯?덈떎.`;
        } else if (tier === "special") {
          rewards.manualFragments = { manual_fragment_legendary: 20 };
          rewards.divineWeaponShards = 1;
          nextDayEvent.clueText = `?댁씪 ${area} 吏??뿉 ?꾩꽕?곸씤 蹂댁뒪? ?좊퀝?닿린???됰갑???쒕윭??寃껋엯?덈떎.`;
        }
        nextDayEvent.rewards = rewards;

        return {
          game: {
            ...s.game,
            coins: s.game.coins - actualCost,
            nextDayEvent: nextDayEvent,
            npcFavors: { ...s.game.npcFavors, [npcId]: Math.min(100, (s.game.npcFavors[npcId] || 0) + 5) },
            nightLimits: { ...s.game.nightLimits, giluActionLeft: s.game.nightLimits.giluActionLeft - 1, infoTradeUsed: true }
          }
        };
      });

      get().triggerSave(true);
      return { success: true, message: "鍮꾨? ?뺣낫瑜?援щℓ?덉뒿?덈떎. ?댁씪??湲곕??섏꽭??" };
    }

    const talkCount = (limits.npcTalkCount && limits.npcTalkCount[npcId]) || 0;
    if (actionId === "talk" && talkCount >= 2) {
      return { success: false, message: "??NPC????ㅻ뒛 諛?異⑸텇????붾? ?섎댋?듬땲??" };
    }

    if (game.coins < action.cost) return { success: false, message: "湲덉쟾??遺議깊빀?덈떎." };

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

        // 100 ?멸컧??蹂댁긽
        if (nextFavors[npcId] >= 100 && !claimed[npcId]) {
          const npcName = GIRU_NPCS.find(n => n.id === npcId)?.name || "NPC";
          pendingReward = {
            title: `[?멸컧] ${npcName}??利앺몴`,
            items: [
              { icon: "?럞", name: "?⑥솗??蹂대Ъ?곸옄", count: 2, color: "#ffd700" },
              { icon: "?뱶", name: "?좏솕 鍮꾧툒 議곌컖", count: 50, color: "#ff3e3e", slotName: "?щ즺" }
            ]
          };
          nextConsumables.paewang_box = (nextConsumables.paewang_box || 0) + 2;
          nextFragments.manual_fragment_mythic = (nextFragments.manual_fragment_mythic || 0) + 50;
          nextClaimed[npcId] = true;
        }

        return {
          game: {
            ...s.game,
            coins: s.game.coins - action.cost,
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
      return { success: true, message: "??붾? ?섎댋?듬땲??" };
    }

    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

    let infoMsg = "";
    const gainedFavor = (event.result.favor || action.favor || 0);
    const nextFavors = { ...(get().game.npcFavors || {}) };
    nextFavors[npcId] = (nextFavors[npcId] || 0) + gainedFavor;

    // ?멸컧??蹂댁긽 泥댄겕 (100???ъ꽦 ??
    let pendingReward = get().game.pendingReward;
    const claimed = get().game.giruRewardsClaimed || {};
    let nextClaimed = { ...claimed };
    let nextConsumables = { ...get().game.consumables };
    let nextFragments = { ...(get().game.manualFragments || {}) };

    if (nextFavors[npcId] >= 100 && !claimed[npcId]) {
      const npcName = GIRU_NPCS.find(n => n.id === npcId)?.name || "NPC";
      pendingReward = {
        title: `[?멸컧] ${npcName}??利앺몴`,
        items: [
          { icon: "?럞", name: "?⑥솗??蹂대Ъ?곸옄", count: 2, color: "#ffd700" },
          { icon: "?뱶", name: "?좏솕 鍮꾧툒 議곌컖", count: 50, color: "#ff3e3e", slotName: "?щ즺" }
        ]
      };
      nextConsumables.paewang_box = (nextConsumables.paewang_box || 0) + 2;
      nextFragments.manual_fragment_mythic = (nextFragments.manual_fragment_mythic || 0) + 50;
      nextClaimed[npcId] = true;
    }

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

      if (actionId === "info" && extra && (extra as any).infoTier) {
        const tier = (extra as any).infoTier;
        const faction = s.game.faction;
        
        let rivalName = "?좊퉬??怨좎닔";
        let rivalHpMult = 1.0;
        let rivalAtkMult = 1.0;
        let rivalRewards: any = {};

        const realmIdx = REALM_ORDER.indexOf(s.game.realm);
        const rewardScale = 1 + (realmIdx * 0.3);
        const lowRewardScale = 1 + (realmIdx * 0.2);

        if (tier === "low") {
          rivalName = "?뷀뼢猷?臾대ː諛????;
          rivalHpMult = 1.5; rivalAtkMult = 1.2;
          rivalRewards = { manualFragments: { "manual_fragment_common": 5 } };
          infoMsg = "\n[湲곗뿰] ?뷀뼢猷?洹쇱쿂??臾대ː諛???μ씠 ?섑??ъ뒿?덈떎!";
        } else if (tier === "mid") {
          rivalName = `${faction} 諛곗떊??;
          rivalHpMult = 3.0; rivalAtkMult = 1.8;
          rivalRewards = { manualFragments: { "random_faction": 10 } };
          infoMsg = `\n[湲곗뿰] ${faction}??湲곗닠???붿튇 諛곗떊?먭? ?멸렐???⑥뼱?ㅼ뿀?듬땲??`;
        } else if (tier === "high") {
          rivalName = "???怨좎닔";
          rivalHpMult = 6.0; rivalAtkMult = 3.5;
          rivalRewards = { 
            advancedMaterials: Math.floor(5 * lowRewardScale), 
            factionBonds: { [faction]: 1 }, 
            manualFragments: { "random_faction": 25 } 
          };
          infoMsg = `\n[湲곗뿰] ?뚮Ц?????怨좎닔媛 媛뺥샇??紐⑥뒿???쒕윭?덉뒿?덈떎!`;
        } else if (tier === "special") {
          rivalName = "媛뺥샇???꾩꽕";
          rivalHpMult = 15.0; rivalAtkMult = 8.0;
          rivalRewards = { 
            advancedMaterials: Math.floor(20 * rewardScale), 
            factionBonds: { [faction]: 3 }, 
            manualFragments: { "all_faction": 10 } 
          };
          infoMsg = `\n[湲곗뿰] ?꾩꽕?곸씤 怨좎닔? ?寃고븷 ?덊샇??湲고쉶媛 ?앷꼈?듬땲??`;
        }

        return {
          game: {
            ...s.game,
            coins: s.game.coins - (action.cost || 0),
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
              rivalHp: Math.floor(get().getTotalHp() * rivalHpMult),
              rivalMaxHp: Math.floor(get().getTotalHp() * rivalHpMult),
              rivalAtk: Math.floor(get().getStableAttack() * rivalAtkMult),
              playerHp: get().getTotalHp(),
              playerMaxHp: get().getTotalHp(),
              rewards: rivalRewards,
              isGiruEncounter: true 
            }
          }
        };
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
          gamblingTokens: (s.game.gamblingTokens || 0) + (event.result.token || 0),
          manualFragments: nextFragments,
          advancedMaterials: nextMaterials,
          factionBonds: nextBonds,
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
        // 40% chance to repeat the same lane to create '?고?' (spam) clusters
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
      
      // 1. ?ㅼ젣 ?쒓컙 ?뺤?媛 ?꾩슂???곹솴?몄? ?꾧꺽?섍쾶 ?먮떒 (???꾩튂 + ?뚮옒洹?+ ?섑듃鍮꾪듃)
      const isHeartbeatActive = (Date.now() - (lastActivityHeartbeat || 0)) < 10000; 
      const isActuallyPlayingMinigame = isMinigameActive && activeTab === "inn" && isHeartbeatActive;
      const isActuallyInMasterDuel = masterDuel.isPlaying && activeTab === "master" && isHeartbeatActive;
      const isActuallyInTower = tower?.isInside && activeTab === "tower" && isHeartbeatActive;

      // 2. ?ㅻⅨ ??뿉 ?덈뒗???뚮옒洹멸? ?⑥븘?덈뒗 寃쎌슦 (Stuck) 蹂듦뎄 濡쒖쭅 蹂??怨꾩궛
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

      // 3. 吏꾩쭨 ?뚮젅??以묒씤 寃쎌슦?먮쭔 以묐떒 (蹂듦뎄 濡쒖쭅???섑뻾??寃쎌슦 諛섏쁺?섏뿬 由ы꽩)
      if (isActuallyPlayingMinigame || isActuallyInMasterDuel || isActuallyInTower) {
        if (!needsRecovery) return s;
        return {
          game: {
            ...s.game,
            isMinigameActive: nextIsMini,
            masterDuel: { ...s.game.masterDuel, isPlaying: nextMasterIsPlaying },
            tower: { ...s.game.tower, isInside: nextTowerIsInside }
          }
        };
      }

      // 4. ?쒓컙 ?먮쫫 濡쒖쭅 (蹂듦뎄???뚮옒洹몄? ?④퍡 ?곸슜)
      let nextTimeState = s.game.timeState || "day";
      
      let currentTR = s.game.timeRemaining;
      if (typeof currentTR !== 'number' || isNaN(currentTR)) {
        currentTR = 300;
      }
      
      let nextTimeRemaining = currentTR - dt;
      let nextNightLimits = s.game.nightLimits;
      let triggerSettlement = false;

      if (nextTimeRemaining <= 0) {
        if (nextTimeState === "day") {
          nextTimeState = "dusk";
          nextTimeRemaining = 60;
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              nextDayEvent: null,
              isMinigameActive: nextIsMini,
              masterDuel: { ...s.game.masterDuel, isPlaying: nextMasterIsPlaying },
              tower: { ...s.game.tower, isInside: nextTowerIsInside }
            }
          };
        } else if (nextTimeState === "dusk") {
          nextTimeState = "night";
          nextTimeRemaining = 300;
          nextNightLimits = { giluActionLeft: 5, npcTalkCount: {}, infoTradeUsed: false };
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              nightLimits: nextNightLimits,
              nightBuffs: [],
              tujeonExchangeBought: {},
              isMinigameActive: nextIsMini,
              masterDuel: { ...s.game.masterDuel, isPlaying: nextMasterIsPlaying },
              tower: { ...s.game.tower, isInside: nextTowerIsInside }
            }
          };
        } else if (nextTimeState === "night") {
          nextTimeState = "dawn";
          nextTimeRemaining = 60;
          triggerSettlement = true;
        } else if (nextTimeState === "dawn") {
          nextTimeState = "day";
          nextTimeRemaining = 300;
          const nextDayCount = (s.game.dayCount || 1) + 1;
          const nextEvent = s.game.nextDayEvent ? { ...s.game.nextDayEvent, isUsed: false } : null;
          // Note: getNextAdaptiveQuests is assumed to be available as in original
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
          showDawnSettlement: triggerSettlement ? true : s.game.showDawnSettlement,
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
      const areas = ["?숈뼇", "?μ븞", "??＜", "?깅룄"];
      const area = areas[Math.floor(Math.random() * areas.length)];
      nextEvent = {
        type: "TREASURE_FORECAST",
        targetArea: area,
        clueText: `?댁씪 ${area} 吏??뿉 蹂대Ъ 臾대ː諛곕뱾???섑???寃껋엯?덈떎.`,
        isUsed: false
      };
    } else {
      const bosses = ["?대몺??寃媛?, "?쇱쓽 援곗＜", "臾댁쁺媛?];
      const boss = bosses[Math.floor(Math.random() * bosses.length)];
      nextEvent = {
        type: "BOSS_RAID_CLUE",
        bossId: boss,
        clueText: `?댁씪 蹂댁뒪 [${boss}]????좎쿂媛 諛쒓껄??寃껋엯?덈떎.`,
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
    // GIRU_QUESTS should be imported
    return { game: { ...s.game, activeQuests: [...(s.game.activeQuests || []), { id: questId, status: "active" }] } };
  }),

  completeQuest: (questId: string) => set((s: any) => {
    const quests = [...(s.game.activeQuests || [])];
    const idx = quests.findIndex(q => q.id === questId);
    if (idx === -1) return s;
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

  setTutorialStep: (stepId: string) => set((s: any) => ({
    game: {
      ...s.game,
      tutorialProgress: {
        ...s.game.tutorialProgress,
        isActive: true,
        currentStepId: stepId
      }
    }
  })),

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
             game.ownedWeapons.find((w: any) => w.id?.includes("tutorial") || w.name?.includes("臾대챸泥좉?"))?.id ||
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
        !(w.name?.includes("臾대챸泥좉?")) || w.id === "?꾨?_mainWeapon_tutorial_fixed"
      );
      extraState.equippedWeaponId = s.game.equippedWeaponId?.includes("臾대챸泥좉?") ? null : s.game.equippedWeaponId;
      extraState.equippedGear = {
        ...s.game.equippedGear,
        mainWeapon: s.game.equippedGear?.mainWeapon?.name?.includes("臾대챸泥좉?") ? null : s.game.equippedGear?.mainWeapon
      };
    }

    if (stepId === "goto_forge_click") nextStepId = "buy_weapon";
    
    if (stepId === "buy_weapon") {
      nextStepId = "goto_inventory";
      const tid = "?꾨?_mainWeapon_tutorial_fixed";
      const others = s.game.ownedWeapons.filter((w: any) => w.id !== tid && !(w.name?.includes("臾대챸泥좉?")));
      const item = {
        id: tid, name: "臾대챸泥좉?", slot: "mainWeapon", icon: "?뷂툘", type: "weapon", realm: "?꾨?", tier: "蹂닿뎄",
        price: 5000, attackBonus: 10, description: "怨듦꺽 +10", enhancement: 0,
        randomOptions: [
          { stat: "atk_pct", label: "怨듦꺽??+10%", value: 10, grade: "理쒖긽湲? },
          { stat: "crit_rate", label: "移섎챸? ?뺣쪧 +4%", value: 4, grade: "理쒖긽湲? }
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
            description: `怨듦꺽 +${nextAtk}` 
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
        // ?쒗넗由ъ뼹 ?ъ뿰留??쒖뿉??蹂?붾? ?뺤떎??蹂댁뿬二쇨린 ?꾪빐 ?ㅻⅨ ?듭뀡(移섎챸? ?쇳빐, ?앸챸?????섏삤?꾨줉 ?ㅼ젙
        const pool = [
          { stat: "crit_dmg", label: "移섎챸? ?쇳빐", val: 20 }, 
          { stat: "hp_pct", label: "?앸챸??, val: 25 },
          { stat: "atk_pct", label: "怨듦꺽??, val: 10 }
        ];
        const opts = pool.slice(0, count).map(o => ({ stat: o.stat, label: `${o.label} +${o.val}%`, value: o.val, grade: "理쒖긽湲? }));
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
        const names: any = { oil_atk_3: "愿묓룺??, oil_crit_3: "?뚯쿇??, oil_thunder: "?뚯쟾?? };
        extraState.ownedWeapons = (extraState.ownedWeapons || s.game.ownedWeapons).map((w: any) => 
          w.id === tid ? { ...w, oilEffect: { label: `${names[oilId]}: ?④낵 ?곸슜`, id: oilId, active: true } } : w
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
        // ?쒗넗由ъ뼹 ?꾩쟾 醫낅즺
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

    const isLast = stepId === "auto_training_info" || stepId === "restart_training" || stepId === "upgrade_finish_goto_training" || stepId === "trance_achieved";
    
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
