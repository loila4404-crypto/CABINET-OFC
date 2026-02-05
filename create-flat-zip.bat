@echo off
chcp 65001 >nul
echo ========================================
echo   Создание FLAT ZIP архива (без папок)
echo ========================================
echo.
echo ВНИМАНИЕ: Все файлы будут в корне архива!
echo.

REM Запуск PowerShell скрипта
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-flat-zip.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)

pause




