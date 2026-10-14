<script setup lang="ts">
/**
 * Visionneuse plein écran d'un album : flèches, clavier (← → Échap), glissé du
 * doigt sur téléphone, légende et compteur. `modelValue` est l'index de la
 * photo ouverte, null quand elle est fermée. La vignette, déjà chargée par la
 * mosaïque, sert de fond le temps que la grande image arrive : l'image garde
 * ses proportions (largeur et hauteur automatiques), sinon ce fond débordait
 * de part et d'autre de la photo.
 *
 * Zoom : un clic (ou un toucher) sur la photo l'agrandit à l'endroit visé, un
 * second clic la rétrécit ; la loupe de l'en-tête fait de même, au centre.
 * Agrandie, la photo suit la souris, ou se déplace au doigt.
 */
import type { PhotoPublique } from '~/composables/usePhotos'
import { lienTelechargement, nomFichierPhoto } from '~/utils/nomPhoto'

const props = defineProps<{ photos: PhotoPublique[]; modelValue: number | null; titre: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void }>()
const { t } = useI18n()

const boite = ref<HTMLElement>()
const { activate, deactivate } = useFocusTrap(boite)
const photo = computed(() => props.modelValue === null ? null : props.photos[props.modelValue] ?? null)
const telechargement = computed(() => {
  const p = photo.value
  if (!p) return ''
  const fichier = p.url_originale ?? p.url
  return lienTelechargement(fichier, nomFichierPhoto(props.titre, props.modelValue ?? 0, fichier))
})

function aller(sens: -1 | 1) {
  if (props.modelValue === null || !props.photos.length) return
  emit('update:modelValue', (props.modelValue + sens + props.photos.length) % props.photos.length)
}
const fermer = () => emit('update:modelValue', null)

// ── Zoom ─────────────────────────────────────────────────────────────────────
const image = ref<HTMLImageElement>()
const zoom = ref(false)
const facteur = ref(2)
const origine = reactive({ x: 50, y: 50 })
const borne = (v: number) => Math.min(100, Math.max(0, v))
let appui: { x: number; y: number; ox: number; oy: number; bouge: boolean } | null = null

/**
 * Original chargé pour la photo affichée : agrandie, elle passe à sa pleine
 * définition dès qu'il est arrivé. Un format que le navigateur ne sait pas
 * afficher (HEIC hors Safari) garde la copie d'affichage.
 */
const originalPret = ref<string | null>(null)
let largeurOriginale = 0
const source = computed(() => {
  const p = photo.value
  return p && zoom.value && p.url_originale && originalPret.value === p.url_originale ? p.url_originale : p?.url
})
const ajuster = (largeurReelle: number) => {
  const img = image.value
  // Au moins ×2, jusqu'à la définition réelle de la photo, sans dépasser ×4.
  facteur.value = img ? Math.min(4, Math.max(2, largeurReelle / img.clientWidth)) : 2
}

/** Agrandit au point visé (en % de la photo), ou rétrécit. */
function basculerZoom(x = 50, y = 50) {
  if (zoom.value) { zoom.value = false; return }
  const img = image.value
  ajuster(img?.naturalWidth ?? 0)
  Object.assign(origine, { x: borne(x), y: borne(y) })
  zoom.value = true
  const p = photo.value
  if (p?.url_originale && originalPret.value !== p.url_originale) {
    const hd = new Image()
    hd.onload = () => {
      if (photo.value?.url_originale !== hd.src) return
      originalPret.value = hd.src
      largeurOriginale = hd.naturalWidth
      if (zoom.value) ajuster(largeurOriginale)
    }
    hd.src = p.url_originale
  } else if (p?.url_originale) {
    ajuster(largeurOriginale)
  }
}
/**
 * Point visé, en % de la photo telle qu'elle est posée, sans l'agrandissement :
 * le repère reste fixe pendant que la photo agrandie suit la souris.
 */
