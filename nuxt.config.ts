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
    '@nuxtjs/google-fonts',
    // Mesure d'audience Vercel : sans cookie, servie depuis notre propre
    // domaine, elle ne requiert donc pas de consentement préalable.
    '@vercel/analytics/nuxt'
  ],

  googleFonts: {
    families: {
      Fraunces: { wght: [300, 400], ital: [300] },
      Inter: [400, 500, 600, 700]
    },
    subsets: ['latin'],
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
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/img/logo/favicon-32.png' },
        { rel: 'apple-touch-icon', href: '/img/logo/apple-touch-icon.png' },
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
    // Une URL par langue : `no_prefix` figeait la langue dans la page mise en
    // cache, si bien qu'un visiteur pouvait recevoir celle d'un autre. Google
    // recommande par ailleurs des URL distinctes plutôt que la détection
    // navigateur, que son robot n'émet pas.
    strategy: 'prefix_except_default',
    baseUrl: process.env.SITE_URL || 'https://orguevivant.fr',
    detectBrowserLanguage: {
      // Redirection uniquement depuis la racine : un lien profond partagé
      // garde la langue qu'il annonce. Le choix manuel est mémorisé dans un
      // cookie et prime ensuite sur la langue du navigateur.
      useCookie: true,
      cookieKey: 'i18n_redirected',
      cookieSecure: true,
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'fr'
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
    url: 'https://orguevivant.fr',
    name: 'Orgue Vivant'
  },

  sitemap: {
    // L'admin est déjà bloqué par robots.txt : ne pas le soumettre non plus au sitemap
    exclude: ['/_nuxt/**', '/_**', '/admin', '/admin/**', '/auth-setup']
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY,
    myMemoryEmail: process.env.MYMEMORY_EMAIL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelBypassToken: process.env.VERCEL_BYPASS_TOKEN,
    contactTo: process.env.CONTACT_TO || 'contact@orguevivant.fr',
    contactFrom: process.env.CONTACT_FROM || 'contact@orguevivant.fr',
    public: {
      siteUrl: process.env.SITE_URL || 'https://orguevivant.fr',
      supabaseUrl: process.env.SUPABASE_URL || ''
    }
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css'
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  nitro: {
    preset: 'vercel',
    vercel: {
      config: {
        // Permet la revalidation ISR à la demande (voir server/utils/revalidate.ts)
        bypassToken: process.env.VERCEL_BYPASS_TOKEN
      }
    }
  },

  routeRules: {
    // Pages publiques : ISR (servi depuis CDN, regénéré toutes les heures)
    // Racine non mise en cache : c'est la seule page qui redirige selon la
    // langue du navigateur, et une réponse servie depuis le CDN n'exécute
    // aucun code serveur. La mettre en cache rendrait la redirection aléatoire.
    '/':            { isr: false },
    '/concerts':    { isr: 3600 },
    '/news':        { isr: 3600 },
    '/en':          { isr: 3600 },
    '/en/concerts': { isr: 3600 },
    '/en/news':     { isr: 3600 },
    // Pages statiques : pré-rendues une fois au build
    '/about':       { prerender: true },
    '/contact':     { prerender: true },
    '/legal':       { prerender: true },
    '/privacy':     { prerender: true },
    '/en/about':    { prerender: true },
    '/en/contact':  { prerender: true },
    '/en/legal':    { prerender: true },
    '/en/privacy':  { prerender: true },
    // Admin : toujours SSR, jamais mis en cache
    '/admin/**': { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },

    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    }
  },

  compatibilityDate: '2024-11-01'
})
