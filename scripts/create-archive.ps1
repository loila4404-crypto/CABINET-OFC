# Скрипт для создания ZIP архива проекта для GitHub
# Исключает node_modules, .next, базы данных и другие ненужные файлы

Write-Host "📦 Создание архива проекта..." -ForegroundColor Cyan

# Исключаемые папки и файлы
$excludeItems = @(
    "node_modules",
    ".next",
    "out",
    ".vercel",
    ".git",
    "*.db",
    "*.db-journal",
    ".env",
    ".env.local",
    "*.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*"
)

# Имя архива
$archiveName = "reddit-cabinet-$(Get-Date -Format 'yyyy-MM-dd').zip"

# Удалить старый архив если существует
if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
    Write-Host "🗑️  Удален старый архив" -ForegroundColor Yellow
}

# Получить все файлы и папки, исключая ненужные
$itemsToArchive = Get-ChildItem -Path . -Exclude $excludeItems | Where-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($exclude in $excludeItems) {
        if ($item.Name -like $exclude -or $item.FullName -like "*\$exclude\*") {
            $shouldExclude = $true
            break
        }
    }
    
    return -not $shouldExclude
}

Write-Host "📋 Файлов для архивации: $($itemsToArchive.Count)" -ForegroundColor Green

# Создать архив
try {
    Compress-Archive -Path $itemsToArchive.FullName -DestinationPath $archiveName -CompressionLevel Optimal -Force
    $archiveSize = (Get-Item $archiveName).Length / 1MB
    Write-Host "✅ Архив создан: $archiveName" -ForegroundColor Green
    Write-Host "📊 Размер архива: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📤 Теперь вы можете загрузить этот файл на GitHub:" -ForegroundColor Yellow
    Write-Host "   1. Создайте репозиторий на GitHub" -ForegroundColor White
    Write-Host "   2. Нажмите 'uploading an existing file'" -ForegroundColor White
    Write-Host "   3. Перетащите файл $archiveName" -ForegroundColor White
    Write-Host "   4. Распакуйте архив в репозиторий" -ForegroundColor White
} catch {
    Write-Host "❌ Ошибка при создании архива: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Альтернатива: Используйте Git для загрузки:" -ForegroundColor Yellow
    Write-Host "   git init" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor White
    Write-Host "   git commit -m 'Initial commit'" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
}

