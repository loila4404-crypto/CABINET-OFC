@echo off
chcp 65001 >nul
echo ========================================
echo   Загрузка проекта на GitHub
echo ========================================
echo.

echo [1/5] Инициализация Git...
git init
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Git не установлен или не найден
    pause
    exit /b 1
)
echo [✓] Git инициализирован
echo.

echo [2/5] Добавление всех файлов...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось добавить файлы
    pause
    exit /b 1
)
echo [✓] Файлы добавлены
echo.

echo [3/5] Создание коммита...
git commit -m "Initial commit: Reddit Cabinet project"
if %ERRORLEVEL% NEQ 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возможно, нет изменений для коммита
)
echo [✓] Коммит создан
echo.

echo [4/5] Переименование ветки в main...
git branch -M main
echo [✓] Ветка переименована
echo.

echo [5/5] Инструкции по подключению к GitHub:
echo.
echo ========================================
echo   Следующие шаги:
echo ========================================
echo.
echo 1. Создайте репозиторий на GitHub:
echo    - Зайдите на https://github.com
echo    - Нажмите "New repository"
echo    - Название: reddit-cabinet
echo    - НЕ добавляйте README, .gitignore или лицензию
echo    - Нажмите "Create repository"
echo.
echo 2. Подключите локальный репозиторий:
echo    git remote add origin https://github.com/YOUR_USERNAME/reddit-cabinet.git
echo    (Замените YOUR_USERNAME на ваш GitHub username)
echo.
echo 3. Отправьте код на GitHub:
echo    git push -u origin main
echo.
echo ========================================
echo.
pause

