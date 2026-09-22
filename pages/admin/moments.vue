<script setup lang="ts">
/**
 * Moments musicaux : candidatures des élèves organistes, calendrier des
 * séances, périodes d'indisponibilité de l'orgue et lien privé de candidature.
 */
import { estDimanche, estJeudiTitulaire, MOMENT_DEBUT, MOMENT_FIN, TITULAIRE, type Fermeture } from '~/utils/moments'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { t } = useI18n()
const { show: showToast } = useToast()

interface Candidature {
  id: string
  prenom: string; nom: string; email: string
  telephone: string | null; conservatoire: string | null; professeur: string | null; niveau: string | null
  presentation: string | null; repertoire: string | null
  statut: 'en_attente' | 'acceptee' | 'refusee'
  message_reponse: string | null
  decided_at: string | null
  created_at: string
}
interface Eleve { id: string; prenom: string; nom: string; email: string; actif: boolean }
interface Seance {
  id: string; date: string; programme: string | null
  statut: 'reservee' | 'annulee'; annulee_par: 'eleve' | 'admin' | null
  eleve?: { prenom: string; nom: string; email: string } | null
}
interface Vue {
  aujourdhui: string
  candidatures: Candidature[]
  eleves: Eleve[]
  fermetures: (Fermeture & { id: string })[]
  seances: Seance[]
  lienCandidature: string | null
}

const { data, refresh, pending } = await useFetch<Vue>('/api/admin/moments')

const onglet = ref<'candidatures' | 'calendrier' | 'eleves'>('candidatures')
const busy = ref(false)
const erreur = ref('')

