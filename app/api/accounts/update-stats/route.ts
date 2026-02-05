import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import { getRedditStatsWithToken, getRedditStats } from '@/lib/reddit'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'ID аккаунта обязателен' },
        { status: 400 }
      )
    }

    // Получаем аккаунт
    const account = await prisma.redditAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    if (!account.username) {
      return NextResponse.json(
        { error: 'Username не указан' },
        { status: 400 }
      )
    }

    console.log('🔄 Обновление статистики для аккаунта:', account.username)

    let freshStats
    try {
      // Если есть токен, используем его для обновления
      if (account.redditToken) {
        freshStats = await getRedditStatsWithToken(
          account.redditUrl,
          account.username,
          account.redditToken
        )
      } else {
        // Иначе используем публичный API
        freshStats = await getRedditStats(account.redditUrl, account.username)
      }

      // Обновляем статистику в базе данных
      const updatedAccount = await prisma.redditAccount.update({
        where: { id: accountId },
        data: {
          comments: freshStats.comments,
          karma: freshStats.karma,
          accountAge: freshStats.accountAge,
          posts: freshStats.posts,
          subscribers: freshStats.subscribers,
          contributions: freshStats.contributions,
          goldEarned: freshStats.goldEarned,
        },
      })

      console.log('✅ Статистика обновлена:', updatedAccount.username)

      return NextResponse.json({
        success: true,
        stats: {
          comments: updatedAccount.comments,
          karma: updatedAccount.karma,
          accountAge: updatedAccount.accountAge,
          posts: updatedAccount.posts,
          subscribers: updatedAccount.subscribers,
          contributions: updatedAccount.contributions,
          goldEarned: updatedAccount.goldEarned,
        },
      })
    } catch (error: any) {
      console.error('Ошибка обновления статистики:', error)
      return NextResponse.json(
        {
          error: 'Ошибка обновления статистики',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Ошибка обновления статистики:', error)
    return NextResponse.json(
      {
        error: 'Ошибка обновления статистики',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}









