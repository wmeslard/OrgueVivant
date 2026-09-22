// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  devServer: {
    port: 3001
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@nuxtjs/sitemap',
    '@nuxt/icon',
    // Mesure d'audience Vercel : sans cookie, servie depuis notre propre
    // domaine, elle ne requiert donc pas de consentement préalable.
    '@vercel/analytics/nuxt'
  ],

  css: ['~/assets/css/fonts.css', '~/assets/css/main.css'],

  app: {
    head: {
      // Le site n'a qu'un thème : la classe `dark` est posée en dur plutôt
      // que par un module qui la faisait dépendre d'une préférence mémorisée
      // dans chaque navigateur (d'où des pages légales grises sur certains).
      htmlAttrs: { lang: 'fr', class: 'dark' },
      title: 'Orgue Vivant — Concerts d\'orgue à Lille',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Concerts d\'orgue dans le centre-ville de Lille — Saint Maurice & Saint Étienne.' },
        { property: 'og:title', content: 'Orgue Vivant' },
        { property: 'og:description', content: 'Concerts d\'orgue dans le centre-ville de Lille' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/og-image.jpg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#0a0a0a' }
      ],
      link: [
        // Google n'affiche l'icône dans ses résultats que si elle fait un
        // multiple de 48 px (ou est vectorielle) ; il va aussi chercher
        // /favicon.ico de lui-même, qu'il faut donc servir réellement.
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/img/logo/favicon-96.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/img/logo/favicon-192.png' },
        { rel: 'apple-touch-icon', href: '/img/logo/apple-touch-icon.png' },
        // Les deux polices du premier écran, demandées dès le HTML plutôt
        // qu'après l'analyse du CSS : le texte s'affiche plus tôt.
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/fraunces-latin.woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin.woff2', crossorigin: 'anonymous' },
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
    // Les fiches concert viennent de la base (voir server/api/__sitemap__/urls.ts)
    sources: ['/api/__sitemap__/urls'],
    // L'admin est déjà bloqué par robots.txt : ne pas le soumettre non plus au sitemap
    exclude: [
      '/_nuxt/**', '/_**', '/admin', '/admin/**', '/auth-setup', '/newsletter/**', '/en/newsletter/**',
      // Espaces privés des Moments musicaux : lien de candidature distribué par
      // l'association, espace des élèves derrière authentification. La page
      // publique /moments-musicaux, elle, reste dans le sitemap.
      '/moments-musicaux/espace', '/moments-musicaux/espace/**', '/moments-musicaux/connexion',
      '/en/moments-musicaux/espace', '/en/moments-musicaux/espace/**', '/en/moments-musicaux/connexion'
    ]
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY,
    myMemoryEmail: process.env.MYMEMORY_EMAIL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelBypassToken: process.env.VERCEL_BYPASS_TOKEN,
    // Jeton des tâches planifiées Vercel (rappels des Moments musicaux).
    cronSecret: process.env.CRON_SECRET,
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

  experimental: {
    // Les scripts sont nommés par empreinte et disparaissent à chaque
    // déploiement. Un visiteur (ou le robot de Google) qui a reçu le HTML
    // d'un build et demande ses scripts après le suivant tombait sur la page
    // d'erreur : Search Console classait l'accueil en « Soft 404 ». On
    // recharge la page sur-le-champ, ce qui ramène un HTML cohérent.
    emitRouteChunkError: 'automatic-immediate'
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          // Sans consigne, Vite produit une vingtaine de petits fichiers
          // (une page, un composant) que l'accueil doit tous charger. Le
          // robot de rendu de Google, au débit bridé, n'y parvenait pas
          // toujours dans son délai et tombait sur la page d'erreur (Search
          // Console : « Soft 404 »). Un seul fichier pour le site public —
          // séparer bibliothèques et application créait un cycle d'imports
          // entre les deux et cassait l'hydratation ; l'admin et le
          // recadrage d'images restent chargés à la demande.
          manualChunks(id) {
            if (id.includes('cropperjs') || /[\/](pages|layouts)[\/]admin|[\/]components[\/](Admin|Image)/.test(id)) return
            if (id.includes('nuxt/dist/app/entry')) return
            return 'app'
          }
        }
      }
    }
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
    // Moments musicaux : la page publique est mise en cache comme les autres
    // listes ; la candidature et l'espace des élèves, jamais (contenu
    // personnel), et hors index.
    '/moments-musicaux':                { isr: 3600 },
    '/moments-musicaux/professeurs':    { prerender: true },
    '/en/moments-musicaux':             { isr: 3600 },
    '/en/moments-musicaux/professeurs': { prerender: true },
    '/moments-musicaux/espace/**':     { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },
    '/moments-musicaux/connexion':     { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },
    '/en/moments-musicaux/espace/**':     { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },
    '/en/moments-musicaux/connexion':     { ssr: true, robots: false, headers: { 'Cache-Control': 'no-store' } },
    // Ressources statiques hors /_nuxt (noms non hachés) : Vercel les servait
    // sans cache. Les polices ne changent jamais ; les images rarement, d'où
    // une semaine, rafraîchie en arrière-plan.
    '/fonts/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    '/img/**':   { headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' } },

    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    }
  },

  compatibilityDate: '2024-11-01'
})
