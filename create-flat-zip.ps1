# Script for creating flat ZIP archive (all files in root, no folders)
# Excludes node_modules, .next, databases and other unnecessary files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating FLAT ZIP archive (no folders)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Archive name
$archiveName = "reddit-cabinet-flat-$(Get-Date -Format 'yyyy-MM-dd-HHmm').zip"

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
    
    return $true
}

$fileCount = $allFiles.Count
Write-Host "[INFO] Files found: $fileCount" -ForegroundColor Green

# Show size before archiving
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "[INFO] Total size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "[2/3] Creating flat ZIP archive (all files in root)..." -ForegroundColor Cyan

# Create temporary folder
$tempFolder = Join-Path $env:TEMP "flat-archive-$(Get-Random)"
New-Item -ItemType Directory -Path $tempFolder -Force | Out-Null

try {
    $rootPath = (Get-Location).Path
    $fileMap = @{}
    $counter = 1
    
    # Copy all files to temp folder with unique names
    foreach ($file in $allFiles) {
        $relativePath = $file.FullName.Substring($rootPath.Length + 1)
        $fileName = $file.Name
        
        # Create unique filename if duplicate exists
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
        $extension = [System.IO.Path]::GetExtension($fileName)
        
        # Add folder prefix to avoid conflicts
        $folderPrefix = ($relativePath -split '\\')[0]
        if ($folderPrefix -ne $fileName) {
            $newFileName = "$folderPrefix-$fileName"
        } else {
            $newFileName = $fileName
        }
        
        # Handle duplicates
        if ($fileMap.ContainsKey($newFileName)) {
            $fileMap[$newFileName]++
            $newFileName = "$baseName-$($fileMap[$newFileName])$extension"
        } else {
            $fileMap[$newFileName] = 0
        }
        
        $destPath = Join-Path $tempFolder $newFileName
        Copy-Item -Path $file.FullName -Destination $destPath -Force
        
        if ($counter % 20 -eq 0) {
            Write-Host "  Processed $counter / $fileCount files..." -ForegroundColor Gray
        }
        $counter++
    }
    
    Write-Host "[3/3] Compressing archive..." -ForegroundColor Cyan
    
    # Create archive from temp folder
    Compress-Archive -Path "$tempFolder\*" -DestinationPath $archiveName -CompressionLevel Optimal -Force
    
    $archiveSize = (Get-Item $archiveName).Length / 1MB
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  FLAT ARCHIVE CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "File name: $archiveName" -ForegroundColor White
    Write-Host "Archive size: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor White
    Write-Host "Files included: $fileCount" -ForegroundColor White
    Write-Host ""
    Write-Host "NOTE: All files are in root folder (no subfolders)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  UPLOAD INSTRUCTIONS:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Open https://github.com/new" -ForegroundColor Yellow
    Write-Host "2. Create new repository (name: reddit-cabinet)" -ForegroundColor Yellow
    Write-Host "3. On repository page click 'uploading an existing file'" -ForegroundColor Yellow
    Write-Host "4. Drag and drop file $archiveName to browser" -ForegroundColor Yellow
    Write-Host "5. Extract archive - all files will be in root folder" -ForegroundColor Yellow
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
} finally {
    # Cleanup temp folder
    Remove-Item -Path $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




