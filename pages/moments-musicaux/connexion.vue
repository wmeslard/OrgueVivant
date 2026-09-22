<script setup lang="ts">
/**
 * Connexion des professeurs. Deux voies, au choix :
 *  - un lien envoyé par email, sans mot de passe à retenir — le cas courant,
 *    puisqu'on inscrit ses élèves deux ou trois fois par an ;
 *  - un mot de passe, pour ceux qui en ont défini un depuis leur espace.
 */
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const route = useRoute()

/**
 * Page demandée avant la connexion, s'il y en a une. Seuls les chemins
 * internes sont acceptés : une URL absolue permettrait de renvoyer le
 * professeur vers un site tiers depuis un lien fabriqué.
 */
const suite = computed(() => {
  const q = route.query.suite
  return typeof q === 'string' && /^\/[^/\\]/.test(q) ? q : localePath('/moments-musicaux/espace')
})

const mode = ref<'lien' | 'motdepasse'>('lien')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const info = ref('')

useHead({
  title: `${t('momentsEspace.title')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const siteUrl = useRuntimeConfig().public.siteUrl as string

onMounted(() => {
  // Lien d'invitation ou de réinitialisation ouvert ici : Supabase place la
  // session dans le fragment d'URL, le module la reprend, il n'y a qu'à suivre.
  if (window.location.hash.includes('access_token')) navigateTo(suite.value)
})

/** Lien de connexion par email. La réponse est la même que le compte existe ou non. */
async function envoyerLien() {
  if (!email.value) { error.value = t('momentsDemande.errorEmail'); return }
  loading.value = true; error.value = ''; info.value = ''
  await supabase.auth.signInWithOtp({
    email: email.value,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}${suite.value}` }
  })
  loading.value = false
  info.value = t('momentsEspace.emailLinkSent')
}

async function login() {
  loading.value = true; error.value = ''; info.value = ''
  const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  if (err) { loading.value = false; error.value = err.message; return }
  const role = (data.user?.app_metadata as Record<string, unknown>)?.role
  if (role !== 'professeur' && role !== 'admin' && role !== 'super_admin') {
    await supabase.auth.signOut()
    loading.value = false
    error.value = t('momentsEspace.noAccess')
    return
  }
  loading.value = false
  await navigateTo(suite.value)
}

async function reset() {
  if (!email.value) { error.value = t('momentsDemande.errorEmail'); return }
  loading.value = true; error.value = ''
  await supabase.auth.resetPasswordForEmail(email.value, { redirectTo: `${siteUrl}/auth-setup` })
  loading.value = false
  info.value = t('momentsEspace.resetSent')
}
</script>

<template>
  <div class="container-premium flex min-h-[70vh] items-center justify-center py-20">
    <div class="card-premium w-full max-w-md p-8 md:p-10">
      <div class="mb-6">
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="mt-3 font-display text-3xl font-light text-text-primary">{{ t('momentsEspace.title') }}</h1>
        <p class="mt-2 text-sm text-text-secondary">{{ t('momentsEspace.subtitle') }}</p>
      </div>

      <form class="space-y-5" @submit.prevent="mode === 'lien' ? envoyerLien() : login()">
        <div>
          <label class="label" for="email">{{ t('momentsEspace.email') }}</label>
          <input id="email" v-model="email" type="email" required class="input" autocomplete="email">
        </div>
        <div v-if="mode === 'motdepasse'">
          <label class="label" for="pass">{{ t('momentsEspace.password') }}</label>
          <input id="pass" v-model="password" type="password" required class="input" autocomplete="current-password">
        </div>

        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <p v-if="info" class="text-sm text-gold">{{ info }}</p>

        <button type="submit" class="btn-premium-primary w-full" :disabled="loading">
          <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          {{ mode === 'lien' ? t('momentsEspace.emailLink') : t('momentsEspace.signIn') }}
        </button>
      </form>

      <div class="mt-6 space-y-2 border-t border-white/5 pt-5 text-center text-sm">
        <button
          type="button"
          class="text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
          @click="mode = mode === 'lien' ? 'motdepasse' : 'lien'; error = ''; info = ''"
        >
          {{ mode === 'lien' ? t('momentsEspace.withPassword') : t('momentsEspace.withEmail') }}
        </button>
        <button
          v-if="mode === 'motdepasse'"
          type="button"
          class="block w-full text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
          @click="reset"
        >
          {{ t('momentsEspace.forgot') }}
        </button>
        <NuxtLink
          :to="localePath('/moments-musicaux/professeurs')"
          class="block text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          {{ t('momentsDemande.request') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