function pointVise(e: PointerEvent) {
  const img = image.value!
  const cadre = (img.offsetParent as HTMLElement).getBoundingClientRect()
  return {
    x: borne((e.clientX - cadre.left - img.offsetLeft) / img.offsetWidth * 100),
    y: borne((e.clientY - cadre.top - img.offsetTop) / img.offsetHeight * 100)
  }
}
function pointe(e: PointerEvent) {
  appui = { x: e.clientX, y: e.clientY, ox: origine.x, oy: origine.y, bouge: false }
}
function glisse(e: PointerEvent) {
  const img = image.value
  if (!zoom.value || !img) return
  if (e.pointerType === 'mouse') {
    // La souris explore la photo agrandie : bord gauche de la photo sous la
    // souris quand elle est à gauche, bord droit quand elle est à droite.
    Object.assign(origine, pointVise(e))
    return
  }
  if (!appui) return
  const dx = e.clientX - appui.x, dy = e.clientY - appui.y
  if (Math.hypot(dx, dy) > 6) appui.bouge = true
  // Au doigt, la photo suit le glissé.
  origine.x = borne(appui.ox - dx / ((facteur.value - 1) * img.clientWidth) * 100)
  origine.y = borne(appui.oy - dy / ((facteur.value - 1) * img.clientHeight) * 100)
}
const annule = () => { appui = null }
function lache(e: PointerEvent) {
  const img = image.value
  const tape = appui && !appui.bouge && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) <= 6
  appui = null
  if (tape && img) { const p = pointVise(e); basculerZoom(p.x, p.y) }
}

function surTouche(e: KeyboardEvent) {
  if (props.modelValue === null) return
  if (e.key === 'Escape') { if (zoom.value) zoom.value = false; else fermer() }
  else if (e.key === 'ArrowLeft') aller(-1)
  else if (e.key === 'ArrowRight') aller(1)
}

// Glissé horizontal du doigt : photo précédente ou suivante.
let depart: { x: number; y: number } | null = null
function debut(e: TouchEvent) { depart = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
function fin(e: TouchEvent) {
  // Agrandie, le doigt déplace la photo au lieu de changer de photo.
  if (!depart || zoom.value) { depart = null; return }
  const dx = e.changedTouches[0].clientX - depart.x
  const dy = e.changedTouches[0].clientY - depart.y
  depart = null
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(dx < 0 ? 1 : -1)
}

// Les voisines sont chargées d'avance : passer d'une photo à l'autre est immédiat.
watch(() => props.modelValue, async (i, avant) => {
  zoom.value = false
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
        <div class="flex shrink-0 gap-2">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-white/10"
            :class="zoom ? 'border-gold/60 text-gold' : 'text-text-primary'"
            :aria-label="zoom ? t('photos.zoomOut') : t('photos.zoomIn')"
            :aria-pressed="zoom"
            @click="basculerZoom()"
          >
            <Icon :name="zoom ? 'heroicons:magnifying-glass-minus' : 'heroicons:magnifying-glass-plus'" class="h-5 w-5" />
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-text-primary transition-colors hover:bg-white/10"
            :aria-label="t('photos.close')"
            @click="fermer"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 md:px-24" @click.self="fermer">
        <img
          :key="photo.id"
          ref="image"
          :src="source"
          :alt="photo.legende || titre"
          :width="photo.largeur || undefined"
          :height="photo.hauteur || undefined"
          draggable="false"
          class="h-auto max-h-full w-auto max-w-full select-none rounded-md bg-cover bg-center transition-transform duration-300 ease-out"
          :class="zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'"
          :style="{
            backgroundImage: `url(${photo.url_vignette})`,
            transform: zoom ? `scale(${facteur})` : 'none',
            transformOrigin: `${origine.x}% ${origine.y}%`,
            touchAction: 'none'
          }"
          @pointerdown="pointe"
          @pointermove="glisse"
          @pointerup="lache"
          @pointercancel="annule"
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
