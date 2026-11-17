# insagram フォルダの JPG を Instagram 用 1080x1350 (4:5) に変換して images/ に保存します。
# A4縦のチラシは Instagram の許容比率(4:5)より縦長なので、切り抜かずに左右へ余白を足します。
# 使い方: powershell -ExecutionPolicy Bypass -File prepare-images.ps1
Add-Type -AssemblyName System.Drawing

$src = Split-Path -Parent $PSScriptRoot          # insagram フォルダ
$dst = Join-Path $PSScriptRoot 'images'
New-Item -ItemType Directory -Force $dst | Out-Null

$W = 1080; $H = 1350
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]92)

Get-ChildItem $src -File | Where-Object { $_.Extension -match '^\.(jpe?g|png)$' } | Sort-Object Name | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $scale = [Math]::Min($W / $img.Width, $H / $img.Height)
    $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
    $bmp = New-Object System.Drawing.Bitmap $W, $H
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, [int](($W - $w) / 2), [int](($H - $h) / 2), $w, $h)
    $out = Join-Path $dst ($_.BaseName + '.jpg')
    $bmp.Save($out, $codec, $ep)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    Write-Output "OK $($_.Name) -> images\$($_.BaseName).jpg"
}
