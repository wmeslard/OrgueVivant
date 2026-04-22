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
  <div class="w-full">
    <form v-if="!sent" class="flex flex-col gap-4 sm:flex-row" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        :placeholder="t('newsletter.placeholder')"
        class="h-[54px] w-full flex-1 rounded-full border border-white/10 bg-white/5 px-6 text-sm text-text-primary placeholder-text-secondary/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
      >
      <button type="submit" class="btn-premium-primary whitespace-nowrap">
        {{ t('newsletter.cta') }}
      </button>
    </form>
    <div v-else class="h-[54px] flex items-center justify-center text-gold font-medium animate-fade-in">
      <Icon name="heroicons:check-circle" class="w-6 h-6 mr-2" />
      {{ t('newsletter.thanks') }}
    </div>
  </div>
</template>
