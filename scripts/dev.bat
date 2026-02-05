@echo off
chcp 65001 >nul
REM Быстрый запуск без проверок (если все уже настроено)
start http://localhost:3000
timeout /t 2 /nobreak >nul
call npm run dev







