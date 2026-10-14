<script setup lang="ts">
/**
 * Bulle « Teaser » du prochain concert qui en a un, en bas à droite de
 * l'accueil et de la page Concerts. Rien n'est demandé à YouTube avant qu'on la
 * touche : la bulle montre l'image du concert, et la vidéo ne se charge qu'à
 * l'ouverture du lecteur (youtube-nocookie.com). Sa croix la masque pour le
 * reste de la visite.
 */
import type { Concert } from '~/composables/useConcerts'
import { concertPlaceholder } from '~/utils/placeholders'
import { idYoutube } from '~/utils/youtube'

const props = defineProps<{ concert: Concert | null | undefined }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()

const video = computed(() => idYoutube(props.concert?.teaser_url))
const cle = computed(() => `ov_teaser_masque_${props.concert?.id}`)
// Affichée après le montage seulement : la croix est mémorisée dans le
// navigateur, et les pages mises en cache sont les mêmes pour tous.
const visible = ref(false)
const ouvert = ref(false)
const boite = ref<HTMLElement>()
const { activate, deactivate } = useFocusTrap(boite)

function lireMasque() {
  try { return sessionStorage.getItem(cle.value) === '1' } catch { return false }
}
function masquer() {
  visible.value = false
  try { sessionStorage.setItem(cle.value, '1') } catch { /* navigation privée : masquée pour cette page seulement */ }
}

function surTouche(e: KeyboardEvent) {
  if (e.key === 'Escape' && ouvert.value) ouvert.value = false
}
onMounted(() => {
  visible.value = !!video.value && !lireMasque()
  document.addEventListener('keydown', surTouche)
})
watch(video, (v) => { visible.value = !!v && !lireMasque() })
watch(ouvert, async (o) => {
  document.body.style.overflow = o ? 'hidden' : ''
  if (o) { await nextTick(); activate() } else deactivate()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', surTouche)
  document.body.style.overflow = ''
})

const titre = computed(() => props.concert ? localized(props.concert.title, props.concert.title_en, locale.value) : '')
const image = computed(() => props.concert?.image_url || concertPlaceholder(props.concert?.id))
const quand = computed(() => props.concert
  ? new Date(`${props.concert.date}T12:00`).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  : '')
const lecteur = computed(() => `https://www.youtube-nocookie.com/embed/${video.value}?autoplay=1&playsinline=1&rel=0`)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-500 ease-apple"
      enter-from-class="translate-y-4 opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="visible && !ouvert && concert" class="fixed bottom-5 right-5 z-40 md:bottom-8 md:right-8">
        <div class="relative md:flex md:items-center md:gap-4 md:rounded-full md:border md:border-white/10 md:bg-surface/90 md:py-2 md:pl-2 md:pr-4 md:shadow-2xl md:backdrop-blur-md">
          <button
            class="group flex flex-col items-center md:flex-row md:gap-4"
            :aria-label="t('teaser.watch', { titre })"
            @click="ouvert = true"
          >
            <span class="relative block h-[68px] w-[68px] rounded-full bg-gradient-to-br from-gold-light via-gold-dark to-gold-light p-[3px] shadow-2xl transition-transform duration-300 group-hover:scale-105 md:h-[72px] md:w-[72px] md:shadow-none">
              <img :src="image" alt="" class="h-full w-full rounded-full border-2 border-background object-cover object-[center_40%]">
              <span class="absolute inset-0 flex items-center justify-center">
                <Icon name="heroicons:play-solid" class="h-6 w-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
              </span>
            </span>
            <span class="mt-1.5 rounded-full bg-surface/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold md:hidden">
              {{ t('teaser.label') }}
            </span>
            <span class="hidden max-w-[15rem] text-left md:block">
              <span class="block text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{{ t('teaser.label') }} · {{ quand }}</span>
              <span class="block truncate text-sm text-text-primary">{{ titre }}</span>
            </span>
          </button>
          <button
            class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-surface text-text-secondary transition-colors hover:text-text-primary md:static md:h-8 md:w-8 md:border-0 md:bg-transparent"
            :aria-label="t('teaser.hide')"
            @click="masquer"
          >
            <Icon name="heroicons:x-mark" class="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
    </Transition>

    <div
      v-if="ouvert && concert"
      ref="boite"
      role="dialog"
      aria-modal="true"
      :aria-label="t('teaser.watch', { titre })"
      class="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      @click.self="ouvert = false"
    >
      <div class="flex flex-col" style="width: min(92vw, calc((100dvh - 16rem) * 9 / 16))">
        <div class="mb-3 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <span class="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{{ t('teaser.label') }}</span>
            <span class="block truncate text-sm text-text-primary">{{ titre }}</span>
          </div>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-text-primary transition-colors hover:bg-white/10"
            :aria-label="t('teaser.close')"
            @click="ouvert = false"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>
        <div class="relative w-full overflow-hidden rounded-[18px] bg-black" style="aspect-ratio: 9 / 16">
          <iframe
            :src="lecteur"
            :title="t('teaser.watch', { titre })"
            class="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          />
        </div>
        <div class="mt-4 text-center text-xs font-bold uppercase tracking-widest text-gold">
          {{ quand }} · {{ concert.time }} · {{ t(`locations.${concert.location}`) }}
        </div>
        <NuxtLink
          :to="localePath(`/concerts/${concert.id}`)"
          class="mt-3 flex h-12 items-center justify-center rounded-full bg-text-primary font-medium text-background transition-colors hover:bg-white"
          @click="ouvert = false"
        >
          {{ t('teaser.seeConcert') }}
        </NuxtLink>
        <p class="mt-2 text-center text-[11px] text-white/40">{{ t('teaser.via') }}</p>
      </div>
    </div>
  </Teleport>
</template>
