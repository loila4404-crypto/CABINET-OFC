'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { saveUserData, getUserData } from './user-data'

// Хук для синхронизированного хранилища (localStorage + сервер)
export function useSyncedStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    debounceMs?: number // Задержка перед сохранением на сервер (по умолчанию 1000ms)
    syncOnMount?: boolean // Синхронизировать с сервером при монтировании (по умолчанию true)
  }
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const { debounceMs = 1000, syncOnMount = true } = options || {}
  
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error(`Ошибка загрузки ${key} из localStorage:`, error)
    }
    
    return initialValue
  })
  
  const [isLoading, setIsLoading] = useState(syncOnMount)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Загружаем данные с сервера при монтировании
  useEffect(() => {
    mountedRef.current = true
    
    if (!syncOnMount) {
      setIsLoading(false)
      return
    }
    
    const loadFromServer = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoading(false)
        return
      }
      
      try {
        const serverData = await getUserData(key)
        if (serverData !== null && mountedRef.current) {
          setValue(serverData)
          localStorage.setItem(key, JSON.stringify(serverData))
        }
      } catch (error) {
        console.error(`Ошибка загрузки ${key} с сервера:`, error)
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }
    
    loadFromServer()
    
    return () => {
      mountedRef.current = false
    }
  }, [key, syncOnMount])

  // Функция для установки значения
  const setValueAndSync = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue
      
      // Сохраняем в localStorage сразу
      try {
        localStorage.setItem(key, JSON.stringify(resolved))
      } catch (error) {
        console.error(`Ошибка сохранения ${key} в localStorage:`, error)
      }
      
      // Отложенное сохранение на сервер (debounce)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        const token = localStorage.getItem('token')
        if (!token) return
        
        try {
          await saveUserData(key, resolved)
        } catch (error) {
          console.error(`Ошибка сохранения ${key} на сервер:`, error)
        }
      }, debounceMs)
      
      return resolved
    })
  }, [key, debounceMs])

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return [value, setValueAndSync, isLoading]
}

// Хук для синхронизации настроек пользователя
export function useSyncedSettings<T extends Record<string, any>>(
  settingsKey: keyof T,
  initialValue: T[keyof T]
): [T[keyof T], (value: T[keyof T]) => void] {
  const [value, setValue] = useState<T[keyof T]>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const saved = localStorage.getItem(settingsKey as string)
      if (saved) {
        // Для boolean значений
        if (saved === 'true') return true as T[keyof T]
        if (saved === 'false') return false as T[keyof T]
        return saved as T[keyof T]
      }
    } catch {
      // Игнорируем ошибку
    }
    
    return initialValue
  })

  const setValueAndSync = useCallback((newValue: T[keyof T]) => {
    setValue(newValue)
    
    try {
      localStorage.setItem(settingsKey as string, String(newValue))
    } catch {
      // Игнорируем ошибку
    }
    
    // Сохраняем на сервер
    const token = localStorage.getItem('token')
    if (token) {
      import('./user-data').then(({ saveUserSettings }) => {
        saveUserSettings({ [settingsKey]: newValue } as any).catch(console.error)
      })
    }
  }, [settingsKey])

  return [value, setValueAndSync]
}

