<script setup lang="ts">
/**
 * Moments musicaux : le lien d'inscription, les jeudis (séances, Louis-Paul
 * Courtois, blocages) et les participants entrés par le lien.
 *
 * Contrairement au site public, l'administration voit tout : le nom complet de
 * la personne inscrite, et qui l'a inscrite.
 */
import { ORGANISTE_REGULIER, type Horaire, type Musicien } from '~/utils/moments'

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
  musiciens?: Musicien[] | null
  statut: 'reservee' | 'annulee'; annulee_par: 'professeur' | 'admin' | null
  /** Null : inscrite par l'association. */
  professeur_id: string | null
  /** La personne entrée par le lien joue elle-même. */
  pour_soi?: boolean
  rappel_at?: string | null
  professeur?: { prenom: string; nom: string; email: string } | null
}
interface Vue {
  aujourdhui: string
  professeurs: Professeur[]
  seances: Seance[]
  horaires: (Horaire & { id: string })[]
  affectations: { date: string; notifie_at: string | null }[]
  emailOrganiste: string | null
  lienProfesseurs: string | null
}

const { data, refresh, pending } = await useFetch<Vue>('/api/admin/moments')

const onglet = ref<'jeudis' | 'participants'>('jeudis')
const busy = ref(false)
const erreur = ref('')

const seancesAVenir = computed(() =>
  (data.value?.seances ?? []).filter(s => s.statut === 'reservee' && s.date >= (data.value?.aujourdhui ?? ''))
)
const actifs = computed(() => data.value?.professeurs.filter(p => p.actif) ?? [])

function quandCourt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'jamais'
}

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
    'Régénérer le lien ?\n\nL\'ancien cessera aussitôt de fonctionner, y compris pour les participants déjà entrés : '
    + 'il faudra leur transmettre le nouveau. Les séances inscrites ne changent pas.')) return
  await action(() => $fetch('/api/admin/moments/lien', { method: 'POST' }), 'Nouveau lien créé.')
}

// ── Adresse de Louis-Paul Courtois ───────────────────────────────────────────
const email = ref('')
watch(() => data.value?.emailOrganiste, v => { email.value = v ?? '' }, { immediate: true })
const enregistrerEmail = () =>
  action(() => $fetch('/api/admin/moments/reglages', { method: 'POST', body: { email_organiste: email.value } }), 'Adresse enregistrée.')

// ── Participants ─────────────────────────────────────────────────────────────
async function basculerProf(p: Professeur) {
  if (p.actif && !confirm(`Désactiver ${p.prenom} ${p.nom} ? Ses séances à venir seront annulées.`)) return
  await action(() => $fetch(`/api/admin/moments/professeurs/${p.id}`, { method: 'PATCH', body: { actif: !p.actif } }),
    p.actif ? 'Accès désactivé.' : 'Accès réactivé.')
}
function seancesDe(id: string) {
  return (data.value?.seances ?? []).filter(s => s.professeur_id === id && s.statut === 'reservee').length
}
function seancesAVenirDe(id: string) {
  return seancesAVenir.value.filter(s => s.professeur_id === id).length
}

const fiche = ref<{ id: string; prenom: string; nom: string; email: string; conservatoire: string } | null>(null)
function modifierProf(p: Professeur) {
  fiche.value = { id: p.id, prenom: p.prenom, nom: p.nom, email: p.email, conservatoire: p.conservatoire ?? '' }
}
async function enregistrerProf() {
  const f = fiche.value
  if (!f) return
  await action(() => $fetch(`/api/admin/moments/professeurs/${f.id}`, {
    method: 'PATCH', body: { prenom: f.prenom, nom: f.nom, email: f.email, conservatoire: f.conservatoire }
  }), 'Fiche enregistrée.')
  if (!erreur.value) fiche.value = null
}
async function supprimerProf(p: Professeur) {
  const n = seancesAVenirDe(p.id)
  if (!confirm(`Supprimer définitivement ${p.prenom} ${p.nom} ?\n\n`
    + `Sa fiche et toutes ses séances sont effacées${n ? `, dont ${n} à venir, retirée(s) du site sans prévenir les personnes inscrites` : ''}. `
    + 'Avec le lien, cette personne pourra revenir sous une nouvelle fiche : pour lui couper l\'accès, désactivez-la plutôt.')) return
  await action(() => $fetch(`/api/admin/moments/professeurs/${p.id}`, { method: 'DELETE' }), 'Participant supprimé.')
}
</script>

