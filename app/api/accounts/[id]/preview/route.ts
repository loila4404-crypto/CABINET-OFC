import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import axios from 'axios'

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

    // Получаем аккаунт с токеном
    const account = await prisma.redditAccount.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        username: true,
        redditUrl: true,
        redditToken: true,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден' },
        { status: 404 }
      )
    }

    if (!account.redditToken) {
      return NextResponse.json(
        { error: 'Токен не найден для этого аккаунта' },
        { status: 400 }
      )
    }

    if (!account.username) {
      return NextResponse.json(
        { error: 'Username не найден для этого аккаунта' },
        { status: 400 }
      )
    }

    console.log('🔍 Загрузка предпросмотра профиля Reddit...')
    console.log('   Username:', account.username)
    console.log('   URL:', account.redditUrl)

    // Очищаем токен
    const cleanToken = account.redditToken.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
    
    // Определяем формат токена (полная строка cookies или только reddit_session)
    let cookieHeader: string
    if (cleanToken.includes(';') && cleanToken.includes('=')) {
      cookieHeader = cleanToken
      console.log('✅ Используется полная строка cookies')
    } else {
      cookieHeader = `reddit_session=${cleanToken}`
      console.log('✅ Используется только reddit_session cookie')
    }

    // Загружаем HTML страницу Reddit профиля с токеном
    const redditUrl = `https://www.reddit.com/user/${account.username}`
    
    try {
      const htmlResponse = await axios.get(redditUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieHeader,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': redditUrl,
          'Origin': 'https://www.reddit.com',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'max-age=0',
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      })

      if (htmlResponse.status === 200) {
        console.log('✅ HTML страница успешно загружена')
        
        // Возвращаем HTML страницу с дополнительными заголовками
        const responseHeaders = new Headers({
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Reddit-Username': account.username || '',
          'X-Reddit-Url': account.redditUrl,
        })
        
        return new NextResponse(htmlResponse.data, {
          status: 200,
          headers: responseHeaders,
        })
      } else {
        console.warn('⚠️ Неожиданный статус ответа:', htmlResponse.status)
        return NextResponse.json(
          { error: `Не удалось загрузить страницу (статус: ${htmlResponse.status})` },
          { status: htmlResponse.status }
        )
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки HTML страницы Reddit:', error)
      
      if (error.response) {
        console.error('   Статус:', error.response.status)
        console.error('   Данные:', error.response.data?.substring?.(0, 200))
        
        if (error.response.status === 401 || error.response.status === 403) {
          return NextResponse.json(
            { error: 'Доступ запрещен. Токен может быть недействителен или истек.' },
            { status: 403 }
          )
        }
      }
      
      return NextResponse.json(
        { error: 'Ошибка загрузки страницы Reddit' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Ошибка получения предпросмотра:', error)
    return NextResponse.json(
      { error: 'Ошибка получения предпросмотра' },
      { status: 500 }
    )
  }
}
