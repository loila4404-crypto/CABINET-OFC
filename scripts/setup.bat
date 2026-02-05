@echo off
chcp 65001 >nul
echo ========================================
echo   Reddit Cabinet - Первоначальная настройка
echo ========================================
echo.

REM Проверяем наличие Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Пожалуйста, установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

echo [✓] Node.js найден
node --version
echo.

echo [1/4] Установка зависимостей...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось установить зависимости
    pause
    exit /b 1
)
echo [✓] Зависимости установлены
echo.

echo [2/4] Проверка файла .env...
if not exist ".env" (
    echo [ИНФО] Создаю файл .env из примера...
    (
        echo DATABASE_URL="postgresql://user:password@localhost:5432/reddit_cabinet"
        echo JWT_SECRET="change-this-to-a-random-secret-key-min-32-chars"
    ) > .env
    echo [✓] Файл .env создан
    echo [ВНИМАНИЕ] Пожалуйста, отредактируйте .env и укажите правильные данные!
) else (
    echo [✓] Файл .env уже существует
)
echo.

echo [3/4] Генерация Prisma клиента...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось сгенерировать Prisma клиент
)
echo.

echo [4/4] Настройка завершена!
echo.
echo ========================================
echo   Следующие шаги:
echo ========================================
echo.
echo 1. Настройте базу данных PostgreSQL
echo 2. Отредактируйте файл .env с правильными данными
echo 3. Выполните миграции: npx prisma migrate dev --name init
echo 4. Запустите проект: start.bat
echo.
echo Или просто откройте preview.html для просмотра визуала
echo.
pause











