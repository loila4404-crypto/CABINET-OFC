import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - получить настройки пользователя
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    })

    // Если настроек нет, создаем дефолтные
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          theme: 'dark',
          language: 'ru',
          activeView: 'accounts',
          redditMenuOpen: false
        }
      })
    }

    return NextResponse.json(settings, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Ошибка получения настроек:', error)
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST/PUT - сохранить настройки пользователя
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: corsHeaders })
    }

    const body = await request.json()
    const { theme, language, activeView, redditMenuOpen } = body

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(activeView !== undefined && { activeView }),
        ...(redditMenuOpen !== undefined && { redditMenuOpen }),
        updatedAt: new Date()
      },
      create: {
        userId,
        theme: theme || 'dark',
        language: language || 'ru',
        activeView: activeView || 'accounts',
        redditMenuOpen: redditMenuOpen || false
      }
    })

    return NextResponse.json(settings, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Ошибка сохранения настроек:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения настроек' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

