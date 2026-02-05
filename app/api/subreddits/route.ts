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

// GET - получить все сабреддиты пользователя
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    console.log('📥 Запрос на загрузку сабреддитов для userId:', userId)

    // Проверяем и создаем таблицу, если её нет
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Subreddit" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "postingRules" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Subreddit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "Subreddit_userId_idx" ON "Subreddit"("userId")
      `
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Subreddit_userId_url_key" ON "Subreddit"("userId", "url")
      `
    } catch (migrationError: any) {
      // Игнорируем ошибки, если таблица уже существует
      if (!migrationError.message.includes('already exists') && !migrationError.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы:', migrationError.message)
      }
    }

    const subreddits = await prisma.subreddit.findMany({
      where: { userId },
      include: {
        tab: true,
      },
      orderBy: [
        { tabId: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    console.log('✅ Загружено сабреддитов:', subreddits.length)
    return NextResponse.json(subreddits, { headers: corsHeaders })
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА ЗАГРУЗКИ САБРЕДДИТОВ')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name || 'Unknown')
    console.error('Сообщение:', error?.message || 'Нет сообщения')
    console.error('Код ошибки:', error?.code)
    if (error?.stack) {
      console.error('Стек ошибки:')
      console.error(error.stack)
    }
    console.error('═══════════════════════════════════════════════════════')
    return NextResponse.json(
      { 
        error: 'Ошибка загрузки сабреддитов', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - создать новый сабреддит
export async function POST(request: NextRequest) {
  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('📥 ЗАПРОС НА СОЗДАНИЕ САБРЕДДИТА')
    console.log('═══════════════════════════════════════════════════════')

    const userId = getUserIdFromRequest(request)

    if (!userId) {
      console.error('❌ Пользователь не авторизован')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    console.log('✅ Пользователь авторизован, userId:', userId)

    // Парсим тело запроса один раз
    const body = await request.json()
    const { name, url, postingRules, tabId: requestTabId } = body
    console.log('📋 Данные запроса:')
    console.log('   name:', name)
    console.log('   url:', url)
    console.log('   postingRules:', postingRules ? 'есть' : 'нет')
    console.log('   tabId:', requestTabId || 'нет')

    if (!name || !url) {
      console.error('❌ Отсутствуют обязательные поля')
      return NextResponse.json(
        { error: 'Название и URL обязательны' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Проверяем и создаем таблицу, если её нет
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Subreddit" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "postingRules" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Subreddit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "Subreddit_userId_idx" ON "Subreddit"("userId")
      `
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Subreddit_userId_url_key" ON "Subreddit"("userId", "url")
      `
    } catch (migrationError: any) {
      // Игнорируем ошибки, если таблица уже существует
      if (!migrationError.message.includes('already exists') && !migrationError.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы:', migrationError.message)
      }
    }

    // Нормализуем URL (убираем trailing slash, приводим к единому формату)
    const normalizedUrl = url.trim().replace(/\/$/, '').toLowerCase()
    console.log('🔧 Нормализованный URL:', normalizedUrl)

    // Проверяем, существует ли уже такой сабреддит
    console.log('🔍 Проверка существующего сабреддита...')
    let existing = null
    try {
      existing = await prisma.subreddit.findUnique({
        where: {
          userId_url: {
            userId,
            url: normalizedUrl,
          },
        },
      })
    } catch (e: any) {
      // Если unique constraint не работает, проверяем через findFirst
      console.warn('⚠️ findUnique не сработал, пробуем findFirst:', e.message)
      try {
        const allSubreddits = await prisma.subreddit.findMany({
          where: { userId },
        })
        existing = allSubreddits.find(
          (s) => s.url.toLowerCase().replace(/\/$/, '') === normalizedUrl
        ) || null
      } catch (e2: any) {
        console.warn('⚠️ Не удалось проверить дубликаты:', e2.message)
      }
    }

    if (existing) {
      console.log('⚠️ Сабреддит уже существует:', existing.id)
      return NextResponse.json(
        { error: 'Этот сабреддит уже добавлен' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Получаем tabId из запроса, если он есть
    let tabId = requestTabId || null
    
    // Если передан tabId, проверяем, что вкладка существует и принадлежит пользователю
    if (tabId) {
      try {
        const tab = await prisma.subredditTab.findFirst({
          where: {
            id: tabId,
            userId,
          },
        })
        
        if (!tab) {
          console.warn('⚠️ Вкладка не найдена, создаем сабреддит без вкладки')
          tabId = null
        }
      } catch (tabError: any) {
        // Если таблица SubredditTab не существует или Prisma Client не знает о модели, игнорируем tabId
        console.warn('⚠️ Ошибка проверки вкладки, создаем сабреддит без вкладки:', tabError.message)
        tabId = null
      }
    }
    
    // Создаем новый сабреддит
    console.log('📝 Создание нового сабреддита...')
    
    // Пытаемся создать с tabId, если он есть
    let subreddit
    try {
      const subredditData: any = {
        userId,
        name: name.trim(),
        url: normalizedUrl,
        postingRules: postingRules?.trim() || null,
      }
      
      // Добавляем tabId только если он есть
      if (tabId) {
        subredditData.tabId = tabId
        subredditData.order = 0
      }
      
      subreddit = await prisma.subreddit.create({
        data: subredditData,
      })
    } catch (createError: any) {
      // Если ошибка связана с tabId (поле не существует), создаем без него
      if (createError.message.includes('tabId') || createError.message.includes('Unknown arg')) {
        console.warn('⚠️ Не удалось создать с tabId, создаем без вкладки:', createError.message)
        subreddit = await prisma.subreddit.create({
          data: {
            userId,
            name: name.trim(),
            url: normalizedUrl,
            postingRules: postingRules?.trim() || null,
          },
        })
      } else {
        throw createError
      }
    }

    console.log('✅ Сабреддит создан успешно:', subreddit.id)
    console.log('═══════════════════════════════════════════════════════')
    return NextResponse.json(subreddit, { status: 201, headers: corsHeaders })
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА СОЗДАНИЯ САБРЕДДИТА')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name || 'Unknown')
    console.error('Сообщение:', error?.message || 'Нет сообщения')
    console.error('Код ошибки:', error?.code)
    if (error?.stack) {
      console.error('Стек ошибки:')
      console.error(error.stack)
    }
    console.error('═══════════════════════════════════════════════════════')
    return NextResponse.json(
      { 
        error: 'Ошибка создания сабреддита', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

