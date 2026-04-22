<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const props = defineProps<{ concert: Concert }>()
defineEmits<{ (e: 'open', c: Concert): void }>()

const { locale, t } = useI18n()
const formattedDate = computed(() => {
  const d = new Date(`${props.concert.date}T${props.concert.time || '00:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
})
</script>

<template>
  <button
    type="button"
    class="card group flex w-full flex-col items-start text-left"
    @click="$emit('open', concert)"
  >
    <div class="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
      <img
        v-if="concert.image_url"
        :src="concert.image_url"
        :alt="concert.title"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-105"
      >
      <div v-else class="flex h-full w-full items-center justify-center text-ink-400">
        <svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    </div>

    <div class="text-xs uppercase tracking-widest text-accent">
      {{ formattedDate }}
    </div>
    <h3 class="mt-2 font-display text-2xl font-light leading-tight">
      {{ concert.title }}
    </h3>
    <div class="mt-3 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {{ t(`locations.${concert.location}`) }}
    </div>
    <div v-if="concert.artists" class="mt-1 text-sm text-ink-500">
      {{ concert.artists }}
    </div>
  </button>
</template>
