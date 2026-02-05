import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Текущий пароль и новый пароль обязательны' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Новый пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Проверяем текущий пароль
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 401 }
      )
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Обновляем пароль
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'Пароль успешно изменен' })
  } catch (error: any) {
    console.error('Ошибка смены пароля:', error)
    return NextResponse.json(
      { error: 'Ошибка смены пароля' },
      { status: 500 }
    )
  }
}






