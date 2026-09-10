<script setup lang="ts">
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

const description = computed(() => {
  if (!concert.value) return ''
  if (locale.value === 'en' && concert.value.description_en) return concert.value.description_en
  return concert.value.description
})

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

useHead({
  title: concert.value ? `${concert.value.title} — Orgue Vivant` : 'Concert — Orgue Vivant',
  meta: [{ name: 'description', content: description.value || t('seo.concertsDesc') }],
  script: concert.value ? [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: concert.value.title,
      startDate: `${concert.value.date}T${concert.value.time || '20:00'}:00`,
      location: {
        '@type': 'Place',
        name: concert.value.location === 'saint_maurice' ? 'Église Saint-Maurice de Lille' : 'Église Saint-Étienne de Lille',
        address: { '@type': 'PostalAddress', addressLocality: 'Lille', addressCountry: 'FR' }
      },
      organizer: { '@type': 'Organization', name: 'Orgue Vivant', url: siteUrl },
      isAccessibleForFree: concert.value.price_type === 'free',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      ...(concert.value.image_url && { image: concert.value.image_url }),
      ...(description.value && { description: description.value }),
      url: `${siteUrl}${localePath(`/concerts/${route.params.id}`)}`
    })
  }] : []
})

if (concert.value) {
  useSeoMeta({
    ogTitle: concert.value.title,
    ogDescription: description.value || t('seo.concertsDesc'),
    ogImage: concert.value.image_url || `${siteUrl}/img/orgue-st-maurice.jpg`,
    ogUrl: `${siteUrl}${localePath(`/concerts/${route.params.id}`)}`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterImage: concert.value.image_url || `${siteUrl}/img/orgue-st-maurice.jpg`
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
      <div v-if="concert.image_url" class="aspect-[4/5] overflow-hidden rounded-[28px] sticky top-24">
        <img
          :src="concert.image_url"
          :alt="concert.title"
          loading="eager"
          decoding="async"
          class="w-full h-full object-cover"
        >
      </div>

      <!-- Contenu -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-4 capitalize">
          {{ formattedDate }}
        </div>
        <h1 class="font-display text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-text-primary mb-8">
          {{ concert.title }}
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

        <!-- Artistes : une carte par personne, la page ayant la place
             de les empiler, là où la fenêtre de détail les fait défiler. -->
        <section v-if="detailed.length" class="mb-10">
          <div class="mb-4 text-[10px] font-bold uppercase tracking-widest text-gold">
            {{ t('modal.artists') }}
          </div>
          <div class="grid gap-6 sm:grid-cols-2">
            <article
              v-for="(a, i) in detailed"
              :key="i"
              class="card-premium overflow-hidden"
            >
              <img
                v-if="a.image_url"
                :src="a.image_url"
                :alt="a.name"
                loading="lazy"
                class="aspect-[4/5] w-full object-cover"
              >
              <div class="p-6">
                <h2 class="font-display text-2xl font-light text-text-primary">{{ a.name }}</h2>
                <p
                  v-if="a.bio"
                  class="mt-3 whitespace-pre-wrap text-sm font-light leading-relaxed text-text-secondary"
                >
                  {{ a.bio }}
                </p>
              </div>
            </article>
          </div>
        </section>

        <div class="flex flex-wrap gap-3">
          <a
            v-if="safeExternalLink"
            :href="safeExternalLink"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-premium-primary !h-12 !w-auto !px-7"
          >
            {{ t('modal.book') }}
          </a>
          <button
            class="btn-premium-secondary !h-12 !w-auto !px-7 flex items-center gap-2"
            @click="downloadIcs(concert)"
          >
            <Icon name="heroicons:calendar" class="w-4 h-4 text-gold" />
            {{ t('modal.addToCalendar') }}
          </button>
          <a
            :href="directionsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-premium-secondary !h-12 !w-auto !px-7 flex items-center gap-2"
          >
            <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold" />
            {{ t('modal.directions') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
