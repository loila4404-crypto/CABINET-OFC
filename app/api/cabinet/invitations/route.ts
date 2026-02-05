import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Получить список приглашений (входящие для получателя, исходящие для отправителя)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // received или sent

    if (type === 'received') {
      // Получаем входящие приглашения
      const invitations = await prisma.cabinetInvitation.findMany({
        where: {
          receiverId: userId,
          status: 'pending',
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json(invitations)
    } else {
      // Получаем исходящие приглашения
      const invitations = await prisma.cabinetInvitation.findMany({
        where: {
          senderId: userId,
        },
        include: {
          receiver: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json(invitations)
    }
  } catch (error: any) {
    console.error('Ошибка получения приглашений:', error)
    return NextResponse.json(
      { error: 'Ошибка получения приглашений' },
      { status: 500 }
    )
  }
}

// Создать приглашение
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { receiverEmail, canView, canEdit, canDelete, canManageMembers } = await request.json()

    if (!receiverEmail) {
      return NextResponse.json(
        { error: 'Email получателя обязателен' },
        { status: 400 }
      )
    }

    // Находим получателя по email
    const receiver = await prisma.user.findUnique({
      where: { email: receiverEmail },
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      )
    }

    if (receiver.id === userId) {
      return NextResponse.json(
        { error: 'Нельзя отправить приглашение самому себе' },
        { status: 400 }
      )
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await prisma.cabinetMember.findUnique({
      where: {
        cabinetOwnerId_memberId: {
          cabinetOwnerId: userId,
          memberId: receiver.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Пользователь уже является участником кабинета' },
        { status: 400 }
      )
    }

    // Проверяем, нет ли уже активного приглашения
    const existingInvitation = await prisma.cabinetInvitation.findFirst({
      where: {
        senderId: userId,
        receiverId: receiver.id,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { 
          error: 'Приглашение уже отправлено',
          invitation: existingInvitation,
        },
        { status: 400 }
      )
    }

    // Генерируем уникальный токен
    const token = crypto.randomBytes(32).toString('hex')

    // Создаем приглашение
    const invitation = await prisma.cabinetInvitation.create({
      data: {
        senderId: userId,
        receiverId: receiver.id,
        token,
        canView: canView ?? true,
        canEdit: canEdit ?? false,
        canDelete: canDelete ?? false,
        canManageMembers: canManageMembers ?? false,
      },
      include: {
        receiver: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      invitation,
      invitationLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Ошибка создания приглашения:', error)
    return NextResponse.json(
      { error: 'Ошибка создания приглашения' },
      { status: 500 }
    )
  }
}





