
$path = 'app\lib\game\useGameStore.ts'
$content = Get-Content $path | Out-String

if ($content) {
    # Yabawi 20% Refund on failure
    # I need to find the branch where success is false and it's yabawi
    # Since I can't easily see the context, I'll try to find a unique-ish string
    
    # Actually, I'll search for the failure logic in resolveTimingMission
    $target = "if (!p.success) {"
    # I need to be careful not to replace all failures
    
    # Let's try to match more specifically if possible
    # But wait, I'll just look for 'yabawi' related logic in the store
}
