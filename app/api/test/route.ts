import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Проверяем переменные окружения
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? '✓ Настроен' : '✗ НЕ НАЙДЕН',
      JWT_SECRET: process.env.JWT_SECRET ? '✓ Настроен' : '✗ НЕ НАЙДЕН',
      NODE_ENV: process.env.NODE_ENV || 'не установлен',
    }

    // Проверяем подключение к базе данных
    let dbCheck = 'Не проверено'
    try {
      await prisma.user.findMany()
      dbCheck = '✓ База данных работает'
    } catch (dbError: any) {
      dbCheck = `✗ Ошибка базы данных: ${dbError.message}`
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      database: dbCheck,
      message: 'Тестовый endpoint работает',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}











