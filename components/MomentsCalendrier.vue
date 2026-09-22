<script setup lang="ts">
/**
 * Grille mensuelle des Moments musicaux, du lundi au dimanche. Chaque jour
 * reçoit un état calculé par le parent (libre, pris, titulaire, fermé…) ;
 * le composant ne fait qu'afficher et remonter le jour cliqué.
 */
import { parseYmd, ymd } from '~/utils/moments'

export type EtatJour = 'libre' | 'mienne' | 'prise' | 'titulaire' | 'fermee' | 'dimanche' | 'passe' | 'hors'

const props = defineProps<{
  /** Mois affiché, « YYYY-MM ». */
  mois: string
  /** État de chaque jour du mois (« YYYY-MM-DD » → état) et libellé éventuel. */
  jours: Record<string, { etat: EtatJour; libelle?: string }>
  aujourdhui: string
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

const classes: Record<EtatJour, string> = {
  libre: 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-gold hover:bg-gold/10',
  mienne: 'cursor-pointer border-gold bg-gold/20 text-text-primary',
  prise: 'border-white/5 bg-white/[0.02] text-text-secondary',
  titulaire: 'border-white/5 bg-white/[0.02] text-text-secondary',
  fermee: 'border-transparent bg-red-500/10 text-text-secondary',
  dimanche: 'border-transparent text-text-secondary/40',
  passe: 'border-transparent text-text-secondary/40',
  hors: 'border-transparent text-text-secondary/40'
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
          class="flex min-h-[64px] flex-col items-start rounded-xl border p-2 text-left text-sm transition"
          :class="[classes[jours[c.date]?.etat ?? 'hors'], c.date === aujourdhui && 'ring-1 ring-gold/60']"
          :disabled="!['libre', 'mienne'].includes(jours[c.date]?.etat ?? 'hors')"
          @click="emit('choisir', c.date)"
        >
          <span class="font-medium">{{ c.num }}</span>
          <span v-if="jours[c.date]?.libelle" class="mt-1 line-clamp-2 text-[11px] leading-tight">{{ jours[c.date]?.libelle }}</span>
        </button>
      </template>
    </div>
  </div>
</template>
