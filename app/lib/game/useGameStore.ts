"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType } from "./types";
import { FACTIONS } from "./factions";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions } from "./items";

export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: "straw", label: "낡은 짚더미", hp: 150, mp: 60, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 100000, dummyHp: 50000, dummyType: "straw", label: "말라비틀어진 짚더미", hp: 300, mp: 150, goldMultiplier: 3 },
  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: "wood", label: "통나무 목인", hp: 600, mp: 350, goldMultiplier: 8 },
  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: "leather", label: "가죽 목격인", hp: 1200, mp: 700, goldMultiplier: 20 },
  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: "iron", label: "청강철 목인", hp: 2500, mp: 1500, goldMultiplier: 50 },
  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: "spirit", label: "기운 서린 목격인", hp: 5000, mp: 3000, goldMultiplier: 150 },
  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: "master", label: "화경의 환영", hp: 12000, mp: 7000, goldMultiplier: 400 },
  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: "legend", label: "현경의 전설", hp: 25000, mp: 15000, goldMultiplier: 1000 },
  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: "life-death", label: "생사의 문턱", hp: 50000, mp: 35000, goldMultiplier: 2500 },
  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: "myth", label: "신화의 형상", hp: 120000, mp: 80000, goldMultiplier: 7000 },
  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: "heaven", label: "천인합일의 경지", hp: 300000, mp: 200000, goldMultiplier: 20000 },
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
 
 function generateEnemy(level: number) {
   const rival = MASTER_RIVALS[(level - 1) % MASTER_RIVALS.length] || { name: "이름 없는 고수", hpMult: 1, atkMult: 1 };
   // 공격력 추천: 초반 80에서 시작하여 대략 1.5배씩 성장하도록 조정 (1.8배는 너무 급격함)
   return {
     name: rival.name,
     hp: Math.floor(3000 * Math.pow(2.0, level - 1) * rival.hpMult),
     atk: Math.floor(80 * Math.pow(1.5, level - 1) * rival.atkMult)
   };
 }

