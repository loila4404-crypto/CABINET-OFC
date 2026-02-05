@echo off
chcp 65001 >nul
echo ========================================
echo   Загрузка на GitHub через браузер
echo   (БЕЗ установки Git или GitHub Desktop)
echo ========================================
echo.

echo [1/3] Создание архива для загрузки...
powershell -ExecutionPolicy Bypass -File make-zip.ps1
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Не удалось создать архив
    pause
    exit /b 1
)
echo [✓] Архив создан: reddit-cabinet.zip
echo.

echo [2/3] Инструкции по загрузке через браузер:
echo.
echo ========================================
echo   СПОСОБ 1: Загрузка ZIP (не работает)
echo ========================================
echo GitHub НЕ поддерживает загрузку ZIP архивов
echo с автоматической распаковкой через веб-интерфейс
echo.
echo ========================================
echo   СПОСОБ 2: Использовать Git через браузер
echo ========================================
echo.
echo 1. Откройте https://github.com/new
echo 2. Создайте новый репозиторий: reddit-cabinet
echo 3. НЕ добавляйте README, .gitignore или лицензию
echo 4. Нажмите "Create repository"
echo.
echo 5. На странице репозитория вы увидите инструкции
echo    Выберите вариант: "uploading an existing file"
echo.
echo 6. НО! Вместо загрузки ZIP, используйте:
echo    - GitHub Codespaces (онлайн редактор)
echo    - Или установите Git (займет 2 минуты)
echo.
echo ========================================
echo   СПОСОБ 3: GitHub Codespaces (РЕКОМЕНДУЕТСЯ)
echo ========================================
echo.
echo 1. Создайте репозиторий на GitHub (см. выше)
echo 2. На странице репозитория нажмите "Code"
echo 3. Выберите вкладку "Codespaces"
echo 4. Нажмите "Create codespace on main"
echo 5. Откроется онлайн редактор VS Code
echo 6. В терминале выполните:
echo    git clone https://github.com/YOUR_USERNAME/reddit-cabinet.git
echo    cd reddit-cabinet
echo    (скопируйте все файлы из вашей папки)
echo    git add .
echo    git commit -m "Initial commit"
echo    git push
echo.
echo ========================================
echo   СПОСОБ 4: Установить Git (2 минуты)
echo ========================================
echo.
echo 1. Скачайте Git: https://git-scm.com/download/win
echo 2. Установите (все настройки по умолчанию)
echo 3. Запустите upload-to-github.bat
echo 4. ГОТОВО! Все файлы загрузятся автоматически
echo.
echo ========================================
echo.
echo [3/3] Архив reddit-cabinet.zip создан
echo       Вы можете использовать его для резервной копии
echo.
pause

