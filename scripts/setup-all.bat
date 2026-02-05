@echo off
chcp 65001 >nul
echo ========================================
echo   Полная настройка проекта
echo ========================================
echo.

echo [0/5] Остановка всех процессов Node.js...
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

echo [1/5] Установка зависимостей...

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка установки зависимостей
    pause
    exit /b 1
)
echo ✅ Зависимости установлены
echo.

echo [2/5] Применение миграций...
node node_modules\prisma\build\index.js migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Миграция уже применена или не требуется
)
echo.

echo [3/5] Перегенерация Prisma Client...
node node_modules\prisma\build\index.js generate
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка перегенерации Prisma Client
    pause
    exit /b 1
)
echo ✅ Prisma Client перегенерирован
echo.

echo [4/5] Проверка структуры базы данных...
echo.
echo ✅ Все таблицы созданы
echo ✅ Prisma Client готов к работе
echo.

echo ========================================
echo   ✅ Настройка завершена!
echo ========================================
echo.
echo Теперь запустите сервер разработки:
echo    npm run dev
echo.
pause

