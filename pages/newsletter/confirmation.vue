<script setup lang="ts">
/**
 * Page d'atterrissage des liens reçus par email (confirmation d'inscription,
 * désinscription) et des liens invalides : un message d'état, puis les
 * prochains concerts. Une page à part, plutôt qu'une ancre sur l'accueil,
 * pour arriver au bon endroit quel que soit l'écran.
 */
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { upcoming, fetchConcerts } = useConcerts()

type State = 'confirmee' | 'desinscrit' | 'invalide'
const state = computed<State>(() => {
  const s = route.query.etat
  return s === 'desinscrit' || s === 'invalide' ? s : 'confirmee'
})
const icon = computed(() => ({
  confirmee: 'heroicons:check',
  desinscrit: 'heroicons:hand-raised',
  invalide: 'heroicons:exclamation-triangle'
})[state.value])

await callOnce('concerts', fetchConcerts)
const next = computed(() => upcoming.value.slice(0, 3))

function day(date: string) { return new Date(`${date}T12:00`).getDate() }
function month(date: string) {
  return new Date(`${date}T12:00`)
    .toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })
    .toUpperCase().replace('.', '')
}
function time(c: { time?: string | null }) { return c.time ? c.time.slice(0, 5).replace(':', ' h ').replace(/ 00$/, '') : '' }

useHead({ title: `${t(`newsletterPage.${state.value}.title`)} — Orgue Vivant` })
// Page personnelle, sans intérêt pour les moteurs : ni indexée ni dans le sitemap.
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="container-premium pb-16 pt-20 md:pb-24 md:pt-36">
    <div class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-x-20 lg:gap-y-0">
      <!-- Message d'état -->
      <section class="text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-background md:mb-7 md:h-14 md:w-14">
          <Icon :name="icon" class="h-6 w-6" />
        </div>
        <p class="mb-3 text-[11px] font-medium uppercase tracking-[0.35em] text-gold md:mb-4">{{ t('newsletterPage.overline') }}</p>
        <h1 class="font-display text-[34px] font-light leading-[1.1] tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          {{ t(`newsletterPage.${state}.title`) }}
        </h1>
        <p class="mx-auto mt-3 max-w-md text-[15px] font-light leading-relaxed text-text-secondary md:mt-5 md:text-lg">
          {{ t(`newsletterPage.${state}.text`) }}
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center md:mt-9">
          <NuxtLink :to="localePath('/concerts')" class="btn-premium-primary w-full whitespace-nowrap sm:w-auto md:!w-auto">{{ t('newsletterPage.concerts') }}</NuxtLink>
          <NuxtLink :to="localePath('/')" class="btn-premium-secondary w-full whitespace-nowrap sm:w-auto md:!w-auto">{{ t('newsletterPage.home') }}</NuxtLink>
        </div>
      </section>

      <!-- Prochains concerts -->
      <section v-if="next.length" aria-labelledby="prochains" class="lg:row-span-2">
        <h2 id="prochains" class="mb-3 text-[11px] uppercase tracking-[0.3em] text-text-secondary/60">{{ t('newsletterPage.next') }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="c in next" :key="c.id">
            <NuxtLink :to="localePath(`/concerts/${c.id}`)" class="card-premium flex items-center gap-4 px-5 py-4 hover:border-gold/30">
              <div class="w-12 shrink-0 text-center">
                <div class="font-display text-[28px] font-light leading-none text-text-primary">{{ day(c.date) }}</div>
                <div class="mt-1.5 text-[9px] tracking-[0.25em] text-gold">{{ month(c.date) }}</div>
              </div>
              <div class="min-w-0">
                <div class="line-clamp-2 font-display text-lg font-light leading-snug text-text-primary md:text-xl">{{ c.title }}</div>
                <div class="mt-0.5 text-xs text-text-secondary">{{ t(`locations.${c.location}`) }}<template v-if="time(c)"> · {{ time(c) }}</template></div>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Sur mobile, la mention passe sous les concerts pour laisser leur début
           visible dès l'arrivée sur la page. -->
      <p class="mx-auto max-w-sm text-center text-[10px] uppercase leading-relaxed tracking-widest text-text-secondary/50 lg:-mt-2 lg:self-start lg:pt-9">
        {{ t(`newsletterPage.${state}.note`) }}
      </p>
    </div>
  </div>
</template>