const enAttente = computed(() => data.value?.candidatures.filter(c => c.statut === 'en_attente') ?? [])
const traitees = computed(() => data.value?.candidatures.filter(c => c.statut !== 'en_attente') ?? [])
const seancesAVenir = computed(() =>
  (data.value?.seances ?? [])
    .filter(s => s.statut === 'reservee' && s.date >= (data.value?.aujourdhui ?? ''))
    .sort((a, b) => a.date.localeCompare(b.date))
)
const elevesActifs = computed(() => data.value?.eleves.filter(e => e.actif) ?? [])

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function action(fn: () => Promise<unknown>, message: string) {
  busy.value = true; erreur.value = ''
  try {
    await fn()
    await refresh()
    showToast(message, { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || 'Erreur'
    showToast(erreur.value, { type: 'error' })
  } finally { busy.value = false }
}

// ── Candidatures ──────────────────────────────────────────────────────────────
const ouverte = ref<Candidature | null>(null)
const reponse = ref('')
function ouvrir(c: Candidature) { ouverte.value = c; reponse.value = ''; erreur.value = '' }

async function decider(decision: 'acceptee' | 'refusee') {
  const c = ouverte.value
  if (!c) return
  if (decision === 'refusee' && !confirm(`Refuser la candidature de ${c.prenom} ${c.nom} ?`)) return
  await action(
    () => $fetch(`/api/admin/moments/candidatures/${c.id}`, { method: 'PATCH', body: { decision, message: reponse.value } }),
    decision === 'acceptee' ? 'Candidature acceptée, invitation envoyée.' : 'Candidature refusée.'
  )
  if (!erreur.value) ouverte.value = null
}

async function supprimerCandidature(c: Candidature) {
  if (!confirm(`Supprimer définitivement la candidature de ${c.prenom} ${c.nom} ?`)) return
  await action(() => $fetch(`/api/admin/moments/candidatures/${c.id}`, { method: 'DELETE' }), 'Candidature supprimée.')
}

// ── Lien privé ────────────────────────────────────────────────────────────────
const copie = ref(false)
async function copierLien() {
  if (!data.value?.lienCandidature) return
  try {
    await navigator.clipboard.writeText(data.value.lienCandidature)
    copie.value = true
    setTimeout(() => (copie.value = false), 2000)
  } catch { /* le champ reste sélectionnable à la main */ }
}
async function regenererLien() {
  if (!confirm('Régénérer le lien ? L\'ancien cessera aussitôt de fonctionner.')) return
  await action(() => $fetch('/api/admin/moments/lien', { method: 'POST' }), 'Nouveau lien généré.')
}

// ── Séances ───────────────────────────────────────────────────────────────────
const nouvelleSeance = reactive({ date: '', eleve_id: '', programme: '' })
const seanceInvalide = computed(() => {
  const d = nouvelleSeance.date
  if (!d) return ''
  if (d < (data.value?.aujourdhui ?? '')) return 'Date passée.'
  if (estDimanche(d)) return 'Pas de séance le dimanche.'
  if (estJeudiTitulaire(d)) return `Ce jeudi revient à ${TITULAIRE}.`
  return ''
})

async function ajouterSeance() {
  if (!nouvelleSeance.date || !nouvelleSeance.eleve_id || seanceInvalide.value) return
  await action(() => $fetch('/api/admin/moments/seances', { method: 'POST', body: { ...nouvelleSeance } }), 'Séance ajoutée.')
  if (!erreur.value) { nouvelleSeance.date = ''; nouvelleSeance.eleve_id = ''; nouvelleSeance.programme = '' }
}

async function annulerSeance(s: Seance) {
  const motif = prompt(`Annuler la séance du ${jourLong(s.date)} ?\n\nMotif communiqué à l'élève (facultatif) :`)
  if (motif === null) return
  await action(() => $fetch(`/api/admin/moments/seances/${s.id}`, { method: 'DELETE', body: { motif } }), 'Séance annulée.')
}

// ── Fermetures ────────────────────────────────────────────────────────────────
const nouvelleFermeture = reactive({ date_debut: '', date_fin: '', motif: '' })
async function ajouterFermeture() {
  if (!nouvelleFermeture.date_debut) return
  if (!nouvelleFermeture.date_fin) nouvelleFermeture.date_fin = nouvelleFermeture.date_debut
  const touchees = seancesAVenir.value.filter(s => s.date >= nouvelleFermeture.date_debut && s.date <= nouvelleFermeture.date_fin)
  if (touchees.length && !confirm(`${touchees.length} séance(s) réservée(s) dans cette période seront annulées et les élèves prévenus. Continuer ?`)) return
  await action(() => $fetch('/api/admin/moments/fermetures', { method: 'POST', body: { ...nouvelleFermeture } }), 'Période enregistrée.')
  if (!erreur.value) { nouvelleFermeture.date_debut = ''; nouvelleFermeture.date_fin = ''; nouvelleFermeture.motif = '' }
}
async function supprimerFermeture(f: Fermeture & { id: string }) {
  await action(() => $fetch(`/api/admin/moments/fermetures/${f.id}`, { method: 'DELETE' }), 'Période supprimée.')
}

// ── Élèves ────────────────────────────────────────────────────────────────────
async function basculerEleve(e: Eleve) {
  if (e.actif && !confirm(`Désactiver ${e.prenom} ${e.nom} ? Ses séances à venir seront annulées.`)) return
  await action(() => $fetch(`/api/admin/moments/eleves/${e.id}`, { method: 'PATCH', body: { actif: !e.actif } }), e.actif ? 'Élève désactivé.' : 'Élève réactivé.')
}
</script>

<template>
  <div class="container-apple py-20">
    <header class="mb-10">
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ t('admin.moments') }}</h1>
    </header>

    <AdminNav />

    <!-- Lien privé de candidature -->
    <section class="mb-10 rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="mb-1 font-display text-xl">Lien de candidature</h2>
      <p class="mb-4 text-sm text-ink-500">
        À transmettre aux conservatoires et aux professeurs. La page n'est pas référencée et n'apparaît nulle part sur le site.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <input :value="data?.lienCandidature ?? ''" readonly class="input flex-1 min-w-[18rem] font-mono text-xs">
        <button class="btn-primary" :disabled="!data?.lienCandidature" @click="copierLien">
          {{ copie ? 'Copié' : 'Copier' }}
        </button>
        <button class="btn-ghost" :disabled="busy" @click="regenererLien">Régénérer</button>
      </div>
    </section>

    <nav class="mb-8 flex gap-6 border-b border-ink-200 dark:border-ink-800">
      <button
        v-for="o in [
          { id: 'candidatures', label: `Candidatures${enAttente.length ? ` (${enAttente.length})` : ''}` },
          { id: 'calendrier', label: 'Calendrier' },
          { id: 'eleves', label: `Élèves (${elevesActifs.length})` }
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

    <!-- CANDIDATURES -->
    <section v-else-if="onglet === 'candidatures'">
      <h2 class="mb-4 text-sm font-medium text-ink-500">En attente</h2>
      <p v-if="!enAttente.length" class="mb-10 text-sm text-ink-500">Aucune candidature en attente.</p>
      <ul v-else class="mb-10 space-y-3">
        <li v-for="c in enAttente" :key="c.id" class="rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div class="font-medium">{{ c.prenom }} {{ c.nom }}</div>
              <div class="text-sm text-ink-500">
                {{ c.email }}<template v-if="c.telephone"> · {{ c.telephone }}</template>
                <template v-if="c.conservatoire"> · {{ c.conservatoire }}</template>
              </div>
            </div>
            <button class="btn-primary" @click="ouvrir(c)">Examiner</button>
          </div>
          <p v-if="c.presentation" class="mt-3 line-clamp-2 text-sm text-ink-500">{{ c.presentation }}</p>
        </li>
      </ul>

      <template v-if="traitees.length">
        <h2 class="mb-4 text-sm font-medium text-ink-500">Traitées</h2>
        <ul class="space-y-2">
          <li v-for="c in traitees" :key="c.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
            <span>
              <span class="font-medium">{{ c.prenom }} {{ c.nom }}</span>
              <span class="ml-2 text-ink-500">{{ c.email }}</span>
            </span>
            <span class="flex items-center gap-3">
              <span :class="c.statut === 'acceptee' ? 'text-emerald-600' : 'text-ink-500'">
                {{ c.statut === 'acceptee' ? 'Acceptée' : 'Refusée' }}
              </span>
              <button class="text-ink-400 underline-offset-4 hover:underline" @click="supprimerCandidature(c)">Supprimer</button>
            </span>
          </li>
        </ul>
      </template>
    </section>

    <!-- CALENDRIER -->
    <section v-else-if="onglet === 'calendrier'" class="space-y-10">
      <div class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
        <h2 class="mb-1 font-display text-xl">Ajouter une séance</h2>
        <p class="mb-4 text-sm text-ink-500">
          Pour inscrire un élève à sa place. {{ MOMENT_DEBUT.replace(':', ' h ') }} – {{ MOMENT_FIN.replace(':', ' h ') }}, hors dimanches et jeudis de {{ TITULAIRE }}.
        </p>
        <div class="grid gap-4 md:grid-cols-4">
          <div>
            <label class="label">Date</label>
            <input v-model="nouvelleSeance.date" type="date" class="input">
          </div>
          <div>
            <label class="label">Élève</label>
            <select v-model="nouvelleSeance.eleve_id" class="input">
              <option value="">—</option>
              <option v-for="e in elevesActifs" :key="e.id" :value="e.id">{{ e.prenom }} {{ e.nom }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="label">Programme <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
            <input v-model="nouvelleSeance.programme" maxlength="600" class="input">
          </div>
        </div>
        <p v-if="seanceInvalide" class="mt-3 text-sm text-red-600">{{ seanceInvalide }}</p>
        <button class="btn-primary mt-5" :disabled="busy || !nouvelleSeance.date || !nouvelleSeance.eleve_id || !!seanceInvalide" @click="ajouterSeance">
          Ajouter
        </button>
      </div>

      <div>
        <h2 class="mb-4 font-display text-xl">Séances à venir</h2>
        <p v-if="!seancesAVenir.length" class="text-sm text-ink-500">Aucune séance réservée.</p>
        <ul v-else class="space-y-2">
          <li v-for="s in seancesAVenir" :key="s.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
            <span>
              <span class="font-medium">{{ jourLong(s.date) }}</span>
              <span class="ml-3 text-ink-500">{{ s.eleve ? `${s.eleve.prenom} ${s.eleve.nom}` : 'Élève supprimé' }}</span>
              <span v-if="s.programme" class="ml-3 text-ink-400">{{ s.programme }}</span>
            </span>
            <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="annulerSeance(s)">Annuler</button>
          </li>
        </ul>
      </div>

      <div class="rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
        <h2 class="mb-1 font-display text-xl">Orgue indisponible</h2>
        <p class="mb-4 text-sm text-ink-500">
          Travaux, accord, fermeture de l'église… Aucune séance ne peut être réservée sur la période, et les séances déjà prévues sont annulées (les élèves sont prévenus).
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

    <!-- ÉLÈVES -->
    <section v-else>
      <p v-if="!data?.eleves.length" class="text-sm text-ink-500">Aucun élève pour le moment.</p>
      <ul v-else class="space-y-2">
        <li v-for="e in data.eleves" :key="e.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-sm dark:border-ink-800">
          <span>
            <span class="font-medium">{{ e.prenom }} {{ e.nom }}</span>
            <span class="ml-3 text-ink-500">{{ e.email }}</span>
            <span v-if="!e.actif" class="ml-3 text-ink-400">désactivé</span>
          </span>
          <button class="text-ink-400 underline-offset-4 hover:underline" :disabled="busy" @click="basculerEleve(e)">
            {{ e.actif ? 'Désactiver' : 'Réactiver' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Fiche de candidature -->
    <Teleport to="body">
      <div v-if="ouverte" class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10" @click.self="ouverte = null">
        <div class="w-full max-w-2xl rounded-3xl border border-ink-200 bg-white p-8 dark:border-ink-800 dark:bg-ink-900">
          <h2 class="font-display text-2xl">{{ ouverte.prenom }} {{ ouverte.nom }}</h2>
          <p class="mt-1 text-sm text-ink-500">
            {{ ouverte.email }}<template v-if="ouverte.telephone"> · {{ ouverte.telephone }}</template>
          </p>
          <dl class="mt-6 grid gap-4 sm:grid-cols-3">
            <div v-if="ouverte.conservatoire">
              <dt class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Conservatoire</dt>
              <dd class="mt-1 text-sm">{{ ouverte.conservatoire }}</dd>
            </div>
            <div v-if="ouverte.professeur">
              <dt class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Professeur</dt>
              <dd class="mt-1 text-sm">{{ ouverte.professeur }}</dd>
            </div>
            <div v-if="ouverte.niveau">
              <dt class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Niveau</dt>
              <dd class="mt-1 text-sm">{{ ouverte.niveau }}</dd>
            </div>
          </dl>
          <div v-if="ouverte.presentation" class="mt-6">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Présentation</div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ ouverte.presentation }}</p>
          </div>
          <div v-if="ouverte.repertoire" class="mt-5">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-400">Répertoire envisagé</div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ ouverte.repertoire }}</p>
          </div>

          <label class="label mt-7">Message envoyé au candidat <span class="font-normal text-ink-400">({{ t('admin.optional') }})</span></label>
          <textarea v-model="reponse" rows="4" maxlength="4000" class="input resize-y" placeholder="Sans message, un texte par défaut est envoyé." />

          <p v-if="erreur" class="mt-3 text-sm text-red-600">{{ erreur }}</p>
          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <button class="btn-ghost" @click="ouverte = null">{{ t('admin.cancel') }}</button>
            <button class="btn-ghost" :disabled="busy" @click="decider('refusee')">Refuser</button>
            <button class="btn-primary" :disabled="busy" @click="decider('acceptee')">
              <Icon v-if="busy" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              Accepter et inviter
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
