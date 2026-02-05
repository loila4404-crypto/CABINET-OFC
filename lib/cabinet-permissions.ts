import { prisma } from '@/lib/prisma'

export interface CabinetPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
}

/**
 * Проверяет права доступа пользователя к кабинету другого пользователя
 * @param userId ID пользователя, который запрашивает доступ
 * @param cabinetOwnerId ID владельца кабинета
 * @returns Права доступа или null, если пользователь не является участником
 */
export async function getUserCabinetPermissions(
  userId: string,
  cabinetOwnerId: string
): Promise<CabinetPermissions | null> {
  // Если пользователь - владелец кабинета, возвращаем полные права
  if (userId === cabinetOwnerId) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
    }
  }

  // Ищем участника в кабинете
  const member = await prisma.cabinetMember.findUnique({
    where: {
      cabinetOwnerId_memberId: {
        cabinetOwnerId,
        memberId: userId,
      },
    },
  })

  if (!member) {
    return null
  }

  return {
    canView: member.canView,
    canEdit: member.canEdit,
    canDelete: member.canDelete,
    canManageMembers: member.canManageMembers,
  }
}

/**
 * Проверяет, имеет ли пользователь право на просмотр
 */
export async function canView(userId: string, cabinetOwnerId: string): Promise<boolean> {
  const permissions = await getUserCabinetPermissions(userId, cabinetOwnerId)
  return permissions?.canView ?? false
}

/**
 * Проверяет, имеет ли пользователь право на редактирование
 */
export async function canEdit(userId: string, cabinetOwnerId: string): Promise<boolean> {
  const permissions = await getUserCabinetPermissions(userId, cabinetOwnerId)
  return permissions?.canEdit ?? false
}

/**
 * Проверяет, имеет ли пользователь право на удаление
 */
export async function canDelete(userId: string, cabinetOwnerId: string): Promise<boolean> {
  const permissions = await getUserCabinetPermissions(userId, cabinetOwnerId)
  return permissions?.canDelete ?? false
}

/**
 * Проверяет, имеет ли пользователь право на управление участниками
 */
export async function canManageMembers(userId: string, cabinetOwnerId: string): Promise<boolean> {
  const permissions = await getUserCabinetPermissions(userId, cabinetOwnerId)
  return permissions?.canManageMembers ?? false
}





