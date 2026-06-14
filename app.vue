<script setup lang="ts">
const siteUrl = useRuntimeConfig().public.siteUrl

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Orgue Vivant',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description: 'Concerts d\'orgues dans le centre-ville de Lille — Saint-Maurice & Saint-Étienne.',
      address: { '@type': 'PostalAddress', addressLocality: 'Lille', addressCountry: 'FR' },
      sameAs: []
    })
  }]
})
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
