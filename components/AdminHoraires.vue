<script setup lang="ts">
/**
 * Horaires d'ouverture de l'orgue, en vue semaine. On y voit, jour par jour,
 * les ouvertures, les blocages (messes, confessions…) et le créneau de
 * Louis-Paul Courtois ; les règles temporaires — fermetures comprises — se
 * distinguent par leur bordure en pointillés.
 *
 * Un clic sur un bloc ouvre sa règle. Avant d'enregistrer, la fiche annonce
 * les séances déjà inscrites que le changement rendrait impossibles : le
 * serveur les annule, professeurs et élèves prévenus.
 */
import {
  CRENEAU_REGULIER, ORGANISTE_REGULIER, type Horaire,
  creneauPossible, estTemporaire, finCreneau, heureFr, minutes, parseYmd, plusJours, reglesDuJour, seanceReguliere, ymd
} from '~/utils/moments'

type Regle = Horaire & { id: string }
interface SeanceAdmin { id: string; date: string; heure_debut: string; statut: string; eleve_prenom: string; eleve_nom: string }

const props = defineProps<{ horaires: Regle[]; seances: SeanceAdmin[]; aujourdhui: string }>()
const emit = defineEmits<{ (e: 'modifie'): void }>()
const { show: showToast } = useToast()

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const PX_HEURE = 56

// ── Semaine affichée ─────────────────────────────────────────────────────────
function lundiDe(date: string) {
  const d = parseYmd(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return ymd(d)
}
const lundi = ref(lundiDe(props.aujourdhui))
const jours = computed(() => Array.from({ length: 7 }, (_, i) => plusJours(lundi.value, i)))
const titreSemaine = computed(() => {
  const f = (d: string, o: Intl.DateTimeFormatOptions) => parseYmd(d).toLocaleDateString('fr-FR', o)
  return `Semaine du ${f(jours.value[0], { day: 'numeric', month: 'long' })} au ${f(jours.value[6], { day: 'numeric', month: 'long', year: 'numeric' })}`
})
const enteteJour = (d: string) => parseYmd(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })

// ── Échelle des heures : la même d'une semaine à l'autre ─────────────────────
const journeeEntiere = (h: Horaire) => h.heure_debut.slice(0, 5) === '00:00' && h.heure_fin.slice(0, 5) >= '24:00'
const plage = computed(() => {
  const partielles = props.horaires.filter(h => !journeeEntiere(h))
  const debut = partielles.length ? Math.min(...partielles.map(h => minutes(h.heure_debut))) : 10 * 60
  const fin = partielles.length ? Math.max(...partielles.map(h => minutes(h.heure_fin))) : 18 * 60
  return { debut: Math.floor(debut / 60) * 60, fin: Math.min(24 * 60, Math.ceil(fin / 60) * 60) }
})
const heures = computed(() => {
  const out: number[] = []
  for (let m = plage.value.debut; m <= plage.value.fin; m += 60) out.push(m)
  return out
})
function position(debut: string, fin: string) {
  const a = Math.max(minutes(debut), plage.value.debut)
  const b = Math.min(minutes(fin), plage.value.fin)
  return { top: `${(a - plage.value.debut) / 60 * PX_HEURE}px`, height: `${Math.max(b - a, 15) / 60 * PX_HEURE}px` }
}
const libelleHeures = (h: Horaire) => journeeEntiere(h) ? 'Toute la journée' : `${heureFr(h.heure_debut)} – ${heureFr(h.heure_fin)}`

/**
 * Blocs d'un jour : ouvertures dessous, blocages par-dessus, Louis-Paul au
 * premier plan — sauf une fermeture complète, qui recouvre toute la colonne.
 */
