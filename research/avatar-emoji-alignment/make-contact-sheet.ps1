Add-Type -AssemblyName System.Drawing
$root = $PSScriptRoot
$samples = @(
  @{ File = '00-current-fox.png'; Name = 'Current / realistic 3D' },
  @{ File = '00-report-fox.png'; Name = 'Report reference / sticker' },
  @{ File = '01-report-style.png'; Name = 'A / matte outlined sticker' },
  @{ File = '02-simple-emoji.png'; Name = 'B / minimal emoji' },
  @{ File = '03-other-subject.png'; Name = 'Selected A / toast verification' }
)
$sheet = [System.Drawing.Bitmap]::new(880, 1455)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$graphics.Clear([System.Drawing.Color]::FromArgb(244, 242, 237))
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$titleFont = [System.Drawing.Font]::new('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$labelFont = [System.Drawing.Font]::new('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$smallFont = [System.Drawing.Font]::new('Segoe UI', 9)
$graphics.DrawString('BJEA / Emoji avatar alignment', $titleFont, [System.Drawing.Brushes]::DarkSlateGray, 20, 12)
$graphics.DrawString('Same model; A and B use the same fox + laptop recipe. Originals are unchanged.', $smallFont, [System.Drawing.Brushes]::DarkSlateGray, 20, 47)
for ($i = 0; $i -lt $samples.Count; $i++) {
  $x = 20 + ($i % 2) * 440
  $y = 78 + [int][Math]::Floor($i / 2) * 455
  $graphics.DrawString($samples[$i].Name, $labelFont, [System.Drawing.Brushes]::DarkSlateGray, $x, $y)
  $image = [System.Drawing.Image]::FromFile((Join-Path $root $samples[$i].File))
  for ($cy = 0; $cy -lt 320; $cy += 20) {
    for ($cx = 0; $cx -lt 320; $cx += 20) {
      $brush = if ((($cx / 20 + $cy / 20) % 2) -eq 0) { [System.Drawing.Brushes]::White } else { [System.Drawing.Brushes]::Gainsboro }
      $graphics.FillRectangle($brush, $x + 50 + $cx, $y + 35 + $cy, 20, 20)
    }
  }
  $graphics.DrawImage($image, $x + 50, $y + 35, 320, 320)
  $graphics.FillRectangle([System.Drawing.Brushes]::White, $x + 55, $y + 372, 32, 32)
  $graphics.DrawImage($image, $x + 55, $y + 372, 32, 32)
  $graphics.FillRectangle([System.Drawing.Brushes]::White, $x + 118, $y + 366, 48, 48)
  $graphics.DrawImage($image, $x + 118, $y + 366, 48, 48)
  $clip = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $clip.AddEllipse($x + 197, $y + 366, 48, 48)
  $state = $graphics.Save()
  $graphics.SetClip($clip)
  $graphics.FillRectangle([System.Drawing.Brushes]::White, $x + 197, $y + 366, 48, 48)
  $graphics.DrawImage($image, $x + 197, $y + 366, 48, 48)
  $graphics.Restore($state)
  $clip.Dispose()
  $graphics.FillRectangle([System.Drawing.Brushes]::DarkSlateGray, $x + 276, $y + 366, 48, 48)
  $graphics.DrawImage($image, $x + 276, $y + 366, 48, 48)
  $graphics.DrawString('32px          48px          circle          dark', $smallFont, [System.Drawing.Brushes]::DarkSlateGray, $x + 52, $y + 420)
  $image.Dispose()
}
$sheet.Save((Join-Path $root 'contact-sheet.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $sheet.Dispose(); $titleFont.Dispose(); $labelFont.Dispose(); $smallFont.Dispose()
Write-Output 'Saved contact-sheet.png.'
