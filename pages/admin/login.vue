<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const mode = ref<'login' | 'reset'>('login')

onMounted(() => {
  const hash = window.location.hash
  if (hash.includes('type=invite') || hash.includes('type=recovery')) {
    navigateTo('/auth-setup' + hash)
  }
})

async function login() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  if (err) {
    loading.value = false
    error.value = err.message
    return
  }
  const role = (data.user?.app_metadata as Record<string, unknown>)?.role
  if (role !== 'admin' && role !== 'super_admin') {
    await supabase.auth.signOut()
    loading.value = false
    error.value = 'Accès non autorisé. Contactez l\'administrateur.'
    return
  }
  loading.value = false
  await navigateTo('/admin')
}

async function sendReset() {
  if (!email.value) { error.value = 'Saisissez votre email.'; return }
  loading.value = true
  error.value = ''
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${siteUrl}/auth-setup`
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  success.value = 'Un email de réinitialisation vous a été envoyé.'
}
</script>

<template>
  <div class="container-apple flex min-h-[70vh] items-center justify-center py-20">
    <!-- Login form -->
    <form
      v-if="mode === 'login'"
      class="w-full max-w-md space-y-5 rounded-3xl border border-ink-200 p-10 dark:border-ink-800"
      @submit.prevent="login"
    >
      <div>
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
        <h1 class="mt-2 font-display text-3xl font-light">{{ t('admin.loginTitle') }}</h1>
      </div>
      <div>
        <label class="label">{{ t('contact.email') }}</label>
        <input v-model="email" type="email" required class="input">
      </div>
      <div>
        <label class="label">{{ t('admin.password') }}</label>
        <input v-model="password" type="password" required class="input">
      </div>
      <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '…' : t('admin.signIn') }}
      </button>
      <p class="text-center">
        <button type="button" class="text-xs text-ink-400 underline hover:text-ink-600" @click="mode = 'reset'; error = ''">
          Mot de passe oublié ?
        </button>
      </p>
    </form>

    <!-- Reset form -->
    <form
      v-else
      class="w-full max-w-md space-y-5 rounded-3xl border border-ink-200 p-10 dark:border-ink-800"
      @submit.prevent="sendReset"
    >
      <div>
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
        <h1 class="mt-2 font-display text-3xl font-light">Réinitialisation</h1>
        <p class="mt-2 text-sm text-ink-500">Saisissez votre email, vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      </div>
      <div>
        <label class="label">{{ t('contact.email') }}</label>
        <input v-model="email" type="email" required class="input">
      </div>
      <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
      <div v-if="success" class="text-sm text-green-600">{{ success }}</div>
      <button type="submit" class="btn-primary w-full" :disabled="loading || !!success">
        {{ loading ? '…' : 'Envoyer le lien' }}
      </button>
      <p class="text-center">
        <button type="button" class="text-xs text-ink-400 underline hover:text-ink-600" @click="mode = 'login'; error = ''; success = ''">
          ← Retour à la connexion
        </button>
      </p>
    </form>
  </div>
</template>
