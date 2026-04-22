<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

watchEffect(() => { if (user.value) navigateTo('/admin') })

async function login() {
  loading.value = true
  error.value = ''
  const { error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  loading.value = false
  if (err) { error.value = err.message; return }
  await navigateTo('/admin')
}
</script>

<template>
  <div class="container-apple flex min-h-[70vh] items-center justify-center py-20">
    <form class="w-full max-w-md space-y-5 rounded-3xl border border-ink-200 p-10 dark:border-ink-800" @submit.prevent="login">
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
    </form>
  </div>
</template>
