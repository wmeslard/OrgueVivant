<script setup lang="ts">
// Barre d'onglets partagée : elle était recopiée dans chaque page d'admin, ce
// qui obligeait à modifier trois fichiers pour ajouter une rubrique.
const { t } = useI18n()

const tabs = [
  { to: '/admin/concerts', label: 'admin.concerts' },
  { to: '/admin/news', label: 'admin.news' },
  { to: '/admin/newsletter', label: 'admin.newsletter' }
]
</script>

<template>
  <nav class="mb-8 flex gap-6 border-b border-ink-200 dark:border-ink-800">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="pb-3 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 dark:hover:text-ink-100"
      active-class="border-b-2 border-gold text-ink-900 dark:text-ink-100"
    >
      {{ t(tab.label) }}
    </NuxtLink>
  </nav>
</template>
