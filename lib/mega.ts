// Утилита для работы с MEGA облачным хранилищем
// Используем megajs пакет: npm install megajs

// Для установки выполните: npm install megajs
// Затем раскомментируйте импорт ниже
// import Mega from 'megajs'

export interface MegaConfig {
  email: string
  password: string
  recoveryKey?: string // Recovery Key для восстановления доступа
}

export interface MegaFile {
  id: string
  name: string
  size: number
  created: number
  modified: number
  downloadUrl?: string
}

class MegaClient {
  private config: MegaConfig
  private initialized: boolean = false
  private session: any = null

  constructor(config: MegaConfig) {
    this.config = config
  }

  /**
   * Инициализирует подключение к MEGA
   * Используем megajs для работы с MEGA API
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Проверяем наличие пакета megajs
      let Mega: any
      try {
        Mega = require('megajs').default
      } catch (e) {
        console.warn('⚠️ Пакет megajs не установлен. Установите: npm install megajs')
        // В режиме разработки продолжаем работу
        if (process.env.NODE_ENV === 'development') {
          this.initialized = true
          this.session = { email: this.config.email, mock: true }
          console.warn('⚠️ Используется режим разработки без реального подключения к MEGA')
          return
        }
        throw new Error('Пакет megajs не установлен. Выполните: npm install megajs')
      }

      // Создаем экземпляр MEGA клиента
      const storage = new Mega({
        email: this.config.email,
        password: this.config.password,
        autologin: false,
      })

      // Ждем готовности
      await new Promise((resolve, reject) => {
        storage.ready.then(() => {
          if (this.config.recoveryKey) {
            // Используем Recovery Key если указан
            storage.login(this.config.recoveryKey).then(() => {
              this.session = storage
              this.initialized = true
              console.log('✅ Подключение к MEGA установлено (с Recovery Key)')
              resolve(true)
            }).catch(reject)
          } else {
            this.session = storage
            this.initialized = true
            console.log('✅ Подключение к MEGA установлено')
            resolve(true)
          }
        }).catch(reject)
      })
    } catch (error: any) {
      console.error('❌ Ошибка подключения к MEGA:', error)
      // В режиме разработки продолжаем работу без реального подключения
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Используется режим разработки без реального подключения к MEGA')
        this.initialized = true
        this.session = { email: this.config.email, mock: true }
      } else {
        throw new Error(`Ошибка подключения к MEGA: ${error.message}`)
      }
    }
  }

  /**
   * Загружает файл в MEGA
   */
  async uploadFile(fileName: string, content: string | Buffer, folderPath?: string): Promise<MegaFile> {
    try {
      await this.initialize()

      // Если это mock режим, просто логируем
      if (this.session?.mock) {
        const sizeInBytes = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length
        const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2)
        console.warn('⚠️ [MOCK РЕЖИМ] Файл НЕ загружается в реальный MEGA!')
        console.log(`📤 [MOCK] Загрузка файла ${fileName} в MEGA (только симуляция)`)
        console.log(`📊 Размер файла: ${sizeInMB} MB (${sizeInBytes} байт)`)
        console.warn('⚠️ В режиме разработки файлы не сохраняются в реальный MEGA аккаунт!')
        console.warn('   Для реальной синхронизации убедитесь, что:')
        console.warn('   1. MEGA_EMAIL и MEGA_PASSWORD настроены в .env')
        console.warn('   2. Пакет megajs установлен: npm install megajs')
        console.warn('   3. Приложение запущено не в режиме разработки')
        return {
          id: `mock_${Date.now()}`,
          name: fileName,
          size: sizeInBytes,
          created: Date.now(),
          modified: Date.now(),
        }
      }

      // Конвертируем строку в Buffer, если нужно
      const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content

      // Находим или создаем папку
      let folder: any = null
      if (folderPath) {
        // Ищем папку или создаем новую
        const folders = this.session.root.children
        folder = folders.find((f: any) => f.name === folderPath)
        if (!folder) {
          folder = this.session.mkdir(folderPath)
        }
      }

      // Загружаем файл
      return new Promise((resolve, reject) => {
        this.session.upload(fileName, buffer, folder, (err: any, file: any) => {
          if (err) {
            reject(err)
            return
          }
          resolve({
            id: file.downloadId || file.nodeId,
            name: file.name,
            size: file.size,
            created: file.timestamp,
            modified: file.timestamp,
          })
        })
      })
    } catch (error: any) {
      console.error('Ошибка загрузки файла в MEGA:', error)
      throw error
    }
  }

  /**
   * Скачивает файл из MEGA
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      await this.initialize()

      // Если это mock режим, возвращаем пустой buffer
      if (this.session?.mock) {
        console.log(`📥 [MOCK] Скачивание файла ${fileId} из MEGA`)
        return Buffer.from('{}')
      }

      // Находим файл по ID
      const file = this.findFileById(fileId)
      if (!file) {
        throw new Error(`Файл с ID ${fileId} не найден`)
      }

      // Скачиваем файл
      return new Promise((resolve, reject) => {
        file.download((err: any, data: Buffer) => {
          if (err) {
            reject(err)
            return
          }
          resolve(data)
        })
      })
    } catch (error: any) {
      console.error('Ошибка скачивания файла из MEGA:', error)
      throw error
    }
  }

  /**
   * Находит файл по ID в дереве файлов MEGA
   */
  private findFileById(fileId: string): any {
    if (!this.session || this.session.mock) return null

    const searchInNode = (node: any): any => {
      if (node.downloadId === fileId || node.nodeId === fileId) {
        return node
      }
      if (node.children) {
        for (const child of node.children) {
          const found = searchInNode(child)
          if (found) return found
        }
      }
      return null
    }

    return searchInNode(this.session.root)
  }

  /**
   * Получает список файлов в папке
   */
  async listFiles(folderPath?: string): Promise<MegaFile[]> {
    try {
      await this.initialize()

      // Если это mock режим, возвращаем пустой массив
      if (this.session?.mock) {
        console.log(`📋 [MOCK] Получение списка файлов из MEGA`)
        return []
      }

      // Находим папку
      let folder = this.session.root
      if (folderPath) {
        const folders = this.getAllFolders(this.session.root)
        folder = folders.find((f: any) => f.name === folderPath) || this.session.root
      }

      // Получаем все файлы в папке
      const files: MegaFile[] = []
      const processNode = (node: any) => {
        if (node.directory) {
          // Это папка, обрабатываем детей
          if (node.children) {
            node.children.forEach(processNode)
          }
        } else {
          // Это файл
          files.push({
            id: node.downloadId || node.nodeId,
            name: node.name,
            size: node.size || 0,
            created: node.timestamp || Date.now(),
            modified: node.timestamp || Date.now(),
          })
        }
      }

      if (folder.children) {
        folder.children.forEach(processNode)
      }

      return files
    } catch (error: any) {
      console.error('Ошибка получения списка файлов из MEGA:', error)
      throw error
    }
  }

  /**
   * Получает все папки из дерева
   */
  private getAllFolders(node: any): any[] {
    const folders: any[] = []
    if (node.directory) {
      folders.push(node)
    }
    if (node.children) {
      node.children.forEach((child: any) => {
        folders.push(...this.getAllFolders(child))
      })
    }
    return folders
  }

  /**
   * Удаляет файл из MEGA
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.initialize()

      // Если это mock режим, просто возвращаем true
      if (this.session?.mock) {
        console.log(`🗑️ [MOCK] Удаление файла ${fileId} из MEGA`)
        return true
      }

      // Находим файл по ID
      const file = this.findFileById(fileId)
      if (!file) {
        return false
      }

      // Удаляем файл
      return new Promise((resolve) => {
        file.delete((err: any) => {
          if (err) {
            console.error('Ошибка удаления файла:', err)
            resolve(false)
          } else {
            resolve(true)
          }
        })
      })
    } catch (error: any) {
      console.error('Ошибка удаления файла из MEGA:', error)
      return false
    }
  }

  /**
   * Создает или обновляет файл (если существует, обновляет, иначе создает)
   */
  async upsertFile(fileName: string, content: string | Buffer, folderPath?: string): Promise<MegaFile> {
    try {
      await this.initialize()

      // Ищем существующий файл
      const files = await this.listFiles(folderPath)
      const existingFile = files.find(f => f.name === fileName)

      if (existingFile) {
        // Удаляем старый файл
        await this.deleteFile(existingFile.id)
      }

      // Создаем новый файл
      return await this.uploadFile(fileName, content, folderPath)
    } catch (error: any) {
      console.error('Ошибка upsert файла в MEGA:', error)
      throw error
    }
  }

  /**
   * Находит файл по имени
   */
  async findFile(fileName: string, folderPath?: string): Promise<MegaFile | null> {
    try {
      const files = await this.listFiles(folderPath)
      return files.find(f => f.name === fileName) || null
    } catch (error: any) {
      console.error('Ошибка поиска файла в MEGA:', error)
      return null
    }
  }
}

