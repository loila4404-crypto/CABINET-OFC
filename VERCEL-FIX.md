# Исправление ошибки деплоя на Vercel

## Проблема
Деплой падает из-за команды `prisma migrate deploy` в `buildCommand`.

## Решение

### 1. Обновите vercel.json
Я уже исправил файл - убрал `prisma migrate deploy` из buildCommand.

### 2. Настройте переменные окружения в Vercel

Зайдите в настройки проекта на Vercel:
1. Settings → Environment Variables
2. Добавьте переменные:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-here
```

### 3. Настройте базу данных

Для Vercel нужна PostgreSQL база данных. Варианты:

**Вариант A: Vercel Postgres (рекомендуется)**
1. В Vercel Dashboard → Storage → Create Database
2. Выберите Postgres
3. Vercel автоматически добавит DATABASE_URL

**Вариант B: Внешняя база данных**
- Используйте Neon, Supabase или другую PostgreSQL базу
- Добавьте DATABASE_URL в Environment Variables

### 4. Выполните миграции

После первого деплоя выполните миграции вручную:

```bash
# Через Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy
```

Или добавьте в `package.json`:
```json
"postinstall": "prisma generate && prisma migrate deploy"
```

### 5. Перезапустите деплой

После настройки переменных окружения:
1. Settings → Deployments
2. Нажмите "Redeploy" на последнем деплое

## Проверка

После успешного деплоя проверьте:
- ✅ Сайт открывается
- ✅ Регистрация работает
- ✅ База данных подключена (проверьте логи)



