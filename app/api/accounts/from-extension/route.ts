import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import { getRedditStatsWithToken } from '@/lib/reddit'

// CORS заголовки для работы с расширением браузера
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Обработка OPTIONS запросов для CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      console.error('❌ Пользователь не авторизован при добавлении аккаунта из расширения')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    console.log('✅ Пользователь авторизован, userId:', userId)

    const { username, redditUrl, token, stats } = await request.json()

    if (!username || !redditUrl) {
      return NextResponse.json(
        { error: 'Username и URL обязательны' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('═══════════════════════════════════════════════════════')
    console.log('📥 ПОЛУЧЕНЫ ДАННЫЕ ОТ РАСШИРЕНИЯ')
    console.log('Username:', username)
    console.log('URL:', redditUrl)
    console.log('Есть токен:', !!token)
    console.log('Статистика от расширения:', JSON.stringify(stats, null, 2))
    console.log('   followers:', stats?.followers)
    console.log('   karma:', stats?.karma)
    console.log('   accountAge:', stats?.accountAge)
    console.log('   contributions:', stats?.contributions)
    console.log('   goldEarned:', stats?.goldEarned)
    console.log('   comments:', stats?.comments)
    console.log('   posts:', stats?.posts)
    console.log('   avatarUrl:', stats?.avatarUrl || 'не найден')
    console.log('═══════════════════════════════════════════════════════')

    // Нормализуем URL для проверки (убираем trailing slash, приводим к единому формату)
    const normalizedUrl = redditUrl.trim().replace(/\/$/, '').toLowerCase()
    const normalizedUsername = username?.trim().toLowerCase() || ''
    
    console.log('🔍 Проверка существующего аккаунта...')
    console.log('   Исходный URL:', redditUrl)
    console.log('   Нормализованный URL:', normalizedUrl)
    console.log('   Username:', username)
    console.log('   Нормализованный username:', normalizedUsername)
    
    // Получаем все аккаунты пользователя для проверки
    const allUserAccounts = await prisma.redditAccount.findMany({
      where: { userId },
      select: { id: true, redditUrl: true, username: true },
    })
    
    console.log('   Всего аккаунтов у пользователя:', allUserAccounts.length)
    
    // Проверяем, существует ли уже аккаунт с таким URL или username (case-insensitive)
    const existingAccount = allUserAccounts.find(acc => {
      const accUrl = (acc.redditUrl || '').trim().replace(/\/$/, '').toLowerCase()
      const accUsername = (acc.username || '').trim().toLowerCase()
      
      return (
        accUrl === normalizedUrl ||
        accUrl.includes(normalizedUrl) ||
        normalizedUrl.includes(accUrl) ||
        (normalizedUsername && accUsername === normalizedUsername)
      )
    })
    
    if (existingAccount) {
      console.log('✅ Найден существующий аккаунт:', existingAccount.id)
      console.log('   Существующий URL:', existingAccount.redditUrl)
      console.log('   Существующий username:', existingAccount.username)
    } else {
      console.log('📝 Существующий аккаунт не найден, создаем новый')
    }

    // Маппим данные из расширения (followers -> subscribers)
    let accountData: any = {
      userId,
      username,
      redditUrl,
      email: '', // Email не обязателен при добавлении через расширение
      password: '', // Пароль не обязателен при добавлении через расширение
      redditToken: token || null, // Сохраняем токен для live обновления
      avatarUrl: stats?.avatarUrl || null, // Сохраняем URL аватара
      comments: stats?.comments ?? null,
      karma: stats?.karma ?? null,
      accountAge: stats?.accountAge ?? null,
      posts: stats?.posts ?? null,
      subscribers: stats?.followers ?? null, // followers из расширения -> subscribers в БД
      contributions: stats?.contributions ?? null,
      goldEarned: stats?.goldEarned ?? null,
      activeIn: stats?.activeIn ?? null, // Количество активных сообществ
    }
    
    console.log('📝 Данные для сохранения в БД:')
    console.log('   subscribers (из followers):', accountData.subscribers)
    console.log('   karma:', accountData.karma)
    console.log('   accountAge:', accountData.accountAge)
    console.log('   contributions:', accountData.contributions)
    console.log('   goldEarned:', accountData.goldEarned)
    console.log('   activeIn:', accountData.activeIn)
    console.log('   comments:', accountData.comments)
    console.log('   posts:', accountData.posts)

    // Если есть токен, обновляем статистику через Reddit API
    if (token) {
      try {
        console.log('🔄 Обновление статистики через Reddit API с токеном...')
        const freshStats = await getRedditStatsWithToken(redditUrl, username, token)
        
        accountData.comments = freshStats.comments
        accountData.karma = freshStats.karma
        accountData.accountAge = freshStats.accountAge
        accountData.posts = freshStats.posts
        accountData.subscribers = freshStats.subscribers
        accountData.contributions = freshStats.contributions
        accountData.goldEarned = freshStats.goldEarned
        accountData.activeIn = freshStats.activeIn || accountData.activeIn // Сохраняем activeIn из расширения, если API не вернул
        // Сохраняем avatarUrl из расширения, если API не вернул
        if (!freshStats.avatarUrl && accountData.avatarUrl) {
          // avatarUrl уже установлен из stats
        }
        
        console.log('✅ Статистика обновлена через API:', freshStats)
      } catch (error: any) {
        console.warn('⚠️ Не удалось обновить статистику через API, используем данные из расширения:', error.message)
      }
    }

    // Используем upsert для атомарной операции (создание или обновление)
    // Это предотвращает race condition при одновременных запросах
    console.log('🔄 Используем upsert для создания/обновления аккаунта...')
    console.log('   userId для создания:', userId)
    console.log('   normalizedUrl:', normalizedUrl)
    
    let account;
    try {
      account = await prisma.redditAccount.upsert({
        where: {
          userId_redditUrl: {
            userId: userId,
            redditUrl: normalizedUrl,
          },
        },
        update: {
          ...accountData,
          redditUrl: normalizedUrl,
          updatedAt: new Date(),
        },
        create: {
          ...accountData,
          redditUrl: normalizedUrl,
        },
      })
      console.log('✅ Аккаунт создан/обновлен через upsert:', account.id)
      console.log('   userId аккаунта:', account.userId || 'НЕ УСТАНОВЛЕН!')
    } catch (error: any) {
      // Если upsert не сработал (старая схема БД), используем старый метод
      console.warn('⚠️ Upsert не сработал, используем старый метод:', error.message)
      
      if (existingAccount) {
        const existingAccountFull = await prisma.redditAccount.findUnique({
          where: { id: existingAccount.id },
        })
        
        if (existingAccountFull) {
          account = await prisma.redditAccount.update({
            where: { id: existingAccountFull.id },
            data: {
              ...accountData,
              redditUrl: normalizedUrl,
            },
          })
          console.log('✅ Аккаунт обновлен:', account.id)
        } else {
          account = await prisma.redditAccount.create({
            data: {
              ...accountData,
              redditUrl: normalizedUrl,
            },
          })
          console.log('✅ Аккаунт создан:', account.id)
        }
      } else {
        account = await prisma.redditAccount.create({
          data: {
            ...accountData,
            redditUrl: normalizedUrl,
          },
        })
        console.log('✅ Аккаунт создан:', account.id)
      }
    }

    return NextResponse.json(
      {
        id: account.id,
        username: account.username,
        redditUrl: account.redditUrl,
        avatarUrl: account.avatarUrl,
        stats: {
          comments: account.comments,
          karma: account.karma,
          accountAge: account.accountAge,
          posts: account.posts,
          subscribers: account.subscribers,
          contributions: account.contributions,
          goldEarned: account.goldEarned,
          activeIn: account.activeIn,
        },
      },
      { status: existingAccount ? 200 : 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('❌ Ошибка обработки данных от расширения:', error)
    return NextResponse.json(
      {
        error: 'Ошибка обработки данных',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

