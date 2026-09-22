<script setup lang="ts">
/**
 * Choix d'une date par l'élève. Le calendrier occupe toute la page : sur un
 * mois entier, une grille à sept colonnes coincée dans une colonne latérale
 * devient illisible dès le téléphone.
 *
 * Les règles de date sont celles de `utils/moments.ts`, partagées avec l'API :
 * ici elles grisent les jours, le serveur restant seul juge.
 */
import type { EtatJour } from '~/components/MomentsCalendrier.vue'
import { MOMENT_DEBUT, MOMENT_FIN, raisonNonReservable } from '~/utils/moments'

definePageMeta({ middleware: 'eleve', layout: 'default' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger, aVenir, quotaAtteint } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.chooseDate')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const mois = ref('')
watchEffect(() => { if (espace.value && !mois.value) mois.value = espace.value.aujourdhui.slice(0, 7) })

/** État de chaque jour du mois affiché, pour la grille. */
const jours = computed<Record<string, { etat: EtatJour; libelle?: string }>>(() => {
  const d = espace.value
  if (!d || !mois.value) return {}
  const prises = new Map(d.prises.map(p => [p.date, p]))
  const ctx = { aujourdhui: d.aujourdhui, fermetures: d.fermetures, datesPrises: new Set(prises.keys()) }
  const out: Record<string, { etat: EtatJour; libelle?: string }> = {}
  const cursor = new Date(Number(mois.value.slice(0, 4)), Number(mois.value.slice(5, 7)) - 1, 1)
  const fin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  for (; cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const prise = prises.get(date)
    if (prise?.mienne) { out[date] = { etat: 'mienne', libelle: t('momentsEspace.legendMine') }; continue }
    const raison = raisonNonReservable(date, ctx)
    if (!raison) { out[date] = { etat: 'libre' }; continue }
    if (raison === 'prise') { out[date] = { etat: 'prise', libelle: prise?.interprete }; continue }
    if (raison === 'titulaire') { out[date] = { etat: 'titulaire', libelle: t('momentsEspace.legendTitulaire') }; continue }
    if (raison === 'fermee') { out[date] = { etat: 'fermee', libelle: t('momentsEspace.legendClosed') }; continue }
    out[date] = { etat: raison === 'dimanche' ? 'dimanche' : 'passe' }
  }
  return out
})

function jourLong(date: string) {
  const [y, m, dd] = date.split('-').map(Number)
  const s = new Date(y, m - 1, dd).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const dateChoisie = ref('')
const programme = ref('')
const envoi = ref(false)
const erreur = ref('')

function choisir(date: string) {
  if (jours.value[date]?.etat !== 'libre' || quotaAtteint.value) return
  dateChoisie.value = date; programme.value = ''; erreur.value = ''
}

async function reserver() {
  envoi.value = true; erreur.value = ''
  try {
    await $fetch('/api/moments/seances', { method: 'POST', body: { date: dateChoisie.value, programme: programme.value } })
    dateChoisie.value = ''
    await charger(true)
    showToast(t('momentsEspace.booked'), { type: 'success' })
    await navigateTo(localePath('/moments-musicaux/espace'))
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
    // La date vient peut-être d'être prise par quelqu'un d'autre : on recharge
    // pour que le calendrier affiché corresponde de nouveau à la réalité.
    await charger(true)
  } finally { envoi.value = false }
}

const legende = computed(() => [
  { etat: 'libre', label: t('momentsEspace.legendFree'), classe: 'border-white/20 bg-white/[0.04]' },
  { etat: 'mienne', label: t('momentsEspace.legendMine'), classe: 'border-gold bg-gold/25' },
  { etat: 'prise', label: t('momentsEspace.legendTaken'), classe: 'border-white/10 bg-white/[0.02]' },
  { etat: 'titulaire', label: t('momentsEspace.legendTitulaire'), classe: 'border-white/10 bg-white/[0.02]' },
  { etat: 'fermee', label: t('momentsEspace.legendClosed'), classe: 'border-transparent bg-red-500/20' }
])
</script>

<template>
  <div class="container-premium py-16 md:py-20 bg-background">
    <header class="mb-10">
      <NuxtLink :to="localePath('/moments-musicaux/espace')" class="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        {{ t('momentsEspace.backToArea') }}
      </NuxtLink>
      <h1 class="heading-section mt-5 text-text-primary">{{ t('momentsEspace.chooseDate') }}</h1>
      <p class="mt-3 max-w-2xl text-text-secondary">{{ t('momentsEspace.chooseDateHint') }}</p>
    </header>

    <div class="card-premium mx-auto max-w-3xl p-6 md:p-10">
      <MomentsCalendrier
        v-if="espace && mois"
        v-model:mois="mois"
        :jours="jours"
        :aujourdhui="espace.aujourdhui"
        @choisir="choisir"
      />
      <div class="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-5 text-xs text-text-secondary">
        <span v-for="l in legende" :key="l.etat" class="flex items-center gap-2">
          <span class="h-3 w-3 rounded border" :class="l.classe" />{{ l.label }}
        </span>
      </div>
      <p v-if="quotaAtteint" class="mt-5 rounded-2xl border border-gold/25 bg-gold/[0.12] px-5 py-4 text-sm text-text-primary">
        {{ t('momentsEspace.maxReached') }}
      </p>
      <p v-else-if="aVenir.length" class="mt-5 text-sm text-text-secondary">
        {{ t('momentsEspace.mySessions') }} : {{ aVenir.length }} / {{ espace?.maxAVenir }}
      </p>
    </div>

    <!-- Confirmation -->
    <Teleport to="body">
      <div v-if="dateChoisie" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" @click.self="dateChoisie = ''">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ t('momentsEspace.bookTitle') }} {{ jourLong(dateChoisie) }}</h2>
          <p class="mt-1 text-sm text-text-secondary">
            {{ MOMENT_DEBUT.replace(':', ' h ') }} – {{ MOMENT_FIN.replace(':', ' h ') }} · {{ t('moments.place') }}
          </p>
          <label class="label mt-6" for="prog">{{ t('momentsEspace.programme') }}</label>
          <textarea id="prog" v-model="programme" rows="3" maxlength="600" class="input resize-y" />
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>
          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-ghost" @click="dateChoisie = ''">{{ t('momentsEspace.cancel') }}</button>
            <button class="btn-primary" :disabled="envoi" @click="reserver">
              <Icon v-if="envoi" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ t('momentsEspace.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
