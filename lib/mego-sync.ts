// Клиентская утилита для синхронизации с Mego через API

export interface SyncData {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  cookies: string
  timestamp: number
}

/**
 * Экспортирует все данные из браузера
 */
export function exportBrowserData(): SyncData {
  const localStorageData: Record<string, string> = {}
  const sessionStorageData: Record<string, string> = {}

  // Копируем все данные из localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && !key.startsWith('mego_')) { // Исключаем служебные ключи
      try {
        localStorageData[key] = localStorage.getItem(key) || ''
      } catch (e) {
        console.warn(`Не удалось экспортировать ${key}:`, e)
      }
    }
  }

  // Копируем все данные из sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && !key.startsWith('mego_')) {
      try {
        sessionStorageData[key] = sessionStorage.getItem(key) || ''
      } catch (e) {
        console.warn(`Не удалось экспортировать ${key}:`, e)
      }
    }
  }

  return {
    localStorage: localStorageData,
    sessionStorage: sessionStorageData,
    cookies: document.cookie,
    timestamp: Date.now(),
  }
}

/**
 * Импортирует данные в браузер
 */
export function importBrowserData(data: SyncData): void {
  // Импортируем localStorage
  Object.entries(data.localStorage).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn(`Не удалось импортировать ${key} в localStorage:`, e)
    }
  })

  // Импортируем sessionStorage
  Object.entries(data.sessionStorage).forEach(([key, value]) => {
    try {
      sessionStorage.setItem(key, value)
    } catch (e) {
      console.warn(`Не удалось импортировать ${key} в sessionStorage:`, e)
    }
  })

  // Импортируем cookies
  if (data.cookies) {
    data.cookies.split(';').forEach(cookie => {
      const trimmed = cookie.trim()
      if (trimmed) {
        const [name, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        if (name && value) {
          document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`
        }
      }
    })
  }
}

/**
 * Синхронизирует данные с Mego через API
 */
export async function syncToMegoAPI(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('⚠️ Токен не найден, синхронизация пропущена')
      return false
    }

    const data = exportBrowserData()
    
    // Подсчитываем размер данных
    const jsonString = JSON.stringify(data)
    const sizeInBytes = new Blob([jsonString]).size
    const sizeInKB = (sizeInBytes / 1024).toFixed(2)
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2)
    
    console.log('📤 Отправка данных в MEGA:', {
      localStorageKeys: Object.keys(data.localStorage).length,
      sessionStorageKeys: Object.keys(data.sessionStorage).length,
      sizeInBytes,
      sizeInKB: `${sizeInKB} KB`,
      sizeInMB: `${sizeInMB} MB`,
      timestamp: new Date(data.timestamp).toISOString()
    })
    
    // Логируем ключи localStorage для отладки
    const trainingKeys = Object.keys(data.localStorage).filter(key => key.includes('training'))
    if (trainingKeys.length > 0) {
      console.log('📚 Ключи обучения в localStorage:', trainingKeys)
      trainingKeys.forEach(key => {
        const value = data.localStorage[key]
        const valueSize = new Blob([value]).size
        console.log(`   - ${key}: ${(valueSize / 1024).toFixed(2)} KB`)
      })
    }

    const response = await fetch('/api/mego/sync', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: jsonString,
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Данные синхронизированы с MEGA:', result.message)
      console.log('📊 Размер отправленных данных:', `${sizeInMB} MB (${sizeInKB} KB)`)
      console.log('🕐 Время синхронизации:', new Date(result.timestamp || Date.now()).toISOString())
      localStorage.setItem('mego_lastSync', Date.now().toString())
      return true
    } else {
      const error = await response.json()
      console.error('❌ Ошибка синхронизации с MEGA:', error.error)
      console.error('📊 Размер данных, которые не удалось отправить:', `${sizeInMB} MB`)
      return false
    }
  } catch (error) {
    console.error('❌ Ошибка синхронизации с MEGA:', error)
    if (error instanceof Error) {
      console.error('   Детали ошибки:', error.message)
      console.error('   Stack:', error.stack)
    }
    return false
  }
}

/**
 * Загружает данные из Mego через API
 */
export async function syncFromMegoAPI(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('Токен не найден, загрузка пропущена')
      return false
    }

    const response = await fetch('/api/mego/sync', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (response.ok) {
      const result = await response.json()
      if (result.data) {
        // Импортируем данные в браузер
        importBrowserData(result.data)
        localStorage.setItem('mego_lastSync', Date.now().toString())
        console.log('✅ Данные загружены из MEGA и импортированы')
        return true
      }
      return false
    } else if (response.status === 404) {
      console.log('📭 Данные не найдены в MEGA, используем локальные')
      return false
    } else {
      const error = await response.json()
      console.error('❌ Ошибка загрузки из MEGA:', error.error)
      return false
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки из MEGA:', error)
    return false
  }
}

/**
 * Автоматическая синхронизация при изменении данных
 */
let syncTimeout: NodeJS.Timeout | null = null

export function autoSyncToMego(delay: number = 2000): void {
  // Отменяем предыдущую синхронизацию
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }

  // Планируем новую синхронизацию
  syncTimeout = setTimeout(() => {
    syncToMegoAPI().catch(console.error)
  }, delay)
}

/**
 * Проверяет, нужно ли синхронизировать данные
 */
export function shouldSync(): boolean {
  const lastSync = localStorage.getItem('mego_lastSync')
  if (!lastSync) return true

  const lastSyncTime = parseInt(lastSync, 10)
  const now = Date.now()
  const syncInterval = 5 * 60 * 1000 // 5 минут

  return (now - lastSyncTime) > syncInterval
}

