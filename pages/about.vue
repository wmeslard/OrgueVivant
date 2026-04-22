<script setup lang="ts">
const { t } = useI18n()
useHead({
  title: `${t('nav.about')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.aboutDesc') }]
})
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="max-w-3xl">
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('about.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ t('about.title') }}</h1>
      <p class="mt-6 text-lg leading-relaxed text-ink-700 dark:text-ink-300">{{ t('about.intro') }}</p>
    </div>

    <div class="mt-16 grid gap-10 md:grid-cols-2">
      <div class="card">
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('about.church') }}</div>
        <h2 class="mt-2 font-display text-3xl font-light">Saint-Maurice</h2>
        <p class="mt-4 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('about.stMaurice') }}</p>
      </div>
      <div class="card">
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('about.church') }}</div>
        <h2 class="mt-2 font-display text-3xl font-light">Saint-Étienne</h2>
        <p class="mt-4 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('about.stEtienne') }}</p>
      </div>
    </div>

    <div class="mt-16 max-w-3xl">
      <h2 class="heading-section">{{ t('about.missionTitle') }}</h2>
      <p class="mt-6 leading-relaxed text-ink-700 dark:text-ink-300">{{ t('about.mission') }}</p>
    </div>
  </div>
</template>
