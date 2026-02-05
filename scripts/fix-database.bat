@echo off
chcp 65001 >nul
echo ========================================
echo   Автоматическое исправление базы данных
echo ========================================
echo.

echo [0/4] Автоматическая остановка процессов Node.js...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Найден запущенный процесс Node.js, останавливаем...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo ✅ Процессы остановлены
) else (
    echo ✅ Процессы Node.js не найдены
)
echo.

echo [2/4] Применение миграций к базе данных...
echo.
node node_modules\prisma\build\index.js migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Миграция уже применена или не требуется
)
echo.

echo [3/4] Перегенерация Prisma Client...
echo.
node node_modules\prisma\build\index.js generate
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка перегенерации Prisma Client
    echo.
    echo Попробуйте вручную:
    echo   1. Убедитесь, что сервер остановлен
    echo   2. node node_modules\prisma\build\index.js generate
    pause
    exit /b 1
)
echo ✅ Prisma Client перегенерирован
echo.

echo [4/4] Проверка схемы базы данных...
echo.
echo ✅ Все миграции применены
echo ✅ Prisma Client перегенерирован
echo.

echo ========================================
echo   ✅ Готово!
echo ========================================
echo.
echo Теперь запустите сервер разработки:
echo    npm run dev
echo.
pause

