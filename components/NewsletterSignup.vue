<script setup lang="ts">
const { t } = useI18n()
const email = ref('')
const sent = ref(false)

function submit() {
  if (!email.value) return
  // UI-only: persistence would be wired via Supabase table or Resend audience.
  sent.value = true
  email.value = ''
  setTimeout(() => (sent.value = false), 3000)
}
</script>

<template>
  <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="submit">
    <input
      v-model="email"
      type="email"
      required
      :placeholder="t('newsletter.placeholder')"
      class="input flex-1"
    >
    <button type="submit" class="btn-primary">{{ t('newsletter.cta') }}</button>
    <p v-if="sent" class="text-xs text-accent">{{ t('newsletter.thanks') }}</p>
  </form>
</template>
