@echo off
chcp 65001 >nul
echo ========================================
echo   Подготовка проекта для GitHub Desktop
echo ========================================
echo.

echo [1/3] Проверка наличия Git...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ИНФО] Git не найден в командной строке
    echo [ИНФО] Но GitHub Desktop имеет встроенный Git
    echo [ИНФО] Продолжаем подготовку...
) else (
    echo [✓] Git найден
    echo.
    echo [2/3] Инициализация Git репозитория...
    git init
    if %ERRORLEVEL% EQU 0 (
        echo [✓] Git репозиторий инициализирован
        echo.
        echo [3/3] Добавление всех файлов...
        git add .
        echo [✓] Все файлы добавлены
        echo.
        echo [4/4] Создание коммита...
        git commit -m "Initial commit: Reddit Cabinet project"
        echo [✓] Коммит создан
        echo.
        echo ========================================
        echo   ✅ ПРОЕКТ ПОДГОТОВЛЕН!
        echo ========================================
        echo.
        echo Теперь в GitHub Desktop:
        echo 1. File ^> Add Local Repository
        echo 2. Выберите папку: %CD%
        echo 3. Все файлы уже будут видны!
        echo 4. Нажмите "Publish repository"
        echo.
    ) else (
        echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось инициализировать Git
        echo [ИНФО] Это нормально - GitHub Desktop сделает это сам
    )
)

echo ========================================
echo   ИНСТРУКЦИЯ ДЛЯ GITHUB DESKTOP:
echo ========================================
echo.
echo 1. Откройте GitHub Desktop
echo.
echo 2. File ^> New Repository
echo    (или File ^> Add Local Repository)
echo.
echo 3. Заполните:
echo    - Name: reddit-cabinet
echo    - Local Path: %CD%
echo    - НЕ отмечайте "Initialize with README"
echo.
echo 4. Нажмите "Create Repository"
echo.
echo 5. Все файлы появятся автоматически!
echo.
echo 6. Внизу введите: Initial commit
echo.
echo 7. Нажмите "Commit to main"
echo.
echo 8. Нажмите "Publish repository"
echo.
echo 9. ГОТОВО! Все файлы загрузятся на GitHub!
echo.
echo ========================================
echo.
pause




