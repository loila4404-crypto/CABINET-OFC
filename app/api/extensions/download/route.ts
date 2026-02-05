import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const extensionType = searchParams.get('type') // 'token' или 'ads'

    if (extensionType === 'token') {
      // Скачивание расширения для токена
      const extensionPath = join(process.cwd(), 'extension')
      const files = ['manifest.json', 'popup.html', 'popup.js', 'content.js']
      
      // Создаем простой текст с инструкцией и содержимым файлов
      let zipContent = `# Reddit Cabinet - Расширение для извлечения токена\n\n`
      zipContent += `## Инструкция по установке:\n\n`
      zipContent += `1. Распакуйте все файлы в одну папку\n`
      zipContent += `2. Откройте Chrome/Edge: chrome://extensions/ или edge://extensions/\n`
      zipContent += `3. Включите "Режим разработчика"\n`
      zipContent += `4. Нажмите "Загрузить распакованное расширение"\n`
      zipContent += `5. Выберите папку с файлами расширения\n\n`
      zipContent += `## Файлы расширения:\n\n`

      // Читаем файлы расширения
      for (const file of files) {
        const filePath = join(extensionPath, file)
        try {
          const content = readFileSync(filePath, 'utf-8')
          zipContent += `\n### ${file}\n\`\`\`\n${content}\n\`\`\`\n\n`
        } catch (e) {
          console.error(`Ошибка чтения файла ${file}:`, e)
        }
      }

      return new NextResponse(zipContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="reddit-cabinet-extension-install.txt"',
        },
      })
    } else if (extensionType === 'ads') {
      // Инструкция для расширения ADS REDDIT
      const instruction = `# Reddit ADS - Расширение для накрутки лайков и комментариев\n\n`
      + `## Инструкция по установке:\n\n`
      + `1. Найдите папку "ADS REDDIT" или "REDDIT-ADS" на вашем рабочем столе\n`
      + `2. Откройте Chrome/Edge: chrome://extensions/ или edge://extensions/\n`
      + `3. Включите "Режим разработчика"\n`
      + `4. Нажмите "Загрузить распакованное расширение"\n`
      + `5. Выберите папку "ADS REDDIT"\n\n`
      + `## Использование:\n\n`
      + `1. Откройте любой пост или комментарий на Reddit\n`
      + `2. Нажмите на иконку расширения в панели инструментов\n`
      + `3. Настройте параметры накрутки\n`
      + `4. Запустите накрутку\n\n`
      + `Примечание: Убедитесь, что у вас установлен и запущен Ollama для генерации комментариев.`

      return new NextResponse(instruction, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="reddit-ads-extension-install.txt"',
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Неверный тип расширения. Используйте type=token или type=ads' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Ошибка скачивания расширения:', error)
    return NextResponse.json(
      { error: 'Ошибка при подготовке файлов расширения' },
      { status: 500 }
    )
  }
}






