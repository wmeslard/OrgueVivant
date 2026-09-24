<script setup lang="ts">
/**
 * Les jeudis des Moments musicaux (13 h 15 – 13 h 45) sur l'horizon
 * d'inscription : qui joue, ce qui reste libre, ce qui est bloqué. On bloque
 * un jeudi, ou une période entière (vacances, travaux), et on débloque ici.
 * Bloquer un jeudi où un élève est inscrit annule sa séance : le serveur
 * prévient son professeur et l'élève.
 */
import {
  CRENEAU_REGULIER, DUREE_MIN, HORIZON_MOIS, JOUR_MOMENTS, ORGANISTE_REGULIER, type Horaire,
  estJeudiRegulier, estTemporaire, finCreneau, minutes, parseYmd, plusJours, plusMois, reglesDuJour, ymd
} from '~/utils/moments'

type Regle = Horaire & { id: string }
interface SeanceAdmin {
  id: string; date: string; heure_debut: string; statut: string
  eleve_prenom: string; eleve_nom: string; pour_soi?: boolean
  professeur?: { prenom: string; nom: string } | null
}

const props = defineProps<{ horaires: Regle[]; seances: SeanceAdmin[]; aujourdhui: string }>()
const emit = defineEmits<{ (e: 'modifie'): void }>()
const { show: showToast } = useToast()

