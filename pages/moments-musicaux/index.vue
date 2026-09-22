<script setup lang="ts">
/**
 * Page publique des Moments musicaux : présentation et calendrier des
 * prochaines séances, celles de l'organiste régulier comme celles des élèves.
 *
 * Les séances sont chargées côté serveur pour être dans le HTML (référencement
 * et données structurées), et la page est régénérée toutes les heures.
 */
import type { SeancePublique } from '~/utils/moments'
import { heureFr } from '~/utils/moments'
import { venues } from '~/utils/venues'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl

const { data } = await useFetch<{ du: string; seances: SeancePublique[] }>('/api/moments', { query: { mois: 6 } })
const seances = computed(() => data.value?.seances ?? [])

/** Séances groupées par mois, pour aérer une liste qui court sur six mois. */
const parMois = computed(() => {
  const groupes = new Map<string, SeancePublique[]>()
  for (const s of seances.value) {
    const cle = s.date.slice(0, 7)
    groupes.set(cle, [...(groupes.get(cle) ?? []), s])
  }
  return [...groupes.entries()].map(([cle, liste]) => {
    const [y, m] = cle.split('-').map(Number)
    const titre = new Date(y, m - 1, 1).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })
    return { cle, titre: titre.charAt(0).toUpperCase() + titre.slice(1), liste }
  })
})

function jourCourt(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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
        <!-- Phrase d'accroche sur une seule ligne dès qu'il y a la place. -->
        <p class="mt-6 text-xl font-light leading-relaxed text-text-secondary xl:whitespace-nowrap">
          {{ t('moments.intro') }}
        </p>
      </header>

      <!-- Comment ça se passe, et les repères pratiques en regard -->
      <div class="mt-12 grid gap-10 border-y border-white/5 py-9 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <p class="max-w-2xl font-light leading-relaxed text-text-secondary">{{ t('moments.who') }}</p>
        <dl class="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-5">
          <div>
            <dt class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('moments.scheduleLabel') }}</dt>
            <dd class="flex items-start gap-2 text-sm text-text-primary">
              <Icon name="heroicons:clock" class="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{{ t('moments.schedule') }} · {{ t('moments.free') }}</span>
            </dd>
          </div>
          <div>
            <dt class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('moments.placeLabel') }}</dt>
            <dd class="flex items-start gap-2 text-sm text-text-primary">
              <Icon name="heroicons:map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{{ t('moments.place') }}</span>
            </dd>
          </div>
          <div>
            <dt class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('moments.performerLabel') }}</dt>
            <dd class="flex items-start gap-2 text-sm text-text-primary">
              <Icon name="heroicons:user" class="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{{ t('moments.performer') }}</span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Calendrier -->
      <section class="mt-14">
        <h2 class="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.upcomingLabel') }}</h2>

        <p v-if="!parMois.length" class="text-text-secondary">{{ t('moments.none') }}</p>

        <div v-for="groupe in parMois" :key="groupe.cle" class="mb-10">
          <div class="mb-3 flex items-center gap-4">
            <h3 class="font-display text-xl font-light text-text-primary">{{ groupe.titre }}</h3>
            <div class="h-[1px] flex-1 bg-white/5" />
          </div>
          <ul class="divide-y divide-white/5">
            <li v-for="s in groupe.liste" :key="s.id ?? s.date" class="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-4">
              <span class="w-full text-sm font-medium text-text-primary sm:w-auto sm:min-w-[11rem]">{{ jourCourt(s.date) }}</span>
              <span class="text-sm text-text-secondary">{{ heureFr(s.debut) }}</span>
              <span class="text-sm text-text-primary">{{ s.interprete }}</span>
              <span
                v-if="s.type === 'eleve'"
                class="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold"
              >
                {{ t('moments.eleveTag') }}
              </span>
              <span v-if="s.programme" class="w-full text-sm font-light text-text-secondary">{{ s.programme }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Abonnement à l'agenda -->
      <CalendarSubscribe class="mt-16" />
    </div>
  </div>
</template>
