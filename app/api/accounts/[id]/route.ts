import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import { canView, canEdit, canDelete } from '@/lib/cabinet-permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params

    // Получаем аккаунт
    const account = await prisma.redditAccount.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        username: true,
        redditUrl: true,
        redditToken: true,
        email: true,
        password: true,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    // Проверяем права доступа
    const hasViewAccess = await canView(userId, account.userId)
    if (!hasViewAccess) {
      return NextResponse.json(
        { error: 'Нет доступа к этому аккаунту' },
        { status: 403 }
      )
    }

    return NextResponse.json(account)
  } catch (error: any) {
    console.error('Ошибка получения аккаунта:', error)
    return NextResponse.json(
      { error: 'Ошибка получения аккаунта' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const { email, password } = await request.json()

    // Получаем аккаунт
    const account = await prisma.redditAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    // Проверяем права на редактирование
    const hasEditAccess = await canEdit(userId, account.userId)
    if (!hasEditAccess) {
      return NextResponse.json(
        { error: 'Нет прав на редактирование этого аккаунта' },
        { status: 403 }
      )
    }

    // Обновляем email и password
    const updatedAccount = await prisma.redditAccount.update({
      where: { id },
      data: {
        email: email || account.email,
        password: password || account.password,
      },
    })

    return NextResponse.json({
      id: updatedAccount.id,
      username: updatedAccount.username,
      email: updatedAccount.email,
      password: updatedAccount.password,
    })
  } catch (error: any) {
    console.error('Ошибка обновления аккаунта:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления аккаунта' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params

    // Получаем аккаунт
    const account = await prisma.redditAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    // Проверяем права на удаление
    const hasDeleteAccess = await canDelete(userId, account.userId)
    if (!hasDeleteAccess) {
      return NextResponse.json(
        { error: 'Нет прав на удаление этого аккаунта' },
        { status: 403 }
      )
    }

    // Удаляем аккаунт
    await prisma.redditAccount.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Аккаунт удален' })
  } catch (error: any) {
    console.error('Ошибка удаления аккаунта:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления аккаунта' },
      { status: 500 }
    )
  }
}
