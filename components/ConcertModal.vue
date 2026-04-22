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


function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-apple"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-300 ease-apple"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="concert"
      class="fixed inset-0 z-[100] overflow-y-auto bg-background/95 backdrop-blur-xl"
      @click.self="$emit('close')"
    >
      <div class="flex min-h-full items-start justify-center p-4 md:items-center md:p-12" @click.self="$emit('close')">
        <div
          class="relative w-full max-w-5xl overflow-hidden rounded-[32px] bg-surface border border-white/10 shadow-2xl"
        >
          <button
            class="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/50 text-text-primary backdrop-blur hover:bg-gold hover:text-background transition-all duration-300"
            :aria-label="t('modal.close')"
            @click="$emit('close')"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>

          <div class="flex flex-col lg:flex-row">
            <!-- Left Side: Image -->
            <div v-if="concert.image_url" class="lg:w-2/5 aspect-[4/5] lg:aspect-auto bg-background">
              <img :src="concert.image_url" :alt="concert.title" class="h-full w-full object-cover">
            </div>

            <!-- Right Side: Content -->
            <div class="lg:w-3/5 p-8 md:p-16">
              <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold mb-4">
                {{ formattedDate }}
              </div>
              <h2 class="font-display text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-text-primary">
                {{ concert.title }}
              </h2>

              <div class="mt-12 space-y-8">
                <div class="grid grid-cols-2 gap-8 border-b border-white/5 pb-8">
                  <div>
                    <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-2 font-bold">{{ t('modal.location') }}</dt>
                    <dd class="text-text-primary flex items-center gap-2">
                      <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold" />
                      {{ t(`locations.${concert.location}`) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-2 font-bold">{{ t('modal.price') }}</dt>
                    <dd class="text-text-primary flex items-center gap-2">
                      <Icon name="heroicons:ticket" class="w-4 h-4 text-gold" />
                      {{ t(`modal.${concert.price_type}`) }}
                    </dd>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-8 border-b border-white/5 pb-8">
                  <div v-if="concert.artists">
                    <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-2 font-bold">{{ t('modal.artists') }}</dt>
                    <dd class="text-text-primary italic">{{ concert.artists }}</dd>
                  </div>
                  <div v-if="concert.duration">
                    <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-2 font-bold">{{ t('modal.duration') }}</dt>
                    <dd class="text-text-primary">{{ concert.duration }}</dd>
                  </div>
                </div>

                <div v-if="concert.description" class="prose prose-invert max-w-none">
                  <p class="text-lg leading-relaxed text-text-secondary font-light">
                    {{ concert.description }}
                  </p>
                </div>

                <div class="pt-8 grid grid-cols-1 sm:flex sm:flex-wrap items-stretch gap-6">
                  <a
                    v-if="concert.external_link"
                    :href="concert.external_link"
                    target="_blank"
                    rel="noopener"
                    class="btn-premium-primary !h-14 !px-10"
                  >
                    {{ t('modal.book') }}
                  </a>
                  <button class="btn-premium-secondary !h-14 !px-10" @click="downloadIcs(concert)">
                    <Icon name="heroicons:calendar" class="w-5 h-5 text-gold" />
                    <span>{{ t('modal.addToCalendar') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
