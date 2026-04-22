<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
const other = computed(() => (locale.value === 'fr' ? 'en' : 'fr'))
</script>

<template>
  <button
    :aria-label="`Switch to ${other.toUpperCase()}`"
    class="rounded-full px-3 py-2 text-xs font-medium uppercase tracking-wider text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
    @click="setLocale(other)"
  >
    {{ other }}
  </button>
</template>
