import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { excelUrl } = await request.json()

    if (!excelUrl) {
      return NextResponse.json(
        { error: 'Ссылка на Excel файл обязательна' },
        { status: 400 }
      )
    }

    console.log('Тест: скачивание Excel файла:', excelUrl)

    // Скачиваем Excel файл
    const response = await axios.get(excelUrl, {
      responseType: 'arraybuffer',
    })

    console.log('Тест: файл скачан, размер:', response.data.byteLength)

    // Парсим Excel файл
    const workbook = XLSX.read(response.data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    console.log('Тест: имя листа:', sheetName)
    console.log('Тест: диапазон данных:', worksheet['!ref'])

    // Читаем первые несколько строк для теста
    const testData: any[] = []
    for (let rowIndex = 1; rowIndex <= 5; rowIndex++) {
      const cellA = XLSX.utils.encode_cell({ r: rowIndex, c: 0 })
      const cellB = XLSX.utils.encode_cell({ r: rowIndex, c: 1 })
      const cellC = XLSX.utils.encode_cell({ r: rowIndex, c: 2 })

      const login = worksheet[cellA] ? String(worksheet[cellA].v || '').trim() : ''
      const password = worksheet[cellB] ? String(worksheet[cellB].v || '').trim() : ''
      const redditUrl = worksheet[cellC] ? String(worksheet[cellC].v || '').trim() : ''

      if (login || password || redditUrl) {
        testData.push({
          row: rowIndex + 1,
          login,
          password: password ? '***' : '',
          redditUrl,
        })
      }
    }

    return NextResponse.json({
      success: true,
      sheetName,
      range: worksheet['!ref'],
      testData,
      message: 'Excel файл успешно прочитан',
    })
  } catch (error: any) {
    console.error('Тест: ошибка:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка чтения Excel файла',
        details: error.response ? `HTTP ${error.response.status}` : 'Неизвестная ошибка',
      },
      { status: 500 }
    )
  }
}











