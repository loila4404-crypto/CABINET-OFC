import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cabinet - Кабинет статистики Reddit',
  description: 'Управление и статистика ваших аккаунтов Reddit',
  themeColor: '#8B5CF6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="relative min-h-screen">
        {/* Фоновый слой с изображением и размытием */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          {/* Фоновое изображение */}
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundImage: 'url(/background.jpg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }} 
          />
          
          {/* Темный оверлей для лучшей читаемости - легкий, чтобы изображение было видно */}
          <div className="absolute inset-0 bg-gradient-to-br from-cursor-dark/40 via-cursor-darker/30 to-cursor-dark/40" />
          
          {/* Легкий затемняющий слой без размытия */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: 'rgba(10, 10, 11, 0.1)',
            }} 
          />
        </div>
        
        {/* Контент поверх фона */}
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}






