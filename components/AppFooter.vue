<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink-100 bg-ink-50/50 py-16 dark:border-ink-800 dark:bg-ink-950">
    <div class="container-apple grid gap-12 md:grid-cols-4">
      <div class="md:col-span-2">
        <div class="font-display text-2xl tracking-tight">
          Orgue<span class="text-accent">·</span>Vivant
        </div>
        <p class="mt-3 max-w-sm text-sm text-ink-600 dark:text-ink-400">
          {{ t('footer.tagline') }}
        </p>
        <NewsletterSignup class="mt-6" />
      </div>

      <div>
        <div class="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
          {{ t('footer.navigation') }}
        </div>
        <ul class="space-y-2 text-sm">
          <li><NuxtLink to="/concerts">{{ t('nav.concerts') }}</NuxtLink></li>
          <li><NuxtLink to="/about">{{ t('nav.about') }}</NuxtLink></li>
          <li><NuxtLink to="/contact">{{ t('nav.contact') }}</NuxtLink></li>
        </ul>
      </div>

      <div>
        <div class="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">
          {{ t('footer.legal') }}
        </div>
        <ul class="space-y-2 text-sm">
          <li><NuxtLink to="/legal">{{ t('footer.legalMentions') }}</NuxtLink></li>
          <li><NuxtLink to="/privacy">{{ t('footer.privacy') }}</NuxtLink></li>
          <li><NuxtLink to="/admin">{{ t('footer.admin') }}</NuxtLink></li>
        </ul>
      </div>
    </div>
    <div class="container-apple mt-12 border-t border-ink-100 pt-6 text-xs text-ink-500 dark:border-ink-800">
      © {{ year }} Orgue Vivant — {{ t('footer.rights') }}
    </div>
  </footer>
</template>
