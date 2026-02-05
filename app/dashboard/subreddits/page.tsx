'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Subreddit {
  id: string
  name: string
  url: string
  postingRules: string | null
  tabId: string | null
  tab?: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

interface SubredditTab {
  id: string
  name: string
  order: number
  subreddits: Subreddit[]
}

export default function SubredditsPage(): JSX.Element {
  const router = useRouter()
  const [tabs, setTabs] = useState<SubredditTab[]>([])
  const [allSubreddits, setAllSubreddits] = useState<Subreddit[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null) // null = "Все"
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddTabForm, setShowAddTabForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    postingRules: '',
    tabId: '',
  })
  const [tabFormData, setTabFormData] = useState({
    name: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const loadingRef = useRef(false)

  useEffect(() => {
    checkAuth()
    if (!loadingRef.current) {
      loadData()
    }
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  const loadData = async () => {
    if (loadingRef.current) {
      return
    }
    
    try {
      loadingRef.current = true
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setTimeout(() => router.push('/login'), 100)
        return
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      // Загружаем вкладки и сабреддиты параллельно
      const [tabsResponse, subredditsResponse] = await Promise.all([
        fetch('/api/subreddit-tabs', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
        fetch('/api/subreddits', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
      ])
      
      clearTimeout(timeoutId)

      if (tabsResponse.status === 401 || subredditsResponse.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      if (!tabsResponse.ok || !subredditsResponse.ok) {
        throw new Error('Ошибка загрузки данных')
      }

      const tabsData = await tabsResponse.json()
      const subredditsData = await subredditsResponse.json()
      
      setTabs(tabsData)
      setAllSubreddits(subredditsData)
      setError('')
    } catch (err: any) {
      console.error('Ошибка загрузки данных:', err)
      if (err.name !== 'AbortError') {
        setError('Не удалось загрузить данные. Попробуйте обновить страницу.')
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  // Получаем сабреддиты для активной вкладки
  const getSubredditsForActiveTab = (): Subreddit[] => {
    if (activeTabId === null) {
      // Показываем все сабреддиты без вкладки
      return allSubreddits.filter(s => !s.tabId)
    }
    // Показываем сабреддиты выбранной вкладки
    return allSubreddits.filter(s => s.tabId === activeTabId)
  }

  const handleAddSubreddit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.url.trim()) {
      setError('Название и URL обязательны')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          postingRules: formData.postingRules.trim() || null,
          tabId: formData.tabId || null,
        }),
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания сабреддита')
      }

      setSuccess('Сабреддит успешно добавлен!')
      setFormData({ name: '', url: '', postingRules: '', tabId: '' })
      setShowAddForm(false)
      loadData()
    } catch (err: any) {
      console.error('Ошибка создания сабреддита:', err)
      setError(err.message || 'Не удалось добавить сабреддит')
    }
  }

  const handleAddTab = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!tabFormData.name.trim()) {
      setError('Название вкладки обязательно')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/subreddit-tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tabFormData.name.trim(),
        }),
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания вкладки')
      }

      setSuccess('Вкладка успешно создана!')
      setTabFormData({ name: '' })
      setShowAddTabForm(false)
      loadData()
      setActiveTabId(data.id) // Переключаемся на новую вкладку
    } catch (err: any) {
      console.error('Ошибка создания вкладки:', err)
      setError(err.message || 'Не удалось создать вкладку')
    }
  }

  const handleEditSubreddit = (subreddit: Subreddit) => {
    setEditingId(subreddit.id)
    setFormData({
      name: subreddit.name,
      url: subreddit.url,
      postingRules: subreddit.postingRules || '',
      tabId: subreddit.tabId || '',
    })
    setShowAddForm(true)
    setError('')
    setSuccess('')
  }

  const handleUpdateSubreddit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!editingId || !formData.name.trim() || !formData.url.trim()) {
      setError('Название и URL обязательны')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/subreddits/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          postingRules: formData.postingRules.trim() || null,
          tabId: formData.tabId || null,
        }),
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления сабреддита')
      }

      setSuccess('Сабреддит успешно обновлен!')
      setFormData({ name: '', url: '', postingRules: '', tabId: '' })
      setShowAddForm(false)
      setEditingId(null)
      loadData()
    } catch (err: any) {
      console.error('Ошибка обновления сабреддита:', err)
      setError(err.message || 'Не удалось обновить сабреддит')
    }
  }

  const handleDeleteSubreddit = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот сабреддит?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/subreddits/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ошибка удаления сабреддита')
      }

      setSuccess('Сабреддит успешно удален!')
      loadData()
    } catch (err: any) {
      console.error('Ошибка удаления сабреддита:', err)
      setError(err.message || 'Не удалось удалить сабреддит')
    }
  }

  const handleMoveSubreddit = async (subredditId: string, targetTabId: string | null) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/subreddits/${subredditId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tabId: targetTabId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ошибка перемещения сабреддита')
      }

      loadData()
    } catch (err: any) {
      console.error('Ошибка перемещения сабреддита:', err)
      setError(err.message || 'Не удалось переместить сабреддит')
    }
  }

  const handleDeleteTab = async (tabId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту вкладку? Сабреддиты останутся, но будут без вкладки.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/subreddit-tabs/${tabId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ошибка удаления вкладки')
      }

      setSuccess('Вкладка успешно удалена!')
      if (activeTabId === tabId) {
        setActiveTabId(null)
      }
      loadData()
    } catch (err: any) {
      console.error('Ошибка удаления вкладки:', err)
      setError(err.message || 'Не удалось удалить вкладку')
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setShowAddTabForm(false)
    setEditingId(null)
    setEditingTabId(null)
    setFormData({ name: '', url: '', postingRules: '', tabId: '' })
    setTabFormData({ name: '' })
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-cursor-text">Загрузка...</div>
      </main>
    )
  }

  const displayedSubreddits = getSubredditsForActiveTab()

  return (
    <main className="min-h-screen flex bg-transparent">
      {/* Боковая панель */}
      <aside className="w-64 glass border-r border-cursor-border min-h-screen p-4 flex flex-col sidebar-3d" style={{ backgroundColor: 'rgba(26, 26, 28, 0.4)', backdropFilter: 'blur(10px)' }}>
        <div className="mb-8">
          {/* Кнопка возврата в главное меню */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mb-6 px-4 py-3 rounded-xl transition bg-cursor-lighter border border-cursor-border text-cursor-text hover:bg-cursor-primary/10 hover:border-cursor-primary btn-3d smooth-transition"
          >
            <span className="flex items-center gap-2 justify-center">
              <svg className="w-5 h-5 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-semibold">Вернуться в главное меню</span>
            </span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 icon-3d">
              <svg className="w-full h-full" fill="none" stroke="url(#sidebarGradient)" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="sidebarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold gradient-text">
              Cabinet
            </h2>
          </div>
          <nav className="space-y-2">
            <button
              className="w-full text-left px-4 py-3 rounded-xl transition bg-gradient-cursor text-white shadow-cursor-glow tab-switch active"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Сабреддиты
              </span>
            </button>
          </nav>
        </div>
        <div className="mt-auto pt-4">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              router.push('/login')
            }}
            className="w-full px-4 py-2 bg-cursor-lighter border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-light transition btn-3d"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выйти
            </span>
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Вкладки (как в Telegram) */}
        <div className="bg-cursor-light border-b border-cursor-border px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* Вкладка "Все" */}
            <button
              onClick={() => setActiveTabId(null)}
              className={`px-4 py-3 whitespace-nowrap transition relative tab-switch smooth-transition ${
                activeTabId === null
                  ? 'active text-cursor-primary font-semibold'
                  : 'text-cursor-text-muted hover:text-cursor-text'
              }`}
            >
              Все
            </button>
            
            {/* Вкладки пользователя */}
            {tabs.map((tab) => (
              <div key={tab.id} className="relative group">
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-3 whitespace-nowrap transition relative tab-switch smooth-transition ${
                    activeTabId === tab.id
                      ? 'active text-cursor-primary font-semibold'
                      : 'text-cursor-text-muted hover:text-cursor-text'
                  }`}
                >
                  {tab.name}
                  <span className="ml-2 text-xs text-cursor-text-muted">({tab.subreddits.length})</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTab(tab.id)
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition icon-3d flex items-center justify-center"
                  title="Удалить вкладку"
                >
                  ×
                </button>
              </div>
            ))}
            
            {/* Кнопка добавления вкладки */}
            <button
              onClick={() => {
                setShowAddTabForm(true)
                setShowAddForm(false)
                setError('')
                setSuccess('')
              }}
              className="px-4 py-3 text-cursor-text-muted hover:text-cursor-primary transition whitespace-nowrap btn-3d"
              title="Добавить вкладку"
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Вкладка
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">Сабреддиты</h1>
            {!showAddForm && !showAddTabForm && (
              <button
                onClick={() => {
                  setShowAddForm(true)
                  setShowAddTabForm(false)
                  setEditingId(null)
                  setFormData({ name: '', url: '', postingRules: '', tabId: activeTabId || '' })
                  setError('')
                  setSuccess('')
                }}
                className="px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить сабреддит
                </span>
              </button>
            )}
          </div>

          {/* Сообщения об ошибках и успехе */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-xl text-green-200">
              {success}
            </div>
          )}

          {/* Форма добавления вкладки */}
          {showAddTabForm && (
            <div className="mb-8 p-6 glass rounded-xl border border-cursor-border modal-3d">
              <h2 className="text-xl font-bold gradient-text mb-4">Добавить новую вкладку</h2>
              <form onSubmit={handleAddTab}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cursor-text mb-2">
                      Название вкладки *
                    </label>
                    <input
                      type="text"
                      value={tabFormData.name}
                      onChange={(e) => setTabFormData({ name: e.target.value })}
                      placeholder="Например: Программирование, Дизайн, Развлечения"
                      className="w-full px-4 py-3 bg-cursor-dark text-cursor-text rounded-xl border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden"
                    >
                      <span className="relative z-10">Создать</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter transition btn-3d"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Форма добавления/редактирования сабреддита */}
          {showAddForm && (
            <div className="mb-8 p-6 glass rounded-xl border border-cursor-border modal-3d">
              <h2 className="text-xl font-bold gradient-text mb-4">
                {editingId ? 'Редактировать сабреддит' : 'Добавить новый сабреддит'}
              </h2>
              <form onSubmit={editingId ? handleUpdateSubreddit : handleAddSubreddit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cursor-text mb-2">
                      Название сабреддита *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: r/programming"
                      className="w-full px-4 py-3 bg-cursor-dark text-cursor-text rounded-xl border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cursor-text mb-2">
                      Ссылка на сабреддит *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://www.reddit.com/r/programming"
                      className="w-full px-4 py-3 bg-cursor-dark text-cursor-text rounded-xl border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cursor-text mb-2">
                      Вкладка
                    </label>
                    <select
                      value={formData.tabId}
                      onChange={(e) => setFormData({ ...formData, tabId: e.target.value })}
                      className="w-full px-4 py-3 bg-cursor-dark text-cursor-text rounded-xl border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                    >
                      <option value="">Без вкладки</option>
                      {tabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cursor-text mb-2">
                      Правила публикации постов (обучающая информация)
                    </label>
                    <textarea
                      value={formData.postingRules}
                      onChange={(e) => setFormData({ ...formData, postingRules: e.target.value })}
                      placeholder="Опишите правила и рекомендации по публикации постов в этом сабреддите..."
                      rows={6}
                      className="w-full px-4 py-3 bg-cursor-dark text-cursor-text rounded-xl border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 resize-none transition input-3d"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden"
                    >
                      <span className="relative z-10">{editingId ? 'Сохранить изменения' : 'Добавить'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter transition btn-3d"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Список сабреддитов */}
          {displayedSubreddits.length === 0 && !showAddForm && !showAddTabForm ? (
            <div className="text-center py-12">
              <p className="text-cursor-text-muted text-lg mb-2">
                {activeTabId === null 
                  ? 'У вас пока нет сабреддитов без вкладки' 
                  : 'В этой вкладке пока нет сабреддитов'}
              </p>
              <p className="text-cursor-text-muted">
                {activeTabId === null
                  ? 'Добавьте первый сабреддит, чтобы начать собирать правила публикации'
                  : 'Добавьте сабреддит в эту вкладку'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedSubreddits.map((subreddit) => (
                <div
                  key={subreddit.id}
                  className="glass rounded-xl border border-cursor-border p-6 card-3d"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold gradient-text mb-2">
                        {subreddit.name}
                      </h3>
                      <a
                        href={subreddit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cursor-accent hover:text-cursor-secondary text-sm break-all transition"
                      >
                        {subreddit.url}
                      </a>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditSubreddit(subreddit)}
                        className="px-3 py-1 text-sm bg-cursor-lighter border border-cursor-border text-cursor-text rounded-lg hover:bg-cursor-primary/20 transition icon-3d"
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSubreddit(subreddit.id)}
                        className="px-3 py-1 text-sm bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-900/50 transition icon-3d"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {subreddit.postingRules && (
                    <div className="mt-4 pt-4 border-t border-cursor-border">
                      <h4 className="text-sm font-semibold text-cursor-text mb-2">Правила публикации:</h4>
                      <p className="text-cursor-text-muted text-sm whitespace-pre-wrap">{subreddit.postingRules}</p>
                    </div>
                  )}
                  {activeTabId === null && subreddit.tabId && (
                    <div className="mt-4 pt-4 border-t border-cursor-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cursor-text-muted">
                          Вкладка: {subreddit.tab?.name || 'Неизвестно'}
                        </span>
                        <button
                          onClick={() => handleMoveSubreddit(subreddit.id, null)}
                          className="text-xs text-cursor-accent hover:text-cursor-secondary transition"
                          title="Убрать из вкладки"
                        >
                          Убрать
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTabId !== null && (
                    <div className="mt-4 pt-4 border-t border-cursor-border">
                      <select
                        value={subreddit.tabId || ''}
                        onChange={(e) => handleMoveSubreddit(subreddit.id, e.target.value || null)}
                        className="w-full px-3 py-2 text-xs bg-cursor-dark text-cursor-text rounded-lg border border-cursor-border focus:border-cursor-primary focus:outline-none focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                      >
                        <option value="">Без вкладки</option>
                        {tabs.map((tab) => (
                          <option key={tab.id} value={tab.id}>
                            {tab.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-cursor-border text-xs text-cursor-text-muted">
                    Добавлен: {new Date(subreddit.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