<template>
  <div class="container-apple py-20">
    <AdminHeader :titre="t('admin.moments')" />

    <AdminNav />

    <!-- Lien à transmettre -->
    <section class="mb-10 rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="mb-1 font-display text-xl">Lien d'inscription</h2>
      <p class="mb-4 text-sm text-ink-500">
        Toute personne qui ouvre ce lien peut s'inscrire ou inscrire quelqu'un : transmettez-le aux organistes, aux musiciens
        et à leurs professeurs, par email ou par message, sans le publier. S'il circule trop largement, régénérez-le —
        l'ancien cesse aussitôt de fonctionner, et les participants devront utiliser le nouveau.
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
          { id: 'jeudis', label: `Jeudis (${seancesAVenir.length} inscrit${seancesAVenir.length > 1 ? 's' : ''})` },
          { id: 'participants', label: `Participants (${actifs.length})` }
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

    <!-- JEUDIS -->
    <AdminJeudis
      v-else-if="onglet === 'jeudis' && data"
      :horaires="data.horaires"
      :seances="data.seances"
      :aujourdhui="data.aujourdhui"
      :affectations="data.affectations"
      @modifie="refresh()"
    />

    <!-- PARTICIPANTS -->
    <section v-else-if="data">
      <!-- Louis-Paul Courtois, à part : il n'entre pas par le lien -->
      <div class="mb-6 rounded-2xl border border-gold/40 bg-gold/5 p-5">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-display text-lg">{{ ORGANISTE_REGULIER }}</span>
          <span class="text-xs font-semibold uppercase tracking-wider text-gold">Organiste par défaut</span>
        </div>
        <p class="mt-1 text-sm text-ink-500">
          Joue les jeudis où personne ne s'est inscrit, et reçoit à cette adresse l'email « à vous de jouer » deux jours
          avant. Sans adresse, il est affecté quand même, mais pas prévenu.
        </p>
        <form class="mt-4 flex flex-wrap items-center gap-3" @submit.prevent="enregistrerEmail">
          <input v-model="email" type="email" maxlength="254" class="input min-w-[16rem] flex-1" placeholder="adresse@exemple.fr" aria-label="Adresse email de Louis-Paul Courtois">
          <button class="btn-primary" :disabled="busy">Enregistrer</button>
        </form>
      </div>

      <p v-if="!data.professeurs.length" class="text-sm text-ink-500">Personne pour le moment : les participants apparaissent ici dès qu'ils ouvrent le lien.</p>
      <ul v-else class="space-y-2">
        <li v-for="p in data.professeurs" :key="p.id" class="rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
          <form v-if="fiche?.id === p.id" class="grid gap-3 py-1 sm:grid-cols-2" @submit.prevent="enregistrerProf">
            <div>
              <label class="label" :for="`pp-${p.id}`">Prénom</label>
              <input :id="`pp-${p.id}`" v-model="fiche.prenom" required maxlength="80" class="input">
            </div>
            <div>
              <label class="label" :for="`pn-${p.id}`">Nom</label>
              <input :id="`pn-${p.id}`" v-model="fiche.nom" required maxlength="80" class="input">
            </div>
            <div>
              <label class="label" :for="`pe-${p.id}`">Email</label>
              <input :id="`pe-${p.id}`" v-model="fiche.email" type="email" required maxlength="254" class="input">
            </div>
            <div>
              <label class="label" :for="`pc-${p.id}`">Conservatoire <span class="font-normal text-ink-400">(facultatif)</span></label>
              <input :id="`pc-${p.id}`" v-model="fiche.conservatoire" maxlength="160" class="input">
            </div>
            <div class="flex gap-3 sm:col-span-2">
              <button type="submit" class="btn-primary" :disabled="busy">Enregistrer</button>
              <button type="button" class="btn-ghost" @click="fiche = null">Annuler</button>
            </div>
          </form>
          <div v-else class="flex flex-wrap items-start justify-between gap-3">
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
            <div class="flex gap-4">
              <button class="text-ink-500 underline-offset-4 hover:underline" :disabled="busy" @click="modifierProf(p)">Modifier</button>
              <button class="text-ink-500 underline-offset-4 hover:underline" :disabled="busy" @click="basculerProf(p)">
                {{ p.actif ? 'Désactiver' : 'Réactiver' }}
              </button>
              <button class="text-rose-400 underline-offset-4 hover:underline" :disabled="busy" @click="supprimerProf(p)">Supprimer</button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
