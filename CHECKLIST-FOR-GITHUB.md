# Чеклист файлов для загрузки на GitHub

## ✅ Проверка всех ключевых файлов

### 1. vercel.json ✅
```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "prisma generate && next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```
**Статус:** Правильный - без `prisma migrate deploy`

### 2. package.json ✅
- ✅ Убран `@types/xlsx` из devDependencies
- ✅ Build команда: `"build": "prisma generate && next build"`
- ✅ Postinstall: `"postinstall": "prisma generate"`

### 3. prisma/schema.prisma ✅
- ✅ Provider: `"postgresql"` (не sqlite!)
- ✅ Все модели на месте

### 4. next.config.js ✅
- ✅ Правильная конфигурация
- ✅ TypeScript и ESLint настройки

### 5. tsconfig.json ✅
- ✅ Правильная конфигурация TypeScript

### 6. .gitignore ✅
- ✅ Исключает node_modules, .next, .env, *.db

## 📋 Что загрузить на GitHub

### Обязательные файлы в корне:
- ✅ `vercel.json`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `next.config.js`
- ✅ `tsconfig.json`
- ✅ `tailwind.config.js`
- ✅ `postcss.config.js`
- ✅ `vercel.json`
- ✅ `README.md`
- ✅ `.gitignore`
- ✅ `env.example`
- ✅ `next-env.d.ts`

### Обязательные папки:
- ✅ `app/` - все файлы
- ✅ `lib/` - все файлы
- ✅ `prisma/` - все файлы (включая `schema.prisma`)
- ✅ `public/` - все файлы
- ✅ `extension/` - все файлы
- ✅ `scripts/` - все файлы (опционально)

## ⚠️ Важно

1. **prisma/schema.prisma** - должен называться именно `schema.prisma` (не `schema.prisma.prisma`)
2. **vercel.json** - команда сборки БЕЗ `prisma migrate deploy`
3. **package.json** - БЕЗ `@types/xlsx`

## После загрузки на GitHub

1. Vercel автоматически обнаружит изменения
2. Убедитесь, что в Vercel Dashboard настроены:
   - `DATABASE_URL` (создайте базу в Storage → Create Database → Postgres)
   - `JWT_SECRET` (добавьте вручную в Environment Variables)
3. Перезапустите деплой вручную если нужно



