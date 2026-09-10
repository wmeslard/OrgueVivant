<script setup lang="ts">
/**
 * Fermeture et flèches d'une tuile du carrousel.
 *
 * Ces boutons sont posés dans la tuile, et non sur le cadre : ils défilent
 * donc avec elle. Ils ne se montrent que sur la tuile au premier plan, en
 * fondu, pour ne pas semer des croix dans la bande visible des voisines.
 */
const props = defineProps<{ index: number, slide: number, count: number }>()
defineEmits<{ (e: 'go', i: number): void, (e: 'close'): void }>()

const { t } = useI18n()
const active = computed(() => props.index === props.slide)
</script>

<template>
  <div
    class="transition-opacity duration-300"
    :class="active ? 'opacity-100' : 'pointer-events-none opacity-0'"
  >
    <button
      class="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-background/30 text-text-primary/70 backdrop-blur transition-all duration-300 hover:bg-gold hover:text-background"
      :aria-label="t('modal.close')"
      @click="$emit('close')"
    >
      <Icon name="heroicons:x-mark" class="h-4 w-4" />
    </button>

    <button
      v-if="index > 0"
      class="absolute left-0 top-1/2 z-20 flex h-24 w-9 -translate-y-1/2 items-center justify-center rounded-r-2xl text-text-primary/45 transition-colors duration-300 hover:bg-background/40 hover:text-text-primary"
      :aria-label="t('modal.previousTile')"
      @click="$emit('go', index - 1)"
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"
        stroke-linecap="round" stroke-linejoin="round"
        class="h-7 w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
      >
        <path d="M15 4 7 12l8 8" />
      </svg>
    </button>

    <button
      v-if="index < count - 1"
      class="absolute right-0 top-1/2 z-20 flex h-24 w-9 -translate-y-1/2 items-center justify-center rounded-l-2xl text-text-primary/45 transition-colors duration-300 hover:bg-background/40 hover:text-text-primary"
      :aria-label="t('modal.nextTile')"
      @click="$emit('go', index + 1)"
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"
        stroke-linecap="round" stroke-linejoin="round"
        class="h-7 w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
      >
        <path d="m9 4 8 8-8 8" />
      </svg>
    </button>
  </div>
</template>
