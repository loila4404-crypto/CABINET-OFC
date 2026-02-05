$archiveName = "reddit-cabinet.zip"
if (Test-Path $archiveName) { Remove-Item $archiveName -Force }
Write-Host "Creating archive..." -ForegroundColor Cyan
$items = @("app", "lib", "prisma", "public", "extension", "package.json", "package-lock.json", "next.config.js", "tsconfig.json", "tailwind.config.js", "postcss.config.js", "vercel.json")
$mdFiles = Get-ChildItem -Filter "*.md" | Select-Object -ExpandProperty Name
$items += $mdFiles
$items = $items | Where-Object { Test-Path $_ }
Compress-Archive -Path $items -DestinationPath $archiveName -CompressionLevel Optimal -Force
$size = [math]::Round((Get-Item $archiveName).Length / 1MB, 2)
Write-Host "Archive created: $archiveName ($size MB)" -ForegroundColor Green
