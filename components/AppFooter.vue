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
      <!-- Sur mobile, les trois listes tiennent côte à côte sous le logo :
           empilées, elles laissaient la largeur inutilisée. -->
      <div class="flex flex-col gap-12 md:grid md:grid-cols-4 md:gap-16 lg:grid-cols-5">
        <div class="md:col-span-2">
          <NuxtLink :to="localePath('/')" class="inline-block">
            <img
              src="/img/logo/horizontal-blanc-720.png"
              alt="Orgue Vivant — Concerts d'orgue à Lille"
              width="720"
              height="201"
              class="h-auto w-[300px] max-w-full md:w-[360px]"
            >
          </NuxtLink>
          <SocialLinks class="mt-8" />
        </div>

        <div class="grid grid-cols-3 gap-4 md:contents">
        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.15em] text-gold md:tracking-[0.3em]">
            {{ t('footer.navigation') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink :to="localePath('/concerts')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.concerts') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/moments-musicaux')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.moments') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/about')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.about') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/contact')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('nav.contact') }}</NuxtLink></li>
          </ul>
        </div>

        <div>
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.15em] text-gold md:tracking-[0.3em]">
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
          <div class="mb-6 text-[10px] font-bold uppercase tracking-[0.15em] text-gold md:tracking-[0.3em]">
            {{ t('footer.legal') }}
          </div>
          <ul class="space-y-4 text-sm">
            <li><NuxtLink :to="localePath('/legal')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.legalMentions') }}</NuxtLink></li>
            <li><NuxtLink :to="localePath('/privacy')" class="text-text-secondary hover:text-text-primary transition-colors">{{ t('footer.privacy') }}</NuxtLink></li>
            <li><NuxtLink to="/admin" class="text-text-secondary/75 hover:text-text-primary transition-colors text-xs">{{ t('footer.admin') }}</NuxtLink></li>
          </ul>
        </div>
        </div>
      </div>

      <div class="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-[10px] uppercase tracking-widest text-text-secondary/75">
          © {{ year }} Orgue Vivant — {{ t('footer.rights') }}
        </div>
        <a
          href="https://www.linkedin.com/in/william-meslard-81377a14b"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[10px] uppercase tracking-widest text-text-secondary/75 transition-colors hover:text-text-secondary"
        >
          Design by William Meslard
        </a>
      </div>
    </div>
  </footer>
</template>
