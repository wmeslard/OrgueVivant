<script setup lang="ts">
const { t } = useI18n()
useHead({ title: `${t('privacy.title')} — Orgue Vivant` })
useSeoMeta({ description: t('privacy.seoDesc'), ogDescription: t('privacy.seoDesc') })

const articles = computed(() => [
  { title: t('privacy.controllerTitle'), body: t('privacy.controller') },
  { title: t('privacy.purposesTitle'), body: t('privacy.purposes') },
  { title: t('privacy.processorsTitle'), body: t('privacy.processors') },
  { title: t('privacy.transfersTitle'), body: t('privacy.transfers') },
  { title: t('privacy.retentionTitle'), body: t('privacy.retention') },
  { title: t('privacy.cookiesTitle'), body: t('privacy.cookies') },
  { title: t('privacy.securityTitle'), body: t('privacy.security') },
  { title: t('privacy.rightsTitle'), body: t('privacy.rights') },
  { title: t('privacy.changesTitle'), body: t('privacy.changes') }
])
</script>

<template>
  <div class="container-apple py-20 md:py-28">
    <div class="mx-auto max-w-2xl">
      <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{{ t('legal.eyebrow') }}</p>
      <h1 class="heading-section mt-3">{{ t('privacy.title') }}</h1>
      <LegalText class="mt-8" :text="t('privacy.intro')" />

      <section v-for="(a, i) in articles" :key="a.title" class="mt-12 border-t border-white/10 pt-8">
        <h2 class="font-display text-2xl font-light">
          <span class="mr-3 text-gold">{{ t('legal.article', { n: i + 1 }) }}</span>{{ a.title }}
        </h2>
        <LegalText class="mt-4" :text="a.body" />
      </section>

      <p class="mt-12 text-sm text-text-secondary/70">{{ t('privacy.updated') }}</p>
    </div>
  </div>
</template>
