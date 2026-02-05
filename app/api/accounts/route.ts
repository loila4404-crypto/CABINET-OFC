import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import { getRedditStats, getRedditStatsWithToken } from '@/lib/reddit'
import axios from 'axios'
import * as cheerio from 'cheerio'

// CORS заголовки для работы с расширением браузера
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Обработка OPTIONS запросов для CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('📥 ЗАПРОС НА ЗАГРУЗКУ АККАУНТОВ')
    console.log('═══════════════════════════════════════════════════════')
    
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      console.error('✗ Пользователь не авторизован')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('✓ Пользователь авторизован:', userId)
    console.log('📊 Запрос к базе данных...')
    
    // Проверяем, есть ли вообще аккаунты в БД (для отладки)
    const allAccountsCount = await prisma.redditAccount.count()
    console.log('📊 Всего аккаунтов в БД:', allAccountsCount)
    
    // Проверяем, есть ли аккаунты у других пользователей (для отладки)
    const otherUsersAccounts = await prisma.redditAccount.findMany({
      select: { userId: true, id: true, username: true },
      take: 5,
    })
    console.log('📊 Примеры аккаунтов в БД (первые 5):', otherUsersAccounts)

    // Получаем кабинеты, где пользователь является участником
    const memberCabinets = await prisma.cabinetMember.findMany({
      where: { memberId: userId },
      select: { cabinetOwnerId: true, canView: true },
    })

    // Собираем ID владельцев кабинетов, к которым есть доступ
    const accessibleOwnerIds = [userId, ...memberCabinets.filter(m => m.canView).map(m => m.cabinetOwnerId)]

    const accounts = await prisma.redditAccount.findMany({
      where: { 
        userId: { in: accessibleOwnerIds }
      },
      select: {
        id: true,
        userId: true, // Добавляем userId для идентификации владельца
        redditUrl: true,
        username: true,
        email: true,
        password: true,
        avatarUrl: true,
        comments: true,
        karma: true,
        accountAge: true,
        posts: true,
        subscribers: true,
        contributions: true,
        goldEarned: true,
        activeIn: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`✅ Загружено аккаунтов для пользователя ${userId}:`, accounts.length)
    if (accounts.length === 0 && allAccountsCount > 0) {
      console.warn('⚠️ ВНИМАНИЕ: В БД есть аккаунты, но не для этого пользователя!')
      console.warn('   Это может означать, что аккаунты были созданы с другим userId')
    }
    
    // Логируем пример данных для диагностики
    if (accounts.length > 0) {
      console.log('📋 Пример данных первого аккаунта:', {
        id: accounts[0].id,
        username: accounts[0].username,
        hasActiveIn: accounts[0].activeIn !== undefined && accounts[0].activeIn !== null,
        activeIn: accounts[0].activeIn,
      })
    }
    
    console.log('═══════════════════════════════════════════════════════')
    return NextResponse.json(accounts, { headers: corsHeaders })
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА ЗАГРУЗКИ АККАУНТОВ')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name)
    console.error('Сообщение:', error?.message)
    console.error('Код ошибки:', error?.code)
    
    // Проверяем, связана ли ошибка с отсутствующим полем в БД
    const errorMessage = error?.message || ''
    const isDbSchemaError = errorMessage.includes('activeIn') || 
                           errorMessage.includes('Unknown column') ||
                           errorMessage.includes('no such column') ||
                           error?.code === 'P2001' ||
                           error?.code === 'P2025'
    
    if (isDbSchemaError) {
      console.error('⚠️ ВОЗМОЖНАЯ ПРОБЛЕМА: Поле activeIn отсутствует в базе данных!')
      console.error('   Решение: Выполните миграцию базы данных:')
      console.error('   npx prisma migrate dev --name add_active_in_field')
      console.error('   или')
      console.error('   npx prisma db push')
    }
    
    if (error?.stack) {
      console.error('Стек ошибки:')
      console.error(error.stack)
    }
    console.error('═══════════════════════════════════════════════════════')
    
    let userErrorMessage = 'Ошибка загрузки аккаунтов'
    if (isDbSchemaError) {
      userErrorMessage = 'Ошибка загрузки аккаунтов. Требуется обновление базы данных. Выполните в терминале: npx prisma db push'
    }
    
    return NextResponse.json(
      { 
        error: userErrorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем права на редактирование (можно создавать только в своем кабинете)
    // Участники других кабинетов не могут создавать аккаунты

    let { username, redditUrl, email, password, redditToken, stats: preParsedStats } = await request.json()

    // Очищаем токен от пробелов и переносов строк (на случай если пользователь скопировал с пробелами)
    if (redditToken) {
      const originalLength = redditToken.length
      redditToken = redditToken.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
      console.log('🔧 Токен получен - исходная длина:', originalLength)
      console.log('🔧 Токен после очистки - длина:', redditToken.length)
      console.log('🔧 Первые 50 символов:', redditToken.substring(0, 50))
      console.log('🔧 Последние 50 символов:', redditToken.substring(Math.max(0, redditToken.length - 50)))
      
      // Проверяем, что токен не слишком короткий (Reddit session cookie обычно длинный)
      if (redditToken.length < 50) {
        console.warn('⚠️ ВНИМАНИЕ: Токен очень короткий! Возможно, он обрезан при копировании.')
      }
    }

    // Если передан только токен, извлекаем данные из Reddit
    if (redditToken && !username && !redditUrl) {
      try {
        console.log('═══════════════════════════════════════════════════════')
        console.log('📥 ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ REDDIT ПО ТОКЕНУ')
        console.log('Длина токена:', redditToken.length)
        console.log('Первые 50 символов токена:', redditToken.substring(0, 50))
        console.log('Последние 50 символов токена:', redditToken.substring(Math.max(0, redditToken.length - 50)))
        console.log('Токен содержит точки:', redditToken.includes('.'))
        console.log('Токен содержит пробелы:', redditToken.includes(' '))
        console.log('Токен содержит переносы строк:', redditToken.includes('\n'))
        // Очищаем токен от пробелов и переносов строк
        redditToken = redditToken.trim().replace(/\s+/g, '')
        console.log('Токен после очистки - длина:', redditToken.length)
        console.log('═══════════════════════════════════════════════════════')
        
        // Получаем информацию о текущем пользователе через Reddit API
        // Пробуем разные варианты использования токена
        let userInfoResponse
        let extractedUsername = null
        
        // Вариант 1: Используем токен как session cookie для получения текущего пользователя
        // Проверяем, является ли токен полной строкой cookies или только одним токеном
        let cookieHeader: string
        const cleanTokenForHeader = redditToken.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
        
        if (cleanTokenForHeader.includes(';') && cleanTokenForHeader.includes('=')) {
          // Это полная строка cookies (например, "reddit_session=xxx; csrf_token=yyy")
          cookieHeader = cleanTokenForHeader
          console.log('✅ Используется полная строка cookies (несколько cookies)')
          console.log('   Количество cookies в строке:', cleanTokenForHeader.split(';').length)
          console.log('   Содержит reddit_session:', cookieHeader.includes('reddit_session'))
          console.log('   Содержит csrf_token:', cookieHeader.includes('csrf_token'))
        } else {
          // Это только один токен, используем его как reddit_session
          cookieHeader = `reddit_session=${cleanTokenForHeader}`
          console.log('✅ Используется только reddit_session cookie')
          console.log('   Длина токена:', cleanTokenForHeader.length)
        }
        
        try {
          console.log('🔍 Попытка 1a: Использование токена как session cookie для /api/me.json...')
          console.log('   Cookie заголовок (первые 100 символов):', cookieHeader.substring(0, 100))
          userInfoResponse = await axios.get('https://www.reddit.com/api/me.json', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': cookieHeader, // Используем полную строку cookies или только reddit_session
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.reddit.com/',
              'Origin': 'https://www.reddit.com',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
            },
            timeout: 15000,
            validateStatus: (status) => status < 500,
          })
          
          console.log('📥 Ответ от /api/me.json получен')
          console.log('   Статус:', userInfoResponse.status)
          console.log('   Есть данные:', !!userInfoResponse.data?.data)
          
          if (userInfoResponse.status === 403 || userInfoResponse.status === 401) {
            console.error('❌ Доступ запрещен при запросе /api/me.json')
            console.error('   Это означает, что токен недействителен или истек')
            throw new Error('Токен недействителен. Убедитесь, что вы скопировали полный токен из расширения и что вы залогинены в Reddit.')
          }
          
          if (userInfoResponse.data?.data?.name) {
            extractedUsername = userInfoResponse.data.data.name
            console.log('✅ Username извлечен через /api/me.json (Cookie):', extractedUsername)
          } else {
            console.warn('⚠️ Ответ от /api/me.json получен, но username не найден')
            console.warn('   Статус:', userInfoResponse.status)
            console.warn('   Данные ответа:', JSON.stringify(userInfoResponse.data, null, 2))
          }
        } catch (error1: any) {
          console.warn('⚠️ Ошибка при запросе /api/me.json (Cookie):', error1.message)
          console.warn('   Статус:', error1.response?.status)
          console.warn('   Данные:', error1.response?.data)
          
          // Если это ошибка доступа, пробрасываем её дальше
          if (error1.response?.status === 403 || error1.response?.status === 401) {
            throw new Error('Доступ запрещен. Токен недействителен или истек. Убедитесь, что вы скопировали полный токен из расширения.')
          }
          
          // Пробуем как Bearer token
          try {
            console.log('🔍 Попытка 1b: Использование токена как Bearer token...')
            const bearerResponse = await axios.get('https://www.reddit.com/api/me.json', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Authorization': `Bearer ${redditToken}`,
                'Accept': 'application/json',
              },
              timeout: 15000,
              validateStatus: (status) => status < 500,
            })
            
            if (bearerResponse.data?.data?.name) {
              extractedUsername = bearerResponse.data.data.name
              console.log('✅ Username извлечен через /api/me.json (Bearer):', extractedUsername)
            }
          } catch (bearerError: any) {
            console.warn('⚠️ Ошибка при запросе /api/me.json (Bearer):', bearerError.message)
          }
        }
        
        // Вариант 2: Если не получилось, пробуем получить данные из профиля напрямую
        if (!extractedUsername) {
          try {
            console.log('🔍 Попытка 2: Парсинг данных из HTML страницы...')
            // Пробуем получить username из токена (если это JWT или содержит username)
            // Или пробуем запросить about.json с токеном
            const aboutResponse = await axios.get('https://www.reddit.com/user/me/about.json', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookieHeader, // Используем полную строку cookies
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.reddit.com/',
                'Origin': 'https://www.reddit.com',
              },
              timeout: 15000,
              validateStatus: (status) => status < 500,
            })
            
            if (aboutResponse.data?.data?.name) {
              extractedUsername = aboutResponse.data.data.name
              console.log('✅ Username извлечен через /user/me/about.json:', extractedUsername)
            }
          } catch (error2: any) {
            console.warn('⚠️ Ошибка при запросе /user/me/about.json:', error2.message)
          }
        }
        
        // Вариант 3: Пробуем извлечь username из самого токена (если это JWT)
        if (!extractedUsername) {
          try {
            console.log('🔍 Попытка 3: Извлечение username из структуры токена...')
            // Если токен содержит точки (JWT формат), пробуем декодировать
            if (redditToken.includes('.')) {
              const parts = redditToken.split('.')
              if (parts.length >= 2) {
                try {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
                  if (payload.name || payload.username || payload.sub) {
                    extractedUsername = payload.name || payload.username || payload.sub
                    console.log('✅ Username извлечен из JWT токена:', extractedUsername)
                  }
                } catch (e) {
                  // Не JWT формат
                }
              }
            }
          } catch (error3: any) {
            console.warn('⚠️ Ошибка при декодировании токена:', error3.message)
          }
        }
        
        if (extractedUsername) {
          username = extractedUsername
          redditUrl = `https://www.reddit.com/user/${extractedUsername}`
          email = '' // Email не обязателен при использовании токена
          password = '' // Пароль не обязателен при использовании токена
          
          console.log('✅ Username извлечен из токена:', extractedUsername)
          console.log('✅ URL создан:', redditUrl)
        } else {
          // Если не удалось извлечь username, пробуем использовать токен для парсинга статистики
          // и извлечь username из статистики через парсинг HTML
          console.log('⚠️ Не удалось извлечь username напрямую, пробуем через парсинг HTML профиля...')
          
          try {
            // Пробуем получить HTML страницу профиля с токеном и извлечь username оттуда
            const htmlResponse = await axios.get('https://www.reddit.com/user/me', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': `reddit_session=${redditToken}`,
                'Accept': 'text/html',
              },
              timeout: 15000,
              validateStatus: (status) => status < 500,
              maxRedirects: 5,
            })
            
            // Парсим HTML для извлечения username
            const $ = cheerio.load(htmlResponse.data)
            
            // Ищем username в различных местах HTML
            let foundUsername = null
            
            // Вариант 1: Из URL редиректа
            if (htmlResponse.request?.res?.responseUrl) {
              const urlMatch = htmlResponse.request.res.responseUrl.match(/\/user\/([^\/\?]+)/)
              if (urlMatch) {
                foundUsername = urlMatch[1]
                console.log('✅ Username найден в URL редиректа:', foundUsername)
              }
            }
            
            // Вариант 2: Из мета-тегов или data-атрибутов
            if (!foundUsername) {
              const metaUsername = $('meta[property="og:url"]').attr('content') || 
                                   $('meta[name="twitter:url"]').attr('content')
              if (metaUsername) {
                const urlMatch = metaUsername.match(/\/user\/([^\/\?]+)/)
                if (urlMatch) {
                  foundUsername = urlMatch[1]
                  console.log('✅ Username найден в meta-тегах:', foundUsername)
                }
              }
            }
            
            // Вариант 3: Из текста страницы (ищем паттерн username)
            if (!foundUsername) {
              const bodyText = $('body').text()
              const usernameMatch = bodyText.match(/u\/([a-zA-Z0-9_-]+)/) || 
                                   bodyText.match(/user\/([a-zA-Z0-9_-]+)/)
              if (usernameMatch) {
                foundUsername = usernameMatch[1]
                console.log('✅ Username найден в тексте страницы:', foundUsername)
              }
            }
            
            if (foundUsername) {
              extractedUsername = foundUsername
              username = extractedUsername
              redditUrl = `https://www.reddit.com/user/${extractedUsername}`
              email = ''
              password = ''
              console.log('✅ Username извлечен через парсинг HTML:', extractedUsername)
            } else {
              console.warn('⚠️ Не удалось извлечь username из HTML страницы')
              // Не бросаем ошибку, попробуем создать аккаунт с временным username
              username = `user_${Date.now()}`
              redditUrl = `https://www.reddit.com/user/${username}`
              console.log('⚠️ Создаем аккаунт с временным username:', username)
            }
          } catch (htmlError: any) {
            console.error('Ошибка парсинга HTML:', htmlError.message)
            // Не бросаем ошибку, создаем аккаунт с временным username
            username = `user_${Date.now()}`
            redditUrl = `https://www.reddit.com/user/${username}`
            console.log('⚠️ Создаем аккаунт с временным username из-за ошибки:', username)
          }
        }
      } catch (error: any) {
        console.error('═══════════════════════════════════════════════════════')
        console.error('❌ ОШИБКА ИЗВЛЕЧЕНИЯ ДАННЫХ ИЗ ТОКЕНА')
        console.error('═══════════════════════════════════════════════════════')
        console.error('Тип ошибки:', error?.constructor?.name)
        console.error('Сообщение:', error?.message)
        if (error.response) {
          console.error('Статус ответа:', error.response.status)
          console.error('Данные ответа:', JSON.stringify(error.response.data, null, 2))
        }
        console.error('═══════════════════════════════════════════════════════')
        
        // Если не удалось извлечь username, создаем аккаунт с временным
        if (!username || !redditUrl) {
          username = `user_${Date.now()}`
          redditUrl = `https://www.reddit.com/user/${username}`
          console.log('⚠️ Создаем аккаунт с временным username из-за ошибки извлечения:', username)
        }
      }
    }

    // Если username и redditUrl все еще не установлены, создаем временные
    if (!username || !redditUrl) {
      username = username || `user_${Date.now()}`
      redditUrl = redditUrl || `https://www.reddit.com/user/${username}`
      console.log('⚠️ Используем временный username:', username)
    }

    // Валидация URL Reddit
    if (!redditUrl.includes('reddit.com/user/') && !redditUrl.includes('reddit.com/u/')) {
      return NextResponse.json(
        { error: 'Неверный формат URL Reddit' },
        { status: 400 }
      )
    }

    // Используем предварительно спарсенные данные из расширения или парсим сами
    let stats = preParsedStats || null
    
    // Если есть токен, используем его для парсинга
    if (redditToken && !stats) {
      try {
        console.log('═══════════════════════════════════════════════════════')
        console.log('📥 НАЧИНАЕМ ПАРСИНГ ДАННЫХ REDDIT С ТОКЕНОМ')
        console.log('Username:', username)
        console.log('URL:', redditUrl)
        console.log('Есть токен:', !!redditToken)
        console.log('Длина токена:', redditToken.length)
        console.log('Первые 50 символов:', redditToken.substring(0, 50))
        console.log('Последние 50 символов:', redditToken.substring(Math.max(0, redditToken.length - 50)))
        console.log('═══════════════════════════════════════════════════════')
        
        // Очищаем токен перед использованием
        const cleanToken = redditToken.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
        console.log('Токен после очистки - длина:', cleanToken.length)
        
        // Проверяем, что username установлен (обязателен для запроса с токеном)
        if (!username || username.startsWith('user_')) {
          console.warn('⚠️ Username не установлен или временный, пытаемся извлечь из токена...')
          // Пробуем получить username через /api/me.json с токеном
          try {
            const meResponse = await axios.get('https://www.reddit.com/api/me.json', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': `reddit_session=${cleanToken}`,
                'Accept': 'application/json',
              },
              timeout: 10000,
              validateStatus: (status) => status < 500,
            })
            
            if (meResponse.data?.data?.name) {
              username = meResponse.data.data.name
              redditUrl = `https://www.reddit.com/user/${username}`
              console.log('✅ Username извлечен из токена через /api/me.json:', username)
            }
          } catch (meError: any) {
            console.warn('⚠️ Не удалось получить username из токена:', meError.message)
            if (meError.response?.status === 403 || meError.response?.status === 401) {
              throw new Error('Токен недействителен или истек. Убедитесь, что вы скопировали полный токен из расширения и что вы залогинены в Reddit.')
            }
          }
        }
        
        // Если username все еще не установлен, не можем использовать токен
        if (!username || username.startsWith('user_')) {
          throw new Error('Не удалось определить username для токена. Пожалуйста, укажите username вручную или используйте расширение для автоматического извлечения данных.')
        }
        
        stats = await getRedditStatsWithToken(redditUrl, username, cleanToken)
        console.log('✅ Данные успешно получены с токеном:', JSON.stringify(stats, null, 2))
        console.log('═══════════════════════════════════════════════════════')
      } catch (error: any) {
        console.error('❌ Ошибка парсинга с токеном:', error.message)
        console.error('   Статус:', error.response?.status)
        console.error('   Данные ответа:', error.response?.data)
        
        // Если ошибка доступа, пробрасываем её дальше с понятным сообщением
        if (error.message.includes('Доступ запрещен') || error.message.includes('недействителен') || error.response?.status === 403 || error.response?.status === 401) {
          throw error // Пробрасываем ошибку с её сообщением
        }
        
        // Пробуем без токена
        try {
          console.log('⚠️ Пробуем получить данные без токена (публичный API)...')
          stats = await getRedditStats(redditUrl, username)
          console.log('✅ Данные получены без токена')
        } catch (fallbackError: any) {
          console.error('⚠️ Ошибка парсинга без токена (продолжаем без статистики):', fallbackError.message)
        }
      }
    } else if (!stats) {
      // Парсим без токена
      try {
        console.log('═══════════════════════════════════════════════════════')
        console.log('📥 НАЧИНАЕМ ПАРСИНГ ДАННЫХ REDDIT БЕЗ ТОКЕНА')
        console.log('Username:', username)
        console.log('URL:', redditUrl)
        console.log('═══════════════════════════════════════════════════════')
        stats = await getRedditStats(redditUrl, username)
        console.log('✅ Данные успешно получены:', JSON.stringify(stats, null, 2))
        console.log('═══════════════════════════════════════════════════════')
      } catch (error: any) {
        console.error('⚠️ Ошибка парсинга Reddit (продолжаем без статистики):')
        console.error('Тип ошибки:', error?.constructor?.name)
        console.error('Сообщение:', error?.message)
        console.error('Стек:', error?.stack)
        // Продолжаем создание аккаунта даже если парсинг не удался
      }
    } else {
      console.log('✅ Используем предварительно спарсенные данные из расширения')
    }

    // Нормализуем URL
    const normalizedUrl = redditUrl.trim().replace(/\/$/, '').toLowerCase()
    const normalizedUsername = username?.trim().toLowerCase() || ''
    
    console.log('🔍 Проверка существующего аккаунта перед созданием...')
    console.log('   Исходный URL:', redditUrl)
    console.log('   Нормализованный URL:', normalizedUrl)
    console.log('   Username:', username)
    console.log('   Нормализованный username:', normalizedUsername)
    
    // Получаем все аккаунты пользователя для проверки
    const allUserAccounts = await prisma.redditAccount.findMany({
      where: { userId },
      select: { id: true, redditUrl: true, username: true },
    })
    
    console.log('   Всего аккаунтов у пользователя:', allUserAccounts.length)
    
    // Проверяем, существует ли уже аккаунт с таким URL или username (case-insensitive)
    const existingAccount = allUserAccounts.find(acc => {
      const accUrl = (acc.redditUrl || '').trim().replace(/\/$/, '').toLowerCase()
      const accUsername = (acc.username || '').trim().toLowerCase()
      
      return (
        accUrl === normalizedUrl ||
        accUrl.includes(normalizedUrl) ||
        normalizedUrl.includes(accUrl) ||
        (normalizedUsername && accUsername === normalizedUsername)
      )
    })
    
    // Если нашли, получаем полные данные аккаунта
    let existingAccountFull = null
    if (existingAccount) {
      existingAccountFull = await prisma.redditAccount.findUnique({
        where: { id: existingAccount.id },
      })
    }
    
    if (existingAccountFull) {
      console.log('✅ Найден существующий аккаунт, обновляем:', existingAccountFull.id)
      console.log('   Существующий URL:', existingAccountFull.redditUrl)
      console.log('   Существующий username:', existingAccountFull.username)
      
      // Обновляем существующий аккаунт
      const account = await prisma.redditAccount.update({
        where: { id: existingAccountFull.id },
        data: {
          username,
          redditUrl: normalizedUrl,
          email,
          password,
          redditToken: redditToken && redditToken.trim() ? redditToken.trim() : existingAccountFull.redditToken,
          comments: stats?.comments ?? existingAccountFull.comments,
          karma: stats?.karma ?? existingAccountFull.karma,
          accountAge: stats?.accountAge ?? existingAccountFull.accountAge,
          posts: stats?.posts ?? existingAccountFull.posts,
          subscribers: stats?.subscribers ?? existingAccountFull.subscribers,
          contributions: stats?.contributions ?? existingAccountFull.contributions,
          goldEarned: stats?.goldEarned ?? existingAccountFull.goldEarned,
          activeIn: stats?.activeIn ?? existingAccountFull.activeIn,
        },
      })
      
      console.log('✅ Аккаунт успешно обновлен:', account.id)
      
      return NextResponse.json(
        {
          id: account.id,
          username: account.username,
          redditUrl: account.redditUrl,
          email: account.email,
          password: account.password,
          stats: stats ? {
            comments: stats.comments,
            karma: stats.karma,
            accountAge: stats.accountAge,
            posts: stats.posts,
            subscribers: stats.subscribers,
            contributions: stats.contributions,
            goldEarned: stats.goldEarned,
            activeIn: stats.activeIn,
          } : null,
        },
        { status: 200, headers: corsHeaders }
      )
    }
    
    // Используем upsert для атомарной операции (создание или обновление)
    // Это предотвращает race condition при одновременных запросах
    console.log('🔄 Используем upsert для создания/обновления аккаунта...')
    
    let account;
    try {
      account = await prisma.redditAccount.upsert({
        where: {
          userId_redditUrl: {
            userId: userId,
            redditUrl: normalizedUrl,
          },
        },
        update: {
          username,
          email,
          password,
          redditToken: redditToken && redditToken.trim() ? redditToken.trim() : undefined,
          avatarUrl: stats?.avatarUrl,
          comments: stats?.comments,
          karma: stats?.karma,
          accountAge: stats?.accountAge,
          posts: stats?.posts,
          subscribers: stats?.subscribers,
          contributions: stats?.contributions,
          goldEarned: stats?.goldEarned,
          activeIn: stats?.activeIn,
          updatedAt: new Date(),
        },
        create: {
          userId,
          username,
          redditUrl: normalizedUrl,
          email,
          password,
          redditToken: redditToken && redditToken.trim() ? redditToken.trim() : null,
          avatarUrl: stats?.avatarUrl,
          comments: stats?.comments,
          karma: stats?.karma,
          accountAge: stats?.accountAge,
          posts: stats?.posts,
          subscribers: stats?.subscribers,
          contributions: stats?.contributions,
          goldEarned: stats?.goldEarned,
          activeIn: stats?.activeIn,
        },
      })
      console.log('✅ Аккаунт создан/обновлен через upsert:', account.id)
    } catch (error: any) {
      // Если upsert не сработал (старая схема БД), используем старый метод
      console.warn('⚠️ Upsert не сработал, используем старый метод:', error.message)
      
      // Находим аккаунт заново, так как existingAccountFull может быть null после предыдущей проверки
      const fallbackAccount = await prisma.redditAccount.findFirst({
        where: {
          userId: userId,
          OR: [
            { redditUrl: normalizedUrl },
            { username: normalizedUsername },
          ],
        },
      })
      
      if (fallbackAccount) {
        account = await prisma.redditAccount.update({
          where: { id: fallbackAccount.id },
          data: {
            username,
            redditUrl: normalizedUrl,
            email,
            password,
            redditToken: redditToken && redditToken.trim() ? redditToken.trim() : fallbackAccount.redditToken,
            avatarUrl: stats?.avatarUrl ?? fallbackAccount.avatarUrl,
            comments: stats?.comments ?? fallbackAccount.comments,
            karma: stats?.karma ?? fallbackAccount.karma,
            accountAge: stats?.accountAge ?? fallbackAccount.accountAge,
            posts: stats?.posts ?? fallbackAccount.posts,
            subscribers: stats?.subscribers ?? fallbackAccount.subscribers,
            contributions: stats?.contributions ?? fallbackAccount.contributions,
            goldEarned: stats?.goldEarned ?? fallbackAccount.goldEarned,
            activeIn: stats?.activeIn ?? fallbackAccount.activeIn,
          },
        })
        console.log('✅ Аккаунт обновлен:', account.id)
      } else {
        account = await prisma.redditAccount.create({
          data: {
            userId,
            username,
            redditUrl: normalizedUrl,
            email,
            password,
            redditToken: redditToken && redditToken.trim() ? redditToken.trim() : null,
            avatarUrl: stats?.avatarUrl,
            comments: stats?.comments,
            karma: stats?.karma,
            accountAge: stats?.accountAge,
            posts: stats?.posts,
            subscribers: stats?.subscribers,
            contributions: stats?.contributions,
            goldEarned: stats?.goldEarned,
            activeIn: stats?.activeIn,
          },
        })
        console.log('✅ Аккаунт создан:', account.id)
      }
    }

    return NextResponse.json(
      {
        id: account.id,
        username: account.username,
        redditUrl: account.redditUrl,
        email: account.email,
        password: account.password,
        stats: stats ? {
          comments: stats.comments,
          karma: stats.karma,
          accountAge: stats.accountAge,
          posts: stats.posts,
          subscribers: stats.subscribers,
          contributions: stats.contributions,
          goldEarned: stats.goldEarned,
          activeIn: stats.activeIn,
        } : null,
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА ДОБАВЛЕНИЯ АККАУНТА')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name)
    console.error('Сообщение:', error?.message)
    console.error('Код ошибки:', error?.code)
    if (error?.response) {
      console.error('Статус ответа:', error.response.status)
      console.error('Данные ответа:', JSON.stringify(error.response.data, null, 2))
    }
    if (error?.stack) {
      console.error('Стек ошибки:')
      console.error(error.stack)
    }
    console.error('═══════════════════════════════════════════════════════')
    
    // Возвращаем понятное сообщение об ошибке
    return NextResponse.json(
      { 
        error: error?.message || 'Ошибка добавления аккаунта',
        details: process.env.NODE_ENV === 'development' ? {
          type: error?.constructor?.name,
          code: error?.code,
          response: error?.response?.data
        } : undefined
      },
      { status: error?.response?.status || 500, headers: corsHeaders }
    )
  }
}

