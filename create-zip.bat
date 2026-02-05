@echo off
chcp 65001 >nul
echo ========================================
echo   Создание ZIP архива для GitHub
echo ========================================
echo.

REM Запуск PowerShell скрипта
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-zip-for-github.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)

pause




