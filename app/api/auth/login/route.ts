import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Генерируем токен
    const token = generateToken(user.id)

    return NextResponse.json({ token, userId: user.id })
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА ВХОДА')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name || 'Unknown')
    console.error('Сообщение:', error?.message || 'Нет сообщения')
    console.error('Стек:', error?.stack || 'Нет стека')
    console.error('Код ошибки:', error?.code)
    console.error('═══════════════════════════════════════════════════════')
    
    return NextResponse.json(
      { 
        error: 'Ошибка входа',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

