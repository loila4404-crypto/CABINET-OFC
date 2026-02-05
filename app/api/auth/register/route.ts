import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // ВАЖНО: Логируем ВСЕ сразу, чтобы увидеть проблему
  console.error('═══════════════════════════════════════════════════════')
  console.error('📥 ЗАПРОС НА РЕГИСТРАЦИЮ ПОЛУЧЕН')
  console.error('DATABASE_URL:', process.env.DATABASE_URL || 'НЕ НАЙДЕН!')
  console.error('JWT_SECRET:', process.env.JWT_SECRET ? 'Настроен' : 'НЕ НАЙДЕН!')
  console.error('NODE_ENV:', process.env.NODE_ENV)
  console.error('═══════════════════════════════════════════════════════')
  
  try {
    const body = await request.json()
    const { email, password } = body
    console.error('Данные запроса получены:', { email, hasPassword: !!password })

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли пользователь
    console.log('Проверка существующего пользователя...')
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    console.log('Существующий пользователь:', existingUser ? 'Найден' : 'Не найден')

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      )
    }

    // Хешируем пароль
    console.log('Хеширование пароля...')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('Пароль захеширован')

    // Создаем пользователя
    console.log('Создание пользователя в базе данных...')
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })
    console.log('✓ Пользователь создан:', user.id)

    // Генерируем токен
    const token = generateToken(user.id)

    return NextResponse.json(
      { message: 'Регистрация успешна', token },
      { status: 201 }
    )
  } catch (error: any) {
    // ВАЖНО: Используем console.error чтобы точно увидеть ошибку
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌❌❌ КРИТИЧЕСКАЯ ОШИБКА РЕГИСТРАЦИИ ❌❌❌')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name || 'Unknown')
    console.error('Сообщение:', error?.message || 'Нет сообщения')
    console.error('Код ошибки:', error?.code)
    console.error('Имя ошибки:', error?.name)
    if (error?.stack) {
      console.error('Стек ошибки:')
      console.error(error.stack)
    }
    console.error('═══════════════════════════════════════════════════════')
    
    // Возвращаем детальную ошибку в development режиме
    return NextResponse.json(
      { 
        error: 'Ошибка регистрации',
        details: error?.message || 'Неизвестная ошибка',
        code: error?.code,
        type: error?.constructor?.name,
      },
      { status: 500 }
    )
  }
}

