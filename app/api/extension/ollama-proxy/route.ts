import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ollamaUrl, model, prompt } = body

    if (type === 'checkOllama') {
      // Проверка доступности Ollama и получение списка моделей
      const cleanUrl = ollamaUrl.replace(/\/$/, '')
      const testUrl = `${cleanUrl}/api/tags`

      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            available: true,
            models: data.models || [],
          })
        } else {
          const errorText = await response.text()
          return NextResponse.json({
            success: false,
            available: false,
            models: [],
            error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
          })
        }
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          available: false,
          models: [],
          error: `Не удалось подключиться к ${cleanUrl}. Проверьте, что Ollama запущен: ollama serve`,
        })
      }
    } else if (type === 'generateReply') {
      // Генерация ответа через Ollama
      if (!model || !prompt) {
        return NextResponse.json({
          success: false,
          error: 'Модель и промпт обязательны',
        })
      }

      const cleanUrl = ollamaUrl.replace(/\/$/, '')
      const apiUrl = `${cleanUrl}/api/generate`

      try {
        const requestBody = {
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            num_predict: 100,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          },
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            success: true,
            reply: data.response?.trim() || '',
          })
        } else {
          const errorText = await response.text()
          return NextResponse.json({
            success: false,
            error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
          })
        }
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          error: `Ошибка подключения к Ollama: ${error.message}`,
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестный тип запроса',
    })
  } catch (error: any) {
    console.error('Ошибка проксирования запроса к Ollama:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка проксирования запроса',
      },
      { status: 500 }
    )
  }
}






