<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-surface border-t border-white/5 pt-20 pb-10">
    <div class="container-premium">
      <div class="grid gap-16 md:grid-cols-4 lg:grid-cols-5">
        <div class="md:col-span-2">
          <NuxtLink to="/" class="font-display text-3xl tracking-tight text-text-primary">
            Orgue<span class="text-gold">·</span>Vivant
          </NuxtLink>
          <p class="mt-6 max-w-sm text-text-secondary font-light leading-relaxed">
            {{ t('footer.tagline') }}
          </p>
          <div class="mt-10">
            <a
              href="/api/calendar.ics"
              class="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary hover:text-gold transition-colors font-medium"
              download
            >
              <Icon name="heroicons:calendar" class="w-4 h-4" />
              S'abonner au calendrier
            </a>
          </div>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('footer.navigation') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink to="/concerts" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.concerts') }}</NuxtLink></li>
            <li><NuxtLink to="/about" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.about') }}</NuxtLink></li>
            <li><NuxtLink to="/contact" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.contact') }}</NuxtLink></li>
          </ul>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            Lieux
          </div>
          <ul class="space-y-4 text-sm text-text-secondary">
            <li>{{ t('locations.saint_maurice') }}</li>
            <li>{{ t('locations.saint_etienne') }}</li>
          </ul>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('footer.legal') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink to="/legal" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.legalMentions') }}</NuxtLink></li>
            <li><NuxtLink to="/privacy" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.privacy') }}</NuxtLink></li>
            <li><NuxtLink to="/admin" class="text-text-secondary/50 hover:text-text-primary transition-colors text-xs">{{ t('footer.admin') }}</NuxtLink></li>
          </ul>
        </div>
      </div>

      <div class="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-[10px] uppercase tracking-widest text-text-secondary/60">
          © {{ year }} Orgue Vivant — {{ t('footer.rights') }}
        </div>
        <div class="text-[10px] uppercase tracking-widest text-text-secondary/40">
          Design by William Meslard
        </div>
      </div>
    </div>
  </footer>
</template>
