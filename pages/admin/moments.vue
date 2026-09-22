<script setup lang="ts">
/**
 * Moments musicaux : lien d'accès des professeurs, calendrier des séances,
 * professeurs, et horaires d'ouverture de l'orgue (règles par défaut et
 * temporaires, indisponibilités comprises).
 *
 * Contrairement au site public, l'administration voit tout : le nom complet de
 * l'élève, et le professeur qui l'a inscrit.
 */
import type { FicheEleve } from '~/components/MomentsCreneaux.vue'
import { heureFr, type Horaire } from '~/utils/moments'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { t } = useI18n()
const { show: showToast } = useToast()

interface Professeur {
  id: string; prenom: string; nom: string; email: string
  conservatoire: string | null; actif: boolean; derniere_connexion_at: string | null; created_at: string
}
interface Seance {
  id: string; date: string; heure_debut: string; heure_fin: string
  eleve_prenom: string; eleve_nom: string; eleve_email: string | null; programme: string | null
  statut: 'reservee' | 'annulee'; annulee_par: 'professeur' | 'admin' | null
  /** Null : inscrite par l'association. */
  professeur_id: string | null
  professeur?: { prenom: string; nom: string; email: string } | null
}
interface Vue {
  aujourdhui: string
  professeurs: Professeur[]
  seances: Seance[]
  horaires: (Horaire & { id: string })[]
  lienProfesseurs: string | null
}

const { data, refresh, pending } = await useFetch<Vue>('/api/admin/moments')

const onglet = ref<'calendrier' | 'professeurs' | 'horaires'>('calendrier')
const busy = ref(false)
const erreur = ref('')

const seancesAVenir = computed(() =>
  (data.value?.seances ?? []).filter(s => s.statut === 'reservee' && s.date >= (data.value?.aujourdhui ?? ''))
)
const seancesPassees = computed(() =>
  (data.value?.seances ?? [])
    .filter(s => s.statut === 'reservee' && s.date < (data.value?.aujourdhui ?? ''))
    .sort((a, b) => b.date.localeCompare(a.date))
)
const profsActifs = computed(() => data.value?.professeurs.filter(p => p.actif) ?? [])

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function quandCourt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'jamais'
}
const inscritPar = (s: Seance) => s.professeur ? `${s.professeur.prenom} ${s.professeur.nom}` : 'l\'association'

