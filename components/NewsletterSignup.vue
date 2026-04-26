<script setup lang="ts">
const { t } = useI18n()
const email = ref('')
const sent = ref(false)
const error = ref('')
const loading = ref(false)

async function submit() {
  if (!email.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value }
    })
    sent.value = true
    email.value = ''
    setTimeout(() => (sent.value = false), 4000)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('newsletter.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <form v-if="!sent" class="flex flex-col gap-3 sm:flex-row" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        :placeholder="t('newsletter.placeholder')"
        :aria-label="t('newsletter.placeholder')"
        class="min-h-[54px] w-full min-w-0 flex-1 appearance-none rounded-full border border-white/20 bg-text-primary/5 px-6 py-[15px] text-base leading-6 text-text-primary placeholder-text-secondary/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all box-border"
      >
      <button type="submit" :disabled="loading" class="btn-premium-primary w-full sm:!w-auto whitespace-nowrap shrink-0">
        {{ loading ? '…' : t('newsletter.cta') }}
      </button>
    </form>
    <div v-if="error && !sent" class="mt-2 text-sm text-red-500 text-center">{{ error }}</div>
    <div v-if="sent" class="h-[54px] flex items-center justify-center text-gold font-medium animate-fade-in">
      <Icon name="heroicons:check-circle" class="w-6 h-6 mr-2" />
      {{ t('newsletter.thanks') }}
    </div>
  </div>
</template>
