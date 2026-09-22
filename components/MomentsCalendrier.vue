<script setup lang="ts">
/**
 * Grille mensuelle des Moments musicaux, du lundi au dimanche. Chaque jour
 * porte le nombre de créneaux encore libres, ou la raison pour laquelle il
 * n'en a pas ; le composant ne fait qu'afficher et remonter le jour cliqué.
 */
import { parseYmd, ymd } from '~/utils/moments'

export interface EtatJour {
  /** Créneaux libres ce jour-là. */
  libres: number
  /** Élèves déjà inscrits, pour le point de couleur. */
  pris: number
  /** Un de mes élèves joue ce jour-là. */
  mien: boolean
  /** Rien à proposer : dimanche, messe, indisponibilité, date trop proche. */
  indisponible: boolean
}

const props = defineProps<{
  /** Mois affiché, « YYYY-MM ». */
  mois: string
  jours: Record<string, EtatJour>
  aujourdhui: string
  /** Jour ouvert dans le panneau des créneaux. */
  selection?: string
}>()
const emit = defineEmits<{ (e: 'choisir', date: string): void; (e: 'update:mois', mois: string): void }>()

const { t, locale } = useI18n()

const premier = computed(() => parseYmd(`${props.mois}-01`))
const titre = computed(() => {
  const s = premier.value.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

/** Cases de la grille : décalage pour commencer le lundi, puis les jours du mois. */
const cases = computed(() => {
  const d = new Date(premier.value)
  const decalage = (d.getDay() + 6) % 7
  const out: ({ date: string; num: number } | null)[] = Array(decalage).fill(null)
  while (d.getMonth() === premier.value.getMonth()) {
    out.push({ date: ymd(d), num: d.getDate() })
    d.setDate(d.getDate() + 1)
  }
  return out
})

const entetes = computed(() => {
  const base = new Date(2024, 0, 1) // un lundi
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i)
    return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' }).replace('.', '')
  })
})

function decaler(n: number) {
  const d = new Date(premier.value); d.setMonth(d.getMonth() + n)
  emit('update:mois', ymd(d).slice(0, 7))
}

function classes(date: string) {
  const j = props.jours[date]
  if (!j || j.indisponible) return 'border-transparent text-text-secondary/40'
  if (props.selection === date) return 'cursor-pointer border-gold bg-gold/20 text-text-primary'
  if (j.libres) return 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-gold hover:bg-gold/10'
  return 'border-white/5 bg-white/[0.02] text-text-secondary'
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <button type="button" class="rounded-full border border-white/10 p-2 transition hover:border-gold" :aria-label="t('momentsEspace.moisPrecedent')" @click="decaler(-1)">
        <Icon name="heroicons:chevron-left" class="h-4 w-4" />
      </button>
      <div class="font-display text-xl font-light text-text-primary">{{ titre }}</div>
      <button type="button" class="rounded-full border border-white/10 p-2 transition hover:border-gold" :aria-label="t('momentsEspace.moisSuivant')" @click="decaler(1)">
        <Icon name="heroicons:chevron-right" class="h-4 w-4" />
      </button>
    </div>
    <div class="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary">
      <div v-for="e in entetes" :key="e" class="py-1">{{ e }}</div>
    </div>
    <div class="mt-1.5 grid grid-cols-7 gap-1.5">
      <template v-for="(c, i) in cases" :key="i">
        <div v-if="!c" />
        <button
          v-else
          type="button"
          class="flex min-h-[62px] flex-col items-start rounded-xl border p-2 text-left text-sm transition"
          :class="[classes(c.date), c.date === aujourdhui && 'ring-1 ring-gold/60']"
          :disabled="!jours[c.date] || jours[c.date].indisponible"
          @click="emit('choisir', c.date)"
        >
          <span class="font-medium">{{ c.num }}</span>
          <span v-if="jours[c.date]?.libres" class="mt-auto text-[10px] leading-tight text-gold">
            {{ jours[c.date].libres }}
          </span>
          <span v-if="jours[c.date]?.pris" class="mt-0.5 flex gap-0.5">
            <span
              v-for="n in Math.min(jours[c.date].pris, 4)"
              :key="n"
              class="h-1 w-1 rounded-full"
              :class="jours[c.date].mien ? 'bg-gold' : 'bg-white/30'"
            />
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
