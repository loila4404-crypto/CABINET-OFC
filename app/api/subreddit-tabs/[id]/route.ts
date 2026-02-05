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

// PUT - обновить вкладку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    } catch (e: any) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы SubredditTab:', e.message)
      }
    }

    const { id } = await params
    const { name, order } = await request.json()

    // Проверяем, что вкладка принадлежит пользователю
    const existing = await prisma.subredditTab.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Вкладка не найдена' }, { status: 404, headers: corsHeaders })
    }

    // Если меняется имя, проверяем на дубликаты
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.subredditTab.findUnique({
        where: {
          userId_name: {
            userId,
            name: name.trim(),
          },
        },
      })

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'Вкладка с таким названием уже существует' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    const tab = await prisma.subredditTab.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        order: order !== undefined ? order : existing.order,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(tab, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка обновления вкладки:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления вкладки', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE - удалить вкладку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    } catch (e: any) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.warn('⚠️ Предупреждение при создании таблицы SubredditTab:', e.message)
      }
    }

    const { id } = await params

    // Проверяем, что вкладка принадлежит пользователю
    const existing = await prisma.subredditTab.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Вкладка не найдена' }, { status: 404, headers: corsHeaders })
    }

    // Удаляем вкладку (сабреддиты останутся, но tabId станет null)
    await prisma.subredditTab.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Вкладка удалена' }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('❌ Ошибка удаления вкладки:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления вкладки', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

