import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Получить список кабинетов, где текущий пользователь является участником
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Получаем все кабинеты, где текущий пользователь является участником
    const cabinets = await prisma.cabinetMember.findMany({
      where: {
        memberId: userId,
      },
      include: {
        cabinetOwner: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(cabinets)
  } catch (error: any) {
    console.error('Ошибка получения кабинетов:', error)
    return NextResponse.json(
      { error: 'Ошибка получения кабинетов' },
      { status: 500 }
    )
  }
}





