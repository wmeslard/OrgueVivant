<script setup lang="ts">
/**
 * Visionneuse plein écran d'un album : flèches, clavier (← → Échap), glissé du
 * doigt sur téléphone, légende et compteur. `modelValue` est l'index de la
 * photo ouverte, null quand elle est fermée. La vignette, déjà chargée par la
 * mosaïque, sert de fond le temps que la grande image arrive : l'image garde
 * ses proportions (largeur et hauteur automatiques), sinon ce fond débordait
 * de part et d'autre de la photo.
 */
import type { PhotoPublique } from '~/composables/usePhotos'
import { lienTelechargement, nomFichierPhoto } from '~/utils/nomPhoto'

const props = defineProps<{ photos: PhotoPublique[]; modelValue: number | null; titre: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()

const boite = ref<HTMLElement>()
const { activate, deactivate } = useFocusTrap(boite)
const photo = computed(() => props.modelValue === null ? null : props.photos[props.modelValue] ?? null)
const telechargement = computed(() => photo.value
  ? lienTelechargement(photo.value.url, nomFichierPhoto(props.titre, props.modelValue ?? 0, photo.value.url))
  : '')

function aller(sens: -1 | 1) {
  if (props.modelValue === null || !props.photos.length) return
  emit('update:modelValue', (props.modelValue + sens + props.photos.length) % props.photos.length)
}
const fermer = () => emit('update:modelValue', null)

function surTouche(e: KeyboardEvent) {
  if (props.modelValue === null) return
  if (e.key === 'Escape') fermer()
  else if (e.key === 'ArrowLeft') aller(-1)
  else if (e.key === 'ArrowRight') aller(1)
}

// Glissé horizontal du doigt : photo précédente ou suivante.
let depart: { x: number; y: number } | null = null
function debut(e: TouchEvent) { depart = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
function fin(e: TouchEvent) {
  if (!depart) return
  const dx = e.changedTouches[0].clientX - depart.x
  const dy = e.changedTouches[0].clientY - depart.y
  depart = null
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(dx < 0 ? 1 : -1)
}

// Les voisines sont chargées d'avance : passer d'une photo à l'autre est immédiat.
watch(() => props.modelValue, async (i, avant) => {
  if (i === null) {
    document.body.style.overflow = ''
    deactivate()
    return
  }
  for (const j of [i - 1, i + 1]) {
    const p = props.photos[(j + props.photos.length) % props.photos.length]
    if (p) new Image().src = p.url
  }
  if (avant === null || avant === undefined) {
    document.body.style.overflow = 'hidden'
    await nextTick(); activate()
  }
})

onMounted(() => document.addEventListener('keydown', surTouche))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', surTouche)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="photo"
      ref="boite"
      role="dialog"
      aria-modal="true"
      :aria-label="titre"
      class="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-sm"
      @touchstart.passive="debut"
      @touchend="fin"
    >
      <!-- Haut et bas se répondent : texte à gauche, action à droite, mêmes
           marges que les flèches. -->
      <div class="flex items-center justify-between gap-4 px-4 py-4 text-sm md:px-8">
        <span class="min-w-0 truncate text-text-secondary">
          {{ titre }}<span class="ml-3 tabular-nums text-white/40">{{ (modelValue ?? 0) + 1 }} / {{ photos.length }}</span>
        </span>
        <button
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-text-primary transition-colors hover:bg-white/10"
          :aria-label="t('photos.close')"
          @click="fermer"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>
      </div>

      <div class="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-24" @click.self="fermer">
        <img
          :key="photo.id"
          :src="photo.url"
          :alt="photo.legende || titre"
          :width="photo.largeur || undefined"
          :height="photo.hauteur || undefined"
          class="h-auto max-h-full w-auto max-w-full rounded-md bg-cover bg-center"
          :style="{ backgroundImage: `url(${photo.url_vignette})` }"
        >
        <button
          v-if="photos.length > 1"
          class="absolute left-3 hidden h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-text-primary transition-colors hover:bg-white/10 md:left-8 md:flex"
          :aria-label="t('photos.previous')"
          @click="aller(-1)"
        >
          <Icon name="heroicons:chevron-left" class="h-6 w-6" />
        </button>
        <button
          v-if="photos.length > 1"
          class="absolute right-3 hidden h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-text-primary transition-colors hover:bg-white/10 md:right-8 md:flex"
          :aria-label="t('photos.next')"
          @click="aller(1)"
        >
          <Icon name="heroicons:chevron-right" class="h-6 w-6" />
        </button>
      </div>

      <div class="flex flex-col gap-3 px-4 pb-5 pt-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-8 md:pb-4">
        <p class="min-w-0 text-center text-sm text-text-secondary md:text-left">
          {{ photo.legende }}
          <span v-if="photos.length > 1" class="block text-xs text-white/35 md:hidden">{{ t('photos.swipe') }}</span>
        </p>
        <a
          :href="telechargement"
          class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-text-primary transition-colors hover:bg-white/10"
        >
          <Icon name="heroicons:arrow-down-tray" class="h-4 w-4 text-gold" />{{ t('photos.downloadPhoto') }}
        </a>
      </div>
    </div>
  </Teleport>
</template>
