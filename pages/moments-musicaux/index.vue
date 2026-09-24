<script setup lang="ts">
/**
 * Page publique des Moments musicaux : le rendez-vous en une ligne pratique,
 * puis les prochaines séances en cartes — la première à la une, deux fois plus
 * large et dorée. Le reste du programme se déplie à la demande, sans jamais
 * aligner six mois de jeudis.
 *
 * Les séances sont chargées côté serveur pour être dans le HTML (référencement
 * et données structurées), et la page est régénérée toutes les heures.
 */
import type { SeancePublique } from '~/utils/moments'
import { CRENEAU_REGULIER, finCreneau, heureFr } from '~/utils/moments'
import { venues } from '~/utils/venues'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl

const { data } = await useFetch<{ du: string; seances: SeancePublique[] }>('/api/moments', { query: { mois: 6 } })
const seances = computed(() => data.value?.seances ?? [])
/** La prochaine séance, à la une ; les cartes reprennent à la suivante. */
const prochaine = computed(() => seances.value[0] ?? null)
/**
 * Deux cartes à côté de la une sur ordinateur, quatre dessous sur téléphone :
 * la 3e et la 4e (`SUR_TELEPHONE`) ne s'affichent en carte que sur petit
 * écran, et dans la suite du programme que sur grand écran.
 */
const suivantes = computed(() => seances.value.slice(1, 5))
const SUR_TELEPHONE = 3
/** Le reste du programme, déplié à la demande. */
const reste = computed(() => seances.value.slice(SUR_TELEPHONE))
const toutVoir = ref(false)
const horaire = `${heureFr(CRENEAU_REGULIER)} – ${heureFr(finCreneau(CRENEAU_REGULIER))}`

/**
 * Séances groupées par mois, pour aérer la suite du programme. `grandEcran` :
 * déjà en carte sur téléphone, la séance n'apparaît ici que sur grand écran.
 */
const parMois = computed(() => {
  const groupes = new Map<string, (SeancePublique & { grandEcran: boolean })[]>()
  reste.value.forEach((s, i) => {
    const cle = s.date.slice(0, 7)
    groupes.set(cle, [...(groupes.get(cle) ?? []), { ...s, grandEcran: i < suivantes.value.length + 1 - SUR_TELEPHONE }])
  })
  return [...groupes.entries()].map(([cle, liste]) => {
    const [y, m] = cle.split('-').map(Number)
    const titre = new Date(y, m - 1, 1).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })
    return { cle, titre: titre.charAt(0).toUpperCase() + titre.slice(1), liste, grandEcran: liste.every(s => s.grandEcran) }
  })
})

function formater(date: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', options)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const jourCourt = (date: string) => formater(date, { weekday: 'short', day: 'numeric' })
/** « 1er octobre », « 15 octobre ». */
const jourMois = (date: string) => {
  const s = formater(date, { day: 'numeric', month: 'long' })
  return locale.value === 'fr' ? s.replace(/^1 /, '1er ') : s
}

/** « Jeudi 1er octobre ». */
const jourProchaine = computed(() => {
  if (!prochaine.value) return ''
  const jour = formater(prochaine.value.date, { weekday: 'long', day: 'numeric', month: 'long' })
  return locale.value === 'fr' ? jour.replace(/^(\S+) 1 /, '$1 1er ') : jour
})
/** « aujourd'hui », « demain », « dans 7 jours » : compté depuis la date de génération de la page. */
const dansCombien = computed(() => {
  if (!prochaine.value || !data.value?.du) return ''
  const jours = Math.round((Date.parse(prochaine.value.date) - Date.parse(data.value.du)) / 86400000)
  return jours <= 0 ? t('moments.today') : jours === 1 ? t('moments.tomorrow') : t('moments.inDays', { n: jours })
})

const pageUrl = `${siteUrl}${localePath('/moments-musicaux')}`

/**
 * Chaque séance est un `MusicEvent` gratuit : c'est ce qui permet aux agendas
 * de Google de les reprendre. Même jeu de champs que les concerts, pour ne pas
 * déclencher les signalements de la Search Console.
 */
const venue = venues.saint_maurice
const jsonLd = computed(() => safeJsonLd({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: t('moments.pageTitle'),
  itemListElement: seances.value.slice(0, 20).map((s, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'MusicEvent',
      name: `${t('moments.title')} — ${s.interprete}`,
      startDate: `${s.date}T${s.debut}:00${dateOffset(s.date)}`,
      endDate: `${s.date}T${s.fin}:00${dateOffset(s.date)}`,
      location: {
        '@type': 'Place',
        name: venue.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: venue.streetAddress,
          postalCode: venue.postalCode,
          addressLocality: 'Lille',
          addressCountry: 'FR'
        },
        geo: { '@type': 'GeoCoordinates', latitude: venue.latitude, longitude: venue.longitude }
      },
      performer: [{ '@type': 'Person', name: s.interprete }],
      organizer: { '@type': 'Organization', name: 'Orgue Vivant', url: siteUrl },
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: pageUrl },
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: `${siteUrl}/img/orgue-st-maurice.jpg`,
      description: s.programme
        ? `${t('moments.intro')} ${s.programme}`
        : t('moments.intro'),
      url: pageUrl
    }
  }))
}))

/** Décalage horaire de Paris à cette date : l'heure d'été change deux fois par an. */
function dateOffset(date: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${date}T12:00:00Z`))
  return (parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+01:00').replace('GMT', '') || '+01:00'
}

useHead({
  title: `${t('moments.pageTitle')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('moments.seoDesc') }],
  script: [{ type: 'application/ld+json', innerHTML: jsonLd }]
})

