<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

// Mêmes destinations que sur la fiche concert et la fenêtre de détail :
// la source des URL Maps reste unique.
const { placeUrl: stMauriceUrl } = useMapsUrls(ref('saint_maurice'))
const { placeUrl: stEtienneUrl } = useMapsUrls(ref('saint_etienne'))
</script>

<template>
  <footer class="bg-surface border-t border-white/5 pt-20 pb-10">
    <div class="container-premium">
      <div class="grid gap-16 md:grid-cols-4 lg:grid-cols-5">
        <div class="md:col-span-2">
          <NuxtLink :to="localePath('/')" class="inline-block">
            <img
              src="/img/logo/horizontal-blanc-720.png"
              alt="Orgue Vivant — Concerts d'orgue à Lille"
              width="720"
              height="194"
              class="h-auto w-[300px] max-w-full md:w-[360px]"
            >
          </NuxtLink>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('footer.navigation') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink :to="localePath('/concerts')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.concerts') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/about')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.about') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/contact')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.contact') }}</NuxtLink></li>
          </ul>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            Lieux
          </div>
          <ul class="space-y-4 text-sm">
            <li>
              <a
                :href="stMauriceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-text-secondary hover:text-text-primary transition-colors"
              >{{ t('locations.saint_maurice') }}</a>
            </li>
            <li>
              <a
                :href="stEtienneUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-text-secondary hover:text-text-primary transition-colors"
              >{{ t('locations.saint_etienne') }}</a>
            </li>
          </ul>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
            {{ t('footer.legal') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink :to="localePath('/legal')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.legalMentions') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/privacy')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.privacy') }}</NuxtLink></li>
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
