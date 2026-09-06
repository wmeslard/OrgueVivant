<script setup lang="ts">
/**
 * Rendez-vous récurrent (un jeudi sur deux), distinct de la programmation de concerts.
 * `full` : bloc détaillé pour la page Concerts.
 * `compact` : mention resserrée pour la page d'accueil.
 */
withDefaults(defineProps<{ variant?: 'full' | 'compact' }>(), { variant: 'full' })

const { t, locale } = useI18n()

const details = computed(() => [
  { icon: 'heroicons:clock', label: t('moments.scheduleLabel'), value: t('moments.schedule') },
  { icon: 'heroicons:map-pin', label: t('moments.placeLabel'), value: t('moments.place') },
  { icon: 'heroicons:user', label: t('moments.performerLabel'), value: t('moments.performer') }
])

const THURSDAY = 4
const SESSION_END_H = 13
const SESSION_END_M = 45

/** Numéro de semaine ISO 8601 (celui qui figure sur les calendriers français). */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Prochain jeudi de semaine paire ; la séance du jour ne compte plus une fois terminée. */
function findNextSession(now: Date): Date | null {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = 0; i <= 21; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (d.getDay() !== THURSDAY || isoWeek(d) % 2 !== 0) continue
    if (i === 0) {
      const end = new Date(d)
      end.setHours(SESSION_END_H, SESSION_END_M, 0, 0)
      if (now > end) continue
    }
    return d
  }
  return null
}

// Calculé après montage uniquement : les pages publiques sont mises en cache
// (ISR), une date figée dans le HTML serait périmée et provoquerait en plus
// une divergence d'hydratation.
const nextSession = ref<Date | null>(null)
onMounted(() => { nextSession.value = findNextSession(new Date()) })

const isToday = computed(() =>
  !!nextSession.value && nextSession.value.toDateString() === new Date().toDateString()
)

const nextSessionLabel = computed(() => {
  if (!nextSession.value) return ''
  if (isToday.value) return t('moments.today')
  const formatted = nextSession.value.toLocaleDateString(
    locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long' }
  )
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})
</script>

<template>
  <!-- Page Concerts : catégorie à part entière -->
  <section v-if="variant === 'full'" class="mt-24">
    <div class="mb-8 flex items-center gap-4">
      <h2 class="text-xs uppercase tracking-[0.3em] text-gold font-bold">
        {{ t('moments.eyebrow') }}
      </h2>
      <div class="h-[1px] flex-1 bg-white/5" />
    </div>

    <div class="card-premium p-8 md:p-12">
      <h3 class="font-display text-3xl md:text-4xl font-light leading-tight text-text-primary">
        {{ t('moments.title') }}
      </h3>
      <p class="mt-5 max-w-2xl text-text-secondary font-light leading-relaxed">
        {{ t('moments.subtitle') }}
      </p>

      <div
        v-if="nextSessionLabel"
        class="mt-7 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-gold/20 bg-gold/10 px-5 py-2.5 text-sm"
      >
        <Icon name="heroicons:calendar-days" class="h-4 w-4 shrink-0 text-gold" />
        <!-- Même police et même taille des deux côtés : seule la couleur les
             distingue, ce qui évite tout décalage optique. -->
        <span class="font-medium text-gold">{{ t('moments.nextLabel') }}</span>
        <span class="text-text-primary">{{ nextSessionLabel }}</span>
      </div>

      <dl class="mt-9 grid gap-7 border-t border-white/5 pt-8 sm:grid-cols-3">
        <div v-for="d in details" :key="d.label">
          <dt class="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            {{ d.label }}
          </dt>
          <dd class="flex items-start gap-2 text-sm text-text-primary">
            <Icon :name="d.icon" class="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>{{ d.value }}</span>
          </dd>
        </div>
      </dl>
    </div>
  </section>

  <!-- Accueil : mention resserrée -->
  <section v-else class="py-16 bg-background">
    <div class="container-premium">
      <div class="card-premium flex flex-col gap-7 p-7 md:flex-row md:items-center md:gap-12 md:p-10">
        <div class="flex-1">
          <div class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('moments.eyebrow') }}
          </div>
          <h2 class="font-display text-2xl md:text-3xl font-light leading-tight text-text-primary">
            {{ t('moments.title') }}
          </h2>
          <p class="mt-3 max-w-xl text-sm font-light leading-relaxed text-text-secondary">
            {{ t('moments.subtitle') }}
          </p>
          <div
            v-if="nextSessionLabel"
            class="mt-5 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-sm"
          >
            <Icon name="heroicons:calendar-days" class="h-4 w-4 shrink-0 text-gold" />
            <span class="font-medium text-gold">{{ t('moments.nextLabel') }}</span>
            <span class="text-text-primary">{{ nextSessionLabel }}</span>
          </div>
        </div>

        <div class="shrink-0 space-y-2.5 md:border-l md:border-white/5 md:pl-12">
          <div v-for="d in details" :key="d.label" class="flex items-start gap-2.5 text-sm text-text-primary">
            <Icon :name="d.icon" class="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>{{ d.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
