<script setup lang="ts">
import { concertPlaceholder } from '~/utils/placeholders'
import { artistList, artistNames, type Artist } from '~/utils/artists'
import { venues } from '~/utils/venues'
import { parisIso, parisEndIso, performerType, metaDescription } from '~/utils/event'
const { t, locale } = useI18n()
const route = useRoute()
const { all, fetchConcerts } = useConcerts()
const { downloadIcs } = useIcs()
const siteUrl = useRuntimeConfig().public.siteUrl
const localePath = useLocalePath()

await callOnce('concerts', fetchConcerts)

const concert = computed(() => all.value.find(c => c.id === route.params.id))

if (!concert.value) {
  throw createError({ statusCode: 404, statusMessage: 'Concert introuvable' })
}

const artists = computed(() => artistList(concert.value?.artists))

/** Seuls les artistes détaillés méritent une carte ; les autres apparaissent
 *  simplement dans la liste en tête de page. */
const detailed = computed(() => artists.value.filter(a => a.image_url || a.bio))

/** Artiste ouvert en grand depuis sa carte. */
const openArtist = ref<Artist | null>(null)

/** Partage : copie l'adresse de la fiche. L'API moderne peut être refusée
 *  (contexte intégré, permission) : on retombe alors sur la copie par sélection. */
const copied = ref(false)
async function copyLink() {
  let ok = false
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    ok = true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = pageUrl.value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    try { ok = document.execCommand('copy') } catch { ok = false }
    ta.remove()
  }
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const title = computed(() => localized(concert.value?.title, concert.value?.title_en, locale.value))
const description = computed(() =>
  localized(concert.value?.description, concert.value?.description_en, locale.value))

