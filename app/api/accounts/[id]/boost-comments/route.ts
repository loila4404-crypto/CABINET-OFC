import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import axios from 'axios'

interface BoostCommentsRequest {
  subreddit?: string // URL сабреддита (например, "r/aww")
  maxComments?: number // Максимальное количество комментариев
  delayBetweenComments?: number // Задержка между комментариями в мс
  commentText?: string // Текст комментария (если не указан, будет использован AI)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const body: BoostCommentsRequest = await request.json()

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

    console.log('🚀 Запуск накрутки комментариев...')
    console.log('   Username:', account.username)
    console.log('   Subreddit:', body.subreddit || 'не указан')
    console.log('   Max comments:', body.maxComments || 10)

    // Очищаем токен
    const cleanToken = account.redditToken.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
    
    // Определяем формат токена
    let cookieHeader: string
    if (cleanToken.includes(';') && cleanToken.includes('=')) {
      cookieHeader = cleanToken
    } else {
      cookieHeader = `reddit_session=${cleanToken}`
    }

    // Получаем список постов из указанного сабреддита
    const subreddit = body.subreddit?.replace(/^r\//, '') || 'all'
    const maxComments = body.maxComments || 10
    const delayBetweenComments = body.delayBetweenComments || 5000

    try {
      // Получаем список постов из сабреддита
      const postsUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
      
      const postsResponse = await axios.get(postsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': cookieHeader,
          'Accept': 'application/json',
        },
        timeout: 30000,
      })

      const posts = postsResponse.data?.data?.children || []
      
      if (posts.length === 0) {
        return NextResponse.json(
          { error: 'Не найдено постов в указанном сабреддите' },
          { status: 404 }
        )
      }

      console.log(`✅ Найдено постов: ${posts.length}`)

      // Выбираем случайные посты для комментирования
      const selectedPosts = posts
        .slice(0, Math.min(maxComments, posts.length))
        .map((post: any) => post.data)

      const results = []
      let successCount = 0
      let errorCount = 0

      // Комментируем каждый пост
      for (let i = 0; i < selectedPosts.length; i++) {
        const post = selectedPosts[i]
        
        try {
          // Генерируем текст комментария
          const commentText = body.commentText || generateDefaultComment(post.title)
          
          // Отправляем комментарий через Reddit API
          const commentUrl = `https://www.reddit.com/api/comment`
          
          const commentResponse = await axios.post(
            commentUrl,
            new URLSearchParams({
              thing_id: post.name, // ID поста (например, "t3_abc123")
              text: commentText,
              api_type: 'json',
            }),
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookieHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Referer': `https://www.reddit.com/r/${subreddit}`,
              },
              timeout: 30000,
            }
          )

          if (commentResponse.data?.json?.data?.things?.[0]?.data?.id) {
            successCount++
            results.push({
              postTitle: post.title.substring(0, 50),
              success: true,
              commentId: commentResponse.data.json.data.things[0].data.id,
            })
            console.log(`✅ Комментарий ${i + 1}/${selectedPosts.length} отправлен`)
          } else {
            errorCount++
            results.push({
              postTitle: post.title.substring(0, 50),
              success: false,
              error: 'Не удалось получить ID комментария',
            })
            console.warn(`⚠️ Комментарий ${i + 1}/${selectedPosts.length} не отправлен`)
          }

          // Задержка между комментариями
          if (i < selectedPosts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenComments))
          }
        } catch (error: any) {
          errorCount++
          const errorMessage = error.response?.data?.json?.errors?.[0]?.[0] || error.message || 'Неизвестная ошибка'
          results.push({
            postTitle: post.title.substring(0, 50),
            success: false,
            error: errorMessage,
          })
          console.error(`❌ Ошибка при отправке комментария ${i + 1}:`, errorMessage)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Накрутка завершена: ${successCount} успешно, ${errorCount} ошибок`,
        stats: {
          total: selectedPosts.length,
          success: successCount,
          errors: errorCount,
        },
        results,
      })
    } catch (error: any) {
      console.error('❌ Ошибка накрутки комментариев:', error)
      
      if (error.response) {
        const errorMessage = error.response.data?.json?.errors?.[0]?.[0] || 
                           error.response.data?.message ||
                           `Ошибка ${error.response.status}`
        
        return NextResponse.json(
          { error: errorMessage },
          { status: error.response.status || 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Ошибка при выполнении накрутки комментариев' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Ошибка запуска накрутки:', error)
    return NextResponse.json(
      { error: 'Ошибка запуска накрутки комментариев' },
      { status: 500 }
    )
  }
}

// Генерация дефолтного комментария
function generateDefaultComment(postTitle: string): string {
  const comments = [
    'Interesting!',
    'Thanks for sharing!',
    'Great post!',
    'This is helpful!',
    'Nice!',
    'Good point!',
    'I agree!',
    'Thanks!',
    'Cool!',
    'Awesome!',
  ]
  
  return comments[Math.floor(Math.random() * comments.length)]
}






