# Скрипт для применения миграций вручную
Write-Host "Применение миграций к базе данных..."

# Проверяем наличие базы данных
if (-not (Test-Path "dev.db")) {
    Write-Host "База данных не найдена. Создайте её сначала через prisma migrate dev или prisma db push"
    exit 1
}

Write-Host "Применение миграций через prisma db push..."
# Используем db push для синхронизации схемы с базой данных
node_modules\.bin\prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Миграции успешно применены!"
} else {
    Write-Host "Ошибка применения миграций"
    exit 1
}


