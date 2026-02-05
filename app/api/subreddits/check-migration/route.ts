import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Временный endpoint для проверки и применения миграции
export async function GET(request: NextRequest) {
  try {
    // Проверяем, существует ли таблица Subreddit
    const result = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='Subreddit'
    `
    
    if (result.length > 0) {
      return NextResponse.json({ 
        exists: true, 
        message: 'Таблица Subreddit существует' 
      })
    }
    
    // Если таблицы нет, применяем миграцию
    console.log('📝 Применение миграции для создания таблицы Subreddit...')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Subreddit" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "postingRules" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Subreddit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Subreddit_userId_idx" ON "Subreddit"("userId")
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Subreddit_userId_url_key" ON "Subreddit"("userId", "url")
    `
    
    return NextResponse.json({ 
      exists: false, 
      created: true,
      message: 'Таблица Subreddit создана' 
    })
  } catch (error: any) {
    console.error('❌ Ошибка проверки/создания таблицы:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка проверки миграции', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}







