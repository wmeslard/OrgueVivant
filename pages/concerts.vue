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
  <div class="container-apple py-20 md:py-28">
    <header class="mb-14">
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('concerts.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ t('concerts.title') }}</h1>
      <p class="mt-4 max-w-2xl text-ink-600 dark:text-ink-400">{{ t('concerts.subtitle') }}</p>
    </header>

    <div class="mb-10 inline-flex rounded-full border border-ink-200 p-1 dark:border-ink-700">
      <button
        class="rounded-full px-5 py-2 text-sm transition-colors"
        :class="tab === 'upcoming' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-600 dark:text-ink-300'"
        @click="tab = 'upcoming'"
      >
        {{ t('concerts.upcoming') }} · {{ upcoming.length }}
      </button>
      <button
        class="rounded-full px-5 py-2 text-sm transition-colors"
        :class="tab === 'past' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-600 dark:text-ink-300'"
        @click="tab = 'past'"
      >
        {{ t('concerts.past') }} · {{ past.length }}
      </button>
    </div>

    <div v-if="pending" class="text-ink-500">{{ t('common.loading') }}</div>
    <div v-else-if="list.length === 0" class="rounded-2xl border border-dashed border-ink-200 p-16 text-center text-ink-500 dark:border-ink-700">
      {{ t('concerts.empty') }}
    </div>
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
