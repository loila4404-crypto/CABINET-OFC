@echo off
chcp 65001 >nul
echo ========================================
echo   Создание ZIP с СТРУКТУРОЙ ПАПОК
echo ========================================
echo.
echo Этот архив сохранит структуру папок,
echo чтобы сайт Next.js работал правильно!
echo.

REM Запуск PowerShell скрипта
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-working-zip.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)

pause




