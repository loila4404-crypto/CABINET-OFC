// Утилита для работы с пользовательскими данными через API
// Автоматически синхронизирует данные между localStorage и сервером

const API_BASE = '/api/user-data'
const SETTINGS_API = '/api/user-settings'

// Получить токен авторизации
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// Получить заголовки для запроса
function getHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// === Работа с данными пользователя ===

// Получить данные по ключу
export async function getUserData(key: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`, {
      headers: getHeaders()
    })
    
    if (!response.ok) {
      console.warn(`Ошибка получения данных ${key}:`, response.status)
      return null
    }
    
    const data = await response.json()
    return data.value
  } catch (error) {
    console.error(`Ошибка получения данных ${key}:`, error)
    return null
  }
}

// Сохранить данные по ключу
export async function saveUserData(key: string, value: any): Promise<boolean> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    })
    
    if (!response.ok) {
      console.warn(`Ошибка сохранения данных ${key}:`, response.status)
      return false
    }
    
    return true
  } catch (error) {
    console.error(`Ошибка сохранения данных ${key}:`, error)
    return false
  }
}

// Получить все данные пользователя
export async function getAllUserData(): Promise<Record<string, any>> {
  try {
    const response = await fetch(API_BASE, {
      headers: getHeaders()
    })
    
    if (!response.ok) {
      console.warn('Ошибка получения всех данных:', response.status)
      return {}
    }
    
    return await response.json()
  } catch (error) {
    console.error('Ошибка получения всех данных:', error)
    return {}
  }
}

// Массовое сохранение данных
export async function saveMultipleUserData(data: Record<string, any>): Promise<boolean> {
  try {
    const response = await fetch(API_BASE, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      console.warn('Ошибка массового сохранения:', response.status)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Ошибка массового сохранения:', error)
    return false
  }
}

// Удалить данные по ключу
export async function deleteUserData(key: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    
    return response.ok
  } catch (error) {
    console.error(`Ошибка удаления данных ${key}:`, error)
    return false
  }
}

// === Работа с настройками пользователя ===

export interface UserSettings {
  theme: 'dark' | 'light'
  language: 'ru' | 'en'
  activeView: string
  redditMenuOpen: boolean
}

// Получить настройки пользователя
export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const response = await fetch(SETTINGS_API, {
      headers: getHeaders()
    })
    
    if (!response.ok) {
      console.warn('Ошибка получения настроек:', response.status)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Ошибка получения настроек:', error)
    return null
  }
}

// Сохранить настройки пользователя
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<boolean> {
  try {
    const response = await fetch(SETTINGS_API, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    })
    
    return response.ok
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error)
    return false
  }
}

// === Синхронизация localStorage с сервером ===

// Миграция данных из localStorage на сервер (вызывается один раз при первом входе)
export async function migrateLocalStorageToServer(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const token = getToken()
  if (!token) return
  
  // Проверяем, была ли уже миграция
  const migrationDone = localStorage.getItem('_migration_done_v1')
  if (migrationDone) return
  
  console.log('🔄 Начинаем миграцию данных из localStorage на сервер...')
  
  const keysToMigrate = [
    'customSections',
    'openCustomMenus',
  ]
  
  // Также мигрируем все ключи, которые начинаются с определенных префиксов
  const prefixes = ['training_', 'reports_', 'links_', 'tasks_', 'profiles_', 'verifications_', 'plan_']
  
  const dataToMigrate: Record<string, any> = {}
  
  // Собираем простые ключи
  for (const key of keysToMigrate) {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        dataToMigrate[key] = JSON.parse(value)
      } catch {
        dataToMigrate[key] = value
      }
    }
  }
  
  // Собираем ключи с префиксами
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            dataToMigrate[key] = JSON.parse(value)
          } catch {
            dataToMigrate[key] = value
          }
        }
        break
      }
    }
  }
  
  // Мигрируем настройки
  const theme = localStorage.getItem('theme')
  const language = localStorage.getItem('language')
  const activeView = localStorage.getItem('activeView')
  const redditMenuOpen = localStorage.getItem('redditMenuOpen')
  
  if (theme || language || activeView || redditMenuOpen) {
    await saveUserSettings({
      ...(theme && { theme: theme as 'dark' | 'light' }),
      ...(language && { language: language as 'ru' | 'en' }),
      ...(activeView && { activeView }),
      ...(redditMenuOpen && { redditMenuOpen: redditMenuOpen === 'true' })
    })
  }
  
  // Мигрируем данные
  if (Object.keys(dataToMigrate).length > 0) {
    const success = await saveMultipleUserData(dataToMigrate)
    if (success) {
      console.log('✅ Миграция данных завершена успешно')
    } else {
      console.warn('⚠️ Миграция данных завершена с ошибками')
    }
  }
  
  // Помечаем миграцию как выполненную
  localStorage.setItem('_migration_done_v1', 'true')
}

// Загрузить данные с сервера в localStorage (для обратной совместимости)
export async function syncFromServer(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const token = getToken()
  if (!token) return
  
  try {
    // Загружаем настройки
    const settings = await getUserSettings()
    if (settings) {
      localStorage.setItem('theme', settings.theme)
      localStorage.setItem('language', settings.language)
      localStorage.setItem('activeView', settings.activeView)
      localStorage.setItem('redditMenuOpen', settings.redditMenuOpen.toString())
    }
    
    // Загружаем все данные
    const allData = await getAllUserData()
    for (const [key, value] of Object.entries(allData)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(key, valueStr)
    }
    
    console.log('✅ Данные синхронизированы с сервера')
  } catch (error) {
    console.error('❌ Ошибка синхронизации с сервера:', error)
  }
}

