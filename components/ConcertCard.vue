<script setup lang="ts">
import { concertPlaceholder } from '~/utils/placeholders'
import type { Concert } from '~/composables/useConcerts'

const props = defineProps<{ concert: Concert }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
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
  <!-- Toute la carte mène à la fiche du concert : une page à part entière,
       que l'on peut partager et que Google indexe. -->
  <NuxtLink
    :to="localePath(`/concerts/${concert.id}`)"
    class="card-premium group relative flex w-full flex-col items-start text-left"
  >
    <!-- Image with gradient overlay -->
    <div class="relative aspect-[4/5] w-full overflow-hidden">
      <img
        :src="concert.image_url || concertPlaceholder(concert.id)"
        :alt="localized(concert.title, concert.title_en, locale)"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-110"
      >

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
          {{ localized(concert.title, concert.title_en, locale) }}
        </h3>
        <p v-if="artistNames(concert.artists, locale)" class="mt-2 text-sm text-text-secondary line-clamp-1 italic">
          {{ artistNames(concert.artists, locale) }}
        </p>
        
        <div class="mt-6 flex items-center justify-between">
          <span class="text-xs text-text-secondary font-medium uppercase tracking-widest">
            {{ concert.time }}
          </span>
          <span class="text-xs text-gold underline underline-offset-4 decoration-gold/30 group-hover:decoration-gold transition-all duration-300">
            {{ t('concerts.discover') }}
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
