<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const props = defineProps<{ concert: Concert | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { locale, t } = useI18n()
const { downloadIcs } = useIcs()

const formattedDate = computed(() => {
  if (!props.concert) return ''
  const d = new Date(`${props.concert.date}T${props.concert.time || '20:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
})

const shareUrl = computed(() => {
  if (!import.meta.client || !props.concert) return ''
  return `${window.location.origin}/concerts?id=${props.concert.id}`
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-apple"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-apple"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="concert"
      class="fixed inset-0 z-50 overflow-y-auto bg-ink-950/60 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div class="flex min-h-full items-start justify-center p-4 md:items-center md:p-8">
        <div
          class="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-ink-900"
        >
          <button
            class="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-ink-900 backdrop-blur hover:bg-white dark:bg-ink-800/80 dark:text-ink-50 dark:hover:bg-ink-800"
            :aria-label="t('modal.close')"
            @click="$emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div v-if="concert.image_url" class="aspect-[21/9] w-full bg-ink-200 dark:bg-ink-800">
            <img :src="concert.image_url" :alt="concert.title" class="h-full w-full object-cover">
          </div>

          <div class="p-8 md:p-12">
            <div class="text-xs uppercase tracking-widest text-accent">
              {{ formattedDate }}
            </div>
            <h2 class="mt-2 font-display text-3xl font-light leading-tight md:text-5xl">
              {{ concert.title }}
            </h2>

            <dl class="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <dt class="text-xs uppercase tracking-widest text-ink-500">{{ t('modal.location') }}</dt>
                <dd class="mt-1">{{ t(`locations.${concert.location}`) }}</dd>
              </div>
              <div v-if="concert.artists">
                <dt class="text-xs uppercase tracking-widest text-ink-500">{{ t('modal.artists') }}</dt>
                <dd class="mt-1">{{ concert.artists }}</dd>
              </div>
              <div v-if="concert.instruments">
                <dt class="text-xs uppercase tracking-widest text-ink-500">{{ t('modal.instruments') }}</dt>
                <dd class="mt-1">{{ concert.instruments }}</dd>
              </div>
              <div v-if="concert.duration">
                <dt class="text-xs uppercase tracking-widest text-ink-500">{{ t('modal.duration') }}</dt>
                <dd class="mt-1">{{ concert.duration }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-widest text-ink-500">{{ t('modal.price') }}</dt>
                <dd class="mt-1">{{ t(`modal.${concert.price_type}`) }}</dd>
              </div>
            </dl>

            <p v-if="concert.description" class="mt-8 leading-relaxed text-ink-700 dark:text-ink-300">
              {{ concert.description }}
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
              <a
                v-if="concert.external_link"
                :href="concert.external_link"
                target="_blank"
                rel="noopener"
                class="btn-primary"
              >
                {{ t('modal.moreInfo') }}
              </a>
              <button class="btn-ghost" @click="downloadIcs(concert)">
                {{ t('modal.addToCalendar') }}
              </button>
              <SocialShare :title="concert.title" :url="shareUrl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