function getDummyStats(realm: string, star: number) {
  const realms = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realms.indexOf(realm);
  let base = 1000; let atkBase = 10;
  if (currentRealmIndex !== -1) { base = REALM_SETTINGS[realm].dummyHp; atkBase = 10 * Math.pow(2, currentRealmIndex); }
  else if (realm.startsWith("환골탈퇴")) { const level = parseInt(realm.split(" ")[1]) || 1; base = REALM_SETTINGS["천인합일"].dummyHp * Math.pow(2.5, level); atkBase = 10 * Math.pow(2, 10) * Math.pow(1.5, level); }
  const hp = Math.floor(base * Math.pow(1.5, star - 1));
  return { hp, atk: Math.floor(atkBase * (1 + star * 0.2)) };
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
  addExp: (amount: number, isAuto?: boolean) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  learnSkill: (skill: any) => void;
  autoTrain: () => void;
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
  getTotalMp: () => number;
  getTotalCombatPower: () => number;
  addWeapon: (weapon: OwnedWeapon) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resolveTimingMission: (payload: any) => void;
  startMasterDuel: () => void;
  updateMasterDuel: (dt: number) => void;
  tapMasterDuel: () => void;
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
  upgradeStat: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  getUpgradeCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  getReputationCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  spendPoints: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  sellItem: (itemId: string) => void;
  sellConsumable: (id: ConsumableId) => void;
  getMultiUpgradeCost: (key: string, count: number, mode: 'gold' | 'reputation') => number;
  upgradeStatMulti: (key: string, count: number, mode: 'gold' | 'reputation') => void;
  updateBuffs: (dt: number) => void;
  checkOfflineRewards: () => void;
  claimOfflineRewards: () => void;
  getOptionSum: (stat: string) => number;
  getStableAttack: () => number;
  getInnBonus: () => { name: string; atk: number; gold: number; exp: number; critDmg: number };
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  game: { ...defaultGameData, ...loadGame(), name: loadGame().name ?? "무명협객" },

  setPlayerInfo: (info: any) => { set((s: any) => ({ game: { ...s.game, ...info, isInitialized: true } })); get().triggerSave(); },
  getOptionSum: (stat: string) => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    return eq.reduce((sum, item) => {
      const optVal = item.randomOptions?.filter(o => o.stat === stat).reduce((s, o) => s + o.value, 0) || 0;
      return sum + optVal;
    }, 0);
  },
  getTotalAttack: () => {
    const { game } = get(); const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearAtk = eq.reduce((s, i) => s + (i.attackBonus || 0), 0);
    const realmMult = REALM_SETTINGS[game.realm]?.bonus || 1;
    const upgradeAtk = (game.upgradeLevels?.atk || 0) * 250;
    const mWeapon = game.ownedWeapons.find(w => w.id === (game.equippedGear?.mainWeapon || game.equippedWeaponId));
    const innBonus = get().getInnBonus();
    const optionAtkPct = get().getOptionSum("atk_pct");
    
    let final = (game.baseAttack + gearAtk + upgradeAtk) * (mWeapon?.attackMultiplier || 1) * realmMult * game.attackMultiplier * (1 + (faction?.bonusStats?.atk || 0)/100) * (1 + innBonus.atk) * (1 + optionAtkPct / 100);
    if (game.faction === "무당") { const combo = (game.lastAttackTime && (Date.now() - game.lastAttackTime < 1500)) ? game.comboCount : 0; final *= (1 + Math.min(combo * 0.05, 1.0)); }
    return Math.floor(final);
  },
  getStableAttack: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const gAtk = eq.reduce((s, i) => s + (i.attackBonus || 0), 0); const uAtk = (game.upgradeLevels?.atk || 0) * 250;
    return Math.floor((game.baseAttack + gAtk + uAtk) * (REALM_SETTINGS[game.realm]?.bonus || 1));
  },
  getTotalCritRate: () => {
    const { game } = get(); 
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const skillBonus = (game.learnedSkills || []).reduce((acc: number, sk: any) => acc + (sk.crit || 0), 0);
    return (game.critRate || 5) + eq.reduce((s, i) => s + (i.critBonus || 0), 0) + (game.upgradeLevels?.critRate || 0) * 0.1 + get().getOptionSum("crit_rate") + skillBonus;
  },
  getTotalCritDmg: () => 150 + get().game.ownedWeapons.filter((w: any) => Object.values(get().game.equippedGear || {}).includes(w.id)).reduce((s: any, i: any) => s + (i.critDmgBonus || 0), 0) + (get().game.upgradeLevels?.critDmg || 0) + (get().getInnBonus().critDmg) + get().getOptionSum("crit_dmg"),
  getTotalDefense: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    return Math.floor((game.def + eq.reduce((s, i) => s + (i.defenseBonus || 0), 0) + (game.upgradeLevels?.def || 0) * 250) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.def || 0)/100));
  },
  getTotalHp: () => {
    const { game } = get(); 
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const baseTotal = (game.maxHp + eq.reduce((s, i) => s + (i.hpBonus || 0), 0) + (game.upgradeLevels?.hpRec || 0) * 2500) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.hp || 0)/100);
    return Math.floor(baseTotal * (1 + get().getOptionSum("hp_pct") / 100));
  },
  getTotalEvasion: () => (get().game.eva || 0) + (get().game.upgradeLevels?.eva || 0) * 0.1 + get().getOptionSum("eva"),
  getTotalSpeed: () => 100 + get().game.ownedWeapons.filter(w => Object.values(get().game.equippedGear || {}).includes(w.id)).reduce((s, i) => s + (i.speedBonus || 0), 0),
  getTotalMp: () => {
    const baseTotal = get().game.maxMp + (get().game.upgradeLevels?.mpRec || 0) * 1000;
    return Math.floor(baseTotal * (1 + get().getOptionSum("mp_pct") / 100));
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
  getTotalCombatPower: () => Math.floor((get().getTotalAttack() * 2 + get().getTotalHp() / 10 + get().getTotalDefense() * 5) * (1 + get().getTotalCritRate() / 100)),

  addExp: (amount: number, isAuto = false) => {
    const { game } = get(); if (game.pendingInnEntry || game.timingMission.available) return;
    const totalAtk = get().getTotalAttack(); const autoLv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + (autoLv * 0.0003); const goldB = 1 + (autoLv * 0.0005);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const innBonus = get().getInnBonus();
    const finalExp = amount * eq.reduce((a, i) => a * (i.expMultiplier || 1), 1) * (1 + (FACTIONS.find(f => f.name === game.faction)?.expBonus || 0)/100) * expB * (1 + innBonus.exp) * (1 + get().getOptionSum("exp_pct") / 100);
    const finalGoldB = goldB * (1 + innBonus.gold);

    set((s: any) => {
      const now = Date.now();
      let combo = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;
      let tKills = s.game.totalDummyKills;
      let points = s.game.points || 0;
      let rep = s.game.reputation || 0;
      const stats = getDummyStats(s.game.realm, s.game.star);
      let dHp = s.game.dummyHp - totalAtk;
      let eGold = 0;
      let lastR = s.game.lastReward;
      const nTouches = s.game.touches + (1 + eq.reduce((a, i) => a + (i.touchMultiplier || 0), 0));

      if (Math.random() < 0.03) eGold += 2 * (REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1) * finalGoldB;
      
      if (dHp <= 0) {
        tKills += 1;
        const baseHp = tKills >= 30 ? 5000 : stats.hp;
        dHp = baseHp;
        const rG = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
        const kG = (s.game.attackMultiplier > 1 ? 100 * rG : 50 * rG) * finalGoldB;
        eGold += kG;
        lastR = null; 
      }
      points += eGold;
      rep += eGold;

      const currentMaxHp = tKills >= 30 ? 5000 : stats.hp;

      let qT = s.game.questTarget;
      let cMT = s.game.currentMissionTitle;
      let uTabs = [...s.game.unlockedTabs];
      let uET = s.game.unlockEffectText;
      let aM = s.game.attackMultiplier;
      let bTL = s.game.buffTimeLeft;
      let aB = s.game.activeBuff;
      let pIE = s.game.pendingInnEntry;
      let iEV = s.game.innEventVersion;

      // 누적 처치(tKills) 기반 임무 판정
      if (tKills >= qT) {
        if (qT === 10) {
          qT = 30;
          cMT = "허수아비 누적 처치 30번\n[개방: 대장간]";
          uET = "무아지경 진입!";
          aM = 2; bTL = 7; aB = "무아지경";
        } else if (qT === 30) {
          qT = 50;
          cMT = "허수아비 누적 처치 50번\n[개방: 강화]";
          uET = "대장간 및 장비 개방!";
          uTabs = Array.from(new Set([...uTabs, "forge", "inventory"]));
        } else if (qT === 50) {
          qT = 100;
          cMT = "허수아비 누적 처치 100번\n[개방: 객잔]";
          uET = "강화 개방!";
          uTabs = Array.from(new Set([...uTabs, "upgrade"]));
        } else if (qT === 100) {
          qT = 150;
          cMT = "허수아비 누적 처치 150번\n[개방: 대결]";
          uET = null;
          uTabs = Array.from(new Set([...uTabs, "inn"]));
          pIE = false; 
          // 객잔 개방 시 한 번 반환
        } else if (qT === 150) {
          qT = 200;
          cMT = "허수아비 누적 처치 200번\n[개방: 비급]";
          uET = "대결 개방!";
          uTabs = Array.from(new Set([...uTabs, "master"]));
        } else if (qT === 200) {
          qT = 300;
          cMT = "허수아비 누적 처치 300번\n[이벤트: 무뢰배]";
          uET = "비급 개방!";
          uTabs = Array.from(new Set([...uTabs, "library"]));
        } else if (qT === 300) {
          // 300킬 퀘스트 달성 이후는 qT를 계속 증가시켜 300킬마다 이벤트가 발생하게 함
          qT += 300;
          cMT = `무뢰배 추격 (${iEV + 1}차)\n허수아비를 더 처단하세요.`;
          uET = "무뢰배 출현 예고!";
        }
      }

      // 무뢰배 출현 로직 (300킬 단위마다 독립적으로 체크 + 300킬 이상 첫 진입 보정)
      let nTM = { ...s.game.timingMission };
      const isFirstTimeTrigger = tKills >= 300 && iEV === 0;
      const isPeriodicTrigger = tKills > 0 && tKills % 300 === 0;

      if ((isFirstTimeTrigger || isPeriodicTrigger) && !nTM.available) {
          const miniGames = ["breath", "dodge", "puzzle", "pulse"];
          const gameIdx = (s.game.innEventVersion || 0) % 4;
          const selectedGame = miniGames[gameIdx];
          
          pIE = true;
          iEV = (s.game.innEventVersion || 0) + 1;
          nTM = {
            available: true,
            selectedGameType: selectedGame,
            rivalName: `객잔 무뢰배 (${iEV}차)`,
            requiredHits: 1,
            isPractice: false,
            currentStage: 1,
            unlocked: true,
          };
          
          // 객잔으로 자동 이동 유도 (선택 사항)
          setTimeout(() => useGameStore.setState((p: any) => ({ game: { ...p.game, activeTab: "inn" } })), 1000);
      }
      return { 
        game: { 
          ...s.game, 
          timingMission: nTM,
          coins: s.game.coins + eGold, 
          reputation: rep, 
          exp: s.game.exp + finalExp, 
          points, 
          dummyHp: dHp, 
          maxDummyHp: currentMaxHp, 
          totalDummyKills: tKills, 
          dummyKills: tKills > 300 ? (tKills % 300) : tKills,
          questTarget: tKills >= 300 ? 300 : qT,
          currentMissionTitle: cMT, 
          unlockedTabs: uTabs, 
          unlockEffectText: uET, 
          attackMultiplier: aM, 
          buffTimeLeft: bTL, 
          activeBuff: aB, 
          pendingInnEntry: pIE, 
          innEventVersion: iEV, 
          touches: nTouches, 
          comboCount: combo, 
          lastAttackTime: now, 
          lastReward: lastR 
        } 
      };
    });
    get().triggerSave();
  },

  addWeapon: (w: any) => set((s: any) => ({ game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, w] } })),
  addCoins: (a: number) => set((s: any) => ({ game: { ...s.game, coins: s.game.coins + a } })),
  learnSkill: (skill: any) => set((s: any) => ({ game: { ...s.game, learnedSkills: [...s.game.learnedSkills, skill] } })),
  autoTrain: () => { const { game, addExp } = get(); if (game.pendingInnEntry || game.timingMission.available) return; addExp(4.0 + (game.upgradeLevels.autoGain || 0) * 0.01, true); },
  takeDamage: (d: number) => set((s: any) => ({ game: { ...s.game, hp: Math.max(0, s.game.hp - d) } })),
  heal: (a: number) => set((s: any) => ({ game: { ...s.game, hp: Math.min(get().getTotalHp(), s.game.hp + a) } })),
  triggerSave: (i = false) => { if (i) { if (debounceTimer) clearTimeout(debounceTimer); saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; return; } if (!debounceTimer) debounceTimer = setTimeout(() => { saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; }, 10000); },
  
  upgradeStat: (k: keyof GameSaveData["statUpgrades"]) => { const s = get(); s.upgradeStatMulti(k, 1, 'gold'); },
  getUpgradeCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * 500; },
  getReputationCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * 100; },
  spendPoints: (k: keyof GameSaveData["statUpgrades"]) => {},
  getMultiUpgradeCost: (k: string, c: number, m: string) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0; const base = m === 'gold' ? 500 : 100;
    return Math.floor((c * ((cL + 1) * base + (cL + c) * base)) / 2);
  },
  upgradeStatMulti: (k: string, c: number, m: string) => {
    const s = get(); const cL = (s.game.upgradeLevels as any)[k] || 0; const base = m === 'gold' ? 500 : 100;
    const cost = Math.floor((c * ((cL + 1) * base + (cL + c) * base)) / 2);
    if ((m === 'gold' ? s.game.coins : s.game.reputation) < cost) return;
    set((s: any) => {
      const n = { ...s.game }; if (m === 'gold') n.coins -= cost; else n.reputation -= cost;
      n.upgradeLevels = { ...n.upgradeLevels, [k]: (n.upgradeLevels[k] || 0) + c };
      n.statUpgrades = { ...n.statUpgrades, [k]: (n.statUpgrades[k] || 0) + (k==='hpRec'?2500:k==='mpRec'?1000:250)*c };
      return { game: n };
    });
    get().triggerSave(true);
  },

  breakthrough: () => {
    const { game } = get(); if (game.star < 10) { const nV = game.star + 1; const st = getDummyStats(game.realm, nV); set((s:any)=>({game:{...s.game, star:nV, dummyHp:st.hp, maxDummyHp:st.hp}})); }
    else { const nxt = get().getNextRealmName(); if (nxt) { const st = getDummyStats(nxt, 1); set((s:any)=>({game:{...s.game, realm:nxt, star:1, hp:getRealmSettings(nxt).hp, maxHp:getRealmSettings(nxt).hp, dummyHp:st.hp, maxDummyHp:st.hp}})); } }
    get().triggerSave(true);
  },
  canBreakthrough: () => { const { game } = get(); const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(game.realm); const cur = REALM_SETTINGS[game.realm]; const nxt = REALM_SETTINGS[list[idx + 1]] || cur; return game.touches >= (cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star)); },
  getNextRealmName: () => { const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(get().game.realm); return idx < list.length - 1 ? list[idx+1] : (get().game.realm === "천인합일" ? "환골탈퇴 1성" : null); },
  updateBuffs: (dt: number) => set((s: any) => { 
    const nextSkillCooldowns = { ...s.game.skillCooldowns };
    let hasCooldown = false;
    Object.keys(nextSkillCooldowns).forEach(name => {
      if (nextSkillCooldowns[name] > 0) {
        nextSkillCooldowns[name] = Math.max(0, nextSkillCooldowns[name] - dt);
        hasCooldown = true;
      }
    });

    const newBuffTimeLeft = Math.max(0, s.game.buffTimeLeft - dt);
    
    // 이전에 이미 버프가 없고 쿨다운도 없다면 일찍 반환
    if (s.game.buffTimeLeft <= 0 && !s.game.activeBuff && !hasCooldown) return s;
    
    return { 
      game: { 
        ...s.game, 
        skillCooldowns: nextSkillCooldowns,
        attackMultiplier: newBuffTimeLeft > 0 ? s.game.attackMultiplier : 1,
        activeBuff: newBuffTimeLeft > 0 ? s.game.activeBuff : null,
        buffTimeLeft: newBuffTimeLeft
      } 
    }; 
  }),
  setQuickSlot: (idx: number, id: ConsumableId | null) => set((s: any) => { const next = [...s.game.quickSlots]; next[idx] = id; return { game: { ...s.game, quickSlots: next } }; }),
  buyPotion: (id: ConsumableId, q: number) => set((s: any) => { 
    const prices: Record<string, number> = { hp_small: 500, hp_medium: 2000, hp_large: 10000, mp_small: 500, mp_medium: 2000, mp_large: 10000 };
    const price = prices[id] || 1000;
    if (s.game.coins < price * q) return s; 
    return { game: { ...s.game, coins: s.game.coins - price * q, consumables: { ...s.game.consumables, [id]: (s.game.consumables[id] || 0) + q } } }; 
  }),
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

    return { 
      game: { 
        ...s.game, 
        hp: nextHp, 
        mp: nextMp, 
        consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 } 
      } 
    }; 
  }),
  equipItem: (id: string) => set((s: any) => { const it = s.game.ownedWeapons.find((w:any) => w.id === id); if (!it) return s; return { game: { ...s.game, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } }; }),
  unequipItem: (slot: EquipSlot) => set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null } } })),
  sellItem: (id: string) => set((s: any) => { 
    const it = s.game.ownedWeapons.find((w:any) => w.id === id); 
    if (!it) return s; 
    const p = it.tier === "신기" ? 100000 : it.tier === "보구" ? 30000 : it.tier === "명품" ? 5000 : 1000; 
    return { game: { ...s.game, coins: s.game.coins + p, ownedWeapons: s.game.ownedWeapons.filter((w:any) => w.id !== id) } }; 
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
    
    // 오프라인 보상 대폭 하향 (약 10% 수준으로 조정)
    const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec); 
    const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
    
    set((s: any) => ({ 
      game: { 
        ...s.game, 
        lastSaveTime: Date.now(), 
        coins: s.game.coins + eGold, 
        exp: s.game.exp + eExp, 
        touches: s.game.touches + eExp, // 오프라인 수련치도 touches에 합산하여 경지 돌파에 기여
        reputation: (s.game.reputation || 0) + eGold, 
        lastOfflineRewards: { 
          gold: eGold, 
          exp: eExp, 
          points: eGold, // 명성 포인트용으로 금화와 동일하게 설정 (UI 호환성)
          duration: Math.round(offSec / 36) / 100 // 시간(h) 단위로 변환 표시
        } 
      } 
    }));
  },
  claimOfflineRewards: () => set((s: any) => ({ game: { ...s.game, lastOfflineRewards: null } })),
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
        const repGain = p.rep || (50 + actualStage * 30);
        
        let newConsumables = { ...game.consumables };
        if (p.item) {
          const itemKey = (p.item === "체력 환약" ? "hp_medium" : (p.item === "내력 환약" ? "mp_medium" : "hp_small")) as keyof typeof newConsumables;
          newConsumables[itemKey] = (newConsumables[itemKey] || 0) + 1;
        }

        // 객잔 등급 정산
        const ratingGain = 10 + actualStage * 3;
        const newRating = (game.duel.rating || 100) + ratingGain;
        const newTier = getDuelTier(newRating);

        set((s: any) => ({ 
          game: { 
            ...s.game, 
            coins: s.game.coins + r, 
            reputation: (s.game.reputation || 0) + repGain,
            consumables: newConsumables,
            activeBuff: "무아지경", 
            innHighScore: Math.max(game.innHighScore || 0, p.score || 0),
            timingMission: { ...s.game.timingMission, available: false },
            duel: {
              ...s.game.duel,
              rating: newRating,
              tier: newTier,
              totalWins: (s.game.duel.totalWins || 0) + 1,
              winStreak: (s.game.duel.winStreak || 0) + 1
            }
          } 
        }));
      }
    } else {
      // 실패/후퇴 시 수련장으로 즉시 복귀
      set((s: any) => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false } } }));
    }
    get().triggerSave(true);
  },
  incrementCombo: () => set((s: any) => ({ game: { ...s.game, comboCount: (s.game.comboCount || 0) + 1, lastAttackTime: Date.now() } })),
  setSelectedMasterLevel: (l: number) => set((s: any) => { const e = generateEnemy(l); return { game: { ...s.game, masterDuel: { ...s.game.masterDuel, selectedLevel: l, rivalName: e.name, rivalHp: e.hp, rivalMaxHp: e.hp, lastWinReward: undefined } } }; }),
  startMasterDuel: () => { 
    const { game } = get(); 
    if (get().getTotalHp() <= 0) return; 
    const e = generateEnemy(game.masterDuel.selectedLevel); 
    set((s: any) => ({ 
      game: { 
        ...s.game, 
        masterDuel: { 
          ...s.game.masterDuel, 
          isPlaying: true, 
          rivalHp: e.hp, 
          rivalMaxHp: e.hp, 
          rivalAtk: e.atk, 
          timeLeft: 40, 
          rivalAttackTimer: 0, 
          chargeTimer: 0,
          lastEffect: null,
          damageTakenAccumulator: 0,
          isBerserk: false 
        } 
      } 
    })); 
  },
  updateMasterDuel: (dt: number) => set((s: any) => { 
    if (!s.game.masterDuel.isPlaying) return s; 
    
    const tLeft = Math.max(0, s.game.masterDuel.timeLeft - dt); 
    
    // 시간 초과 패배 처리
    if (tLeft <= 0) {
      return { 
        game: { 
          ...s.game, 
          masterDuel: { ...s.game.masterDuel, isPlaying: false, timeLeft: 0, lastWinReward: "시간 초과 (패배)", damageTakenAccumulator: 0, lastEffect: null } 
        } 
      }; 
    }

    let nextHp = s.game.hp; 
    let atkTimer = (s.game.masterDuel.rivalAttackTimer || 0) + dt; 
    let chargeT = (s.game.masterDuel.chargeTimer || 0) + dt;
    let dmgAccum = 0;
    let effect = s.game.masterDuel.lastEffect;
    const isBerserk = tLeft <= 10;

    // 6초마다 강격(Special Attack)
    if (chargeT >= 6.0) {
      chargeT = 0;
      const rawAtk = s.game.masterDuel.rivalAtk * (isBerserk ? 5 : 3.5);
      const defense = get().getTotalDefense();
      const finalDmg = Math.max(20, Math.floor(rawAtk - defense));
      
      nextHp = Math.max(0, nextHp - finalDmg);
      dmgAccum = finalDmg + Math.random() * 0.01;
      effect = "CRITICAL";
      // 내상 확률 30% (체력 비례 데미지 패널티 시작)
      if (Math.random() < 0.3) effect = "BLEED";
    }
    // 1.2초마다 기본 공격
    else if (atkTimer >= 1.2) { 
      atkTimer = 0; 
      
      const evasionRate = get().getTotalEvasion();
      // 회피 판정
      if (Math.random() < evasionRate / 100) {
        dmgAccum = 0;
        effect = "DODGE";
      } else {
        const variance = 0.9 + Math.random() * 0.2; // 90%~110%
        const rawAtk = s.game.masterDuel.rivalAtk * (isBerserk ? 2.5 : 1) * variance;
        const defense = get().getTotalDefense();
        const finalDmg = Math.max(1, Math.floor(rawAtk - defense));
        
        nextHp = Math.max(0, nextHp - finalDmg); 
        // UI 트리거를 위해 0.0001 단위의 미세한 난수를 더해 값이 항상 변하게 함
        dmgAccum = finalDmg + Math.random() * 0.01;
        effect = null;
      }
    } else {
      // 효과가 표시된 후 0.5초 뒤에는 제거 (DODGE 등 텍스트 유지 방지)
      if (atkTimer > 0.5 && effect === "DODGE") effect = null;
    }

    // 내상 효과: 매 프레임 소량 감소
    if (s.game.masterDuel.lastEffect === "BLEED") {
      const bleedDmg = (get().getTotalHp() * 0.02) * dt; // 초당 2%
      nextHp = Math.max(0, nextHp - bleedDmg);
    }

    const isPlayerDead = nextHp <= 0;

    return { 
      game: { 
        ...s.game, 
        hp: Math.max(0, nextHp), 
        masterDuel: { 
          ...s.game.masterDuel, 
          timeLeft: tLeft, 
          isPlaying: !isPlayerDead, 
          lastWinReward: isPlayerDead ? "기운이 다했습니다 (패배)" : s.game.masterDuel.lastWinReward,
          rivalAttackTimer: atkTimer, 
          chargeTimer: chargeT,
          damageTakenAccumulator: dmgAccum,
          lastEffect: effect,
          isBerserk 
        } 
      } 
    }; 
  }),
  tapMasterDuel: () => {
    const { game } = get(); if (!game.masterDuel.isPlaying) return;
    const dmg = get().getTotalAttack() * (Math.random() < get().getTotalCritRate()/100 ? get().getTotalCritDmg()/100 : 1);
    const nHp = Math.max(0, game.masterDuel.rivalHp - dmg);
    if (nHp <= 0) { 
      const level = game.masterDuel.selectedLevel;
      const luck = game.upgradeLevels.luck || 0;
      
      // 장신구 보상
      const rwd = generateRandomAccessory(game.realm, level, luck); 
      
      // 금화 및 명성 보상 (업그레이드 반영)
      const goldB = 1 + (game.upgradeLevels.autoGain || 0) * 0.05;
      const goldGain = Math.floor(5000 * Math.pow(1.8, level - 1) * goldB);
      
      // 수련도 보상 (수련 효율 반영 및 touches에 합산)
      const expB = 1 + (game.upgradeLevels.autoGain || 0) * 0.1;
      const expGain = Math.floor(1000 * Math.pow(1.5, level - 1) * expB);

      set((s:any) => ({ 
        game: { 
          ...s.game, 
          coins: s.game.coins + goldGain,
          reputation: (s.game.reputation || 0) + goldGain,
          exp: s.game.exp + expGain,
          touches: s.game.touches + expGain, // 수련도에 즉시 반영
          ownedWeapons: [...s.game.ownedWeapons, rwd], 
          masterDuel: { 
            ...s.game.masterDuel, 
            isPlaying: false, 
            lastWinReward: `${rwd.name} 획득!\n금화 +${goldGain.toLocaleString()}\n수련도 +${expGain.toLocaleString()}`, 
            currentLevel: s.game.masterDuel.selectedLevel === s.game.masterDuel.currentLevel 
              ? s.game.masterDuel.currentLevel + 1 
              : s.game.masterDuel.currentLevel 
          } 
        } 
      })); 
    }
    else set((s:any) => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, rivalHp: nHp } } }));
  },
  claimDuelReward: () => set((s: any) => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false } } })),
  markInnEntryHandled: () => set((s: any) => ({ game: { ...s.game, pendingInnEntry: false } })),
  useSkill: (name: string) => { 
    const { game } = get(); 
    const sk = game.learnedSkills.find((s:any) => s.name === name); 
    if (!sk || game.mp < sk.mpCost || (game.skillCooldowns[name] || 0) > 0) return; 

    set((s: any) => ({ 
      game: { 
        ...s.game, 
        mp: s.game.mp - sk.mpCost,
        skillCooldowns: { ...s.game.skillCooldowns, [name]: 5 } // 5초 쿨타임 적용
      } 
    })); 

    if (game.masterDuel.isPlaying) {
      set((s: any) => ({ 
        game: { 
          ...s.game, 
          masterDuel: { 
            ...s.game.masterDuel, 
            rivalHp: Math.max(0, s.game.masterDuel.rivalHp - get().getTotalAttack() * (sk.multiplier || 3)) 
          } 
        } 
      }));
    }
  },
  syncToCloud: async () => { try { await fetch("/api/game/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(get().game) }); } catch (e) { } },
  syncFromCloud: async () => { try { const res = await fetch("/api/game/sync"); if (res.ok) { const d = await res.json(); if (d?.realm) { set((s: any) => ({ game: { ...s.game, ...d } })); saveGame(get().game); } } } catch (e) { } },
  resetGame: () => { 
    if (typeof window !== "undefined") { 
      localStorage.removeItem("murimbook-game-save-v12"); 
      localStorage.removeItem("murimbook-game-save-v11"); 
      localStorage.removeItem("murimbook-game-save-v10");
      window.location.reload(); 
    } 
  }
}));