async function action(fn: () => Promise<unknown>, message: string) {
  busy.value = true; erreur.value = ''
  try {
    await fn(); await refresh(); showToast(message, { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || 'Erreur'
    showToast(erreur.value, { type: 'error' })
  } finally { busy.value = false }
}

// ── Lien à partager ──────────────────────────────────────────────────────────
const copie = ref(false)
async function copierLien() {
  if (!data.value?.lienProfesseurs) return
  try {
    await navigator.clipboard.writeText(data.value.lienProfesseurs)
    copie.value = true; setTimeout(() => (copie.value = false), 2000)
  } catch { /* le champ reste sélectionnable à la main */ }
}
async function regenererLien() {
  if (data.value?.lienProfesseurs && !confirm(
    'Régénérer le lien ?\n\nL\'ancien cessera aussitôt de fonctionner, y compris pour les professeurs déjà entrés : '
    + 'il faudra leur transmettre le nouveau. Les séances inscrites ne changent pas.')) return
  await action(() => $fetch('/api/admin/moments/lien', { method: 'POST' }), 'Nouveau lien créé.')
}

// ── Calendrier des séances ───────────────────────────────────────────────────
// Le même calendrier que celui des professeurs, sans délai de prévenance, avec
// le nom complet des élèves déjà inscrits.
const contexte = computed(() => ({
  aujourdhui: data.value?.aujourdhui ?? '',
  delaiJours: 0,
  horaires: data.value?.horaires ?? [],
  pris: seancesAVenir.value.map(s => ({
    date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: `${s.eleve_prenom} ${s.eleve_nom}`
  }))
}))
const seanceDu = (date: string, debut: string) =>
  seancesAVenir.value.find(s => s.date === date && s.heure_debut.startsWith(debut))

const inscrireEleve = (fiche: FicheEleve) => $fetch('/api/admin/moments/seances', { method: 'POST', body: fiche })
async function inscrit() {
  await refresh()
  showToast('Élève inscrit.', { type: 'success' })
}

async function annulerSeance(s: Seance) {
  const motif = prompt(`Annuler la séance de ${s.eleve_prenom} ${s.eleve_nom} du ${jourLong(s.date)} ?\n\nMotif communiqué (facultatif) :`)
  if (motif === null) return
  await action(() => $fetch(`/api/admin/moments/seances/${s.id}`, { method: 'DELETE', body: { motif } }), 'Séance annulée.')
}

// ── Professeurs ──────────────────────────────────────────────────────────────
async function basculerProf(p: Professeur) {
  if (p.actif && !confirm(`Désactiver ${p.prenom} ${p.nom} ? Les séances à venir de ses élèves seront annulées.`)) return
  await action(() => $fetch(`/api/admin/moments/professeurs/${p.id}`, { method: 'PATCH', body: { actif: !p.actif } }),
    p.actif ? 'Professeur désactivé.' : 'Professeur réactivé.')
}
function seancesDe(id: string) {
  return (data.value?.seances ?? []).filter(s => s.professeur_id === id && s.statut === 'reservee').length
}
</script>

<template>
  <div class="container-apple py-20">
    <AdminHeader :titre="t('admin.moments')" />

    <AdminNav />

    <!-- Lien à transmettre aux professeurs -->
    <section class="mb-10 rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="mb-1 font-display text-xl">Lien pour les professeurs</h2>
      <p class="mb-4 text-sm text-ink-500">
        Toute personne qui ouvre ce lien peut inscrire des élèves : transmettez-le aux professeurs d'orgue, par email
        ou par message, sans le publier. S'il circule trop largement, régénérez-le — l'ancien cesse aussitôt de
        fonctionner, et les professeurs devront utiliser le nouveau.
      </p>
      <div v-if="data?.lienProfesseurs" class="flex flex-wrap items-center gap-3">
        <input :value="data.lienProfesseurs" readonly class="input min-w-[18rem] flex-1 font-mono text-xs" @focus="($event.target as HTMLInputElement).select()">
        <button class="btn-primary" @click="copierLien">{{ copie ? 'Copié' : 'Copier' }}</button>
        <button class="btn-ghost" :disabled="busy" @click="regenererLien">Régénérer</button>
      </div>
      <div v-else-if="data" class="flex flex-wrap items-center gap-3 text-sm text-ink-500">
        Aucun lien pour le moment.
        <button class="btn-primary" :disabled="busy" @click="regenererLien">Créer le lien</button>
      </div>
    </section>

    <nav class="mb-8 flex flex-wrap gap-6 border-b border-ink-200 dark:border-ink-800">
      <button
        v-for="o in [
          { id: 'calendrier', label: `Séances (${seancesAVenir.length})` },
          { id: 'professeurs', label: `Professeurs (${profsActifs.length})` },
          { id: 'horaires', label: 'Horaires d\'ouverture de l\'orgue' }
        ]"
        :key="o.id"
        class="pb-3 text-sm font-medium transition-colors"
        :class="onglet === o.id ? 'border-b-2 border-gold text-ink-900 dark:text-ink-100' : 'text-ink-500 hover:text-ink-900 dark:hover:text-ink-100'"
        @click="onglet = o.id as typeof onglet"
      >
        {{ o.label }}
      </button>
    </nav>

    <p v-if="pending && !data" class="text-sm text-ink-500">Chargement…</p>

    <!-- SÉANCES -->
    <section v-else-if="onglet === 'calendrier' && data" class="space-y-10">
      <p class="text-sm text-ink-500">
        Cliquez un jour : les séances inscrites s'affichent avec leur détail, et un créneau libre ouvre la fiche
        d'inscription d'un élève. L'association n'est pas tenue par le délai de deux jours.
      </p>

      <MomentsCreneaux association :contexte="contexte" :envoyer="inscrireEleve" @inscrit="inscrit" @echec="refresh()">
        <template #pris="{ creneau, date }">
          <template v-for="s in [seanceDu(date, creneau.debut)]" :key="s?.id ?? creneau.debut">
            <div v-if="s" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-text-secondary">{{ heureFr(creneau.debut) }}</span>
                <span class="text-right font-medium text-text-primary">{{ s.eleve_prenom }} {{ s.eleve_nom }}</span>
              </div>
              <div class="mt-1 text-xs text-text-secondary">
                Inscrit·e par {{ inscritPar(s) }}<template v-if="s.eleve_email"> · {{ s.eleve_email }}</template>
              </div>
              <p v-if="s.programme" class="mt-1 text-xs text-text-secondary/80">{{ s.programme }}</p>
              <button class="mt-2 text-xs text-rose-300 underline-offset-4 hover:underline" :disabled="busy" @click="annulerSeance(s)">
                Annuler la séance
              </button>
            </div>
          </template>
        </template>
      </MomentsCreneaux>

      <div v-if="seancesPassees.length">
        <h2 class="mb-4 font-display text-xl">Séances passées</h2>
        <ul class="space-y-1.5 text-sm text-ink-500">
          <li v-for="s in seancesPassees.slice(0, 20)" :key="s.id">
            {{ jourLong(s.date) }} · {{ heureFr(s.heure_debut) }} — {{ s.eleve_prenom }} {{ s.eleve_nom }}
            ({{ inscritPar(s) }})
          </li>
        </ul>
      </div>
    </section>

    <!-- PROFESSEURS -->
    <section v-else-if="onglet === 'professeurs' && data">
      <p v-if="!data?.professeurs.length" class="text-sm text-ink-500">Aucun professeur pour le moment : ils apparaissent ici dès qu'ils ouvrent le lien.</p>
      <ul v-else class="space-y-2">
        <li v-for="p in data.professeurs" :key="p.id" class="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
          <div>
            <div>
              <span class="font-medium">{{ p.prenom }} {{ p.nom }}</span>
              <span class="ml-3 text-ink-500">{{ p.email }}</span>
              <span v-if="!p.actif" class="ml-3 text-ink-400">désactivé</span>
            </div>
            <div class="mt-1 text-ink-500">
              <template v-if="p.conservatoire">{{ p.conservatoire }} · </template>
              {{ seancesDe(p.id) }} séance(s) · dernière visite : {{ quandCourt(p.derniere_connexion_at) }}
            </div>
          </div>
          <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="basculerProf(p)">
            {{ p.actif ? 'Désactiver' : 'Réactiver' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- HORAIRES D'OUVERTURE DE L'ORGUE -->
    <AdminHoraires
      v-else-if="data"
      :horaires="data.horaires"
      :seances="data.seances"
      :aujourdhui="data.aujourdhui"
      @modifie="refresh()"
    />
  </div>
</template>
