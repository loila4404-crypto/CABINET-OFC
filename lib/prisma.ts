import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Логируем для отладки
if (typeof window === 'undefined') {
  console.log('🔧 Prisma инициализация:')
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✓ Настроен' : '✗ НЕ НАЙДЕН')
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

