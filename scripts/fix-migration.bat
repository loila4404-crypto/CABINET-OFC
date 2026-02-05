@echo off
chcp 65001 >nul
echo ========================================
echo   Применение изменений схемы к БД
echo ========================================
echo.
echo Используется prisma db push (обходит проблему с shadow database)
echo.
node node_modules\prisma\build\index.js db push --accept-data-loss --skip-generate
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Изменения применены! Генерируем Prisma Client...
    echo.
    node node_modules\prisma\build\index.js generate
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo   ✅ Готово!
        echo ========================================
        echo.
        echo Все изменения применены к базе данных.
        echo Prisma Client перегенерирован.
        echo.
    ) else (
        echo.
        echo ❌ Ошибка генерации Prisma Client
        pause
        exit /b 1
    )
) else (
    echo.
    echo ❌ Ошибка применения изменений
    pause
    exit /b 1
)
pause

