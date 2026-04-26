// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  devServer: {
    port: 3001
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@nuxtjs/sitemap',
    '@nuxt/icon',
    '@nuxtjs/google-fonts'
  ],

  googleFonts: {
    families: {
      Fraunces: { wght: [300, 400], ital: [300] },
      Inter: [400, 500, 600, 700]
    },
    display: 'swap',
    download: true,
    inject: true,
    preload: true,
    preconnect: true
  },


  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Orgue Vivant — Concerts d\'orgues à Lille',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Concerts d\'orgues dans le centre ville de Lille — Saint Maurice & Saint Étienne.' },
        { property: 'og:title', content: 'Orgue Vivant' },
        { property: 'og:description', content: 'Concerts d\'orgues dans le centre ville de Lille' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/og-image.jpg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#0a0a0a' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: process.env.SUPABASE_URL ?? 'https://your-project.supabase.co' },
        { rel: 'dns-prefetch', href: process.env.SUPABASE_URL ?? 'https://your-project.supabase.co' }
      ]
    }
  },

  i18n: {
    restructureDir: false,
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', files: ['fr.json'] },
      { code: 'en', language: 'en-US', name: 'English', files: ['en.json'] }
    ],
    defaultLocale: 'fr',
    langDir: 'locales/',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  },

  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/admin/login',
      callback: '/admin',
      exclude: ['/*']
    }
  },

  site: {
    url: 'https://orgue-vivant.vercel.app',
    name: 'Orgue Vivant'
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY,
    myMemoryEmail: process.env.MYMEMORY_EMAIL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    contactTo: process.env.CONTACT_TO || 'contact@orgue-vivant.fr',
    contactFrom: process.env.CONTACT_FROM || 'contact@orgue-vivant.fr',
    public: {
      siteUrl: process.env.SITE_URL || 'https://orgue-vivant.vercel.app',
      supabaseUrl: process.env.SUPABASE_URL || ''
    }
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css'
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  nitro: {
    preset: 'vercel'
  },

  routeRules: {
    // Pages publiques : ISR (servi depuis CDN, regénéré toutes les heures)
    '/':         { isr: 3600 },
    '/concerts': { isr: 3600 },
    '/news':     { isr: 3600 },
    // Pages statiques : pré-rendues une fois au build
    '/about':    { prerender: true },
    '/contact':  { prerender: true },
    // Admin : toujours SSR, jamais mis en cache
    '/admin/**': { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },

    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    }
  },

  compatibilityDate: '2024-11-01'
})
