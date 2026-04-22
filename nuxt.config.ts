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
    '@nuxt/icon'
  ],

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
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300..700;1,300..700&family=Inter:wght@300;400;500;600;700&display=swap' }
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

  compatibilityDate: '2024-11-01'
})
