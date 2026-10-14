<script setup lang="ts">
/**
 * Un album : ses photos en mosaïque, ouvertes en grand dans la visionneuse.
 * Chaque photo se télécharge seule (visionneuse, ou icône au survol de sa
 * vignette), ou tout l'album d'un coup en .zip, assemblé dans le navigateur.
 */
import { lienTelechargement, nomFichierPhoto, slug } from '~/utils/nomPhoto'

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

/** Le fichier d'origine quand on l'a, sinon la copie d'affichage. */
const fichier = (i: number) => photos.value[i].url_originale ?? photos.value[i].url
const lienPhoto = (i: number) => lienTelechargement(fichier(i), nomFichierPhoto(a.value.titre, i, fichier(i)))

// ── L'album en .zip ──────────────────────────────────────────────────────────
// Les photos sont déjà compressées : client-zip les range sans les recompresser.
const zip = reactive({ enCours: false, fait: 0, erreur: false })
async function telechargerAlbum() {
  if (zip.enCours) return
  Object.assign(zip, { enCours: true, fait: 0, erreur: false })
  try {
    const { downloadZip } = await import('client-zip')
    const fichiers = await Promise.all(photos.value.map(async (_, i) => {
      const r = await fetch(fichier(i))
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const input = await r.blob()
      zip.fait++
      return { name: nomFichierPhoto(a.value.titre, i, fichier(i)), lastModified: new Date(), input }
    }))
    const url = URL.createObjectURL(await downloadZip(fichiers).blob())
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `orgue-vivant-${slug(a.value.titre)}.zip`
    document.body.appendChild(lien); lien.click(); lien.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    zip.erreur = true
  } finally {
    zip.enCours = false
  }
}

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
  <div class="container-premium py-16 md:py-24 bg-background min-h-screen">
    <NuxtLink :to="localePath('/photos')" class="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-gold">
      <Icon name="heroicons:arrow-left" class="h-4 w-4" />{{ t('photos.allAlbums') }}
    </NuxtLink>

    <header class="mb-10 mt-8">
      <h1 class="heading-section text-text-primary">{{ a.titre }}</h1>
      <!-- Le bouton de l'album sur la même ligne que ses informations, centré
           sur elles ; en dessous, sur toute la largeur, sur téléphone. -->
      <div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary">
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
        <button
          class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-text-primary transition-colors hover:bg-white/5 disabled:opacity-70"
          :disabled="zip.enCours"
          @click="telechargerAlbum"
        >
          <Icon v-if="zip.enCours" name="heroicons:arrow-path" class="h-4 w-4 animate-spin text-gold" />
          <Icon v-else name="heroicons:arrow-down-tray" class="h-4 w-4 text-gold" />
          <span v-if="zip.enCours" class="tabular-nums">{{ t('photos.zipping', { n: zip.fait, total: photos.length }) }}</span>
          <span v-else>{{ t('photos.downloadAlbum') }} <span class="text-text-secondary">(.zip)</span></span>
        </button>
      </div>
      <p v-if="zip.erreur" class="mt-3 text-sm text-rose-300">{{ t('photos.zipError') }}</p>
    </header>

    <div class="columns-2 gap-3 sm:columns-3 md:gap-4">
      <div v-for="(p, i) in photos" :key="p.id" class="group relative mb-3 break-inside-avoid md:mb-4">
        <button
          class="block w-full overflow-hidden rounded-[14px] bg-surface"
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
        <!-- Au survol, sur ordinateur : la photo se télécharge sans l'ouvrir. -->
        <a
          :href="lienPhoto(i)"
          class="absolute right-2.5 top-2.5 hidden h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 focus:opacity-100 group-hover:opacity-100 md:flex"
          :aria-label="t('photos.downloadPhoto')"
          :title="t('photos.downloadPhoto')"
        >
          <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
        </a>
      </div>
    </div>

    <PhotoVisionneuse v-model="ouverte" :photos="photos" :titre="a.titre" />
  </div>
</template>
