import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Обработка OPTIONS запросов для CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - получить конкретный сабреддит
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { id } = await params

    const subreddit = await prisma.subreddit.findFirst({
      where: {
        id,
        userId, // Проверяем, что сабреддит принадлежит пользователю
      },
    })

    if (!subreddit) {
      return NextResponse.json({ error: 'Сабреддит не найден' }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json(subreddit, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка загрузки сабреддита:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки сабреддита', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT - обновить сабреддит
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { id } = await params
    const { name, url, postingRules, tabId } = await request.json()

    // Проверяем, что сабреддит принадлежит пользователю
    const existing = await prisma.subreddit.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Сабреддит не найден' }, { status: 404, headers: corsHeaders })
    }

    // Нормализуем URL если он передан
    const normalizedUrl = url ? url.trim().replace(/\/$/, '').toLowerCase() : existing.url

    // Если URL изменился, проверяем на дубликаты
    if (normalizedUrl !== existing.url) {
      const duplicate = await prisma.subreddit.findUnique({
        where: {
          userId_url: {
            userId,
            url: normalizedUrl,
          },
        },
      })

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'Сабреддит с таким URL уже существует' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Если указан tabId, проверяем, что вкладка принадлежит пользователю
    if (tabId !== undefined && tabId !== null) {
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
    const subreddit = await prisma.subreddit.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        url: normalizedUrl,
        postingRules: postingRules !== undefined ? (postingRules?.trim() || null) : existing.postingRules,
        tabId: tabId !== undefined ? (tabId || null) : existing.tabId,
        updatedAt: new Date(),
      },
      include: {
        tab: true,
      },
    })

    return NextResponse.json(subreddit, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка обновления сабреддита:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления сабреддита', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE - удалить сабреддит
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { id } = await params

    // Проверяем, что сабреддит принадлежит пользователю
    const existing = await prisma.subreddit.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Сабреддит не найден' }, { status: 404, headers: corsHeaders })
    }

    // Удаляем сабреддит
    await prisma.subreddit.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Сабреддит удален' }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка удаления сабреддита:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления сабреддита', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

