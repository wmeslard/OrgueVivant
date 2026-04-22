<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const props = defineProps<{ concert: Concert }>()
defineEmits<{ (e: 'open', c: Concert): void }>()

const { locale, t } = useI18n()
const formattedDay = computed(() => {
  const d = new Date(`${props.concert.date}T${props.concert.time || '00:00'}`)
  return d.getDate()
})

const formattedMonth = computed(() => {
  const d = new Date(`${props.concert.date}T${props.concert.time || '00:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }).toUpperCase().replace('.', '')
})

const formattedFullDate = computed(() => {
  const d = new Date(`${props.concert.date}T${props.concert.time || '00:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
})
</script>

<template>
  <button
    type="button"
    class="card-premium group relative flex w-full flex-col items-start text-left"
    @click="$emit('open', concert)"
  >
    <!-- Image with gradient overlay -->
    <div class="relative aspect-[4/5] w-full overflow-hidden">
      <img
        v-if="concert.image_url"
        :src="concert.image_url"
        :alt="concert.title"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-110"
      >
      <div v-else class="flex h-full w-full items-center justify-center bg-surface text-white/10">
        <svg class="h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>

      <!-- Date Badge Overlay -->
      <div class="absolute left-6 top-6 flex flex-col items-center justify-center bg-gold px-3 py-2 text-background rounded-lg shadow-xl">
        <span class="text-xl font-bold leading-none">{{ formattedDay }}</span>
        <span class="text-[10px] font-bold tracking-tighter">{{ formattedMonth }}</span>
      </div>

      <!-- Bottom Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60"></div>
    </div>

    <!-- Content -->
    <div class="relative -mt-20 w-full p-8 pt-0">
      <div class="card-premium bg-surface/90 p-6 backdrop-blur-md">
        <div class="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
          {{ t(`locations.${concert.location}`) }}
        </div>
        <h3 class="font-display text-2xl font-light leading-tight text-text-primary group-hover:text-gold transition-colors duration-300">
          {{ concert.title }}
        </h3>
        <p v-if="concert.artists" class="mt-2 text-sm text-text-secondary line-clamp-1 italic">
          {{ concert.artists }}
        </p>
        
        <div class="mt-6 flex items-center justify-between">
          <span class="text-xs text-text-secondary font-medium uppercase tracking-widest">
            {{ concert.time }}
          </span>
          <span class="text-xs text-gold underline underline-offset-4 decoration-gold/30 group-hover:decoration-gold transition-all duration-300">
            {{ t('concerts.discover') || 'Découvrir' }}
          </span>
        </div>
      </div>
    </div>
  </button>
</template>
