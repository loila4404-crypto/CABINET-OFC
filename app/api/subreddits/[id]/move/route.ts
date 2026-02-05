import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// POST - переместить сабреддит в другую вкладку
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { id } = await params
    const { tabId, order } = await request.json()

    // Проверяем, что сабреддит принадлежит пользователю
    const subreddit = await prisma.subreddit.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!subreddit) {
      return NextResponse.json({ error: 'Сабреддит не найден' }, { status: 404, headers: corsHeaders })
    }

    // Если указан tabId, проверяем, что вкладка принадлежит пользователю
    if (tabId) {
      const tab = await prisma.subredditTab.findFirst({
        where: {
          id: tabId,
          userId,
        },
      })

      if (!tab) {
        return NextResponse.json({ error: 'Вкладка не найдена' }, { status: 404, headers: corsHeaders })
      }
    }

    // Обновляем сабреддит
    const updated = await prisma.subreddit.update({
      where: { id },
      data: {
        tabId: tabId || null,
        order: order !== undefined ? order : subreddit.order,
        updatedAt: new Date(),
      },
      include: {
        tab: true,
      },
    })

    return NextResponse.json(updated, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка перемещения сабреддита:', error)
    return NextResponse.json(
      { error: 'Ошибка перемещения сабреддита', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}







