<script setup lang="ts">
const { t } = useI18n()
useHead({ title: `${t('footer.legalMentions')} — Orgue Vivant` })

// Les blocs contiennent des retours à la ligne signifiants (adresses, listes de
// textes de loi) : ils sont rendus avec `whitespace-pre-line`.
const sections = computed(() => [
  { title: t('legal.editorTitle'), body: t('legal.editor') },
  { title: t('legal.publisherTitle'), body: t('legal.publisher') },
  { title: t('legal.hostingTitle'), body: t('legal.hosting') },
  { title: t('legal.ipTitle'), body: t('legal.ip') },
  { title: t('legal.lawsTitle'), body: t('legal.laws') }
])
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <h1 class="heading-section">{{ t('footer.legalMentions') }}</h1>

      <section v-for="s in sections" :key="s.title" class="mt-12 first:mt-10">
        <h2 class="font-display text-2xl font-light">{{ s.title }}</h2>
        <p class="mt-4 whitespace-pre-line leading-relaxed text-ink-700 dark:text-ink-300">
          {{ s.body }}
        </p>
      </section>
    </div>
  </div>
</template>
