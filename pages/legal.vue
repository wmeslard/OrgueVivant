<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
useHead({ title: `${t('footer.legalMentions')} — Orgue Vivant` })

const articles = computed(() => [
  { title: t('legal.editorTitle'), body: t('legal.editor') },
  { title: t('legal.publisherTitle'), body: t('legal.publisher') },
  { title: t('legal.hostingTitle'), body: t('legal.hosting') },
  { title: t('legal.ipTitle'), body: t('legal.ip') },
  { title: t('legal.dataTitle'), body: t('legal.data'), link: true },
  { title: t('legal.liabilityTitle'), body: t('legal.liability') },
  { title: t('legal.lawsTitle'), body: t('legal.laws') }
])
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{{ t('legal.eyebrow') }}</p>
      <h1 class="heading-section mt-3">{{ t('footer.legalMentions') }}</h1>
      <LegalText class="mt-8" :text="t('legal.preamble')" />

      <section v-for="(a, i) in articles" :key="a.title" class="mt-12 border-t border-ink-200/60 pt-8 dark:border-ink-800">
        <h2 class="font-display text-2xl font-light">
          <span class="mr-3 text-gold">{{ t('legal.article', { n: i + 1 }) }}</span>{{ a.title }}
        </h2>
        <LegalText class="mt-4" :text="a.body" />
        <p v-if="a.link" class="mt-3">
          <NuxtLink :to="localePath('/privacy')" class="text-gold underline underline-offset-4 hover:text-gold-light">{{ t('privacy.title') }} →</NuxtLink>
        </p>
      </section>

      <p class="mt-12 text-sm text-ink-500">{{ t('legal.updated') }}</p>
    </div>
  </div>
</template>
