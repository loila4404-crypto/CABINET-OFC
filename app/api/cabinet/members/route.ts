import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendEmail, generateInvitationEmail } from '@/lib/email'

// Получить список участников кабинета
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Получаем всех участников кабинета (где текущий пользователь - владелец)
    const members = await prisma.cabinetMember.findMany({
      where: {
        cabinetOwnerId: userId,
      },
      include: {
        member: {
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

    return NextResponse.json(members)
  } catch (error: any) {
    console.error('Ошибка получения участников:', error)
    return NextResponse.json(
      { error: 'Ошибка получения участников' },
      { status: 500 }
    )
  }
}

// Добавить участника в кабинет
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { memberEmail, canView, canEdit, canDelete, canManageMembers } = await request.json()

    if (!memberEmail) {
      return NextResponse.json(
        { error: 'Email участника обязателен' },
        { status: 400 }
      )
    }

    // Находим пользователя по email
    const member = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      )
    }

    if (member.id === userId) {
      return NextResponse.json(
        { error: 'Нельзя добавить себя в качестве участника' },
        { status: 400 }
      )
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await prisma.cabinetMember.findUnique({
      where: {
        cabinetOwnerId_memberId: {
          cabinetOwnerId: userId,
          memberId: member.id,
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
        receiverId: member.id,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { 
          error: 'Приглашение уже отправлено',
          invitation: existingInvitation,
          invitationLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${existingInvitation.token}`,
        },
        { status: 400 }
      )
    }

    // Генерируем уникальный токен для приглашения
    const token = crypto.randomBytes(32).toString('hex')

    // Создаем приглашение
    const invitation = await prisma.cabinetInvitation.create({
      data: {
        senderId: userId,
        receiverId: member.id,
        token,
        canView: canView ?? true,
        canEdit: canEdit ?? false,
        canDelete: canDelete ?? false,
        canManageMembers: canManageMembers ?? false,
      },
    })

    // Создаем участника сразу (можно также сделать так, чтобы участник создавался только после принятия приглашения)
    const cabinetMember = await prisma.cabinetMember.create({
      data: {
        cabinetOwnerId: userId,
        memberId: member.id,
        canView: canView ?? true,
        canEdit: canEdit ?? false,
        canDelete: canDelete ?? false,
        canManageMembers: canManageMembers ?? false,
      },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    })

    // Помечаем приглашение как принятое, так как участник уже создан
    await prisma.cabinetInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })

    // Получаем информацию об отправителе для email
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    // Отправляем email уведомление (асинхронно, не блокируем ответ)
    if (sender) {
      sendEmail(generateInvitationEmail(member.email, sender.email, invitationLink))
        .then((success) => {
          if (success) {
            console.log(`✅ Email приглашение отправлено на ${member.email}`)
          } else {
            console.error(`❌ Ошибка отправки email на ${member.email}`)
          }
        })
        .catch((error) => {
          console.error('Ошибка отправки email:', error)
        })
    }

    return NextResponse.json({
      member: cabinetMember,
      invitationLink,
      emailSent: true,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Ошибка добавления участника:', error)
    return NextResponse.json(
      { error: 'Ошибка добавления участника' },
      { status: 500 }
    )
  }
}

