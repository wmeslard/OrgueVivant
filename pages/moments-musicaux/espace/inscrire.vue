<script setup lang="ts">
/**
 * Inscription d'un élève : le professeur choisit un jour dans le calendrier,
 * puis un créneau libre dans la liste du jour, et remplit le nom de l'élève.
 *
 * Les règles viennent de `utils/moments.ts`, partagées avec l'API : ici elles
 * grisent les jours et composent la liste des créneaux, le serveur restant
 * seul juge au moment de l'enregistrement.
 */
import type { EtatJour } from '~/components/MomentsCalendrier.vue'
import { creneauxDuJour, heureFr, nomPublic, ymd } from '~/utils/moments'

definePageMeta({ middleware: 'professeur', layout: 'default' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.addStudent')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const mois = ref('')
const jourChoisi = ref('')
watchEffect(() => { if (espace.value && !mois.value) mois.value = espace.value.aujourdhui.slice(0, 7) })

/** Contexte commun à tous les calculs de créneaux. */
const ctx = computed(() => ({
  aujourdhui: espace.value?.aujourdhui ?? '',
  horaires: espace.value?.horaires ?? [],
  fermetures: espace.value?.fermetures ?? [],
  pris: espace.value?.pris ?? []
}))

/** Résumé de chaque jour du mois affiché, pour la grille. */
const jours = computed<Record<string, EtatJour>>(() => {
  if (!espace.value || !mois.value) return {}
  const out: Record<string, EtatJour> = {}
  const cursor = new Date(Number(mois.value.slice(0, 4)), Number(mois.value.slice(5, 7)) - 1, 1)
  const fin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  for (; cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
    const date = ymd(cursor)
    const creneaux = creneauxDuJour(date, ctx.value)
    const libres = creneaux.filter(c => c.etat === 'libre').length
    const pris = creneaux.filter(c => c.etat === 'pris' || c.etat === 'regulier').length
    out[date] = { libres, pris, mien: creneaux.some(c => c.mien), indisponible: !creneaux.length }
  }
  return out
})

const creneaux = computed(() => jourChoisi.value ? creneauxDuJour(jourChoisi.value, ctx.value) : [])

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Inscription ──────────────────────────────────────────────────────────────
const creneauChoisi = ref('')
const form = reactive({ eleve_prenom: '', eleve_nom: '', eleve_email: '', programme: '', consentement: false })
const envoi = ref(false)
const erreur = ref('')

const apercuNom = computed(() =>
  form.eleve_prenom ? nomPublic(form.eleve_prenom, form.eleve_nom) : '—')

function ouvrir(debut: string) {
  creneauChoisi.value = debut
  erreur.value = ''
  Object.assign(form, { eleve_prenom: '', eleve_nom: '', eleve_email: '', programme: '', consentement: false })
}

async function inscrire() {
  erreur.value = ''
  if (!form.eleve_prenom.trim() || !form.eleve_nom.trim()) { erreur.value = t('momentsAcces.errorRequired'); return }
  if (form.eleve_email && !/^\S+@\S+\.\S+$/.test(form.eleve_email)) { erreur.value = t('momentsAcces.errorEmail'); return }
  if (!form.consentement) { erreur.value = t('momentsEspace.errorConsent'); return }
  envoi.value = true
  try {
    await $fetch('/api/moments/seances', {
      method: 'POST',
      body: { date: jourChoisi.value, heure_debut: creneauChoisi.value, ...form }
    })
    creneauChoisi.value = ''
    await charger(true)
    showToast(t('momentsEspace.booked'), { type: 'success' })
    await navigateTo(localePath('/moments-musicaux/espace'))
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
    // Le créneau vient peut-être d'être pris : on recharge pour que la liste
    // affichée corresponde de nouveau à la réalité.
    await charger(true)
  } finally { envoi.value = false }
}

const legende = computed(() => [
  { label: t('momentsEspace.legendFree'), classe: 'border-white/20 bg-white/[0.04]' },
  { label: t('momentsEspace.legendMine'), classe: 'border-gold bg-gold/25' },
  { label: t('momentsEspace.legendTaken'), classe: 'border-white/10 bg-white/[0.02]' },
  { label: t('momentsEspace.legendClosed'), classe: 'border-transparent bg-transparent' }
])
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

    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <!-- Calendrier -->
      <div class="card-premium p-6 md:p-8">
        <MomentsCalendrier
          v-if="espace && mois"
          v-model:mois="mois"
          :jours="jours"
          :aujourdhui="espace.aujourdhui"
          :selection="jourChoisi"
          @choisir="jourChoisi = $event"
        />
        <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-5 text-xs text-text-secondary">
          <span v-for="l in legende" :key="l.label" class="flex items-center gap-2">
            <span class="h-3 w-3 rounded border" :class="l.classe" />{{ l.label }}
          </span>
        </div>
      </div>

      <!-- Créneaux du jour choisi -->
      <aside class="card-premium p-6 md:p-8">
        <p v-if="!jourChoisi" class="text-sm text-text-secondary">{{ t('momentsEspace.pickDay') }}</p>
        <template v-else>
          <h2 class="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.slotsFor') }}</h2>
          <div class="mb-5 font-display text-xl font-light text-text-primary">{{ jourLong(jourChoisi) }}</div>
          <p v-if="!creneaux.length" class="text-sm text-text-secondary">{{ t('momentsEspace.noSlots') }}</p>
          <ul v-else class="space-y-2">
            <li v-for="c in creneaux" :key="c.debut">
              <button
                v-if="c.etat === 'libre'"
                class="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition hover:border-gold hover:bg-gold/10"
                @click="ouvrir(c.debut)"
              >
                <span class="text-text-primary">{{ heureFr(c.debut) }} – {{ heureFr(c.fin) }}</span>
                <Icon name="heroicons:plus" class="h-4 w-4 text-gold" />
              </button>
              <div
                v-else
                class="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
                :class="c.mien ? 'border-gold/40 bg-gold/10' : 'border-white/5 bg-white/[0.02]'"
              >
                <span class="text-text-secondary">{{ heureFr(c.debut) }}</span>
                <span :class="c.mien ? 'text-gold' : 'text-text-secondary'">{{ c.interprete }}</span>
              </div>
            </li>
          </ul>
        </template>
      </aside>
    </div>

    <!-- Fiche de l'élève -->
    <Teleport to="body">
      <div v-if="creneauChoisi" class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10" @click.self="creneauChoisi = ''">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(jourChoisi) }}</h2>
          <p class="mt-1 text-sm text-text-secondary">
            {{ heureFr(creneauChoisi) }} · {{ t('moments.place') }}
          </p>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="ep">{{ t('momentsEspace.studentFirstName') }}</label>
              <input id="ep" v-model="form.eleve_prenom" required maxlength="80" class="input">
            </div>
            <div>
              <label class="label" for="en">{{ t('momentsEspace.studentLastName') }}</label>
              <input id="en" v-model="form.eleve_nom" required maxlength="80" class="input">
            </div>
          </div>
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.studentNameHint', { nom: apercuNom }) }}</p>

          <label class="label mt-5" for="ee">
            {{ t('momentsEspace.studentEmail') }}
            <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
          </label>
          <input id="ee" v-model="form.eleve_email" type="email" maxlength="254" class="input">
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.studentEmailHint') }}</p>

          <label class="label mt-5" for="prog">
            {{ t('momentsEspace.programme') }}
            <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
          </label>
          <textarea id="prog" v-model="form.programme" rows="3" maxlength="600" class="input resize-y" />
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>

          <label class="mt-5 flex items-start gap-3 text-sm text-text-secondary">
            <input v-model="form.consentement" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-gold">
            <span>{{ t('momentsEspace.consent') }}</span>
          </label>

          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-ghost" @click="creneauChoisi = ''">{{ t('momentsEspace.cancel') }}</button>
            <button class="btn-primary" :disabled="envoi" @click="inscrire">
              <Icon v-if="envoi" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ t('momentsEspace.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
