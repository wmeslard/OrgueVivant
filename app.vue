<script setup lang="ts">
const siteUrl = useRuntimeConfig().public.siteUrl

// Canonique et `hreflang` produits par le module i18n : ils pointent vers la
// bonne URL selon la langue courante, ce qu'une canonique écrite à la main dans
// chaque page ne savait pas faire une fois servie depuis /en/.
const localeHead = useLocaleHead()

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Orgue Vivant',
      url: siteUrl,
      logo: `${siteUrl}/img/logo/apple-touch-icon.png`,
      description: 'Concerts d\'orgues dans le centre-ville de Lille — Saint-Maurice & Saint-Étienne.',
      address: { '@type': 'PostalAddress', addressLocality: 'Lille', addressCountry: 'FR' },
      sameAs: []
    })
  }]
}))
</script>

<template>
  <div>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-xl"
    >
      Aller au contenu principal
    </a>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
