<script setup lang="ts">
import type { NewsItem } from '~/composables/useNews'

const { t, locale } = useI18n()
const { all, pending, fetchNews } = useNews()
await useLazyAsyncData('news', () => fetchNews())

const tab = ref<'upcoming' | 'past'>('upcoming')
const selectedNews = ref<NewsItem | null>(null)

const now = () => new Date().toISOString().slice(0, 10)

const upcoming = computed(() =>
  [...all.value]
    .filter(n => n.published_at.slice(0, 10) >= now())
    .sort((a, b) => a.published_at.slice(0, 10).localeCompare(b.published_at.slice(0, 10)))
)

const past = computed(() =>
  [...all.value]
    .filter(n => n.published_at.slice(0, 10) < now())
    .sort((a, b) => b.published_at.slice(0, 10).localeCompare(a.published_at.slice(0, 10)))
)

const list = computed(() => tab.value === 'upcoming' ? upcoming.value : past.value)

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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const siteUrl = useRuntimeConfig().public.siteUrl

useHead({
  title: `${t('nav.news')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.newsDesc') }],
  link: [{ rel: 'canonical', href: `${siteUrl}/news` }]
})

useSeoMeta({
  ogTitle: `${t('nav.news')} — Orgue Vivant`,
  ogDescription: t('seo.newsDesc'),
  ogImage: `${siteUrl}/img/hero-tuyaux-orgue.jpg`,
  ogUrl: `${siteUrl}/news`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background min-h-screen">
    <header class="mb-10 animate-fade-up">
      <div class="inline-flex items-center gap-3 mb-6">
        <span class="h-[1px] w-8 bg-gold"></span>
        <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">
          {{ t('news.eyebrow') }}
        </span>
      </div>
      <h1 class="heading-section text-text-primary">{{ t('news.title') }}</h1>
      <p class="mt-6 max-w-2xl text-lg text-text-secondary font-light leading-relaxed">
        {{ t('news.subtitle') }}
      </p>
    </header>

    <div class="mb-16 inline-flex rounded-full border border-white/5 bg-surface p-1 shadow-2xl">
      <button
        class="rounded-full px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
        :class="tab === 'upcoming' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
        @click="tab = 'upcoming'"
      >
        {{ t('news.upcoming') }} <span class="ml-2 opacity-50">{{ upcoming.length }}</span>
      </button>
      <button
        class="rounded-full px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
        :class="tab === 'past' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
        @click="tab = 'past'"
      >
        {{ t('news.past') }} <span class="ml-2 opacity-50">{{ past.length }}</span>
      </button>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div v-else-if="list.length === 0" class="card-premium p-32 text-center text-text-secondary font-light italic">
      {{ t('news.empty') }}
    </div>
    <div v-else class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="n in list"
        :key="n.id"
        class="group flex flex-col h-full border-b border-white/5 pb-6 transition-colors hover:border-gold/30 cursor-pointer"
        tabindex="0"
        role="button"
        aria-haspopup="dialog"
        @click="selectedNews = n"
        @keydown.enter="selectedNews = n"
        @keydown.space.prevent="selectedNews = n"
      >
        <div v-if="n.image_url" class="mb-4 overflow-hidden rounded-xl h-48 shrink-0">
          <img
            :src="n.image_url"
            :alt="getTitle(n)"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          >
        </div>
        <time class="text-[10px] uppercase tracking-[0.3em] text-gold mb-3 font-bold">
          {{ formatDate(n.published_at) }}
        </time>
        <h2 class="font-display text-2xl font-light mb-3 text-text-primary group-hover:text-gold transition-colors duration-300">
          {{ getTitle(n) }}
        </h2>
        <p class="text-text-secondary font-light mb-5 flex-1 leading-relaxed text-sm">
          {{ getBody(n) }}
        </p>
        <span v-if="needsMore(n)" class="text-xs uppercase tracking-widest text-text-primary flex items-center gap-2">
          {{ t('home.readMore') }}
          <Icon name="heroicons:chevron-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </span>
      </article>
    </div>

    <NewsModal :news="selectedNews" @close="selectedNews = null" />
  </div>
</template>
