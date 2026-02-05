'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { migrateLocalStorageToServer, syncFromServer, saveUserData, saveUserSettings } from '@/lib/user-data'

// Интерфейс для кастомных разделов
interface CustomSection {
  id: string
  name: string
  items: {
    id: string
    name: string
    type: 'training' | 'reports' | 'custom' | 'links' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25'
  }[]
}

// Компонент обучения
interface TrainingItem {
  id: string
  title: string
  text: string
  videos: string[]
  images: string[]
}

// Компонент отчетов
interface ReportItem {
  id: string
  title: string
  items: {
    name: string
    comment: string
  }[]
}

function ReportsComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `reports_${sectionId}_${itemId}` 
    : 'reports' // Для основного раздела Reddit используем старый ключ
  
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReports(parsed)
          } else if (Array.isArray(parsed)) {
            setReports([])
          } else {
            setReports([])
          }
        } catch (e) {
          console.error('Ошибка загрузки отчетов:', e)
          setReports([])
        }
      } else {
        setReports([])
      }
      setIsInitialized(true)
      // Сбрасываем форму при смене раздела
      setShowAddForm(false)
      setSelectedReportId(null)
      setCurrentTitle('')
      setCurrentItems([{ name: '', comment: '' }])
    }
  }, [storageKey])
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentItems, setCurrentItems] = useState<{ name: string; comment: string }[]>([
    { name: '', comment: '' }
  ])

  const handleAddItem = () => {
    setCurrentItems([...currentItems, { name: '', comment: '' }])
  }

  const handleRemoveItem = (index: number) => {
    if (currentItems.length > 1) {
      setCurrentItems(currentItems.filter((_, i) => i !== index))
    }
  }

  const handleItemChange = (index: number, field: 'name' | 'comment', value: string) => {
    const updatedItems = [...currentItems]
    updatedItems[index][field] = value
    setCurrentItems(updatedItems)
  }

  const handleSaveReport = () => {
    // Фильтруем пустые позиции
    const validItems = currentItems.filter(item => item.name.trim() || item.comment.trim())
    
    if (currentTitle.trim() && validItems.length > 0) {
      const newReport: ReportItem = {
        id: Date.now().toString(),
        title: currentTitle.trim(),
        items: validItems,
      }
      setReports([...reports, newReport])
      setCurrentTitle('')
      setCurrentItems([{ name: '', comment: '' }])
      setShowAddForm(false)
    }
  }

  const handleDeleteReport = (id: string) => {
    setReports(reports.filter(item => item.id !== id))
  }

  // Сохраняем отчеты в localStorage и на сервер при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(reports))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, reports).catch(console.error)
      }
    }
  }, [reports, storageKey, isInitialized])

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить отчет
          </span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass rounded-xl p-6 border border-cursor-border mb-6">
          <h3 className="text-xl font-bold gradient-text mb-4">Новый отчет</h3>
          
          {/* Название отчета */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Название отчета</label>
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите название отчета..."
              required
            />
          </div>

          {/* Позиции отчета */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-cursor-text font-medium">Позиции отчета</label>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text hover:bg-cursor-lighter transition text-sm btn-3d"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить позицию
                </span>
              </button>
            </div>
            
            <div className="space-y-3">
              {currentItems.map((item, index) => (
                <div key={index} className="bg-cursor-darker rounded-lg p-4 border border-cursor-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-cursor-text-muted text-sm font-medium">Позиция {index + 1}</span>
                    {currentItems.length > 1 && (
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20 text-sm"
                      placeholder="Название позиции..."
                    />
                    <textarea
                      value={item.comment}
                      onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20 resize-none text-sm"
                      rows={2}
                      placeholder="Комментарий..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setCurrentTitle('')
                setCurrentItems([{ name: '', comment: '' }])
              }}
              className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
            >
              Отмена
            </button>
            <button
              type="submit"
              onClick={handleSaveReport}
              disabled={!currentTitle.trim() || currentItems.filter(item => item.name.trim() || item.comment.trim()).length === 0}
              className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
            >
              Сохранить отчет
            </button>
          </div>
        </div>
      )}

      {/* Список отчетов */}
      {reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="glass rounded-xl p-6 border border-cursor-border card-3d">
              <div className="flex justify-between items-start mb-4">
                <h3 
                  className="text-lg font-bold gradient-text cursor-pointer flex-1"
                  onClick={() => setSelectedReportId(selectedReportId === report.id ? null : report.id)}
                >
                  {report.title}
                  <svg 
                    className={`w-4 h-4 ml-2 inline-block transition-transform ${selectedReportId === report.id ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h3>
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  className="text-red-400 hover:text-red-300 ml-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              {selectedReportId === report.id && (
                <div className="mt-4 space-y-3">
                  {report.items.map((item, index) => (
                    <div key={index} className="bg-cursor-darker rounded-lg p-4 border border-cursor-border">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-cursor flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          {item.name && (
                            <h4 className="text-cursor-text font-semibold mb-1">{item.name}</h4>
                          )}
                          {item.comment && (
                            <p className="text-cursor-text-muted text-sm whitespace-pre-wrap">{item.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-cursor-text-muted">
          <p className="text-xl mb-4">Пока нет отчетов</p>
          <p>Добавьте первый отчет, чтобы начать</p>
        </div>
      )}
    </div>
  )
}

// Компонент профилей
interface LinkItem {
  id: string
  model?: string
  status?: 'alive' | 'banned' | 'used'
  profile?: string
  login?: string
  password?: string
  link?: string
}

function LinksComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `links_${sectionId}_${itemId}` 
    : 'links' // Для основного раздела Reddit используем старый ключ
  
  const [links, setLinks] = useState<LinkItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLinks(parsed)
          } else if (Array.isArray(parsed)) {
            setLinks([])
          } else {
            // Если данные в старом формате, пытаемся их преобразовать
            setLinks([])
          }
        } catch (e) {
          console.error('Ошибка загрузки профилей:', e)
          setLinks([])
        }
      } else {
        setLinks([])
      }
      setIsInitialized(true)
      // Сбрасываем форму при смене раздела
      setShowAddForm(false)
      setEditingLinkId(null)
      setCurrentModel('')
      setCurrentProfile('')
      setCurrentLogin('')
      setCurrentPassword('')
      setCurrentLink('')
      setSearchQuery('')
    }
  }, [storageKey])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState('')
  const [currentProfile, setCurrentProfile] = useState('')
  const [currentLogin, setCurrentLogin] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [currentLink, setCurrentLink] = useState('')
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null)
  const [statusModalLinkId, setStatusModalLinkId] = useState<string | null>(null)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editingModelValue, setEditingModelValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null)

  // Сохраняем профили в localStorage и на сервер при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(links))
      // Отправляем кастомное событие для обновления статусов в 25-Кадре
      window.dispatchEvent(new Event('profileUpdated'))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, links).catch(console.error)
      }
    }
  }, [links, storageKey, isInitialized])

  const handleSaveLink = () => {
    // Проверяем, что хотя бы одно поле заполнено
    if (!currentModel.trim() && !currentProfile.trim() && !currentLogin.trim() && !currentPassword.trim() && !currentLink.trim()) {
      alert('Заполните хотя бы одно поле')
      return
    }

    if (editingLinkId) {
      const existingLink = links.find(l => l.id === editingLinkId)
      const linkData: LinkItem = {
        id: editingLinkId,
        model: currentModel.trim() || undefined,
        status: existingLink?.status,
        profile: currentProfile.trim() || undefined,
        login: currentLogin.trim() || undefined,
        password: currentPassword.trim() || undefined,
        link: currentLink.trim() || undefined,
      }
      setLinks(links.map(link => link.id === editingLinkId ? linkData : link))
      setEditingLinkId(null)
    } else {
      const linkData: LinkItem = {
        id: Date.now().toString(),
        model: currentModel.trim() || undefined,
        status: undefined,
        profile: currentProfile.trim() || undefined,
        login: currentLogin.trim() || undefined,
        password: currentPassword.trim() || undefined,
        link: currentLink.trim() || undefined,
      }
      setLinks([...links, linkData])
    }

    setCurrentModel('')
    setCurrentProfile('')
    setCurrentLogin('')
    setCurrentPassword('')
    setCurrentLink('')
    setShowAddForm(false)
  }

  const handleEditLink = (link: LinkItem) => {
    setEditingLinkId(link.id)
    setCurrentModel(link.model || '')
    setCurrentProfile(link.profile || '')
    setCurrentLogin(link.login || '')
    setCurrentPassword(link.password || '')
    setCurrentLink(link.link || '')
    setShowAddForm(true)
  }

  const handleCopyToClipboard = async (text: string, label: string, cellId: string) => {
    if (!text) {
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCellId(cellId)
      // Сбрасываем подсветку через 1 секунду
      setTimeout(() => {
        setCopiedCellId(null)
      }, 1000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  // Функция для генерации цвета на основе имени модели
  const getModelColor = (modelName: string | undefined): string => {
    if (!modelName || !modelName.trim()) {
      return 'bg-cursor-darker border border-cursor-border'
    }
    
    // Простая hash функция для генерации цвета
    let hash = 0
    const normalizedName = modelName.trim().toLowerCase()
    for (let i = 0; i < normalizedName.length; i++) {
      hash = normalizedName.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Генерируем цвет в диапазоне от темных до ярких оттенков
    const hue = Math.abs(hash % 360)
    const saturation = 50 + (Math.abs(hash) % 30) // 50-80%
    const lightness = 25 + (Math.abs(hash) % 15) // 25-40% для темных цветов
    
    return `bg-[hsl(${hue},${saturation}%,${lightness}%)] border border-[hsl(${hue},${saturation}%,${lightness + 20}%)]`
  }

  const handleDeleteLink = (id: string) => {
    setLinkToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDeleteLink = () => {
    if (linkToDelete) {
      setLinks(links.filter(item => item.id !== linkToDelete))
      setLinkToDelete(null)
      setShowDeleteModal(false)
    }
  }

  const handleStatusChange = (linkId: string, status: 'alive' | 'banned' | 'used') => {
    setLinks(links.map(link => 
      link.id === linkId ? { ...link, status } : link
    ))
    setStatusModalLinkId(null)
  }

  const handleUpdateModel = (linkId: string, modelValue: string) => {
    setLinks(links.map(link => 
      link.id === linkId ? { ...link, model: modelValue.trim() || undefined } : link
    ))
  }

  // Фильтрация профилей по поисковому запросу
  const filteredLinks = links.filter(link => {
    if (!searchQuery.trim()) {
      return true
    }
    const query = searchQuery.toLowerCase().trim()
    const model = (link.model || '').toLowerCase()
    const profile = (link.profile || '').toLowerCase()
    const login = (link.login || '').toLowerCase()
    
    return model.includes(query) || profile.includes(query) || login.includes(query)
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по модели, профилю или логину..."
              className="w-full px-4 py-2 pl-10 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cursor-text-muted" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cursor-text-muted hover:text-cursor-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить профиль
          </span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass rounded-xl p-6 border border-cursor-border mb-6">
          <h3 className="text-xl font-bold gradient-text mb-4">{editingLinkId ? 'Редактировать профиль' : 'Новый профиль'}</h3>
          
          {/* МОДЕЛЬ */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">МОДЕЛЬ</label>
            <input
              type="text"
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите имя модели..."
            />
          </div>

          {/* ПРОФИЛЬ */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">ПРОФИЛЬ</label>
            <input
              type="text"
              value={currentProfile}
              onChange={(e) => setCurrentProfile(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите профиль..."
            />
          </div>

          {/* ЛОГИН */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">ЛОГИН</label>
            <input
              type="text"
              value={currentLogin}
              onChange={(e) => setCurrentLogin(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите логин..."
            />
          </div>

          {/* ПАРОЛЬ */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">ПАРОЛЬ</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите пароль..."
            />
          </div>

          {/* ССЫЛКА */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">ССЫЛКА</label>
            <input
              type="text"
              value={currentLink}
              onChange={(e) => setCurrentLink(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите ссылку..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEditingLinkId(null)
                setCurrentModel('')
                setCurrentProfile('')
                setCurrentLogin('')
                setCurrentPassword('')
                setCurrentLink('')
              }}
              className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
            >
              Отмена
            </button>
            <button
              type="submit"
              onClick={handleSaveLink}
              disabled={!currentProfile.trim() && !currentLogin.trim() && !currentPassword.trim() && !currentLink.trim()}
              className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
            >
              Сохранить ссылку
            </button>
          </div>
        </div>
      )}

      {/* Список профилей */}
      {filteredLinks.length > 0 ? (
        <div className="space-y-6">
          {filteredLinks.map((link) => (
            <div key={link.id} className="glass rounded-xl p-6 border border-cursor-border card-3d">
              <div className="flex justify-end items-start mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditLink(link)}
                    className="text-cursor-primary hover:text-cursor-accent"
                    title="Редактировать"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Статичные заголовки */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">МОДЕЛЬ</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">СТАТУС</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">ПРОФИЛЬ</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">ЛОГИН</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">ПАРОЛЬ</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-cursor-text-muted">ССЫЛКА</div>
                </div>
              </div>

              {/* Секции с данными */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {editingModelId === link.id ? (
                  <div className="flex gap-2">
                    <div className={`flex-1 px-3 py-2 rounded-xl ${getModelColor(editingModelValue)} text-white`}>
                      <input
                        type="text"
                        value={editingModelValue}
                        onChange={(e) => setEditingModelValue(e.target.value)}
                        onBlur={() => {
                          handleUpdateModel(link.id, editingModelValue)
                          setEditingModelId(null)
                          setEditingModelValue('')
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateModel(link.id, editingModelValue)
                            setEditingModelId(null)
                            setEditingModelValue('')
                          }
                          if (e.key === 'Escape') {
                            setEditingModelId(null)
                            setEditingModelValue('')
                          }
                        }}
                        className="w-full bg-transparent border-none outline-none text-white placeholder-white/50"
                        placeholder="Имя модели..."
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => {
                        handleUpdateModel(link.id, editingModelValue)
                        setEditingModelId(null)
                        setEditingModelValue('')
                      }}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingModelId(link.id)
                      setEditingModelValue(link.model || '')
                    }}
                    className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center cursor-pointer hover:opacity-80 ${getModelColor(link.model)} text-white`}
                  >
                    <div className="text-sm break-all text-center font-medium">
                      {link.model || 'Не заполнено'}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setStatusModalLinkId(link.id)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    link.status === 'alive'
                      ? 'bg-green-900/30 border border-green-500/50 text-green-200 hover:bg-green-900/50'
                      : link.status === 'banned'
                      ? 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                      : link.status === 'used'
                      ? 'bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 hover:bg-yellow-900/50'
                      : 'bg-cursor-darker border border-cursor-border text-cursor-text-muted hover:bg-cursor-lighter'
                  }`}
                >
                  <div className="text-sm break-all text-center font-medium">
                    {link.status === 'alive' ? 'Жив' : link.status === 'banned' ? 'Бан' : link.status === 'used' ? 'Использовано' : 'Не выбран'}
                  </div>
                </button>
                <button
                  onClick={() => handleCopyToClipboard(link.profile || '', 'ПРОФИЛЬ', `${link.id}-profile`)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    copiedCellId === `${link.id}-profile`
                      ? 'bg-green-600/50 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50'
                      : link.profile
                      ? 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                      : 'bg-cursor-darker border border-cursor-border text-cursor-text-muted cursor-not-allowed'
                  }`}
                  disabled={!link.profile}
                >
                  <div className="text-sm break-all text-center font-medium">
                    {link.profile || 'Не заполнено'}
                  </div>
                </button>
                <button
                  onClick={() => handleCopyToClipboard(link.login || '', 'ЛОГИН', `${link.id}-login`)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    copiedCellId === `${link.id}-login`
                      ? 'bg-green-600/50 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50'
                      : link.login
                      ? 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                      : 'bg-cursor-darker border border-cursor-border text-cursor-text-muted cursor-not-allowed'
                  }`}
                  disabled={!link.login}
                >
                  <div className="text-sm break-all text-center font-medium">
                    {link.login || 'Не заполнено'}
                  </div>
                </button>
                <button
                  onClick={() => handleCopyToClipboard(link.password || '', 'ПАРОЛЬ', `${link.id}-password`)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    copiedCellId === `${link.id}-password`
                      ? 'bg-green-600/50 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50'
                      : link.password
                      ? 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                      : 'bg-cursor-darker border border-cursor-border text-cursor-text-muted cursor-not-allowed'
                  }`}
                  disabled={!link.password}
                >
                  <div className="text-sm break-all text-center font-medium">
                    {link.password ? '••••••••' : 'Не заполнено'}
                  </div>
                </button>
                <button
                  onClick={() => handleCopyToClipboard(link.link || '', 'ССЫЛКА', `${link.id}-link`)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    copiedCellId === `${link.id}-link`
                      ? 'bg-green-600/50 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50'
                      : link.link
                      ? 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                      : 'bg-cursor-darker border border-cursor-border text-cursor-text-muted cursor-not-allowed'
                  }`}
                  disabled={!link.link}
                >
                  <div className="text-sm break-all text-center font-medium">
                    {link.link || 'Не заполнено'}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-cursor-text-muted">
          {searchQuery.trim() ? (
            <>
              <p className="text-xl mb-4">Ничего не найдено</p>
              <p>Попробуйте изменить поисковый запрос</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
              >
                Очистить поиск
              </button>
            </>
          ) : (
            <>
              <p className="text-xl mb-4">Пока нет профилей</p>
              <p>Добавьте первый профиль, чтобы начать</p>
            </>
          )}
        </div>
      )}

      {/* Модальное окно выбора статуса */}
      {statusModalLinkId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Выберите статус</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleStatusChange(statusModalLinkId, 'alive')}
                className="w-full px-4 py-3 bg-green-900/30 border border-green-500/50 text-green-200 rounded-xl font-semibold hover:bg-green-900/50 transition btn-3d"
              >
                Жив
              </button>
              <button
                onClick={() => handleStatusChange(statusModalLinkId, 'banned')}
                className="w-full px-4 py-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-xl font-semibold hover:bg-red-900/50 transition btn-3d"
              >
                Бан
              </button>
              <button
                onClick={() => handleStatusChange(statusModalLinkId, 'used')}
                className="w-full px-4 py-3 bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 rounded-xl font-semibold hover:bg-yellow-900/50 transition btn-3d"
              >
                Использовано
              </button>
              <button
                onClick={() => setStatusModalLinkId(null)}
                className="w-full px-4 py-3 bg-cursor-darker border border-cursor-border text-cursor-text rounded-xl font-semibold hover:bg-cursor-lighter transition btn-3d"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления профиля */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить этот профиль?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setLinkToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteLink}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент Nextcloud
function NextcloudComponent() {
  const [nextcloudUrl, setNextcloudUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nextcloudUrl') || ''
    }
    return ''
  })
  const [nextcloudUsername, setNextcloudUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nextcloudUsername') || ''
    }
    return ''
  })
  const [nextcloudPassword, setNextcloudPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nextcloudPassword') || ''
    }
    return ''
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [files, setFiles] = useState<Array<{ name: string; type: 'file' | 'folder'; size?: number; lastModified?: string }>>([])
  const [currentPath, setCurrentPath] = useState<string>('/')

  const fetchFiles = async (path: string = '/') => {
    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      return
    }

    try {
      // Формируем WebDAV URL
      const baseUrl = nextcloudUrl.replace(/\/$/, '')
      const webdavUrl = `${baseUrl}/remote.php/dav/files/${nextcloudUsername}${path}`
      
      // Создаем PROPFIND запрос для получения списка файлов
      const response = await fetch(webdavUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Authorization': `Basic ${btoa(`${nextcloudUsername}:${nextcloudPassword}`)}`,
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getlastmodified/>
    <d:getcontentlength/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const xmlText = await response.text()
      console.log('XML Response:', xmlText)
      
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
      
      // Проверяем на ошибки парсинга
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Ошибка парсинга XML: ' + parserError.textContent)
      }
      
      const fileList: Array<{ name: string; type: 'file' | 'folder'; size?: number; lastModified?: string }> = []
      
      // Пробуем разные варианты получения элементов
      let responses = xmlDoc.getElementsByTagName('d:response')
      if (responses.length === 0) {
        responses = xmlDoc.getElementsByTagName('response')
      }
      if (responses.length === 0) {
        // Пробуем найти все элементы response независимо от namespace
        const allElements = xmlDoc.getElementsByTagName('*')
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].localName === 'response') {
            responses = xmlDoc.getElementsByTagName(allElements[i].tagName)
            break
          }
        }
      }
      
      console.log('Found responses:', responses.length)
      
      for (let i = 0; i < responses.length; i++) {
        const responseEl = responses[i]
        
        // Пробуем разные варианты получения href
        let href = ''
        const hrefEl = responseEl.getElementsByTagName('d:href')[0] || 
                       responseEl.getElementsByTagName('href')[0] ||
                       responseEl.querySelector('href')
        if (hrefEl) {
          href = hrefEl.textContent || ''
        }
        
        if (!href) continue
        
        // Получаем метаданные
        const lastModifiedEl = responseEl.getElementsByTagName('d:getlastmodified')[0] || 
                               responseEl.getElementsByTagName('getlastmodified')[0] ||
                               responseEl.querySelector('getlastmodified')
        const lastModified = lastModifiedEl?.textContent || ''
        
        const contentLengthEl = responseEl.getElementsByTagName('d:getcontentlength')[0] || 
                                responseEl.getElementsByTagName('getcontentlength')[0] ||
                                responseEl.querySelector('getcontentlength')
        const contentLength = contentLengthEl?.textContent || ''
        
        const resourceTypeEl = responseEl.getElementsByTagName('d:resourcetype')[0] || 
                               responseEl.getElementsByTagName('resourcetype')[0] ||
                               responseEl.querySelector('resourcetype')
        const isCollection = resourceTypeEl?.getElementsByTagName('d:collection').length > 0 ||
                            resourceTypeEl?.getElementsByTagName('collection').length > 0 ||
                            resourceTypeEl?.querySelector('collection') !== null
        
        // Извлекаем имя файла/папки из href
        const cleanHref = href.replace(/^https?:\/\/[^\/]+/, '') // Убираем домен
        const pathParts = cleanHref.split('/').filter(p => p && p !== 'remote.php' && p !== 'dav' && p !== 'files' && p !== nextcloudUsername)
        const name = pathParts[pathParts.length - 1] || ''
        
        // Пропускаем пустые имена и текущую папку
        if (!name) continue
        
        // Декодируем имя
        const decodedName = decodeURIComponent(name)
        
        fileList.push({
          name: decodedName,
          type: isCollection ? 'folder' : 'file',
          size: contentLength ? parseInt(contentLength) : undefined,
          lastModified: lastModified || undefined
        })
      }
      
      console.log('Parsed files:', fileList.length, fileList)
      
      // Сортируем: сначала папки, потом файлы
      fileList.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1
        if (a.type === 'file' && b.type === 'folder') return 1
        return a.name.localeCompare(b.name)
      })
      
      setFiles(fileList)
      setCurrentPath(path)
      
      if (fileList.length === 0) {
        setSyncStatus('Папка пуста или не удалось получить файлы')
      }
    } catch (error) {
      console.error('Ошибка получения файлов:', error)
      setSyncStatus(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  useEffect(() => {
    // Проверяем, есть ли сохраненные данные подключения
    if (nextcloudUrl && nextcloudUsername && nextcloudPassword) {
      setIsConnected(true)
      // Автоматически загружаем файлы при подключении
      setTimeout(() => {
        fetchFiles('/')
      }, 500)
    }
  }, [])

  const handleConnect = async () => {
    if (!nextcloudUrl.trim() || !nextcloudUsername.trim() || !nextcloudPassword.trim()) {
      alert('Заполните все поля для подключения')
      return
    }

    try {
      // Сохраняем данные подключения
      localStorage.setItem('nextcloudUrl', nextcloudUrl.trim())
      localStorage.setItem('nextcloudUsername', nextcloudUsername.trim())
      localStorage.setItem('nextcloudPassword', nextcloudPassword.trim())
      
      setIsConnected(true)
      setSyncStatus('Подключение установлено')
      // Автоматически загружаем файлы после подключения
      setTimeout(() => {
        fetchFiles('/')
      }, 500)
    } catch (error) {
      console.error('Ошибка подключения:', error)
      alert('Ошибка подключения к Nextcloud')
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('nextcloudUrl')
    localStorage.removeItem('nextcloudUsername')
    localStorage.removeItem('nextcloudPassword')
    setNextcloudUrl('')
    setNextcloudUsername('')
    setNextcloudPassword('')
    setIsConnected(false)
    setSyncStatus('')
    setFiles([])
    setCurrentPath('/')
  }

  const handleSync = async () => {
    if (!isConnected) {
      alert('Сначала подключитесь к Nextcloud')
      return
    }

    setIsSyncing(true)
    setSyncStatus('Синхронизация...')

    try {
      await fetchFiles('/')
      setSyncStatus('Синхронизация завершена успешно')
      setTimeout(() => setSyncStatus(''), 3000)
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      setSyncStatus('Ошибка синхронизации')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`
    fetchFiles(newPath)
  }

  const handleBackClick = () => {
    if (currentPath === '/') return
    const pathParts = currentPath.split('/').filter(p => p)
    pathParts.pop()
    const newPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/'
    fetchFiles(newPath)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ru-RU')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <h3 className="text-xl font-bold gradient-text mb-4">Подключение к Nextcloud</h3>
        
        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-cursor-text font-medium">URL Nextcloud</label>
              <input
                type="text"
                value={nextcloudUrl}
                onChange={(e) => setNextcloudUrl(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="https://nextcloud.example.com"
              />
            </div>
            
            <div>
              <label className="block mb-2 text-cursor-text font-medium">Имя пользователя</label>
              <input
                type="text"
                value={nextcloudUsername}
                onChange={(e) => setNextcloudUsername(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="Введите имя пользователя"
              />
            </div>
            
            <div>
              <label className="block mb-2 text-cursor-text font-medium">Пароль</label>
              <input
                type="password"
                value={nextcloudPassword}
                onChange={(e) => setNextcloudPassword(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="Введите пароль"
              />
            </div>
            
            <button
              onClick={handleConnect}
              className="w-full px-4 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
            >
              Подключиться
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div className="text-green-200 font-semibold">Подключено</div>
                  <div className="text-green-300 text-sm">{nextcloudUrl}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full px-4 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
            </button>
            
            {syncStatus && (
              <div className={`p-3 rounded-xl text-sm ${
                syncStatus.includes('ошибка') || syncStatus.includes('Ошибка')
                  ? 'bg-red-900/30 border border-red-500/50 text-red-200'
                  : 'bg-green-900/30 border border-green-500/50 text-green-200'
              }`}>
                {syncStatus}
              </div>
            )}
            
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-3 bg-red-900/30 border border-red-500/50 text-red-400 rounded-xl font-semibold hover:bg-red-900/50 transition btn-3d"
            >
              Отключиться
            </button>
          </div>
        )}
      </div>

      {/* Список файлов */}
      {isConnected && (
        <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold gradient-text">Файлы и папки</h3>
            {currentPath !== '/' && (
              <button
                onClick={handleBackClick}
                className="px-4 py-2 bg-cursor-darker border border-cursor-border rounded-xl text-cursor-text hover:bg-cursor-lighter transition btn-3d flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад
              </button>
            )}
          </div>
          
          <div className="text-sm text-cursor-text-muted mb-4">
            Путь: {currentPath === '/' ? '/' : currentPath}
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-8 text-cursor-text-muted">
              <p>Папка пуста</p>
              <p className="text-sm mt-2">Нажмите "Синхронизировать" для загрузки файлов</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
              <div
                key={index}
                onClick={() => file.type === 'folder' && handleFolderClick(file.name)}
                className={`p-4 rounded-xl border border-cursor-border hover:bg-cursor-lighter transition cursor-pointer ${
                  file.type === 'folder' ? 'bg-cursor-darker' : 'bg-cursor-dark/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {file.type === 'folder' ? (
                      <svg className="w-6 h-6 text-cursor-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-cursor-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-cursor-text font-medium truncate">{file.name}</div>
                    <div className="text-cursor-text-muted text-sm flex items-center gap-4 mt-1">
                      {file.size !== undefined && (
                        <span>{formatFileSize(file.size)}</span>
                      )}
                      {file.lastModified && (
                        <span>{formatDate(file.lastModified)}</span>
                      )}
                    </div>
                  </div>
                  {file.type === 'folder' && (
                    <svg className="w-5 h-5 text-cursor-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Компонент настроек
function SettingsComponent({ 
  customSections, 
  setCustomSections,
  theme,
  setTheme 
}: { 
  customSections: CustomSection[]
  setCustomSections: React.Dispatch<React.SetStateAction<CustomSection[]>>
  theme: 'dark' | 'light'
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>
}) {
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null)

  const handleDeleteSection = (id: string) => {
    setSectionToDelete(id)
    setShowDeleteSectionModal(true)
  }

  const confirmDeleteSection = () => {
    if (sectionToDelete) {
      setCustomSections(customSections.filter(section => section.id !== sectionToDelete))
      setSectionToDelete(null)
      setShowDeleteSectionModal(false)
    }
  }

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  useEffect(() => {
    // Применяем текущую тему при монтировании
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="space-y-6">

      {/* Управление разделами */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d mb-6">
        <h3 className="text-xl font-bold gradient-text mb-4">Управление разделами</h3>
        {customSections.length > 0 ? (
          <div className="space-y-3">
            {customSections.map((section) => (
              <div key={section.id} className="bg-cursor-darker rounded-lg p-4 border border-cursor-border flex justify-between items-center">
                <div>
                  <h4 className="text-cursor-text font-semibold mb-1">{section.name}</h4>
                  <p className="text-cursor-text-muted text-sm">
                    {section.items.length} {section.items.length === 1 ? 'кнопка' : section.items.length < 5 ? 'кнопки' : 'кнопок'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-900/50 transition btn-3d"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Удалить
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-cursor-text-muted">
            <p>Нет кастомных разделов</p>
            <p className="text-sm mt-2">Добавьте разделы через кнопку "+ Добавить раздел" в боковой панели</p>
          </div>
        )}
      </div>

      {/* Настройки темы */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d mb-6">
        <h3 className="text-xl font-bold gradient-text mb-4">Тема оформления</h3>
        <div className="space-y-3">
          <button
            onClick={() => handleThemeChange('dark')}
            className={`w-full px-4 py-3 rounded-xl border transition ${
              theme === 'dark'
                ? 'bg-gradient-cursor text-white border-cursor-primary shadow-cursor-glow'
                : 'bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter'
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Темная тема
              </span>
              {theme === 'dark' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
          <button
            onClick={() => handleThemeChange('light')}
            className={`w-full px-4 py-3 rounded-xl border transition ${
              theme === 'light'
                ? 'bg-gradient-cursor text-white border-cursor-primary shadow-cursor-glow'
                : 'bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter'
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Светлая тема
              </span>
              {theme === 'light' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Скачивание расширений */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <h3 className="text-xl font-bold gradient-text mb-4">Скачать расширения</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              window.open('/api/extensions/download?type=token', '_blank')
            }}
            className="w-full px-4 py-3 rounded-xl border bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter transition flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="flex-1 text-left">
              <div className="font-semibold">Расширение для извлечения токена</div>
              <div className="text-sm text-cursor-text-muted">Скачать инструкцию и файлы</div>
            </span>
          </button>
          <button
            onClick={() => {
              window.open('/api/extensions/download?type=ads', '_blank')
            }}
            className="w-full px-4 py-3 rounded-xl border bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter transition flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="flex-1 text-left">
              <div className="font-semibold">Расширение для накрутки (ADS REDDIT)</div>
              <div className="text-sm text-cursor-text-muted">Скачать инструкцию</div>
            </span>
          </button>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления раздела */}
      {showDeleteSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить этот раздел?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteSectionModal(false)
                  setSectionToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteSection}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент использованных
interface UsedTab {
  id: string
  name: string
  emails: string[]
}

function UsedComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `used_${sectionId}_${itemId}` 
    : 'used' // Для основного раздела Reddit используем старый ключ
  
  const [tabs, setTabs] = useState<UsedTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newTabName, setNewTabName] = useState('')
  const [showAddTabModal, setShowAddTabModal] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDeleteTabModal, setShowDeleteTabModal] = useState(false)
  const [tabToDelete, setTabToDelete] = useState<string | null>(null)

  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setTabs(parsed.tabs || [])
          setActiveTabId(parsed.activeTabId || null)
        } catch (e) {
          console.error('Ошибка загрузки использованных:', e)
          setTabs([])
          setActiveTabId(null)
        }
      } else {
        setTabs([])
        setActiveTabId(null)
      }
      setIsInitialized(true)
      setCurrentEmail('')
    }
  }, [storageKey])

  // Сохраняем данные в localStorage при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify({ tabs, activeTabId }))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, { tabs, activeTabId }).catch(console.error)
      }
    }
  }, [tabs, activeTabId, storageKey, isInitialized])

  const handleAddTab = () => {
    if (newTabName.trim()) {
      const newTab: UsedTab = {
        id: Date.now().toString(),
        name: newTabName.trim(),
        emails: []
      }
      setTabs([...tabs, newTab])
      setActiveTabId(newTab.id)
      setNewTabName('')
      setShowAddTabModal(false)
    }
  }

  const handleDeleteTab = (tabId: string) => {
    setTabToDelete(tabId)
    setShowDeleteTabModal(true)
  }

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      const updatedTabs = tabs.filter(tab => tab.id !== tabToDelete)
      setTabs(updatedTabs)
      if (activeTabId === tabToDelete) {
        setActiveTabId(updatedTabs.length > 0 ? updatedTabs[0].id : null)
      }
      setTabToDelete(null)
      setShowDeleteTabModal(false)
    }
  }

  const handleAddEmail = () => {
    if (currentEmail.trim() && activeTabId) {
      const activeTab = tabs.find(tab => tab.id === activeTabId)
      if (activeTab && !activeTab.emails.includes(currentEmail.trim())) {
        setTabs(tabs.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, emails: [...tab.emails, currentEmail.trim()] }
            : tab
        ))
        setCurrentEmail('')
      }
    }
  }

  const handleDeleteEmail = (tabId: string, email: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, emails: tab.emails.filter(e => e !== email) }
        : tab
    ))
  }

  // Поиск по всем вкладкам
  const allEmails = tabs.flatMap(tab => tab.emails.map(email => ({ email, tabName: tab.name, tabId: tab.id })))
  const searchResults = searchQuery.trim() 
    ? allEmails.filter(item => 
        item.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className="space-y-6">
      {/* Поисковик */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <h3 className="text-xl font-bold gradient-text mb-4">Поиск по использованным</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
            placeholder="Введите почту для поиска..."
          />
        </div>
        {searchQuery.trim() && (
          <div className="mt-4">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-cursor-text-muted text-sm mb-2">Найдено: {searchResults.length}</p>
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-cursor-darker border border-cursor-border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <div className="text-cursor-text font-medium">{item.email}</div>
                      <div className="text-cursor-text-muted text-sm">Вкладка: {item.tabName}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTabId(item.tabId)
                        setSearchQuery('')
                      }}
                      className="px-3 py-1 bg-cursor-primary text-white rounded-lg text-sm hover:bg-cursor-accent transition"
                    >
                      Перейти
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cursor-text-muted">Ничего не найдено</p>
            )}
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold gradient-text">Вкладки</h3>
          <button
            onClick={() => setShowAddTabModal(true)}
            className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
          >
            + Добавить вкладку
          </button>
        </div>

        {tabs.length > 0 ? (
          <>
            {/* Навигация по вкладкам */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2 rounded-xl font-semibold transition whitespace-nowrap ${
                    activeTabId === tab.id
                      ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'bg-cursor-darker text-cursor-text hover:bg-cursor-lighter'
                  }`}
                >
                  {tab.name}
                  {activeTabId === tab.id && tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTab(tab.id)
                      }}
                      className="ml-2 text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Контент активной вкладки */}
            {activeTab && (
              <div className="space-y-4">
                {/* Добавление почты */}
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                    className="flex-1 px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                    placeholder="Введите почту..."
                  />
                  <button
                    onClick={handleAddEmail}
                    disabled={!currentEmail.trim()}
                    className="px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed btn-3d"
                  >
                    Добавить
                  </button>
                </div>

                {/* Список почт */}
                {activeTab.emails.length > 0 ? (
                  <div className="space-y-2">
                    {activeTab.emails.map((email, index) => (
                      <div
                        key={index}
                        className="p-4 bg-cursor-darker border border-cursor-border rounded-xl flex justify-between items-center"
                      >
                        <div className="text-cursor-text font-medium">{email}</div>
                        <button
                          onClick={() => handleDeleteEmail(activeTab.id, email)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-cursor-text-muted">
                    <p>Пока нет почт в этой вкладке</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-cursor-text-muted">
            <p className="text-xl mb-4">Пока нет вкладок</p>
            <p>Добавьте первую вкладку, чтобы начать</p>
          </div>
        )}
      </div>

      {/* Модальное окно добавления вкладки */}
      {showAddTabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Добавить вкладку</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Название вкладки</label>
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTab()}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Например: ЮТУБ"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddTabModal(false)
                    setNewTabName('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddTab}
                  disabled={!newTabName.trim()}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления вкладки */}
      {showDeleteTabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить эту вкладку?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteTabModal(false)
                  setTabToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTab}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент верификаций
interface VerificationSite {
  id: string
  name: string
  status: 'yes' | 'no'
  comment?: string
}

interface VerificationTab {
  id: string
  firstName: string
  lastName: string
  stage: string
  sites: VerificationSite[]
}

function VerificationsComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `verifications_${sectionId}_${itemId}` 
    : 'verifications'
  
  const [tabs, setTabs] = useState<VerificationTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [showAddTabModal, setShowAddTabModal] = useState(false)
  const [newTabFirstName, setNewTabFirstName] = useState('')
  const [newTabLastName, setNewTabLastName] = useState('')
  const [newTabStage, setNewTabStage] = useState('')
  const [showAddSiteModal, setShowAddSiteModal] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteComment, setNewSiteComment] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDeleteTabModal, setShowDeleteTabModal] = useState(false)
  const [tabToDelete, setTabToDelete] = useState<string | null>(null)

  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setTabs(parsed.tabs || [])
          setActiveTabId(parsed.activeTabId || null)
        } catch (e) {
          console.error('Ошибка загрузки верификаций:', e)
          setTabs([])
          setActiveTabId(null)
        }
      } else {
        setTabs([])
        setActiveTabId(null)
      }
      setIsInitialized(true)
    }
  }, [storageKey])

  // Сохраняем данные в localStorage при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify({ tabs, activeTabId }))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, { tabs, activeTabId }).catch(console.error)
      }
    }
  }, [tabs, activeTabId, storageKey, isInitialized])

  const handleAddTab = () => {
    if (newTabFirstName.trim() && newTabLastName.trim()) {
      const newTab: VerificationTab = {
        id: Date.now().toString(),
        firstName: newTabFirstName.trim(),
        lastName: newTabLastName.trim(),
        stage: newTabStage.trim(),
        sites: []
      }
      setTabs([...tabs, newTab])
      setActiveTabId(newTab.id)
      setNewTabFirstName('')
      setNewTabLastName('')
      setNewTabStage('')
      setShowAddTabModal(false)
    }
  }

  const handleDeleteTab = (tabId: string) => {
    setTabToDelete(tabId)
    setShowDeleteTabModal(true)
  }

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      const updatedTabs = tabs.filter(tab => tab.id !== tabToDelete)
      setTabs(updatedTabs)
      if (activeTabId === tabToDelete) {
        setActiveTabId(updatedTabs.length > 0 ? updatedTabs[0].id : null)
      }
      setTabToDelete(null)
      setShowDeleteTabModal(false)
    }
  }

  const handleAddSite = () => {
    if (newSiteName.trim() && activeTabId) {
      const newSite: VerificationSite = {
        id: Date.now().toString(),
        name: newSiteName.trim(),
        status: 'no',
        comment: newSiteComment.trim() || undefined
      }
      setTabs(tabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, sites: [...tab.sites, newSite] }
          : tab
      ))
      setNewSiteName('')
      setNewSiteComment('')
      setShowAddSiteModal(false)
    }
  }

  const handleDeleteSite = (tabId: string, siteId: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, sites: tab.sites.filter(site => site.id !== siteId) }
        : tab
    ))
  }

  const handleToggleSiteStatus = (tabId: string, siteId: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { 
            ...tab, 
            sites: tab.sites.map(site => 
              site.id === siteId 
                ? { ...site, status: site.status === 'yes' ? 'no' : 'yes' }
                : site
            )
          }
        : tab
    ))
  }

  const handleUpdateSiteComment = (tabId: string, siteId: string, comment: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { 
            ...tab, 
            sites: tab.sites.map(site => 
              site.id === siteId 
                ? { ...site, comment: comment.trim() || undefined }
                : site
            )
          }
        : tab
    ))
  }

  const handleUpdateTabInfo = (tabId: string, field: 'firstName' | 'lastName' | 'stage', value: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, [field]: value }
        : tab
    ))
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className="space-y-6">
      {/* Вкладки */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowAddTabModal(true)}
            className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
          >
            + Добавить вкладку
          </button>
        </div>

        {tabs.length > 0 ? (
          <>
            {/* Навигация по вкладкам */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2 rounded-xl font-semibold transition whitespace-nowrap ${
                    activeTabId === tab.id
                      ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'bg-cursor-darker text-cursor-text hover:bg-cursor-lighter'
                  }`}
                >
                  {tab.firstName} {tab.lastName}{tab.stage && ` (${tab.stage})`}
                  {activeTabId === tab.id && tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTab(tab.id)
                      }}
                      className="ml-2 text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Контент активной вкладки */}
            {activeTab && (
              <div className="space-y-4">
                {/* Информация о модели */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-cursor-darker rounded-xl border border-cursor-border">
                  <div>
                    <label className="block mb-2 text-cursor-text-muted text-sm font-medium">Имя</label>
                    <input
                      type="text"
                      value={activeTab.firstName}
                      onChange={(e) => handleUpdateTabInfo(activeTab.id, 'firstName', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-cursor-text-muted text-sm font-medium">Фамилия</label>
                    <input
                      type="text"
                      value={activeTab.lastName}
                      onChange={(e) => handleUpdateTabInfo(activeTab.id, 'lastName', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-cursor-text-muted text-sm font-medium">Стейдж</label>
                    <input
                      type="text"
                      value={activeTab.stage}
                      onChange={(e) => handleUpdateTabInfo(activeTab.id, 'stage', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                      placeholder="Введите стейдж..."
                    />
                  </div>
                </div>

                {/* Кнопка добавления сайта */}
                <button
                  onClick={() => setShowAddSiteModal(true)}
                  className="w-full px-4 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
                >
                  + Добавить сайт
                </button>

                {/* Список сайтов */}
                {activeTab.sites.length > 0 ? (
                  <div className="space-y-2">
                    {activeTab.sites.map((site) => (
                      <div
                        key={site.id}
                        className="p-4 bg-cursor-darker border border-cursor-border rounded-xl"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="text-cursor-text font-medium mb-2">{site.name}</div>
                            <div className="mb-2">
                              <input
                                type="text"
                                value={site.comment || ''}
                                onChange={(e) => handleUpdateSiteComment(activeTab.id, site.id, e.target.value)}
                                className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text text-sm focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                                placeholder="Введите комментарий..."
                              />
                            </div>
                            <button
                              onClick={() => handleToggleSiteStatus(activeTab.id, site.id)}
                              className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                                site.status === 'yes'
                                  ? 'bg-green-900/30 border border-green-500/50 text-green-200 hover:bg-green-900/50'
                                  : 'bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-900/50'
                              }`}
                            >
                              {site.status === 'yes' ? 'Есть' : 'Нет'}
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteSite(activeTab.id, site.id)}
                            className="text-red-400 hover:text-red-300 ml-4"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-cursor-text-muted">
                    <p>Пока нет сайтов в этой вкладке</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-cursor-text-muted">
            <p className="text-xl mb-4">Пока нет вкладок</p>
            <p>Добавьте первую вкладку, чтобы начать</p>
          </div>
        )}
      </div>

      {/* Модальное окно добавления вкладки */}
      {showAddTabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Добавить вкладку</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Имя</label>
                <input
                  type="text"
                  value={newTabFirstName}
                  onChange={(e) => setNewTabFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите имя..."
                />
              </div>
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Фамилия</label>
                <input
                  type="text"
                  value={newTabLastName}
                  onChange={(e) => setNewTabLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите фамилию..."
                />
              </div>
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Стейдж</label>
                <input
                  type="text"
                  value={newTabStage}
                  onChange={(e) => setNewTabStage(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите стейдж..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddTabModal(false)
                    setNewTabFirstName('')
                    setNewTabLastName('')
                    setNewTabStage('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddTab}
                  disabled={!newTabFirstName.trim() || !newTabLastName.trim()}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления сайта */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Добавить сайт</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Название сайта</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Например: Порн Хаб"
                />
              </div>
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Комментарий</label>
                <input
                  type="text"
                  value={newSiteComment}
                  onChange={(e) => setNewSiteComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSite()}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите комментарий..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddSiteModal(false)
                    setNewSiteName('')
                    setNewSiteComment('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddSite}
                  disabled={!newSiteName.trim()}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления вкладки */}
      {showDeleteTabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить эту вкладку?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteTabModal(false)
                  setTabToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTab}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент плана
interface PlanTask {
  id: string
  title: string
  description: string
  executor?: string
  createdAt: string
  completed: boolean
}

function PlanComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `plan_${sectionId}_${itemId}` 
    : 'plan'
  
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskExecutor, setNewTaskExecutor] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsedTasks = JSON.parse(saved)
          if (Array.isArray(parsedTasks)) {
            // Добавляем дату создания для старых задач, у которых её нет
            const tasksWithDates = parsedTasks.map((task: PlanTask) => {
              if (!task.createdAt) {
                const now = new Date()
                task.createdAt = now.toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              }
              return task
            })
            setTasks(tasksWithDates)
          } else {
            setTasks([])
          }
        } catch (e) {
          console.error('Ошибка загрузки плана:', e)
          setTasks([])
        }
      } else {
        setTasks([])
      }
      setIsInitialized(true)
      setShowAddForm(false)
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskExecutor('')
    }
  }, [storageKey])

  // Сохраняем данные в localStorage и на сервер при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(tasks))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, tasks).catch(console.error)
      }
    }
  }, [tasks, storageKey, isInitialized])

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const now = new Date()
      const formattedDate = now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      const newTask: PlanTask = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        executor: newTaskExecutor.trim() || undefined,
        createdAt: formattedDate,
        completed: false
      }
      setTasks([...tasks, newTask])
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskExecutor('')
      setShowAddForm(false)
    }
  }

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ))
  }

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
    setShowDeleteModal(true)
  }

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      setTasks(tasks.filter(task => task.id !== taskToDelete))
      setShowDeleteModal(false)
      setTaskToDelete(null)
    }
  }

  const handleUpdateTask = (taskId: string, field: 'title' | 'description' | 'executor', value: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, [field]: value.trim() || undefined }
        : task
    ))
  }

  const completedTasks = tasks.filter(task => task.completed)
  const incompleteTasks = tasks.filter(task => !task.completed)

  return (
    <div className="space-y-6">
      {/* Кнопка добавления задачи */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить задачу
          </span>
        </button>
      </div>

      {/* Форма добавления задачи */}
      {showAddForm && (
        <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
          <h3 className="text-xl font-bold gradient-text mb-4">Добавить задачу</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-cursor-text font-medium">Название задачи</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="Введите название задачи..."
              />
            </div>
            <div>
              <label className="block mb-2 text-cursor-text font-medium">Описание</label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d resize-none"
                placeholder="Введите описание задачи..."
              />
            </div>
            <div>
              <label className="block mb-2 text-cursor-text font-medium">Исполнитель</label>
              <input
                type="text"
                value={newTaskExecutor}
                onChange={(e) => setNewTaskExecutor(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="Введите исполнителя..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewTaskTitle('')
                  setNewTaskDescription('')
                  setNewTaskExecutor('')
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Невыполненные задачи */}
      {incompleteTasks.length > 0 && (
        <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
          <h3 className="text-xl font-bold gradient-text mb-4">Невыполненные задачи</h3>
          <div className="space-y-3">
            {incompleteTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-cursor-darker border border-cursor-border rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                      task.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-cursor-border hover:border-cursor-primary'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text font-medium mb-2 focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                      placeholder="Название задачи..."
                    />
                    <textarea
                      value={task.description}
                      onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text text-sm mb-2 focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20 resize-none"
                      placeholder="Описание задачи..."
                    />
                    <input
                      type="text"
                      value={task.executor || ''}
                      onChange={(e) => handleUpdateTask(task.id, 'executor', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text text-sm mb-2 focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                      placeholder="Исполнитель..."
                    />
                    <div className="text-cursor-text-muted text-xs">
                      Дата создания: {task.createdAt || 'Не указана'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Выполненные задачи */}
      {completedTasks.length > 0 && (
        <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
          <h3 className="text-xl font-bold gradient-text mb-4">Выполненные задачи</h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-cursor-darker border border-cursor-border rounded-xl opacity-75"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                      task.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-cursor-border hover:border-cursor-primary'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text font-medium mb-2 line-through focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                      placeholder="Название задачи..."
                    />
                    <textarea
                      value={task.description}
                      onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text text-sm mb-2 line-through focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20 resize-none"
                      placeholder="Описание задачи..."
                    />
                    <input
                      type="text"
                      value={task.executor || ''}
                      onChange={(e) => handleUpdateTask(task.id, 'executor', e.target.value)}
                      className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text text-sm mb-2 line-through focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                      placeholder="Исполнитель..."
                    />
                    <div className="text-cursor-text-muted text-xs line-through">
                      Дата создания: {task.createdAt || 'Не указана'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {tasks.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-cursor-text-muted">
          <p className="text-xl mb-4">Пока нет задач</p>
          <p>Добавьте первую задачу, чтобы начать</p>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить эту задачу?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setTaskToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTask}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент 25-Кадр
interface Frame25Profile {
  id: string
  name: string // Например, "Ls001", "Ls002"
}

function Frame25Component({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `frame25_${sectionId}_${itemId}` 
    : 'frame25'
  
  // Отладка: проверяем передачу sectionId
  useEffect(() => {
    console.log('Frame25Component mounted:', { sectionId, itemId, storageKey })
  }, [sectionId, itemId, storageKey])
  
  const [profiles, setProfiles] = useState<Frame25Profile[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null)

  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProfiles(parsed)
          } else if (Array.isArray(parsed)) {
            setProfiles([])
          } else {
            setProfiles([])
          }
        } catch (e) {
          console.error('Ошибка загрузки 25-Кадр:', e)
          setProfiles([])
        }
      } else {
        setProfiles([])
      }
      setIsInitialized(true)
      setNewProfileName('')
      setShowAddForm(false)
    }
  }, [storageKey])

  // Функция для получения списка занятых профилей из ВСЕХ разделов
  const getUsedProfiles = (): string[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const used: string[] = []
      
      // Получаем все кастомные разделы
      const customSectionsStr = localStorage.getItem('customSections')
      if (!customSectionsStr) return []
      
      const customSections: CustomSection[] = JSON.parse(customSectionsStr)
      
      // Проверяем ВСЕ разделы и ВСЕ кнопки типа 'links' во всех разделах
      customSections.forEach(section => {
        section.items.forEach(item => {
          if (item.type === 'links') {
            const linksStorageKey = `links_${section.id}_${item.id}`
            const saved = localStorage.getItem(linksStorageKey)
            if (saved) {
              try {
                const links: LinkItem[] = JSON.parse(saved)
                links.forEach(link => {
                  if (link.profile) {
                    const profileName = link.profile.trim()
                    if (profileName && !used.includes(profileName)) {
                      used.push(profileName)
                    }
                  }
                })
              } catch (e) {
                console.error('Ошибка парсинга профилей:', e)
              }
            }
          }
        })
      })
      
      return used
    } catch (e) {
      console.error('Ошибка получения профилей:', e)
      return []
    }
  }

  // Обновляем статусы при изменении профилей в LinksComponent
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized && sectionId) {
      // Обновляем сразу при монтировании
      setForceUpdate(prev => prev + 1)
      
      // Проверяем изменения каждые 100мс для быстрого обновления
      const interval = setInterval(() => {
        setForceUpdate(prev => prev + 1)
      }, 100)

      // Также слушаем события storage для мгновенного обновления
      const handleStorageEvent = (e: StorageEvent) => {
        if (e.key && e.key.startsWith(`links_${sectionId}_`)) {
          setForceUpdate(prev => prev + 1)
        }
      }
      
      // Слушаем кастомное событие для обновления в том же окне
      const handleCustomStorageEvent = () => {
        setForceUpdate(prev => prev + 1)
      }
      
      window.addEventListener('storage', handleStorageEvent)
      window.addEventListener('profileUpdated', handleCustomStorageEvent)

      return () => {
        clearInterval(interval)
        window.removeEventListener('storage', handleStorageEvent)
        window.removeEventListener('profileUpdated', handleCustomStorageEvent)
      }
    }
  }, [sectionId, isInitialized])

  // Сохраняем данные в localStorage и на сервер при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify(profiles))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, profiles).catch(console.error)
      }
    }
  }, [profiles, storageKey, isInitialized])

  // Проверяем, занят ли профиль (используем forceUpdate для принудительного обновления)
  const isProfileUsed = (profileName: string): boolean => {
    // Используем forceUpdate для принудительного пересчета
    const _ = forceUpdate
    
    const usedProfiles = getUsedProfiles()
    const normalizedName = profileName.trim()
    const normalizedLower = normalizedName.toLowerCase()
    
    const found = usedProfiles.some(used => {
      const usedTrimmed = used.trim()
      const usedLower = usedTrimmed.toLowerCase()
      return usedTrimmed === normalizedName || usedLower === normalizedLower
    })
    
    return found
  }

  const handleAddProfile = () => {
    if (newProfileName.trim()) {
      const newProfile: Frame25Profile = {
        id: Date.now().toString(),
        name: newProfileName.trim()
      }
      setProfiles([...profiles, newProfile])
      setNewProfileName('')
      setShowAddForm(false)
    }
  }

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter(profile => profile.id !== id))
  }

  // Функция для копирования профиля в буфер обмена
  const handleCopyProfile = async (profile: Frame25Profile) => {
    try {
      await navigator.clipboard.writeText(profile.name)
      setCopiedProfileId(profile.id)
      // Убираем подсветку через 2 секунды
      setTimeout(() => {
        setCopiedProfileId(null)
      }, 2000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea')
      textArea.value = profile.name
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedProfileId(profile.id)
        setTimeout(() => {
          setCopiedProfileId(null)
        }, 2000)
      } catch (e) {
        console.error('Ошибка копирования (fallback):', e)
      }
      document.body.removeChild(textArea)
    }
  }

  // Сортируем профили по имени (Ls001, Ls002 и т.д.)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const numA = parseInt(a.name.replace(/[^0-9]/g, '')) || 0
    const numB = parseInt(b.name.replace(/[^0-9]/g, '')) || 0
    return numA - numB
  })

  // Профили теперь отображаются в flex-контейнере с автоматическим переносом

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить профиль
          </span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass rounded-xl p-6 border border-cursor-border mb-6">
          <h3 className="text-xl font-bold gradient-text mb-4">Новый профиль</h3>
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Название профиля</label>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddProfile()
                }
              }}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Например: Ls001"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewProfileName('')
              }}
              className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAddProfile}
              className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {sortedProfiles.length > 0 ? (
        <div className="glass rounded-xl p-6 border border-cursor-border card-3d overflow-hidden">
          <style jsx>{`
            .frame25-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              max-width: 100%;
            }
            .frame25-profile-item {
              width: 60px;
              min-width: 60px;
              max-width: 60px;
              flex-shrink: 0;
            }
            @media (max-width: 1920px) {
              .frame25-profile-item {
                width: 55px;
                min-width: 55px;
                max-width: 55px;
              }
            }
            @media (max-width: 1536px) {
              .frame25-profile-item {
                width: 50px;
                min-width: 50px;
                max-width: 50px;
              }
            }
            @media (max-width: 1280px) {
              .frame25-profile-item {
                width: 45px;
                min-width: 45px;
                max-width: 45px;
              }
            }
            @media (max-width: 1024px) {
              .frame25-profile-item {
                width: 40px;
                min-width: 40px;
                max-width: 40px;
              }
            }
            @media (max-width: 768px) {
              .frame25-profile-item {
                width: 35px;
                min-width: 35px;
                max-width: 35px;
              }
            }
            @media (max-width: 640px) {
              .frame25-profile-item {
                width: 30px;
                min-width: 30px;
                max-width: 30px;
              }
            }
            .frame25-container {
              max-width: 100%;
              overflow: hidden;
            }
          `}</style>
          <div className="frame25-container">
            <div className="frame25-grid">
              {sortedProfiles.map((profile) => {
                const isUsed = isProfileUsed(profile.name)
                const isCopied = copiedProfileId === profile.id
                return (
                  <div
                    key={profile.id}
                    onClick={() => handleCopyProfile(profile)}
                    className={`frame25-profile-item relative group flex flex-col items-center justify-center cursor-pointer min-h-[50px] ${
                      isCopied 
                        ? 'bg-blue-600/60 ring-2 ring-blue-400 shadow-lg shadow-blue-500/50' 
                        : isUsed 
                          ? 'bg-gray-700/40' 
                          : 'bg-green-600/40'
                    } rounded p-1 border ${
                      isCopied
                        ? 'border-blue-400/70'
                        : isUsed 
                          ? 'border-gray-600/50' 
                          : 'border-green-500/50'
                    } hover:opacity-80 hover:scale-105 transition-all duration-200`}
                  >
                    <div className="text-[10px] font-medium text-white text-center truncate w-full">
                      {profile.name}
                    </div>
                    <div className={`text-[8px] font-semibold text-center mt-0.5 ${
                      isCopied
                        ? 'text-blue-100'
                        : isUsed 
                          ? 'text-gray-300' 
                          : 'text-green-200'
                    }`}>
                      {isCopied ? 'Скопировано' : isUsed ? 'Занят' : 'Свободен'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProfile(profile.id)
                      }}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 rounded-full p-0.5 z-10"
                      title="Удалить"
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-cursor-text-muted">
          <p className="text-xl mb-4">Пока нет профилей</p>
          <p>Добавьте первый профиль, чтобы начать</p>
        </div>
      )}
    </div>
  )
}

// Компонент прокси
interface ProxyItem {
  id: string
  proxy: string
  name: string
  expiryDate: string // Формат: YYYY-MM-DD
}

interface ProxySection {
  id: string
  name: string
  proxies: ProxyItem[]
}

function ProxyComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `proxy_${sectionId}_${itemId}` 
    : 'proxy'
  
  const [sections, setSections] = useState<ProxySection[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [showAddProxyModal, setShowAddProxyModal] = useState(false)
  const [newProxy, setNewProxy] = useState('')
  const [newProxyName, setNewProxyName] = useState('')
  const [newProxyExpiryDate, setNewProxyExpiryDate] = useState('')
  const [copiedProxyId, setCopiedProxyId] = useState<string | null>(null)
  const [editingProxyId, setEditingProxyId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null)

  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setSections(parsed.sections || [])
          setActiveSectionId(parsed.activeSectionId || null)
        } catch (e) {
          console.error('Ошибка загрузки прокси:', e)
          setSections([])
          setActiveSectionId(null)
        }
      } else {
        setSections([])
        setActiveSectionId(null)
      }
      setIsInitialized(true)
      setNewProxy('')
      setNewProxyName('')
      setNewProxyExpiryDate('')
    }
  }, [storageKey])

  // Сохраняем данные в localStorage и на сервер при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(storageKey, JSON.stringify({ sections, activeSectionId }))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData(storageKey, { sections, activeSectionId }).catch(console.error)
      }
    }
  }, [sections, activeSectionId, storageKey, isInitialized])

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      const newSection: ProxySection = {
        id: Date.now().toString(),
        name: newSectionName.trim(),
        proxies: []
      }
      setSections([...sections, newSection])
      setActiveSectionId(newSection.id)
      setNewSectionName('')
      setShowAddSectionModal(false)
    }
  }

  const handleDeleteSection = (sectionId: string) => {
    setSectionToDelete(sectionId)
    setShowDeleteSectionModal(true)
  }

  const confirmDeleteSection = () => {
    if (sectionToDelete) {
      const updatedSections = sections.filter(section => section.id !== sectionToDelete)
      setSections(updatedSections)
      if (activeSectionId === sectionToDelete) {
        setActiveSectionId(updatedSections.length > 0 ? updatedSections[0].id : null)
      }
      setSectionToDelete(null)
      setShowDeleteSectionModal(false)
    }
  }

  const handleAddProxy = () => {
    if (newProxy.trim() && newProxyExpiryDate && activeSectionId) {
      const newProxyItem: ProxyItem = {
        id: Date.now().toString(),
        proxy: newProxy.trim(),
        name: newProxyName.trim() || 'Без названия',
        expiryDate: newProxyExpiryDate
      }
      setSections(sections.map(section => 
        section.id === activeSectionId 
          ? { ...section, proxies: [...section.proxies, newProxyItem] }
          : section
      ))
      setNewProxy('')
      setNewProxyName('')
      setNewProxyExpiryDate('')
      setShowAddProxyModal(false)
    }
  }

  const handleDeleteProxy = (sectionId: string, proxyId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, proxies: section.proxies.filter(proxy => proxy.id !== proxyId) }
        : section
    ))
  }

  const handleUpdateProxy = (sectionId: string, proxyId: string, field: 'proxy' | 'name' | 'expiryDate', value: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { 
            ...section, 
            proxies: section.proxies.map(proxy => 
              proxy.id === proxyId 
                ? { ...proxy, [field]: value }
                : proxy
            )
          }
        : section
    ))
  }

  const isProxyExpired = (expiryDate: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    return expiry < today
  }

  const handleCopyProxy = async (proxy: string, proxyId: string) => {
    if (!proxy) {
      return
    }
    try {
      await navigator.clipboard.writeText(proxy)
      setCopiedProxyId(proxyId)
      // Сбрасываем подсветку через 1 секунду
      setTimeout(() => {
        setCopiedProxyId(null)
      }, 1000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  const activeSection = sections.find(section => section.id === activeSectionId)

  return (
    <div className="space-y-6">
      {/* Разделы */}
      <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold gradient-text">Разделы прокси</h3>
          <button
            onClick={() => setShowAddSectionModal(true)}
            className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
          >
            + Добавить раздел
          </button>
        </div>

        {sections.length > 0 ? (
          <>
            {/* Навигация по разделам */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`px-4 py-2 rounded-xl font-semibold transition whitespace-nowrap ${
                    activeSectionId === section.id
                      ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'bg-cursor-darker text-cursor-text hover:bg-cursor-lighter'
                  }`}
                >
                  {section.name}
                  {activeSectionId === section.id && sections.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSection(section.id)
                      }}
                      className="ml-2 text-white hover:text-red-300"
                    >
                      ×
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Контент активного раздела */}
            {activeSection && (
              <div className="space-y-4">
                {/* Кнопка добавления прокси */}
                <button
                  onClick={() => setShowAddProxyModal(true)}
                  className="w-full px-4 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
                >
                  + Добавить прокси
                </button>

                {/* Список прокси */}
                {activeSection.proxies.length > 0 ? (
                  <div className="space-y-3">
                    {activeSection.proxies.map((proxy) => {
                      const expired = isProxyExpired(proxy.expiryDate)
                      return (
                        <div
                          key={proxy.id}
                          className={`p-4 rounded-xl border ${
                            expired
                              ? 'bg-red-900/20 border-red-500/50'
                              : 'bg-cursor-darker border-cursor-border'
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block mb-2 text-cursor-text-muted text-sm font-medium">Название</label>
                              <input
                                type="text"
                                value={proxy.name}
                                onChange={(e) => handleUpdateProxy(activeSection.id, proxy.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                                placeholder="Название прокси..."
                              />
                            </div>
                            <div>
                              <label className="block mb-2 text-cursor-text-muted text-sm font-medium">Прокси</label>
                              <div className="flex gap-2">
                                {editingProxyId === proxy.id ? (
                                  <>
                                    <input
                                      type="text"
                                      value={proxy.proxy}
                                      onChange={(e) => handleUpdateProxy(activeSection.id, proxy.id, 'proxy', e.target.value)}
                                      onBlur={() => setEditingProxyId(null)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          setEditingProxyId(null)
                                        }
                                      }}
                                      className="flex-1 px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20"
                                      placeholder="Прокси..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => setEditingProxyId(null)}
                                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                      ✓
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleCopyProxy(proxy.proxy, proxy.id)}
                                      className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-left ${
                                        copiedProxyId === proxy.id
                                          ? 'bg-green-600/50 border-2 border-green-400 text-white scale-105 shadow-lg shadow-green-500/50'
                                          : proxy.proxy
                                          ? 'bg-cursor-dark border border-cursor-border text-cursor-text hover:bg-cursor-lighter hover:border-cursor-primary cursor-pointer'
                                          : 'bg-cursor-dark border border-cursor-border text-cursor-text-muted cursor-not-allowed'
                                      }`}
                                      disabled={!proxy.proxy}
                                    >
                                      <div className="text-sm break-all">
                                        {proxy.proxy || 'Не заполнено'}
                                      </div>
                                    </button>
                                    <button
                                      onClick={() => setEditingProxyId(proxy.id)}
                                      className="px-3 py-2 bg-cursor-darker hover:bg-cursor-lighter border border-cursor-border text-cursor-text rounded-lg"
                                      title="Редактировать"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block mb-2 text-cursor-text-muted text-sm font-medium">До какого числа</label>
                              <input
                                type="date"
                                value={proxy.expiryDate}
                                onChange={(e) => handleUpdateProxy(activeSection.id, proxy.id, 'expiryDate', e.target.value)}
                                className={`w-full px-3 py-2 bg-cursor-dark border rounded-lg text-cursor-text focus:outline-none focus:ring-1 focus:ring-cursor-primary/20 ${
                                  expired
                                    ? 'border-red-500/50'
                                    : 'border-cursor-border focus:border-cursor-primary'
                                }`}
                              />
                              {expired && (
                                <p className="text-red-400 text-xs mt-1">Прокси истекла!</p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDeleteProxy(activeSection.id, proxy.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-cursor-text-muted">
                    <p>Пока нет прокси в этом разделе</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-cursor-text-muted">
            <p className="text-xl mb-4">Пока нет разделов</p>
            <p>Добавьте первый раздел, чтобы начать</p>
          </div>
        )}
      </div>

      {/* Модальное окно добавления раздела */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Добавить раздел</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Название раздела</label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите название раздела..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddSectionModal(false)
                    setNewSectionName('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddSection}
                  disabled={!newSectionName.trim()}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления прокси */}
      {showAddProxyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Добавить прокси</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Название прокси</label>
                <input
                  type="text"
                  value={newProxyName}
                  onChange={(e) => setNewProxyName(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите название прокси..."
                />
              </div>
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Прокси</label>
                <input
                  type="text"
                  value={newProxy}
                  onChange={(e) => setNewProxy(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите прокси..."
                />
              </div>
              <div>
                <label className="block mb-2 text-cursor-text font-medium">До какого числа</label>
                <input
                  type="date"
                  value={newProxyExpiryDate}
                  onChange={(e) => setNewProxyExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddProxyModal(false)
                    setNewProxy('')
                    setNewProxyName('')
                    setNewProxyExpiryDate('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddProxy}
                  disabled={!newProxy.trim() || !newProxyExpiryDate}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TrainingComponent({ sectionId, itemId }: { sectionId?: string | null, itemId?: string | null }) {
  // Создаем уникальный ключ для localStorage на основе sectionId и itemId
  const storageKey = sectionId && itemId 
    ? `training_${sectionId}_${itemId}` 
    : 'training' // Для основного раздела Reddit используем старый ключ
  
  const [trainingItems, setTrainingItems] = useState<TrainingItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false)
  const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null)
  
  // Загружаем данные при монтировании и при изменении storageKey
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('Загрузка обучения из localStorage:', {
            storageKey,
            itemsCount: Array.isArray(parsed) ? parsed.length : 0,
            items: Array.isArray(parsed) ? parsed.map(item => ({
              id: item.id,
              title: item.title,
              videosCount: item.videos?.length || 0,
              imagesCount: item.images?.length || 0,
              hasImages: !!item.images && Array.isArray(item.images) && item.images.length > 0
            })) : []
          })
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Проверяем, что у каждого элемента есть массив images
            const validatedItems = parsed.map(item => ({
              ...item,
              images: Array.isArray(item.images) ? item.images : [],
              videos: Array.isArray(item.videos) ? item.videos : []
            }))
            console.log('Валидированные элементы обучения:', validatedItems.map(item => ({
              id: item.id,
              imagesCount: item.images.length,
              images: item.images.length > 0 ? item.images.map((img: string, i: number) => ({ index: i, preview: img.substring(0, 50) })) : []
            })))
            setTrainingItems(validatedItems)
          } else if (Array.isArray(parsed)) {
            setTrainingItems([])
          } else {
            setTrainingItems([])
          }
        } catch (e) {
          console.error('Ошибка загрузки обучения:', e)
          setTrainingItems([])
        }
      } else {
        setTrainingItems([])
      }
      setIsInitialized(true)
      // Сбрасываем форму при смене раздела
      setShowAddForm(false)
      setSelectedTrainingId(null)
      setCurrentTitle('')
      setCurrentText('')
      setCurrentVideos([])
      setCurrentImages([])
      setVideoPreview(null)
      setImagePreview(null)
    }
  }, [storageKey])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentText, setCurrentText] = useState('')
  const [currentVideos, setCurrentVideos] = useState<string[]>([])
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('Выбран файл видео:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2),
        isVideo: file.type.startsWith('video/')
      })
      
      if (!file.type.startsWith('video/')) {
        console.warn('⚠️ Выбранный файл не является видео!')
        return
      }
      
      // Проверяем размер файла (предупреждение если больше 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn('⚠️ Файл видео большой (>5MB), это может вызвать проблемы с localStorage')
      }
      
      setVideoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('Video preview loaded:', {
          hasResult: !!result,
          resultType: typeof result,
          resultLength: result ? result.length : 0,
          preview: result ? result.substring(0, 50) : 'null',
          startsWithData: result ? result.startsWith('data:') : false
        })
        
        if (result && typeof result === 'string' && result.length > 0) {
          setVideoPreview(result)
          console.log('✅ Preview видео установлен')
        } else {
          console.error('❌ Некорректный результат чтения файла видео')
          setVideoPreview(null)
        }
      }
      reader.onerror = (error) => {
        console.error('❌ Error reading video file:', error)
        setVideoPreview(null)
      }
      reader.onabort = () => {
        console.warn('⚠️ Чтение файла видео прервано')
        setVideoPreview(null)
      }
      reader.readAsDataURL(file)
    } else {
      console.warn('⚠️ Файл видео не выбран')
    }
  }

  const handleAddVideo = () => {
    console.log('🎥 handleAddVideo вызван')
    console.log('📊 Состояние перед добавлением:', {
      videoPreview: videoPreview ? {
        exists: true,
        length: videoPreview.length,
        preview: videoPreview.substring(0, 50),
        type: typeof videoPreview
      } : { exists: false },
      currentVideosCount: currentVideos.length,
      currentVideos: currentVideos.map((vid, i) => ({
        index: i,
        preview: vid ? vid.substring(0, 30) : 'null'
      }))
    })
    
    if (videoPreview) {
      console.log('✅ videoPreview существует, добавляем в currentVideos')
      console.log('Adding video to currentVideos:', {
        currentCount: currentVideos.length,
        previewLength: videoPreview.length,
        previewStart: videoPreview.substring(0, 50),
        previewType: typeof videoPreview,
        isValid: typeof videoPreview === 'string' && videoPreview.length > 0 && videoPreview.startsWith('data:')
      })
      
      if (typeof videoPreview !== 'string' || videoPreview.length === 0) {
        console.error('❌ Некорректный preview видео!')
        return
      }
      
      if (!videoPreview.startsWith('data:')) {
        console.warn('⚠️ Preview не начинается с data:, возможно проблема с чтением файла')
      }
      
      // Используем функциональное обновление состояния для гарантии актуальности
      setCurrentVideos(prevVideos => {
        const updatedVideos = [...prevVideos, videoPreview]
        console.log('🔄 Обновление currentVideos через функциональное обновление:', {
          prevCount: prevVideos.length,
          newCount: updatedVideos.length,
          videos: updatedVideos.map((vid, i) => ({
            index: i,
            length: vid ? vid.length : 0,
            preview: vid ? vid.substring(0, 50) : 'null'
          }))
        })
        return updatedVideos
      })
      
      setVideoFile(null)
      setVideoPreview(null)
      // Сброс input для возможности повторного выбора того же файла
      const input = document.getElementById('video-upload') as HTMLInputElement
      if (input) input.value = ''
      
      console.log('✅ Видео добавлено в список (setCurrentVideos вызван)')
    } else {
      console.warn('⚠️ No video preview to add - videoPreview пустой или null')
      console.warn('   Проверьте, что файл был выбран и прочитан успешно')
    }
  }

  const handleRemoveVideo = (index: number) => {
    setCurrentVideos(currentVideos.filter((_, i) => i !== index))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('Выбран файл изображения:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2)
      })
      
      // Проверяем размер файла (предупреждение если больше 2MB)
      if (file.size > 2 * 1024 * 1024) {
        console.warn('⚠️ Файл изображения большой (>2MB), это может вызвать проблемы с localStorage')
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('Image preview loaded:', {
          hasResult: !!result,
          resultType: typeof result,
          resultLength: result ? result.length : 0,
          preview: result ? result.substring(0, 50) : 'null',
          startsWithData: result ? result.startsWith('data:') : false
        })
        
        if (result && typeof result === 'string' && result.length > 0) {
          setImagePreview(result)
          console.log('✅ Preview изображения установлен')
        } else {
          console.error('❌ Некорректный результат чтения файла')
          setImagePreview(null)
        }
      }
      reader.onerror = (error) => {
        console.error('❌ Error reading image file:', error)
        setImagePreview(null)
      }
      reader.onabort = () => {
        console.warn('⚠️ Чтение файла прервано')
        setImagePreview(null)
      }
      reader.readAsDataURL(file)
    } else {
      console.warn('⚠️ Файл не выбран')
    }
  }

  const handleAddImage = () => {
    console.log('🖼️ handleAddImage вызван')
    console.log('📊 Состояние перед добавлением:', {
      imagePreview: imagePreview ? {
        exists: true,
        length: imagePreview.length,
        preview: imagePreview.substring(0, 50),
        type: typeof imagePreview
      } : { exists: false },
      currentImagesCount: currentImages.length,
      currentImages: currentImages.map((img, i) => ({
        index: i,
        preview: img ? img.substring(0, 30) : 'null'
      }))
    })
    
    if (imagePreview) {
      console.log('✅ imagePreview существует, добавляем в currentImages')
      console.log('Adding image to currentImages:', {
        currentCount: currentImages.length,
        previewLength: imagePreview.length,
        previewStart: imagePreview.substring(0, 50),
        previewType: typeof imagePreview,
        isValid: typeof imagePreview === 'string' && imagePreview.length > 0 && imagePreview.startsWith('data:')
      })
      
      if (typeof imagePreview !== 'string' || imagePreview.length === 0) {
        console.error('❌ Некорректный preview изображения!')
        return
      }
      
      if (!imagePreview.startsWith('data:')) {
        console.warn('⚠️ Preview не начинается с data:, возможно проблема с чтением файла')
      }
      
      // Используем функциональное обновление состояния для гарантии актуальности
      setCurrentImages(prevImages => {
        const updatedImages = [...prevImages, imagePreview]
        console.log('🔄 Обновление currentImages через функциональное обновление:', {
          prevCount: prevImages.length,
          newCount: updatedImages.length,
          images: updatedImages.map((img, i) => ({
            index: i,
            length: img ? img.length : 0,
            preview: img ? img.substring(0, 50) : 'null'
          }))
        })
        return updatedImages
      })
      
      setImageFile(null)
      setImagePreview(null)
      // Сброс input для возможности повторного выбора того же файла
      const input = document.getElementById('image-upload') as HTMLInputElement
      if (input) input.value = ''
      
      console.log('✅ Изображение добавлено в список (setCurrentImages вызван)')
    } else {
      console.warn('⚠️ No image preview to add - imagePreview пустой или null')
      console.warn('   Проверьте, что файл был выбран и прочитан успешно')
    }
  }

  const handleRemoveImage = (index: number) => {
    setCurrentImages(currentImages.filter((_, i) => i !== index))
  }

  // Отслеживаем изменения currentImages для отладки
  useEffect(() => {
    console.log('🔄 currentImages изменился:', {
      count: currentImages.length,
      images: currentImages.map((img, i) => ({
        index: i,
        isValid: !!img && typeof img === 'string' && img.length > 0,
        preview: img ? img.substring(0, 50) : 'null',
        length: img ? img.length : 0
      }))
    })
  }, [currentImages])

  // Отслеживаем изменения currentVideos для отладки
  useEffect(() => {
    console.log('🔄 currentVideos изменился:', {
      count: currentVideos.length,
      videos: currentVideos.map((vid, i) => ({
        index: i,
        isValid: !!vid && typeof vid === 'string' && vid.length > 0,
        preview: vid ? vid.substring(0, 50) : 'null',
        length: vid ? vid.length : 0
      }))
    })
  }, [currentVideos])

  const handleSaveTraining = () => {
    console.log('💾 handleSaveTraining вызван')
    console.log('📊 Текущее состояние перед сохранением:', {
      currentTitle: currentTitle,
      currentTextLength: currentText.length,
      currentVideosCount: currentVideos.length,
      currentImagesCount: currentImages.length,
      currentVideos: currentVideos,
      currentImages: currentImages,
      videoPreview: videoPreview ? 'есть' : 'нет',
      imagePreview: imagePreview ? 'есть' : 'нет'
    })
    
    if (currentText.trim() && currentTitle.trim()) {
      console.log('Saving training item:', {
        title: currentTitle.trim(),
        textLength: currentText.length,
        videosCount: currentVideos.length,
        imagesCount: currentImages.length,
        images: currentImages.map((img, i) => ({ 
          index: i, 
          preview: img ? img.substring(0, 50) : 'null',
          length: img ? img.length : 0
        }))
      })
      
      // Проверяем, что видео действительно есть
      if (currentVideos.length > 0) {
        console.log('✅ Видео перед сохранением:', currentVideos.map((vid, i) => ({
          index: i,
          isValid: !!vid && typeof vid === 'string' && vid.length > 0,
          startsWith: vid ? vid.substring(0, 20) : 'null'
        })))
      } else {
        console.warn('⚠️ ВНИМАНИЕ: currentVideos пустой при сохранении!')
        console.warn('   Проверьте, что вы нажали кнопку "Добавить" после выбора видео')
      }
      
      // Проверяем, что изображения действительно есть
      if (currentImages.length > 0) {
        console.log('✅ Изображения перед сохранением:', currentImages.map((img, i) => ({
          index: i,
          isValid: !!img && typeof img === 'string' && img.length > 0,
          startsWith: img ? img.substring(0, 20) : 'null'
        })))
      } else {
        console.warn('⚠️ ВНИМАНИЕ: currentImages пустой при сохранении!')
        console.warn('   Проверьте, что вы нажали кнопку "Добавить фото" после выбора файла')
      }
      
      // Если есть videoPreview, но его нет в currentVideos, добавляем его
      const videosToSave = videoPreview && !currentVideos.includes(videoPreview) 
        ? [...currentVideos, videoPreview]
        : currentVideos
      
      // Если есть imagePreview, но его нет в currentImages, добавляем его
      const imagesToSave = imagePreview && !currentImages.includes(imagePreview)
        ? [...currentImages, imagePreview]
        : currentImages
      
      if (videoPreview && !currentVideos.includes(videoPreview)) {
        console.warn('⚠️ Обнаружен videoPreview, который не добавлен в currentVideos!')
        console.warn('   Добавляем его автоматически...')
      }
      
      if (imagePreview && !currentImages.includes(imagePreview)) {
        console.warn('⚠️ Обнаружен imagePreview, который не добавлен в currentImages!')
        console.warn('   Добавляем его автоматически...')
      }
      
      // Если были добавлены preview автоматически, сохраняем с ними
      if ((videoPreview && !currentVideos.includes(videoPreview)) || 
          (imagePreview && !currentImages.includes(imagePreview))) {
        const newItem: TrainingItem = {
          id: Date.now().toString(),
          title: currentTitle.trim(),
          text: currentText,
          videos: Array.isArray(videosToSave) ? videosToSave : [],
          images: Array.isArray(imagesToSave) ? imagesToSave : [],
        }
        console.log('✅ Создан элемент с автоматически добавленными preview:', {
          id: newItem.id,
          videosCount: newItem.videos.length,
          imagesCount: newItem.images.length
        })
        setTrainingItems([...trainingItems, newItem])
        setCurrentTitle('')
        setCurrentText('')
        setCurrentVideos([])
        setCurrentImages([])
        setVideoPreview(null)
        setImagePreview(null)
        setShowAddForm(false)
        return
      }
      
      const newItem: TrainingItem = {
        id: Date.now().toString(),
        title: currentTitle.trim(),
        text: currentText,
        videos: Array.isArray(currentVideos) ? currentVideos : [],
        images: Array.isArray(currentImages) ? currentImages : [],
      }
      
      console.log('Созданный элемент обучения:', {
        id: newItem.id,
        title: newItem.title,
        videosCount: newItem.videos.length,
        imagesCount: newItem.images.length,
        images: newItem.images.map((img, i) => ({ index: i, preview: img ? img.substring(0, 50) : 'null' }))
      })
      
      const updatedItems = [...trainingItems, newItem]
      console.log('Обновленный список элементов:', updatedItems.map(item => ({
        id: item.id,
        imagesCount: item.images?.length || 0
      })))
      
      setTrainingItems(updatedItems)
      setCurrentTitle('')
      setCurrentText('')
      setCurrentVideos([])
      setCurrentImages([])
      setVideoPreview(null)
      setImagePreview(null)
      setShowAddForm(false)
    } else {
      console.warn('⚠️ Нельзя сохранить: отсутствует title или text')
    }
  }

  const handleDeleteTraining = (id: string) => {
    setTrainingToDelete(id)
    setShowDeleteSectionModal(true)
  }

  const confirmDeleteTraining = () => {
    if (trainingToDelete) {
      setTrainingItems(trainingItems.filter(item => item.id !== trainingToDelete))
      setTrainingToDelete(null)
      setShowDeleteSectionModal(false)
    }
  }

  // Сохраняем обучение в localStorage при изменении (только после инициализации)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      try {
        const dataToSave = trainingItems.map(item => ({
          ...item,
          images: Array.isArray(item.images) ? item.images : [],
          videos: Array.isArray(item.videos) ? item.videos : []
        }))
        console.log('Сохранение обучения в localStorage:', {
          storageKey,
          itemsCount: dataToSave.length,
          items: dataToSave.map(item => ({
            id: item.id,
            title: item.title,
            videosCount: item.videos.length,
            imagesCount: item.images.length,
            images: item.images.length > 0 ? item.images.map((img: string, i: number) => ({ 
              index: i, 
              preview: img ? img.substring(0, 50) : 'null',
              length: img ? img.length : 0
            })) : []
          }))
        })
        const jsonString = JSON.stringify(dataToSave)
        const sizeInBytes = new Blob([jsonString]).size
        const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2)
        const sizeInKB = (sizeInBytes / 1024).toFixed(2)
        console.log(`📊 Размер данных для сохранения: ${sizeInMB} MB (${sizeInKB} KB, ${sizeInBytes} байт)`)
        
        if (sizeInBytes > 5 * 1024 * 1024) {
          console.warn('⚠️ ВНИМАНИЕ: Размер данных превышает 5MB, могут возникнуть проблемы с localStorage!')
        }
        
        localStorage.setItem(storageKey, jsonString)
        console.log('✅ Обучение успешно сохранено в localStorage')
        
        // Сохраняем на сервер
        const token = localStorage.getItem('token')
        if (token) {
          saveUserData(storageKey, dataToSave).catch(console.error)
        }
        
        // Немедленно синхронизируем с MEGA после сохранения обучения
        setTimeout(async () => {
          try {
            console.log('🔄 Запуск синхронизации с MEGA после сохранения обучения...')
            const { syncToMegoAPI } = await import('@/lib/mego-sync')
            const success = await syncToMegoAPI()
            if (success) {
              console.log('✅ Обучение синхронизировано с MEGA')
            } else {
              console.warn('⚠️ Не удалось синхронизировать обучение с MEGA')
            }
          } catch (syncError) {
            console.error('❌ Ошибка синхронизации обучения с MEGA:', syncError)
          }
        }, 500) // Небольшая задержка для завершения сохранения в localStorage
      } catch (e) {
        console.error('❌ Ошибка сохранения обучения в localStorage:', e)
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.error('⚠️ Превышен лимит localStorage! Попробуйте удалить старые данные или уменьшить размер изображений.')
        }
      }
    }
  }, [trainingItems, storageKey, isInitialized])

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить обучение
          </span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass rounded-xl p-6 border border-cursor-border mb-6">
          <h3 className="text-xl font-bold gradient-text mb-4">Новое обучение</h3>
          
          {/* Название */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Название</label>
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
              placeholder="Введите название обучения..."
            />
          </div>
          
          {/* Текст */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Текст</label>
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 resize-none input-3d"
              rows={6}
              placeholder="Введите текст обучения..."
            />
          </div>

          {/* Видео */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Видео</label>
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="flex-1 px-4 py-2 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text cursor-pointer hover:bg-cursor-lighter transition text-center"
              >
                Выбрать видео
              </label>
              {videoPreview && (
                <button
                  onClick={handleAddVideo}
                  className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-3d"
                >
                  Добавить
                </button>
              )}
            </div>
            {videoPreview && (
              <div className="mb-2">
                <video src={videoPreview} controls className="max-w-md rounded-lg border border-cursor-border" />
              </div>
            )}
            {currentVideos.length > 0 && (
              <div className="mt-2">
                <h4 className="text-cursor-text-muted text-sm mb-2">Добавленные видео ({currentVideos.length}):</h4>
                <div className="space-y-2">
                  {currentVideos.map((video, index) => {
                    console.log('Отображение видео в форме:', {
                      index,
                      hasVideo: !!video,
                      videoType: typeof video,
                      videoLength: video ? video.length : 0,
                      preview: video ? video.substring(0, 50) : 'null'
                    })
                    if (!video || typeof video !== 'string' || video.length === 0) {
                      console.warn(`Пропуск пустого видео с индексом ${index}`)
                      return null
                    }
                    return (
                      <div key={index} className="relative bg-cursor-darker rounded-lg p-2">
                        <video 
                          src={video} 
                          controls 
                          className="w-full rounded-lg border border-cursor-border"
                          onError={(e) => {
                            console.error('Ошибка загрузки видео в форме:', index, video ? video.substring(0, 100) : 'null')
                            e.currentTarget.style.display = 'none'
                          }}
                          onLoadStart={() => {
                            console.log('Видео в форме начало загрузку:', index)
                          }}
                        />
                        <button
                          onClick={() => handleRemoveVideo(index)}
                          className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-black/50 rounded-full p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Фото */}
          <div className="mb-4">
            <label className="block mb-2 text-cursor-text font-medium">Фото</label>
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex-1 px-4 py-2 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text cursor-pointer hover:bg-cursor-lighter transition text-center"
              >
                {imageFile ? imageFile.name : 'Выбрать фото'}
              </label>
              {imagePreview && (
                <button
                  onClick={handleAddImage}
                  className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-3d hover:opacity-90 transition"
                >
                  Добавить фото
                </button>
              )}
            </div>
            {imagePreview && (
              <div className="mb-2 p-2 bg-cursor-darker rounded-lg border border-cursor-border">
                <h4 className="text-cursor-text-muted text-sm mb-2">Предпросмотр фото:</h4>
                <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg border border-cursor-border" />
                <p className="text-cursor-text-muted text-xs mt-2">Нажмите "Добавить фото", чтобы добавить это изображение в обучение</p>
              </div>
            )}
            {currentImages.length > 0 && (
              <div className="mt-2">
                <h4 className="text-cursor-text-muted text-sm mb-2">Добавленные фото ({currentImages.length}):</h4>
                <div className="grid grid-cols-3 gap-2">
                  {currentImages.map((image, index) => {
                    console.log('Отображение изображения в форме:', {
                      index,
                      hasImage: !!image,
                      imageType: typeof image,
                      imageLength: image ? image.length : 0,
                      preview: image ? image.substring(0, 50) : 'null'
                    })
                    if (!image || typeof image !== 'string' || image.length === 0) {
                      console.warn(`Пропуск пустого изображения в форме с индексом ${index}`)
                      return null
                    }
                    return (
                      <div key={index} className="relative">
                        <img 
                          src={image} 
                          alt={`Training ${index + 1}`} 
                          className="w-full h-24 object-cover rounded-lg border border-cursor-border"
                          onError={(e) => {
                            console.error('Ошибка загрузки изображения в форме:', index, image ? image.substring(0, 100) : 'null')
                            e.currentTarget.style.display = 'none'
                          }}
                          onLoad={() => {
                            console.log('Изображение в форме загружено успешно:', index)
                          }}
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 text-red-400 hover:text-red-300 bg-black/50 rounded-full p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowAddForm(false)
                setCurrentTitle('')
                setCurrentText('')
                setCurrentVideos([])
                setCurrentImages([])
                setVideoPreview(null)
                setImagePreview(null)
              }}
              className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-3d"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveTraining}
              disabled={!currentText.trim() || !currentTitle.trim()}
              className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Список обучений */}
      {trainingItems.length > 0 ? (
        <div className="space-y-4">
          {trainingItems.map((item) => (
            <div 
              key={item.id}
              className="glass rounded-xl p-4 border border-cursor-border card-3d cursor-pointer hover:bg-cursor-lighter transition"
              onClick={() => setSelectedTrainingId(item.id)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold gradient-text">{item.title || `Обучение #${item.id}`}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTraining(item.id)
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-cursor-text-muted">
          <p className="text-xl mb-4">Пока нет обучений</p>
          <p>Добавьте первое обучение, чтобы начать</p>
        </div>
      )}

      {/* Модальное окно просмотра обучения */}
      {selectedTrainingId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTrainingId(null)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const item = trainingItems.find(t => t.id === selectedTrainingId)
              if (!item) return null
              
              return (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold gradient-text">{item.title || `Обучение #${item.id}`}</h2>
                    <button
                      onClick={() => setSelectedTrainingId(null)}
                      className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
                    >
                      ×
                    </button>
                  </div>

                  {/* Текст */}
                  <div className="mb-6">
                    <p className="text-cursor-text whitespace-pre-wrap text-lg">{item.text}</p>
                  </div>

                  {/* Видео */}
                  {item.videos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-cursor-text-muted font-medium mb-4 text-xl">Видео:</h4>
                      <div className="space-y-4">
                        {item.videos.map((video, index) => (
                          <div key={index} className="bg-cursor-darker rounded-lg p-4">
                            <video 
                              src={video} 
                              controls 
                              className="w-full rounded-lg border border-cursor-border"
                              style={{ maxHeight: '500px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Фото */}
                  {(() => {
                    const images = item.images || []
                    const hasImages = Array.isArray(images) && images.length > 0
                    console.log('Отображение изображений для элемента:', {
                      itemId: item.id,
                      imagesArray: images,
                      imagesCount: images.length,
                      hasImages,
                      images: images.map((img: string, i: number) => ({
                        index: i,
                        isValid: !!img && typeof img === 'string' && img.length > 0,
                        preview: img ? img.substring(0, 50) : 'null'
                      }))
                    })
                    
                    if (hasImages) {
                      return (
                        <div>
                          <h4 className="text-cursor-text-muted font-medium mb-4 text-xl">Фото:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((image: string, index: number) => {
                              if (!image || typeof image !== 'string' || image.length === 0) {
                                console.warn(`Пропуск пустого изображения с индексом ${index}`)
                                return null
                              }
                              console.log('Rendering image:', index, image.substring(0, 50))
                              return (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`Training image ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-cursor-border hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(image, '_blank')}
                                  onError={(e) => {
                                    console.error('Error loading image:', index, image ? image.substring(0, 100) : 'null')
                                    e.currentTarget.style.display = 'none'
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', index)
                                  }}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    } else {
                      console.log('No images in item:', item.id, 'images:', images, 'type:', typeof images, 'isArray:', Array.isArray(images))
                      return (
                        <div className="text-cursor-text-muted text-sm py-4">
                          <p>Фото не добавлены</p>
                        </div>
                      )
                    }
                  })()}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления раздела */}
      {showDeleteSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-cursor-border card-3d max-w-md w-full mx-4">
            <h3 className="text-xl font-bold gradient-text mb-4">Подтвердите удаление</h3>
            <p className="text-cursor-text mb-6">
              Вы уверены, что хотите удалить это обучение?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteSectionModal(false)
                  setTrainingToDelete(null)
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTraining}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold btn-3d transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Функция форматирования возраста аккаунта как на Reddit (1 m, 30 d, 1 y)
function formatAccountAge(days: number): string {
  if (!days || days <= 0) return '0 d'
  
  if (days >= 365) {
    const years = Math.floor(days / 365)
    return `${years} ${years === 1 ? 'y' : 'y'}`
  } else if (days >= 30) {
    const months = Math.floor(days / 30)
    return `${months} ${months === 1 ? 'm' : 'm'}`
  } else {
    return `${days} ${days === 1 ? 'd' : 'd'}`
  }
}

interface RedditAccount {
  id: string
  redditUrl: string
  username?: string
  email: string
  password: string
  avatarUrl?: string
  stats?: {
    comments: number
    karma: number
    accountAge: number
    posts: number
    subscribers: number
    contributions?: number
    goldEarned?: number
    activeIn?: number
  }
}

export default function DashboardPage(): JSX.Element {
  const router = useRouter()
  const [accounts, setAccounts] = useState<RedditAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [loadingUserInfo, setLoadingUserInfo] = useState(true)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [cabinetMembers, setCabinetMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberPermissions, setNewMemberPermissions] = useState({
    canView: true,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
  })
  const [invitations, setInvitations] = useState<any[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [pendingInvitation, setPendingInvitation] = useState<any>(null)
  const [activeView, setActiveView] = useState<'accounts' | 'stats' | 'training' | 'reports' | 'settings' | 'extensions' | 'links' | 'nextcloud' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeView') as 'accounts' | 'stats' | 'training' | 'reports' | 'settings' | 'extensions' | 'links' | 'nextcloud' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25' | null
      return saved || 'accounts'
    }
    return 'accounts'
  })
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [language, setLanguage] = useState<'ru' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as 'ru' | 'en' | null
      return saved || 'ru'
    }
    return 'ru'
  })
  const [activeTab, setActiveTab] = useState<'reddit'>('reddit')
  const [redditMenuOpen, setRedditMenuOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('redditMenuOpen')
      return saved === 'true'
    }
    return false
  })
  
  // Сохраняем язык в localStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language)
    }
  }, [language])

  // Сохраняем состояние меню Reddit в localStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('redditMenuOpen', redditMenuOpen.toString())
    }
  }, [redditMenuOpen])

  // Сохраняем активный вид в localStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeView', activeView)
    }
  }, [activeView])
  
  // Кастомные разделы (интерфейс определен в начале файла)
  
  // Загружаем кастомные разделы из localStorage при монтировании
  const [customSections, setCustomSections] = useState<CustomSection[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customSections')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Ошибка загрузки кастомных разделов:', e)
          return []
        }
      }
    }
    return []
  })
  
  const [openCustomMenus, setOpenCustomMenus] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openCustomMenus')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Ошибка загрузки состояния меню:', e)
          return {}
        }
      }
    }
    return {}
  })
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  // Функция для получения названия кнопки по типу
  const getButtonNameByType = (type: 'training' | 'reports' | 'custom' | 'links' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25'): string => {
    switch (type) {
      case 'training':
        return 'ОБУЧЕНИЕ'
      case 'reports':
        return 'Отчет'
      case 'links':
        return 'Профили'
      case 'used':
        return 'Использованные'
      case 'verifications':
        return 'Верификации'
      case 'plan':
        return 'План'
      case 'proxy':
        return 'Proxy'
      case 'frame25':
        return '25-Кадр'
      case 'custom':
        return 'Кастомная'
      default:
        return ''
    }
  }

  const [newSectionItems, setNewSectionItems] = useState<{ id: string; type: 'training' | 'reports' | 'custom' | 'links' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25' }[]>([
    { id: '1', type: 'training' },
    { id: '2', type: 'reports' }
  ])
  const [activeCustomSection, setActiveCustomSection] = useState<string | null>(null)
  const [activeCustomItem, setActiveCustomItem] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    redditUrl: '',
    email: '',
    password: '',
    redditToken: '', // Токен Reddit для парсинга данных
  })
  const [error, setError] = useState('')
  const [loadingStats, setLoadingStats] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelUrl, setExcelUrl] = useState('')
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [boostAccountId, setBoostAccountId] = useState<string | null>(null)
  const [boostSettings, setBoostSettings] = useState({
    subreddit: '',
    maxComments: 10,
    delayBetweenComments: 5000,
    commentText: '',
  })
  const [boosting, setBoosting] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAccountId, setEditAccountId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    email: '',
    password: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Флаг для предотвращения двойного вызова в React Strict Mode
  const loadingRef = useRef(false)

  useEffect(() => {
    checkAuth()
    // Защита от двойного вызова в React Strict Mode
    if (!loadingRef.current) {
      loadAccounts()
    }
  }, [])

  // Live обновление статистики каждые 60 секунд (увеличено для уменьшения скачков)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingRef.current && document.visibilityState === 'visible') {
        // Обновляем только если страница видима и не идет загрузка
        loadAccountsSilent()
      }
    }, 60000) // 60 секунд
    
    return () => clearInterval(interval)
  }, [])

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (openMenu && !target.closest('.relative')) {
        setOpenMenu(null)
      }
    }
    if (openMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [openMenu])

  // Загружаем тему из localStorage при монтировании
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  // Синхронизация данных с сервером при загрузке
  useEffect(() => {
    const syncData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      
      try {
        // Сначала мигрируем данные из localStorage на сервер (если еще не мигрированы)
        await migrateLocalStorageToServer()
        
        // Затем загружаем данные с сервера в localStorage (для синхронизации между устройствами)
        await syncFromServer()
        
        console.log('✅ Данные синхронизированы')
      } catch (error) {
        console.error('❌ Ошибка синхронизации данных:', error)
      }
    }
    
    syncData()
  }, [])

  // Загружаем информацию о пользователе
  useEffect(() => {
    const loadUserInfo = async () => {
      setLoadingUserInfo(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.log('Токен не найден, пропускаем загрузку информации о пользователе')
          setLoadingUserInfo(false)
          return
        }

        console.log('Загрузка информации о пользователе...')
        const response = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          console.log('Информация о пользователе загружена:', userData)
          setUserEmail(userData.email || '')
          
          // Загружаем статус двухфакторной аутентификации
          try {
            const twoFactorResponse = await fetch('/api/user/two-factor', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            if (twoFactorResponse.ok) {
              const twoFactorData = await twoFactorResponse.json()
              setTwoFactorEnabled(twoFactorData.twoFactorEnabled || false)
            }
          } catch (twoFactorError) {
            console.error('Ошибка загрузки статуса двухфакторной аутентификации:', twoFactorError)
          }
        } else {
          console.error('Ошибка загрузки информации о пользователе:', response.status)
          const errorData = await response.json().catch(() => ({}))
          console.error('Детали ошибки:', errorData)
          
          // Если пользователь не найден или токен неверный, перенаправляем на страницу входа
          if (response.status === 401 || response.status === 404) {
            console.log('Пользователь не авторизован или не найден, перенаправление на страницу входа')
            localStorage.removeItem('token')
            router.push('/login')
            return
          }
          
          // Устанавливаем пустой email, чтобы убрать состояние загрузки
          setUserEmail('')
        }
      } catch (error) {
        console.error('Ошибка загрузки информации о пользователе:', error)
        // Устанавливаем пустой email, чтобы убрать состояние загрузки
        setUserEmail('')
      } finally {
        setLoadingUserInfo(false)
      }
    }

    loadUserInfo()
    
    // Загружаем данные из Mego при монтировании компонента
    const loadMegoData = async () => {
      try {
        const { syncFromMegoAPI } = await import('@/lib/mego-sync')
        await syncFromMegoAPI()
      } catch (error) {
        console.warn('Не удалось загрузить данные из Mego:', error)
      }
    }
    
    loadMegoData()
  }, [])

  // Загружаем участников кабинета
  const loadCabinetMembers = async () => {
    try {
      setLoadingMembers(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/cabinet/members', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const members = await response.json()
        setCabinetMembers(members)
      }
    } catch (error) {
      console.error('Ошибка загрузки участников:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Загружаем участников при открытии настроек профиля
  useEffect(() => {
    if (showProfileSettings) {
      loadCabinetMembers()
    }
  }, [showProfileSettings])

  // Загружаем приглашения
  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/cabinet/invitations?type=received', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки приглашений:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  // Загружаем приглашения при монтировании
  useEffect(() => {
    loadInvitations()
    // Обновляем приглашения каждые 30 секунд
    const interval = setInterval(loadInvitations, 30000)
    return () => clearInterval(interval)
  }, [])

  // Автоматическая синхронизация с Mego
  useEffect(() => {
    // Синхронизируем при изменении данных
    const syncToMego = async () => {
      try {
        const { syncToMegoAPI, shouldSync } = await import('@/lib/mego-sync')
        if (shouldSync()) {
          await syncToMegoAPI()
        }
      } catch (error) {
        console.warn('Ошибка синхронизации с Mego:', error)
      }
    }

    // Синхронизируем каждые 5 минут
    const syncInterval = setInterval(syncToMego, 5 * 60 * 1000)

    // Синхронизируем при размонтировании (выход)
    return () => {
      clearInterval(syncInterval)
      // Финальная синхронизация при выходе
      syncToMego().catch(console.error)
    }
  }, [])

  // Автоматическая синхронизация при изменении важных данных
  useEffect(() => {
    const syncImportantData = async () => {
      try {
        const { syncToMegoAPI } = await import('@/lib/mego-sync')
        await syncToMegoAPI()
      } catch (error) {
        console.warn('Ошибка синхронизации с Mego:', error)
      }
    }

    // Синхронизируем при изменении токена или важных данных
    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('token')
      if (token) {
        syncImportantData()
      }
    }, 5 * 60 * 1000) // Каждые 5 минут

    return () => clearInterval(checkInterval)
  }, [])

  // Показываем модальное окно приглашения при входе, если есть непрочитанные
  useEffect(() => {
    if (invitations.length > 0 && !showInvitationModal) {
      // Проверяем, было ли уже показано модальное окно для этого приглашения
      const lastShownInvitationId = localStorage.getItem('lastShownInvitationId')
      const firstInvitation = invitations[0]
      
      // Показываем модальное окно, если это новое приглашение
      if (!lastShownInvitationId || lastShownInvitationId !== firstInvitation.id) {
        setPendingInvitation(firstInvitation)
        setShowInvitationModal(true)
        localStorage.setItem('lastShownInvitationId', firstInvitation.id)
      }
    }
  }, [invitations, showInvitationModal])

  // Сохраняем кастомные разделы в localStorage и на сервер при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSections', JSON.stringify(customSections))
      // Сохраняем на сервер (асинхронно, не блокируя UI)
      const token = localStorage.getItem('token')
      if (token && customSections.length > 0) {
        saveUserData('customSections', customSections).catch(console.error)
      }
    }
  }, [customSections])

  // Сохраняем состояние открытых меню в localStorage и на сервер при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openCustomMenus', JSON.stringify(openCustomMenus))
      // Сохраняем на сервер
      const token = localStorage.getItem('token')
      if (token) {
        saveUserData('openCustomMenus', openCustomMenus).catch(console.error)
      }
    }
  }, [openCustomMenus])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  // Тихая загрузка без показа индикатора загрузки (для автоматических обновлений)
  const loadAccountsSilent = async () => {
    if (loadingRef.current) {
      return
    }
    
    loadingRef.current = true
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        const formattedAccounts = data.map((acc: any) => {
          const hasStats = acc.accountAge !== null || 
                          acc.karma !== null || 
                          acc.posts !== null || 
                          acc.subscribers !== null || 
                          acc.comments !== null || 
                          acc.contributions !== null || 
                          acc.goldEarned !== null ||
                          acc.activeIn !== null
          
          return {
            id: acc.id,
            redditUrl: acc.redditUrl,
            username: acc.username,
            email: acc.email,
            password: acc.password,
            avatarUrl: acc.avatarUrl,
            stats: hasStats ? {
              comments: acc.comments ?? 0,
              karma: acc.karma ?? 0,
              accountAge: acc.accountAge ?? 0,
              posts: acc.posts ?? 0,
              subscribers: acc.subscribers ?? 0,
              contributions: acc.contributions ?? 0,
              goldEarned: acc.goldEarned ?? 0,
              activeIn: acc.activeIn ?? 0,
            } : undefined,
          }
        })
        
        // Обновляем только если данные изменились (для предотвращения лишних рендеров)
        setAccounts(prevAccounts => {
          const accountsChanged = JSON.stringify(prevAccounts) !== JSON.stringify(formattedAccounts)
          return accountsChanged ? formattedAccounts : prevAccounts
        })
      }
    } catch (err: any) {
      // Тихо игнорируем ошибки при автоматическом обновлении
      if (err.name !== 'AbortError') {
        console.debug('Автообновление пропущено:', err.name)
      }
    } finally {
      loadingRef.current = false
    }
  }

  const loadAccounts = async () => {
    // Защита от одновременных вызовов
    if (loadingRef.current) {
      console.log('⏸️ Загрузка уже выполняется, пропускаем...')
      return
    }
    
    // Устанавливаем флаг ДО try, чтобы finally всегда его сбросил
    loadingRef.current = true
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.warn('⚠️ Токен не найден в localStorage')
        setError('Вы не авторизованы. Пожалуйста, войдите снова.')
        setTimeout(() => {
          router.push('/login')
        }, 100)
        return
      }
      
      console.log('📡 Отправка запроса на загрузку аккаунтов...')
      
      // Добавляем таймаут для запроса, чтобы избежать бесконечного ожидания
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
      
      const response = await fetch('/api/accounts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      console.log('📥 Ответ получен:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Загружено аккаунтов:', data.length)
        console.log('📋 Данные аккаунтов:', data)
        
        // Преобразуем данные в нужный формат
        const formattedAccounts = data.map((acc: any) => {
          // Проверяем, есть ли хотя бы одно поле статистики
          const hasStats = acc.accountAge !== null || 
                          acc.karma !== null || 
                          acc.posts !== null || 
                          acc.subscribers !== null || 
                          acc.comments !== null || 
                          acc.contributions !== null || 
                          acc.goldEarned !== null ||
                          acc.activeIn !== null
          
          return {
            id: acc.id,
            redditUrl: acc.redditUrl,
            username: acc.username,
            email: acc.email,
            password: acc.password,
            avatarUrl: acc.avatarUrl,
            stats: hasStats ? {
              comments: acc.comments ?? 0,
              karma: acc.karma ?? 0,
              accountAge: acc.accountAge ?? 0,
              posts: acc.posts ?? 0,
              subscribers: acc.subscribers ?? 0,
              contributions: acc.contributions ?? 0,
              goldEarned: acc.goldEarned ?? 0,
              activeIn: acc.activeIn ?? 0,
            } : undefined,
          }
        })
        
        console.log('✅ Форматированные аккаунты:', formattedAccounts.map((acc: any) => ({
          id: acc.id,
          username: acc.username,
          hasStats: !!acc.stats,
          stats: acc.stats ? {
            subscribers: acc.stats.subscribers,
            karma: acc.stats.karma,
            accountAge: acc.stats.accountAge,
            contributions: acc.stats.contributions,
            goldEarned: acc.stats.goldEarned,
            comments: acc.stats.comments,
            posts: acc.stats.posts,
          } : null
        })))
        
        // Обновляем только если данные изменились (для предотвращения лишних рендеров)
        setAccounts(prevAccounts => {
          const accountsChanged = JSON.stringify(prevAccounts) !== JSON.stringify(formattedAccounts)
          return accountsChanged ? formattedAccounts : prevAccounts
        })
        
        if (formattedAccounts.length === 0) {
          console.warn('⚠️ Список аккаунтов пуст')
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Ошибка загрузки аккаунтов:')
        console.error('   Статус:', response.status)
        console.error('   Ответ:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          console.error('   Данные ошибки:', errorData)
          setError(errorData.error || `Ошибка загрузки аккаунтов (${response.status})`)
        } catch {
          setError(`Ошибка загрузки аккаунтов (${response.status})`)
        }
      }
    } catch (err: any) {
      console.error('❌ Ошибка загрузки аккаунтов:', err)
      console.error('   Сообщение:', err.message)
      console.error('   Стек:', err.stack)
      
      // Проверяем, была ли ошибка из-за таймаута
      if (err.name === 'AbortError') {
        setError('Запрос превысил время ожидания. Проверьте подключение к интернету.')
      } else {
        setError(`Ошибка загрузки аккаунтов: ${err.message}`)
      }
    } finally {
      // ВСЕГДА сбрасываем флаги, даже если был ранний return
      loadingRef.current = false
      setLoading(false)
      console.log('✅ Флаги загрузки сброшены')
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.redditToken || !formData.redditToken.trim()) {
      setError('Пожалуйста, вставьте токен Reddit')
      return
    }

    try {
      const token = localStorage.getItem('token')
      let tokenToSend = formData.redditToken.trim()
      
      // Проверяем, не является ли это JSON объектом (если пользователь скопировал все данные вместо токена)
      if (tokenToSend.startsWith('{') && tokenToSend.endsWith('}')) {
        try {
          const parsedData = JSON.parse(tokenToSend)
          // Если это объект с полями username, karma и т.д., значит пользователь скопировал все данные
          if (parsedData.username || parsedData.karma !== undefined) {
            console.warn('⚠️ Обнаружен JSON объект вместо токена. Пытаемся извлечь токен...')
            // Пробуем найти токен в объекте
            if (parsedData.tokens?.fullToken) {
              tokenToSend = parsedData.tokens.fullToken
              console.log('✅ Токен извлечен из JSON объекта')
            } else if (parsedData.tokens?.sessionCookie) {
              tokenToSend = parsedData.tokens.sessionCookie
              console.log('✅ Токен извлечен из JSON объекта (sessionCookie)')
            } else {
              setError('Вы скопировали данные профиля, а не токен. Пожалуйста, скопируйте именно токен (используйте кнопку "Копировать" рядом с токеном в расширении).')
              return
            }
          }
        } catch (e) {
          // Не JSON, продолжаем как обычно
        }
      }
      
      // Логируем длину токена перед отправкой
      console.log('📤 Отправка токена на сервер:')
      console.log('   Длина токена:', tokenToSend.length)
      console.log('   Первые 50 символов:', tokenToSend.substring(0, 50))
      console.log('   Последние 50 символов:', tokenToSend.substring(Math.max(0, tokenToSend.length - 50)))
      
      if (tokenToSend.length < 50) {
        console.warn('⚠️ ВНИМАНИЕ: Токен очень короткий! Возможно, он обрезан при копировании.')
        setError('Токен слишком короткий. Убедитесь, что вы скопировали полный токен из расширения (используйте кнопку "Копировать" рядом с токеном).')
        return
      }
      
      // Если токен был извлечен из расширения, он может содержать username в данных
      // Пробуем извлечь username из токена или используем данные из расширения
      let usernameToSend = null
      let redditUrlToSend = null
      
      // Если пользователь скопировал JSON объект из расширения, извлекаем username
      if (tokenToSend.startsWith('{') && tokenToSend.endsWith('}')) {
        try {
          const parsedData = JSON.parse(tokenToSend)
          if (parsedData.username) {
            usernameToSend = parsedData.username
            redditUrlToSend = parsedData.redditUrl || `https://www.reddit.com/user/${parsedData.username}`
            console.log('✅ Username извлечен из JSON:', usernameToSend)
          }
        } catch (e) {
          // Не JSON, продолжаем как обычно
        }
      }
      
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          redditToken: tokenToSend,
          ...(usernameToSend && { username: usernameToSend }),
          ...(redditUrlToSend && { redditUrl: redditUrlToSend }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Ошибка ответа сервера:')
        console.error('   Статус:', response.status)
        console.error('   Данные:', data)
        
        // Более понятное сообщение об ошибке
        let errorMessage = data.error || data.details || `Ошибка добавления аккаунта (${response.status})`
        
        if (errorMessage.includes('Доступ запрещен') || response.status === 403) {
          errorMessage = 'Доступ запрещен. Возможно:\n' +
            '1. Токен недействителен или истек\n' +
            '2. Токен был скопирован не полностью (используйте кнопку "Копировать" рядом с токеном)\n' +
            '3. Профиль Reddit приватный\n' +
            '4. Reddit блокирует запросы\n\n' +
            'Попробуйте:\n' +
            '- Скопировать токен заново из расширения\n' +
            '- Убедиться, что вы залогинены в Reddit\n' +
            '- Проверить, что токен скопирован полностью (должен быть длинным)'
        }
        
        throw new Error(errorMessage)
      }
      
      console.log('✅ Аккаунт успешно добавлен:', data)

      setFormData({ username: '', redditUrl: '', email: '', password: '', redditToken: '' })
      setShowAddForm(false)
      
      // Показываем успешное сообщение
      console.log('✅ Аккаунт успешно добавлен, обновляем список...')
      
      // Обновляем список аккаунтов, чтобы показать статистику
      await loadAccounts()
      
      // Показываем уведомление об успехе
      setTimeout(() => {
        setError('') // Очищаем ошибки
      }, 100)
    } catch (err: any) {
      console.error('❌ Ошибка при добавлении аккаунта:', err)
      console.error('   Сообщение:', err.message)
      console.error('   Стек:', err.stack)
      setError(err.message || 'Неизвестная ошибка при добавлении аккаунта')
    }
  }

  const handleGetStats = async (accountId: string) => {
    setLoadingStats(accountId)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/accounts/${accountId}/stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка получения статистики')
      }

      loadAccounts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingStats(null)
    }
  }

  const handleBoostComments = async () => {
    if (!boostAccountId) return

    setBoosting(boostAccountId)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/accounts/${boostAccountId}/boost-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subreddit: boostSettings.subreddit || undefined,
          maxComments: boostSettings.maxComments,
          delayBetweenComments: boostSettings.delayBetweenComments,
          commentText: boostSettings.commentText || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка запуска накрутки')
      }

      alert(`Накрутка завершена!\nУспешно: ${data.stats?.success || 0}\nОшибок: ${data.stats?.errors || 0}`)
      setShowBoostModal(false)
      loadAccounts() // Обновляем статистику
    } catch (err: any) {
      setError(err.message || 'Ошибка запуска накрутки комментариев')
    } finally {
      setBoosting(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleEditAccount = async () => {
    if (!editAccountId) return

    try {
      setSavingEdit(true)
      setError('')

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/accounts/${editAccountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editFormData.email,
          password: editFormData.password,
        }),
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditAccountId(null)
        setEditFormData({ email: '', password: '' })
        loadAccounts()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка обновления аккаунта' }))
        throw new Error(errorData.error || 'Ошибка обновления аккаунта')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот аккаунт?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        loadAccounts()
      } else {
        throw new Error('Ошибка удаления аккаунта')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Можно добавить уведомление об успешном копировании
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  const togglePasswordVisibility = (accountId: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }))
  }

  const toggleMenu = (accountId: string) => {
    setOpenMenu(openMenu === accountId ? null : accountId)
  }

  const handleExcelSync = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // САМОЕ ПЕРВОЕ - проверяем, что функция вызвана
    console.log('🟢🟢🟢 ФУНКЦИЯ handleExcelSync ВЫЗВАНА! 🟢🟢🟢')
    console.log('🟢 Событие:', e)
    console.log('🟢 Excel URL из состояния:', excelUrl)
    console.log('🟢 Время вызова:', new Date().toISOString())
    
    // Явное логирование для проверки вызова функции
    console.log('%c=== НАЧАЛО СИНХРОНИЗАЦИИ EXCEL ===', 'color: #FF4500; font-size: 16px; font-weight: bold;')
    console.log('Время:', new Date().toISOString())
    console.log('URL для синхронизации:', excelUrl)
    
    // Также выводим в alert для визуальной проверки
    if (typeof window !== 'undefined') {
      console.log('Консоль браузера активна, логи будут видны здесь')
    }
    
    console.log('🟢 Обновление состояния...')
    setError('')
    setLoadingExcel(true)
    console.log('🟢 Состояние обновлено')

    try {
      const token = localStorage.getItem('token')
      console.log('1. Проверка авторизации...', token ? '✓ Токен найден' : '✗ Токен не найден')
      
      if (!token) {
        console.error('ОШИБКА: не авторизован')
        alert('Ошибка: не авторизован')
        throw new Error('Не авторизован')
      }

      console.log('2. Проверка URL Excel...', excelUrl ? `✓ URL: ${excelUrl}` : '✗ URL пустой')
      
      if (!excelUrl) {
        console.error('ОШИБКА: ссылка на Excel файл обязательна')
        alert('Ошибка: введите ссылку на Excel файл')
        throw new Error('Ссылка на Excel файл обязательна')
      }

      console.log('3. Отправка запроса на сервер...')
      console.log('   URL:', excelUrl)
      console.log('   Метод: POST')
      console.log('   Endpoint: /api/excel/sync')
      console.log('   Токен:', token ? `${token.substring(0, 20)}...` : 'НЕТ')

      const requestBody = { excelUrl }
      console.log('   Тело запроса:', JSON.stringify(requestBody))

      const response = await fetch('/api/excel/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })
      
      console.log('3.5. Запрос отправлен, ожидание ответа...')

      console.log('4. Ответ получен от сервера')
      console.log('   Статус:', response.status, response.statusText)
      console.log('   OK:', response.ok)

      const data = await response.json()
      console.log('5. Данные ответа:')
      console.log('   Полный ответ:', JSON.stringify(data, null, 2))
      console.log('   Добавлено:', data.added || 0)
      console.log('   Обновлено:', data.updated || 0)
      console.log('   Обработано строк:', data.processedRows || 0)
      console.log('   Ошибок:', data.errors ? data.errors.length : 0)

      if (!response.ok) {
        const errorMsg = data.error || 'Ошибка синхронизации с Excel'
        console.error('6. ОШИБКА СИНХРОНИЗАЦИИ:', errorMsg)
        if (data.errors && data.errors.length > 0) {
          console.error('   Детали ошибок:', data.errors)
          alert(`Ошибка: ${errorMsg}\n\nПервые ошибки:\n${data.errors.slice(0, 5).join('\n')}`)
        } else {
          alert(`Ошибка: ${errorMsg}`)
        }
        throw new Error(errorMsg)
      }

      // ВАЖНО: Проверяем результат синхронизации
      console.log('6. Результат синхронизации:')
      console.log('   Добавлено:', data.added || 0)
      console.log('   Обновлено:', data.updated || 0)
      console.log('   Обработано строк:', data.processedRows || 0)
      console.log('   Всего аккаунтов в базе:', data.savedAccountsCount || 0)
      
      if (data.added === 0 && data.updated === 0) {
        console.warn('6. ПРЕДУПРЕЖДЕНИЕ: ничего не добавлено')
        console.warn('   Ошибки:', data.errors || [])
        
        let errorDetails = ''
        if (data.errors && data.errors.length > 0) {
          errorDetails = `\n\nОшибки:\n${data.errors.slice(0, 5).join('\n')}`
        } else if (data.processedRows === 0) {
          errorDetails = '\n\nВозможные причины:\n- Данные не начинаются со строки 2\n- Таблица пустая\n- Неверный формат ссылки Google Sheets\n\nДля Google Sheets:\n1. Откройте таблицу\n2. Нажмите "Настройки доступа" (справа вверху)\n3. Выберите "Изменить на: Все, у кого есть ссылка"\n4. Скопируйте ссылку и используйте её'
        } else {
          errorDetails = '\n\nПроверьте формат Excel файла:\n- Данные должны начинаться со строки 2\n- Колонка A: Логин\n- Колонка B: Пароль\n- Колонка C: Ссылка\n\nВозможно, все строки были пропущены из-за ошибок валидации.'
        }
        alert(`Синхронизация завершена, но ничего не добавлено!\nОбработано строк: ${data.processedRows || 0}${errorDetails}`)
      } else {
        console.log('6. ✓ Синхронизация успешна!')
        console.log('   Добавлено аккаунтов:', data.added || 0)
        console.log('   Обновлено аккаунтов:', data.updated || 0)
        console.log('   Всего аккаунтов в базе:', data.savedAccountsCount || 0)
        alert(`Синхронизация завершена!\nДобавлено: ${data.added || 0}\nОбновлено: ${data.updated || 0}\nЗагружаем аккаунты...`)
      }
      
      setExcelUrl('')
      setShowExcelModal(false)
      
      console.log('7. Загрузка обновленных аккаунтов...')
      
      // Немедленно загружаем аккаунты
      const token2 = localStorage.getItem('token')
      const refreshResponse = await fetch('/api/accounts', {
        headers: {
          Authorization: `Bearer ${token2}`,
        },
      })
      
      console.log('8. Ответ загрузки аккаунтов:')
      console.log('   Статус:', refreshResponse.status)
      console.log('   OK:', refreshResponse.ok)
      
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        console.log('9. Данные аккаунтов получены:')
        console.log('   Количество аккаунтов:', refreshedData.length)
        console.log('   Аккаунты:', refreshedData)
        
        const formattedAccounts = refreshedData.map((acc: any) => ({
          id: acc.id,
          redditUrl: acc.redditUrl,
          username: acc.username,
          email: acc.email,
          password: acc.password,
          avatarUrl: acc.avatarUrl,
          stats: (acc.accountAge !== null || acc.karma !== null || acc.posts !== null || acc.subscribers !== null || acc.comments !== null) ? {
            comments: acc.comments || 0,
            karma: acc.karma || 0,
            accountAge: acc.accountAge || 0,
            posts: acc.posts || 0,
            subscribers: acc.subscribers || 0,
            contributions: acc.contributions || 0,
            goldEarned: acc.goldEarned || 0,
            activeIn: acc.activeIn || 0,
          } : undefined,
        }))
        
        console.log('10. Форматированные аккаунты:', formattedAccounts)
        setAccounts(formattedAccounts)
        console.log('11. Состояние обновлено!')
        console.log('    Аккаунтов в состоянии:', formattedAccounts.length)
        alert(`Готово! Загружено аккаунтов: ${formattedAccounts.length}`)
      } else {
        console.error('9. ОШИБКА загрузки аккаунтов:', refreshResponse.status)
        alert('Ошибка загрузки аккаунтов после синхронизации')
      }
      
      console.log('=== СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА ===')
      
    } catch (err: any) {
      console.error('=== ОШИБКА СИНХРОНИЗАЦИИ ===')
      console.error('Ошибка:', err)
      console.error('Сообщение:', err.message)
      console.error('Стек:', err.stack)
      alert(`Ошибка синхронизации: ${err.message}`)
      setError(err.message)
    } finally {
      setLoadingExcel(false)
      console.log('=== КОНЕЦ СИНХРОНИЗАЦИИ ===')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-cursor-text">Загрузка...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex bg-transparent">
      {/* Боковая панель */}
      <aside className="w-64 glass border-r border-cursor-border min-h-screen p-4 flex flex-col sidebar-3d" style={{ backgroundColor: 'rgba(26, 26, 28, 0.4)', backdropFilter: 'blur(10px)' }}>
        <div className="mb-8">
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

          {/* Информация о пользователе */}
          <div 
            className="mb-4 px-4 py-3 bg-cursor-darker rounded-xl border border-cursor-border cursor-pointer hover:bg-cursor-lighter transition"
            onClick={() => setShowProfileSettings(true)}
          >
            {loadingUserInfo ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cursor-lighter flex items-center justify-center text-cursor-text-muted flex-shrink-0">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cursor-text-muted text-sm">Загрузка...</div>
                </div>
              </div>
            ) : userEmail ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-cursor flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cursor-text font-medium truncate" title={userEmail}>
                    {userEmail}
                  </div>
                  <div className="text-cursor-text-muted text-xs">Учетная запись</div>
                </div>
                <svg className="w-4 h-4 text-cursor-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cursor-lighter flex items-center justify-center text-cursor-text-muted flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cursor-text-muted text-sm">Не авторизован</div>
                </div>
              </div>
            )}
          </div>

          {/* Уведомления о приглашениях */}
          {invitations.length > 0 && (
            <div className="mb-4">
              <div
                className="px-4 py-3 bg-gradient-cursor rounded-xl border border-cursor-border cursor-pointer hover:opacity-90 transition relative"
                onClick={() => setShowInvitations(!showInvitations)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {invitations.length}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">
                      {invitations.length === 1 ? 'Новое приглашение' : `Новых приглашений: ${invitations.length}`}
                    </div>
                    <div className="text-white/70 text-xs">Нажмите, чтобы просмотреть</div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-white transition-transform ${showInvitations ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {showInvitations && (
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-3 bg-cursor-darker rounded-xl border border-cursor-border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-cursor-text font-medium text-sm">
                            {invitation.sender.email}
                          </div>
                          <div className="text-cursor-text-muted text-xs">
                            приглашает вас в свой кабинет
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const token = localStorage.getItem('token')
                              if (!token) return

                              const response = await fetch(`/api/cabinet/invitations/${invitation.token}`, {
                                method: 'POST',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              })

                              if (response.ok) {
                                alert('Приглашение принято!')
                                localStorage.removeItem('lastShownInvitationId')
                                loadInvitations()
                                loadCabinetMembers()
                              } else {
                                const data = await response.json()
                                alert(data.error || 'Ошибка принятия приглашения')
                              }
                            } catch (error) {
                              console.error('Ошибка принятия приглашения:', error)
                              alert('Ошибка принятия приглашения')
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-semibold transition"
                        >
                          Принять
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${invitation.canView ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Просмотр
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${invitation.canEdit ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Редактирование
                        </span>
                      </div>
                      <a
                        href={`/invite/${invitation.token}`}
                        className="text-xs text-cursor-primary hover:text-cursor-text mt-2 block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Открыть приглашение →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка Reddit с выпадающим меню */}
          <div className="mb-4">
            <button
              onClick={() => {
                const newState = !redditMenuOpen
                setRedditMenuOpen(newState)
                if (newState) {
                  // При открытии меню Reddit сбрасываем кастомные идентификаторы
                  setActiveCustomSection(null)
                  setActiveCustomItem(null)
                }
              }}
              className={`w-full text-left px-4 py-3 rounded-xl smooth-transition flex items-center justify-between ${
                redditMenuOpen
                  ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                  : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reddit
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${redditMenuOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Выпадающее меню Reddit */}
            {redditMenuOpen && (
              <nav className="mt-2 space-y-2 pl-4 border-l-2 border-cursor-border ml-2">
            <button
              onClick={() => {
                setActiveView('accounts')
                setShowAddForm(false)
              }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                activeView === 'accounts'
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
              }`}
            >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
              Аккаунты
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('accounts')
                    setShowAddForm(true)
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text transition ml-4 text-sm btn-3d"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить анкету
                  </span>
            </button>
            <button
              onClick={() => {
                setActiveView('stats')
                setShowAddForm(false)
              }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                activeView === 'stats'
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
              }`}
            >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
              Статистика
                  </span>
            </button>
            <button
              onClick={() => router.push('/dashboard/subreddits')}
                  className="w-full text-left px-4 py-3 rounded-xl text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text transition btn-3d"
            >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
              Сабреддиты
                  </span>
            </button>
            <button
              onClick={() => {
                    setActiveView('training')
                    setShowAddForm(false)
                    setActiveCustomSection(null)
                    setActiveCustomItem(null)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                    activeView === 'training' && redditMenuOpen
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
              ОБУЧЕНИЕ
                  </span>
            </button>
            <button
              onClick={() => {
                    setActiveView('reports')
                    setShowAddForm(false)
                    setActiveCustomSection(null)
                    setActiveCustomItem(null)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                    activeView === 'reports' && redditMenuOpen
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
              Отчет
                  </span>
            </button>
            <button
              onClick={() => {
                    setActiveView('links')
                    setShowAddForm(false)
                    setActiveCustomSection(null)
                    setActiveCustomItem(null)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                    activeView === 'links' && redditMenuOpen
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Профили
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('extensions')
                    setShowAddForm(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                    activeView === 'extensions'
                      ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                      : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Скачать расширения
                  </span>
            </button>
          </nav>
            )}
          </div>

          {/* Кастомные разделы */}
          {customSections.map((section) => (
            <div key={section.id} className="mb-4">
              <button
                onClick={() => setOpenCustomMenus({ ...openCustomMenus, [section.id]: !openCustomMenus[section.id] })}
                className={`w-full text-left px-4 py-3 rounded-xl smooth-transition flex items-center justify-between ${
                  openCustomMenus[section.id]
                    ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                    : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {section.name}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${openCustomMenus[section.id] ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openCustomMenus[section.id] && (
                <nav className="mt-2 space-y-2 pl-4 border-l-2 border-cursor-border ml-2">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveCustomSection(section.id)
                        setActiveCustomItem(item.id)
                        setRedditMenuOpen(false)
                        if (item.type === 'training') {
                          setActiveView('training')
                        } else if (item.type === 'reports') {
                          setActiveView('reports')
                        } else if (item.type === 'links') {
                          setActiveView('links')
                        } else if (item.type === 'used') {
                          setActiveView('used')
                        } else if (item.type === 'verifications') {
                          setActiveView('verifications')
                        } else if (item.type === 'plan') {
                          setActiveView('plan')
                        } else if (item.type === 'proxy') {
                          setActiveView('proxy')
                        } else if (item.type === 'frame25') {
                          setActiveView('frame25')
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl smooth-transition tab-switch ${
                        activeCustomSection === section.id && activeCustomItem === item.id
                          ? 'active bg-gradient-cursor text-white shadow-cursor-glow'
                          : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {item.type === 'training' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          ) : item.type === 'reports' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          ) : item.type === 'links' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          ) : item.type === 'used' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : item.type === 'verifications' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          ) : item.type === 'plan' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          ) : item.type === 'proxy' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          ) : item.type === 'frame25' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          )}
                        </svg>
                        {getButtonNameByType(item.type)}
                      </span>
                    </button>
                  ))}
                </nav>
              )}
            </div>
          ))}

          {/* Кнопка добавления нового раздела */}
          <button
            onClick={() => setShowAddSectionModal(true)}
            className="w-full px-4 py-3 rounded-xl text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text transition btn-3d border border-cursor-border flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить раздел
          </button>

          {/* Кнопка NEXTCLOUD */}
          <button
            onClick={() => {
              setActiveView('nextcloud')
              setRedditMenuOpen(false)
              setActiveCustomSection(null)
            }}
            className={`w-full text-left px-4 py-3 rounded-xl smooth-transition mt-4 ${
              activeView === 'nextcloud'
                ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              NEXTCLOUD
            </span>
          </button>

          {/* Кнопка настроек */}
          <button
            onClick={() => {
              setActiveView('settings')
              setRedditMenuOpen(false)
              setActiveCustomSection(null)
            }}
            className={`w-full text-left px-4 py-3 rounded-xl smooth-transition mt-4 ${
              activeView === 'settings'
                ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                : 'text-cursor-text-muted hover:bg-cursor-lighter hover:text-cursor-text'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Настройки
            </span>
          </button>
        </div>
        <div className="mt-auto pt-8">
          <button
            onClick={handleLogout}
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
      <div className="flex-1 p-6 relative">
        {/* Переключатель языков - статично в верхней правой части */}
        <div className="fixed top-6 right-6 z-10">
          <div className="flex items-center gap-2 bg-cursor-darker border border-cursor-border rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setLanguage('ru')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                language === 'ru'
                  ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                  : 'text-cursor-text-muted hover:text-cursor-text'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                language === 'en'
                  ? 'bg-gradient-cursor text-white shadow-cursor-glow'
                  : 'text-cursor-text-muted hover:text-cursor-text'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            {(activeView === 'accounts' && redditMenuOpen) ||
             (activeView === 'stats' && redditMenuOpen) ||
             (activeView === 'training' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'reports' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'links' && redditMenuOpen) ||
             (activeView === 'used' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'verifications' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'plan' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'proxy' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'frame25' && (redditMenuOpen || activeCustomSection)) ||
             (activeView === 'extensions' && redditMenuOpen) ||
             activeView === 'settings' ||
             activeView === 'nextcloud' ? (
              <h1 className="text-4xl font-bold gradient-text">
                {activeView === 'accounts' && redditMenuOpen ? 'Мои аккаунты' : 
                 activeView === 'stats' && redditMenuOpen ? 'Общая статистика' : 
                 activeView === 'training' && (redditMenuOpen || activeCustomSection) ? 'ОБУЧЕНИЕ' : 
                 activeView === 'reports' && (redditMenuOpen || activeCustomSection) ? 'Отчет' : 
                 activeView === 'links' && redditMenuOpen ? 'Профили' :
                 activeView === 'used' && (redditMenuOpen || activeCustomSection) ? 'Использованные' :
                 activeView === 'verifications' && (redditMenuOpen || activeCustomSection) ? 'Верификации' :
                 activeView === 'plan' && (redditMenuOpen || activeCustomSection) ? 'План' :
                 activeView === 'proxy' && (redditMenuOpen || activeCustomSection) ? 'Proxy' :
                 activeView === 'frame25' && (redditMenuOpen || activeCustomSection) ? '25-Кадр' :
                 activeView === 'extensions' && redditMenuOpen ? 'Скачать расширения' :
                 activeView === 'settings' ? 'Настройки' :
                 activeView === 'nextcloud' ? 'NEXTCLOUD' :
                 ''}
            </h1>
            ) : null}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {activeView === 'accounts' && redditMenuOpen && (
            <>
              {accounts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="glass rounded-xl p-6 border border-cursor-border relative card-3d"
                    >
                      {/* Меню с тремя точками */}
                      <div className="absolute top-4 right-4">
                        <div className="relative">
                          <button
                            onClick={() => toggleMenu(account.id)}
                            className="text-cursor-text-muted hover:text-cursor-text p-2 rounded-lg hover:bg-cursor-lighter transition icon-3d"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {openMenu === account.id && (
                            <div className="absolute right-0 top-full mt-1 glass border border-cursor-border rounded-xl shadow-cursor-glow min-w-[150px] z-10 menu-3d">
                              <button
                                onClick={() => {
                                  setEditAccountId(account.id)
                                  setEditFormData({
                                    email: account.email,
                                    password: account.password,
                                  })
                                  setShowEditModal(true)
                                  setOpenMenu(null)
                                }}
                                className="w-full text-left px-4 py-2 text-cursor-text hover:bg-cursor-lighter transition rounded-lg flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Редактировать
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteAccount(account.id)
                                  setOpenMenu(null)
                                }}
                                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 transition rounded-lg flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  {account.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt={account.username || 'Avatar'}
                      className="w-16 h-16 rounded-full border-2 border-cursor-border object-cover"
                      onError={(e) => {
                        // Если аватар не загрузился, скрываем его
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-cursor-border bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                      {(account.username || account.redditUrl.split('/').pop() || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="text-xl font-bold gradient-text pr-8 flex-1">
                  {account.username || account.redditUrl.split('/').pop() || 'Аккаунт'}
                </h3>
                </div>

                        {/* Email с кнопкой копирования */}
                        <div className="flex items-center gap-2 mb-3 p-2 bg-cursor-dark rounded-lg border border-cursor-border">
                          <span className="text-cursor-text-muted text-sm min-w-[60px]">Email:</span>
                          <span className="text-cursor-text text-sm flex-1 break-all">{account.email}</span>
                          <button
                            onClick={() => copyToClipboard(account.email)}
                            className="px-2 py-1 text-xs bg-cursor-lighter hover:bg-cursor-primary/20 rounded transition text-cursor-text"
                          >
                            Копировать
                          </button>
                        </div>

                        {/* Пароль с кнопкой показать/скопировать */}
                        <div className="flex items-center gap-2 mb-4 p-2 bg-cursor-dark rounded-lg border border-cursor-border">
                          <span className="text-cursor-text-muted text-sm min-w-[60px]">Пароль:</span>
                          <span className="text-cursor-text text-sm flex-1">
                            {showPassword[account.id] ? account.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(account.id)}
                            className="px-2 py-1 text-xs bg-cursor-lighter hover:bg-cursor-primary/20 rounded transition mr-1 text-cursor-text"
                          >
                            {showPassword[account.id] ? 'Скрыть' : 'Показать'}
                          </button>
                          {showPassword[account.id] && (
                            <button
                              onClick={() => copyToClipboard(account.password)}
                              className="px-2 py-1 text-xs bg-cursor-lighter hover:bg-cursor-primary/20 rounded transition text-cursor-text"
                            >
                              Копировать
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {account.stats ? (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Подписчики:</span>
                            <span className="text-cursor-text font-semibold">
                              {account.stats.subscribers}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Карма:</span>
                            <span className="text-cursor-text font-semibold">
                              {account.stats.karma}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Возраст аккаунта:</span>
                            <span className="text-cursor-text font-semibold">
                              {formatAccountAge(account.stats.accountAge)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Вклады:</span>
                            <span className="text-cursor-text font-semibold">
                              {account.stats.contributions || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Комментарии:</span>
                            <span className="text-cursor-text font-semibold">
                              {account.stats.comments}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Посты:</span>
                            <span className="text-cursor-text font-semibold">
                              {account.stats.posts}
                            </span>
                          </div>
                            <div className="flex justify-between">
                            <span className="text-cursor-text-muted">Заработано золота:</span>
                              <span className="text-yellow-400 font-semibold">
                              {account.stats.goldEarned ?? 0}
                            </span>
                          </div>
                          {account.stats.activeIn !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-cursor-text-muted">Активен в:</span>
                              <span className="text-cursor-text font-semibold">
                                {account.stats.activeIn > 5 ? '> 5' : account.stats.activeIn}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-cursor-text-muted mb-4">
                          Статистика не загружена
                        </p>
                      )}

                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => router.push(`/dashboard/account/${account.id}/preview`)}
                            className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden hover:from-purple-500 hover:to-blue-500 transition-all"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Посмотреть анкету
                            </span>
                          </button>
                      <button
                        onClick={() => handleGetStats(account.id)}
                        disabled={loadingStats === account.id}
                            className="flex-1 py-2 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {loadingStats === account.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Загрузка...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  {account.stats ? 'Обновить статистику' : 'Получить статистику'}
                                </>
                              )}
                            </span>
                      </button>
                        </div>
                        <button
                          onClick={() => {
                            setBoostAccountId(account.id)
                            setShowBoostModal(true)
                          }}
                          disabled={boosting === account.id}
                          className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden hover:from-green-500 hover:to-emerald-500 transition-all"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {boosting === account.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Накрутка запущена...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Накрутка комментариев
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-cursor-text-muted">
                  <p className="text-xl mb-4">У вас пока нет добавленных аккаунтов</p>
                  <p>Добавьте первый аккаунт Reddit, чтобы начать отслеживать статистику</p>
                </div>
              )}
            </>
          )}

          {activeView === 'stats' && redditMenuOpen && (
            <div className="glass rounded-xl p-6 border border-cursor-border">
              <h2 className="text-2xl font-bold mb-6 gradient-text">Общая статистика</h2>
              {accounts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="glass border border-cursor-border rounded-xl p-4 stat-card-3d">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-cursor-primary icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div className="text-cursor-text-muted text-sm">Всего аккаунтов</div>
                  </div>
                    <div className="text-3xl font-bold gradient-text">{accounts.length}</div>
                  </div>
                  <div className="glass border border-cursor-border rounded-xl p-4 stat-card-3d">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-cursor-primary icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="text-cursor-text-muted text-sm">Общая карма</div>
                    </div>
                    <div className="text-3xl font-bold gradient-text">
                      {accounts.reduce((sum, acc) => sum + (acc.stats?.karma || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="glass border border-cursor-border rounded-xl p-4 stat-card-3d">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-cursor-primary icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div className="text-cursor-text-muted text-sm">Всего комментариев</div>
                    </div>
                    <div className="text-3xl font-bold gradient-text">
                      {accounts.reduce((sum, acc) => sum + (acc.stats?.comments || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="glass border border-cursor-border rounded-xl p-4 stat-card-3d">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-cursor-primary icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-cursor-text-muted text-sm">Всего постов</div>
                    </div>
                    <div className="text-3xl font-bold gradient-text">
                      {accounts.reduce((sum, acc) => sum + (acc.stats?.posts || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-cursor-text-muted">
                  <p>Добавьте аккаунты, чтобы увидеть статистику</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'training' && (redditMenuOpen || activeCustomSection) && (
            <TrainingComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'reports' && (redditMenuOpen || activeCustomSection) && (
            <ReportsComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'links' && (redditMenuOpen || activeCustomSection) && (
            <LinksComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'used' && (redditMenuOpen || activeCustomSection) && (
            <UsedComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'verifications' && (redditMenuOpen || activeCustomSection) && (
            <VerificationsComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'plan' && (redditMenuOpen || activeCustomSection) && (
            <PlanComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'proxy' && (redditMenuOpen || activeCustomSection) && (
            <ProxyComponent sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'frame25' && (redditMenuOpen || activeCustomSection) && (
            <Frame25Component sectionId={redditMenuOpen ? null : activeCustomSection} itemId={redditMenuOpen ? null : activeCustomItem} />
          )}

          {activeView === 'extensions' && redditMenuOpen && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 border border-cursor-border card-3d">
                <h2 className="text-2xl font-bold gradient-text mb-6">Скачать расширения</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      window.open('/api/extensions/download?type=token', '_blank')
                    }}
                    className="w-full px-4 py-4 rounded-xl border bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter transition flex items-center gap-4 btn-3d"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 text-left">
                      <div className="font-semibold text-lg mb-1">Расширение для извлечения токена</div>
                      <div className="text-sm text-cursor-text-muted">Скачать инструкцию и файлы для установки расширения, которое извлекает токен Reddit</div>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      window.open('/api/extensions/download?type=ads', '_blank')
                    }}
                    className="w-full px-4 py-4 rounded-xl border bg-cursor-darker text-cursor-text border-cursor-border hover:bg-cursor-lighter transition flex items-center gap-4 btn-3d"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 text-left">
                      <div className="font-semibold text-lg mb-1">Расширение для накрутки (ADS REDDIT)</div>
                      <div className="text-sm text-cursor-text-muted">Скачать инструкцию по установке расширения для накрутки лайков и комментариев</div>
                    </span>
                  </button>
        </div>
      </div>
            </div>
          )}

          {activeView === 'nextcloud' && (
            <NextcloudComponent />
          )}

          {activeView === 'settings' && (
            <SettingsComponent 
              customSections={customSections}
              setCustomSections={setCustomSections}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </div>
      </div>

      {/* Модальное окно добавления кастомного раздела */}
      {showAddSectionModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddSectionModal(false)
            setNewSectionName('')
            setNewSectionItems([
              { id: '1', type: 'training' },
              { id: '2', type: 'reports' }
            ])
          }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Новый раздел</h2>
              <button
                onClick={() => {
                  setShowAddSectionModal(false)
                  setNewSectionName('')
                  setNewSectionItems([
                    { id: '1', type: 'training' },
                    { id: '2', type: 'reports' }
                  ])
                }}
                className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
              >
                ×
              </button>
            </div>

            {/* Название раздела */}
            <div className="mb-4">
              <label className="block mb-2 text-cursor-text font-medium">Название раздела</label>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                placeholder="Введите название раздела..."
              />
            </div>

            {/* Кнопки внутри раздела */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-cursor-text font-medium">Кнопки внутри раздела</label>
                <button
                  onClick={() => {
                    const newId = Date.now().toString()
                    setNewSectionItems([...newSectionItems, { id: newId, type: 'custom' }])
                  }}
                  className="px-3 py-1.5 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text hover:bg-cursor-lighter transition text-sm btn-3d"
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить кнопку
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                {newSectionItems.map((item, index) => (
                  <div key={item.id} className="bg-cursor-darker rounded-lg p-4 border border-cursor-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cursor-text-muted text-sm font-medium">Кнопка {index + 1}</span>
                      {newSectionItems.length > 1 && (
                        <button
                          onClick={() => setNewSectionItems(newSectionItems.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div>
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const updated = [...newSectionItems]
                          updated[index].type = e.target.value as 'training' | 'reports' | 'custom' | 'links' | 'used' | 'verifications' | 'plan' | 'proxy' | 'frame25'
                          setNewSectionItems(updated)
                        }}
                        className="w-full px-3 py-2 bg-cursor-dark border border-cursor-border rounded-lg text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-1 focus:ring-cursor-primary/20 text-sm"
                      >
                        <option value="training">ОБУЧЕНИЕ</option>
                        <option value="reports">Отчет</option>
                        <option value="links">Профили</option>
                        <option value="used">Использованные</option>
                        <option value="verifications">Верификации</option>
                        <option value="plan">План</option>
                        <option value="proxy">Proxy</option>
                        <option value="frame25">25-Кадр</option>
                        <option value="custom">Кастомная</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddSectionModal(false)
                  setNewSectionName('')
                  setNewSectionItems([
                    { id: '1', type: 'training' },
                    { id: '2', type: 'reports' }
                  ])
                }}
                className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (newSectionName.trim() && newSectionItems.length > 0) {
                    const validItems = newSectionItems.map(item => ({
                      id: item.id,
                      name: getButtonNameByType(item.type),
                      type: item.type
                    }))
                    const newSection: CustomSection = {
                      id: Date.now().toString(),
                      name: newSectionName.trim(),
                      items: validItems,
                    }
                    setCustomSections([...customSections, newSection])
                    setOpenCustomMenus({ ...openCustomMenus, [newSection.id]: true })
                    setShowAddSectionModal(false)
                    setNewSectionName('')
                    setNewSectionItems([
                      { id: '1', type: 'training' },
                      { id: '2', type: 'reports' }
                    ])
                  }
                }}
                disabled={!newSectionName.trim() || newSectionItems.length === 0}
                className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-3d"
              >
                Создать раздел
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно настроек профиля */}
      {showProfileSettings && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProfileSettings(false)
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
          }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Настройки профиля</h2>
              <button
                onClick={() => {
                  setShowProfileSettings(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
              >
                ×
              </button>
            </div>

            {/* Email пользователя */}
            <div className="mb-6">
              <label className="block mb-2 text-cursor-text font-medium">Email</label>
              <div className="px-4 py-3 bg-cursor-darker border border-cursor-border rounded-xl text-cursor-text">
                {userEmail || 'Загрузка...'}
              </div>
              <p className="text-cursor-text-muted text-sm mt-2">Email используется для входа в систему</p>
            </div>

            {/* Двухфакторная аутентификация */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="block text-cursor-text font-medium mb-1">Двухфакторная аутентификация</label>
                  <p className="text-cursor-text-muted text-sm">Дополнительная защита вашего аккаунта</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token')
                      if (!token) return

                      const newState = !twoFactorEnabled
                      const response = await fetch('/api/user/two-factor', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ enabled: newState }),
                      })

                      if (response.ok) {
                        setTwoFactorEnabled(newState)
                        alert(newState ? 'Двухфакторная аутентификация включена' : 'Двухфакторная аутентификация выключена')
                      } else {
                        const error = await response.json()
                        alert(error.error || 'Ошибка обновления настроек')
                      }
                    } catch (error) {
                      console.error('Ошибка обновления двухфакторной аутентификации:', error)
                      alert('Ошибка обновления настроек')
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    twoFactorEnabled ? 'bg-gradient-cursor' : 'bg-cursor-lighter'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Смена пароля */}
            <div className="mb-6">
              <h3 className="text-lg font-bold gradient-text mb-4">Смена пароля</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-cursor-text font-medium">Текущий пароль</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                    placeholder="Введите текущий пароль"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-cursor-text font-medium">Новый пароль</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                    placeholder="Введите новый пароль (минимум 6 символов)"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-cursor-text font-medium">Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                    placeholder="Повторите новый пароль"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                      alert('Заполните все поля')
                      return
                    }

                    if (passwordForm.newPassword.length < 6) {
                      alert('Новый пароль должен содержать минимум 6 символов')
                      return
                    }

                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      alert('Новые пароли не совпадают')
                      return
                    }

                    try {
                      setChangingPassword(true)
                      const token = localStorage.getItem('token')
                      if (!token) {
                        alert('Ошибка авторизации')
                        return
                      }

                      const response = await fetch('/api/user/change-password', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          currentPassword: passwordForm.currentPassword,
                          newPassword: passwordForm.newPassword,
                        }),
                      })

                      const data = await response.json()

                      if (response.ok) {
                        alert('Пароль успешно изменен')
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      } else {
                        alert(data.error || 'Ошибка смены пароля')
                      }
                    } catch (error) {
                      console.error('Ошибка смены пароля:', error)
                      alert('Ошибка смены пароля')
                    } finally {
                      setChangingPassword(false)
                    }
                  }}
                  disabled={changingPassword}
                  className="w-full px-4 py-3 bg-gradient-cursor text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed btn-3d"
                >
                  {changingPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Изменение...
                    </span>
                  ) : (
                    'Изменить пароль'
                  )}
                </button>
              </div>
            </div>

            {/* Управление участниками кабинета */}
            <div className="mb-6 border-t border-cursor-border pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold gradient-text mb-1">Участники кабинета</h3>
                  <p className="text-cursor-text-muted text-sm">Управляйте доступом к вашему кабинету</p>
                </div>
                <button
                  onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                  className="px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold text-sm btn-3d"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить участника
                  </span>
                </button>
              </div>

              {/* Форма добавления участника */}
              {showAddMemberForm && (
                <div className="mb-4 p-4 bg-cursor-darker rounded-xl border border-cursor-border">
                  <h4 className="text-cursor-text font-medium mb-3">Добавить нового участника</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block mb-2 text-cursor-text text-sm">Email участника</label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d text-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-cursor-text text-sm font-medium">Права доступа</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-cursor-text text-sm">
                          <input
                            type="checkbox"
                            checked={newMemberPermissions.canView}
                            onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canView: e.target.checked })}
                            className="rounded"
                          />
                          <span>Просмотр</span>
                        </label>
                        <label className="flex items-center gap-2 text-cursor-text text-sm">
                          <input
                            type="checkbox"
                            checked={newMemberPermissions.canEdit}
                            onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canEdit: e.target.checked })}
                            className="rounded"
                          />
                          <span>Редактирование</span>
                        </label>
                        <label className="flex items-center gap-2 text-cursor-text text-sm">
                          <input
                            type="checkbox"
                            checked={newMemberPermissions.canDelete}
                            onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canDelete: e.target.checked })}
                            className="rounded"
                          />
                          <span>Удаление</span>
                        </label>
                        <label className="flex items-center gap-2 text-cursor-text text-sm">
                          <input
                            type="checkbox"
                            checked={newMemberPermissions.canManageMembers}
                            onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canManageMembers: e.target.checked })}
                            className="rounded"
                          />
                          <span>Управление участниками</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!newMemberEmail) {
                            alert('Введите email участника')
                            return
                          }

                          try {
                            const token = localStorage.getItem('token')
                            if (!token) return

                            const response = await fetch('/api/cabinet/members', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                memberEmail: newMemberEmail,
                                ...newMemberPermissions,
                              }),
                            })

                            const data = await response.json()

                              if (response.ok) {
                                if (data.invitationLink) {
                                  const emailMessage = data.emailSent 
                                    ? '\n\n✅ Email уведомление отправлено участнику на его почту!'
                                    : '\n\n📧 Email уведомление будет отправлено участнику.'
                                  alert(`Участник успешно добавлен!${emailMessage}\n\nСсылка для приглашения:\n${data.invitationLink}\n\nСсылка скопирована в буфер обмена.`)
                                  // Копируем ссылку в буфер обмена
                                  navigator.clipboard.writeText(data.invitationLink).catch(() => {})
                                } else {
                                  alert('Участник успешно добавлен')
                                }
                                setNewMemberEmail('')
                                setNewMemberPermissions({
                                  canView: true,
                                  canEdit: false,
                                  canDelete: false,
                                  canManageMembers: false,
                                })
                                setShowAddMemberForm(false)
                                loadCabinetMembers()
                              } else {
                                if (data.invitationLink) {
                                  alert(`Приглашение уже отправлено!\n\nСсылка для приглашения:\n${data.invitationLink}`)
                                  navigator.clipboard.writeText(data.invitationLink).catch(() => {})
                                } else {
                                  alert(data.error || 'Ошибка добавления участника')
                                }
                              }
                          } catch (error) {
                            console.error('Ошибка добавления участника:', error)
                            alert('Ошибка добавления участника')
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-gradient-cursor text-white rounded-xl font-semibold text-sm btn-3d"
                      >
                        Добавить
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMemberForm(false)
                          setNewMemberEmail('')
                          setNewMemberPermissions({
                            canView: true,
                            canEdit: false,
                            canDelete: false,
                            canManageMembers: false,
                          })
                        }}
                        className="px-4 py-2 bg-cursor-darker text-cursor-text rounded-xl font-semibold text-sm btn-3d"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Список участников */}
              {loadingMembers ? (
                <div className="text-center py-4 text-cursor-text-muted">
                  <svg className="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : cabinetMembers.length === 0 ? (
                <div className="text-center py-4 text-cursor-text-muted text-sm">
                  Нет участников. Добавьте первого участника, чтобы предоставить доступ к вашему кабинету.
                </div>
              ) : (
                <div className="space-y-2">
                  {cabinetMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 bg-cursor-darker rounded-xl border border-cursor-border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-cursor-text font-medium text-sm">{member.member.email}</div>
                          <div className="text-cursor-text-muted text-xs mt-1">
                            Добавлен {new Date(member.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Вы уверены, что хотите удалить этого участника?')) return

                            try {
                              const token = localStorage.getItem('token')
                              if (!token) return

                              const response = await fetch(`/api/cabinet/members/${member.id}`, {
                                method: 'DELETE',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              })

                              if (response.ok) {
                                alert('Участник удален')
                                loadCabinetMembers()
                              } else {
                                const data = await response.json()
                                alert(data.error || 'Ошибка удаления участника')
                              }
                            } catch (error) {
                              console.error('Ошибка удаления участника:', error)
                              alert('Ошибка удаления участника')
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Удалить участника"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${member.canView ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Просмотр
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${member.canEdit ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Редактирование
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${member.canDelete ? 'bg-orange-600/30 text-orange-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Удаление
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${member.canManageMembers ? 'bg-purple-600/30 text-purple-300' : 'bg-gray-600/30 text-gray-400'}`}>
                          Управление
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          const newPermissions = {
                            canView: !member.canView,
                            canEdit: !member.canEdit,
                            canDelete: !member.canDelete,
                            canManageMembers: !member.canManageMembers,
                          }

                          // Простое переключение - можно улучшить с отдельным модальным окном
                          if (confirm('Изменить права доступа?')) {
                            try {
                              const token = localStorage.getItem('token')
                              if (!token) return

                              const response = await fetch(`/api/cabinet/members/${member.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  canView: member.canView,
                                  canEdit: !member.canEdit,
                                  canDelete: member.canDelete,
                                  canManageMembers: member.canManageMembers,
                                }),
                              })

                              if (response.ok) {
                                loadCabinetMembers()
                              } else {
                                const data = await response.json()
                                alert(data.error || 'Ошибка обновления прав')
                              }
                            } catch (error) {
                              console.error('Ошибка обновления прав:', error)
                              alert('Ошибка обновления прав')
                            }
                          }
                        }}
                        className="mt-2 text-xs text-cursor-primary hover:text-cursor-text transition"
                      >
                        Изменить права
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления анкеты */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddForm(false)
            setFormData({ username: '', redditUrl: '', email: '', password: '', redditToken: '' })
          }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold gradient-text">
                Добавить аккаунт Reddit
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ username: '', redditUrl: '', email: '', password: '', redditToken: '' })
                }}
                className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="space-y-5">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  🔑 Токен Reddit
                </label>
                <textarea
                  value={formData.redditToken}
                  onChange={(e) =>
                    setFormData({ ...formData, redditToken: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 resize-none font-mono text-sm input-3d"
                  placeholder="Вставьте токен из расширения Cabinet"
                  rows={6}
                />
                <p className="mt-2 text-xs text-cursor-text-muted">
                  📋 Скопируйте токен из расширения и вставьте сюда. Система автоматически извлечет все данные профиля Reddit (username, статистику и т.д.)
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ username: '', redditUrl: '', email: '', password: '', redditToken: '' })
                  }}
                  className="px-6 py-2 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно синхронизации с Excel */}
      {showExcelModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowExcelModal(false)
            setExcelUrl('')
            setError('')
          }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold gradient-text">
                Синхронизация с Excel
              </h2>
              <button
                onClick={() => {
                  setShowExcelModal(false)
                  setExcelUrl('')
                  setError('')
                }}
                className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleExcelSync} className="space-y-5">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Ссылка на Excel файл
                </label>
                <input
                  type="url"
                  value={excelUrl}
                  onChange={(e) => setExcelUrl(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                  placeholder="https://example.com/file.xlsx"
                />
                <p className="mt-2 text-sm text-cursor-text-muted">
                  Excel файл должен содержать данные в колонках A-C (начиная со строки 2):<br/>
                  A - Логин, B - Пароль, C - Ссылка<br/>
                  Опционально: D - День, E - Карма, F - Посты, G - Просмотры
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loadingExcel}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden"
                >
                  {loadingExcel ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExcelModal(false)
                    setExcelUrl('')
                    setError('')
                  }}
                  className="px-6 py-3 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно накрутки комментариев */}
      {showBoostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-cursor-border relative">
            <button
              onClick={() => {
                setShowBoostModal(false)
                setBoostAccountId(null)
              }}
              className="absolute top-4 right-4 text-cursor-text-muted hover:text-cursor-text transition-colors text-2xl leading-none"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold gradient-text mb-6">Накрутка комментариев</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Сабреддит (например: r/aww или aww)
                </label>
                <input
                  type="text"
                  value={boostSettings.subreddit}
                  onChange={(e) => setBoostSettings({ ...boostSettings, subreddit: e.target.value })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="r/aww или оставьте пустым для r/all"
                />
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Количество комментариев
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={boostSettings.maxComments}
                  onChange={(e) => setBoostSettings({ ...boostSettings, maxComments: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                />
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Задержка между комментариями (мс)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={boostSettings.delayBetweenComments}
                  onChange={(e) => setBoostSettings({ ...boostSettings, delayBetweenComments: parseInt(e.target.value) || 5000 })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                />
                <p className="mt-1 text-xs text-cursor-text-muted">
                  Рекомендуется: 5000-10000 мс (5-10 секунд)
                </p>
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Текст комментария (необязательно)
                </label>
                <textarea
                  value={boostSettings.commentText}
                  onChange={(e) => setBoostSettings({ ...boostSettings, commentText: e.target.value })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 resize-none input-3d"
                  placeholder="Оставьте пустым для случайного комментария"
                  rows={3}
                />
                <p className="mt-1 text-xs text-cursor-text-muted">
                  Если не указано, будет использован случайный комментарий
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBoostModal(false)
                    setBoostAccountId(null)
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleBoostComments}
                  disabled={boosting !== null}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden"
                >
                  {boosting ? 'Запуск...' : 'Запустить накрутку'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования аккаунта */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-cursor-border relative">
            <button
              onClick={() => {
                setShowEditModal(false)
                setEditAccountId(null)
                setEditFormData({ email: '', password: '' })
                setError('')
              }}
              className="absolute top-4 right-4 text-cursor-text-muted hover:text-cursor-text transition-colors text-2xl leading-none"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold gradient-text mb-6">Редактировать аккаунт</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Пароль
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 input-3d"
                  placeholder="Введите пароль"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditAccountId(null)
                    setEditFormData({ email: '', password: '' })
                    setError('')
                  }}
                  className="flex-1 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-cursor btn-3d"
                >
                  Отмена
                </button>
                <button
                  onClick={handleEditAccount}
                  disabled={savingEdit || !editFormData.email || !editFormData.password}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden"
                >
                  {savingEdit ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </span>
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно приглашения */}
      {showInvitationModal && pendingInvitation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowInvitationModal(false)
            setPendingInvitation(null)
          }}
        >
          <div
            className="glass rounded-2xl p-8 max-w-md w-full shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-cursor flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {pendingInvitation.sender.email.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-2">
                Новое приглашение!
              </h2>
              <p className="text-cursor-text-muted">
                <strong className="text-cursor-text">{pendingInvitation.sender.email}</strong> приглашает вас в свой кабинет
              </p>
            </div>

            <div className="mb-6 p-4 bg-cursor-darker rounded-xl border border-cursor-border">
              <h3 className="text-cursor-text font-semibold mb-3 text-sm">Права доступа:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${pendingInvitation.canView ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Просмотр</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${pendingInvitation.canEdit ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Редактирование</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${pendingInvitation.canDelete ? 'bg-orange-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Удаление</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${pendingInvitation.canManageMembers ? 'bg-purple-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Управление участниками</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                      alert('Ошибка авторизации')
                      return
                    }

                    const response = await fetch(`/api/cabinet/invitations/${pendingInvitation.token}`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })

                    if (response.ok) {
                      setShowInvitationModal(false)
                      setPendingInvitation(null)
                      localStorage.removeItem('lastShownInvitationId')
                      loadInvitations()
                      loadCabinetMembers()
                      alert('Приглашение принято!')
                    } else {
                      const data = await response.json()
                      alert(data.error || 'Ошибка принятия приглашения')
                    }
                  } catch (error) {
                    console.error('Ошибка принятия приглашения:', error)
                    alert('Ошибка принятия приглашения')
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-3d"
              >
                Принять
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                      alert('Ошибка авторизации')
                      return
                    }

                    const response = await fetch(`/api/cabinet/invitations/${pendingInvitation.token}`, {
                      method: 'DELETE',
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })

                    if (response.ok) {
                      setShowInvitationModal(false)
                      setPendingInvitation(null)
                      localStorage.removeItem('lastShownInvitationId')
                      loadInvitations()
                    } else {
                      const data = await response.json()
                      alert(data.error || 'Ошибка отклонения приглашения')
                    }
                  } catch (error) {
                    console.error('Ошибка отклонения приглашения:', error)
                    alert('Ошибка отклонения приглашения')
                  }
                }}
                className="flex-1 px-6 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold btn-3d"
              >
                Отклонить
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href={`/invite/${pendingInvitation.token}`}
                className="text-sm text-cursor-primary hover:text-cursor-text transition"
                onClick={(e) => e.stopPropagation()}
              >
                Открыть приглашение →
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

