Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\owner\.gemini\antigravity-ide\brain\6fff49c2-f667-4e65-a3fa-902fa5ba80db\unghon_clean_1781193055384.png"
$outputPath = "C:\Users\owner\.gemini\antigravity-ide\brain\6fff49c2-f667-4e65-a3fa-902fa5ba80db\unghon_with_text.png"

if (-not (Test-Path $inputPath)) {
    Write-Error "Input file not found: $inputPath"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($inputPath)
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$width = $bmp.Width
$height = $bmp.Height

function AddOutlineText($graphics, $text, $fontFamilyName, $fontSize, $fontStyle, $fillBrush, $penColor, $penWidth, $yPosition) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $emSize = $graphics.DpiY * $fontSize / 72
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, $yPosition, $width, ($emSize * 1.5))
    
    $family = New-Object System.Drawing.FontFamily($fontFamilyName)
    $path.AddString($text, $family, [int]$fontStyle, $emSize, $rect, $sf)
    
    $pen = New-Object System.Drawing.Pen($penColor, $penWidth)
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($pen, $path)
    
    $graphics.FillPath($fillBrush, $path)
    
    $pen.Dispose()
    $family.Dispose()
    $path.Dispose()
    $sf.Dispose()
}

$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 230, 80))
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$blackColor = [System.Drawing.Color]::FromArgb(0, 0, 0)

# Build strings using char arrays
$subText = [string][char[]]@(0xAE68, 0xB2EC, 0xC74C, 0xC758, 0x20, 0xAC80, 0xACFC, 0x20, 0xC18C, 0xB144)
$titleText = [string][char[]]@(0xC6C5, 0x20, 0x20, 0xD63C)

# Draw Subtitle at y = 750
AddOutlineText $g $subText "Malgun Gothic" 24 1 $whiteBrush $blackColor 6 750

# Draw Main Title at y = 820
AddOutlineText $g $titleText "Malgun Gothic" 60 1 $goldBrush $blackColor 10 820

$g.Dispose()
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$goldBrush.Dispose()
$whiteBrush.Dispose()

Write-Host "Successfully generated text overlay image"
