import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - получить все данные пользователя или конкретный ключ
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      // Получаем конкретный ключ
      const data = await prisma.userData.findUnique({
        where: {
          userId_key: { userId, key }
        }
      })

      if (!data) {
        return NextResponse.json({ value: null }, { headers: corsHeaders })
      }

      try {
        return NextResponse.json({ value: JSON.parse(data.value) }, { headers: corsHeaders })
      } catch {
        return NextResponse.json({ value: data.value }, { headers: corsHeaders })
      }
    } else {
      // Получаем все данные пользователя
      const allData = await prisma.userData.findMany({
        where: { userId },
        select: { key: true, value: true }
      })

      const result: Record<string, any> = {}
      for (const item of allData) {
        try {
          result[item.key] = JSON.parse(item.value)
        } catch {
          result[item.key] = item.value
        }
      }

      return NextResponse.json(result, { headers: corsHeaders })
    }
  } catch (error: any) {
    console.error('Ошибка получения данных пользователя:', error)
    return NextResponse.json(
      { error: 'Ошибка получения данных' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - сохранить данные пользователя
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Ключ обязателен' }, { status: 400, headers: corsHeaders })
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

    // Upsert - создаем или обновляем
    const data = await prisma.userData.upsert({
      where: {
        userId_key: { userId, key }
      },
      update: {
        value: valueStr,
        updatedAt: new Date()
      },
      create: {
        userId,
        key,
        value: valueStr
      }
    })

    return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Ошибка сохранения данных пользователя:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения данных' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT - массовое сохранение данных
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const body = await request.json()
    // body должен быть объектом { key1: value1, key2: value2, ... }

    const results = []
    for (const [key, value] of Object.entries(body)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
      
      const data = await prisma.userData.upsert({
        where: {
          userId_key: { userId, key }
        },
        update: {
          value: valueStr,
          updatedAt: new Date()
        },
        create: {
          userId,
          key,
          value: valueStr
        }
      })
      results.push({ key, id: data.id })
    }

    return NextResponse.json({ success: true, saved: results.length }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Ошибка массового сохранения данных:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения данных' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE - удалить данные по ключу
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Ключ обязателен' }, { status: 400, headers: corsHeaders })
    }

    await prisma.userData.deleteMany({
      where: { userId, key }
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Ошибка удаления данных пользователя:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления данных' },
      { status: 500, headers: corsHeaders }
    )
  }
}

