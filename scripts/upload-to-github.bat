@echo off
chcp 65001 >nul
echo ========================================
echo   Автоматическая загрузка на GitHub
echo ========================================
echo.

REM Проверка наличия Git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Git не установлен!
    echo.
    echo У вас есть два варианта:
    echo.
    echo ВАРИАНТ 1: Установить Git
    echo   1. Скачайте Git: https://git-scm.com/download/win
    echo   2. Установите Git
    echo   3. Запустите этот скрипт снова
    echo.
    echo ВАРИАНТ 2: Использовать GitHub Desktop (проще!)
    echo   1. Скачайте: https://desktop.github.com
    echo   2. Установите и войдите в GitHub
    echo   3. File ^> Add Local Repository
    echo   4. Выберите эту папку: %CD%
    echo   5. Нажмите "Publish repository"
    echo.
    pause
    exit /b 1
)

echo [✓] Git найден
echo.

REM Проверка, инициализирован ли репозиторий
if not exist ".git" (
    echo [1/6] Инициализация Git репозитория...
    git init
    if %ERRORLEVEL% NEQ 0 (
        echo [ОШИБКА] Не удалось инициализировать Git
        pause
        exit /b 1
    )
    echo [✓] Git инициализирован
) else (
    echo [✓] Git репозиторий уже инициализирован
)
echo.

echo [2/6] Добавление всех файлов (автоматически, не нужно вручную!)...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось добавить файлы
    pause
    exit /b 1
)
echo [✓] Все файлы добавлены автоматически
echo.

echo [3/6] Создание коммита...
git commit -m "Initial commit: Reddit Cabinet project"
if %ERRORLEVEL% NEQ 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений для коммита
    echo [ИНФО] Продолжаем...
)
echo [✓] Коммит создан
echo.

echo [4/6] Переименование ветки в main...
git branch -M main
echo [✓] Готово
echo.

echo [5/6] Инструкции по подключению к GitHub:
echo.
echo ========================================
echo   СЛЕДУЮЩИЕ ШАГИ:
echo ========================================
echo.
echo 1. Создайте репозиторий на GitHub:
echo    - Откройте https://github.com
echo    - Нажмите "New repository" (зеленая кнопка)
echo    - Название: reddit-cabinet
echo    - Описание: "Reddit Cabinet - управление аккаунтами Reddit"
echo    - Выберите Public или Private
echo    - НЕ добавляйте README, .gitignore или лицензию!
echo    - Нажмите "Create repository"
echo.
echo 2. Скопируйте URL вашего репозитория
echo    (будет показан на странице после создания)
echo    Пример: https://github.com/YOUR_USERNAME/reddit-cabinet.git
echo.
echo 3. Выполните команду (замените YOUR_USERNAME):
echo    git remote add origin https://github.com/YOUR_USERNAME/reddit-cabinet.git
echo.
echo 4. Отправьте все файлы одной командой:
echo    git push -u origin main
echo.
echo ========================================
echo.
echo [6/6] Хотите выполнить команды автоматически?
echo.
set /p AUTO="Введите URL репозитория (или нажмите Enter для пропуска): "
if not "%AUTO%"=="" (
    echo.
    echo Подключение к репозиторию...
    git remote add origin %AUTO%
    if %ERRORLEVEL% NEQ 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, remote уже существует
        git remote set-url origin %AUTO%
    )
    echo.
    echo Отправка всех файлов на GitHub...
    git push -u origin main
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo   ✅ ВСЕ ФАЙЛЫ ЗАГРУЖЕНЫ НА GITHUB!
        echo ========================================
        echo.
        echo Ваш проект доступен по адресу:
        echo %AUTO%
        echo.
    ) else (
        echo.
        echo [ОШИБКА] Не удалось отправить файлы
        echo Возможные причины:
        echo - Неправильный URL репозитория
        echo - Нет прав доступа
        echo - Репозиторий не создан на GitHub
        echo.
        echo Попробуйте выполнить команды вручную:
        echo git remote add origin URL_ВАШЕГО_РЕПОЗИТОРИЯ
        echo git push -u origin main
        echo.
    )
) else (
    echo.
    echo Выполните команды вручную (см. инструкции выше)
)
echo.
pause