const formattedDate = computed(() => {
  if (!concert.value) return ''
  const d = new Date(`${concert.value.date}T${concert.value.time || '20:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
})

const location = computed(() => concert.value?.location ?? '')
const { directionsUrl, placeUrl } = useMapsUrls(location)

const safeExternalLink = computed(() => {
  const raw = concert.value?.external_link
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch { return '' }
})

/**
 * Description pour les moteurs : celle du concert, coupée à la longueur d'un
 * extrait ; à défaut, une phrase construite (date, heure, lieu, artistes),
 * toujours plus utile que la description générique de la liste.
 */
const seoDescription = computed(() => {
  if (!concert.value) return t('seo.concertsDesc')
  if (description.value) return metaDescription(description.value)
  return t('seo.concertFallback', {
    date: formattedDate.value,
    time: locale.value === 'fr' ? concert.value.time.replace(':', 'h') : concert.value.time,
    venue: t(`locations.${concert.value.location}`),
    artists: artistNames(concert.value.artists, locale.value) || 'Orgue Vivant'
  })
})

const pageUrl = computed(() => `${siteUrl}${localePath(`/concerts/${route.params.id}`)}`)
const image = computed(() =>
  concert.value?.image_url || `${siteUrl}${concertPlaceholder(concert.value?.id)}`)

useHead({
  title: concert.value ? `${title.value} — Orgue Vivant` : 'Concert — Orgue Vivant',
  meta: [{ name: 'description', content: seoDescription.value }],
  script: concert.value ? [{
    type: 'application/ld+json',
    innerHTML: safeJsonLd((() => {
      const c = concert.value
      const venue = venues[c.location] ?? venues.saint_maurice
      const time = c.time || '20:00'
      const endDate = parisEndIso(c.date, time, c.duration)
      const performer = artistList(c.artists).map(a => ({ '@type': performerType(a.name), name: a.name }))
      return {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: title.value,
        startDate: parisIso(c.date, time),
        ...(endDate && { endDate }),
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
        ...(performer.length && { performer }),
        organizer: { '@type': 'Organization', name: 'Orgue Vivant', url: siteUrl },
        isAccessibleForFree: c.price_type === 'free',
        // Entrée libre = offre gratuite ; sinon le prix n'est pas connu du site,
        // on renvoie vers la billetterie si un lien existe.
        offers: {
          '@type': 'Offer',
          ...(c.price_type === 'free' && { price: 0, priceCurrency: 'EUR' }),
          availability: 'https://schema.org/InStock',
          url: safeExternalLink.value || pageUrl.value
        },
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        image: image.value,
        description: seoDescription.value,
        url: pageUrl.value
      }
    })())
  }] : []
})

if (concert.value) {
  useSeoMeta({
    ogTitle: title.value,
    ogDescription: seoDescription.value,
    ogImage: image.value,
    ogUrl: pageUrl.value,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterImage: image.value
  })
}
</script>

<template>
  <div v-if="concert" class="container-premium py-16 md:py-24 bg-background min-h-screen">
    <NuxtLink
      :to="localePath('/concerts')"
      class="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary hover:text-gold transition-colors mb-10"
    >
      <Icon name="heroicons:arrow-left" class="w-4 h-4" />
      {{ t('nav.concerts') }}
    </NuxtLink>

    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
      <!-- Image -->
      <!-- Collée en haut à côté du texte sur grand écran seulement : en une
           colonne, elle recouvrirait le contenu pendant le défilement. -->
      <div class="mx-auto w-full max-w-md overflow-hidden rounded-[28px] lg:sticky lg:top-24 lg:max-w-none">
        <div class="aspect-[4/5]">
          <img
            :src="concert.image_url || concertPlaceholder(concert.id)"
            :alt="title"
            loading="eager"
            decoding="async"
            class="w-full h-full object-cover"
          >
        </div>
      </div>

      <!-- Contenu -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-4 capitalize">
          {{ formattedDate }}
        </div>
        <h1 class="font-display text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-text-primary mb-8">
          {{ title }}
        </h1>

        <dl class="grid grid-cols-2 gap-6 border-y border-text-primary/5 py-8 mb-8">
          <div>
            <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.location') }}</dt>
            <dd class="text-text-primary flex items-center gap-2 text-sm">
              <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold shrink-0" />
              <a
                :href="placeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-gold hover:underline underline-offset-2 transition-colors duration-200"
              >{{ t(`locations.${concert.location}`) }}</a>
            </dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.price') }}</dt>
            <dd class="text-text-primary flex items-center gap-2 text-sm">
              <Icon name="heroicons:ticket" class="w-4 h-4 text-gold shrink-0" />
              {{ concert.price_type === 'free' ? t('modal.freeLong') : t('modal.paid') }}
            </dd>
          </div>
          <div v-if="artists.length">
            <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.artists') }}</dt>
            <dd class="text-text-primary italic text-sm">{{ artistNames(artists, locale) }}</dd>
          </div>
          <div v-if="concert.duration">
            <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.duration') }}</dt>
            <dd class="text-text-primary text-sm">{{ concert.duration }}</dd>
          </div>
        </dl>

        <p v-if="description" class="text-text-secondary font-light leading-relaxed mb-10 whitespace-pre-wrap">
          {{ description }}
        </p>

        <!-- Artistes : des cartes réduites au nom et à la photo ; la
             présentation complète s'ouvre en grand, dans la même mise en page
             que les tuiles du carrousel de la fenêtre de concert. -->
        <section v-if="detailed.length" class="mb-10">
          <div class="mb-4 text-[10px] font-bold uppercase tracking-widest text-gold">
            {{ t('modal.artists') }}
          </div>
          <div class="grid gap-6 sm:grid-cols-2">
            <button
              v-for="(a, i) in detailed"
              :key="i"
              type="button"
              class="card-premium group overflow-hidden text-left transition-transform duration-500 ease-apple hover:-translate-y-1"
              :aria-label="`${a.name} — ${t('modal.artistOpen')}`"
              @click="openArtist = a"
            >
              <div v-if="a.image_url" class="overflow-hidden">
                <img
                  :src="a.image_url"
                  :alt="a.name"
                  loading="lazy"
                  class="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
                >
              </div>
              <div class="p-5">
                <h2 class="font-display text-xl font-light text-text-primary">{{ a.name }}</h2>
                <span class="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gold">
                  {{ t('modal.artistOpen') }}
                  <Icon name="heroicons:arrows-pointing-out" class="h-4 w-4" />
                </span>
              </div>
            </button>
          </div>
        </section>

        <!-- Actions : pleine largeur et empilées sur mobile, en ligne ensuite. -->
        <div class="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <a
            v-if="safeExternalLink"
            :href="safeExternalLink"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-premium-primary !h-12 !w-full !px-5 text-sm sm:!w-auto"
          >
            {{ t('modal.book') }}
          </a>
          <button
            class="btn-premium-secondary !h-12 !w-full !px-5 text-sm sm:!w-auto"
            @click="downloadIcs(concert)"
          >
            <Icon name="heroicons:calendar" class="w-4 h-4 text-gold" />
            {{ t('modal.addToCalendar') }}
          </button>
          <a
            :href="directionsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-premium-secondary !h-12 !w-full !px-5 text-sm sm:!w-auto"
          >
            <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold" />
            {{ t('modal.directions') }}
          </a>
          <!-- Même bouton que les deux autres, en retrait : texte et icône
               atténués, l'action est secondaire. -->
          <button
            type="button"
            class="btn-premium-secondary !h-12 !w-full !px-5 text-sm !text-text-secondary hover:!text-text-primary sm:!w-auto"
            @click="copyLink"
          >
            <Icon :name="copied ? 'heroicons:check' : 'heroicons:link'" class="w-4 h-4" :class="copied ? 'text-gold' : ''" />
            {{ copied ? t('modal.copied') : t('modal.copyLink') }}
          </button>
        </div>
      </div>
    </div>
    <ArtistModal :artist="openArtist" @close="openArtist = null" />
  </div>
</template>
