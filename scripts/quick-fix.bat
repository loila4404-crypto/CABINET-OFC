@echo off
chcp 65001 >nul
echo ========================================
echo   Быстрое исправление (без остановки сервера)
echo ========================================
echo.

echo ⚠️  ВНИМАНИЕ: Этот скрипт попытается исправить проблемы
echo    без остановки сервера. Если не поможет - используйте fix-database.bat
echo.

echo [1/2] Перегенерация Prisma Client...
node node_modules\prisma\build\index.js generate
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Не удалось перегенерировать Prisma Client
    echo.
    echo Используйте fix-database.bat (остановите сервер сначала)
    pause
    exit /b 1
)
echo ✅ Prisma Client перегенерирован
echo.

echo [2/2] Готово!
echo.
echo Обновите страницу в браузере и попробуйте снова.
echo Если проблема останется - используйте fix-database.bat
echo.
pause







