@echo off
chcp 65001 >nul
echo ========================================
echo   Создание ZIP архива проекта
echo ========================================
echo.

set ARCHIVE_NAME=reddit-cabinet.zip

echo [1/3] Удаление старого архива (если есть)...
if exist "%ARCHIVE_NAME%" del "%ARCHIVE_NAME%"
echo [✓] Готово
echo.

echo [2/3] Создание архива...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$items = @(); Get-ChildItem -Path . -Recurse | Where-Object { $_.FullName -notlike '*\node_modules\*' -and $_.FullName -notlike '*\.next\*' -and $_.FullName -notlike '*\.git\*' -and $_.FullName -notlike '*\.vercel\*' -and $_.FullName -notlike '*\out\*' -and $_.Name -notlike '*.db' -and $_.Name -notlike '*.db-journal' -and $_.Name -ne '.env' -and $_.Name -notlike '*.log' } | ForEach-Object { $items += $_.FullName }; Compress-Archive -Path $items -DestinationPath '%ARCHIVE_NAME%' -CompressionLevel Optimal -Force"
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)
echo [✓] Архив создан
echo.

echo [3/3] Проверка размера...
powershell -NoProfile -Command "$size = [math]::Round((Get-Item '%ARCHIVE_NAME%').Length / 1MB, 2); Write-Host '[✓] Размер архива:' $size 'MB'"
echo.

echo ========================================
echo   Архив готов: %ARCHIVE_NAME%
echo ========================================
echo.
echo Теперь вы можете:
echo 1. Загрузить архив на GitHub
echo 2. Или использовать Git для загрузки
echo.
pause

