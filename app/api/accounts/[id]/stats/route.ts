import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import { getRedditStats } from '@/lib/reddit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const account = await prisma.redditAccount.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    // Получаем статистику из Reddit
    const stats = await getRedditStats(
      account.redditUrl,
      account.username || undefined
    )

    // Обновляем статистику в базе данных
    const updatedAccount = await prisma.redditAccount.update({
      where: { id: account.id },
      data: {
        comments: stats.comments,
        karma: stats.karma,
        accountAge: stats.accountAge,
        posts: stats.posts,
        subscribers: stats.subscribers,
        contributions: stats.contributions,
        goldEarned: stats.goldEarned,
      },
    })

    return NextResponse.json({
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
    console.error('Ошибка получения статистики:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка получения статистики' },
      { status: 500 }
    )
  }
}

