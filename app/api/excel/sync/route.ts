import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromRequest } from '@/lib/auth'
import axios from 'axios'
import * as XLSX from 'xlsx'

interface ExcelRow {
  [key: string]: any
}

export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════════════════════')
  console.log('📥 ПОЛУЧЕН ЗАПРОС НА СИНХРОНИЗАЦИЮ EXCEL')
  console.log('Время:', new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════')
  
  try {
    const userId = getUserIdFromRequest(request)
    console.log('1️⃣ Проверка авторизации...', userId ? `✓ User ID: ${userId}` : '✗ Не авторизован')

    if (!userId) {
      console.error('❌ ОШИБКА: Пользователь не авторизован')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    console.log('2️⃣ Тело запроса получено:', { excelUrl: body.excelUrl ? '✓ Есть' : '✗ Нет' })
    
    const { excelUrl } = body

    if (!excelUrl) {
      console.error('❌ ОШИБКА: Ссылка на Excel файл не предоставлена')
      return NextResponse.json(
        { error: 'Ссылка на Excel файл обязательна' },
        { status: 400 }
      )
    }

    console.log('3️⃣ Начало синхронизации Excel')
    console.log('   Пользователь ID:', userId)
    console.log('   URL Excel файла:', excelUrl)

    let excelData: ArrayBuffer | undefined

    // Проверяем, это Google Sheets или прямой файл Excel
    if (excelUrl.includes('docs.google.com/spreadsheets')) {
      console.log('Обнаружен Google Sheets, конвертируем в Excel формат...')
      
      // Конвертируем Google Sheets ссылку в формат экспорта Excel
      // Формат: https://docs.google.com/spreadsheets/d/{ID}/export?format=xlsx&gid={GID}
      const sheetIdMatch = excelUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!sheetIdMatch) {
        return NextResponse.json(
          { error: 'Неверный формат ссылки Google Sheets. Используйте ссылку вида: https://docs.google.com/spreadsheets/d/ID' },
          { status: 400 }
        )
      }
      
      const sheetId = sheetIdMatch[1]
      
      // Извлекаем gid из ссылки или используем 0 для первого листа
      let gid = '0'
      const gidMatch = excelUrl.match(/[#&]gid=(\d+)/)
      if (gidMatch) {
        gid = gidMatch[1]
      }
      
      // Пробуем разные варианты экспорта Google Sheets
      const exportUrls = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=0`,
      ]
      
      let exportSuccess = false
      let lastError: any = null
      
      for (const exportUrl of exportUrls) {
        try {
          console.log('Попытка экспорта по URL:', exportUrl)
          
          const response = await axios.get(exportUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
            maxRedirects: 5,
            timeout: 30000, // 30 секунд таймаут
          })
          
          // Проверяем, что это действительно Excel файл, а не HTML страница ошибки
          const contentType = response.headers['content-type'] || ''
          const dataSize = response.data.byteLength
          
          console.log('Ответ получен:', {
            contentType,
            dataSize,
            status: response.status,
          })
          
          // Если получили HTML вместо Excel, это ошибка
          if (contentType.includes('text/html') || dataSize < 100) {
            throw new Error(`Получен HTML вместо Excel файла (размер: ${dataSize} байт). Таблица может быть недоступна для публичного экспорта.`)
          }
          
          excelData = response.data
          console.log('✓ Google Sheets экспортирован успешно, размер:', excelData!.byteLength)
          exportSuccess = true
          break
        } catch (exportError: any) {
          console.error(`Ошибка экспорта по URL ${exportUrl}:`, exportError.message)
          lastError = exportError
          continue
        }
      }
      
      if (!exportSuccess) {
        console.error('Все попытки экспорта Google Sheets провалились')
        return NextResponse.json(
          { 
            error: `Не удалось экспортировать Google Sheets. Убедитесь, что таблица доступна для всех.`,
            details: lastError?.message || 'Неизвестная ошибка',
            hint: 'Для Google Sheets:\n1. Откройте таблицу\n2. Нажмите "Настройки доступа" (справа вверху)\n3. Выберите "Изменить на: Все, у кого есть ссылка"\n4. Скопируйте ссылку и используйте её'
          },
          { status: 400 }
        )
      }
    } else {
      // Прямой файл Excel
      console.log('Скачиваем прямой Excel файл...')
      const response = await axios.get(excelUrl, {
        responseType: 'arraybuffer',
      })
      
      excelData = response.data
      console.log('Excel файл скачан, размер:', excelData!.byteLength)
    }

    // Проверяем, что данные были получены
    if (!excelData) {
      console.error('❌ ОШИБКА: Данные Excel не были получены')
      return NextResponse.json(
        { error: 'Не удалось получить данные Excel файла' },
        { status: 400 }
      )
    }

    // Парсим Excel файл
    const workbook = XLSX.read(excelData, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    console.log('Имя листа:', sheetName)
    
    const worksheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
    console.log('Диапазон данных:', worksheet['!ref'])
    console.log('Количество строк в файле:', range.e.r + 1)
    
    // Показываем первые несколько ячеек для отладки
    console.log('=== ПРОВЕРКА ПЕРВЫХ ЯЧЕЕК ===')
    console.log('Диапазон файла:', worksheet['!ref'])
    console.log('Всего строк:', range.e.r + 1)
    console.log('Всего колонок:', range.e.c + 1)
    
    for (let testRow = 0; testRow <= 10; testRow++) {
      const testA = XLSX.utils.encode_cell({ r: testRow, c: 0 })
      const testB = XLSX.utils.encode_cell({ r: testRow, c: 1 })
      const testC = XLSX.utils.encode_cell({ r: testRow, c: 2 })
      const valA = worksheet[testA] ? String(worksheet[testA].v || '').trim() : '(пусто)'
      const valB = worksheet[testB] ? String(worksheet[testB].v || '').trim() : '(пусто)'
      const valC = worksheet[testC] ? String(worksheet[testC].v || '').trim() : '(пусто)'
      
      if (valA !== '(пусто)' || valB !== '(пусто)' || valC !== '(пусто)') {
        console.log(`Строка ${testRow + 1}: A="${valA}", B="${valB}", C="${valC}"`)
      }
    }

    // Читаем данные из конкретных ячеек: A2:C100
    // Структура: A - Логин, B - Пароль, C - Ссылка
    // Дополнительные данные: D - День, E - Карма, F - Посты, G - Просмотры
    
    // Обрабатываем данные со строки 2 до строки 100 (индексы начинаются с 0, строка 2 = индекс 1)
    let added = 0
    let updated = 0
    let errors: string[] = []
    let processedRows = 0

    // Обрабатываем строки от 2 до 100 (индексы 1-99)
    // Строка 2 = индекс 1 (rowIndex начинается с 0, строка 2 = индекс 1)
    // Но также проверяем, что файл содержит достаточно строк
    const maxRowInFile = range.e.r // Последняя строка в файле (индекс начинается с 0)
    const maxRowToProcess = Math.min(99, maxRowInFile) // Не больше, чем есть в файле, но не больше 99
    
    console.log(`Файл содержит строк: ${maxRowInFile + 1}`)
    console.log(`Обработка строк от 2 до ${maxRowToProcess + 1} (индексы 1-${maxRowToProcess})`)
    
    // Если файл пустой или содержит только заголовок
    if (maxRowInFile < 1) {
      console.error('Файл содержит меньше 2 строк (только заголовок или пустой)')
      return NextResponse.json(
        { 
          error: `Файл содержит только ${maxRowInFile + 1} строку(и). Данные должны начинаться со строки 2.`,
          processedRows: 0,
          debug: {
            sheetRange: worksheet['!ref'],
            totalRows: maxRowInFile + 1,
          }
        },
        { status: 400 }
      )
    }
    
    for (let rowIndex = 1; rowIndex <= maxRowToProcess; rowIndex++) {
      try {
        // Получаем значения из ячеек
        // rowIndex 1 = строка 2 в Excel (A2, B2, C2)
        const cellA = XLSX.utils.encode_cell({ r: rowIndex, c: 0 }) // Колонка A (логин) - A2, A3, A4...
        const cellB = XLSX.utils.encode_cell({ r: rowIndex, c: 1 }) // Колонка B (пароль) - B2, B3, B4...
        const cellC = XLSX.utils.encode_cell({ r: rowIndex, c: 2 }) // Колонка C (ссылка) - C2, C3, C4...
        const cellD = XLSX.utils.encode_cell({ r: rowIndex, c: 3 }) // Колонка D (день)
        const cellE = XLSX.utils.encode_cell({ r: rowIndex, c: 4 }) // Колонка E (карма)
        const cellF = XLSX.utils.encode_cell({ r: rowIndex, c: 5 }) // Колонка F (посты)
        const cellG = XLSX.utils.encode_cell({ r: rowIndex, c: 6 }) // Колонка G (просмотры)

        // Читаем значения из ячеек
        const cellAValue = worksheet[cellA]
        const cellBValue = worksheet[cellB]
        const cellCValue = worksheet[cellC]
        
        const login = cellAValue ? String(cellAValue.v || '').trim() : ''
        const password = cellBValue ? String(cellBValue.v || '').trim() : ''
        const redditUrl = cellCValue ? String(cellCValue.v || '').trim() : ''
        
        // Парсим числовые значения, проверяя на NaN
        const accountAgeRaw = worksheet[cellD] ? worksheet[cellD].v : null
        const karmaRaw = worksheet[cellE] ? worksheet[cellE].v : null
        const postsRaw = worksheet[cellF] ? worksheet[cellF].v : null
        const subscribersRaw = worksheet[cellG] ? worksheet[cellG].v : null
        
        const accountAge = accountAgeRaw !== null && accountAgeRaw !== undefined && !isNaN(Number(accountAgeRaw)) ? Number(accountAgeRaw) : null
        const karma = karmaRaw !== null && karmaRaw !== undefined && !isNaN(Number(karmaRaw)) ? Number(karmaRaw) : null
        const posts = postsRaw !== null && postsRaw !== undefined && !isNaN(Number(postsRaw)) ? Number(postsRaw) : null
        const subscribers = subscribersRaw !== null && subscribersRaw !== undefined && !isNaN(Number(subscribersRaw)) ? Number(subscribersRaw) : null

        // Логируем первые несколько строк для отладки
        if (rowIndex <= 5) {
          console.log(`=== ПРОВЕРКА СТРОКИ ${rowIndex + 1} ===`)
          console.log(`Ячейки Excel: ${cellA} (A), ${cellB} (B), ${cellC} (C)`)
          console.log(`Сырые значения:`, {
            cellA: cellAValue ? cellAValue.v : '(нет ячейки)',
            cellB: cellBValue ? cellBValue.v : '(нет ячейки)',
            cellC: cellCValue ? cellCValue.v : '(нет ячейки)',
          })
          console.log(`Обработанные значения:`, {
            login: login || '(пусто)',
            password: password ? '***' : '(пусто)',
            redditUrl: redditUrl || '(пусто)',
            accountAge,
            karma,
            posts,
            subscribers,
          })
        }

        // Пропускаем пустые строки
        if (!login && !password && !redditUrl) {
          if (rowIndex <= 5) {
            console.log(`Строка ${rowIndex + 1} пропущена (пустая)`)
          }
          continue
        }

        // Увеличиваем счетчик только для непустых строк
        processedRows++
        console.log(`=== ОБРАБОТКА СТРОКИ ${rowIndex + 1} ===`)
        console.log(`Логин: "${login}", Пароль: ${password ? '***' : '(пусто)'}, Ссылка: "${redditUrl}"`)

        // Проверяем обязательные поля
        if (!redditUrl || !login || !password) {
          const missing = []
          if (!redditUrl) missing.push('ссылка (C)')
          if (!login) missing.push('логин (A)')
          if (!password) missing.push('пароль (B)')
          const errorMsg = `Строка ${rowIndex + 1}: отсутствуют обязательные данные (${missing.join(', ')})`
          errors.push(errorMsg)
          console.log(`ОШИБКА: ${errorMsg}`)
          continue
        }

        // Проверяем формат URL Reddit
        let normalizedUrl = redditUrl
        if (!normalizedUrl.includes('reddit.com/user/') && !normalizedUrl.includes('reddit.com/u/')) {
          // Если это не полный URL, пытаемся создать его из логина
          if (normalizedUrl && !normalizedUrl.startsWith('http')) {
            normalizedUrl = `https://www.reddit.com/user/${normalizedUrl}`
          } else {
            errors.push(`Строка ${rowIndex + 1}: неверный формат URL: ${redditUrl}`)
            continue
          }
        }

        // Нормализуем URL
        if (!normalizedUrl.startsWith('http')) {
          normalizedUrl = `https://${normalizedUrl}`
        }

        // Проверяем, не существует ли уже такой аккаунт
        const existing = await prisma.redditAccount.findFirst({
          where: {
            userId,
            redditUrl: normalizedUrl,
          },
        })

        if (existing) {
          // Обновляем существующий аккаунт
          const updateData: any = {
            email: login, // Используем логин как email
            password,
          }
          
          // Добавляем статистику только если она есть
          if (accountAge !== null) updateData.accountAge = accountAge
          if (karma !== null) updateData.karma = karma
          if (posts !== null) updateData.posts = posts
          if (subscribers !== null) updateData.subscribers = subscribers
          
          const updatedAccount = await prisma.redditAccount.update({
            where: { id: existing.id },
            data: updateData,
          })
          updated++
          console.log(`✓ Обновлен аккаунт: ${normalizedUrl} (ID: ${updatedAccount.id})`)
        } else {
          // Создаем новый аккаунт
          const createData: any = {
            userId,
            redditUrl: normalizedUrl,
            email: login, // Используем логин как email
            password,
          }
          
          // Добавляем статистику только если она есть
          if (accountAge !== null) createData.accountAge = accountAge
          if (karma !== null) createData.karma = karma
          if (posts !== null) createData.posts = posts
          if (subscribers !== null) createData.subscribers = subscribers
          
          const newAccount = await prisma.redditAccount.create({
            data: createData,
          })
          added++
          console.log(`✓ Добавлен аккаунт: ${normalizedUrl} (ID: ${newAccount.id}, Email: ${login})`)
        }
      } catch (err: any) {
        errors.push(`Строка ${rowIndex + 1}: ошибка обработки - ${err.message}`)
      }
    }

    console.log(`=== ИТОГИ СИНХРОНИЗАЦИИ ===`)
    console.log(`Обработано строк: ${processedRows}`)
    console.log(`Добавлено аккаунтов: ${added}`)
    console.log(`Обновлено аккаунтов: ${updated}`)
    console.log(`Ошибок: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('Первые 10 ошибок:', errors.slice(0, 10))
    }

    // Проверяем, что данные действительно были сохранены
    const savedAccounts = await prisma.redditAccount.findMany({
      where: { userId },
      select: { id: true, redditUrl: true, email: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    console.log(`Последние 10 аккаунтов в базе:`, savedAccounts.map(a => ({ url: a.redditUrl, email: a.email })))

    if (added === 0 && updated === 0) {
      if (processedRows === 0) {
        console.log('ОШИБКА: не найдено данных в указанном диапазоне')
        return NextResponse.json(
          { 
            error: `Не найдено данных в указанном диапазоне (A2:C100). Проверьте, что данные начинаются со строки 2.`,
            processedRows: 0,
            debug: {
              sheetRange: worksheet['!ref'],
              totalRows: range.e.r + 1,
            }
          },
          { status: 400 }
        )
      } else {
        console.log('ОШИБКА: данные найдены, но не обработаны')
        return NextResponse.json(
          { 
            error: `Не удалось обработать данные. Ошибок: ${errors.length}`,
            errors: errors.slice(0, 10),
            processedRows,
            added: 0,
            updated: 0,
          },
          { status: 400 }
        )
      }
    }

    // Финальная проверка - убеждаемся, что данные действительно сохранены
    const finalCheck = await prisma.redditAccount.findMany({
      where: { userId },
      select: { id: true, redditUrl: true, email: true },
    })
    
    console.log(`Финальная проверка: всего аккаунтов в базе для пользователя: ${finalCheck.length}`)
    
    const result = {
      added,
      updated,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      totalProcessed: added + updated,
      processedRows,
      savedAccountsCount: finalCheck.length,
      success: true,
    }

    console.log('Результат синхронизации:', JSON.stringify(result, null, 2))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА СИНХРОНИЗАЦИИ')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Тип ошибки:', error?.constructor?.name || 'Unknown')
    console.error('Сообщение:', error?.message || 'Нет сообщения')
    console.error('Стек:', error?.stack || 'Нет стека')
    
    if (error.response) {
      console.error('HTTP Ответ:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      })
      return NextResponse.json(
        { 
          error: 'Не удалось загрузить Excel файл по указанной ссылке',
          details: error.response.status ? `HTTP ${error.response.status}` : undefined
        },
        { status: 400 }
      )
    }

    console.error('═══════════════════════════════════════════════════════')
    return NextResponse.json(
      { error: error.message || 'Ошибка синхронизации с Excel' },
      { status: 500 }
    )
  }
}

