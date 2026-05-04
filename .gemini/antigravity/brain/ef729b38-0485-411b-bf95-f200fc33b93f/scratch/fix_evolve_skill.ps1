
$filePath = "useGameStore.ts"
$lines = Get-Content $filePath -Encoding utf8

if ($null -eq $lines) {
    Write-Error "Failed to read file"
    exit 1
}

$newEvolveSkill = @"
  evolveSkill: (skillId: string, nextSkillId: string) => {
    const { game } = get();
    const learned = (game.martialArtsSkills || []).find(s => s.skillId === skillId);
    if (!learned || learned.stars < 10) return { success: false, message: "10성 도달 시에만 진화가 가능합니다." };

    const skill = MARTIAL_COMPENDIUM.find(s => s.id === skillId);
    const nextSkill = MARTIAL_COMPENDIUM.find(s => s.id === nextSkillId);
    if (!skill || !nextSkill) return { success: false, message: "진화 대상 무공을 찾을 수 없습니다." };

    const reqs = getEvolutionRequirements(skill, nextSkill);

    if (game.coins < reqs.goldCost) return { success: false, message: "전금이 부족합니다." };
    if (game.insights < reqs.insightCost) return { success: false, message: "깨달음이 부족합니다." };
    
    const currentMats = game.materials?.[reqs.materialId] || 0;
    if (currentMats < reqs.materialCost) return { success: false, message: `\${reqs.materialName}이 부족합니다.` };

    set((s: any) => {
      const nextMartial = (s.game.martialArtsSkills || []).filter((ms: any) => ms.skillId !== skillId);
      const nextLearned = (s.game.learnedSkills || []).filter((ls: any) => ls.skillId !== skillId);
      const finalMartial = ensureLearnedSkill(nextMartial, nextSkillId);
      return {
        game: {
          ...s.game,
          coins: s.game.coins - reqs.goldCost,
          insights: s.game.insights - reqs.insightCost,
          materials: {
            ...s.game.materials,
            [reqs.materialId]: currentMats - reqs.materialCost
          },
          martialArtsSkills: finalMartial,
          learnedSkills: nextLearned 
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `[\${nextSkill.name}] (으)로의 진화에 성공했습니다!` };
  },
"@

$newLines = $lines[0..1786] + $newEvolveSkill + $lines[1833..($lines.Length-1)]

$newLines | Set-Content $filePath -Encoding utf8
