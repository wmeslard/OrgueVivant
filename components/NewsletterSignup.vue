<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const email = ref('')
const website = ref('')          // pot de miel : jamais affiché, jamais rempli par un humain
const status = ref<'idle' | 'sent' | 'confirmed' | 'unsubscribed'>('idle')
const error = ref('')
const loading = ref(false)

// Jeton anti-robot émis par le serveur au chargement : sans lui, ou trop tôt
// après lui, l'inscription est refusée.
const formToken = useFormToken()

onMounted(() => {
  // Retour depuis un lien reçu par email : on affiche le message, puis on
  // nettoie l'adresse pour qu'un rechargement ne le répète pas.
  const state = route.query.newsletter
  if (state === 'confirmed' || state === 'unsubscribed') {
    status.value = state
    history.replaceState(history.state, '', `${route.path}#newsletter`)
  }
})

async function submit() {
  if (!email.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value, website: website.value, token: await formToken.ready() }
    })
    status.value = 'sent'
    email.value = ''
  } catch (e: any) {
    formToken.reset(e)
    error.value = e?.data?.statusMessage || t('newsletter.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div id="newsletter" class="w-full scroll-mt-32">
    <form v-if="status === 'idle'" class="flex flex-col gap-3 sm:flex-row" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        :placeholder="t('newsletter.placeholder')"
        :aria-label="t('newsletter.placeholder')"
        class="min-h-[54px] w-full min-w-0 flex-1 appearance-none rounded-full border border-white/20 bg-text-primary/5 px-6 py-[15px] text-base leading-6 text-text-primary placeholder-text-secondary/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all box-border"
      >
      <!-- Pot de miel : hors écran plutôt que display:none, que certains robots savent détecter -->
      <div class="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Site web
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
        </label>
      </div>
      <button type="submit" :disabled="loading" class="btn-premium-primary w-full sm:!w-auto whitespace-nowrap shrink-0">
        {{ loading ? '…' : t('newsletter.cta') }}
      </button>
    </form>
    <div v-if="error && status === 'idle'" class="mt-2 text-sm text-red-500 text-center">{{ error }}</div>
    <div v-if="status !== 'idle'" role="status" class="animate-fade-in rounded-2xl border border-gold/20 bg-gold/[0.06] px-6 py-7 text-center sm:px-10">
      <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold text-background">
        <Icon :name="status === 'unsubscribed' ? 'heroicons:hand-raised' : 'heroicons:check'" class="h-5 w-5" />
      </div>
      <p class="font-display text-2xl font-light text-text-primary">{{ t(`newsletter.${status}.title`) }}</p>
      <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{{ t(`newsletter.${status}.text`) }}</p>
    </div>
  </div>
</template>
