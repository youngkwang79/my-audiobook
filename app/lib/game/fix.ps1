
$path = "useGameStore.ts"
$content = Get-Content $path -Raw
# Force save as UTF-8 without BOM
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
