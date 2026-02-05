import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { initMegaClient, syncToMega, syncFromMega } from '@/lib/mega'

// Инициализация MEGA клиента при первом запросе
let megaInitialized = false

function initMega() {
  if (megaInitialized) return

  try {
    const email = process.env.MEGA_EMAIL
    const password = process.env.MEGA_PASSWORD
    const recoveryKey = process.env.MEGA_RECOVERY_KEY

    console.log('🔍 Проверка настроек MEGA:', {
      hasEmail: !!email,
      hasPassword: !!password,
      hasRecoveryKey: !!recoveryKey,
      nodeEnv: process.env.NODE_ENV,
      emailPreview: email ? `${email.substring(0, 3)}***` : 'не установлен'
    })

    if (!email || !password) {
      console.warn('⚠️ MEGA учетные данные не настроены. Установите MEGA_EMAIL и MEGA_PASSWORD в .env')
      console.warn('   Создайте файл .env в корне проекта и добавьте:')
      console.warn('   MEGA_EMAIL="your-email@example.com"')
      console.warn('   MEGA_PASSWORD="your-password"')
      console.warn('   MEGA_RECOVERY_KEY="your-recovery-key"')
      // В режиме разработки продолжаем работу
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Используется MOCK режим - файлы НЕ будут загружаться в реальный MEGA!')
        initMegaClient({
          email: 'dev@example.com',
          password: 'dev',
          recoveryKey,
        })
        megaInitialized = true
        return
      }
      throw new Error('MEGA учетные данные не настроены. Установите MEGA_EMAIL и MEGA_PASSWORD в .env')
    }

    console.log('✅ Найдены учетные данные MEGA, инициализация реального подключения...')
    initMegaClient({
      email,
      password,
      recoveryKey,
    })
    
    megaInitialized = true
    console.log('✅ MEGA клиент инициализирован с реальными учетными данными')
    console.log('   Email:', email.substring(0, 3) + '***')
    console.log('   Recovery Key:', recoveryKey ? 'установлен' : 'не установлен')
  } catch (error: any) {
    console.error('❌ Ошибка инициализации MEGA клиента:', error)
    console.error('   Детали:', error.message)
    // В режиме разработки продолжаем работу без реального подключения
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Продолжаем работу в режиме разработки без MEGA (MOCK режим)')
      megaInitialized = true
    } else {
      throw error
    }
  }
}

// Синхронизировать данные в Mego
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    initMega()

    const { data } = await request.json()

    if (!data) {
      return NextResponse.json(
        { error: 'Данные не предоставлены' },
        { status: 400 }
      )
    }

    // Сохраняем данные в MEGA
    console.log('📤 Начало синхронизации данных в MEGA для пользователя:', userId)
    const success = await syncToMega(userId)

    if (success) {
      console.log('✅ Синхронизация успешно завершена для пользователя:', userId)
      return NextResponse.json({ 
        message: 'Данные синхронизированы с MEGA',
        timestamp: Date.now(),
        userId,
      })
    } else {
      console.error('❌ Ошибка синхронизации с MEGA для пользователя:', userId)
      return NextResponse.json(
        { error: 'Ошибка синхронизации с MEGA' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Ошибка синхронизации с MEGA:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка синхронизации с MEGA' },
      { status: 500 }
    )
  }
}

// Загрузить данные из Mego
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    initMega()

    // Загружаем данные из MEGA
    const data = await syncFromMega(userId)

    if (!data) {
      // Возвращаем 200 с пустыми данными вместо 404, чтобы клиент понимал, что маршрут работает
      return NextResponse.json(
        { 
          message: 'Данные не найдены в MEGA', 
          data: null,
          timestamp: Date.now(),
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ 
      message: 'Данные загружены из MEGA',
      data,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('Ошибка загрузки из MEGA:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка загрузки из MEGA' },
      { status: 500 }
    )
  }
}

// Получить данные для синхронизации (экспорт)
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { localStorage, sessionStorage, cookies } = await request.json()

    // Сохраняем данные в MEGA
    initMega()
    
    const data = {
      localStorage: localStorage || {},
      sessionStorage: sessionStorage || {},
      cookies: cookies || '',
      timestamp: Date.now(),
    }

    const success = await syncToMega(userId)

    if (success) {
      return NextResponse.json({ 
        message: 'Данные сохранены в MEGA',
        timestamp: data.timestamp,
      })
    } else {
      return NextResponse.json(
        { error: 'Ошибка сохранения в MEGA' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Ошибка сохранения в MEGA:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка сохранения в MEGA' },
      { status: 500 }
    )
  }
}

