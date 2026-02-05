import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Обработка OPTIONS запросов для CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - получить все вкладки пользователя
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    // Создаем таблицу, если её нет
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SubredditTab" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "SubredditTab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "SubredditTab_userId_idx" ON "SubredditTab"("userId")
      `
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "SubredditTab_userId_name_key" ON "SubredditTab"("userId", "name")
      `
    } catch (e: any) {
      // Игнорируем ошибки, если таблица уже существует
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы SubredditTab:', e.message)
      }
    }

    // Добавляем поля tabId и order в Subreddit, если их нет
    try {
      await prisma.$executeRaw`ALTER TABLE "Subreddit" ADD COLUMN "tabId" TEXT`
    } catch (e: any) {
      // Колонка уже существует
    }
    try {
      await prisma.$executeRaw`ALTER TABLE "Subreddit" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`
    } catch (e: any) {
      // Колонка уже существует
    }

    // Пытаемся загрузить вкладки, но если Prisma Client не знает о модели - возвращаем пустой массив
    let tabs: any[] = []
    try {
      tabs = await prisma.subredditTab.findMany({
        where: { userId },
        include: {
          subreddits: {
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      })
    } catch (e: any) {
      // Если Prisma Client не знает о модели SubredditTab, возвращаем пустой массив
      console.warn('⚠️ Не удалось загрузить вкладки (модель не найдена):', e.message)
      tabs = []
    }

    return NextResponse.json(tabs, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка загрузки вкладок:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки вкладок', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - создать новую вкладку
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    // Создаем таблицу, если её нет
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SubredditTab" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "SubredditTab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "SubredditTab_userId_idx" ON "SubredditTab"("userId")
      `
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "SubredditTab_userId_name_key" ON "SubredditTab"("userId", "name")
      `
    } catch (e: any) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы SubredditTab:', e.message)
      }
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Название вкладки обязательно' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Получаем максимальный order для установки новой вкладки в конец
    let maxOrder = { _max: { order: null as number | null } }
    try {
      maxOrder = await prisma.subredditTab.aggregate({
        where: { userId },
        _max: { order: true },
      })
    } catch (e: any) {
      // Если модель не найдена, начинаем с 0
      console.warn('⚠️ Не удалось получить max order:', e.message)
    }

    const newOrder = (maxOrder._max.order ?? -1) + 1

    // Проверяем, существует ли уже вкладка с таким именем
    let existing = null
    try {
      existing = await prisma.subredditTab.findUnique({
        where: {
          userId_name: {
            userId,
            name: name.trim(),
          },
        },
      })
    } catch (e: any) {
      // Если модель не найдена, пропускаем проверку
      console.warn('⚠️ Не удалось проверить существующую вкладку:', e.message)
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Вкладка с таким названием уже существует' },
        { status: 400, headers: corsHeaders }
      )
    }

    let tab
    try {
      tab = await prisma.subredditTab.create({
        data: {
          userId,
          name: name.trim(),
          order: newOrder,
        },
      })
    } catch (e: any) {
      // Если не удалось создать через Prisma, создаем через raw SQL
      console.warn('⚠️ Не удалось создать через Prisma, пробуем через SQL:', e.message)
      const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await prisma.$executeRaw`
        INSERT INTO "SubredditTab" (id, userId, name, "order", "createdAt", "updatedAt")
        VALUES (${tabId}, ${userId}, ${name.trim()}, ${newOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      tab = {
        id: tabId,
        userId,
        name: name.trim(),
        order: newOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return NextResponse.json(tab, { status: 201, headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка создания вкладки:', error)
    return NextResponse.json(
      { error: 'Ошибка создания вкладки', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

