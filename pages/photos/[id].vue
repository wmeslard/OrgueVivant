<script setup lang="ts">
/** Un album : ses photos en mosaïque, ouvertes en grand dans la visionneuse. */
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl
const { album } = usePhotos()

const id = String(route.params.id)
const { data } = await useAsyncData(`photo-album-${id}`, () => album(id))
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' })

const ouverte = ref<number | null>(null)
const a = computed(() => data.value!.album)
const photos = computed(() => data.value!.photos)
const concert = computed(() => data.value!.concert)

const date = computed(() => a.value.date
  ? new Date(`${a.value.date}T12:00`).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  : '')
const description = computed(() => t('photos.albumDesc', { titre: a.value.titre, n: photos.value.length }))

useHead({ title: `${a.value.titre} — ${t('photos.title')} — Orgue Vivant`, meta: [{ name: 'description', content: description }] })
useSeoMeta({
  ogTitle: `${a.value.titre} — Orgue Vivant`,
  ogDescription: description,
  ogImage: data.value.couverture?.url,
  ogUrl: `${siteUrl}${localePath(`/photos/${id}`)}`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="container-premium py-12 md:py-20 bg-background min-h-screen">
    <NuxtLink :to="localePath('/photos')" class="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-gold">
      <Icon name="heroicons:arrow-left" class="h-4 w-4" />{{ t('photos.allAlbums') }}
    </NuxtLink>

    <header class="mb-10 mt-8">
      <h1 class="heading-section text-text-primary">{{ a.titre }}</h1>
      <p class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary">
        <span v-if="date">{{ date }}</span>
        <span v-if="date" class="text-white/20">·</span>
        <span>{{ t('photos.count', { n: photos.length }, photos.length) }}</span>
        <template v-if="concert">
          <span class="text-white/20">·</span>
          <NuxtLink :to="localePath(`/concerts/${concert.id}`)" class="text-gold underline-offset-4 hover:underline">
            {{ t('photos.seeConcert') }} →
          </NuxtLink>
        </template>
      </p>
    </header>

    <div class="columns-2 gap-3 sm:columns-3 md:gap-4">
      <button
        v-for="(p, i) in photos"
        :key="p.id"
        class="group mb-3 block w-full overflow-hidden rounded-[14px] bg-surface md:mb-4"
        :aria-label="p.legende || t('photos.open', { n: i + 1 })"
        @click="ouverte = i"
      >
        <img
          :src="p.url_vignette"
          :alt="p.legende || ''"
          :width="p.largeur || undefined"
          :height="p.hauteur || undefined"
          loading="lazy"
          decoding="async"
          class="h-auto w-full transition-transform duration-700 ease-apple group-hover:scale-[1.03]"
        >
      </button>
    </div>

    <PhotoVisionneuse v-model="ouverte" :photos="photos" :titre="a.titre" />
  </div>
</template>
