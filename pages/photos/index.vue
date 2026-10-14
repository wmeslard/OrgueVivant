<script setup lang="ts">
/** Rubrique Photos : les albums publiés, du plus récent au plus ancien. */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl
const { albums } = usePhotos()

const { data } = await useAsyncData('photo-albums', () => albums().catch(() => []))
const liste = computed(() => data.value ?? [])

const dateAlbum = (d: string | null) => d
  ? new Date(`${d}T12:00`).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  : ''

useHead({
  title: `${t('photos.title')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('photos.seoDesc') }]
})
useSeoMeta({
  ogTitle: `${t('photos.title')} — Orgue Vivant`,
  ogDescription: t('photos.seoDesc'),
  ogImage: `${siteUrl}/img/orgue-st-maurice.jpg`,
  ogUrl: `${siteUrl}${localePath('/photos')}`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background min-h-screen">
    <header class="mb-12 animate-fade-up">
      <div class="inline-flex items-center gap-3 mb-6">
        <span class="h-[1px] w-8 bg-gold"></span>
        <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">{{ t('photos.eyebrow') }}</span>
      </div>
      <h1 class="heading-section text-text-primary">{{ t('photos.title') }}</h1>
    </header>

    <p v-if="!liste.length" class="card-premium p-16 text-center text-text-secondary font-light italic">
      {{ t('photos.empty') }}
    </p>

    <div v-else class="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="a in liste" :key="a.id" :to="localePath(`/photos/${a.id}`)" class="group block">
        <div class="relative overflow-hidden rounded-[20px] bg-surface" style="aspect-ratio: 4 / 3">
          <img
            v-if="a.couverture"
            :src="a.couverture"
            :srcset="a.couverture_srcset || undefined"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            :alt="a.titre"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
          >
          <span class="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-text-primary backdrop-blur-sm">
            <Icon name="heroicons:photo" class="h-3.5 w-3.5 text-gold" />{{ a.nombre }}
          </span>
        </div>
        <h2 class="mt-4 font-display text-2xl font-light leading-tight text-text-primary transition-colors duration-300 group-hover:text-gold">
          {{ a.titre }}
        </h2>
        <p v-if="a.date" class="mt-1 text-sm text-text-secondary">{{ dateAlbum(a.date) }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