const busy = ref(false)
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => {
  const s = parseYmd(d).toLocaleDateString('fr-FR', o)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Le blocage qui supprime le créneau de ce jeudi, s'il y en a un. */
function blocageDu(date: string): Regle | undefined {
  const a = minutes(CRENEAU_REGULIER); const b = a + DUREE_MIN
  return (reglesDuJour(date, props.horaires) as Regle[])
    .find(h => h.type === 'blocage' && minutes(h.heure_debut) < b && minutes(h.heure_fin) > a)
}
const seanceDu = (date: string) =>
  props.seances.find(s => s.statut === 'reservee' && s.date === date && s.heure_debut.startsWith(CRENEAU_REGULIER))

/** Les jeudis à venir, groupés par mois. */
const mois = computed(() => {
  const d = parseYmd(props.aujourdhui)
  d.setDate(d.getDate() + ((JOUR_MOMENTS - d.getDay() + 7) % 7))
  const fin = plusMois(props.aujourdhui, HORIZON_MOIS)
  const groupes: { titre: string; jeudis: { date: string; blocage?: Regle; regulier: boolean; seance?: SeanceAdmin }[] }[] = []
  for (let s = ymd(d); s <= fin; s = plusJours(s, 7)) {
    const titre = fmt(s, { month: 'long', year: 'numeric' })
    if (groupes.at(-1)?.titre !== titre) groupes.push({ titre, jeudis: [] })
    groupes.at(-1)!.jeudis.push({ date: s, blocage: blocageDu(s), regulier: estJeudiRegulier(s), seance: seanceDu(s) })
  }
  return groupes
})

function portee(h: Regle): string {
  if (!estTemporaire(h)) return 'chaque semaine'
  return h.date_debut === h.date_fin ? 'ce jeudi' : `du ${fmt(h.date_debut!, { day: 'numeric', month: 'long' })} au ${fmt(h.date_fin!, { day: 'numeric', month: 'long' })}`
}

async function envoyer(fn: () => Promise<{ seances_annulees?: number }>, message: string) {
  busy.value = true
  try {
    const r = await fn()
    emit('modifie')
    const n = r?.seances_annulees ?? 0
    showToast(n ? `${message} — ${n} séance${n > 1 ? 's' : ''} annulée${n > 1 ? 's' : ''}, professeurs et élèves prévenus.` : message, { type: 'success' })
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Erreur', { type: 'error' })
  } finally { busy.value = false }
}

const regleJeudis = (du: string, au: string, motif: string) => ({
  type: 'blocage', jour_semaine: JOUR_MOMENTS, heure_debut: CRENEAU_REGULIER, heure_fin: finCreneau(CRENEAU_REGULIER),
  motif: motif.trim() || null, date_debut: du, date_fin: au
})

async function bloquer(date: string) {
  const s = seanceDu(date)
  const motif = prompt(`Bloquer le ${fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })} ?`
    + (s ? `\n\nLa séance de ${s.eleve_prenom} ${s.eleve_nom} sera annulée, professeur et élève prévenus.` : '')
    + '\n\nMotif (facultatif) :', '')
  if (motif === null) return
  await envoyer(() => $fetch('/api/admin/moments/horaires', { method: 'POST', body: regleJeudis(date, date, motif) }), 'Jeudi bloqué.')
}

async function debloquer(h: Regle) {
  const quoi = !estTemporaire(h) ? 'ce blocage, qui s\'applique chaque semaine'
    : h.date_debut === h.date_fin ? 'ce jeudi' : `toute la période ${portee(h)}`
  if (!confirm(`Débloquer ${quoi} ?`)) return
  await envoyer(() => $fetch(`/api/admin/moments/horaires/${h.id}`, { method: 'DELETE' }), 'Débloqué.')
}

// ── Bloquer une période ──────────────────────────────────────────────────────
const periode = reactive({ du: '', au: '', motif: '' })
const touchees = computed(() => !periode.du || !periode.au ? []
  : props.seances.filter(s => s.statut === 'reservee' && s.date >= periode.du && s.date <= periode.au && s.date >= props.aujourdhui))
async function bloquerPeriode() {
  if (!periode.du || !periode.au || periode.au < periode.du) { showToast('Indiquez une période valide.', { type: 'error' }); return }
  if (touchees.value.length && !confirm(`${touchees.value.length} séance(s) d'élève dans cette période seront annulées, professeurs et élèves prévenus. Continuer ?`)) return
  await envoyer(() => $fetch('/api/admin/moments/horaires', { method: 'POST', body: regleJeudis(periode.du, periode.au, periode.motif) }), 'Période bloquée.')
  Object.assign(periode, { du: '', au: '', motif: '' })
}
</script>

<template>
  <div class="space-y-10">
    <p class="max-w-3xl text-sm text-ink-500">
      Les Moments musicaux ont lieu le jeudi, de 13 h 15 à 13 h 45. Un jeudi sur deux est celui de {{ ORGANISTE_REGULIER }} ;
      l'autre est proposé aux élèves. Bloquer un jeudi supprime la séance prévue ce jour-là, quelle qu'elle soit.
    </p>

    <!-- Bloquer une période -->
    <section class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="mb-1 font-display text-xl">Bloquer une période</h2>
      <p class="mb-4 text-sm text-ink-500">Vacances, travaux, accord de l'orgue… Tous les jeudis de la période sont bloqués.</p>
      <div class="grid gap-4 md:grid-cols-4">
        <div>
          <label class="label">Du</label>
          <input v-model="periode.du" type="date" :min="aujourdhui" class="input">
        </div>
        <div>
          <label class="label">Au (inclus)</label>
          <input v-model="periode.au" type="date" :min="periode.du || aujourdhui" class="input">
        </div>
        <div class="md:col-span-2">
          <label class="label">Motif <span class="font-normal text-ink-400">(facultatif)</span></label>
          <input v-model="periode.motif" maxlength="200" class="input" placeholder="ex. vacances de la Toussaint">
        </div>
      </div>
      <p v-if="touchees.length" class="mt-3 text-sm text-rose-300">
        {{ touchees.length }} séance(s) d'élève dans cette période seront annulées.
      </p>
      <button class="btn-primary mt-5" :disabled="busy" @click="bloquerPeriode">Bloquer la période</button>
    </section>

    <!-- Les jeudis à venir -->
    <section v-for="m in mois" :key="m.titre">
      <h2 class="mb-3 font-display text-xl">{{ m.titre }}</h2>
      <ul class="space-y-2">
        <li
          v-for="j in m.jeudis"
          :key="j.date"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
          :class="j.blocage ? 'border-dashed border-rose-400/40 bg-rose-500/5' : 'border-ink-200 dark:border-ink-800'"
        >
          <span class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span class="w-40 font-medium">{{ fmt(j.date, { weekday: 'long', day: 'numeric', month: 'long' }) }}</span>
            <span v-if="j.blocage" class="text-rose-300">
              Bloqué<template v-if="j.blocage.motif"> — {{ j.blocage.motif }}</template>
              <span class="ml-2 text-xs text-ink-500">({{ portee(j.blocage) }})</span>
            </span>
            <span v-else-if="j.regulier" class="text-gold">{{ ORGANISTE_REGULIER }}</span>
            <span v-else-if="j.seance">
              {{ j.seance.eleve_prenom }} {{ j.seance.eleve_nom }}
              <span class="ml-2 text-xs text-ink-500">
                <template v-if="j.seance.pour_soi">inscription personnelle</template>
                <template v-else>inscrit·e par {{ j.seance.professeur ? `${j.seance.professeur.prenom} ${j.seance.professeur.nom}` : 'l\'association' }}</template>
              </span>
            </span>
            <span v-else class="text-ink-500">Libre</span>
          </span>
          <button v-if="j.blocage" class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="debloquer(j.blocage)">
            Débloquer
          </button>
          <button v-else class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="bloquer(j.date)">
            Bloquer
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
