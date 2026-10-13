param([Parameter(Mandatory=$true)][string]$Source)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile($Source)
$left=$src.Width; $top=$src.Height; $right=0; $bottom=0
for($y=0;$y -lt $src.Height;$y++) {
  for($x=0;$x -lt $src.Width;$x++) {
    if($src.GetPixel($x,$y).A -gt 32) {
      $left=[Math]::Min($left,$x); $right=[Math]::Max($right,$x)
      $top=[Math]::Min($top,$y); $bottom=[Math]::Max($bottom,$y)
    }
  }
}
$w=$right-$left+1; $h=$bottom-$top+1
$ratio=248.0/[Math]::Max($w,$h)
$dw=[int][Math]::Round($w*$ratio); $dh=[int][Math]::Round($h*$ratio)
$dst=New-Object System.Drawing.Bitmap 256,256
$graphics=[System.Drawing.Graphics]::FromImage($dst)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$dest=New-Object System.Drawing.Rectangle ([int]((256-$dw)/2)),(254-$dh),$dw,$dh
$crop=New-Object System.Drawing.Rectangle $left,$top,$w,$h
$graphics.DrawImage($src,$dest,$crop,[System.Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose(); $src.Dispose()
$dst.Save((Join-Path $PSScriptRoot 'gunner-volley.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
