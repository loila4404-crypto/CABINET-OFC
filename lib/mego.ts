// Утилита для работы с Mego облачным хранилищем
// Mego API: https://mego.cloud/api

export interface MegoConfig {
  apiKey: string
  apiSecret: string
  baseUrl?: string
}

export interface MegoFile {
  id: string
  name: string
  size: number
  created: string
  modified: string
  downloadUrl?: string
}

class MegoClient {
  private config: MegoConfig
  private baseUrl: string

  constructor(config: MegoConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://mego.cloud/api/v1'
  }

  /**
   * Загружает файл в Mego
   */
  async uploadFile(fileName: string, content: string | Blob, folder?: string): Promise<MegoFile> {
    try {
      const formData = new FormData()
      
      if (typeof content === 'string') {
        const blob = new Blob([content], { type: 'application/json' })
        formData.append('file', blob, fileName)
      } else {
        formData.append('file', content, fileName)
      }

      if (folder) {
        formData.append('folder', folder)
      }

      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Ошибка загрузки файла: ${response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error('Ошибка загрузки в Mego:', error)
      throw error
    }
  }

  /**
   * Скачивает файл из Mego
   */
  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
        },
      })

      if (!response.ok) {
        throw new Error(`Ошибка скачивания файла: ${response.statusText}`)
      }

      return await response.text()
    } catch (error: any) {
      console.error('Ошибка скачивания из Mego:', error)
      throw error
    }
  }

  /**
   * Получает список файлов в папке
   */
  async listFiles(folder?: string): Promise<MegoFile[]> {
    try {
      const url = folder 
        ? `${this.baseUrl}/files?folder=${encodeURIComponent(folder)}`
        : `${this.baseUrl}/files`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
        },
      })

      if (!response.ok) {
        throw new Error(`Ошибка получения списка файлов: ${response.statusText}`)
      }

      const data = await response.json()
      return data.files || []
    } catch (error: any) {
      console.error('Ошибка получения списка файлов из Mego:', error)
      throw error
    }
  }

  /**
   * Удаляет файл из Mego
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Secret': this.config.apiSecret,
        },
      })

      return response.ok
    } catch (error: any) {
      console.error('Ошибка удаления файла из Mego:', error)
      return false
    }
  }

  /**
   * Создает или обновляет файл (если существует, обновляет, иначе создает)
   */
  async upsertFile(fileName: string, content: string, folder?: string): Promise<MegoFile> {
    try {
      // Сначала пытаемся найти существующий файл
      const files = await this.listFiles(folder)
      const existingFile = files.find(f => f.name === fileName)

      if (existingFile) {
        // Если файл существует, удаляем и создаем заново (обновление)
        await this.deleteFile(existingFile.id)
      }

      // Создаем новый файл
      return await this.uploadFile(fileName, content, folder)
    } catch (error: any) {
      console.error('Ошибка upsert файла в Mego:', error)
      throw error
    }
  }
}

// Создаем экземпляр клиента (будет инициализирован через API)
let megoClient: MegoClient | null = null

export function initMegoClient(config: MegoConfig): void {
  megoClient = new MegoClient(config)
}

export function getMegoClient(): MegoClient {
  if (!megoClient) {
    throw new Error('Mego клиент не инициализирован. Вызовите initMegoClient() сначала.')
  }
  return megoClient
}

// Утилиты для синхронизации localStorage с Mego
export interface SyncData {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  cookies: string
  timestamp: number
}

/**
 * Экспортирует все данные из localStorage и sessionStorage
 */
export function exportStorageData(): SyncData {
  const localStorageData: Record<string, string> = {}
  const sessionStorageData: Record<string, string> = {}

  // Копируем все данные из localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      localStorageData[key] = localStorage.getItem(key) || ''
    }
  }

  // Копируем все данные из sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key) {
      sessionStorageData[key] = sessionStorage.getItem(key) || ''
    }
  }

  // Получаем cookies
  const cookies = document.cookie

  return {
    localStorage: localStorageData,
    sessionStorage: sessionStorageData,
    cookies,
    timestamp: Date.now(),
  }
}

/**
 * Импортирует данные в localStorage и sessionStorage
 */
export function importStorageData(data: SyncData): void {
  // Импортируем localStorage
  Object.entries(data.localStorage).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn(`Не удалось импортировать ключ ${key} в localStorage:`, e)
    }
  })

  // Импортируем sessionStorage
  Object.entries(data.sessionStorage).forEach(([key, value]) => {
    try {
      sessionStorage.setItem(key, value)
    } catch (e) {
      console.warn(`Не удалось импортировать ключ ${key} в sessionStorage:`, e)
    }
  })

  // Импортируем cookies (только если они не установлены)
  if (data.cookies && !document.cookie) {
    // Устанавливаем cookies через document.cookie
    data.cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        document.cookie = `${name}=${value}; path=/; max-age=31536000` // 1 год
      }
    })
  }
}

/**
 * Синхронизирует данные с Mego
 */
export async function syncToMego(userId: string): Promise<boolean> {
  try {
    const data = exportStorageData()
    const fileName = `user-${userId}-data.json`
    const folder = 'reddit-cabinet-sync'

    const client = getMegoClient()
    await client.upsertFile(fileName, JSON.stringify(data, null, 2), folder)

    console.log('✅ Данные синхронизированы с Mego')
    return true
  } catch (error) {
    console.error('❌ Ошибка синхронизации с Mego:', error)
    return false
  }
}

/**
 * Загружает данные из Mego
 */
export async function syncFromMego(userId: string): Promise<boolean> {
  try {
    const fileName = `user-${userId}-data.json`
    const folder = 'reddit-cabinet-sync'

    const client = getMegoClient()
    const files = await client.listFiles(folder)
    const userFile = files.find(f => f.name === fileName)

    if (!userFile) {
      console.log('📭 Файл данных не найден в Mego, используем локальные данные')
      return false
    }

    const content = await client.downloadFile(userFile.id)
    const data: SyncData = JSON.parse(content)

    importStorageData(data)
    console.log('✅ Данные загружены из Mego')
    return true
  } catch (error) {
    console.error('❌ Ошибка загрузки из Mego:', error)
    return false
  }
}





