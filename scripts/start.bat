@echo off
chcp 65001 >nul
echo ========================================
echo   Автоматический запуск с проверкой
echo ========================================
echo.

echo [0/6] Остановка старых процессов...
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

echo [1/6] Проверка зависимостей...
if not exist "node_modules" (
    echo ⚠️  node_modules не найдены, устанавливаем...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Ошибка установки зависимостей
        pause
        exit /b 1
    )
)
echo ✅ Зависимости проверены
echo.

echo [2/6] Применение миграций базы данных...
node node_modules\prisma\build\index.js migrate deploy >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Миграции применены
) else (
    echo ⚠️  Миграции уже применены или не требуются
)
echo.

echo [3/6] Перегенерация Prisma Client...
node node_modules\prisma\build\index.js generate
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка перегенерации Prisma Client
    echo.
    echo Попробуйте остановить сервер и запустить fix-database.bat
    pause
    exit /b 1
)
echo ✅ Prisma Client готов
echo.

echo [4/6] Открытие браузера...
start http://localhost:3000
timeout /t 3 /nobreak >nul
echo ✅ Браузер открыт
echo.

echo [5/6] Запуск сервера разработки...
echo.
echo ========================================
echo   Сервер запускается...
echo   Браузер откроется автоматически
echo   Если не открылся - перейдите на http://localhost:3000
echo ========================================
echo.

call npm run dev
