'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AccountBoostPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redditUrl, setRedditUrl] = useState<string>('')
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (!accountId) return

    const loadAccount = async () => {
      try {
        setLoading(true)
        setError(null)

        const authToken = localStorage.getItem('token')
        if (!authToken) {
          router.push('/login')
          return
        }

        // Получаем данные аккаунта
        const response = await fetch(`/api/accounts/${accountId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Ошибка загрузки' }))
          throw new Error(errorData.error || `Ошибка ${response.status}`)
        }

        const account = await response.json()
        
        if (!account.redditToken) {
          throw new Error('Токен не найден для этого аккаунта')
        }

        if (!account.username) {
          throw new Error('Username не найден для этого аккаунта')
        }

        const url = account.redditUrl || `https://www.reddit.com/user/${account.username}`
        setRedditUrl(url)
        setToken(account.redditToken)
      } catch (err: any) {
        console.error('Ошибка загрузки аккаунта:', err)
        setError(err.message || 'Ошибка загрузки аккаунта')
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [accountId, router])

  useEffect(() => {
    if (!redditUrl || !token || loading) return

    // Загружаем скрипты расширения ADS REDDIT
    const loadExtensionScripts = async () => {
      try {
        // Загружаем content.js из расширения
        const contentScript = await fetch('/api/extension/ads-reddit/content.js')
        if (contentScript.ok) {
          const scriptText = await contentScript.text()
          // Инжектим скрипт в iframe после его загрузки
          console.log('Content script загружен')
        }
      } catch (err) {
        console.error('Ошибка загрузки скриптов расширения:', err)
      }
    }

    loadExtensionScripts()
  }, [redditUrl, token, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cursor-dark via-cursor-darker to-cursor-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cursor-primary mx-auto mb-4"></div>
          <p className="text-cursor-text">Загрузка профиля Reddit...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl max-w-md w-full text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-cursor-text mb-4">Ошибка загрузки</h2>
          <p className="text-cursor-text-muted mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
          >
            Вернуться в кабинет
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="glass border-b border-cursor-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-cursor-darker rounded-lg transition-colors"
              title="Вернуться в кабинет"
            >
              <svg className="w-6 h-6 text-cursor-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold gradient-text">Накрутка комментариев</h1>
          </div>
          <Link
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-cursor text-white rounded-lg font-semibold btn-cursor btn-3d text-sm"
          >
            Открыть в новой вкладке
          </Link>
        </div>
      </div>

      {/* Reddit iframe с расширением */}
      <div className="p-4">
        <div className="w-full mx-auto flex gap-4">
          <div 
            className="glass rounded-2xl overflow-hidden border border-cursor-border bg-white flex-1 flex flex-col items-center justify-center" 
            style={{ 
              height: 'calc(100vh - 120px)',
              position: 'relative',
              minHeight: '600px',
            }}
          >
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-cursor-text mb-2">Накрутка комментариев</h3>
              <p className="text-cursor-text-muted mb-6 max-w-md">
                Для работы расширения ADS REDDIT откройте профиль Reddit в новой вкладке браузера. 
                После открытия используйте расширение из панели справа для настройки и запуска накрутки.
              </p>
              {redditUrl && (
                <a
                  href={redditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold btn-cursor btn-3d hover:from-green-500 hover:to-emerald-500 transition-all hover:shadow-lg"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Открыть Reddit в новой вкладке
                  </span>
                </a>
              )}
              <div className="mt-6 p-4 bg-cursor-darker rounded-lg border border-cursor-border">
                <p className="text-sm text-cursor-text-muted">
                  <strong className="text-cursor-text">Инструкция:</strong>
                </p>
                <ol className="text-sm text-cursor-text-muted mt-2 space-y-1 list-decimal list-inside">
                  <li>Нажмите кнопку выше, чтобы открыть Reddit в новой вкладке</li>
                  <li>Убедитесь, что расширение ADS REDDIT установлено в Chrome</li>
                  <li>Вернитесь на эту страницу и настройте параметры в панели справа</li>
                  <li>Нажмите "Запустить" в панели расширения</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Инструкция по использованию расширения */}
          <div className="w-80 glass rounded-2xl p-4 border border-cursor-border">
            <h2 className="text-lg font-bold gradient-text mb-4">Инструкция</h2>
            <div className="space-y-3 text-sm text-cursor-text-muted">
              <div>
                <p className="font-semibold text-cursor-text mb-2">1. Установите расширение ADS REDDIT</p>
                <p>Откройте папку "ADS REDDIT" на рабочем столе и установите расширение в Chrome</p>
              </div>
              <div>
                <p className="font-semibold text-cursor-text mb-2">2. Откройте Reddit в новой вкладке</p>
                <p>Нажмите кнопку "Открыть в новой вкладке" выше</p>
              </div>
              <div>
                <p className="font-semibold text-cursor-text mb-2">3. Запустите расширение</p>
                <p>Нажмите на иконку расширения ADS REDDIT в панели браузера и нажмите "Запустить"</p>
              </div>
              <div className="pt-3 border-t border-cursor-border">
                <p className="font-semibold text-cursor-text mb-2">Функции расширения:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Автоматическое комментирование</li>
                  <li>Лайки постов</li>
                  <li>Вступление в сообщества</li>
                  <li>Генерация ответов через Ollama</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

