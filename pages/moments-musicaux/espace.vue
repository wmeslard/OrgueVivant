<script setup lang="ts">
/**
 * Espace des élèves organistes : le calendrier des jours disponibles, la
 * réservation d'une date et la gestion de ses propres séances.
 *
 * Les règles de date sont celles de `utils/moments.ts`, partagées avec l'API :
 * ici elles servent à griser le calendrier, le serveur restant seul juge.
 */
import type { EtatJour } from '~/components/MomentsCalendrier.vue'
import {
  annulable, MOMENT_DEBUT, MOMENT_FIN, raisonNonReservable, type Fermeture
} from '~/utils/moments'

definePageMeta({ middleware: 'eleve', layout: 'default' })

const { t, locale } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const { show: showToast } = useToast()

interface Seance { id: string; date: string; programme: string | null; statut: 'reservee' | 'annulee' }
interface Espace {
  aujourdhui: string
  horizon: string
  maxAVenir: number
  eleve: { prenom: string; nom: string; email: string }
  fermetures: Fermeture[]
  prises: { date: string; interprete: string; mienne: boolean }[]
  mesSeances: Seance[]
}

const { data, refresh } = await useFetch<Espace>('/api/moments/espace')

useHead({
  title: `${t('momentsEspace.title')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const mois = ref('')
watchEffect(() => { if (data.value && !mois.value) mois.value = data.value.aujourdhui.slice(0, 7) })

const aVenir = computed(() =>
  (data.value?.mesSeances ?? []).filter(s => s.statut === 'reservee' && s.date >= (data.value?.aujourdhui ?? '')).sort((a, b) => a.date.localeCompare(b.date))
)
const passees = computed(() =>
  (data.value?.mesSeances ?? []).filter(s => s.statut === 'reservee' && s.date < (data.value?.aujourdhui ?? '')).sort((a, b) => b.date.localeCompare(a.date))
)
const quotaAtteint = computed(() => !!data.value && aVenir.value.length >= data.value.maxAVenir)

/** État de chaque jour du mois affiché, pour la grille. */
const jours = computed<Record<string, { etat: EtatJour; libelle?: string }>>(() => {
  const d = data.value
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

// ── Réservation ───────────────────────────────────────────────────────────────
const dateChoisie = ref('')
const programme = ref('')
const envoi = ref(false)
const erreur = ref('')

function choisir(date: string) {
  const etat = jours.value[date]?.etat
  if (etat === 'mienne') {
    const mienne = aVenir.value.find(s => s.date === date)
    if (mienne) { ouvrirEdition(mienne); return }
  }
  if (etat !== 'libre' || quotaAtteint.value) return
  dateChoisie.value = date; programme.value = ''; erreur.value = ''
}

async function reserver() {
  envoi.value = true; erreur.value = ''
  try {
    await $fetch('/api/moments/seances', { method: 'POST', body: { date: dateChoisie.value, programme: programme.value } })
    dateChoisie.value = ''
    await refresh()
    showToast(t('momentsEspace.booked'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
  } finally { envoi.value = false }
}

// ── Modification et annulation ────────────────────────────────────────────────
const edition = ref<Seance | null>(null)
function ouvrirEdition(s: Seance) { edition.value = { ...s }; erreur.value = '' }

async function enregistrer() {
  if (!edition.value) return
  envoi.value = true; erreur.value = ''
  try {
    await $fetch(`/api/moments/seances/${edition.value.id}`, { method: 'PATCH', body: { programme: edition.value.programme ?? '' } })
    edition.value = null
    await refresh()
    showToast(t('momentsEspace.saved'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
  } finally { envoi.value = false }
}

async function annuler(s: Seance) {
  if (!confirm(t('momentsEspace.confirmCancel'))) return
  envoi.value = true; erreur.value = ''
  try {
    await $fetch(`/api/moments/seances/${s.id}`, { method: 'DELETE' })
    edition.value = null
    await refresh()
    showToast(t('momentsEspace.cancelled'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
    showToast(erreur.value, { type: 'error' })
  } finally { envoi.value = false }
}

async function logout() {
  await supabase.auth.signOut()
  await navigateTo(localePath('/moments-musicaux/connexion'))
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
    <header class="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="heading-section mt-3 text-text-primary">{{ t('momentsEspace.title') }}</h1>
        <p v-if="data" class="mt-2 text-sm text-text-secondary">
          {{ data.eleve.prenom }} {{ data.eleve.nom }} · {{ t('moments.place') }} · {{ MOMENT_DEBUT.replace(':', ' h ') }}–{{ MOMENT_FIN.replace(':', ' h ') }}
        </p>
      </div>
      <button class="btn-premium-secondary md:w-auto" @click="logout">{{ t('momentsEspace.logout') }}</button>
    </header>

    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <!-- Calendrier -->
      <div class="card-premium p-6 md:p-8">
        <MomentsCalendrier
          v-if="data && mois"
          v-model:mois="mois"
          :jours="jours"
          :aujourdhui="data.aujourdhui"
          @choisir="choisir"
        />
        <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-5 text-xs text-text-secondary">
          <span v-for="l in legende" :key="l.etat" class="flex items-center gap-2">
            <span class="h-3 w-3 rounded border" :class="l.classe" />{{ l.label }}
          </span>
        </div>
        <p v-if="quotaAtteint" class="mt-4 text-sm text-gold">{{ t('momentsEspace.maxReached') }}</p>
      </div>

      <!-- Mes séances -->
      <aside class="card-premium p-6 md:p-8">
        <h2 class="mb-5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.mySessions') }}</h2>
        <ul v-if="aVenir.length" class="space-y-4">
          <li v-for="s in aVenir" :key="s.id" class="rounded-2xl border border-white/10 p-4">
            <div class="text-sm font-medium text-text-primary">{{ jourLong(s.date) }}</div>
            <div class="mt-0.5 text-xs text-text-secondary">{{ MOMENT_DEBUT.replace(':', ' h ') }} – {{ MOMENT_FIN.replace(':', ' h ') }}</div>
            <p v-if="s.programme" class="mt-2 text-sm font-light text-text-secondary">{{ s.programme }}</p>
            <div class="mt-3 flex gap-3 text-xs">
              <button class="text-gold underline-offset-4 hover:underline" @click="ouvrirEdition(s)">{{ t('momentsEspace.programme') }}</button>
              <button v-if="annulable(s.date)" class="text-text-secondary underline-offset-4 hover:underline" @click="annuler(s)">
                {{ t('momentsEspace.cancelSession') }}
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-text-secondary">{{ t('momentsEspace.noSessions') }}</p>
        <p class="mt-5 border-t border-white/5 pt-4 text-xs text-text-secondary">{{ t('momentsEspace.cancelDeadline') }}</p>

        <template v-if="passees.length">
          <h3 class="mb-3 mt-7 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('concerts.past') }}</h3>
          <ul class="space-y-1.5 text-sm text-text-secondary">
            <li v-for="s in passees.slice(0, 8)" :key="s.id">{{ jourLong(s.date) }}</li>
          </ul>
        </template>
      </aside>
    </div>

    <!-- Réservation -->
    <Teleport to="body">
      <div v-if="dateChoisie" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" @click.self="dateChoisie = ''">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ t('momentsEspace.bookTitle') }} {{ jourLong(dateChoisie) }}</h2>
          <p class="mt-1 text-sm text-text-secondary">{{ MOMENT_DEBUT.replace(':', ' h ') }} – {{ MOMENT_FIN.replace(':', ' h ') }} · {{ t('moments.place') }}</p>
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

      <!-- Programme d'une séance existante -->
      <div v-if="edition" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" @click.self="edition = null">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(edition.date) }}</h2>
          <label class="label mt-6" for="prog2">{{ t('momentsEspace.programme') }}</label>
          <textarea id="prog2" v-model="edition.programme" rows="3" maxlength="600" class="input resize-y" />
          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-ghost" @click="edition = null">{{ t('momentsEspace.cancel') }}</button>
            <button class="btn-primary" :disabled="envoi" @click="enregistrer">
              <Icon v-if="envoi" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ t('momentsEspace.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
