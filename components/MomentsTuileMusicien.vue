<script setup lang="ts">
/**
 * Un musicien d'une inscription : prénom, nom et instrument (champ libre).
 * `fixe` : c'est la personne entrée par le lien, son nom vient de sa fiche et
 * ne se modifie que depuis « Mes informations » ; seul l'instrument se saisit.
 *
 * Les champs modifient le musicien sur place : deux saisies coup sur coup
 * (un collage, un remplissage automatique) ne s'écrasent pas.
 */
import type { Musicien } from '~/utils/moments'

defineProps<{
  titre: string
  /** Préfixe des identifiants, pour relier les libellés aux champs. */
  ident: string
  fixe?: { prenom: string; nom: string }
  retirable?: boolean
}>()
const emit = defineEmits<{ (e: 'retirer'): void; (e: 'profil'): void }>()
const musicien = defineModel<Musicien>({ required: true })

const { t } = useI18n()

function maj(champ: keyof Musicien, valeur: string) {
  musicien.value[champ] = valeur
}
const VALEUR = 'truncate rounded-xl border border-transparent bg-white/5 px-4 py-3 text-base text-text-primary'
</script>

<template>
  <div class="rounded-2xl border border-white/15 px-4 pb-4 pt-3">
    <div class="flex min-h-6 items-center justify-between gap-3">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">{{ titre }}</span>
      <button v-if="fixe" type="button" class="text-xs text-gold underline-offset-4 hover:underline" @click="emit('profil')">
        {{ t('momentsEspace.editProfile') }}
      </button>
      <button
        v-else-if="retirable"
        type="button"
        class="-mr-1 p-1 text-text-secondary transition-colors hover:text-text-primary"
        :aria-label="t('momentsEspace.removeMusician')"
        @click="emit('retirer')"
      >
        <Icon name="heroicons:x-mark" class="h-4 w-4" />
      </button>
    </div>
    <div class="mt-2 grid grid-cols-2 gap-2.5">
      <div class="min-w-0">
        <label class="label" :for="`${ident}-p`">{{ t('momentsAcces.firstName') }}</label>
        <div v-if="fixe" :class="VALEUR">{{ fixe.prenom }}</div>
        <input
          v-else
          :id="`${ident}-p`"
          :value="musicien.prenom"
          maxlength="80"
          class="input text-base"
          autocapitalize="words"
          autocomplete="off"
          @input="maj('prenom', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div class="min-w-0">
        <label class="label" :for="`${ident}-n`">{{ t('momentsAcces.lastName') }}</label>
        <div v-if="fixe" :class="VALEUR">{{ fixe.nom }}</div>
        <input
          v-else
          :id="`${ident}-n`"
          :value="musicien.nom"
          maxlength="80"
          class="input text-base"
          autocapitalize="words"
          autocomplete="off"
          @input="maj('nom', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
    <label class="label mt-3" :for="`${ident}-i`">{{ t('momentsEspace.instrument') }}</label>
    <input
      :id="`${ident}-i`"
      :value="musicien.instrument"
      maxlength="60"
      class="input text-base"
      :placeholder="t('momentsEspace.instrumentPlaceholder')"
      autocomplete="off"
      @input="maj('instrument', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>
