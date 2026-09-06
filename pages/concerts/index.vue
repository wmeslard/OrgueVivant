<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const { t } = useI18n()
const { upcoming, past, pending, fetchConcerts } = useConcerts()
await callOnce('concerts', fetchConcerts)

const tab = ref<'upcoming' | 'past'>('upcoming')
const selected = ref<Concert | null>(null)

// Filtres
const filterLocation = ref<string>('all')
const filterPrice = ref<string>('all')

const baseList = computed(() => tab.value === 'upcoming' ? upcoming.value : past.value)

const list = computed(() => baseList.value.filter(c => {
  if (filterLocation.value !== 'all' && c.location !== filterLocation.value) return false
  if (filterPrice.value !== 'all' && c.price_type !== filterPrice.value) return false
  return true
}))

const activeFilters = computed(() => filterLocation.value !== 'all' || filterPrice.value !== 'all')

function resetFilters() {
  filterLocation.value = 'all'
  filterPrice.value = 'all'
}

// Open concert from ?id= deep link
const route = useRoute()
watchEffect(() => {
  const id = route.query.id as string | undefined
  if (!id) return
  const all = [...upcoming.value, ...past.value]
  const found = all.find(c => c.id === id)
  if (found) selected.value = found
})

const siteUrl = useRuntimeConfig().public.siteUrl

const jsonLd = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Concerts d\'orgue à Lille — Orgue Vivant',
  itemListElement: upcoming.value.slice(0, 10).map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'MusicEvent',
      name: c.title,
      startDate: `${c.date}T${c.time || '20:00'}:00`,
      location: {
        '@type': 'Place',
        name: c.location === 'saint_maurice' ? 'Église Saint-Maurice de Lille' : 'Église Saint-Étienne de Lille',
        address: { '@type': 'PostalAddress', addressLocality: 'Lille', addressCountry: 'FR' }
      },
      organizer: { '@type': 'Organization', name: 'Orgue Vivant', url: siteUrl },
      isAccessibleForFree: c.price_type === 'free',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      ...(c.image_url && { image: c.image_url }),
      ...(c.description && { description: c.description })
    }
  }))
}))

useHead({
  title: `${t('nav.concerts')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.concertsDesc') }],
  link: [{ rel: 'canonical', href: `${siteUrl}/concerts` }],
  script: [{ type: 'application/ld+json', innerHTML: jsonLd }]
})

useSeoMeta({
  ogTitle: `${t('nav.concerts')} — Orgue Vivant`,
  ogDescription: t('seo.concertsDesc'),
  ogImage: `${siteUrl}/img/orgue-st-maurice.jpg`,
  ogUrl: `${siteUrl}/concerts`,
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
          {{ t('concerts.eyebrow') }}
        </span>
      </div>
      <h1 class="heading-section text-text-primary">{{ t('concerts.title') }}</h1>
      <p class="mt-6 max-w-2xl text-lg text-text-secondary font-light leading-relaxed">
        {{ t('concerts.subtitle') }}
      </p>
    </header>

    <!-- Switch + Filtres -->
    <div class="mb-10 flex flex-wrap items-center gap-3">
      <!-- Switch À venir / Archives (à gauche) -->
      <div class="inline-flex rounded-full border border-white/5 bg-surface p-1 shadow-2xl">
        <button
          class="rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
          :class="tab === 'upcoming' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
          @click="tab = 'upcoming'"
        >
          {{ t('concerts.upcoming') }} <span class="ml-2 opacity-50">{{ upcoming.length }}</span>
        </button>
        <button
          class="rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
          :class="tab === 'past' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
          @click="tab = 'past'"
        >
          {{ t('concerts.past') }} <span class="ml-2 opacity-50">{{ past.length }}</span>
        </button>
      </div>

      <!-- Filtre lieu -->
      <div class="relative inline-flex items-center rounded-full border border-white/5 bg-surface p-1 shadow-2xl">
        <select
          v-model="filterLocation"
          class="rounded-full pl-6 pr-9 py-3 text-xs font-bold uppercase tracking-widest bg-transparent text-text-secondary focus:outline-none cursor-pointer transition-colors hover:text-text-primary appearance-none"
        >
          <option value="all">{{ t('concerts.filterAllLocations') }}</option>
          <option value="saint_maurice">Saint-Maurice</option>
          <option value="saint_etienne">Saint-Étienne</option>
        </select>
        <Icon name="heroicons:chevron-down" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary" />
      </div>

      <!-- Filtre tarif -->
      <div class="relative inline-flex items-center rounded-full border border-white/5 bg-surface p-1 shadow-2xl">
        <select
          v-model="filterPrice"
          class="rounded-full pl-6 pr-9 py-3 text-xs font-bold uppercase tracking-widest bg-transparent text-text-secondary focus:outline-none cursor-pointer transition-colors hover:text-text-primary appearance-none"
        >
          <option value="all">{{ t('concerts.filterAllPrices') }}</option>
          <option value="free">{{ t('modal.free') }}</option>
          <option value="paid">{{ t('modal.paid') }}</option>
        </select>
        <Icon name="heroicons:chevron-down" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary" />
      </div>

      <!-- Reset -->
      <button
        v-if="activeFilters"
        class="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/5 bg-surface text-text-secondary shadow-2xl hover:text-gold hover:bg-gold/10 transition-all duration-200"
        :aria-label="t('concerts.resetFilters')"
        @click="resetFilters"
      >
        <Icon name="heroicons:x-mark" class="w-4 h-4" />
      </button>
    </div>

    <div v-if="pending" class="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
      <ConcertCardSkeleton v-for="i in 6" :key="i" />
    </div>
    <div v-else-if="list.length === 0 && activeFilters" class="card-premium p-20 text-center text-text-secondary font-light italic">
      {{ t('concerts.noResults') }}
    </div>
    <div v-else-if="list.length === 0" class="card-premium p-32 text-center text-text-secondary font-light italic">
      {{ t('concerts.empty') }}
    </div>
    <div v-else class="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
      <ConcertCard
        v-for="c in list"
        :key="c.id"
        :concert="c"
        @open="selected = $event"
      />
    </div>

    <MomentsMusicaux variant="full" />

    <LazyConcertModal :concert="selected" @close="selected = null" />
  </div>
</template>
