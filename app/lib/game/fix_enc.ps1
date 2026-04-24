
$path = "useGameStore.ts"
$content = [System.IO.File]::ReadAllText($path)
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $enc)
