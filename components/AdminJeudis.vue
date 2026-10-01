<script setup lang="ts">
/**
 * L'onglet « Jeudis » de l'administration : chaque jeudi de Moment musical
 * (un sur deux) sur l'horizon d'inscription, une ligne avec son état — qui
 * joue, Louis-Paul Courtois affecté, libre, bloqué — et ses actions : inscrire,
 * annuler la séance, bloquer, débloquer. Un résumé chiffré sert de filtre ; les
 * séances passées se déplient au-dessus. Bloquer un jeudi où quelqu'un est
 * inscrit annule sa séance : le serveur prévient les personnes concernées.
 */
import {
  CRENEAU_REGULIER, DUREE_MIN, HORIZON_MOIS, JOUR_MOMENTS, JOURS_AVANT_AFFECTATION, ORGANISTE_REGULIER,
  type Horaire, type Musicien, estJeudiMoment, estTemporaire, finCreneau, minutes, musiciensDe, nomsComplets,
  parseYmd, plusJours, plusMois, reglesDuJour, ymd
} from '~/utils/moments'

type Regle = Horaire & { id: string }
interface SeanceAdmin {
  id: string; date: string; heure_debut: string; statut: string
  eleve_prenom: string; eleve_nom: string; eleve_email?: string | null; programme?: string | null
  pour_soi?: boolean; musiciens?: Musicien[] | null; rappel_at?: string | null
  professeur?: { prenom: string; nom: string } | null
}
type Etat = 'inscrit' | 'lp' | 'libre' | 'bloque'
interface Jeudi {
  date: string; etat: Etat
  blocage?: Regle; seance?: SeanceAdmin; affectation?: { notifie_at: string | null }
}

const props = defineProps<{
  horaires: Regle[]
  seances: SeanceAdmin[]
  aujourdhui: string
  affectations: { date: string; notifie_at: string | null }[]
}>()
const emit = defineEmits<{ (e: 'modifie'): void }>()
const { show: showToast } = useToast()

