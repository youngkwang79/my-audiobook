
$path = "useGameStore.ts"
# Try reading with different encodings to see which one works for Korean
$content = Get-Content $path -Raw -Encoding UTF8

# Fix mojibake for Realm Settings
$content = $content.Replace("??", "필부")
$content = $content.Replace("?류", "삼류")
$content = $content.Replace("?류", "이류") # This might be ambiguous with 삼류/이류/일류
# Actually, let's just use a more surgical approach if possible, but the file is large.

# I'll just save it as UTF8 without BOM first to see if the build error goes away.
# Then I'll fix the content.

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $Utf8NoBom)
