import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Получить информацию о приглашении по токену
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invitation = await prisma.cabinetInvitation.findUnique({
      where: { token },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено' },
        { status: 404 }
      )
    }

    return NextResponse.json(invitation)
  } catch (error: any) {
    console.error('Ошибка получения приглашения:', error)
    return NextResponse.json(
      { error: 'Ошибка получения приглашения' },
      { status: 500 }
    )
  }
}

// Принять приглашение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { token } = await params

    // Получаем приглашение
    const invitation = await prisma.cabinetInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено' },
        { status: 404 }
      )
    }

    if (invitation.receiverId !== userId) {
      return NextResponse.json(
        { error: 'Это приглашение не для вас' },
        { status: 403 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Приглашение уже обработано' },
        { status: 400 }
      )
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await prisma.cabinetMember.findUnique({
      where: {
        cabinetOwnerId_memberId: {
          cabinetOwnerId: invitation.senderId,
          memberId: userId,
        },
      },
    })

    if (existingMember) {
      // Если уже участник, просто помечаем приглашение как принятое
      await prisma.cabinetInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      })

      return NextResponse.json({ message: 'Вы уже являетесь участником этого кабинета' })
    }

    // Создаем участника кабинета
    await prisma.cabinetMember.create({
      data: {
        cabinetOwnerId: invitation.senderId,
        memberId: userId,
        canView: invitation.canView,
        canEdit: invitation.canEdit,
        canDelete: invitation.canDelete,
        canManageMembers: invitation.canManageMembers,
      },
    })

    // Обновляем статус приглашения
    await prisma.cabinetInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })

    return NextResponse.json({ 
      message: 'Приглашение принято',
      cabinetOwnerId: invitation.senderId,
    })
  } catch (error: any) {
    console.error('Ошибка принятия приглашения:', error)
    return NextResponse.json(
      { error: 'Ошибка принятия приглашения' },
      { status: 500 }
    )
  }
}

// Отклонить приглашение
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { token } = await params

    // Получаем приглашение
    const invitation = await prisma.cabinetInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Приглашение не найдено' },
        { status: 404 }
      )
    }

    if (invitation.receiverId !== userId) {
      return NextResponse.json(
        { error: 'Это приглашение не для вас' },
        { status: 403 }
      )
    }

    // Помечаем приглашение как отклоненное
    await prisma.cabinetInvitation.update({
      where: { id: invitation.id },
      data: { status: 'declined' },
    })

    return NextResponse.json({ message: 'Приглашение отклонено' })
  } catch (error: any) {
    console.error('Ошибка отклонения приглашения:', error)
    return NextResponse.json(
      { error: 'Ошибка отклонения приглашения' },
      { status: 500 }
    )
  }
}