function blocs(date: string) {
  const regles = reglesDuJour(date, props.horaires) as Regle[]
  return [
    ...regles.filter(h => h.type === 'ouverture'),
    ...regles.filter(h => h.type === 'blocage' && !journeeEntiere(h)),
    ...regles.filter(h => h.type === 'blocage' && journeeEntiere(h))
  ]
}
function classeBloc(h: Horaire) {
  const genre = h.type === 'ouverture'
    ? 'inset-x-1 border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
    : journeeEntiere(h)
      ? 'inset-x-1 z-30 border-rose-400/70 bg-[#2a1317] text-rose-50'
      : 'inset-x-2 z-10 border-rose-400/60 bg-rose-500/25 text-rose-50'
  return [genre, estTemporaire(h) ? 'border-dashed bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,0.07)_6px_12px)]' : '']
}

// ── Fiche d'une règle ────────────────────────────────────────────────────────
interface Brouillon {
  id?: string
  portee: 'defaut' | 'temporaire'
  type: 'ouverture' | 'blocage'
  /** '' : tous les jours (règle temporaire seulement). */
  jour: number | ''
  journee: boolean
  heure_debut: string
  heure_fin: string
  motif: string
  date_debut: string
  date_fin: string
}
const fiche = ref<Brouillon | null>(null)
const busy = ref(false)
const erreur = ref('')

function nouvelle(genre: 'defaut' | 'temporaire' | 'indisponible') {
  erreur.value = ''
  fiche.value = {
    portee: genre === 'defaut' ? 'defaut' : 'temporaire',
    type: genre === 'defaut' ? 'ouverture' : 'blocage',
    jour: genre === 'defaut' ? 1 : '',
    journee: genre === 'indisponible',
    heure_debut: '', heure_fin: '',
    motif: '',
    date_debut: genre === 'defaut' ? '' : jours.value[0] < props.aujourdhui ? props.aujourdhui : jours.value[0],
    date_fin: ''
  }
}
function ouvrir(h: Regle) {
  erreur.value = ''
  fiche.value = {
    id: h.id,
    portee: estTemporaire(h) ? 'temporaire' : 'defaut',
    type: h.type,
    jour: h.jour_semaine ?? '',
    journee: journeeEntiere(h),
    heure_debut: journeeEntiere(h) ? '' : h.heure_debut.slice(0, 5),
    heure_fin: journeeEntiere(h) ? '' : h.heure_fin.slice(0, 5),
    motif: h.motif ?? '',
    date_debut: h.date_debut ?? '',
    date_fin: h.date_fin ?? ''
  }
}

/** La règle telle qu'elle serait enregistrée, ou un message si la fiche est incomplète. */
const regleProposee = computed<Horaire | string>(() => {
  const f = fiche.value
  if (!f) return ''
  if (f.portee === 'temporaire' && (!f.date_debut || !f.date_fin)) return 'Indiquez les dates de début et de fin.'
  if (f.portee === 'temporaire' && f.date_fin < f.date_debut) return 'La date de fin précède celle de début.'
  if (f.portee === 'defaut' && f.jour === '') return 'Choisissez un jour.'
  const journee = f.type === 'blocage' && f.journee
  if (!journee && (!f.heure_debut || !f.heure_fin || f.heure_fin <= f.heure_debut)) return 'Indiquez des heures valides.'
  return {
    type: f.type,
    jour_semaine: f.jour === '' ? null : f.jour,
    heure_debut: journee ? '00:00' : f.heure_debut,
    heure_fin: journee ? '24:00' : f.heure_fin,
    motif: f.motif.trim() || null,
    date_debut: f.portee === 'temporaire' ? f.date_debut : null,
    date_fin: f.portee === 'temporaire' ? f.date_fin : null
  }
})

/** Séances à venir que les horaires proposés rendraient impossibles. */
function seancesTouchees(horaires: Horaire[]) {
  return props.seances
    .filter(s => s.statut === 'reservee' && s.date >= props.aujourdhui)
    .filter(s => !creneauPossible(s.date, s.heure_debut, horaires))
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure_debut.localeCompare(b.heure_debut))
}
const autres = computed(() => props.horaires.filter(h => h.id !== fiche.value?.id))
const touchees = computed(() => typeof regleProposee.value === 'string' ? [] : seancesTouchees([...autres.value, regleProposee.value]))

