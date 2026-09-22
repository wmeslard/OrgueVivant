<script setup lang="ts">
/**
 * Inscription d'un élève par son professeur : le calendrier des créneaux et la
 * fiche de l'élève viennent de <MomentsCreneaux>, partagé avec l'administration.
 */
import type { FicheEleve } from '~/components/MomentsCreneaux.vue'

definePageMeta({ middleware: 'professeur', layout: 'default' })

const { t } = useI18n()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.addStudent')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

/** Contexte commun à tous les calculs de créneaux. */
const contexte = computed(() => ({
  aujourdhui: espace.value?.aujourdhui ?? '',
  horaires: espace.value?.horaires ?? [],
  pris: espace.value?.pris ?? []
}))

const envoyer = (fiche: FicheEleve) => $fetch('/api/moments/seances', { method: 'POST', body: fiche })

async function inscrit() {
  await charger(true)
  showToast(t('momentsEspace.booked'), { type: 'success' })
  await navigateTo(localePath('/moments-musicaux/espace'))
}
</script>

<template>
  <div class="container-premium py-16 md:py-20 bg-background">
    <header class="mb-10">
      <NuxtLink :to="localePath('/moments-musicaux/espace')" class="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        {{ t('momentsEspace.dashboardTitle') }}
      </NuxtLink>
      <h1 class="heading-section mt-5 text-text-primary">{{ t('momentsEspace.addStudent') }}</h1>
      <p class="mt-3 max-w-2xl text-text-secondary">{{ t('momentsEspace.chooseDateHint') }}</p>
    </header>

    <MomentsCreneaux v-if="espace" :contexte="contexte" :envoyer="envoyer" @inscrit="inscrit" @echec="charger(true)" />
  </div>
</template>
