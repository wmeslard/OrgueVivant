<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

const props = defineProps<{ concert: Concert | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { locale, t } = useI18n()
const { downloadIcs } = useIcs()

const description = computed(() => {
  if (!props.concert) return ''
  if (locale.value === 'en' && props.concert.description_en) return props.concert.description_en
  return props.concert.description
})

const safeExternalLink = computed(() => {
  const raw = props.concert?.external_link
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
})

const formattedDate = computed(() => {
  if (!props.concert) return ''
  const d = new Date(`${props.concert.date}T${props.concert.time || '20:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
})

// Scroll lock
watch(() => props.concert, (val) => {
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
      v-if="concert"
      class="fixed inset-0 z-[100] overflow-hidden bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
      @click.self="$emit('close')"
    >
      <div
        class="relative w-full max-w-5xl max-h-[90vh] flex flex-col lg:flex-row overflow-hidden rounded-[28px] bg-surface border border-text-primary/10 shadow-2xl"
        @click.stop
      >
        <!-- Bouton fermer -->
        <button
          class="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-text-primary backdrop-blur hover:bg-gold hover:text-background transition-all duration-300"
          :aria-label="t('modal.close')"
          @click="$emit('close')"
        >
          <Icon name="heroicons:x-mark" class="h-4 w-4" />
        </button>

        <!-- Image -->
        <div v-if="concert.image_url" class="lg:w-2/5 lg:h-auto shrink-0 overflow-hidden">
          <img
            :src="concert.image_url"
            :alt="concert.title"
            class="h-48 w-full object-cover lg:h-full"
          >
        </div>

        <!-- Contenu scrollable -->
        <div class="flex-1 overflow-y-auto p-7 md:p-10 min-h-0">
          <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-3">
            {{ formattedDate }}
          </div>
          <h2 class="font-display text-3xl md:text-4xl font-light leading-tight text-text-primary">
            {{ concert.title }}
          </h2>

          <div class="mt-7 space-y-5">
            <!-- Lieu + Tarif -->
            <div class="grid grid-cols-2 gap-6 border-b border-text-primary/5 pb-5">
              <div>
                <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.location') }}</dt>
                <dd class="text-text-primary flex items-center gap-2 text-sm">
                  <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold shrink-0" />
                  {{ t(`locations.${concert.location}`) }}
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.price') }}</dt>
                <dd class="text-text-primary flex items-center gap-2 text-sm">
                  <Icon name="heroicons:ticket" class="w-4 h-4 text-gold shrink-0" />
                  {{ t(`modal.${concert.price_type}`) }}
                </dd>
              </div>
            </div>

            <!-- Artistes + Durée -->
            <div v-if="concert.artists || concert.duration" class="grid grid-cols-2 gap-6 border-b border-text-primary/5 pb-5">
              <div v-if="concert.artists">
                <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.artists') }}</dt>
                <dd class="text-text-primary italic text-sm">{{ concert.artists }}</dd>
              </div>
              <div v-if="concert.duration">
                <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.duration') }}</dt>
                <dd class="text-text-primary text-sm">{{ concert.duration }}</dd>
              </div>
            </div>

            <!-- Description -->
            <div v-if="description">
              <p class="text-sm leading-relaxed text-text-secondary font-light">
                {{ description }}
              </p>
            </div>

            <!-- Actions -->
            <div class="pt-2 flex flex-wrap gap-3">
              <a
                v-if="safeExternalLink"
                :href="safeExternalLink"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-premium-primary !h-11 !w-auto !px-7"
              >
                {{ t('modal.book') }}
              </a>
              <button class="btn-premium-secondary !h-11 !w-auto !px-7 flex items-center gap-2" @click="downloadIcs(concert)">
                <Icon name="heroicons:calendar" class="w-4 h-4 text-gold" />
                <span>{{ t('modal.addToCalendar') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
