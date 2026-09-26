Add-Type -AssemblyName System.Drawing
$studyRoot = $PSScriptRoot
$files = @(Get-ChildItem -LiteralPath $studyRoot -Filter '*.png' | Where-Object { $_.Name -match '^\d' } | Sort-Object Name)
$cellWidth = 360
$cellHeight = 440
$rows = [int][Math]::Ceiling($files.Count / 3.0)
$sheet = New-Object System.Drawing.Bitmap (1080), ($rows * $cellHeight + 80)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::FromArgb(244,242,237))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$font = New-Object System.Drawing.Font 'Segoe UI', 11
$titleFont = New-Object System.Drawing.Font 'Segoe UI', 17, ([System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font 'Segoe UI', 9
$ink = [System.Drawing.Brushes]::DarkSlateGray
$g.DrawString('BJEA / Generated avatar study', $titleFont, $ink, 20, 10)
$g.DrawString('Exact model: openai/gpt-image-2.5-sunburst | originals unchanged | thumbnail/crop QA below', $smallFont, $ink, 20, 43)
$names = @{
 '01-reader'='01 / Reader'; '02-explorer'='02 / Explorer'; '03-maker'='03 / Maker';
 '04-reader-evolve'='04 / Reader + cap'; '05-reader-evolve'='05 / Reader + cap + pin';
 '06-safety'='06 / Injection safety probe'; '07-reader-low'='07 / Reader, low quality'
}
for ($i=0; $i -lt $files.Count; $i++) {
 $x=($i%3)*$cellWidth; $y=[int][Math]::Floor($i/3)*$cellHeight+80
 $g.DrawString($names[$files[$i].BaseName],$font,$ink,($x+18),($y+6))
 $im=[System.Drawing.Image]::FromFile($files[$i].FullName)
 for ($cy=0; $cy -lt 256; $cy+=16) { for ($cx=0; $cx -lt 256; $cx+=16) {
  $brush=if ((($cx/16+$cy/16)%2) -eq 0) {[System.Drawing.Brushes]::White} else {[System.Drawing.Brushes]::Gainsboro}
  $g.FillRectangle($brush,($x+52+$cx),($y+38+$cy),16,16)
 }}
 $g.DrawImage($im,($x+52),($y+38),256,256)
 $g.FillRectangle([System.Drawing.Brushes]::White,($x+22),($y+320),32,32)
 $g.DrawImage($im,($x+22),($y+320),32,32)
 $g.FillRectangle([System.Drawing.Brushes]::White,($x+75),($y+304),64,64)
 $g.DrawImage($im,($x+75),($y+304),64,64)
 $path=New-Object System.Drawing.Drawing2D.GraphicsPath
 $path.AddEllipse(($x+158),($y+304),64,64)
 $state=$g.Save(); $g.SetClip($path)
 $g.FillRectangle([System.Drawing.Brushes]::White,($x+158),($y+304),64,64)
 $g.DrawImage($im,($x+158),($y+304),64,64); $g.Restore($state); $path.Dispose()
 $g.FillRectangle([System.Drawing.Brushes]::DarkSlateGray,($x+243),($y+304),64,64)
 $g.DrawImage($im,($x+243),($y+304),64,64)
 $g.DrawString('32px      64px        circle        dark',$smallFont,$ink,($x+22),($y+374))
 $result=Get-Content -LiteralPath (Join-Path $studyRoot ($files[$i].BaseName+'.result.json')) -Raw | ConvertFrom-Json
 $info=('{0:N2}s | USD {1:F5} | 1024px RGBA' -f ($result.elapsed_ms/1000),$result.response.usage.cost)
 $g.DrawString($info,$smallFont,$ink,($x+22),($y+402))
 $im.Dispose()
}
$sheet.Save((Join-Path $studyRoot 'contact-sheet.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $sheet.Dispose(); $font.Dispose(); $titleFont.Dispose(); $smallFont.Dispose()
Write-Output 'Saved contact-sheet.png (original samples unchanged).'
