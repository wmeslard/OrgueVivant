<script setup lang="ts">
const { t } = useI18n()
useHead({ title: `${t('footer.legalMentions')} — Orgue Vivant` })
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl prose prose-ink dark:prose-invert">
      <h1 class="heading-section">{{ t('footer.legalMentions') }}</h1>
      <p class="mt-6 text-ink-700 dark:text-ink-300">{{ t('legal.editor') }}</p>
      <p class="mt-4 text-ink-700 dark:text-ink-300">{{ t('legal.hosting') }}</p>
      <p class="mt-4 text-ink-700 dark:text-ink-300">{{ t('legal.contact') }}</p>
      <p class="mt-4 text-ink-700 dark:text-ink-300">{{ t('legal.intellectual') }}</p>
    </div>
  </div>
</template>
