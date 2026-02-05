# Script for creating ZIP archive for GitHub
# Excludes node_modules, .next, databases and other unnecessary files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating ZIP archive for GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Archive name
$archiveName = "reddit-cabinet-$(Get-Date -Format 'yyyy-MM-dd-HHmm').zip"

# Remove old archive if exists
if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
    Write-Host "[INFO] Removed old archive" -ForegroundColor Yellow
}

Write-Host "[1/3] Collecting files for archive..." -ForegroundColor Cyan

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
    
    return $true
}

$fileCount = $allFiles.Count
Write-Host "[INFO] Files found for archiving: $fileCount" -ForegroundColor Green

# Show size before archiving
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "[INFO] Total size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "[2/3] Creating ZIP archive..." -ForegroundColor Cyan

# Create archive
try {
    # Use relative paths
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
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  UPLOAD INSTRUCTIONS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Open https://github.com/new" -ForegroundColor Yellow
    Write-Host "2. Create new repository (name: reddit-cabinet)" -ForegroundColor Yellow
    Write-Host "3. On repository page click 'uploading an existing file'" -ForegroundColor Yellow
    Write-Host "4. Drag and drop file $archiveName to browser" -ForegroundColor Yellow
    Write-Host "5. Extract archive on GitHub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OR use GitHub Desktop:" -ForegroundColor Cyan
    Write-Host "1. Download: https://desktop.github.com" -ForegroundColor Yellow
    Write-Host "2. File > Add Local Repository" -ForegroundColor Yellow
    Write-Host "3. Select project folder" -ForegroundColor Yellow
    Write-Host "4. Click 'Publish repository'" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR CREATING ARCHIVE" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "1. Close all programs using project files" -ForegroundColor White
    Write-Host "2. Run script as administrator" -ForegroundColor White
    Write-Host "3. Use Git for upload instead of archive" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
