
$path = "useGameStore.ts"
try {
    $content = Get-Content $path -Raw
} catch {
    Write-Error "Failed to read file: $_"
    exit 1
}

if ([string]::IsNullOrEmpty($content)) {
    Write-Error "Content is empty"
    exit 1
}

# Add imports
if ($content -notlike "*from './nightSystem'*") {
    $target = "import { defaultGameData, loadGame, saveGame } from './storage';"
    $replacement = "import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS } from './nightSystem';`nimport { defaultGameData, loadGame, saveGame } from './storage';"
    $content = $content.Replace($target, $replacement)
}

# Add interface methods
if ($content -notlike "*visitGiru: () => void;*") {
    $target = "triggerCombatTrap: (multiplier: number) => void;"
    $replacement = "triggerCombatTrap: (multiplier: number) => void;`n  visitGiru: () => void;`n  interactGiru: (npcId: string, actionId: string) => { success: boolean; message: string; event?: any };"
    $content = $content.Replace($target, $replacement)
}

# Add implementation
if ($content -notlike "*visitGiru: () => {*") {
    $implementation = @"
  visitGiru: () => {
    set((s: any) => ({ game: { ...s.game, activeTab: "giru" } }));
  },
  interactGiru: (npcId: string, actionId: string) => {
    const { game } = get();
    const action = GIRU_ACTIONS.find(a => a.id === actionId);
    if (!action) return { success: false, message: "잘못된 행동입니다." };
    if (game.coins < action.cost) return { success: false, message: "금화가 부족합니다." };

    const npcEvents = GIRU_EVENTS.filter(e => e.npcId === npcId && e.action === actionId);
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const possibleEvents = npcEvents.filter(e => !e.condition || (favor >= (e.condition.favorMin || 0)));
    
    if (possibleEvents.length === 0) {
        set((s: any) => {
            const nextFavors = { ...s.game.npcFavors };
            nextFavors[npcId] = (nextFavors[npcId] || 0) + (action.favor || 0);
            return {
                game: {
                    ...s.game,
                    coins: s.game.coins - action.cost,
                    npcFavors: nextFavors
                }
            };
        });
        get().triggerSave(true);
        return { success: true, message: "대화를 나눴습니다." };
    }
    
    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
    
    set((s: any) => {
      const nextFavors = { ...s.game.npcFavors };
      nextFavors[npcId] = (nextFavors[npcId] || 0) + (event.result.favor || action.favor || 0);
      
      const nextBuffs = [...(s.game.nightBuffs || [])];
      if (event.result.buff) {
        nextBuffs.push({
          id: event.id,
          name: event.effect,
          effect: event.result.buff,
          expiresAt: Date.now() + 30 * 60 * 1000
        });
      }
      
      return {
        game: {
          ...s.game,
          coins: s.game.coins - action.cost,
          npcFavors: nextFavors,
          nightBuffs: nextBuffs,
          gamblingTokens: (s.game.gamblingTokens || 0) + (event.result.token || 0),
        }
      };
    });
    
    get().triggerSave(true);
    return { success: true, message: event.text, event };
  },
"@
    $target = "triggerCombatTrap: (multiplier: number) => {"
    $content = $content.Replace($target, $implementation + "`n  " + $target)
}

Set-Content $path $content
