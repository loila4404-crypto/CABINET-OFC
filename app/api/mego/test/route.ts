import { NextResponse } from 'next/server'

// Простой тестовый маршрут для проверки работы API
export async function GET() {
  return NextResponse.json({ 
    message: 'MEGA API работает!',
    timestamp: Date.now(),
  })
}





