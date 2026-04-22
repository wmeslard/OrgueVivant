<script setup lang="ts">
const { t } = useI18n()
useHead({
  title: `${t('nav.about')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.aboutDesc') }]
})
</script>

<template>
  <div class="container-premium py-32 md:py-48 bg-background">
    <div class="max-w-4xl animate-fade-up">
      <div class="inline-flex items-center gap-3 mb-6">
        <span class="h-[1px] w-8 bg-gold"></span>
        <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">
          {{ t('about.eyebrow') }}
        </span>
      </div>
      <h1 class="heading-section text-text-primary">{{ t('about.title') }}</h1>
      <p class="mt-8 text-2xl leading-relaxed text-text-secondary font-light">{{ t('about.intro') }}</p>
    </div>

    <div class="mt-32 grid gap-16 md:grid-cols-2">
      <a
        href="https://inventaire-des-orgues.fr/detail/orgue-lille-eglise-saint-maurice-fr-59350-lille-stmaur1-t/"
        target="_blank"
        rel="noopener noreferrer"
        class="card-premium group block hover:border-gold/30 transition-colors"
      >
        <div class="aspect-[16/9] overflow-hidden">
          <img src="/img/orgue-st-maurice.jpg" alt="Saint-Maurice" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
        </div>
        <div class="p-10">
          <div class="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 font-bold">{{ t('about.church') }}</div>
          <h2 class="font-display text-4xl font-light text-text-primary mb-6">Saint-Maurice</h2>
          <p class="leading-relaxed text-text-secondary font-light">{{ t('about.stMaurice') }}</p>
          <div class="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold">
            <span>Inventaire des orgues</span>
            <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
          </div>
        </div>
      </a>
      <a
        href="https://inventaire-des-orgues.fr/detail/orgue-lille-eglise-saint-etienne-fr-59350-lille-stetie1-x/"
        target="_blank"
        rel="noopener noreferrer"
        class="card-premium group block hover:border-gold/30 transition-colors"
      >
        <div class="aspect-[16/9] overflow-hidden">
          <img src="/img/orgue-st-etienne.jpg" alt="Saint-Étienne" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
        </div>
        <div class="p-10">
          <div class="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 font-bold">{{ t('about.church') }}</div>
          <h2 class="font-display text-4xl font-light text-text-primary mb-6">Saint-Étienne</h2>
          <p class="leading-relaxed text-text-secondary font-light">{{ t('about.stEtienne') }}</p>
          <div class="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold">
            <span>Inventaire des orgues</span>
            <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
          </div>
        </div>
      </a>
    </div>

    <div class="mt-32 py-20 border-t border-white/5">
      <div class="max-w-3xl">
        <h2 class="heading-section text-text-primary mb-8">{{ t('about.missionTitle') }}</h2>
        <p class="text-xl leading-relaxed text-text-secondary font-light">{{ t('about.mission') }}</p>
      </div>
    </div>
  </div>
</template>