const busy = ref(false)
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => {
  const s = parseYmd(d).toLocaleDateString('fr-FR', o).replace(/^(\S+ )?1 /, '$11er ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const jourCourt = (d: string) => fmt(d, { weekday: 'long', day: 'numeric', month: 'short' })

/** Le blocage qui supprime le créneau de ce jeudi, s'il y en a un. */
function blocageDu(date: string): Regle | undefined {
  const a = minutes(CRENEAU_REGULIER); const b = a + DUREE_MIN
  return (reglesDuJour(date, props.horaires) as Regle[])
    .find(h => h.type === 'blocage' && minutes(h.heure_debut) < b && minutes(h.heure_fin) > a)
}
const seanceDu = (date: string) => props.seances.find(s => s.statut === 'reservee' && s.date === date)

function jeudi(date: string): Jeudi {
  const blocage = blocageDu(date)
  const seance = seanceDu(date)
  const affectation = props.affectations.find(a => a.date === date)
  const etat: Etat = blocage ? 'bloque' : seance ? 'inscrit' : affectation ? 'lp' : 'libre'
  return { date, etat, blocage, seance, affectation }
}

/** Le premier jeudi de Moment musical à partir d'une date. */
function premierJeudi(depuis: string) {
  const d = parseYmd(depuis)
  d.setDate(d.getDate() + ((JOUR_MOMENTS - d.getDay() + 7) % 7))
  return estJeudiMoment(ymd(d)) ? ymd(d) : plusJours(ymd(d), 7)
}

/** Les jeudis à venir, sur l'horizon d'inscription. */
const jeudis = computed<Jeudi[]>(() => {
  const out: Jeudi[] = []
  const fin = plusMois(props.aujourdhui, HORIZON_MOIS)
  for (let s = premierJeudi(props.aujourdhui); s <= fin; s = plusJours(s, 14)) out.push(jeudi(s))
  return out
})
/** Les trois derniers mois (le serveur n'en charge pas plus) : les jours où quelqu'un a joué. */
const passes = computed<Jeudi[]>(() => {
  const dates = new Set([
    ...props.seances.filter(s => s.statut === 'reservee').map(s => s.date),
    ...props.affectations.map(a => a.date)
  ].filter(d => d < props.aujourdhui))
  return [...dates].sort().map(jeudi).filter(j => j.etat === 'inscrit' || j.etat === 'lp')
})

// ── Résumé et filtre ─────────────────────────────────────────────────────────
const filtre = ref<Etat | null>(null)
const voirPasses = ref(false)
const compte = (e: Etat) => jeudis.value.filter(j => j.etat === e).length
const filtres = computed(() => [
  { etat: null, label: `${jeudis.value.length} jeudis` },
  { etat: 'inscrit' as const, label: `${compte('inscrit')} inscrit${compte('inscrit') > 1 ? 's' : ''}` },
  { etat: 'libre' as const, label: `${compte('libre')} libre${compte('libre') > 1 ? 's' : ''}` },
  { etat: 'lp' as const, label: `${compte('lp')} Louis-Paul` },
  { etat: 'bloque' as const, label: `${compte('bloque')} bloqué${compte('bloque') > 1 ? 's' : ''}` }
])

function parMois(liste: Jeudi[]) {
  const groupes: { titre: string; jeudis: Jeudi[] }[] = []
  for (const j of liste) {
    const titre = fmt(j.date, { month: 'long', year: 'numeric' })
    if (groupes.at(-1)?.titre !== titre) groupes.push({ titre, jeudis: [] })
    groupes.at(-1)!.jeudis.push(j)
  }
  return groupes
}
const groupes = computed(() => parMois(filtre.value ? jeudis.value.filter(j => j.etat === filtre.value) : jeudis.value))
const groupesPasses = computed(() => parMois(passes.value))

// ── Ce que dit chaque ligne ──────────────────────────────────────────────────
function portee(h: Regle): string {
  if (!estTemporaire(h)) return 'chaque semaine'
  return h.date_debut === h.date_fin ? 'ce jeudi seulement' : `du ${fmt(h.date_debut!, { day: 'numeric', month: 'long' })} au ${fmt(h.date_fin!, { day: 'numeric', month: 'long' })}`
}
function titre(j: Jeudi) {
  if (j.etat === 'bloque') return `Bloqué${j.blocage?.motif ? ` — ${j.blocage.motif}` : ''}`
  if (j.etat === 'inscrit') return nomsComplets(musiciensDe(j.seance!), true)
  if (j.etat === 'lp') return ORGANISTE_REGULIER
  return 'Libre'
}
function detail(j: Jeudi, passe = false) {
  if (j.etat === 'bloque') return portee(j.blocage!)
  if (j.etat === 'lp') {
    if (passe) return 'Personne ne s\'était inscrit'
    return j.affectation?.notifie_at
      ? `Personne ne s'était inscrit · prévenu le ${fmt(j.affectation.notifie_at.slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()}`
      : 'Affecté, pas encore prévenu (adresse manquante ?)'
  }
  if (j.etat === 'libre')
    return `Sinon ${ORGANISTE_REGULIER}, prévenu le ${fmt(plusJours(j.date, -JOURS_AVANT_AFFECTATION), { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()}`
  const s = j.seance!
  const qui = s.pour_soi ? 'Inscription personnelle'
    : `Inscrit·e par ${s.professeur ? `${s.professeur.prenom} ${s.professeur.nom}` : 'l\'association'}`
  return [qui, s.eleve_email, s.programme, !passe && s.rappel_at ? 'rappel envoyé' : ''].filter(Boolean).join(' · ')
}
const COULEUR: Record<Etat, string> = {
  inscrit: 'text-ink-900 dark:text-ink-100', lp: 'text-gold', libre: 'text-ink-500', bloque: 'text-rose-300'
}

// ── Actions ──────────────────────────────────────────────────────────────────
async function envoyer(fn: () => Promise<{ seances_annulees?: number } | unknown>, message: string) {
  busy.value = true
  try {
    const r = await fn() as { seances_annulees?: number } | undefined
    emit('modifie')
    const n = r?.seances_annulees ?? 0
    showToast(n ? `${message} — ${n} séance${n > 1 ? 's' : ''} annulée${n > 1 ? 's' : ''}, les personnes inscrites prévenues.` : message, { type: 'success' })
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Erreur', { type: 'error' })
  } finally { busy.value = false }
}

const regleJeudis = (du: string, au: string, motif: string) => ({
  type: 'blocage', jour_semaine: JOUR_MOMENTS, heure_debut: CRENEAU_REGULIER, heure_fin: finCreneau(CRENEAU_REGULIER),
  motif: motif.trim() || null, date_debut: du, date_fin: au
})

async function bloquer(j: Jeudi) {
  const motif = prompt(`Bloquer le ${fmt(j.date, { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()} ?`
    + (j.seance ? `\n\nLa séance de ${nomsComplets(musiciensDe(j.seance))} sera annulée, les personnes inscrites prévenues.` : '')
    + '\n\nMotif (facultatif) :', '')
  if (motif === null) return
  await envoyer(() => $fetch('/api/admin/moments/horaires', { method: 'POST', body: regleJeudis(j.date, j.date, motif) }), 'Jeudi bloqué.')
}

async function debloquer(h: Regle) {
  const quoi = !estTemporaire(h) ? 'ce blocage, qui s\'applique chaque semaine'
    : h.date_debut === h.date_fin ? 'ce jeudi' : `toute la période ${portee(h)}`
  if (!confirm(`Débloquer ${quoi} ?`)) return
  await envoyer(() => $fetch(`/api/admin/moments/horaires/${h.id}`, { method: 'DELETE' }), 'Débloqué.')
}

async function annulerSeance(s: SeanceAdmin) {
  const motif = prompt(`Annuler la séance de ${nomsComplets(musiciensDe(s))} du ${fmt(s.date, { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()} ?\n\nMotif communiqué (facultatif) :`)
  if (motif === null) return
  await envoyer(() => $fetch(`/api/admin/moments/seances/${s.id}`, { method: 'DELETE', body: { motif } }), 'Séance annulée.')
}

// ── Inscrire ─────────────────────────────────────────────────────────────────
const aInscrire = ref<string | null>(null)
function inscrit() {
  aInscrire.value = null
  emit('modifie')
  showToast('Inscription enregistrée.', { type: 'success' })
}

// ── Bloquer une période ──────────────────────────────────────────────────────
const periodeOuverte = ref(false)
const periode = reactive({ du: '', au: '', motif: '' })
const touchees = computed(() => !periode.du || !periode.au ? []
  : props.seances.filter(s => s.statut === 'reservee' && s.date >= periode.du && s.date <= periode.au && s.date >= props.aujourdhui))
async function bloquerPeriode() {
  if (!periode.du || !periode.au || periode.au < periode.du) { showToast('Indiquez une période valide.', { type: 'error' }); return }
  if (touchees.value.length && !confirm(`${touchees.value.length} séance(s) inscrite(s) dans cette période seront annulées, les personnes inscrites prévenues. Continuer ?`)) return
  await envoyer(() => $fetch('/api/admin/moments/horaires', { method: 'POST', body: regleJeudis(periode.du, periode.au, periode.motif) }), 'Période bloquée.')
  Object.assign(periode, { du: '', au: '', motif: '' })
  periodeOuverte.value = false
}

const BOUTON = 'rounded-full border border-ink-300 px-3.5 py-1.5 text-xs font-medium transition hover:border-ink-500 dark:border-ink-700 dark:hover:border-ink-400'
const BOUTON_OR = 'rounded-full bg-gold px-3.5 py-1.5 text-xs font-medium text-background transition hover:bg-gold-light'
const LIEN = 'px-2 py-1.5 text-xs text-ink-500 transition hover:text-ink-900 dark:hover:text-ink-100'
const LIEN_ROUGE = 'px-2 py-1.5 text-xs text-rose-400 transition hover:text-rose-300'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-display text-xl">Les prochains jeudis</h2>
      <button :class="BOUTON" @click="periodeOuverte = !periodeOuverte">Bloquer une période</button>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-ink-500">
      Un jeudi sur deux, de 13 h 15 à 13 h 45. Deux jours avant, si personne ne s'est inscrit, {{ ORGANISTE_REGULIER }}
      est affecté à la séance et prévenu par email ; les inscriptions ferment à ce moment-là.
    </p>

    <!-- Bloquer une période -->
    <section v-if="periodeOuverte" class="mt-5 rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
      <p class="mb-4 text-sm text-ink-500">Vacances, travaux, accord de l'orgue… Tous les jeudis de la période sont bloqués.</p>
      <div class="grid gap-4 md:grid-cols-4">
        <div>
          <label class="label" for="bp-du">Du</label>
          <input id="bp-du" v-model="periode.du" type="date" :min="aujourdhui" class="input">
        </div>
        <div>
          <label class="label" for="bp-au">Au (inclus)</label>
          <input id="bp-au" v-model="periode.au" type="date" :min="periode.du || aujourdhui" class="input">
        </div>
        <div class="md:col-span-2">
          <label class="label" for="bp-motif">Motif <span class="font-normal text-ink-400">(facultatif)</span></label>
          <input id="bp-motif" v-model="periode.motif" maxlength="200" class="input" placeholder="ex. vacances de la Toussaint">
        </div>
      </div>
      <p v-if="touchees.length" class="mt-3 text-sm text-rose-300">
        {{ touchees.length }} séance(s) inscrite(s) dans cette période seront annulées.
      </p>
      <div class="mt-5 flex gap-3">
        <button class="btn-primary" :disabled="busy" @click="bloquerPeriode">Bloquer la période</button>
        <button class="btn-ghost" @click="periodeOuverte = false">Annuler</button>
      </div>
    </section>

    <!-- Résumé, qui sert de filtre -->
    <div class="mt-5 flex flex-wrap items-center gap-2">
      <button
        v-for="f in filtres"
        :key="String(f.etat)"
        class="rounded-full border px-3 py-1 text-xs transition"
        :class="filtre === f.etat ? 'border-gold/50 bg-gold/10 text-gold' : 'border-ink-200 text-ink-500 hover:text-ink-900 dark:border-ink-800 dark:hover:text-ink-100'"
        @click="filtre = f.etat"
      >
        {{ f.label }}
      </button>
      <button v-if="passes.length" class="ml-auto text-xs text-gold underline-offset-4 hover:underline" @click="voirPasses = !voirPasses">
        {{ voirPasses ? 'Masquer les séances passées' : `↑ Afficher les séances passées (${passes.length})` }}
      </button>
    </div>

    <!-- Séances passées, estompées -->
    <div v-if="voirPasses" class="opacity-60">
      <section v-for="m in groupesPasses" :key="`p-${m.titre}`">
        <h3 class="mb-1.5 mt-5 font-display text-lg">{{ m.titre }}</h3>
        <ul class="space-y-1.5">
          <li
            v-for="j in m.jeudis"
            :key="j.date"
            class="grid items-baseline gap-x-4 gap-y-0.5 rounded-xl border border-ink-200 px-4 py-2.5 text-sm dark:border-ink-800 sm:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <span class="font-medium">{{ jourCourt(j.date) }}</span>
            <span class="min-w-0">
              <span :class="COULEUR[j.etat]">{{ titre(j) }}</span>
              <span class="ml-3 text-xs text-ink-500">{{ detail(j, true) }}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Les jeudis à venir -->
    <p v-if="!groupes.length" class="mt-6 text-sm text-ink-500">Aucun jeudi dans cette catégorie.</p>
    <section v-for="m in groupes" :key="m.titre">
      <h3 class="mb-1.5 mt-5 font-display text-lg">{{ m.titre }}</h3>
      <ul class="space-y-1.5">
        <li
          v-for="j in m.jeudis"
          :key="j.date"
          class="grid items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
          :class="j.etat === 'bloque' ? 'border-dashed border-rose-400/40 bg-rose-500/5'
            : j.date === aujourdhui ? 'border-gold/50' : 'border-ink-200 dark:border-ink-800'"
        >
          <span class="font-medium">{{ jourCourt(j.date) }}</span>
          <span class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span :class="COULEUR[j.etat]">
              <span v-if="j.etat === 'lp'" class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" />{{ titre(j) }}
            </span>
            <span v-if="j.date === aujourdhui" class="rounded-full border border-gold/40 px-2 text-[10px] font-semibold uppercase tracking-wider text-gold">Aujourd'hui</span>
            <span class="text-xs text-ink-500">{{ detail(j) }}</span>
          </span>
          <span class="flex items-center justify-end gap-1">
            <template v-if="j.etat === 'bloque'">
              <button :class="BOUTON" :disabled="busy" @click="debloquer(j.blocage!)">Débloquer</button>
            </template>
            <template v-else>
              <button v-if="j.etat === 'inscrit'" :class="LIEN_ROUGE" :disabled="busy" @click="annulerSeance(j.seance!)">Annuler la séance</button>
              <button v-else-if="j.etat === 'lp'" :class="BOUTON" :disabled="busy" @click="aInscrire = j.date">Inscrire quelqu'un</button>
              <button v-else :class="BOUTON_OR" :disabled="busy" @click="aInscrire = j.date">Inscrire</button>
              <button :class="LIEN" :disabled="busy" @click="bloquer(j)">Bloquer</button>
            </template>
          </span>
        </li>
      </ul>
    </section>

    <AdminInscription :date="aInscrire" @fermer="aInscrire = null" @inscrit="inscrit" @echec="emit('modifie')" />
  </div>
</template>
