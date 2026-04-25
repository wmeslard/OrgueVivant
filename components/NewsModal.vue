<script setup lang="ts">
import type { NewsItem } from '~/composables/useNews'

const props = defineProps<{ news: NewsItem | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { locale } = useI18n()

const title = computed(() => {
  if (!props.news) return ''
  if (locale.value === 'en' && props.news.title_en) return props.news.title_en
  return props.news.title
})

const body = computed(() => {
  if (!props.news) return ''
  if (locale.value === 'en' && props.news.body_en) return props.news.body_en
  return props.news.body
})

const formattedDate = computed(() => {
  if (!props.news) return ''
  const d = new Date(props.news.published_at)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
})

watch(() => props.news, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-400 ease-apple"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-250 ease-apple"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="news"
      class="fixed inset-0 z-[100] overflow-hidden bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
      @click.self="$emit('close')"
    >
      <div
        class="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-[28px] bg-surface border border-text-primary/10 shadow-2xl"
        @click.stop
      >
        <!-- Close button — always visible, gold background when no image for contrast -->
        <button
          :class="[
            'absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-all duration-300',
            news.image_url
              ? 'bg-background/60 text-text-primary hover:bg-gold hover:text-background'
              : 'bg-surface/80 text-text-primary hover:bg-gold hover:text-background border border-text-primary/10'
          ]"
          aria-label="Fermer"
          @click="$emit('close')"
        >
          <Icon name="heroicons:x-mark" class="h-4 w-4" />
        </button>

        <!-- Image (optional) -->
        <div v-if="news.image_url" class="h-56 shrink-0 overflow-hidden">
          <img
            :src="news.image_url"
            :alt="title"
            class="w-full h-full object-cover"
          >
        </div>

        <!-- Content — extra top padding when no image to clear the close button -->
        <div
          class="flex-1 overflow-y-auto min-h-0"
          :class="news.image_url ? 'p-7 md:p-10' : 'pt-14 px-7 pb-7 md:pt-16 md:px-10 md:pb-10'"
        >
          <!-- Date + author row -->
          <div class="flex items-center gap-4 mb-3">
            <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{{ formattedDate }}</span>
            <span v-if="news.author" class="text-[10px] uppercase tracking-widest text-text-secondary/60">
              — {{ news.author }}
            </span>
          </div>

          <h2 class="font-display text-3xl md:text-4xl font-light leading-tight text-text-primary mb-6">
            {{ title }}
          </h2>

          <!-- Decorative separator (more prominent when no image) -->
          <div v-if="!news.image_url" class="w-10 h-[1px] bg-gold/40 mb-6" />

          <p class="text-sm leading-relaxed text-text-secondary font-light whitespace-pre-wrap">
            {{ body }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
