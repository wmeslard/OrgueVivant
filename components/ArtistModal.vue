<script setup lang="ts">
import type { Artist } from '~/utils/artists'

/**
 * Présentation d'un artiste en grand, depuis la fiche concert.
 *
 * Même mise en page que les tuiles d'artistes du carrousel de la fenêtre de
 * concert (photo à gauche sur grand écran, flottante entre `sm` et `lg`,
 * centrée sous le nom sur mobile), sans le rail : un seul artiste à la fois,
 * ouvert depuis sa carte.
 */
const props = defineProps<{ artist: Artist | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t, locale } = useI18n()

const frame = ref<HTMLElement | null>(null)
const { activate, deactivate } = useFocusTrap(frame)

watch(() => props.artist, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
  if (val) nextTick(activate)
  else deactivate()
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.artist) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-400 ease-apple [&>div]:transition-transform [&>div]:duration-400 [&>div]:ease-apple"
    enter-from-class="opacity-0 [&>div]:scale-[0.96] [&>div]:translate-y-4"
    enter-to-class="opacity-100 [&>div]:scale-100 [&>div]:translate-y-0"
    leave-active-class="transition duration-250 ease-apple [&>div]:transition-transform [&>div]:duration-250 [&>div]:ease-apple"
    leave-from-class="opacity-100 [&>div]:scale-100"
    leave-to-class="opacity-0 [&>div]:scale-[0.98]"
  >
    <div
      v-if="artist"
      class="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background/95 px-4 py-4 backdrop-blur-xl md:py-8"
      @click="$emit('close')"
    >
      <div
        ref="frame"
        role="dialog"
        aria-modal="true"
        :aria-label="artist.name"
        class="relative flex max-h-[90vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-text-primary/10 bg-surface shadow-2xl lg:flex-row"
        @click.stop
      >
        <button
          class="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-background/30 text-text-primary/70 backdrop-blur transition-all duration-300 hover:bg-gold hover:text-background"
          :aria-label="t('modal.close')"
          @click="$emit('close')"
        >
          <Icon name="heroicons:x-mark" class="h-4 w-4" />
        </button>

        <!-- Photo à gauche, grand écran seulement -->
        <div v-if="artist.image_url" class="hidden shrink-0 overflow-hidden lg:block lg:w-[72vh] lg:max-w-[52%]">
          <img :src="artist.image_url" :alt="artist.name" class="h-full w-full object-cover">
        </div>

        <!-- Le cadre prend la hauteur de son contenu, plafonnée à 90vh ; le
             défilement est porté par ce panneau lui-même (`min-h-0` l'autorise
             à rétrécir), et n'apparaît que si le texte dépasse. Un `h-full`
             posé sur un enfant ne fonctionnerait pas : sans hauteur définie
             sur le parent, il vaut `auto` et rien ne défile. -->
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 md:p-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <!-- Entre `sm` et `lg`, la photo flotte à droite du texte -->
          <img
            v-if="artist.image_url"
            :src="artist.image_url"
            :alt="artist.name"
            class="hidden aspect-[4/5] w-40 rounded-xl object-cover sm:mb-4 sm:ml-6 sm:block sm:float-right md:w-52 lg:hidden"
          >
          <div class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('modal.artist') }}
          </div>
          <h2 class="font-display text-2xl font-light leading-tight text-text-primary sm:text-3xl md:text-4xl">
            {{ artist.name }}
          </h2>
          <!-- Sur mobile, la photo est centrée sous le nom -->
          <img
            v-if="artist.image_url"
            :src="artist.image_url"
            :alt="artist.name"
            class="mx-auto mb-2 mt-6 block aspect-[4/5] w-44 rounded-xl object-cover sm:hidden"
          >
          <p
            v-if="artist.bio"
            class="mt-5 whitespace-pre-wrap text-sm font-light leading-relaxed text-text-secondary"
          >
            {{ localized(artist.bio, artist.bio_en, locale) }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
