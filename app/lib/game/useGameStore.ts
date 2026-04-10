"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType } from "./types";
import { FACTIONS } from "./factions";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, MASTER_RIVALS, generateRandomAccessory } from "./items";

export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 110, dummyType: "straw", label: "낡은 짚더미", hp: 150, mp: 60, goldMultiplier: 1, atkRewardMult: 1, agiRewardMult: 1 },
  삼류: { bonus: 1.0, minTouches: 5000, dummyHp: 200, dummyType: "straw", label: "낡은 짚더미", hp: 260, mp: 140, goldMultiplier: 5, atkRewardMult: 2, agiRewardMult: 1 },
  이류: { bonus: 1.5, minTouches: 100000, dummyHp: 500, dummyType: "wood", label: "통나무 목인", hp: 520, mp: 300, goldMultiplier: 25, atkRewardMult: 5, agiRewardMult: 2 },
  일류: { bonus: 2.2, minTouches: 500000, dummyHp: 1000, dummyType: "leather", label: "강화 목인", hp: 980, mp: 560, goldMultiplier: 80, atkRewardMult: 12, agiRewardMult: 4 },
  절정: { bonus: 3.5, minTouches: 2500000, dummyHp: 5000, dummyType: "iron", label: "철갑 인형", hp: 1800, mp: 1100, goldMultiplier: 300, atkRewardMult: 30, agiRewardMult: 10 },
  초절정: { bonus: 5.5, minTouches: 10000000, dummyHp: 20000, dummyType: "spirit", label: "영기 서린 목인", hp: 3200, mp: 2100, goldMultiplier: 1200, atkRewardMult: 80, agiRewardMult: 25 },
  화경: { bonus: 10.0, minTouches: 50000000, dummyHp: 100000, dummyType: "master", label: "고수의 환영", hp: 6000, mp: 4200, goldMultiplier: 5000, atkRewardMult: 200, agiRewardMult: 60 },
  현경: { bonus: 25.0, minTouches: 200000000, dummyHp: 500000, dummyType: "legend", label: "전설의 허수아비", hp: 11000, mp: 8000, goldMultiplier: 20000, atkRewardMult: 600, agiRewardMult: 150 },
  생사경: { bonus: 60.0, minTouches: 1000000000, dummyHp: 2000000, dummyType: "life-death", label: "생사경 목인", hp: 20000, mp: 15000, goldMultiplier: 80000, atkRewardMult: 1500, agiRewardMult: 400 },
  신화경: { bonus: 150.0, minTouches: 5000000000, dummyHp: 10000000, dummyType: "myth", label: "신화 속 존재", hp: 36000, mp: 28000, goldMultiplier: 300000, atkRewardMult: 4000, agiRewardMult: 1000 },
  천인합일: { bonus: 500.0, minTouches: 20000000000, dummyHp: 50000000, dummyType: "heaven", label: "천인합일의 경지", hp: 65000, mp: 50000, goldMultiplier: 1000000, atkRewardMult: 10000, agiRewardMult: 2500 },
};

interface MissionResultPayload {
  success: boolean;
  score: number;
  grade: "PERFECT" | "GREAT" | "GOOD" | "MISS";
  isFinal?: boolean;
  maxStage?: number;
}

type RewardEffect = {
  label: string;
  coins?: number;
  attackMultiplier?: number;
  buffSeconds?: number;
  multiHit?: boolean;
  baseAttackGain?: number;
  agiGain?: number;
  buffName?: string;
};

interface GameState {
  game: GameSaveData;
  setPlayerInfo: (info: { name: string; age: number; height: number; faction: string }) => void;
  addExp: (amount: number, isAuto?: boolean) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  learnSkill: (skill: any) => void;
  autoTrain: () => void;
  winBoss: (reward: { coins?: number; exp?: number; rep: number }) => void;
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
  addWeapon: (weapon: OwnedWeapon) => void;
  equipWeapon: (weaponId: string) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resetDummy: () => void;
  completeMinigame: (success: boolean, combo?: number) => void;
  resolveTimingMission: (payload: MissionResultPayload) => void;
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
  startBuffCountdown: () => void;
  setSelectedMasterLevel: (level: number) => void;
}

let debounceTimer: NodeJS.Timeout | null = null;
let buffInterval: NodeJS.Timeout | null = null;

function startBuffCountdown() {
  if (buffInterval) clearInterval(buffInterval);
  buffInterval = setInterval(() => {
    const store = (useGameStore as any).getState();
    if (!store) return;
    const { game } = store;
    if (game.buffTimeLeft <= 0) {
      if (buffInterval) clearInterval(buffInterval);
      buffInterval = null;
      useGameStore.setState(s => ({ game: { ...s.game, activeBuff: null, attackMultiplier: 1, multiHitActive: false } }));
      return;
    }
    useGameStore.setState(s => ({ game: { ...s.game, buffTimeLeft: s.game.buffTimeLeft - 1 } }));
  }, 1000);
}

