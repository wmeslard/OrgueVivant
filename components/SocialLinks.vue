<script setup lang="ts">
/**
 * Liens vers les réseaux sociaux. Icônes au trait, dessinées ici même : la
 * collection Heroicons du site n'a pas de logos de marques, et charger une
 * collection entière pour deux pictogrammes serait disproportionné.
 */
import { socialLinks } from '~/utils/social'

defineProps<{ labels?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <ul class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <li v-for="s in socialLinks" :key="s.id">
      <a
        :href="s.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('social.on', { name: s.name })"
        :title="t('social.on', { name: s.name })"
        class="inline-flex items-center gap-2.5 text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
          stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 shrink-0" aria-hidden="true"
        >
          <path v-if="s.id === 'facebook'" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          <template v-else-if="s.id === 'instagram'">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </template>
        </svg>
        <span v-if="labels" class="text-sm">{{ s.name }}</span>
      </a>
    </li>
  </ul>
</template>
