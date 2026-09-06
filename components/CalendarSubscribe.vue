<script setup lang="ts">
/**
 * Abonnement au flux ICS — et non simple import.
 *
 * `webcal:` n'aboutit que si le système a une application enregistrée pour ce
 * schéma : sous Chrome, et pour les utilisateurs de Google Agenda, le clic ne
 * produit rien. On propose donc explicitement les trois chemins réels.
 */
const { t } = useI18n()

const base = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
const feedUrl = `${base}/api/calendar.ics`
const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')
// Google crée bien un abonnement (et non une copie figée) à partir d'une URL https.
const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`

const copied = ref(false)
const copyFailed = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(feedUrl)
    copied.value = true
    copyFailed.value = false
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    // Presse-papiers indisponible (contexte non sécurisé, permission refusée) :
    // on affiche l'URL pour que l'utilisateur la copie à la main.
    copyFailed.value = true
  }
}
</script>

<template>
  <div class="w-full text-center">
    <div class="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
      {{ t('calendar.eyebrow') }}
    </div>
    <p class="mx-auto mb-6 max-w-md text-sm font-light leading-relaxed text-text-secondary">
      {{ t('calendar.subtitle') }}
    </p>

    <div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <a
        :href="googleUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 px-7 text-sm font-medium text-text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5 sm:w-auto"
      >
        <Icon name="heroicons:calendar-days" class="h-4 w-4 shrink-0 text-gold" />
        {{ t('calendar.google') }}
      </a>
      <a
        :href="webcalUrl"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 px-7 text-sm font-medium text-text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5 sm:w-auto"
      >
        <Icon name="heroicons:calendar-days" class="h-4 w-4 shrink-0 text-gold" />
        {{ t('calendar.apple') }}
      </a>
      <button
        type="button"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm text-text-secondary transition-colors hover:text-text-primary sm:w-auto"
        @click="copyLink"
      >
        <Icon
          :name="copied ? 'heroicons:check-circle' : 'heroicons:link'"
          class="h-4 w-4 shrink-0"
          :class="copied ? 'text-gold' : ''"
        />
        {{ copied ? t('calendar.copied') : t('calendar.copyLink') }}
      </button>
    </div>

    <p v-if="copyFailed" class="mt-4 break-all text-xs text-text-secondary">
      {{ feedUrl }}
    </p>
  </div>
</template>