const RIVAL_NAMES = ["흑풍낭인", "청안검수", "잔월객", "혈랑무뢰배", "철각도객", "암영자객", "패도청년", "흉안낭인"];

function getTrainingStatBonus(realm: string, kills: number) {
  const table: Record<string, { hp5: number; mp5: number; hp10: number; mp10: number; hp25: number; mp25: number }> = {
    필부: { hp5: 4, mp5: 2, hp10: 8, mp10: 4, hp25: 15, mp25: 8 },
    삼류: { hp5: 6, mp5: 4, hp10: 12, mp10: 8, hp25: 25, mp25: 15 },
    이류: { hp5: 10, mp5: 6, hp10: 20, mp10: 12, hp25: 40, mp25: 25 },
    일류: { hp5: 15, mp5: 10, hp10: 30, mp10: 20, hp25: 60, mp25: 35 },
    절정: { hp5: 25, mp5: 18, hp10: 50, mp10: 35, hp25: 100, mp25: 75 },
    초절정: { hp5: 40, mp5: 30, hp10: 80, mp10: 60, hp25: 160, mp25: 120 },
    화경: { hp5: 60, mp5: 45, hp10: 120, mp10: 90, hp25: 240, mp25: 180 },
    현경: { hp5: 100, mp5: 75, hp10: 200, mp10: 150, hp25: 400, mp25: 300 },
    생사경: { hp5: 150, mp5: 120, hp10: 300, mp10: 240, hp25: 600, mp25: 480 },
    신화경: { hp5: 250, mp5: 200, hp10: 500, mp10: 400, hp25: 1000, mp25: 800 },
    천인합일: { hp5: 400, mp5: 350, hp10: 800, mp10: 700, hp25: 1600, mp25: 1400 },
  };
  const row = table[realm] ?? table["필부"];
  if (kills % 25 === 0) return { hp: row.hp25, mp: row.mp25 };
  if (kills % 10 === 0) return { hp: row.hp10, mp: row.mp10 };
  if (kills % 5 === 0) return { hp: row.hp5, mp: row.mp5 };
  return { hp: 0, mp: 0 };
}


function buildExponentialRewards(stage: number, goldMult: number): RewardEffect[] {
  const result: RewardEffect[] = [];
  if (stage <= 0) return result;

  // 1. Gold (Exponential: 1000 * 3^(stage-1))
  const baseGold = 1000 * Math.pow(3, stage - 1);
  result.push({ label: `금화 ${Math.floor(baseGold * goldMult).toLocaleString()}냥`, coins: Math.floor(baseGold * goldMult) });

  // 2. Mu-a-ji-gyeong (Trance) - Multiplier increases with stage
  const tranceMult = 1 + (stage * 2); 
  result.push({ 
    label: `무아지경 (${tranceMult}배)`, 
    attackMultiplier: tranceMult, 
    buffSeconds: 15 + stage * 5, 
    buffName: "무아지경" 
  });

  // 3. Attack Power (Permanent gain - Exponential)
  const atkGain = 20 * Math.pow(2.5, stage - 1);
  result.push({ label: `영약(공격력 +${Math.floor(atkGain)})`, baseAttackGain: Math.floor(atkGain) });

  // 4. Multi-hit Buff (Stage 2+)
  if (stage >= 2) {
    result.push({ 
      label: "다중공격 (1타 5피)", 
      multiHit: true, 
      buffSeconds: 20 + stage * 5, 
      buffName: "다중공격" 
    });
  }

  // 5. Bonus AGI (Stage 3+)
  if (stage >= 3) {
    const agiGain = 10 * stage;
    result.push({ label: `신행부(민첩 +${agiGain})`, agiGain: agiGain });
  }

  // 6. Extra multi- rewards for high stages
  if (stage >= 4) {
    result.push({ label: `대환단(공격력 +${Math.floor(atkGain * 0.5)})`, baseAttackGain: Math.floor(atkGain * 0.5) });
    result.push({ label: `희귀 연금술 재료 (${stage}개)`, coins: 10000 * stage });
  }

  if (stage >= 5) {
    result.push({ label: `전설의 무공비서 조각`, baseAttackGain: 100 * stage });
  }

  return result;
}

const loadedBase = loadGame();

