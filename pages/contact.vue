<script setup lang="ts">
const { t } = useI18n()

const form = reactive({ name: '', email: '', message: '' })
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const error = ref('')

useHead({
  title: `${t('nav.contact')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.contactDesc') }]
})

async function submit() {
  error.value = ''
  if (!form.name || !form.email || !form.message) {
    error.value = t('contact.errorRequired')
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    error.value = t('contact.errorEmail')
    return
  }

  status.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    status.value = 'success'
    form.name = ''; form.email = ''; form.message = ''
  } catch (e: any) {
    status.value = 'error'
    error.value = e?.data?.message || t('contact.errorGeneric')
  }
}
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('contact.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ t('contact.title') }}</h1>
      <p class="mt-4 text-ink-600 dark:text-ink-400">{{ t('contact.subtitle') }}</p>

      <form class="mt-10 space-y-5" @submit.prevent="submit">
        <div>
          <label class="label" for="name">{{ t('contact.name') }}</label>
          <input id="name" v-model="form.name" type="text" required class="input">
        </div>
        <div>
          <label class="label" for="email">{{ t('contact.email') }}</label>
          <input id="email" v-model="form.email" type="email" required class="input">
        </div>
        <div>
          <label class="label" for="message">{{ t('contact.message') }}</label>
          <textarea id="message" v-model="form.message" required rows="6" class="input resize-none" />
        </div>

        <div v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {{ error }}
        </div>
        <div v-if="status === 'success'" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {{ t('contact.success') }}
        </div>

        <button type="submit" :disabled="status === 'sending'" class="btn-primary">
          {{ status === 'sending' ? t('contact.sending') : t('contact.send') }}
        </button>
      </form>
    </div>
  </div>
</template>
