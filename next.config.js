/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/finanzen',
  output: 'standalone',
  // Required for instrumentation.ts (register()) to run in Next.js 14 – it
  // boots the recurring-expense cron scheduler once per server start.
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
