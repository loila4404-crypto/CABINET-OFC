@echo off
chcp 65001 >nul
echo ========================================
echo   Исправление модели Subreddit
echo ========================================
echo.

echo [1/3] Остановка сервера разработки...
echo.
echo ⚠️  ВАЖНО: Если сервер разработки запущен, остановите его сейчас (Ctrl+C)
echo     Нажмите любую клавишу после остановки сервера...
pause >nul
echo.

echo [2/3] Перегенерация Prisma Client...
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

echo [3/3] Применение миграции...
node node_modules\prisma\build\index.js migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Миграция уже применена или не требуется
)
echo.

echo ========================================
echo   ✅ Готово!
echo ========================================
echo.
echo Теперь запустите сервер разработки:
echo    npm run dev
echo.
pause







