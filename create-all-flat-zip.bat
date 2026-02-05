@echo off
chcp 65001 >nul
echo ========================================
echo   Создание FLAT ZIP (все файлы в корне)
echo ========================================
echo.
echo Извлекаю ВСЕ файлы из всех папок в корень архива...
echo.

REM Запуск PowerShell скрипта
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-all-files-flat-zip.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)

pause




