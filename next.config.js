/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Оптимизация для Vercel
  swcMinify: true,
  // Отключаем строгую проверку типов при сборке
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Переменные окружения для клиента
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig











