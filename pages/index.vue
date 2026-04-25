<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'
import type { NewsItem } from '~/composables/useNews'

const { t, locale } = useI18n()
const { upcoming, pending, fetchConcerts } = useConcerts()
const { latest, fetchNews } = useNews()

await useLazyAsyncData('concerts', () => fetchConcerts(), { server: false })
await useLazyAsyncData('news-home', () => fetchNews(), { server: false })

const preview = computed(() => upcoming.value.slice(0, 3))
const nextConcert = computed(() => upcoming.value[0] || null)
const selected = ref<Concert | null>(null)
const selectedNews = ref<NewsItem | null>(null)

useHead({
  title: 'Orgue Vivant — Concerts d\'orgues à Lille',
  meta: [
    { name: 'description', content: t('seo.homeDesc') }
  ],
  link: [
    { rel: 'preload', as: 'image', href: '/img/hero-tuyaux-orgue.jpg', fetchpriority: 'high' },
    { rel: 'preload', as: 'image', href: '/img/eglise-st-maurice.jpg' }
  ]
})

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function getTitle(n: NewsItem) {
  return locale.value === 'en' && n.title_en ? n.title_en : n.title
}

function rawBody(n: NewsItem) {
  return locale.value === 'en' && n.body_en ? n.body_en : n.body
}

function getBody(n: NewsItem) {
  const text = rawBody(n)
  return text.length > 150 ? text.slice(0, 150).trimEnd() + '…' : text
}

function needsMore(n: NewsItem) {
  return rawBody(n).length > 150
}
</script>

<template>
  <div>
    <!-- HERO SECTION ULTRA PREMIUM -->
    <section class="relative min-h-screen flex items-center overflow-hidden pt-20">
      <!-- Background — tuyaux d'orgue, sobre et immersif -->
      <div class="absolute inset-0 z-0">
        <img
          src="/img/hero-tuyaux-orgue.jpg"
          alt="Tuyaux d'orgue"
          class="w-full h-full object-cover object-center brightness-[0.25]"
          fetchpriority="high"
          loading="eager"
          decoding="async"
        />
        <!-- Gradient sombre en bas pour fondre avec les sections -->
        <div class="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background z-10" />
        <!-- Lueur gold très subtile en haut à droite -->
        <div class="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px] z-10" />
      </div>

      <div class="container-premium relative z-20 w-full">
        <div class="max-w-[1400px] mx-auto">
          <div class="animate-fade-up">
            <div class="inline-flex items-center gap-3 mb-8">
              <span class="h-[1px] w-8 bg-gold"></span>
              <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">
                {{ t('home.eyebrow') }}
              </span>
            </div>
            
            <h1 class="heading-hero text-text-primary leading-[1.05]">
              {{ t('home.heroTitle1') }}<br>
              <span class="italic font-display text-gold opacity-90">{{ t('home.heroTitle2') }}</span>
            </h1>
            
            <p class="mt-10 max-w-2xl text-lg md:text-2xl text-text-secondary leading-relaxed font-light">
              {{ t('home.heroSubtitle') }}
            </p>
            
            <div class="mt-12 flex flex-wrap gap-6">
              <NuxtLink to="/concerts" class="btn-premium-primary">
                {{ t('home.ctaConcerts') }}
              </NuxtLink>
              <button v-if="nextConcert" class="btn-premium-secondary cursor-pointer" @click="selected = nextConcert">
                {{ t('home.nextConcert') }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </section>

    <!-- SECTION PROCHAIN CONCERT -->
    <section v-if="nextConcert" class="relative z-30 pt-10 pb-10">
      <div class="container-premium">
        <div class="mb-10 flex items-center gap-4">
          <h2 class="text-xs uppercase tracking-[0.3em] text-text-secondary font-bold">
            {{ t('home.upcomingEyebrow') }}
          </h2>
          <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>

        <div class="card-premium group flex flex-col md:flex-row items-stretch min-h-[400px]">
          <div class="md:w-1/2 overflow-hidden relative">
            <img 
              :src="nextConcert.image_url || '/img/concert-fallback.jpg'"
              :alt="nextConcert.title"
              class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-transparent hidden md:block"></div>
          </div>
          <div class="md:w-1/2 p-7 md:p-10 flex flex-col justify-center">
            <div class="text-gold font-bold tracking-widest text-sm mb-3">
              {{ formatDate(nextConcert.date) }} — {{ nextConcert.time }}
            </div>
            <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-light mb-4 text-text-primary">
              {{ nextConcert.title }}
            </h2>
            <div class="flex flex-col gap-3 text-text-secondary mb-6">
              <div class="flex items-center gap-3">
                <Icon name="heroicons:map-pin" class="w-5 h-5 text-gold" />
                <span>{{ t(`locations.${nextConcert.location}`) }}</span>
              </div>
              <div v-if="nextConcert.artists" class="flex items-center gap-3">
                <Icon name="heroicons:user" class="w-5 h-5 text-gold" />
                <span>{{ nextConcert.artists }}</span>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch gap-4">
              <button @click="selected = nextConcert" class="btn-premium-primary !h-14 !px-8">
                <span class="text-gold text-2xl leading-none">+</span>
                <span>{{ t('modal.moreInfo') }}</span>
              </button>
              <button class="btn-premium-secondary !h-14 !px-8">
                <Icon name="heroicons:calendar" class="w-5 h-5 text-gold" />
                <span>{{ t('modal.addToCalendar') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION CONCERTS À VENIR -->
    <section class="py-16 bg-background">
      <div class="container-premium">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div class="max-w-2xl">
            <h2 class="heading-section mb-6">{{ t('home.upcomingTitle') }}</h2>
            <p class="text-text-secondary text-lg font-light">
              {{ t('home.upcomingSubtitle') }}
            </p>
          </div>
          <NuxtLink to="/concerts" class="group flex items-center gap-3 text-gold tracking-widest text-sm font-bold uppercase">
            {{ t('home.viewAll') }}
            <Icon name="heroicons:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-2" />
          </NuxtLink>
        </div>

        <div v-if="pending" class="text-text-secondary flex items-center gap-4">
           <div class="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
           {{ t('common.loading') }}
        </div>
        <div v-else-if="preview.length === 0" class="card-premium p-20 text-center text-text-secondary">
          {{ t('home.noUpcoming') }}
        </div>
        <div v-else class="grid gap-10 md:grid-cols-3">
          <ConcertCard
            v-for="c in preview"
            :key="c.id"
            :concert="c"
            @open="selected = $event"
          />
        </div>
      </div>
    </section>

    <!-- SECTION PATRIMOINE / STORYTELLING -->
    <div class="py-16 bg-background">
      <section
        class="relative py-40 bg-cover bg-center bg-no-repeat bg-black"
        style="background-image: url('/img/eglise-st-maurice.jpg')"
      >
        <div class="absolute inset-0 z-0 bg-black/70" />
        <div class="container-premium relative z-10">
          <div class="max-w-3xl">
            <h2 class="heading-section text-white mb-5">{{ t('home.heritageTitle') }}</h2>
            <p class="text-xl text-text-secondary font-light mb-8 leading-relaxed">
              {{ t('home.heritageBody') }}
            </p>
            <NuxtLink to="/about" class="btn-premium-primary">
              {{ t('home.ctaAbout') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>

    <!-- SECTION ACTUALITÉS -->
    <section class="py-16 bg-background will-change-transform">
      <div class="container-premium">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <h2 class="heading-section">{{ t('home.newsTitle') }}</h2>
          <NuxtLink to="/news" class="group flex items-center gap-3 text-gold tracking-widest text-sm font-bold uppercase">
            {{ t('home.viewAllNews') }}
            <Icon name="heroicons:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-2" />
          </NuxtLink>
        </div>
        <div class="grid gap-8 md:grid-cols-3">
          <article
            v-for="n in latest"
            :key="n.id"
            class="group flex flex-col h-full border-b border-white/5 pb-6 transition-colors hover:border-gold/30 cursor-pointer"
            @click="selectedNews = n"
          >
            <time class="text-[10px] uppercase tracking-[0.3em] text-gold mb-3 font-bold">{{ formatDate(n.published_at) }}</time>
            <h3 class="font-display text-2xl font-light mb-3 text-text-primary group-hover:text-gold transition-colors duration-300">{{ getTitle(n) }}</h3>
            <p class="text-text-secondary font-light mb-5 flex-1 leading-relaxed">{{ getBody(n) }}</p>
            <span
              v-if="needsMore(n)"
              class="text-xs uppercase tracking-widest text-text-primary flex items-center gap-2"
            >
              {{ t('home.readMore') }}
              <Icon name="heroicons:chevron-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </article>
        </div>
      </div>
    </section>

    <!-- NEWSLETTER PREMIUM -->
    <section class="py-16">
      <div class="container-premium">
        <div class="card-premium p-8 md:p-12 bg-surface flex flex-col items-center text-center">
          <h2 class="font-display text-3xl md:text-4xl font-light mb-4 text-text-primary max-w-4xl">
            {{ t('home.newsletterTitle') }}
          </h2>
          <p class="text-text-secondary text-lg font-light mb-8 max-w-2xl">
            {{ t('home.newsletterSubtitle') }}
          </p>
          <div class="w-full max-w-lg">
            <NewsletterSignup />
            <p class="mt-6 text-[10px] text-text-secondary/50 uppercase tracking-widest">
              {{ t('home.newsletterConsent') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION POURQUOI VENIR -->
    <section class="py-16 pb-32 bg-surface/30">
      <div class="container-premium">
        <div class="grid md:grid-cols-3 gap-10">
          <div class="flex flex-col items-center text-center group">
            <div class="w-16 h-16 rounded-full border border-gold/20 flex items-center justify-center mb-5 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:musical-note" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">{{ t('home.feature1Title') }}</h3>
            <p class="text-text-secondary font-light">{{ t('home.feature1Body') }}</p>
          </div>
          <div class="flex flex-col items-center text-center group">
            <div class="w-16 h-16 rounded-full border border-gold/20 flex items-center justify-center mb-5 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:building-library" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">{{ t('home.feature2Title') }}</h3>
            <p class="text-text-secondary font-light">{{ t('home.feature2Body') }}</p>
          </div>
          <div class="flex flex-col items-center text-center group">
            <div class="w-16 h-16 rounded-full border border-gold/20 flex items-center justify-center mb-5 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:sparkles" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">{{ t('home.feature3Title') }}</h3>
            <p class="text-text-secondary font-light">{{ t('home.feature3Body') }}</p>
          </div>
        </div>
      </div>
    </section>

<ConcertModal :concert="selected" @close="selected = null" />
<NewsModal :news="selectedNews" @close="selectedNews = null" />
  </div>
</template>
