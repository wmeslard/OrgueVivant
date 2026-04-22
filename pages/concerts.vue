<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const { t } = useI18n()
const { upcoming, past, pending, fetchConcerts } = useConcerts()
await fetchConcerts()

const tab = ref<'upcoming' | 'past'>('upcoming')
const selected = ref<Concert | null>(null)

const list = computed(() => (tab.value === 'upcoming' ? upcoming.value : past.value))

// Open concert from ?id= deep link
const route = useRoute()
watchEffect(() => {
  const id = route.query.id as string | undefined
  if (!id) return
  const all = [...upcoming.value, ...past.value]
  const found = all.find(c => c.id === id)
  if (found) selected.value = found
})

useHead({
  title: `${t('nav.concerts')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.concertsDesc') }]
})
</script>

<template>
  <div class="container-premium py-32 md:py-48 bg-background min-h-screen">
    <header class="mb-20 animate-fade-up">
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

    <div class="mb-16 inline-flex rounded-full border border-white/5 bg-surface p-1 shadow-2xl">
      <button
        class="rounded-full px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
        :class="tab === 'upcoming' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
        @click="tab = 'upcoming'"
      >
        {{ t('concerts.upcoming') }} <span class="ml-2 opacity-50">{{ upcoming.length }}</span>
      </button>
      <button
        class="rounded-full px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300"
        :class="tab === 'past' ? 'bg-gold text-background shadow-lg' : 'text-text-secondary hover:text-text-primary'"
        @click="tab = 'past'"
      >
        {{ t('concerts.past') }} <span class="ml-2 opacity-50">{{ past.length }}</span>
      </button>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
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

    <ConcertModal :concert="selected" @close="selected = null" />
  </div>
</template>
