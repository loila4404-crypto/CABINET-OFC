'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AccountPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [redditUrl, setRedditUrl] = useState<string>('')
  const [showBoostPanel, setShowBoostPanel] = useState(false)
  const [boostSettings, setBoostSettings] = useState({
    ollamaUrl: 'http://127.0.0.1:11434',
    model: 'llama3.2',
    likePosts: true,
    replyToComments: true,
    joinCommunities: true,
    delayBetweenActions: 2000,
    maxRepliesPerPage: 10,
  })

  useEffect(() => {
    if (!accountId) return

    const loadPreview = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/accounts/${accountId}/preview`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Ошибка загрузки' }))
          throw new Error(errorData.error || `Ошибка ${response.status}`)
        }

        // Получаем username и URL из заголовков
        const username = response.headers.get('X-Reddit-Username') || ''
        const url = response.headers.get('X-Reddit-Url') || `https://www.reddit.com/user/${username}`
        setRedditUrl(url)

        let html = await response.text()
        
        // Добавляем стили для исправления CSS Grid в боковой панели
        // Делаем отображение кармы понятным и ровным
        const styleFix = `
          <style id="reddit-cabinet-grid-fix">
            /* Исправляем CSS Grid для боковой панели со статистикой */
            .grid.gap-y-lg.grid-cols-2 {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 1rem 0.75rem !important;
              width: 100% !important;
              box-sizing: border-box !important;
              align-items: start !important;
            }
            /* Убеждаемся, что дочерние элементы Grid не выходят за границы */
            .grid.gap-y-lg.grid-cols-2 > * {
              min-width: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              overflow: visible !important;
              word-wrap: break-word !important;
              box-sizing: border-box !important;
              padding: 0.75rem 0.5rem !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 0.5rem !important;
              align-items: flex-start !important;
            }
            /* Исправляем текст внутри элементов Grid - делаем его читаемым */
            .grid.gap-y-lg.grid-cols-2 span,
            .grid.gap-y-lg.grid-cols-2 div,
            .grid.gap-y-lg.grid-cols-2 p {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              max-width: 100% !important;
              line-height: 1.5 !important;
              display: block !important;
            }
            /* Улучшаем отображение кармы - разделяем значения построчно */
            .grid.gap-y-lg.grid-cols-2 [class*="karma"],
            .grid.gap-y-lg.grid-cols-2 [data-testid*="karma"] {
              display: flex !important;
              flex-direction: column !important;
              gap: 0.5rem !important;
              width: 100% !important;
            }
            /* Разделяем числа и текст - каждое значение на новой строке */
            .grid.gap-y-lg.grid-cols-2 > * > * {
              display: block !important;
              margin-bottom: 0.25rem !important;
            }
            /* Улучшаем отображение чисел кармы - делаем их более заметными */
            .grid.gap-y-lg.grid-cols-2 strong,
            .grid.gap-y-lg.grid-cols-2 [class*="font-bold"],
            .grid.gap-y-lg.grid-cols-2 [class*="font-semibold"],
            .grid.gap-y-lg.grid-cols-2 [class*="text-"] {
              display: block !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.6 !important;
            }
            /* Разделяем "post karma" и "comment karma" - каждое на отдельной строке */
            .grid.gap-y-lg.grid-cols-2 > * {
              white-space: pre-line !important;
            }
            /* Убеждаемся, что боковая панель имеет правильную ширину */
            aside[class*="sidebar"],
            div[class*="sidebar"],
            [class*="Sidebar"] {
              min-width: 0 !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              overflow-x: visible !important;
            }
            /* Исправляем контейнеры со статистикой */
            [class*="ProfileSidebar"],
            [class*="profile-sidebar"] {
              width: 100% !important;
              max-width: 100% !important;
            }
            /* Улучшаем отображение чисел - делаем их более читаемыми */
            .grid.gap-y-lg.grid-cols-2 strong,
            .grid.gap-y-lg.grid-cols-2 [class*="font-bold"],
            .grid.gap-y-lg.grid-cols-2 [class*="font-semibold"] {
              display: block !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.6 !important;
            }
            /* Форматируем текст кармы построчно - разделяем числа и текст */
            .grid.gap-y-lg.grid-cols-2 > * {
              white-space: pre-line !important;
            }
            /* Улучшаем читаемость - добавляем отступы между элементами */
            .grid.gap-y-lg.grid-cols-2 > * > *:not(:last-child) {
              margin-bottom: 0.5rem !important;
            }
            /* Делаем числа более заметными */
            .grid.gap-y-lg.grid-cols-2 [class*="text-"]:first-child {
              font-size: 1.1em !important;
              font-weight: 600 !important;
            }
          </style>
        `
        
        // Вставляем стили в head документа
        if (html.includes('</head>')) {
          html = html.replace('</head>', styleFix + '</head>')
        } else if (html.includes('<head>')) {
          html = html.replace('<head>', '<head>' + styleFix)
        } else if (html.includes('<html')) {
          html = html.replace('<html', '<html><head>' + styleFix + '</head>')
        }
        
        setHtmlContent(html)
      } catch (err: any) {
        console.error('Ошибка загрузки предпросмотра:', err)
        setError(err.message || 'Ошибка загрузки предпросмотра')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [accountId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
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
            <h1 className="text-xl font-bold gradient-text">Предпросмотр профиля Reddit</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/account/${accountId}/boost`}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold btn-cursor btn-3d text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Накрутка комментариев
              </span>
            </Link>
            {redditUrl && (
              <Link
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-cursor text-white rounded-lg font-semibold btn-cursor btn-3d text-sm"
              >
                Открыть в новой вкладке
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Preview iframe */}
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
            {htmlContent ? (
              <iframe
                id="reddit-preview-iframe"
                srcDoc={htmlContent}
                title="Reddit Profile Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-styles"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  margin: 0,
                  padding: 0,
                  overflow: 'auto',
                }}
                scrolling="yes"
                allowFullScreen
              />
            ) : (
              <div className="text-center p-8 w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cursor-primary mx-auto mb-4"></div>
                <p className="text-cursor-text">Загрузка профиля Reddit...</p>
              </div>
            )}
          </div>

          {/* Панель управления накруткой ADS REDDIT */}
          <div className={`glass rounded-2xl border border-cursor-border transition-all duration-300 ${showBoostPanel ? 'w-96' : 'w-12'} overflow-hidden relative`}>
            {showBoostPanel ? (
              <>
                <button
                  onClick={() => setShowBoostPanel(false)}
                  className="absolute top-2 right-2 z-10 p-1 text-cursor-text-muted hover:text-cursor-text hover:bg-cursor-darker rounded transition-colors"
                  title="Скрыть панель"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="h-full overflow-y-auto">
                  <iframe
                    src="/extension/ads-reddit/sidepanel.html"
                    className="w-full h-full border-0"
                    style={{ minHeight: '600px' }}
                    title="Reddit Auto Bot"
                  />
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowBoostPanel(true)}
                className="w-full h-full flex items-center justify-center text-cursor-text hover:text-cursor-primary transition-colors p-2"
                title="Показать панель накрутки ADS REDDIT"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

