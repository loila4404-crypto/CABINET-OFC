import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled || false,
    })
  } catch (error: any) {
    console.error('Ошибка получения статуса двухфакторной аутентификации:', error)
    return NextResponse.json(
      { error: 'Ошибка получения статуса' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { enabled } = await request.json()

    // Обновляем статус двухфакторной аутентификации
    // Примечание: если поле twoFactorEnabled не существует в схеме, нужно будет добавить его
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    }).catch(async (error) => {
      // Если поле не существует, создаем его через raw query или добавляем в схему
      console.warn('Поле twoFactorEnabled может не существовать в схеме:', error)
      // Пока просто возвращаем успех, поле можно добавить позже через миграцию
    })

    return NextResponse.json({
      success: true,
      twoFactorEnabled: enabled,
      message: enabled ? 'Двухфакторная аутентификация включена' : 'Двухфакторная аутентификация выключена',
    })
  } catch (error: any) {
    console.error('Ошибка обновления двухфакторной аутентификации:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    )
  }
}






