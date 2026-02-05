# Настройка Vercel для работы проекта

## Проблема
Ошибка: `Environment variable not found: DATABASE_URL`

## Решение

### Шаг 1: Настройте базу данных в Vercel

**Вариант A: Vercel Postgres (рекомендуется - БЕСПЛАТНО)**

1. Откройте Vercel Dashboard
2. Перейдите в ваш проект
3. Откройте вкладку **Storage**
4. Нажмите **Create Database**
5. Выберите **Postgres**
6. Выберите план (Hobby - бесплатный)
7. Нажмите **Create**
8. Vercel автоматически добавит переменную `DATABASE_URL` в Environment Variables

**Вариант B: Внешняя база данных**

Используйте бесплатные варианты:
- **Neon** (https://neon.tech) - бесплатный PostgreSQL
- **Supabase** (https://supabase.com) - бесплатный PostgreSQL

После создания базы данных скопируйте строку подключения и добавьте в Vercel.

### Шаг 2: Добавьте переменные окружения в Vercel

1. В Vercel Dashboard → ваш проект → **Settings**
2. Откройте **Environment Variables**
3. Добавьте переменные:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=ваш-случайный-ключ-минимум-32-символа
```

**Для генерации JWT_SECRET:**
- Используйте онлайн генератор: https://generate-secret.vercel.app/32
- Или любой случайный ключ минимум 32 символа

### Шаг 3: Обновите vercel.json

Я уже обновил файл `vercel.json` - он использует временное значение для сборки.

**ВАЖНО:** После настройки `DATABASE_URL` в Vercel, обновите `vercel.json` обратно на:

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "prisma generate && next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Шаг 4: Измените схему Prisma для PostgreSQL

В файле `prisma/schema.prisma` измените:

**Было:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Стало:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Шаг 5: Выполните миграции

После первого успешного деплоя выполните миграции:

1. Установите Vercel CLI: `npm i -g vercel`
2. Выполните:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

Или добавьте в `package.json`:
```json
"postinstall": "prisma generate && prisma migrate deploy"
```

### Шаг 6: Перезапустите деплой

После настройки всех переменных:
1. Vercel автоматически перезапустит деплой
2. Или вручную: Deployments → последний деплой → **Redeploy**

## Проверка

После успешного деплоя:
- ✅ Сайт открывается
- ✅ Регистрация работает
- ✅ База данных подключена

## Быстрый старт (Vercel Postgres)

1. Vercel Dashboard → Storage → Create Database → Postgres
2. Settings → Environment Variables → проверьте что `DATABASE_URL` добавлен автоматически
3. Добавьте `JWT_SECRET` вручную
4. Обновите `prisma/schema.prisma` (измените `sqlite` на `postgresql`)
5. Закоммитьте изменения и запушьте на GitHub
6. Vercel автоматически перезапустит деплой



