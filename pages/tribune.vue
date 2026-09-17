<script setup lang="ts">
/**
 * La tribune : page cachée de l'œuf de Pâques B-A-C-H (voir useBach).
 * Ni indexée ni dans le sitemap ; on y arrive par le lien révélé.
 */
const { t } = useI18n()
const localePath = useLocalePath()
useHead({ title: `${t('tribune.title')} — Orgue Vivant` })
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="container-premium flex min-h-[70vh] items-center justify-center pb-16 pt-28 md:pt-40">
    <div class="max-w-xl text-center">
      <p class="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-gold">{{ t('tribune.eyebrow') }}</p>
      <h1 class="font-display text-4xl font-light leading-[1.1] tracking-tight text-text-primary md:text-6xl">
        {{ t('tribune.title') }}
      </h1>
      <p class="mx-auto mt-6 max-w-md text-base font-light leading-relaxed text-text-secondary md:text-lg">
        {{ t('tribune.text') }}
      </p>
      <p class="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-text-secondary md:text-lg">
        {{ t('tribune.claim') }}
      </p>
      <p class="mt-8 font-display text-3xl text-gold">{{ t('tribune.word') }}</p>
      <NuxtLink :to="localePath('/')" class="btn-premium-secondary mx-auto mt-10 w-full sm:w-auto md:!w-auto">{{ t('tribune.home') }}</NuxtLink>
    </div>
  </div>
</template>
