<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const ready = ref(false)

onMounted(async () => {
  // Check for error params (expired/invalid link)
  const searchParams = new URLSearchParams(window.location.search)
  const urlError = searchParams.get('error_code') || searchParams.get('error')
  if (urlError) {
    if (urlError === 'otp_expired') {
      error.value = 'Ce lien a expiré. Demandez un nouveau lien depuis la page de connexion.'
    } else {
      error.value = 'Lien invalide. Demandez un nouveau lien depuis la page de connexion.'
    }
    ready.value = true
    return
  }

  const hash = window.location.hash
  const params = new URLSearchParams(hash.slice(1))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    if (sessionError) {
      error.value = 'Session invalide. Demandez un nouveau lien depuis la page de connexion.'
      ready.value = true
      return
    }
    await new Promise<void>(resolve => {
      let stop: (() => void) | undefined
      stop = watch(user, val => {
        if (val) { stop?.(); resolve() }
      }, { immediate: true })
      setTimeout(() => { stop?.(); resolve() }, 2000)
    })
  }

  if (!user.value) {
    await navigateTo('/admin/login')
    return
  }
  ready.value = true
})

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Le mot de passe doit faire au moins 8 caractères'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false
  if (err) { error.value = err.message; return }
  await navigateTo('/admin')
}
</script>

<template>
  <div class="container-apple flex min-h-[70vh] items-center justify-center py-20">
    <div
      v-if="ready && error"
      class="w-full max-w-md space-y-5 rounded-3xl border border-ink-200 p-10 dark:border-ink-800 text-center"
    >
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
      <p class="text-sm text-red-600 mt-3">{{ error }}</p>
      <NuxtLink to="/admin/login" class="btn-primary inline-block mt-2">
        Retour à la connexion
      </NuxtLink>
    </div>

    <form
      v-else-if="ready"
      class="w-full max-w-md space-y-5 rounded-3xl border border-ink-200 p-10 dark:border-ink-800"
      @submit.prevent="submit"
    >
      <div>
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
        <h1 class="mt-2 font-display text-3xl font-light">Définir votre mot de passe</h1>
        <p class="mt-2 text-sm text-ink-500">Bienvenue ! Choisissez un mot de passe pour accéder à l'administration.</p>
      </div>
      <div>
        <label class="label">Mot de passe</label>
        <input v-model="password" type="password" required minlength="8" class="input">
      </div>
      <div>
        <label class="label">Confirmer le mot de passe</label>
        <input v-model="confirm" type="password" required minlength="8" class="input">
      </div>
      <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '…' : 'Enregistrer et accéder' }}
      </button>
    </form>
  </div>
</template>
