import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Изменить права участника
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { canView, canEdit, canDelete, canManageMembers } = await request.json()

    // Проверяем, что текущий пользователь - владелец кабинета
    const cabinetMember = await prisma.cabinetMember.findUnique({
      where: { id },
    })

    if (!cabinetMember) {
      return NextResponse.json(
        { error: 'Участник не найден' },
        { status: 404 }
      )
    }

    if (cabinetMember.cabinetOwnerId !== userId) {
      return NextResponse.json(
        { error: 'Нет доступа' },
        { status: 403 }
      )
    }

    // Обновляем права
    const updated = await prisma.cabinetMember.update({
      where: { id },
      data: {
        canView: canView !== undefined ? canView : cabinetMember.canView,
        canEdit: canEdit !== undefined ? canEdit : cabinetMember.canEdit,
        canDelete: canDelete !== undefined ? canDelete : cabinetMember.canDelete,
        canManageMembers: canManageMembers !== undefined ? canManageMembers : cabinetMember.canManageMembers,
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

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Ошибка обновления прав участника:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления прав участника' },
      { status: 500 }
    )
  }
}

// Удалить участника из кабинета
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Проверяем, что текущий пользователь - владелец кабинета
    const cabinetMember = await prisma.cabinetMember.findUnique({
      where: { id },
    })

    if (!cabinetMember) {
      return NextResponse.json(
        { error: 'Участник не найден' },
        { status: 404 }
      )
    }

    if (cabinetMember.cabinetOwnerId !== userId) {
      return NextResponse.json(
        { error: 'Нет доступа' },
        { status: 403 }
      )
    }

    // Удаляем участника
    await prisma.cabinetMember.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Участник удален' })
  } catch (error: any) {
    console.error('Ошибка удаления участника:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления участника' },
      { status: 500 }
    )
  }
}





