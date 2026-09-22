<script setup lang="ts">
/**
 * Moments musicaux : demandes d'accès des professeurs, séances inscrites,
 * professeurs, emploi du temps de l'orgue et périodes d'indisponibilité.
 *
 * Contrairement au site public, l'administration voit tout : le nom complet de
 * l'élève, et le professeur qui l'a inscrit.
 */
import { creneauxDuJour, heureFr, type Fermeture, type Horaire } from '~/utils/moments'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { t } = useI18n()
const { show: showToast } = useToast()

interface Demande {
  id: string
  prenom: string; nom: string; email: string
  telephone: string | null; conservatoire: string | null; message: string | null
  statut: 'en_attente' | 'acceptee' | 'refusee'
  message_reponse: string | null; decided_at: string | null; created_at: string
}
interface Professeur {
  id: string; prenom: string; nom: string; email: string
  conservatoire: string | null; actif: boolean; derniere_connexion_at: string | null; created_at: string
}
interface Seance {
  id: string; date: string; heure_debut: string; heure_fin: string
  eleve_prenom: string; eleve_nom: string; eleve_email: string | null; programme: string | null
  statut: 'reservee' | 'annulee'; annulee_par: 'professeur' | 'admin' | null
  professeur_id: string
  professeur?: { prenom: string; nom: string; email: string } | null
}
interface Vue {
  aujourdhui: string
  demandes: Demande[]
  professeurs: Professeur[]
  fermetures: (Fermeture & { id: string })[]
  seances: Seance[]
  horaires: (Horaire & { id: string })[]
  lienProfesseurs: string
}

const { data, refresh, pending } = await useFetch<Vue>('/api/admin/moments')

const onglet = ref<'demandes' | 'calendrier' | 'professeurs' | 'horaires'>('demandes')
const busy = ref(false)
const erreur = ref('')

const enAttente = computed(() => data.value?.demandes.filter(d => d.statut === 'en_attente') ?? [])
const traitees = computed(() => data.value?.demandes.filter(d => d.statut !== 'en_attente') ?? [])
const seancesAVenir = computed(() =>
  (data.value?.seances ?? [])
    .filter(s => s.statut === 'reservee' && s.date >= (data.value?.aujourdhui ?? ''))
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure_debut.localeCompare(b.heure_debut))
)
const seancesPassees = computed(() =>
  (data.value?.seances ?? [])
    .filter(s => s.statut === 'reservee' && s.date < (data.value?.aujourdhui ?? ''))
    .sort((a, b) => b.date.localeCompare(a.date))
)
const profsActifs = computed(() => data.value?.professeurs.filter(p => p.actif) ?? [])

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
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

// ── Demandes ─────────────────────────────────────────────────────────────────
const ouverte = ref<Demande | null>(null)
const reponse = ref('')
function ouvrir(d: Demande) { ouverte.value = d; reponse.value = ''; erreur.value = '' }