const dateCourte = (d: string) => parseYmd(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const pluriel = (n: number) => `${n} séance${n > 1 ? 's' : ''} annulée${n > 1 ? 's' : ''}`

async function enregistrer() {
  const regle = regleProposee.value
  if (typeof regle === 'string') { erreur.value = regle; return }
  if (touchees.value.length && !confirm(`${touchees.value.length} séance(s) inscrite(s) deviendraient impossibles et seront annulées, professeurs et élèves prévenus. Continuer ?`)) return
  busy.value = true; erreur.value = ''
  try {
    const id = fiche.value?.id
    const r = await $fetch<{ seances_annulees: number }>(id ? `/api/admin/moments/horaires/${id}` : '/api/admin/moments/horaires', {
      method: id ? 'PATCH' : 'POST', body: regle
    })
    fiche.value = null
    emit('modifie')
    showToast(r.seances_annulees ? `Règle enregistrée — ${pluriel(r.seances_annulees)}.` : 'Règle enregistrée.', { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || 'Erreur'
  } finally { busy.value = false }
}

async function supprimer() {
  const id = fiche.value?.id
  if (!id) return
  const impact = seancesTouchees(autres.value)
  const message = impact.length
    ? `Supprimer cette règle ? ${impact.length} séance(s) inscrite(s) deviendraient impossibles et seront annulées, professeurs et élèves prévenus.`
    : 'Supprimer cette règle ?'
  if (!confirm(message)) return
  busy.value = true; erreur.value = ''
  try {
    const r = await $fetch<{ seances_annulees: number }>(`/api/admin/moments/horaires/${id}`, { method: 'DELETE' })
    fiche.value = null
    emit('modifie')
    showToast(r.seances_annulees ? `Règle supprimée — ${pluriel(r.seances_annulees)}.` : 'Règle supprimée.', { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || 'Erreur'
  } finally { busy.value = false }
}

// ── Règles temporaires en cours ou à venir ───────────────────────────────────
const temporaires = computed(() =>
  props.horaires.filter(h => estTemporaire(h) && (h.date_fin ?? '') >= props.aujourdhui)
    .sort((a, b) => (a.date_debut ?? '').localeCompare(b.date_debut ?? '')))
const periode = (h: Horaire) => h.date_debut === h.date_fin
  ? `Le ${dateCourte(h.date_debut!)}`
  : `Du ${dateCourte(h.date_debut!)} au ${dateCourte(h.date_fin!)}`
</script>

<template>
  <div class="space-y-8">
    <!-- Actions -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-2xl text-sm text-ink-500">
        Les <strong>ouvertures</strong> définissent quand l'orgue peut être joué ; les <strong>blocages</strong> en retirent
        les messes, les confessions et tout ce qui s'y oppose, et l'emportent toujours. Les créneaux proposés aux
        professeurs s'en déduisent, par demi-heures. Cliquez un bloc pour le modifier.
      </p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-primary" @click="nouvelle('indisponible')">Orgue indisponible</button>
        <button class="btn-ghost" @click="nouvelle('temporaire')">Règle temporaire</button>
        <button class="btn-ghost" @click="nouvelle('defaut')">Règle par défaut</button>
      </div>
    </div>

    <!-- Vue semaine -->
    <section class="rounded-2xl border border-ink-200 p-4 dark:border-ink-800 md:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-xl">{{ titreSemaine }}</h2>
        <div class="flex items-center gap-2">
          <button class="btn-ghost" aria-label="Semaine précédente" @click="lundi = plusJours(lundi, -7)">
            <Icon name="heroicons:chevron-left" class="h-4 w-4" />
          </button>
          <button class="btn-ghost" @click="lundi = lundiDe(aujourdhui)">Cette semaine</button>
          <button class="btn-ghost" aria-label="Semaine suivante" @click="lundi = plusJours(lundi, 7)">
            <Icon name="heroicons:chevron-right" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="grid min-w-[760px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <!-- En-têtes des jours -->
          <div />
          <div
            v-for="d in jours"
            :key="d"
            class="pb-3 text-center text-xs font-medium capitalize"
            :class="d === aujourdhui ? 'text-gold' : 'text-ink-400'"
          >
            {{ enteteJour(d) }}
          </div>

          <!-- Graduation des heures -->
          <div class="relative" :style="{ height: `${(plage.fin - plage.debut) / 60 * PX_HEURE}px` }">
            <span
              v-for="m in heures"
              :key="m"
              class="absolute right-2 -translate-y-1/2 text-[10px] text-ink-500"
              :style="{ top: `${(m - plage.debut) / 60 * PX_HEURE}px` }"
            >{{ m / 60 }} h</span>
          </div>

          <!-- Colonnes -->
          <div
            v-for="d in jours"
            :key="d"
            class="relative border-l border-ink-800"
            :class="d < aujourdhui ? 'opacity-50' : ''"
            :style="{ height: `${(plage.fin - plage.debut) / 60 * PX_HEURE}px` }"
          >
            <div
              v-for="m in heures"
              :key="m"
              class="absolute inset-x-0 border-t border-ink-800/70"
              :style="{ top: `${(m - plage.debut) / 60 * PX_HEURE}px` }"
            />
            <button
              v-for="h in blocs(d)"
              :key="h.id"
              class="absolute flex flex-col justify-start overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-125"
              :class="classeBloc(h)"
              :style="position(h.heure_debut, h.heure_fin)"
              :title="`${h.type === 'ouverture' ? 'Ouverture' : 'Blocage'}${h.motif ? ` — ${h.motif}` : ''} · ${libelleHeures(h)}${estTemporaire(h) ? ` · ${periode(h)}` : ' · chaque semaine'}`"
              @click="ouvrir(h)"
            >
              <span class="block truncate font-medium">{{ h.motif || (h.type === 'ouverture' ? 'Ouverture' : 'Blocage') }}</span>
              <span class="block truncate opacity-75">{{ libelleHeures(h) }}</span>
            </button>
            <div
              v-if="seanceReguliere(d, horaires)"
              class="pointer-events-none absolute inset-x-3 z-20 overflow-hidden rounded-md border border-gold bg-gold/25 px-1.5 py-0.5 text-[10px] leading-tight text-gold"
              :style="position(CRENEAU_REGULIER, finCreneau(CRENEAU_REGULIER))"
            >
              {{ ORGANISTE_REGULIER }}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-800 pt-4 text-xs text-ink-400">
        <span class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-emerald-500/50 bg-emerald-500/15" />Ouverture</span>
        <span class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-rose-400/60 bg-rose-500/25" />Blocage</span>
        <span class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-dashed border-ink-400" />Règle temporaire</span>
        <span class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-gold bg-gold/25" />{{ ORGANISTE_REGULIER }} (un jeudi sur deux)</span>
      </div>
    </section>

    <!-- Règles temporaires -->
    <section>
      <h2 class="mb-3 font-display text-xl">Règles temporaires</h2>
      <p v-if="!temporaires.length" class="text-sm text-ink-500">Aucune règle temporaire en cours ou à venir.</p>
      <ul v-else class="space-y-2">
        <li v-for="h in temporaires" :key="h.id">
          <button
            class="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ink-700 px-4 py-3 text-left text-sm transition hover:border-ink-500"
            @click="ouvrir(h); lundi = lundiDe(h.date_debut! < aujourdhui ? aujourdhui : h.date_debut!)"
          >
            <span>
              <span class="font-medium">{{ periode(h) }}</span>
              <span class="ml-3 text-ink-400">{{ h.jour_semaine === null ? 'tous les jours' : `le ${JOURS[h.jour_semaine].toLowerCase()}` }} · {{ libelleHeures(h) }}</span>
            </span>
            <span :class="h.type === 'ouverture' ? 'text-emerald-400' : 'text-rose-300'">
              {{ h.type === 'ouverture' ? 'Ouverture' : 'Blocage' }}<template v-if="h.motif"> — {{ h.motif }}</template>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Fiche d'une règle -->
    <Teleport to="body">
      <div v-if="fiche" class="fixed inset-0 z-[200] overflow-y-auto bg-black/60">
        <div class="flex min-h-full items-center justify-center p-4" @click.self="fiche = null">
          <div class="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-7">
            <h2 class="font-display text-2xl">{{ fiche.id ? 'Modifier la règle' : 'Nouvelle règle' }}</h2>

            <div class="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-ink-800/60 p-1 text-sm">
              <button
                v-for="p in [{ id: 'defaut', label: 'Chaque semaine' }, { id: 'temporaire', label: 'Temporaire' }]"
                :key="p.id"
                class="rounded-lg py-2 transition"
                :class="fiche.portee === p.id ? 'bg-ink-700 text-ink-50' : 'text-ink-400 hover:text-ink-200'"
                @click="fiche.portee = p.id as 'defaut' | 'temporaire'; if (p.id === 'defaut' && fiche.jour === '') fiche.jour = 1"
              >
                {{ p.label }}
              </button>
            </div>

            <div v-if="fiche.portee === 'temporaire'" class="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label class="label">Du</label>
                <input v-model="fiche.date_debut" type="date" :min="aujourdhui" class="input">
              </div>
              <div>
                <label class="label">Au (inclus)</label>
                <input v-model="fiche.date_fin" type="date" :min="fiche.date_debut || aujourdhui" class="input">
              </div>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label class="label">Jour</label>
                <select v-model="fiche.jour" class="input">
                  <option v-if="fiche.portee === 'temporaire'" value="">Tous les jours</option>
                  <option v-for="i in [1, 2, 3, 4, 5, 6, 0]" :key="i" :value="i">{{ JOURS[i] }}</option>
                </select>
              </div>
              <div>
                <label class="label">Type</label>
                <select v-model="fiche.type" class="input">
                  <option value="ouverture">Ouverture</option>
                  <option value="blocage">Blocage</option>
                </select>
              </div>
            </div>

            <label v-if="fiche.type === 'blocage'" class="mt-5 flex items-center gap-3 text-sm">
              <input v-model="fiche.journee" type="checkbox" class="h-4 w-4 accent-gold">
              Toute la journée (orgue indisponible)
            </label>

            <div v-if="!(fiche.type === 'blocage' && fiche.journee)" class="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label class="label">De</label>
                <input v-model="fiche.heure_debut" type="time" step="900" class="input">
              </div>
              <div>
                <label class="label">À</label>
                <input v-model="fiche.heure_fin" type="time" step="900" class="input">
              </div>
            </div>

            <label class="label mt-5">Motif <span class="font-normal text-ink-400">(facultatif)</span></label>
            <input v-model="fiche.motif" maxlength="200" class="input" :placeholder="fiche.type === 'blocage' ? 'ex. Messe, accord de l\'orgue, concert' : 'ex. ouverture exceptionnelle'">

            <div v-if="touchees.length" class="mt-5 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm">
              <p class="font-medium text-rose-200">
                {{ touchees.length }} séance(s) inscrite(s) deviendraient impossibles et seront annulées, professeurs et élèves prévenus :
              </p>
              <ul class="mt-2 space-y-0.5 text-rose-100/80">
                <li v-for="s in touchees.slice(0, 8)" :key="s.id">
                  {{ dateCourte(s.date) }} · {{ heureFr(s.heure_debut) }} — {{ s.eleve_prenom }} {{ s.eleve_nom }}
                </li>
                <li v-if="touchees.length > 8">… et {{ touchees.length - 8 }} autre(s)</li>
              </ul>
            </div>

            <p v-if="erreur" class="mt-4 text-sm text-red-400">{{ erreur }}</p>
            <div class="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button v-if="fiche.id" class="text-sm text-rose-300 underline-offset-4 hover:underline" :disabled="busy" @click="supprimer">
                Supprimer la règle
              </button>
              <span v-else />
              <div class="flex gap-3">
                <button class="btn-ghost" @click="fiche = null">Annuler</button>
                <button class="btn-primary" :disabled="busy" @click="enregistrer">
                  <Icon v-if="busy" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
