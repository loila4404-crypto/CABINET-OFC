@echo off
chcp 65001 >nul
echo ========================================
echo   Решение проблемы с лимитом 100 файлов
echo ========================================
echo.

REM Проверка Git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ПРОБЛЕМА] Git не установлен!
    echo.
    echo GitHub ограничивает загрузку до 100 файлов через браузер.
    echo Решение: Установить Git (займет 2 минуты)
    echo.
    echo ========================================
    echo   ИНСТРУКЦИЯ ПО УСТАНОВКЕ GIT:
    echo ========================================
    echo.
    echo 1. Откройте в браузере:
    echo    https://git-scm.com/download/win
    echo.
    echo 2. Скачайте установщик (автоматически определит вашу систему)
    echo.
    echo 3. Запустите установщик и нажимайте "Next" везде
    echo    (все настройки по умолчанию - это правильно!)
    echo.
    echo 4. После установки закройте и откройте терминал заново
    echo.
    echo 5. Запустите этот скрипт снова или выполните:
    echo    git init
    echo    git add .
    echo    git commit -m "Initial commit"
    echo    git remote add origin https://github.com/YOUR_USERNAME/CABINET-OOF.git
    echo    git push -u origin main
    echo.
    echo ========================================
    echo   АЛЬТЕРНАТИВА: GitHub Desktop
    echo ========================================
    echo.
    echo Если не хотите устанавливать Git через командную строку:
    echo.
    echo 1. Скачайте GitHub Desktop:
    echo    https://desktop.github.com
    echo.
    echo 2. Установите и войдите в GitHub
    echo.
    echo 3. File ^> Add Local Repository
    echo    Выберите эту папку: %CD%
    echo.
    echo 4. Нажмите "Publish repository"
    echo    ВСЕ файлы загрузятся автоматически!
    echo.
    pause
    exit /b 1
)

echo [✓] Git установлен!
echo.
echo ========================================
echo   АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ВСЕХ ФАЙЛОВ
echo ========================================
echo.

echo [1/5] Инициализация Git...
git init
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось инициализировать Git
    pause
    exit /b 1
)
echo [✓] Готово
echo.

echo [2/5] Добавление ВСЕХ файлов (без ограничения 100 файлов!)...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось добавить файлы
    pause
    exit /b 1
)
echo [✓] Все файлы добавлены
echo.

echo [3/5] Создание коммита...
git commit -m "Initial commit: Reddit Cabinet project"
if %ERRORLEVEL% NEQ 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений
)
echo [✓] Готово
echo.

echo [4/5] Переименование ветки...
git branch -M main
echo [✓] Готово
echo.

echo [5/5] Инструкции по подключению:
echo.
echo ========================================
echo   СЛЕДУЮЩИЕ ШАГИ:
echo ========================================
echo.
echo 1. Убедитесь, что репозиторий создан на GitHub:
echo    https://github.com/YOUR_USERNAME/CABINET-OOF
echo.
echo 2. Выполните команду (замените YOUR_USERNAME):
echo    git remote add origin https://github.com/YOUR_USERNAME/CABINET-OOF.git
echo.
echo 3. Отправьте ВСЕ файлы одной командой:
echo    git push -u origin main
echo.
echo ========================================
echo.
echo ✅ ВСЕ ФАЙЛЫ ПОДГОТОВЛЕНЫ К ЗАГРУЗКЕ!
echo    Git загрузит ВСЕ файлы без ограничения 100!
echo.
pause