async function decider(decision: 'acceptee' | 'refusee') {
  const d = ouverte.value
  if (!d) return
  if (decision === 'refusee' && !confirm(`Refuser la demande de ${d.prenom} ${d.nom} ?`)) return
  await action(
    () => $fetch(`/api/admin/moments/demandes/${d.id}`, { method: 'PATCH', body: { decision, message: reponse.value } }),
    decision === 'acceptee' ? 'Accès ouvert, email envoyé.' : 'Demande refusée.'
  )
  if (!erreur.value) ouverte.value = null
}
async function supprimerDemande(d: Demande) {
  if (!confirm(`Supprimer définitivement la demande de ${d.prenom} ${d.nom} ?`)) return
  await action(() => $fetch(`/api/admin/moments/demandes/${d.id}`, { method: 'DELETE' }), 'Demande supprimée.')
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

// ── Séances ──────────────────────────────────────────────────────────────────
const nouvelle = reactive({ date: '', heure_debut: '', professeur_id: '', eleve_prenom: '', eleve_nom: '', eleve_email: '', programme: '' })
const creneauxDispo = computed(() => {
  if (!data.value || !nouvelle.date) return []
  return creneauxDuJour(nouvelle.date, {
    aujourdhui: nouvelle.date,
    horaires: data.value.horaires,
    fermetures: data.value.fermetures,
    pris: data.value.seances.filter(s => s.statut === 'reservee')
      .map(s => ({ date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: `${s.eleve_prenom} ${s.eleve_nom}` }))
  })
})

async function ajouterSeance() {
  if (!nouvelle.date || !nouvelle.heure_debut || !nouvelle.professeur_id || !nouvelle.eleve_prenom || !nouvelle.eleve_nom) return
  await action(() => $fetch('/api/admin/moments/seances', { method: 'POST', body: { ...nouvelle } }), 'Séance ajoutée.')
  if (!erreur.value) Object.assign(nouvelle, { date: '', heure_debut: '', professeur_id: '', eleve_prenom: '', eleve_nom: '', eleve_email: '', programme: '' })
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

// ── Emploi du temps ──────────────────────────────────────────────────────────
const nouvelHoraire = reactive({ jour_semaine: 2, type: 'blocage' as 'ouverture' | 'blocage', heure_debut: '', heure_fin: '', motif: '' })
async function ajouterHoraire() {
  if (!nouvelHoraire.heure_debut || !nouvelHoraire.heure_fin) return
  await action(() => $fetch('/api/admin/moments/horaires', { method: 'POST', body: { ...nouvelHoraire } }), 'Horaire enregistré.')
  if (!erreur.value) Object.assign(nouvelHoraire, { heure_debut: '', heure_fin: '', motif: '' })
}
async function supprimerHoraire(h: Horaire & { id: string }) {
  await action(() => $fetch(`/api/admin/moments/horaires/${h.id}`, { method: 'DELETE' }), 'Horaire supprimé.')
}

// ── Fermetures ───────────────────────────────────────────────────────────────
const nouvelleFermeture = reactive({ date_debut: '', date_fin: '', motif: '' })
async function ajouterFermeture() {
  if (!nouvelleFermeture.date_debut) return
  if (!nouvelleFermeture.date_fin) nouvelleFermeture.date_fin = nouvelleFermeture.date_debut
  const touchees = seancesAVenir.value.filter(s => s.date >= nouvelleFermeture.date_debut && s.date <= nouvelleFermeture.date_fin)
  if (touchees.length && !confirm(`${touchees.length} séance(s) dans cette période seront annulées, professeurs et élèves prévenus. Continuer ?`)) return
  await action(() => $fetch('/api/admin/moments/fermetures', { method: 'POST', body: { ...nouvelleFermeture } }), 'Période enregistrée.')
  if (!erreur.value) Object.assign(nouvelleFermeture, { date_debut: '', date_fin: '', motif: '' })
}
async function supprimerFermeture(f: Fermeture & { id: string }) {
  await action(() => $fetch(`/api/admin/moments/fermetures/${f.id}`, { method: 'DELETE' }), 'Période supprimée.')
}
</script>

<template>
  <div class="container-apple py-20">
    <header class="mb-10">
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ t('admin.moments') }}</h1>
    </header>

    <AdminNav />

    <!-- Lien à diffuser aux conservatoires -->
    <section class="mb-10 rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="mb-1 font-display text-xl">Lien pour les professeurs</h2>
      <p class="mb-4 text-sm text-ink-500">
        À diffuser aux conservatoires et aux professeurs d'orgue. L'adresse est publique : c'est votre validation,
        et non le secret du lien, qui protège l'inscription des élèves.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <input :value="data?.lienProfesseurs ?? ''" readonly class="input min-w-[18rem] flex-1 font-mono text-xs">
        <button class="btn-primary" :disabled="!data?.lienProfesseurs" @click="copierLien">{{ copie ? 'Copié' : 'Copier' }}</button>
      </div>
    </section>

    <nav class="mb-8 flex flex-wrap gap-6 border-b border-ink-200 dark:border-ink-800">
      <button
        v-for="o in [
          { id: 'demandes', label: `Demandes${enAttente.length ? ` (${enAttente.length})` : ''}` },
          { id: 'calendrier', label: `Séances (${seancesAVenir.length})` },
          { id: 'professeurs', label: `Professeurs (${profsActifs.length})` },
          { id: 'horaires', label: 'Emploi du temps' }
        ]"
        :key="o.id"
        class="pb-3 text-sm font-medium transition-colors"
        :class="onglet === o.id ? 'border-b-2 border-gold text-ink-900 dark:text-ink-100' : 'text-ink-500 hover:text-ink-900 dark:hover:text-ink-100'"
        @click="onglet = o.id as typeof onglet"
      >
        {{ o.label }}
      </button>
    </nav>

    <p v-if="pending" class="text-sm text-ink-500">Chargement…</p>

    <!-- DEMANDES -->
    <section v-else-if="onglet === 'demandes'">
      <h2 class="mb-4 text-sm font-medium text-ink-500">En attente</h2>
      <p v-if="!enAttente.length" class="mb-10 text-sm text-ink-500">Aucune demande en attente.</p>
      <ul v-else class="mb-10 space-y-3">
        <li v-for="d in enAttente" :key="d.id" class="rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div class="font-medium">{{ d.prenom }} {{ d.nom }}</div>
              <div class="text-sm text-ink-500">
                {{ d.email }}<template v-if="d.telephone"> · {{ d.telephone }}</template>
                <template v-if="d.conservatoire"> · {{ d.conservatoire }}</template>
              </div>
            </div>
            <button class="btn-primary" @click="ouvrir(d)">Examiner</button>
          </div>
          <p v-if="d.message" class="mt-3 line-clamp-2 text-sm text-ink-500">{{ d.message }}</p>
        </li>
      </ul>

      <template v-if="traitees.length">
        <h2 class="mb-4 text-sm font-medium text-ink-500">Traitées</h2>
        <ul class="space-y-2">
          <li v-for="d in traitees" :key="d.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
            <span>
              <span class="font-medium">{{ d.prenom }} {{ d.nom }}</span>
              <span class="ml-2 text-ink-500">{{ d.email }}</span>
            </span>
            <span class="flex items-center gap-3">
              <span :class="d.statut === 'acceptee' ? 'text-emerald-600' : 'text-ink-500'">
                {{ d.statut === 'acceptee' ? 'Acceptée' : 'Refusée' }}
              </span>
              <button class="text-ink-400 underline-offset-4 hover:underline" @click="supprimerDemande(d)">Supprimer</button>
            </span>
          </li>
        </ul>
      </template>
    </section>

    <!-- SÉANCES -->
    <section v-else-if="onglet === 'calendrier'" class="space-y-10">
      <div class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
        <h2 class="mb-1 font-display text-xl">Inscrire un élève</h2>
        <p class="mb-4 text-sm text-ink-500">Au nom d'un professeur — pour une demande reçue par téléphone, par exemple.</p>
        <div class="grid gap-4 md:grid-cols-3">
          <div>
            <label class="label">Date</label>
            <input v-model="nouvelle.date" type="date" class="input">
          </div>
          <div>
            <label class="label">Créneau</label>
            <select v-model="nouvelle.heure_debut" class="input" :disabled="!creneauxDispo.length">
              <option value="">—</option>
              <option
                v-for="c in creneauxDispo.filter(c => c.etat === 'libre' || c.etat === 'passe')"
                :key="c.debut"
                :value="c.debut"
              >
                {{ heureFr(c.debut) }} – {{ heureFr(c.fin) }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Professeur</label>
            <select v-model="nouvelle.professeur_id" class="input">
              <option value="">—</option>
              <option v-for="p in profsActifs" :key="p.id" :value="p.id">{{ p.prenom }} {{ p.nom }}</option>
            </select>
          </div>
          <div>
            <label class="label">Prénom de l'élève</label>
            <input v-model="nouvelle.eleve_prenom" maxlength="80" class="input">
          </div>
          <div>
            <label class="label">Nom de l'élève</label>
            <input v-model="nouvelle.eleve_nom" maxlength="80" class="input">
          </div>
          <div>
            <label class="label">Email de l'élève <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
            <input v-model="nouvelle.eleve_email" type="email" maxlength="254" class="input">
          </div>
          <div class="md:col-span-3">
            <label class="label">Programme <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
            <input v-model="nouvelle.programme" maxlength="600" class="input">
          </div>
        </div>
        <p v-if="nouvelle.date && !creneauxDispo.length" class="mt-3 text-sm text-red-600">Aucun créneau ce jour-là.</p>
        <button class="btn-primary mt-5" :disabled="busy" @click="ajouterSeance">Inscrire</button>
      </div>

      <div>
        <h2 class="mb-4 font-display text-xl">À venir</h2>
        <p v-if="!seancesAVenir.length" class="text-sm text-ink-500">Aucune séance inscrite.</p>
        <ul v-else class="space-y-2">
          <li v-for="s in seancesAVenir" :key="s.id" class="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
            <div>
              <div>
                <span class="font-medium">{{ jourLong(s.date) }}</span>
                <span class="ml-2 text-ink-500">{{ heureFr(s.heure_debut) }} – {{ heureFr(s.heure_fin) }}</span>
              </div>
              <div class="mt-1">
                {{ s.eleve_prenom }} {{ s.eleve_nom }}
                <span v-if="s.eleve_email" class="ml-2 text-ink-400">{{ s.eleve_email }}</span>
              </div>
              <div class="mt-0.5 text-ink-500">
                inscrit·e par {{ s.professeur ? `${s.professeur.prenom} ${s.professeur.nom}` : 'professeur supprimé' }}
              </div>
              <div v-if="s.programme" class="mt-0.5 text-ink-400">{{ s.programme }}</div>
            </div>
            <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="annulerSeance(s)">Annuler</button>
          </li>
        </ul>
      </div>

      <div v-if="seancesPassees.length">
        <h2 class="mb-4 font-display text-xl">Passées</h2>
        <ul class="space-y-1.5 text-sm text-ink-500">
          <li v-for="s in seancesPassees.slice(0, 20)" :key="s.id">
            {{ jourLong(s.date) }} · {{ heureFr(s.heure_debut) }} — {{ s.eleve_prenom }} {{ s.eleve_nom }}
            <span v-if="s.professeur">({{ s.professeur.prenom }} {{ s.professeur.nom }})</span>
          </li>
        </ul>
      </div>

      <div class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
        <h2 class="mb-1 font-display text-xl">Orgue indisponible</h2>
        <p class="mb-4 text-sm text-ink-500">
          Travaux, accord, fermeture de l'église… Aucun créneau n'est proposé sur la période, et les séances déjà
          inscrites sont annulées (professeurs et élèves prévenus).
        </p>
        <div class="grid gap-4 md:grid-cols-4">
          <div>
            <label class="label">Du</label>
            <input v-model="nouvelleFermeture.date_debut" type="date" class="input">
          </div>
          <div>
            <label class="label">Au</label>
            <input v-model="nouvelleFermeture.date_fin" type="date" :min="nouvelleFermeture.date_debut" class="input">
          </div>
          <div class="md:col-span-2">
            <label class="label">Motif <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
            <input v-model="nouvelleFermeture.motif" maxlength="200" class="input" placeholder="ex. accord de l'orgue">
          </div>
        </div>
        <button class="btn-primary mt-5" :disabled="busy || !nouvelleFermeture.date_debut" @click="ajouterFermeture">Enregistrer</button>

        <ul v-if="data?.fermetures.length" class="mt-6 space-y-2">
          <li v-for="f in data.fermetures" :key="f.id" class="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
            <span>
              {{ jourLong(f.date_debut) }}<template v-if="f.date_fin !== f.date_debut"> → {{ jourLong(f.date_fin) }}</template>
              <span v-if="f.motif" class="ml-3 text-ink-500">{{ f.motif }}</span>
            </span>
            <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="supprimerFermeture(f)">Supprimer</button>
          </li>
        </ul>
      </div>
    </section>

    <!-- PROFESSEURS -->
    <section v-else-if="onglet === 'professeurs'">
      <p v-if="!data?.professeurs.length" class="text-sm text-ink-500">Aucun professeur pour le moment.</p>
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
              {{ seancesDe(p.id) }} séance(s) · dernière connexion : {{ quandCourt(p.derniere_connexion_at) }}
            </div>
          </div>
          <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="basculerProf(p)">
            {{ p.actif ? 'Désactiver' : 'Réactiver' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- EMPLOI DU TEMPS -->
    <section v-else class="space-y-8">
      <div class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
        <h2 class="mb-1 font-display text-xl">Emploi du temps de l'orgue</h2>
        <p class="mb-4 text-sm text-ink-500">
          Les <strong>ouvertures</strong> définissent les heures où l'orgue peut être joué ; les <strong>blocages</strong>
          en retirent les messes, les confessions et tout ce qui s'y oppose. Les créneaux proposés aux professeurs se
          déduisent des deux, par demi-heures. Vérifiez ces horaires auprès de la paroisse.
        </p>
        <div class="grid gap-4 md:grid-cols-5">
          <div>
            <label class="label">Jour</label>
            <select v-model.number="nouvelHoraire.jour_semaine" class="input">
              <option v-for="(j, i) in JOURS" :key="i" :value="i">{{ j }}</option>
            </select>
          </div>
          <div>
            <label class="label">Type</label>
            <select v-model="nouvelHoraire.type" class="input">
              <option value="ouverture">Ouverture</option>
              <option value="blocage">Blocage</option>
            </select>
          </div>
          <div>
            <label class="label">De</label>
            <input v-model="nouvelHoraire.heure_debut" type="time" step="900" class="input">
          </div>
          <div>
            <label class="label">À</label>
            <input v-model="nouvelHoraire.heure_fin" type="time" step="900" class="input">
          </div>
          <div>
            <label class="label">Motif</label>
            <input v-model="nouvelHoraire.motif" maxlength="200" class="input" placeholder="ex. Messe">
          </div>
        </div>
        <button class="btn-primary mt-5" :disabled="busy" @click="ajouterHoraire">Ajouter</button>
      </div>

      <div v-for="(j, i) in JOURS" :key="i">
        <template v-if="data?.horaires.some(h => h.jour_semaine === i)">
          <h3 class="mb-2 text-sm font-medium">{{ j }}</h3>
          <ul class="mb-5 space-y-2">
            <li
              v-for="h in data.horaires.filter(h => h.jour_semaine === i)"
              :key="h.id"
              class="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm"
              :class="h.type === 'ouverture' ? 'border-emerald-600/30' : 'border-ink-200 dark:border-ink-800'"
            >
              <span>
                <span class="font-medium">{{ h.type === 'ouverture' ? 'Ouverture' : 'Blocage' }}</span>
                <span class="ml-3">{{ heureFr(h.heure_debut) }} – {{ heureFr(h.heure_fin) }}</span>
                <span v-if="h.motif" class="ml-3 text-ink-500">{{ h.motif }}</span>
              </span>
              <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="supprimerHoraire(h)">Supprimer</button>
            </li>
          </ul>
        </template>
      </div>
    </section>

    <!-- Fiche de demande -->
    <Teleport to="body">
      <div v-if="ouverte" class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10" @click.self="ouverte = null">
        <div class="w-full max-w-2xl rounded-3xl border border-ink-200 bg-white p-8 dark:border-ink-800 dark:bg-ink-900">
          <h2 class="font-display text-2xl">{{ ouverte.prenom }} {{ ouverte.nom }}</h2>
          <p class="mt-1 text-sm text-ink-500">
            {{ ouverte.email }}<template v-if="ouverte.telephone"> · {{ ouverte.telephone }}</template>
            <template v-if="ouverte.conservatoire"> · {{ ouverte.conservatoire }}</template>
          </p>
          <div v-if="ouverte.message" class="mt-6">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Sa demande</div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ ouverte.message }}</p>
          </div>

          <label class="label mt-7">Message envoyé au professeur <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
          <textarea v-model="reponse" rows="4" maxlength="4000" class="input resize-y" placeholder="Sans message, un texte par défaut est envoyé." />

          <p v-if="erreur" class="mt-3 text-sm text-red-600">{{ erreur }}</p>
          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <button class="btn-ghost" @click="ouverte = null">{{ t('admin.cancel') }}</button>
            <button class="btn-ghost" :disabled="busy" @click="decider('refusee')">Refuser</button>
            <button class="btn-primary" :disabled="busy" @click="decider('acceptee')">
              <Icon v-if="busy" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              Ouvrir l'accès
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
