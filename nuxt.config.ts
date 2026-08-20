export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: true
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
    public: {
      appName: 'RetailShop ERP'
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    }
  },

  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server'
  }
})
