# Script for creating ZIP archive WITH FOLDER STRUCTURE (for working website)
# This archive will preserve folder structure so Next.js project will work

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating ZIP with FOLDER STRUCTURE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This archive will preserve folder structure" -ForegroundColor Yellow
Write-Host "so your Next.js website will work correctly!" -ForegroundColor Yellow
Write-Host ""

# Archive name
$archiveName = "reddit-cabinet-working-$(Get-Date -Format 'yyyy-MM-dd-HHmm').zip"

# Remove old archive if exists
if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
    Write-Host "[INFO] Removed old archive" -ForegroundColor Yellow
}

Write-Host "[1/3] Collecting files..." -ForegroundColor Cyan

# Get all files recursively, excluding unnecessary ones
$allFiles = Get-ChildItem -Path . -Recurse -File -Force | Where-Object {
    $item = $_
    $fullPath = $item.FullName
    
    # Skip if in excluded folders
    if ($fullPath -match '\\node_modules\\' -or 
        $fullPath -match '\\.next\\' -or 
        $fullPath -match '\\out\\' -or 
        $fullPath -match '\\.vercel\\' -or 
        $fullPath -match '\\.git\\') {
        return $false
    }
    
    # Skip database files
    if ($item.Extension -eq ".db" -or $item.Extension -eq ".db-journal") {
        return $false
    }
    
    # Skip .env files (but keep .env.example)
    if ($item.Name -like ".env*" -and $item.Name -ne ".env.example") {
        return $false
    }
    
    # Skip log files
    if ($item.Extension -eq ".log" -or $item.Name -like "*.log") {
        return $false
    }
    
    # Skip system files
    if ($item.Name -eq ".DS_Store" -or $item.Name -eq "Thumbs.db") {
        return $false
    }
    
    # Skip ZIP archives
    if ($item.Extension -eq ".zip") {
        return $false
    }
    
    return $true
}

$fileCount = $allFiles.Count
Write-Host "[INFO] Total files found: $fileCount" -ForegroundColor Green

# Show size before archiving
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "[INFO] Total size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "[2/3] Creating ZIP archive with folder structure..." -ForegroundColor Cyan

# Create archive preserving folder structure
try {
    # Get relative paths for archive
    $rootPath = (Get-Location).Path
    $filesToArchive = $allFiles | ForEach-Object {
        $_.FullName
    }
    
    Compress-Archive -Path $filesToArchive -DestinationPath $archiveName -CompressionLevel Optimal -Force
    
    $archiveSize = (Get-Item $archiveName).Length / 1MB
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ARCHIVE CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "File name: $archiveName" -ForegroundColor White
    Write-Host "Archive size: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor White
    Write-Host "Files included: $fileCount" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: Folder structure is preserved!" -ForegroundColor Green
    Write-Host "  - app/ folder with all pages and API routes" -ForegroundColor White
    Write-Host "  - lib/ folder with libraries" -ForegroundColor White
    Write-Host "  - prisma/ folder with database schema" -ForegroundColor White
    Write-Host "  - public/ folder with static files" -ForegroundColor White
    Write-Host "  - extension/ folder with browser extension" -ForegroundColor White
    Write-Host ""
    Write-Host "After extracting, run:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  UPLOAD INSTRUCTIONS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Open https://github.com/new" -ForegroundColor Yellow
    Write-Host "2. Create new repository (name: reddit-cabinet)" -ForegroundColor Yellow
    Write-Host "3. On repository page click 'uploading an existing file'" -ForegroundColor Yellow
    Write-Host "4. Drag and drop file $archiveName to browser" -ForegroundColor Yellow
    Write-Host "5. Extract archive - folder structure will be preserved" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR CREATING ARCHIVE" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