// Создаем экземпляр клиента (будет инициализирован через API)
let megaClient: MegaClient | null = null

export function initMegaClient(config: MegaConfig): void {
  megaClient = new MegaClient(config)
}

export function getMegaClient(): MegaClient {
  if (!megaClient) {
    throw new Error('MEGA клиент не инициализирован. Вызовите initMegaClient() сначала.')
  }
  return megaClient
}

// Утилиты для синхронизации localStorage с MEGA
export interface SyncData {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  cookies: string
  timestamp: number
}

/**
 * Синхронизирует данные с MEGA
 */
export async function syncToMega(userId: string): Promise<boolean> {
  try {
    const data = {
      localStorage: {} as Record<string, string>,
      sessionStorage: {} as Record<string, string>,
      cookies: typeof document !== 'undefined' ? document.cookie : '',
      timestamp: Date.now(),
    }

    // Экспортируем localStorage (только на клиенте)
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !key.startsWith('mega_')) {
          try {
            data.localStorage[key] = localStorage.getItem(key) || ''
          } catch (e) {
            console.warn(`Не удалось экспортировать ${key}:`, e)
          }
        }
      }

      // Экспортируем sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && !key.startsWith('mega_')) {
          try {
            data.sessionStorage[key] = sessionStorage.getItem(key) || ''
          } catch (e) {
            console.warn(`Не удалось экспортировать ${key}:`, e)
          }
        }
      }
    }

    const fileName = `user-${userId}-data.json`
    const folderPath = 'reddit-cabinet-sync'

    // Подсчитываем размер данных перед отправкой
    const jsonString = JSON.stringify(data, null, 2)
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8')
    const sizeInKB = (sizeInBytes / 1024).toFixed(2)
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2)
    
    console.log('📤 Загрузка файла в MEGA:', {
      fileName,
      folderPath,
      sizeInBytes,
      sizeInKB: `${sizeInKB} KB`,
      sizeInMB: `${sizeInMB} MB`,
      localStorageKeys: Object.keys(data.localStorage).length,
      sessionStorageKeys: Object.keys(data.sessionStorage).length
    })

    const client = getMegaClient()
    const result = await client.upsertFile(fileName, jsonString, folderPath)
    
    console.log('✅ Данные синхронизированы с MEGA')
    console.log('📊 Результат загрузки:', {
      fileName: result.name,
      fileId: result.id,
      fileSize: result.size,
      fileSizeKB: `${(result.size / 1024).toFixed(2)} KB`,
      fileSizeMB: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
      created: new Date(result.created).toISOString(),
      modified: new Date(result.modified).toISOString()
    })
    
    // Проверяем, что размер файла соответствует отправленным данным
    if (Math.abs(result.size - sizeInBytes) > 100) {
      console.warn('⚠️ Размер файла в MEGA отличается от отправленных данных:', {
        отправлено: `${sizeInMB} MB (${sizeInBytes} байт)`,
        вMEGA: `${(result.size / 1024 / 1024).toFixed(2)} MB (${result.size} байт)`,
        разница: `${Math.abs(result.size - sizeInBytes)} байт`
      })
    } else {
      console.log('✅ Размер файла в MEGA соответствует отправленным данным')
    }
    
    return true
  } catch (error) {
    console.error('❌ Ошибка синхронизации с MEGA:', error)
    return false
  }
}

/**
 * Загружает данные из MEGA
 */
export async function syncFromMega(userId: string): Promise<SyncData | null> {
  try {
    const fileName = `user-${userId}-data.json`
    const folderPath = 'reddit-cabinet-sync'

    const client = getMegaClient()
    const file = await client.findFile(fileName, folderPath)

    if (!file) {
      console.log('📭 Файл данных не найден в MEGA, используем локальные данные')
      return null
    }

    const buffer = await client.downloadFile(file.id)
    const content = buffer.toString('utf-8')
    const data: SyncData = JSON.parse(content)

    // Импортируем данные (только на клиенте)
    if (typeof window !== 'undefined') {
      Object.entries(data.localStorage).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value)
        } catch (e) {
          console.warn(`Не удалось импортировать ${key} в localStorage:`, e)
        }
      })

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

    console.log('✅ Данные загружены из MEGA')
    return data
  } catch (error) {
    console.error('❌ Ошибка загрузки из MEGA:', error)
    return null
  }
}

