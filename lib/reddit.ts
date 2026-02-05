import axios from 'axios'
import * as cheerio from 'cheerio'

interface RedditStats {
  comments: number
  karma: number
  accountAge: number
  posts: number
  subscribers: number
  contributions: number
  goldEarned: number
  activeIn?: number // Количество активных сообществ (опционально, так как не всегда доступно из API)
  avatarUrl?: string // URL аватара (опционально)
}

export async function getRedditStats(
  redditUrl: string,
  username?: string
): Promise<RedditStats> {
  try {
    // Извлекаем username из URL или используем переданный
    let extractedUsername = username
    if (!extractedUsername) {
      const usernameMatch = redditUrl.match(/\/user\/([^\/\?]+)/)
      if (!usernameMatch) {
        throw new Error('Неверный формат URL Reddit')
      }
      extractedUsername = usernameMatch[1]
    }

    // Очищаем username от лишних символов
    extractedUsername = extractedUsername.trim().replace(/[^a-zA-Z0-9_-]/g, '')

    console.log('═══════════════════════════════════════════════════════')
    console.log('🔍 ПАРСИНГ ПРОФИЛЯ REDDIT')
    console.log('Username:', extractedUsername)
    console.log('URL:', redditUrl)
    console.log('═══════════════════════════════════════════════════════')

    // Получаем данные через Reddit API
    const apiUrl = `https://www.reddit.com/user/${extractedUsername}/about.json`
    console.log('📡 Запрос к Reddit API:', apiUrl)
    
    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 20000, // 20 секунд таймаут
      validateStatus: (status) => status < 500, // Принимаем статусы меньше 500
    })

    console.log('📥 Ответ от Reddit API получен')
    console.log('   Статус:', apiResponse.status)
    console.log('   Данные:', apiResponse.data ? '✓ Присутствуют' : '✗ Отсутствуют')

    if (apiResponse.status === 404) {
      throw new Error('Пользователь не найден')
    }

    if (apiResponse.status === 403 || apiResponse.status === 401) {
      throw new Error('Доступ запрещен. Возможно, профиль приватный')
    }

    const apiData = apiResponse.data?.data

    if (!apiData) {
      console.error('❌ Данные пользователя не найдены в ответе API')
      console.error('   Полный ответ:', JSON.stringify(apiResponse.data, null, 2))
      throw new Error('Не удалось получить данные пользователя')
    }

    console.log('✅ Данные пользователя получены из API:')
    console.log('   Username:', apiData.name)
    console.log('   Comment karma:', apiData.comment_karma)
    console.log('   Link karma:', apiData.link_karma)
    console.log('   Total karma:', apiData.total_karma)
    console.log('   Created:', new Date(apiData.created_utc * 1000).toISOString())

    // Вычисляем возраст аккаунта в днях
    const accountAge = Math.floor(
      (Date.now() / 1000 - apiData.created_utc) / (60 * 60 * 24)
    )

    // Парсим HTML страницу для получения дополнительных данных (followers, contributions, gold)
    let followers = 0
    let contributions = 0
    let goldEarned = 0

    try {
      console.log('🌐 Парсинг HTML страницы профиля...')
      const htmlResponse = await axios.get(
        `https://www.reddit.com/user/${extractedUsername}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 15000,
        }
      )

      if (htmlResponse.data) {
        const $ = cheerio.load(htmlResponse.data)
        
        // Ищем секцию "About" с данными профиля
        const aboutSection = $('section, div').filter((i, elem) => {
          const text = $(elem).text().toLowerCase()
          return text.includes('followers') || text.includes('karma') || text.includes('reddit age')
        }).first()

        if (aboutSection.length > 0) {
          const aboutText = aboutSection.text()
          console.log('📄 Найдена секция About, парсим данные...')
          
          // Парсим followers - ищем паттерн "X followers" или "X подписчиков"
          const followersPatterns = [
            /(\d+)\s*followers/i,
            /(\d+)\s*подписчиков/i,
            /followers[:\s]*(\d+)/i,
          ]
          for (const pattern of followersPatterns) {
            const match = aboutText.match(pattern)
            if (match) {
              followers = parseInt(match[1]) || 0
              console.log('   ✓ Followers найдено:', followers)
              break
            }
          }

          // Парсим contributions - ищем паттерн "X Contributions" или "X Вклады"
          const contributionsPatterns = [
            /(\d+)\s*contributions/i,
            /(\d+)\s*вклады/i,
            /contributions[:\s]*(\d+)/i,
          ]
          for (const pattern of contributionsPatterns) {
            const match = aboutText.match(pattern)
            if (match) {
              contributions = parseInt(match[1]) || 0
              console.log('   ✓ Contributions найдено:', contributions)
              break
            }
          }

          // Парсим gold earned - ищем паттерн "X Gold earned" или "X Золото заработано"
          const goldPatterns = [
            /(\d+)\s*gold\s*earned/i,
            /(\d+)\s*золото\s*заработано/i,
            /gold\s*earned[:\s]*(\d+)/i,
          ]
          for (const pattern of goldPatterns) {
            const match = aboutText.match(pattern)
            if (match) {
              goldEarned = parseInt(match[1]) || 0
              console.log('   ✓ Gold earned найдено:', goldEarned)
              break
            }
          }
        } else {
          // Альтернативный способ - парсим весь body текст
          const bodyText = $('body').text()
          
          const followersMatch = bodyText.match(/(\d+)\s*(followers|подписчиков)/i)
          if (followersMatch) {
            followers = parseInt(followersMatch[1]) || 0
            console.log('   ✓ Followers найдено (альтернативный способ):', followers)
          }

          const contributionsMatch = bodyText.match(/(\d+)\s*(contributions|вклады)/i)
          if (contributionsMatch) {
            contributions = parseInt(contributionsMatch[1]) || 0
            console.log('   ✓ Contributions найдено (альтернативный способ):', contributions)
          }

          const goldMatch = bodyText.match(/(\d+)\s*(gold earned|золото заработано)/i)
          if (goldMatch) {
            goldEarned = parseInt(goldMatch[1]) || 0
            console.log('   ✓ Gold earned найдено (альтернативный способ):', goldEarned)
          }
        }
      }
    } catch (htmlError: any) {
      console.warn('⚠️ Не удалось получить HTML данные, используем только API данные')
      console.warn('   Ошибка:', htmlError.message)
      // Продолжаем работу без HTML данных - основные данные уже есть из API
    }

    console.log('📊 Итоговые данные парсинга:')
    console.log('   Followers:', followers)
    console.log('   Contributions:', contributions)
    console.log('   Gold earned:', goldEarned)

    const result = {
      comments: apiData.comment_karma || 0,
      karma: apiData.total_karma || (apiData.link_karma || 0) + (apiData.comment_karma || 0),
      accountAge,
      posts: apiData.link_karma || 0,
      subscribers: followers || 0,
      contributions: contributions || 0,
      goldEarned: goldEarned || 0,
    }

    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ ПАРСИНГ ЗАВЕРШЕН УСПЕШНО')
    console.log('═══════════════════════════════════════════════════════')
    console.log('Итоговые данные:', JSON.stringify(result, null, 2))
    console.log('═══════════════════════════════════════════════════════')

    return result
  } catch (error: any) {
    console.error('Ошибка получения статистики Reddit:', error)
    
    if (error.response?.status === 404) {
      throw new Error('Пользователь не найден')
    }
    
    if (error.response?.status === 403) {
      throw new Error('Доступ запрещен. Возможно, профиль приватный')
    }

    throw new Error(
      error.message || 'Не удалось получить статистику Reddit'
    )
  }
}

// Функция для получения статистики Reddit с использованием токена (для live обновления)
export async function getRedditStatsWithToken(
  redditUrl: string,
  username: string,
  token: string
): Promise<RedditStats> {
  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🔄 ОБНОВЛЕНИЕ СТАТИСТИКИ С ТОКЕНОМ')
    console.log('Username:', username)
    console.log('URL:', redditUrl)
    console.log('═══════════════════════════════════════════════════════')

    // Используем Reddit API с токеном для получения актуальных данных
    // Токен Reddit обычно это session cookie, используем его в Cookie заголовке
    const apiUrl = `https://www.reddit.com/user/${username}/about.json`
    
    // Очищаем токен от пробелов и переносов строк
    const cleanToken = token.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '')
    
    console.log('🔑 Использование токена для запроса к Reddit API')
    console.log('   Username:', username)
    console.log('   API URL:', apiUrl)
    console.log('   Длина токена:', cleanToken.length)
    console.log('   Первые 50 символов:', cleanToken.substring(0, 50))
    console.log('   Последние 50 символов:', cleanToken.substring(Math.max(0, cleanToken.length - 50)))
    console.log('   Токен содержит точки:', cleanToken.includes('.'))
    
    // Проверяем, является ли токен строкой cookies (содержит несколько cookies через ;)
    // Или это только один токен reddit_session
    let cookieHeader: string
    console.log('🔍 Анализ токена для использования в запросах к Reddit API:')
    console.log('   Длина токена:', cleanToken.length)
    console.log('   Содержит ; (разделитель cookies):', cleanToken.includes(';'))
    console.log('   Содержит = (формат cookies):', cleanToken.includes('='))
    
    if (cleanToken.includes(';') && cleanToken.includes('=')) {
      // Это полная строка cookies (например, "reddit_session=xxx; csrf_token=yyy")
      cookieHeader = cleanToken
      const cookieCount = cleanToken.split(';').filter(c => c.trim().includes('=')).length
      console.log('✅ Используется полная строка cookies (несколько cookies)')
      console.log('   Количество cookies в строке:', cookieCount)
      console.log('   Содержит reddit_session:', cookieHeader.includes('reddit_session'))
      console.log('   Содержит csrf_token:', cookieHeader.includes('csrf_token'))
      console.log('   Первые 100 символов:', cookieHeader.substring(0, 100))
    } else {
      // Это только один токен, используем его как reddit_session
      cookieHeader = `reddit_session=${cleanToken}`
      console.log('✅ Используется только reddit_session cookie')
      console.log('   Длина токена:', cleanToken.length)
      console.log('   Первые 50 символов:', cleanToken.substring(0, 50))
      if (cleanToken.length < 50) {
        console.warn('⚠️ ВНИМАНИЕ: Токен очень короткий! Возможно, он обрезан.')
        console.warn('   Рекомендуется использовать полную строку cookies из расширения')
      }
    }
    
    let apiResponse
    try {
      // Важно: Reddit может проверять заголовки браузера для защиты от ботов
      // Используем полный набор заголовков, как в реальном браузере
      // ИСПОЛЬЗУЕМ ПОЛНУЮ СТРОКУ COOKIES для лучшей аутентификации
      apiResponse = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieHeader, // Используем полную строку cookies или только reddit_session
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `https://www.reddit.com/user/${username}`,
          'Origin': 'https://www.reddit.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'no-cache',
        },
        timeout: 15000,
        validateStatus: (status) => status < 500, // Принимаем статусы меньше 500 для анализа
        maxRedirects: 5,
      })
      
      console.log('📥 Ответ от Reddit API получен')
      console.log('   Статус:', apiResponse.status)
      console.log('   Есть данные:', !!apiResponse.data?.data)
      
      // Проверяем статус ответа
      if (apiResponse.status === 403 || apiResponse.status === 401) {
        console.error('❌ Доступ запрещен (403/401)')
        console.error('   Это может означать:')
        console.error('   1. Токен недействителен или истек')
        console.error('   2. Токен требует дополнительных cookies')
        console.error('   3. Reddit блокирует запросы с этого IP')
        console.error('   Данные ответа:', JSON.stringify(apiResponse.data, null, 2))
        throw new Error('Доступ запрещен. Возможно, токен недействителен или профиль приватный')
      }
      
      if (apiResponse.status === 404) {
        console.error('❌ Пользователь не найден (404)')
        throw new Error('Пользователь не найден')
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка при запросе к Reddit API с токеном')
      console.error('   Сообщение:', error.message)
      console.error('   Статус:', error.response?.status)
      console.error('   Данные ответа:', error.response?.data)
      
      // Если это ошибка доступа, пробрасываем её дальше с детальной информацией
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.error('═══════════════════════════════════════════════════════')
        console.error('❌ ДОСТУП ЗАПРЕЩЕН ПРИ ИСПОЛЬЗОВАНИИ ТОКЕНА')
        console.error('═══════════════════════════════════════════════════════')
        console.error('Возможные причины:')
        console.error('1. Токен недействителен или истек')
        console.error('2. Токен был скопирован не полностью (должен быть длинным)')
        console.error('3. Токен требует дополнительных cookies (например, csrf_token)')
        console.error('4. Reddit блокирует запросы с этого IP или User-Agent')
        console.error('5. Профиль Reddit приватный')
        console.error('6. Username указан неверно')
        console.error('═══════════════════════════════════════════════════════')
        console.error('Данные запроса:')
        console.error('   Username:', username)
        console.error('   URL:', apiUrl)
        console.error('   Длина токена:', cleanToken.length)
        console.error('═══════════════════════════════════════════════════════')
        
        throw new Error('Доступ запрещен. Возможно:\n' +
          '1. Токен недействителен или истек\n' +
          '2. Токен был скопирован не полностью (используйте кнопку "Копировать" рядом с токеном в расширении)\n' +
          '3. Профиль Reddit приватный\n' +
          '4. Username указан неверно\n\n' +
          'Попробуйте:\n' +
          '- Скопировать токен заново из расширения (используйте кнопку "Копировать")\n' +
          '- Убедиться, что вы залогинены в Reddit\n' +
          '- Проверить, что токен скопирован полностью (должен быть длинным, обычно >100 символов)')
      }
      
      // Для других ошибок пробуем без токена
      console.warn('⚠️ Не удалось получить данные с токеном, используем публичный API')
      return await getRedditStats(redditUrl, username)
    }

    const apiData = apiResponse.data?.data

    if (!apiData) {
      console.warn('⚠️ Данные не найдены в ответе API')
      console.warn('   Полный ответ:', JSON.stringify(apiResponse.data, null, 2))
      // Если не получилось с токеном, используем обычный метод
      console.warn('⚠️ Не удалось получить данные с токеном, используем публичный API')
      return await getRedditStats(redditUrl, username)
    }

    const accountAge = Math.floor(
      (Date.now() / 1000 - apiData.created_utc) / (60 * 60 * 24)
    )

    // Парсим HTML для дополнительных данных
    let followers = 0
    let contributions = 0
    let goldEarned = 0

    try {
      // Используем токен для удаленного входа в аккаунт Reddit (используем уже очищенный токен)
      const htmlResponse = await axios.get(
        `https://www.reddit.com/user/${username}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': `reddit_session=${cleanToken}`,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': `https://www.reddit.com/user/${username}`,
            'Origin': 'https://www.reddit.com',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        }
      )
      
      // Проверяем статус ответа
      if (htmlResponse.status === 403 || htmlResponse.status === 401) {
        console.warn('⚠️ Доступ запрещен при запросе HTML страницы')
        console.warn('   Статус:', htmlResponse.status)
        console.warn('   Это может означать, что токен недействителен для HTML запросов')
        // Не бросаем ошибку, просто пропускаем парсинг HTML (у нас уже есть данные из API)
      }

      if (htmlResponse.data) {
        const $ = cheerio.load(htmlResponse.data)
        const bodyText = $('body').text()

        const followersMatch = bodyText.match(/(\d+)\s*(followers|подписчиков)/i)
        if (followersMatch) {
          followers = parseInt(followersMatch[1]) || 0
        }

        const contributionsMatch = bodyText.match(/(\d+)\s*(contributions|вклады)/i)
        if (contributionsMatch) {
          contributions = parseInt(contributionsMatch[1]) || 0
        }

        const goldMatch = bodyText.match(/(\d+)\s*(gold earned|золото заработано)/i)
        if (goldMatch) {
          goldEarned = parseInt(goldMatch[1]) || 0
        }
      }
    } catch (htmlError: any) {
      console.warn('Не удалось получить HTML данные:', htmlError.message)
    }

    const result = {
      comments: apiData.comment_karma || 0,
      karma: apiData.total_karma || (apiData.link_karma || 0) + (apiData.comment_karma || 0),
      accountAge,
      posts: apiData.link_karma || 0,
      subscribers: followers || 0,
      contributions: contributions || 0,
      goldEarned: goldEarned || 0,
    }

    console.log('✅ Статистика обновлена:', result)
    console.log('═══════════════════════════════════════════════════════')

    return result
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ОШИБКА ОБНОВЛЕНИЯ СТАТИСТИКИ С ТОКЕНОМ')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Сообщение:', error.message)
    console.error('Статус:', error.response?.status)
    console.error('Данные ответа:', error.response?.data)
    
    // Если это ошибка доступа (403/401), пробрасываем её дальше
    if (error.response?.status === 403 || error.response?.status === 401) {
      console.error('❌ Доступ запрещен при использовании токена')
      console.error('   Возможные причины:')
      console.error('   1. Токен недействителен или истек')
      console.error('   2. Токен требует дополнительных cookies (например, csrf_token)')
      console.error('   3. Reddit блокирует запросы с этого IP или User-Agent')
      console.error('   4. Токен был скопирован не полностью')
      throw new Error('Доступ запрещен. Возможно, токен недействителен или профиль приватный')
    }
    
    // Для других ошибок используем обычный метод без токена
    console.warn('⚠️ Используем обычный метод без токена')
    return await getRedditStats(redditUrl, username)
  }
}