useSeoMeta({
  ogTitle: `${t('moments.pageTitle')} — Orgue Vivant`,
  ogDescription: t('moments.seoDesc'),
  ogImage: `${siteUrl}/img/orgue-st-maurice.jpg`,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="bg-background">
    <div class="container-premium py-16 md:py-24">
      <!-- Présentation -->
      <header>
        <div class="mb-6 inline-flex items-center gap-3">
          <span class="h-[1px] w-8 bg-gold" />
          <span class="text-xs font-bold uppercase tracking-[0.4em] text-gold">{{ t('moments.eyebrow') }}</span>
        </div>
        <h1 class="heading-section text-text-primary">{{ t('moments.pageTitle') }}</h1>
        <p class="mt-6 text-xl font-light leading-relaxed text-text-secondary">{{ t('moments.pageIntro') }}</p>
        <!-- Le quand, le où et l'entrée : une seule fois, sur une ligne dès qu'il y a la place -->
        <ul class="mt-6 flex flex-col gap-2 text-[15px] text-text-primary sm:flex-row sm:flex-wrap sm:gap-x-8">
          <li class="flex items-center gap-2">
            <Icon name="heroicons:clock" class="h-4 w-4 shrink-0 text-gold" />
            {{ t('moments.rdvDay') }}, {{ horaire }}
          </li>
          <li class="flex items-center gap-2">
            <Icon name="heroicons:map-pin" class="h-4 w-4 shrink-0 text-gold" />
            {{ t('moments.place') }}
          </li>
          <li class="flex items-center gap-2">
            <Icon name="heroicons:ticket" class="h-4 w-4 shrink-0 text-gold" />
            {{ t('moments.free') }}
          </li>
        </ul>
      </header>

      <!-- Prochaines séances : la une et deux cartes sur ordinateur, la une et quatre cartes sur téléphone -->
      <section class="mt-12">
        <h2 class="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.nextSessions') }}</h2>

        <p v-if="!prochaine" class="text-text-secondary">{{ t('moments.none') }}</p>

        <ul v-else class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <li class="col-span-2 flex flex-col justify-center rounded-2xl border border-gold/35 bg-gold/10 p-5 sm:p-6">
            <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
              {{ t('moments.nextShort') }} · {{ dansCombien }}
            </div>
            <div class="mt-2 font-display text-3xl font-light text-text-primary">{{ jourProchaine }}</div>
            <div class="mt-2 text-sm">
              <span v-if="prochaine.type === 'regulier'" class="text-gold">
                <span class="mr-2 inline-block h-2 w-2 rounded-full bg-gold align-[1px]" />{{ prochaine.interprete }}
              </span>
              <span v-else class="text-text-primary">
                {{ prochaine.interprete }}
              </span>
            </div>
            <p v-if="prochaine.programme" class="mt-1.5 text-xs font-light leading-relaxed text-text-secondary">{{ prochaine.programme }}</p>
          </li>
          <li
            v-for="(s, i) in suivantes"
            :key="s.id ?? s.date"
            class="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5"
            :class="{ 'lg:hidden': i >= SUR_TELEPHONE - 1 }"
          >
            <div class="font-display text-2xl font-light text-text-primary">{{ jourMois(s.date) }}</div>
            <div class="mt-3 text-sm">
              <span v-if="s.type === 'regulier'" class="text-gold">
                <span class="mr-2 inline-block h-2 w-2 rounded-full bg-gold align-[1px]" />{{ s.interprete }}
              </span>
              <span v-else class="text-text-primary">
                {{ s.interprete }}
              </span>
            </div>
            <p v-if="s.programme" class="mt-1.5 text-xs font-light leading-relaxed text-text-secondary">{{ s.programme }}</p>
          </li>
        </ul>

        <button
          v-if="reste.length"
          type="button"
          class="mt-6 text-sm text-gold underline-offset-4 hover:underline"
          :class="{ 'max-lg:hidden': parMois.every(g => g.grandEcran) }"
          :aria-expanded="toutVoir"
          @click="toutVoir = !toutVoir"
        >
          {{ toutVoir ? t('moments.seeLess') : t('moments.seeAll') }}
        </button>

        <!-- Suite du programme : dans la page pour les moteurs de recherche, affichée sur demande -->
        <div v-show="toutVoir" class="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-2">
          <div v-for="groupe in parMois" :key="groupe.cle" :class="{ 'max-lg:hidden': groupe.grandEcran }">
            <div class="mb-1 flex items-center gap-4">
              <h3 class="font-display text-xl font-light text-text-primary">{{ groupe.titre }}</h3>
              <div class="h-[1px] flex-1 bg-white/5" />
            </div>
            <ul class="divide-y divide-white/5">
              <li
                v-for="s in groupe.liste"
                :key="s.id ?? s.date"
                class="py-3.5 text-sm sm:grid sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4"
                :class="{ 'max-lg:hidden': s.grandEcran }"
              >
                <span class="font-medium text-text-primary">{{ jourCourt(s.date) }}</span>
                <div class="mt-1 sm:mt-0">
                  <span v-if="s.type === 'regulier'" class="text-gold">
                    <span class="mr-2 inline-block h-2 w-2 rounded-full bg-gold align-[1px]" />{{ s.interprete }}
                  </span>
                  <span v-else class="text-text-primary">
                    {{ s.interprete }}
                  </span>
                  <p v-if="s.programme" class="mt-0.5 font-light text-text-secondary">{{ s.programme }}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Abonnement à l'agenda, dans la même carte que sur la page des concerts -->
      <div class="card-premium mt-16 p-8 md:p-12">
        <CalendarSubscribe />
      </div>
    </div>
  </div>
</template>
