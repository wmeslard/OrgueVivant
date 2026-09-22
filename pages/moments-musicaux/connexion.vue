<script setup lang="ts">
/**
 * Connexion des élèves organistes. Distincte de /admin/login : le rôle attendu
 * est `eleve`, et la page renvoie vers l'espace des séances.
 */
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const route = useRoute()

/**
 * Page demandée avant la connexion, s'il y en a une. Seuls les chemins internes
 * sont acceptés : une URL absolue permettrait de renvoyer l'élève vers un site
 * tiers depuis un lien fabriqué.
 */
const suite = computed(() => {
  const q = route.query.suite
  return typeof q === 'string' && /^\/[^/\\]/.test(q) ? q : localePath('/moments-musicaux/espace')
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const info = ref('')

useHead({
  title: `${t('momentsEspace.title')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

onMounted(() => {
  // Lien d'invitation ou de réinitialisation ouvert ici : la définition du mot
  // de passe se fait sur la page dédiée, commune avec l'administration.
  const hash = window.location.hash
  if (hash.includes('type=invite') || hash.includes('type=recovery')) navigateTo('/auth-setup' + hash)
})

async function login() {
  loading.value = true; error.value = ''; info.value = ''
  const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  if (err) { loading.value = false; error.value = err.message; return }
  const role = (data.user?.app_metadata as Record<string, unknown>)?.role
  if (role !== 'eleve') {
    await supabase.auth.signOut()
    loading.value = false
    error.value = 'Accès réservé aux élèves organistes.'
    return
  }
  loading.value = false
  await navigateTo(suite.value)
}

async function reset() {
  if (!email.value) { error.value = t('momentsCandidature.errorEmail'); return }
  loading.value = true; error.value = ''
  const siteUrl = useRuntimeConfig().public.siteUrl as string
  await supabase.auth.resetPasswordForEmail(email.value, { redirectTo: `${siteUrl}/auth-setup` })
  loading.value = false
  // Réponse identique que le compte existe ou non : ne pas révéler les adresses inscrites.
  info.value = t('momentsEspace.resetSent')
}
</script>

<template>
  <div class="container-premium flex min-h-[70vh] items-center justify-center py-20">
    <form class="card-premium w-full max-w-md space-y-5 p-8 md:p-10" @submit.prevent="login">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="mt-3 font-display text-3xl font-light text-text-primary">{{ t('momentsEspace.title') }}</h1>
        <p class="mt-2 text-sm text-text-secondary">{{ t('momentsEspace.subtitle') }}</p>
      </div>
      <div>
        <label class="label" for="email">{{ t('momentsEspace.email') }}</label>
        <input id="email" v-model="email" type="email" required class="input" autocomplete="email">
      </div>
      <div>
        <label class="label" for="pass">{{ t('momentsEspace.password') }}</label>
        <input id="pass" v-model="password" type="password" required class="input" autocomplete="current-password">
      </div>
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      <p v-if="info" class="text-sm text-gold">{{ info }}</p>
      <button type="submit" class="btn-premium-primary w-full" :disabled="loading">
        <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
        {{ t('momentsEspace.signIn') }}
      </button>
      <button type="button" class="w-full text-sm text-text-secondary underline-offset-4 hover:underline" @click="reset">
        {{ t('momentsEspace.forgot') }}
      </button>
    </form>
  </div>
</template>