export const useGameStore = create<GameState>((set, get) => ({
  game: {
    ...defaultGameData,
    ...loadedBase,
    name: loadedBase.name ?? "무명협객",
  },

  setPlayerInfo: (info) => { set((s) => ({ game: { ...s.game, ...info, faction: info.faction as FactionType, isInitialized: true } })); get().triggerSave(); },

  getTotalAttack: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionAtkMult = 1 + (faction?.bonusStats?.atk || 0) / 100;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    
    // 공격력 보너스만 합산
    const gearAtk = equippedItems.reduce((s, i) => s + (i.attackBonus || 0), 0);
    
    const realmMult = REALM_SETTINGS[game.realm]?.bonus || 1;
    let setMult = 1;

    const realmCounts = equippedItems.reduce((acc, item) => {
      if (item.realm) acc[item.realm] = (acc[item.realm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [realm, count] of Object.entries(realmCounts)) {
      if (count >= 5) {
        const option = REALM_SET_OPTIONS[realm];
        if (option?.attackBonusMultiplier) setMult = option.attackBonusMultiplier;
        break;
      }
    }

    const mainWeapon = game.ownedWeapons.find(w => w.id === (game.equippedGear?.mainWeapon ?? game.equippedWeaponId));
    const weaponAtkMult = mainWeapon?.attackMultiplier || 1;

    return Math.floor((game.baseAttack + gearAtk) * weaponAtkMult * setMult * realmMult * game.attackMultiplier * factionAtkMult);
  },

  getTotalCritRate: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionCrit = faction?.bonusStats?.critRate || 0;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const gearCrit = game.ownedWeapons.filter(w => equippedIds.includes(w.id)).reduce((s, i) => s + (i.critBonus || 0), 0);
    return (game.critRate || 5) + gearCrit + factionCrit;
  },

  getTotalCritDmg: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const gearCritDmg = game.ownedWeapons.filter(w => Object.values(game.equippedGear ?? {}).includes(w.id)).reduce((s, i) => s+ (i.critDmgBonus || 0), 0);
    return 150 + gearCritDmg + (faction?.bonusStats?.critDmg || 0);
  },

  getTotalDefense: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionDefMult = 1 + (faction?.bonusStats?.def || 0) / 100;
    const gearDef = game.ownedWeapons.filter(w => Object.values(game.equippedGear ?? {}).includes(w.id)).reduce((s, i) => s + (i.defenseBonus || 0), 0);
    return Math.floor(((game.def || 0) + gearDef) * factionDefMult);
  },

  getTotalHp: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const gearHp = game.ownedWeapons.filter(w => equippedIds.includes(w.id)).reduce((s, i) => s + (i.hpBonus || 0), 0);
    return Math.floor((game.maxHp + gearHp) * (1 + (faction?.bonusStats?.hp || 0) / 100));
  },

  getTotalEvasion: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const gearEva = game.ownedWeapons.filter(w => equippedIds.includes(w.id)).reduce((s, i) => s + (i.evadeBonus || 0), 0);
    return (game.eva || 0) + gearEva + (faction?.bonusStats?.eva || 0);
  },

  getTotalSpeed: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const gearSpeed = game.ownedWeapons.filter(w => equippedIds.includes(w.id)).reduce((s, i) => s + (i.speedBonus || 0), 0);
    return Math.floor((100 + gearSpeed) * (1 + (faction?.bonusStats?.speed || 0) / 100));
  },

  getTotalMp: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const gearMp = game.ownedWeapons.filter(w => equippedIds.includes(w.id)).reduce((s, i) => s + (i.mpBonus || 0), 0);
    return game.maxMp + gearMp;
  },

  addExp: (amount, isAuto = false) => {
    const { game } = get();
    if (game.pendingInnEntry || game.timingMission.available) return;

    const totalAtk = get().getTotalAttack();
    
    // 수련 보너스는 직접 터치(Manual) 시에만 적용
    let touchGain = 1;
    let expMult = 1;
    if (!isAuto) {
      const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
      const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
      touchGain += equippedItems.reduce((acc, i) => acc + (i.touchMultiplier || 0), 0);
      expMult = equippedItems.reduce((acc, i) => acc * (i.expMultiplier || 1), 1);
    }

    const finalExpGain = Math.floor(amount * expMult);

    if (isAuto) {
      set(s => ({ game: { ...s.game, exp: s.game.exp + amount + 5, touches: s.game.touches + 1 } }));
      get().triggerSave();
      return;
    }

    set(s => {
      let totalKills = s.game.totalDummyKills;
      let missionKills = s.game.dummyKills; 
      let dHp = s.game.dummyHp - totalAtk;
      let lastReward = s.game.lastReward;
      let pendingInnEntry = s.game.pendingInnEntry;
      let innEventVersion = s.game.innEventVersion;
      let questTarget = s.game.questTarget;
      let currentMissionTitle = s.game.currentMissionTitle;
      
      let attackMultiplier = s.game.attackMultiplier;
      let buffTimeLeft = s.game.buffTimeLeft;
      let activeBuff = s.game.activeBuff;
      let unlockEffectText = s.game.unlockEffectText;

      let newMaxHp = s.game.maxHp;
      let newHp = s.game.hp;
      let newMaxMp = s.game.maxMp;
      let newMp = s.game.mp;
      
      let timingMission: TimingMissionState = { ...s.game.timingMission };
      let unlockedTabs = [...s.game.unlockedTabs];

      if (dHp <= 0) {
        totalKills += 1;
        missionKills += 1;
        dHp = s.game.maxDummyHp;

        if (totalKills === 1) lastReward = "첫 처치 성공";
        
        if (totalKills === 10) {
           lastReward = "🎁 10회 처치 보상 획득\n무아지경 상태에 진입합니다!";
           attackMultiplier = 2;
           buffTimeLeft = 7;
           activeBuff = "무아지경";
           unlockEffectText = "무아지경 2배";
           startBuffCountdown();
           missionKills = 0; 
           questTarget = 100;
           currentMissionTitle = "다음 임무: 허수아비 100번 처치\n(보상: 객잔 무뢰배 이벤트)";
        }

        if (totalKills === 30 && !unlockedTabs.includes("forge")) {
          lastReward = "🔓 대장간 & 장비 해금!\n이제 장비를 구입하고 관리할 수 있습니다.";
          unlockEffectText = "🔓 대장간 해금";
          unlockedTabs = Array.from(new Set([...unlockedTabs, "forge", "inventory"]));
        }

        if (totalKills > 10 && (totalKills % 100 === 0)) {
          pendingInnEntry = true;
          innEventVersion += 1;
          lastReward = `객잔 무뢰배 이벤트 발생!\n근처 객잔에서 소란이 일어났습니다.`;
          missionKills = 0; 
          currentMissionTitle = `다음 목표: 허수아비 100회 추가 처치\n(보상: 객잔 이벤트)`;
          questTarget = 100;
          
          if (!unlockedTabs.includes("inn")) {
             unlockedTabs.push("inn");
             unlockEffectText = "🏮 객잔 발견";
          }

          const gameTypes: MiniGameType[] = ["breath", "dodge", "biryongbo", "pulse"];
          const gameIdx = Math.floor(totalKills / 100 - 1) % gameTypes.length;
          const selected = gameTypes[gameIdx];

          const rivalIdx = Math.floor(Math.random() * RIVAL_NAMES.length);
          timingMission = {
            ...timingMission,
            unlocked: true,
            available: true,
            rivalName: RIVAL_NAMES[rivalIdx],
            selectedGameType: selected,
            currentStage: 1,
            rivalScore: 500, // Stage 1 target
            requiredHits: 3 + Math.floor(totalKills / 500),
            pendingTarget: null // Explicitly ensuring it is here
          };
        }

        if (totalKills === 200 && !unlockedTabs.includes("library")) {
          lastReward = "📚 문파 서각(장경각) 개방!\n새로운 무공을 습득할 수 있습니다.";
          unlockEffectText = "📚 서각 개방";
          unlockedTabs.push("library");
        }

        const bonus = getTrainingStatBonus(s.game.realm, totalKills);
        if (bonus.hp > 0 || bonus.mp > 0) {
          lastReward = `💪 수련 성과! HP +${bonus.hp}, MP +${bonus.mp}`;
          newMaxHp += bonus.hp;
          newHp += bonus.hp;
          newMaxMp += bonus.mp;
          newMp += bonus.mp;
        }
      }

      return { 
        game: { 
          ...s.game, 
          exp: s.game.exp + (isAuto ? amount : finalExpGain), 
          touches: s.game.touches + touchGain, 
          dummyHp: dHp, 
          totalDummyKills: totalKills,
          dummyKills: missionKills,
          lastReward,
          pendingInnEntry,
          innEventVersion,
          questTarget,
          currentMissionTitle,
          attackMultiplier,
          buffTimeLeft,
          activeBuff,
          unlockEffectText,
          hp: newHp,
          maxHp: newMaxHp,
          mp: newMp,
          maxMp: newMaxMp,
          timingMission,
          unlockedTabs
        } 
      };
    });
    get().triggerSave();
  },

  addCoins: (amount) => { set(s => ({ game: { ...s.game, coins: s.game.coins + amount } })); get().triggerSave(); },
  triggerSave: (immediate = false) => {
    if (immediate) { if (debounceTimer) clearTimeout(debounceTimer); saveGame(get().game); debounceTimer = null; return; }
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => { if (typeof window !== "undefined") saveGame(get().game); debounceTimer = null; }, 10000);
  },
  startBuffCountdown: () => startBuffCountdown(),
  autoTrain: () => {
    const faction = FACTIONS.find(f => f.name === get().game.faction);
    set(s => ({ game: { ...s.game, exp: s.game.exp + 8 + (faction?.expBonus || 0), touches: s.game.touches + 1 } }));
    get().triggerSave();
  },
  winBoss: (r) => { set(s => ({ game: { ...s.game, coins: s.game.coins + (r.coins || 0), reputation: s.game.reputation + r.rep } })); get().triggerSave(); },
  setQuickSlot: (index: number, id: ConsumableId | null) => {
    set(s => {
      const newSlots = [...s.game.quickSlots];
      newSlots[index] = id;
      return { game: { ...s.game, quickSlots: newSlots } };
    });
  },
  buyPotion: (id: ConsumableId, quantity: number) => {
    const { game } = get();
    const realmIdx = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"].indexOf(game.realm);
    const realmMult = Math.pow(1.5, realmIdx);
    
    const potionData: Record<ConsumableId, { name: string; basePrice: number }> = {
      hp_small: { name: "HP 회복제(小)", basePrice: 1000 },
      hp_medium: { name: "HP 회복제(中)", basePrice: 2500 },
      hp_large: { name: "HP 회복제(大)", basePrice: 5000 },
      mp_small: { name: "내공 회복제(小)", basePrice: 800 },
      mp_medium: { name: "내공 회복제(中)", basePrice: 2000 },
      mp_large: { name: "내공 회복제(大)", basePrice: 4000 },
      trance_2: { name: "무아지경 비약(x2)", basePrice: 20000 },
      trance_5: { name: "무아지경 비약(x5)", basePrice: 150000 },
      trance_10: { name: "무아지경 비약(x10)", basePrice: 1000000 },
    };

    const item = potionData[id];
    const unitPrice = Math.floor(item.basePrice * realmMult);
    const totalPrice = unitPrice * quantity;

    if (game.coins < totalPrice) {
      set(s => ({ game: { ...s.game, lastReward: "금화가 부족합니다." } }));
      return;
    }

    set(s => ({
      game: {
        ...s.game,
        coins: s.game.coins - totalPrice,
        consumables: {
          ...s.game.consumables,
          [id]: (s.game.consumables[id] || 0) + quantity
        },
        lastReward: `${item.name} ${quantity}개 구매 완료!`
      }
    }));
    get().triggerSave(true);
  },
  useConsumable: (id: ConsumableId) => {
    const { game } = get();
    if ((game.consumables[id] || 0) <= 0) return;

    set(s => {
      let { hp, maxHp, mp, maxMp, attackMultiplier, buffTimeLeft, activeBuff } = s.game;
      let rewardMsg = "";

      if (id.startsWith("hp_")) {
        const pct = id === "hp_small" ? 0.3 : id === "hp_medium" ? 0.6 : 1.0;
        hp = Math.min(maxHp, hp + Math.floor(maxHp * pct));
        rewardMsg = "체력을 회복했습니다.";
      } else if (id.startsWith("mp_")) {
        const pct = id === "mp_small" ? 0.3 : id === "mp_medium" ? 0.6 : 1.0;
        mp = Math.min(maxMp, mp + Math.floor(maxMp * pct));
        rewardMsg = "내공을 회복했습니다.";
      } else if (id.startsWith("trance_")) {
        const mult = id === "trance_2" ? 2 : id === "trance_5" ? 5 : 10;
        attackMultiplier = mult;
        buffTimeLeft = 30; // 비약은 30초 지속
        activeBuff = `무아지경(${mult}배)`;
        rewardMsg = `${mult}배 무아지경 비약을 복용했습니다!`;
        startBuffCountdown();
      }

      return {
        game: {
          ...s.game,
          hp, mp, attackMultiplier, buffTimeLeft, activeBuff,
          consumables: {
            ...s.game.consumables,
            [id]: s.game.consumables[id] - 1
          },
          lastReward: rewardMsg
        }
      };
    });
    get().triggerSave();
  },
  useSkill: (skillName: string) => {
    const { game } = get();
    const skill = game.learnedSkills.find(s => s.name === skillName);
    if (!skill) return;

    if ((game.skillCooldowns[skillName] || 0) > 0) return;

    const mpCost = Math.floor((skill.multiplier || 1.5) * 10);
    if (game.mp < mpCost) {
      set(s => ({ game: { ...s.game, lastReward: "내공이 부족합니다." } }));
      return;
    }

    const cooldown = Math.floor((skill.multiplier || 1.5) * 3);

    if (game.masterDuel.isPlaying) {
      const playerAttack = get().getTotalAttack();
      const dmg = Math.floor(playerAttack * (skill.multiplier || 1.5));
      const finalDmg = Math.max(1, dmg - (game.masterDuel.rivalDef || 0));
      
      set(s => {
        const newRivalHp = Math.max(0, s.game.masterDuel.rivalHp - finalDmg);
        return {
          game: {
            ...s.game,
            mp: s.game.mp - mpCost,
            skillCooldowns: { ...s.game.skillCooldowns, [skillName]: cooldown },
            masterDuel: { ...s.game.masterDuel, rivalHp: newRivalHp }
          }
        };
      });
    } else {
      set(s => ({
        game: {
          ...s.game,
          mp: s.game.mp - mpCost,
          skillCooldowns: { ...s.game.skillCooldowns, [skillName]: cooldown }
        }
      }));
    }
  },
  equipItem: (id) => {
    set(s => {
      const item = s.game.ownedWeapons.find(w => w.id === id);
      if (!item) return s;
      return { game: { ...s.game, equippedWeaponId: item.slot === "mainWeapon" ? id : s.game.equippedWeaponId, equippedGear: { ...s.game.equippedGear, [item.slot]: id } } };
    });
    get().triggerSave();
  },
  equipWeapon: (id) => get().equipItem(id),
  unequipItem: (slot) => set(s => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null }, equippedWeaponId: slot === "mainWeapon" ? null : s.game.equippedWeaponId } })),
  addWeapon: (w) => set(s => ({ game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, w] } })),
  breakthrough: () => {
    const next = get().getNextRealmName();
    if (next) {
      const settings = REALM_SETTINGS[next];
      set(s => ({ game: { ...s.game, realm: next as any, maxHp: settings.hp, hp: settings.hp, maxMp: settings.mp, mp: settings.mp, dummyHp: settings.dummyHp, maxDummyHp: settings.dummyHp, unlockedTabs: (next === "삼류" || next === "이류" || next === "일류" || next === "절정") ? Array.from(new Set([...s.game.unlockedTabs, "master"])) : s.game.unlockedTabs } }));
      get().triggerSave(true);
    }
  },
  canBreakthrough: () => {
    const next = get().getNextRealmName();
    return next ? get().game.touches >= REALM_SETTINGS[next].minTouches : false;
  },
  getNextRealmName: () => {
    const list = Object.keys(REALM_SETTINGS);
    const idx = list.indexOf(get().game.realm);
    return list[idx + 1] ?? null;
  },
  resolveTimingMission: ({ success, score, grade, isFinal, maxStage = 0 }) => {
    const { game } = get();
    const gameType = game.timingMission.selectedGameType || "breath";
    
    // Update high scores and last scores
    const currentHighSet = { ...(game.timingMission.highScores || {}) };
    const currentLastSet = { ...(game.timingMission.lastScores || {}) };
    
    currentLastSet[gameType] = score;
    if (score > (currentHighSet[gameType] || 0)) {
        currentHighSet[gameType] = score;
    }

    if (!success && maxStage === 0) {
      if (isFinal) {
        set(s => ({ 
          game: { 
            ...s.game, 
            timingMission: { 
              ...s.game.timingMission, 
              available: false,
              highScores: currentHighSet,
              lastScores: currentLastSet
            }, 
            pendingInnEntry: false, 
            lastReward: "대련 패배" 
          } 
        }));
      }
      return;
    }

    // Success or at least one stage cleared
    const goldMult = REALM_SETTINGS[game.realm]?.goldMultiplier || 1;
    const rewards = buildExponentialRewards(maxStage, goldMult);
    
    let newCoins = game.coins;
    let newBaseAtk = game.baseAttack;
    let newAgi = game.agi;
    let newAtkMult = game.attackMultiplier;
    let multiHit = game.multiHitActive;
    let buffTime = game.buffTimeLeft;
    let buffName = game.activeBuff;

    rewards.forEach(r => {
      if (r.coins) newCoins += r.coins;
      if (r.baseAttackGain) newBaseAtk += r.baseAttackGain;
      if (r.agiGain) newAgi += r.agiGain;
      if (r.attackMultiplier) {
        newAtkMult = r.attackMultiplier;
        buffTime = r.buffSeconds || 7;
        buffName = r.buffName || "무아지경";
      }
      if (r.multiHit) {
        multiHit = true;
        buffTime = r.buffSeconds || 10;
        buffName = r.buffName || "다중공격";
      }
    });

    if (newAtkMult > 1 || multiHit) startBuffCountdown();
    
    const rewardLabels = rewards.map(r => r.label).join(", ");

    set(s => ({
       game: {
         ...s.game,
         coins: newCoins,
         baseAttack: newBaseAtk,
         agi: newAgi,
         attackMultiplier: newAtkMult,
         multiHitActive: multiHit,
         buffTimeLeft: buffTime,
         activeBuff: buffName,
         timingMission: { 
           ...s.game.timingMission, 
           highScores: currentHighSet,
           lastScores: currentLastSet,
           available: false 
         },
         pendingInnEntry: false,
         lastReward: maxStage > 0 ? `🎁 [Stage ${maxStage} 돌파!] ${rewardLabels}` : "대련 종료",
         unlockEffectText: maxStage > 0 ? `Stage ${maxStage} 돌파!\n${rewards[0]?.label || ""}${rewards.length > 1 ? " 등 획득" : ""}` : null
       }
    }));
    get().triggerSave(true);
  },
  claimDuelReward: () => {
     // resolveTimingMission에서 이미 보상을 지급하도록 변경함에 따라 로직 제거 (안전상 state만 리셋)
     set(s => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false } }));
  },
  setSelectedMasterLevel: (level: number) => {
    set(s => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, selectedLevel: level } } }));
  },
  startMasterDuel: () => {
    const { game } = get();
    if (game.hp <= 0) {
      set(s => ({ game: { ...s.game, lastReward: "체력이 부족하여 대결을 시작할 수 없습니다." } }));
      return;
    }
    
    const level = game.masterDuel.selectedLevel;
    
    // 재출몰 시간 체크 (쿨다운)
    const lastDefeat = game.masterDuel.lastDefeatTimes[level] || 0;
    const now = Date.now();
    // 1단계(1시간) ~ 100단계(24시간) 지수적/선형적 증가
    const cooldownMs = (3600000) * (1 + (level - 1) * 0.23); // 대략적인 증가식 선형
    const timeToWait = (lastDefeat + Math.min(86400000, cooldownMs)) - now;

    if (timeToWait > 0) {
      const waitHours = Math.ceil(timeToWait / 3600000);
      set(s => ({ game: { ...s.game, lastReward: `해당 악적은 처단되었습니다. ${waitHours}시간 뒤 다시 나타납니다.` } }));
      return;
    }

    const realms = ["삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const realmIdx = Math.min(realms.length - 1, Math.floor((level - 1) / 10));
    const targetRealm = realms[realmIdx];
    
    // 악적 이름 생성
    const prefixes = ["포악한", "비열한", "잔인한", "교활한", "어둠의", "피에 굶주린", "차가운", "공포의", "절망의", "파멸의"];
    const suffixes = ["무뢰배", "악당", "흑도고수", "살수", "마인", "괴인", "광인", "약탈자", "흉수", "패자"];
    let name = level === 1 ? "동네 건달 대장" : `${prefixes[level % 10]} ${targetRealm} ${suffixes[Math.floor(level/10) % 10]}`;
    if (level === 100) name = "최종 악적: 천마";

    // 스탯 계산 (지수적 증가)
    // 1단계 HP 100,000, 100단계는 엄청나게 높게
    const baseHp = 100000;
    const rivalMaxHp = Math.floor(baseHp * Math.pow(1.2, level - 1));
    
    // 공격력 설정: 캐릭터 경지와 악적 경지가 같으면 1/20 데미지
    // 다르면 보정치 적용
    const playerMaxHp = get().getTotalHp();
    const playerDef = get().getTotalDefense();
    
    let baseDmg = (playerMaxHp + playerDef) / 20;
    
    const playerRealms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const pIdx = playerRealms.indexOf(game.realm);
    const vIdx = playerRealms.indexOf(targetRealm); 
    
    // 캐릭터보다 높은 경지의 악적이면 데미지 대폭 증가
    const realmDiff = vIdx - pIdx;
    if (realmDiff > 0) {
        baseDmg *= Math.pow(2, realmDiff);
    } else if (realmDiff < 0) {
        baseDmg *= Math.pow(0.5, Math.abs(realmDiff));
    }
    
    const rivalAtk = Math.max(1, Math.floor(baseDmg));
    const rivalDef = Math.floor(level * 5 * Math.pow(1.1, level/10));
    
    set(s => ({ 
      game: { 
        ...s.game, 
        comboCount: 0, 
        masterDuel: { 
          ...s.game.masterDuel, 
          isPlaying: true, 
          rivalName: name, 
          rivalHp: rivalMaxHp, 
          rivalMaxHp, 
          rivalAtk, 
          rivalDef,
          timeLeft: 30.0, // 시간을 30초로 넉넉히 변경
          lastWinReward: undefined 
        } 
      }
    }));
  },
  updateMasterDuel: (dt: number) => {
    const state = get();
    if (!state.game.masterDuel.isPlaying) return;
    const newTime = state.game.masterDuel.timeLeft - dt;
    
    // 스킬 쿨다운 감소
    const newCooldowns = { ...state.game.skillCooldowns };
    let cooldownChanged = false;
    Object.keys(newCooldowns).forEach(skill => {
      if (newCooldowns[skill] > 0) {
        newCooldowns[skill] = Math.max(0, newCooldowns[skill] - dt);
        cooldownChanged = true;
      }
    });

    if (newTime <= 0) {
      set(s => ({ 
        game: { 
          ...s.game, 
          skillCooldowns: cooldownChanged ? newCooldowns : s.game.skillCooldowns,
          masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "시간 초과 패배..." } 
        } 
      }));
      return;
    }

    // 약 2초마다 공격 (20번 공격하면 죽게 하려면 30~40초 대결 기준)
    // 1.5초당 1발 공격 -> 30초면 20발
    if (Math.random() < 0.6 * dt) { 
      let dmg = state.game.masterDuel.rivalAtk;
      const { faction } = state.game;
      if (faction === "소림") dmg *= 0.7;
      
      const newPlayerHp = Math.max(0, get().game.hp - Math.floor(dmg));
      if (newPlayerHp <= 0) {
        set(s => ({ 
          game: { 
            ...s.game, 
            hp: 0, 
            skillCooldowns: cooldownChanged ? newCooldowns : s.game.skillCooldowns,
            masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "체력 소진 패배..." } 
          } 
        }));
        return;
      }
      set(s => ({ 
        game: { 
          ...s.game, 
          hp: newPlayerHp,
          skillCooldowns: cooldownChanged ? newCooldowns : s.game.skillCooldowns
        } 
      }));
    }
    
    set(s => ({ 
      game: { 
        ...s.game, 
        skillCooldowns: cooldownChanged ? newCooldowns : s.game.skillCooldowns,
        masterDuel: { ...s.game.masterDuel, timeLeft: newTime } 
      } 
    }));
  },
  tapMasterDuel: () => {
    set(state => {
      const { game } = state;
      if (!game.masterDuel.isPlaying) return state;
      let dmg = get().getTotalAttack();
      let multi = Math.random() < (get().getTotalCritRate() / 100) ? (get().getTotalCritDmg() / 100) : 1;
      const finalDmg = Math.floor(dmg * multi);
      const newRivalHp = Math.max(0, game.masterDuel.rivalHp - finalDmg);
      if (newRivalHp <= 0) {
        // 승리 단계 기록 (선택한 단계와 현재 도전 단계를 비교)
        const wonLevel = game.masterDuel.selectedLevel;
        const reward = generateRandomAccessory(game.realm, wonLevel);
        const nextLevel = wonLevel === game.masterDuel.currentLevel ? wonLevel + 1 : game.masterDuel.currentLevel;
        
        // 금화 및 수련경험치 대량 획득
        const goldReward = Math.floor(10000 * Math.pow(1.5, wonLevel - 1));
        const expReward = Math.floor(1000 * Math.pow(1.6, wonLevel - 1));

        const updatedDefeatTimes = { ...game.masterDuel.lastDefeatTimes, [wonLevel]: Date.now() };
        
        return { 
          game: { 
            ...game, 
            coins: game.coins + goldReward,
            exp: game.exp + expReward,
            touches: game.touches + expReward,
            ownedWeapons: [...game.ownedWeapons, reward], 
            masterDuel: { 
              ...game.masterDuel, 
              isPlaying: false, 
              currentLevel: nextLevel,
              highestLevelReached: Math.max(game.masterDuel.highestLevelReached, wonLevel),
              lastDefeatTimes: updatedDefeatTimes,
              lastWinReward: `🎉 ${reward.name} 획득!\n(+${goldReward.toLocaleString()}냥, 경험치 +${expReward.toLocaleString()})` 
            } 
          } 
        };
      }
      return { game: { ...game, masterDuel: { ...game.masterDuel, rivalHp: newRivalHp } } };
    });
  },
  markInnEntryHandled: () => set(s => ({ game: { ...s.game, pendingInnEntry: false } })),
  resetGame: () => { if(typeof window !== "undefined") localStorage.removeItem("murimbook-game-save-v10"); set({ game: { ...defaultGameData } }); },
  learnSkill: (s) => set(s_ => ({ game: { ...s_.game, coins: s_.game.coins - (s.price || 0), learnedSkills: [...s_.game.learnedSkills, { ...s, level: 1, exp: 0, maxExp: 500 }] } })),
  heal: (a) => set(s => ({ game: { ...s.game, hp: Math.min(s.game.maxHp, s.game.hp + a) } })),
  takeDamage: (d) => set(s => ({ game: { ...s.game, hp: Math.max(0, s.game.hp - d) } })),
  resetDummy: () => set(s => ({ game: { ...s.game, dummyHp: s.game.maxDummyHp } })),
  completeMinigame: (success: boolean, combo: number = 0) => {
    // 구현부 (기존 로직이 있다면 복구, 지금은 빈 함수로 두되 타입만 맞춤)
  }
}));