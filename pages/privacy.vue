<script setup lang="ts">
const { t } = useI18n()
useHead({ title: `${t('footer.privacy')} — Orgue Vivant` })
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <h1 class="heading-section">{{ t('footer.privacy') }}</h1>
      <p class="mt-6 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('privacy.intro') }}</p>
      <h2 class="mt-10 font-display text-2xl">{{ t('privacy.dataTitle') }}</h2>
      <p class="mt-4 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('privacy.data') }}</p>
      <h2 class="mt-10 font-display text-2xl">{{ t('privacy.cookiesTitle') }}</h2>
      <p class="mt-4 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('privacy.cookies') }}</p>
      <h2 class="mt-10 font-display text-2xl">{{ t('privacy.rightsTitle') }}</h2>
      <p class="mt-4 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('privacy.rights') }}</p>
    </div>
  </div>
</template>
