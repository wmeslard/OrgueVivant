<script setup lang="ts">
/**
 * Mini-clavier de l'œuf de Pâques : quatre touches, B A C H dans le désordre.
 * S'ouvre par un appui long sur le point doré du logo (voir AppHeader).
 */
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const localePath = useLocalePath()
const { progress, found, saisir, lettres } = useBach()

// Ordre mélangé à chaque ouverture : la solution est le motif, pas la position.
const touches = ref([...lettres].sort(() => Math.random() - 0.5))
const faux = ref(false)

function jouer(l: string) {
  if (!saisir(l)) { faux.value = true; setTimeout(() => { faux.value = false }, 350) }
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-[60]" @click.self="emit('close')">
    <div
      role="dialog"
      :aria-label="t('tribune.keyboard')"
      class="absolute left-1/2 top-20 w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl border border-gold/25 bg-surface/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl md:top-24"
      :class="{ 'animate-shake': faux }"
    >
      <p class="text-center text-[10px] uppercase tracking-[0.3em] text-gold">{{ t('tribune.keyboard') }}</p>
      <div class="mt-4 flex justify-center gap-2">
        <button
          v-for="l in touches"
          :key="l"
          type="button"
          class="flex h-24 w-14 flex-col items-center justify-end rounded-lg border border-white/15 bg-text-primary/5 pb-3 font-display text-2xl text-text-primary transition hover:border-gold hover:bg-gold/10 active:scale-95"
          @click="jouer(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
      <div class="mt-4 flex justify-center gap-1.5" aria-hidden="true">
        <span v-for="i in 4" :key="i" class="h-1.5 w-6 rounded-full transition-colors duration-300" :class="i <= progress ? 'bg-gold' : 'bg-white/10'" />
      </div>
      <Transition enter-active-class="transition duration-700" enter-from-class="opacity-0 translate-y-1">
        <NuxtLink
          v-if="found"
          :to="localePath('/tribune')"
          class="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-gold text-sm font-medium text-background"
          @click="emit('close')"
        >
          <span aria-hidden="true">♪</span>{{ t('tribune.link') }}
        </NuxtLink>
      </Transition>
    </div>
  </div>
</template>
