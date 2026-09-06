<script setup lang="ts">
/**
 * Abonnement au flux ICS — et non simple import.
 *
 * `webcal:` est le seul schéma qu'Apple Calendrier et Outlook comprennent comme
 * un abonnement, mais il n'aboutit que si le système a une application associée.
 * Sous Chrome, le clic échoue alors silencieusement : la requête passe en
 * « canceled » et rien ne s'ouvre. On tente donc l'ouverture, on détecte
 * l'échec, et on bascule sur la marche à suivre manuelle.
 */
const { t } = useI18n()

const base = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
const feedUrl = `${base}/api/calendar.ics`
const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')
// Le paramètre `cid` doit porter l'URL en `webcal:`. Avec `https:`, Google la
// prend pour un identifiant d'agenda Google, ne le trouve pas, et répond
// « Impossible d'ajouter l'agenda. Vérifiez l'URL. »
const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`

const copied = ref(false)
const showFallback = ref(false)
const fallbackInput = ref<HTMLInputElement | null>(null)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(feedUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    // Presse-papiers refusé : on sélectionne l'adresse pour une copie manuelle.
    fallbackInput.value?.select()
  }
}

/**
 * Quand le système ouvre bien Calendrier, la fenêtre perd le focus. Sans ce
 * signal au bout d'un court délai, c'est qu'aucune application n'a répondu.
 */
function subscribeApple() {
  showFallback.value = false

  let handled = false
  const onLeave = () => { handled = true }
  window.addEventListener('blur', onLeave, { once: true })
  document.addEventListener('visibilitychange', onLeave, { once: true })

  window.location.href = webcalUrl

  setTimeout(() => {
    window.removeEventListener('blur', onLeave)
    document.removeEventListener('visibilitychange', onLeave)
    if (!handled) {
      showFallback.value = true
      nextTick(() => fallbackInput.value?.select())
    }
  }, 1500)
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
        @click.prevent="subscribeApple"
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

    <!-- Aucun agenda n'a répondu au lien webcal : on donne le chemin manuel. -->
    <div
      v-if="showFallback"
      class="mx-auto mt-6 max-w-lg rounded-2xl border border-gold/20 bg-gold/5 p-5 text-left animate-fade-in"
    >
      <p class="text-xs font-light leading-relaxed text-text-secondary">
        {{ t('calendar.appleHelp') }}
      </p>
      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          ref="fallbackInput"
          :value="feedUrl"
          readonly
          :aria-label="t('calendar.feedLabel')"
          class="h-11 w-full min-w-0 flex-1 rounded-full border border-white/20 bg-text-primary/5 px-5 text-xs text-text-secondary focus:border-gold focus:outline-none"
          @focus="fallbackInput?.select()"
        >
        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-xs font-medium text-text-primary transition-colors hover:bg-white/5"
          @click="copyLink"
        >
          <Icon
            :name="copied ? 'heroicons:check-circle' : 'heroicons:clipboard-document'"
            class="h-4 w-4 shrink-0"
            :class="copied ? 'text-gold' : ''"
          />
          {{ copied ? t('calendar.copied') : t('calendar.copyLink') }}
        </button>
      </div>
    </div>
  </div>
</template>
