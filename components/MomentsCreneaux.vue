<script setup lang="ts">
/**
 * Calendrier des créneaux et inscription par l'association : on choisit un
 * jour dans le mois, puis le créneau libre, et on remplit la fiche — un à
 * quatre musiciens, comme dans l'espace d'inscription.
 *
 * Les règles viennent de `utils/moments.ts`, partagées avec l'API : ici elles
 * grisent les jours et composent la liste des créneaux, le serveur restant
 * seul juge au moment de l'enregistrement.
 *
 * Le slot `pris` permet à l'administration d'afficher le détail d'une séance
 * (nom complet, professeur, annulation) à la place du seul nom affiché.
 */
import type { EtatJour } from '~/components/MomentsCalendrier.vue'
import {
  creneauxDuJour, heureFr, INSTRUMENT_PAR_DEFAUT, MAX_MUSICIENS, nomsPublics, ymd,
  type ContexteJour, type CreneauJour, type Musicien
} from '~/utils/moments'

export interface FicheEleve {
  date: string
  heure_debut: string
  musiciens: Musicien[]
  eleve_email: string
  programme: string
}

const props = defineProps<{
  contexte: ContexteJour
  /** Enregistre la fiche ; une erreur levée s'affiche dans la fiche. */
  envoyer: (fiche: FicheEleve) => Promise<unknown>
  /** Vue de l'association : pas de légende « Mes inscriptions ». */
  association?: boolean
}>()
const emit = defineEmits<{ (e: 'inscrit'): void; (e: 'echec'): void }>()
defineSlots<{ pris?: (p: { creneau: CreneauJour; date: string }) => unknown }>()

const { t, locale } = useI18n()

const mois = ref(props.contexte.aujourdhui.slice(0, 7))
const jourChoisi = ref('')

/** Résumé de chaque jour du mois affiché, pour la grille. */
const jours = computed<Record<string, EtatJour>>(() => {
  const out: Record<string, EtatJour> = {}
  const cursor = new Date(Number(mois.value.slice(0, 4)), Number(mois.value.slice(5, 7)) - 1, 1)
  const fin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  for (; cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
    const date = ymd(cursor)
    const creneaux = creneauxDuJour(date, props.contexte)
    const libres = creneaux.filter(c => c.etat === 'libre').length
    const pris = creneaux.filter(c => c.etat === 'pris').length
    out[date] = { libres, pris, mien: creneaux.some(c => c.mien), indisponible: !creneaux.length }
  }
  return out
})

const creneaux = computed(() => jourChoisi.value ? creneauxDuJour(jourChoisi.value, props.contexte) : [])

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Fiche d'inscription ──────────────────────────────────────────────────────
const creneauChoisi = ref('')
const vide = (instrument = ''): Musicien => ({ prenom: '', nom: '', instrument })
const form = reactive({ musiciens: [vide(INSTRUMENT_PAR_DEFAUT)], eleve_email: '', programme: '', consentement: false })
const envoi = ref(false)
const erreur = ref('')

const rempli = (m: Musicien) => !!(m.prenom.trim() || m.nom.trim())
const apercuNom = computed(() => nomsPublics(form.musiciens.filter(m => m.prenom.trim())) || '—')

function ouvrir(debut: string) {
  creneauChoisi.value = debut
  erreur.value = ''
  Object.assign(form, { musiciens: [vide(INSTRUMENT_PAR_DEFAUT)], eleve_email: '', programme: '', consentement: false })
}

async function inscrire() {
  erreur.value = ''
  const musiciens = form.musiciens.filter((m, i) => i === 0 || rempli(m))
  if (musiciens.some(m => !m.prenom.trim() || !m.nom.trim())) { erreur.value = t('momentsAcces.errorRequired'); return }
  if (form.eleve_email && !/^\S+@\S+\.\S+$/.test(form.eleve_email)) { erreur.value = t('momentsAcces.errorEmail'); return }
  if (!form.consentement) { erreur.value = t('momentsEspace.errorConsent'); return }
  envoi.value = true
  try {
    await props.envoyer({
      date: jourChoisi.value, heure_debut: creneauChoisi.value, musiciens, eleve_email: form.eleve_email, programme: form.programme
    })
    creneauChoisi.value = ''
    emit('inscrit')
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
    // Le créneau vient peut-être d'être pris : le parent recharge, pour que la
    // liste affichée corresponde de nouveau à la réalité.
    emit('echec')
  } finally { envoi.value = false }
}

const legende = computed(() => [
  { label: t('momentsEspace.legendFree'), classe: 'border-white/20 bg-white/[0.04]' },
  ...(props.association ? [] : [{ label: t('momentsEspace.legendMine'), classe: 'border-gold bg-gold/25' }]),
  { label: t('momentsEspace.legendTaken'), classe: 'border-white/10 bg-white/[0.02]' },
  { label: t('momentsEspace.legendClosed'), classe: 'border-transparent bg-transparent' }
])
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <!-- Calendrier -->
    <div class="card-premium p-6 md:p-8">
      <MomentsCalendrier
        v-model:mois="mois"
        :jours="jours"
        :aujourdhui="contexte.aujourdhui"
        :selection="jourChoisi"
        @choisir="jourChoisi = $event"
      />
      <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-5 text-xs text-text-secondary">
        <span v-for="l in legende" :key="l.label" class="flex items-center gap-2">
          <span class="h-3 w-3 rounded border" :class="l.classe" />{{ l.label }}
        </span>
      </div>
    </div>

    <div class="space-y-8">
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
              <slot v-else-if="c.etat === 'pris' && $slots.pris" name="pris" :creneau="c" :date="jourChoisi" />
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

    <!-- Fiche d'inscription -->
    <Teleport to="body">
      <div v-if="creneauChoisi" class="fixed inset-0 z-[200] overflow-y-auto bg-black/70">
        <!-- Centrée à l'écran ; sur un écran trop bas, elle défile au lieu d'être coupée -->
        <div class="flex min-h-full items-center justify-center p-4" @click.self="creneauChoisi = ''">
          <div class="card-premium w-full max-w-md p-7">
            <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(jourChoisi) }}</h2>
            <p class="mt-1 text-sm text-text-secondary">
              {{ heureFr(creneauChoisi) }} · {{ t('moments.place') }}
            </p>

            <MomentsTuileMusicien
              v-for="(m, i) in form.musiciens"
              :key="i"
              v-model="form.musiciens[i]"
              :class="i ? 'mt-3' : 'mt-6'"
              :titre="t('momentsEspace.musicianN', { n: i + 1 })"
              :ident="`a${i}`"
              :retirable="i > 0"
              @retirer="form.musiciens.splice(i, 1)"
            />
            <button
              v-if="form.musiciens.length < MAX_MUSICIENS"
              type="button"
              class="mt-3 text-sm text-gold underline-offset-4 hover:underline"
              @click="form.musiciens.push(vide())"
            >
              {{ t('momentsEspace.addMusician') }}
            </button>
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
              <span>{{ t(form.musiciens.length > 1 ? 'momentsEspace.consentPlural' : 'momentsEspace.consent') }}</span>
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
      </div>
    </Teleport>
  </div>
</template>
