<script setup lang="ts">
const { t } = useI18n()
useHead({ title: `${t('footer.privacy')} — Orgue Vivant` })

// Les blocs contiennent des retours à la ligne signifiants (listes, alinéas) :
// ils sont rendus avec `whitespace-pre-line`, comme les mentions légales.
const sections = computed(() => [
  { title: t('privacy.purposesTitle'), body: t('privacy.purposes') },
  { title: t('privacy.processorsTitle'), body: t('privacy.processors') },
  { title: t('privacy.transfersTitle'), body: t('privacy.transfers') },
  { title: t('privacy.retentionTitle'), body: t('privacy.retention') },
  { title: t('privacy.cookiesTitle'), body: t('privacy.cookies') },
  { title: t('privacy.rightsTitle'), body: t('privacy.rights') }
])
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <h1 class="heading-section">{{ t('footer.privacy') }}</h1>
      <p class="mt-6 whitespace-pre-line leading-relaxed text-ink-700 dark:text-ink-300">{{ t('privacy.intro') }}</p>

      <section v-for="s in sections" :key="s.title" class="mt-12">
        <h2 class="font-display text-2xl font-light">{{ s.title }}</h2>
        <p class="mt-4 whitespace-pre-line leading-relaxed text-ink-700 dark:text-ink-300">{{ s.body }}</p>
      </section>

      <p class="mt-12 text-sm text-ink-500">{{ t('privacy.updated') }}</p>
    </div>
  </div>
</template>
