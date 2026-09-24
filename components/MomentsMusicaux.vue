<script setup lang="ts">
/**
 * Appel vers la page des Moments musicaux, depuis l'accueil et la page des
 * concerts : la prochaine séance et son interprète, et un lien vers le
 * calendrier complet. Le détail vit sur /moments-musicaux.
 *
 * `full` : carte détaillée pour la page Concerts.
 * `compact` : tuile de la page d'accueil, la présentation à gauche et les
 * prochaines séances à droite.
 */
import type { SeancePublique } from '~/utils/moments'
import { CRENEAU_REGULIER, finCreneau, heureFr } from '~/utils/moments'

withDefaults(defineProps<{ variant?: 'full' | 'compact' }>(), { variant: 'full' })

const { t, locale } = useI18n()
const localePath = useLocalePath()

/**
 * Séances chargées après montage : ces deux pages sont servies depuis le cache
 * (ISR), une date figée dans le HTML serait périmée dès la première
 * réservation et provoquerait une divergence d'hydratation.
 */
const seances = ref<SeancePublique[]>([])
const aujourdhui = ref('')
const charge = ref(false)
onMounted(async () => {
  aujourdhui.value = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date())
  try {
    const { seances: data } = await $fetch<{ seances: SeancePublique[] }>('/api/moments', { query: { mois: 2 } })
    seances.value = data
  } catch { seances.value = [] }
  charge.value = true
})

const prochaines = computed(() => seances.value.slice(0, 3))
const prochaine = computed(() => seances.value[0])
/** Trois lignes réservées tant que les séances ne sont pas arrivées : la tuile ne bouge pas. */
const lignes = computed<(SeancePublique | null)[]>(() => charge.value ? prochaines.value : [null, null, null])
const horaire = `${heureFr(CRENEAU_REGULIER)} – ${heureFr(finCreneau(CRENEAU_REGULIER))}`

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long' })
  // « Jeudi 1er octobre » : en français, le premier du mois s'écrit ainsi.
  const f = locale.value === 'fr' ? s.replace(/^(\S+) 1 /, '$1 1er ') : s
  return f.charAt(0).toUpperCase() + f.slice(1)
}

const prochaineLabel = computed(() => {
  if (!prochaine.value) return ''
  if (prochaine.value.date === aujourdhui.value) return t('moments.today')
  return jourLong(prochaine.value.date)
})

// La pastille est la même sur les deux variantes : ses classes sont définies
// ici pour qu'elles ne divergent pas d'un endroit à l'autre.
// Sur mobile elle occupe toute la largeur et sépare l'intitulé de la date ;
// dès `sm` elle redevient une pastille sur une ligne.
const pastille = 'flex w-full flex-col items-start gap-1.5 rounded-2xl border border-gold/25 bg-gold/[0.12] px-5 py-4 text-sm sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:gap-2.5 sm:rounded-full sm:py-2.5'
const pastilleIntitule = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gold sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal'
// La hauteur ne dépend pas du texte : la ligne est réservée dès le rendu
// serveur, seule l'opacité change quand la date, chargée après montage, arrive.
const pastilleDate = 'min-h-[1.5rem] text-base font-medium text-text-primary transition-opacity duration-500 sm:min-h-0 sm:text-sm sm:font-normal'
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
        {{ t('moments.intro') }}
      </p>

      <div class="mt-7" :class="pastille">
        <span :class="pastilleIntitule">
          <Icon name="heroicons:calendar-days" class="h-4 w-4 shrink-0" />
          {{ t('moments.nextLabel') }}
        </span>
        <span :class="[pastilleDate, prochaineLabel ? 'opacity-100' : 'opacity-0']">
          {{ prochaineLabel || '—' }}
          <template v-if="prochaine"> · {{ heureFr(prochaine.debut) }} · {{ prochaine.interprete }}</template>
        </span>
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/5 pt-7 text-sm text-text-secondary">
        <span class="flex items-center gap-2">
          <Icon name="heroicons:clock" class="h-4 w-4 shrink-0 text-gold" />
          {{ t('moments.schedule') }}
        </span>
        <span class="flex items-center gap-2">
          <Icon name="heroicons:map-pin" class="h-4 w-4 shrink-0 text-gold" />
          {{ t('moments.place') }}
        </span>
        <NuxtLink :to="localePath('/moments-musicaux')" class="ml-auto inline-flex items-center gap-2 text-gold transition-colors hover:text-text-primary">
          {{ t('moments.seeCalendar') }}
          <Icon name="heroicons:arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>
  </section>

  <!-- Accueil : la présentation à gauche, les prochaines séances à droite -->
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
            {{ t('moments.intro') }}
          </p>
          <p class="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-text-primary">
            <span>{{ t('moments.rdvDay') }}</span>
            <span class="text-gold">·</span>
            <span>{{ horaire }}</span>
            <span class="text-gold">·</span>
            <span class="text-text-secondary">{{ t('moments.free') }}</span>
          </p>
        </div>

        <div class="border-t border-white/5 pt-6 md:w-[25rem] md:shrink-0 md:border-l md:border-t-0 md:pl-11 md:pt-0">
          <div class="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
            {{ t('moments.nextSessions') }}
          </div>
          <p v-if="charge && !prochaines.length" class="py-2 text-sm text-text-secondary">
            {{ t('moments.none') }}
          </p>
          <ul v-else class="transition-opacity duration-500" :class="charge ? 'opacity-100' : 'opacity-0'">
            <li
              v-for="(s, i) in lignes"
              :key="s?.id ?? s?.date ?? i"
              class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-2.5 py-2 text-[13px] sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-3 sm:text-sm"
            >
              <span class="text-text-primary">{{ s ? jourLong(s.date) : '—' }}</span>
              <span v-if="s?.type === 'regulier'" class="text-gold">
                <span class="mr-2 inline-block h-2 w-2 rounded-full bg-gold align-[1px]" />{{ s.interprete }}
              </span>
              <span v-else-if="s" class="text-text-primary">
                {{ s.interprete }}
              </span>
            </li>
          </ul>
          <NuxtLink
            :to="localePath('/moments-musicaux')"
            class="mt-3 inline-flex items-center gap-2 text-sm text-gold transition-colors hover:text-text-primary"
          >
            {{ t('moments.seeProgramme') }}
            <Icon name="heroicons:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
