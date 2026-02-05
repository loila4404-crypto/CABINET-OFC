@echo off
echo Попытка установки megajs...
echo.

echo Вариант 1: Установка megajs без версии
node node_modules\npm\bin\npm-cli.js install megajs
if %errorlevel% equ 0 (
    echo.
    echo Успешно установлено!
    pause
    exit /b 0
)

echo.
echo Вариант 1 не сработал. Пробуем вариант 2: @meganz/sdk
node node_modules\npm\bin\npm-cli.js install @meganz/sdk
if %errorlevel% equ 0 (
    echo.
    echo Успешно установлен @meganz/sdk!
    echo ВНИМАНИЕ: Нужно будет обновить код для работы с @meganz/sdk
    pause
    exit /b 0
)

echo.
echo Оба варианта не сработали.
echo Проверьте доступные пакеты на npmjs.com
pause


