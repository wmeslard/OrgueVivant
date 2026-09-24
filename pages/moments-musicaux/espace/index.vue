<script setup lang="ts">
/**
 * Espace des personnes entrées par le lien : les prochains jeudis en liste.
 * Un jeudi libre se réserve d'un bouton, qui ouvre un panneau — monté du bas
 * de l'écran sur téléphone — pour jouer soi-même ou inscrire quelqu'un, seul
 * ou avec d'autres musiciens. Ses propres séances se modifient ou s'annulent
 * depuis la même liste.
 */
import type { SeanceProf } from '~/composables/useMomentsEspace'
import {
  HORIZON_MOIS, INSTRUMENT_PAR_DEFAUT, JOUR_MOMENTS, MAX_MUSICIENS, annulable, creneauxDuJour, heureFr, lierNoms,
  musiciensDe, nomsComplets, nomsPublics, parseYmd, plusJours, plusMois, ymd, type CreneauJour, type Musicien
} from '~/utils/moments'

definePageMeta({ middleware: 'professeur', layout: 'default' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger, quitter, aVenir, passees } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.dashboardTitle')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

function formater(date: string, options: Intl.DateTimeFormatOptions) {
  const s = parseYmd(date).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', options)
  // « Jeudi 1er octobre » : en français, le premier du mois s'écrit ainsi.
  const f = locale.value === 'fr' && options.day ? s.replace(/^(\S+ )?1 /, '$11er ') : s
  return f.charAt(0).toUpperCase() + f.slice(1)
}
const jourLong = (date: string) => formater(date, { weekday: 'long', day: 'numeric', month: 'long' })
const jourAnnee = (date: string) => formater(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ── Les jeudis ───────────────────────────────────────────────────────────────
interface Jeudi { date: string; creneau?: CreneauJour; seance?: SeanceProf }

const jeudis = computed<Jeudi[]>(() => {
  const e = espace.value
  if (!e) return []
  const contexte = { aujourdhui: e.aujourdhui, horaires: e.horaires, pris: e.pris }
  const d = parseYmd(e.aujourdhui)
  d.setDate(d.getDate() + ((JOUR_MOMENTS - d.getDay() + 7) % 7))
  const fin = plusMois(e.aujourdhui, HORIZON_MOIS)
  const out: Jeudi[] = []
  for (let s = ymd(d); s <= fin; s = plusJours(s, 7)) {
    out.push({ date: s, creneau: creneauxDuJour(s, contexte)[0], seance: aVenir.value.find(x => x.date === s) })
  }
  return out
})

/** Dix jeudis d'abord : l'essentiel tient sur un écran de téléphone. */
const NB_INITIAL = 10
const tout = ref(false)
const parMois = computed(() => {
  const groupes: { titre: string; jeudis: Jeudi[] }[] = []
  for (const j of tout.value ? jeudis.value : jeudis.value.slice(0, NB_INITIAL)) {
    const titre = formater(j.date, { month: 'long', year: 'numeric' })
    if (groupes.at(-1)?.titre !== titre) groupes.push({ titre, jeudis: [] })
    groupes.at(-1)!.jeudis.push(j)
  }
  return groupes
})

// ── Inscription ──────────────────────────────────────────────────────────────
// Le dernier choix (« je joue » ou « quelqu'un ») est retenu sur ce navigateur.
const CLE_CHOIX = 'ov_moments_pour_soi'
const fiche = ref<{ date: string; heure: string } | null>(null)
const vide = (instrument = ''): Musicien => ({ prenom: '', nom: '', instrument })
const form = reactive({
  pourSoi: false,
  /** Son propre instrument, en « Je joue moi-même ». */
  soi: vide(INSTRUMENT_PAR_DEFAUT),
  /** Le premier musicien, en « J'inscris quelqu'un ». */
  premier: vide(INSTRUMENT_PAR_DEFAUT),
  /** Les musiciens ajoutés, communs aux deux modes. */
  autres: [] as Musicien[],
  programme: '',
  consentement: false
})
const envoi = ref(false)
const erreur = ref('')

const moi = computed<Musicien>(() => ({
  prenom: espace.value?.professeur.prenom ?? '', nom: espace.value?.professeur.nom ?? '', instrument: form.soi.instrument
}))
const rempli = (m: Musicien) => !!(m.prenom.trim() || m.nom.trim())
/** Les musiciens d'un mode, tuiles laissées vides exclues. */
const musiciensDu = (pourSoi: boolean) => [pourSoi ? moi.value : form.premier, ...form.autres].filter(rempli)
/** « Le site affichera « Salomé G. & Marie D. ». » */
const apercu = (pourSoi: boolean) => {
  const ms = musiciensDu(pourSoi).filter(m => m.prenom.trim())
  return ms.length ? t('momentsEspace.studentNameHint', { nom: nomsPublics(ms) }) : t('momentsEspace.studentNameHintEmpty')
}
/** Le texte de la case d'accord suit le mode et le nombre de musiciens. */
const accord = (pourSoi: boolean) => pourSoi
  ? t(form.autres.length ? 'momentsEspace.consentMePlus' : 'momentsEspace.consentMe')
  : t(form.autres.length ? 'momentsEspace.consentPlural' : 'momentsEspace.consent')
const libelleBouton = computed(() => {
  const n = 1 + form.autres.length
  if (form.pourSoi) return t(n > 1 ? 'momentsEspace.confirmUs' : 'momentsEspace.confirmMe')
  if (n === 2) return t('momentsEspace.confirmDuo')
  if (n === 3) return t('momentsEspace.confirmTrio')
  if (n > 3) return t('momentsEspace.confirmMany', { n })
  return form.premier.prenom.trim() ? t('momentsEspace.confirmStudent', { prenom: form.premier.prenom.trim() }) : t('momentsEspace.confirm')
})

/** Classes d'un des deux modes superposés : celui qui n'est pas choisi garde sa place, invisible. */
const couche = (visible: boolean) => ['col-start-1 row-start-1', visible ? '' : 'invisible']

function ouvrir(j: Jeudi) {
  if (!j.creneau) return
  let pourSoi = false
  try { pourSoi = localStorage.getItem(CLE_CHOIX) === '1' } catch { /* stockage indisponible */ }
  Object.assign(form, {
    pourSoi, soi: vide(INSTRUMENT_PAR_DEFAUT), premier: vide(INSTRUMENT_PAR_DEFAUT), autres: [], programme: '', consentement: false
  })
  erreur.value = ''
  fiche.value = { date: j.date, heure: j.creneau.debut }
}

function choisir(pourSoi: boolean) {
  form.pourSoi = pourSoi
  erreur.value = ''
  try { localStorage.setItem(CLE_CHOIX, pourSoi ? '1' : '0') } catch { /* stockage indisponible */ }
}

async function inscrire() {
  if (!fiche.value) return
  erreur.value = ''
  const musiciens = musiciensDu(form.pourSoi)
  const incomplet = (m: Musicien) => !m.prenom.trim() || !m.nom.trim()
  if ((!form.pourSoi && incomplet(form.premier)) || form.autres.filter(rempli).some(incomplet)) {
    erreur.value = t('momentsAcces.errorRequired'); return
  }
  if (!form.consentement) { erreur.value = t('momentsEspace.errorConsent'); return }
  envoi.value = true
  try {
    await $fetch('/api/moments/seances', {
      method: 'POST',
      body: { date: fiche.value.date, heure_debut: fiche.value.heure, programme: form.programme, pour_soi: form.pourSoi, musiciens }
    })
    const date = jourLong(fiche.value.date)
    fiche.value = null
    await charger(true)
    showToast(form.pourSoi
      ? t('momentsEspace.bookedMe', { date })
      : musiciens.length > 1
        ? t('momentsEspace.bookedGroup', { noms: lierNoms(musiciens.map(m => m.prenom.trim())), date })
        : t('momentsEspace.bookedStudent', { nom: musiciens[0].prenom.trim(), date }), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
    // Le jeudi vient peut-être d'être pris : la liste est rechargée.
    await charger(true)
  } finally { envoi.value = false }
}

// ── Séances inscrites ────────────────────────────────────────────────────────
const busy = ref(false)
const edition = ref<{ id: string; date: string; heure_debut: string; programme: string | null } | null>(null)

async function enregistrer() {
  if (!edition.value) return
  busy.value = true; erreur.value = ''
  try {
    await $fetch(`/api/moments/seances/${edition.value.id}`, { method: 'PATCH', body: { programme: edition.value.programme ?? '' } })
    edition.value = null
    await charger(true)
    showToast(t('momentsEspace.saved'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
  } finally { busy.value = false }
}

async function annuler(s: { id: string }) {
  if (!confirm(t('momentsEspace.confirmCancel'))) return
  busy.value = true
  try {
    await $fetch(`/api/moments/seances/${s.id}`, { method: 'DELETE' })
    await charger(true)
    showToast(t('momentsEspace.cancelled'), { type: 'success' })
  } catch (e: any) {
    showToast(e?.data?.statusMessage || t('momentsAcces.errorGeneric'), { type: 'error' })
  } finally { busy.value = false }
}

// ── Mes informations ─────────────────────────────────────────────────────────
const profil = ref<{ prenom: string; nom: string; email: string; conservatoire: string } | null>(null)
const erreurProfil = ref('')

function ouvrirProfil() {
  const p = espace.value?.professeur
  if (!p) return
  profil.value = { prenom: p.prenom, nom: p.nom, email: p.email, conservatoire: p.conservatoire ?? '' }
  erreurProfil.value = ''
}

async function enregistrerProfil() {
  const p = profil.value
  if (!p) return
  erreurProfil.value = ''
  if (!p.prenom.trim() || !p.nom.trim() || !p.email.trim()) { erreurProfil.value = t('momentsAcces.errorRequired'); return }
  if (!/^\S+@\S+\.\S+$/.test(p.email.trim())) { erreurProfil.value = t('momentsAcces.errorEmail'); return }
  busy.value = true
  try {
    await $fetch('/api/moments/profil', { method: 'PATCH', body: p })
    profil.value = null
    await charger(true)
    showToast(t('momentsEspace.profileSaved'), { type: 'success' })
  } catch (e: any) {
    erreurProfil.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
  } finally { busy.value = false }
}

async function logout() {
  await quitter()
  await navigateTo(localePath('/moments-musicaux'))
}
</script>

<template>
  <div class="container-premium py-16 md:py-20 bg-background">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="heading-section mt-3 text-text-primary">{{ t('momentsEspace.dashboardTitle') }}</h1>
        <p v-if="espace" class="mt-2 text-sm text-text-secondary">
          {{ espace.professeur.prenom }} {{ espace.professeur.nom }} ·
          <button class="text-gold underline-offset-4 hover:underline" @click="ouvrirProfil">{{ t('momentsEspace.editProfile') }}</button>
        </p>
      </div>
      <button class="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline" @click="logout">
        {{ t('momentsEspace.logout') }}
      </button>
    </header>

    <p class="mb-8 max-w-2xl text-sm text-text-secondary">{{ t('momentsEspace.chooseDateHint') }}</p>

    <!-- Les jeudis -->
    <div class="max-w-2xl space-y-8">
      <section v-for="m in parMois" :key="m.titre">
        <h2 class="mb-3 font-display text-xl font-light text-text-primary">{{ m.titre }}</h2>
        <ul class="space-y-2">
          <li
            v-for="j in m.jeudis"
            :key="j.date"
            class="rounded-2xl border px-4 py-3.5"
            :class="j.seance ? 'border-gold/50 bg-gold/10'
              : j.creneau?.etat === 'libre' ? 'border-white/15 bg-surface' : 'border-white/5 bg-transparent'"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-[15px] font-medium" :class="j.creneau?.etat === 'libre' || j.seance ? 'text-text-primary' : 'text-text-secondary'">
                  {{ jourLong(j.date) }}
                </div>
                <div class="mt-0.5 text-sm">
                  <template v-if="j.seance">
                    <span class="text-text-primary">{{ nomsComplets(musiciensDe(j.seance)) }}</span>
                    <span class="text-gold"> · {{ j.seance.pour_soi ? t('momentsEspace.you') : t('momentsEspace.yourStudent') }}</span>
                  </template>
                  <span v-else-if="!j.creneau" class="text-text-secondary">{{ t('momentsEspace.noSession') }}</span>
                  <span v-else-if="j.creneau.etat === 'pris'" class="text-text-secondary">{{ j.creneau.interprete }}</span>
                  <template v-else-if="j.creneau.etat === 'passe'">
                    <span class="text-gold/80">{{ j.creneau.interprete }}</span>
                    <span class="text-text-secondary"> · {{ t('momentsEspace.tooLate') }}</span>
                  </template>
                  <span v-else class="text-text-secondary">{{ t('momentsEspace.freeDefault', { nom: j.creneau.interprete }) }}</span>
                </div>
                <p v-if="j.seance?.programme" class="mt-1 text-xs font-light text-text-secondary">{{ j.seance.programme }}</p>
              </div>
              <button
                v-if="!j.seance && j.creneau?.etat === 'libre'"
                class="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-background transition hover:bg-gold-light"
                @click="ouvrir(j)"
              >
                {{ t('momentsEspace.signUp') }}
              </button>
            </div>
            <div v-if="j.seance" class="mt-3 flex gap-5 border-t border-white/5 pt-3 text-sm">
              <button class="text-gold underline-offset-4 hover:underline" @click="edition = { ...j.seance }; erreur = ''">
                {{ t('momentsEspace.edit') }}
              </button>
              <button
                v-if="annulable(j.seance.date, j.seance.heure_debut)"
                class="text-text-secondary underline-offset-4 hover:underline"
                :disabled="busy"
                @click="annuler(j.seance)"
              >
                {{ t('momentsEspace.cancelSession') }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <button
        v-if="!tout && jeudis.length > NB_INITIAL"
        class="text-sm text-gold underline-offset-4 hover:underline"
        @click="tout = true"
      >
        {{ t('momentsEspace.showMore') }}
      </button>
    </div>

    <section v-if="passees.length" class="mt-14 max-w-2xl border-t border-white/5 pt-8">
      <h2 class="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.history') }}</h2>
      <ul class="space-y-1.5 text-sm text-text-secondary">
        <li v-for="s in passees.slice(0, 12)" :key="s.id">
          {{ jourAnnee(s.date) }} · {{ heureFr(s.heure_debut) }} — {{ nomsComplets(musiciensDe(s)) }}
        </li>
      </ul>
    </section>

    <!-- Panneau d'inscription : du bas de l'écran sur téléphone, centré ailleurs -->
    <Teleport to="body">
      <div
        v-if="fiche && espace"
        class="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        @click.self="fiche = null"
      >
        <div class="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-white/10 bg-surface sm:max-w-md sm:rounded-3xl">
          <div class="overflow-y-auto px-6 pb-7 pt-3 sm:pt-7">
            <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div class="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              {{ jourLong(fiche.date) }} · {{ heureFr(fiche.heure) }}
            </div>

            <!-- Qui joue ? -->
            <div class="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/5 p-1 text-sm">
              <button
                v-for="c in [{ soi: true, label: t('momentsEspace.forMe') }, { soi: false, label: t('momentsEspace.forStudent') }]"
                :key="String(c.soi)"
                type="button"
                class="rounded-xl border px-2 py-2.5 transition"
                :class="form.pourSoi === c.soi ? 'border-gold/40 bg-background text-text-primary' : 'border-transparent text-text-secondary'"
                @click="choisir(c.soi)"
              >
                {{ c.label }}
              </button>
            </div>

            <!--
              Ce qui diffère d'un mode à l'autre est superposé, l'un des deux
              invisible : le panneau garde sa hauteur quand on change de mode.
            -->
            <div class="mt-5 grid">
              <MomentsTuileMusicien
                v-model="form.soi"
                :class="couche(form.pourSoi)"
                :titre="t('momentsEspace.youTile')"
                ident="m0s"
                :fixe="espace.professeur"
                @profil="ouvrirProfil"
              />
              <MomentsTuileMusicien
                v-model="form.premier"
                :class="couche(!form.pourSoi)"
                :titre="t('momentsEspace.musicianN', { n: 1 })"
                ident="m0"
              />
            </div>
            <MomentsTuileMusicien
              v-for="(m, i) in form.autres"
              :key="i"
              v-model="form.autres[i]"
              class="mt-3"
              :titre="t('momentsEspace.musicianN', { n: i + 2 })"
              :ident="`m${i + 1}`"
              retirable
              @retirer="form.autres.splice(i, 1)"
            />
            <button
              v-if="form.autres.length < MAX_MUSICIENS - 1"
              type="button"
              class="mt-3 text-sm text-gold underline-offset-4 hover:underline"
              @click="form.autres.push(vide())"
            >
              {{ t('momentsEspace.addMusician') }}
            </button>
            <p class="mt-2 grid text-xs text-text-secondary">
              <span :class="couche(form.pourSoi)">{{ apercu(true) }}</span>
              <span :class="couche(!form.pourSoi)">{{ apercu(false) }}</span>
            </p>

            <label class="label mt-6" for="prog">
              {{ t('momentsEspace.programme') }}
              <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
            </label>
            <textarea
              id="prog"
              v-model="form.programme"
              rows="2"
              maxlength="600"
              class="input resize-y text-base"
              :placeholder="t('momentsEspace.programmePlaceholder')"
            />
            <p class="mt-2 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>

            <label class="mt-7 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-text-secondary">
              <input v-model="form.consentement" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-gold">
              <span class="grid">
                <span :class="couche(form.pourSoi)">{{ accord(true) }}</span>
                <span :class="couche(!form.pourSoi)">{{ accord(false) }}</span>
              </span>
            </label>
            <p v-if="erreur" class="mt-4 text-sm text-red-400">{{ erreur }}</p>
          </div>

          <!-- Bouton toujours visible en bas du panneau -->
          <div class="flex gap-3 border-t border-white/10 px-6 pb-6 pt-4">
            <button type="button" class="rounded-full px-4 py-3 text-sm text-text-secondary" @click="fiche = null">{{ t('momentsEspace.cancel') }}</button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-[15px] font-medium text-background transition hover:bg-gold-light disabled:opacity-60"
              :disabled="envoi"
              @click="inscrire"
            >
              <Icon v-if="envoi" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ libelleBouton }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Programme d'une séance -->
    <Teleport to="body">
      <div
        v-if="edition"
        class="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        @click.self="edition = null"
      >
        <div class="w-full rounded-t-3xl border border-white/10 bg-surface px-6 pb-6 pt-3 sm:max-w-md sm:rounded-3xl sm:pt-6">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div class="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
            {{ jourLong(edition.date) }} · {{ heureFr(edition.heure_debut) }}
          </div>
          <label class="label mt-4" for="progm">{{ t('momentsEspace.programme') }}</label>
          <textarea id="progm" v-model="edition.programme" rows="3" maxlength="600" class="input resize-y text-base" />
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>
          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-5 flex gap-3">
            <button type="button" class="rounded-full px-4 py-3 text-sm text-text-secondary" @click="edition = null">{{ t('momentsEspace.cancel') }}</button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-[15px] font-medium text-background transition hover:bg-gold-light disabled:opacity-60"
              :disabled="busy"
              @click="enregistrer"
            >
              <Icon v-if="busy" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ t('momentsEspace.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mes informations : ouvert depuis l'en-tête ou le panneau d'inscription -->
    <Teleport to="body">
      <div
        v-if="profil"
        class="fixed inset-0 z-[210] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        @click.self="profil = null"
      >
        <div class="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-surface px-6 pb-6 pt-3 sm:max-w-md sm:rounded-3xl sm:pt-7">
          <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <h2 class="font-display text-2xl font-light text-text-primary">{{ t('momentsEspace.profileTitle') }}</h2>
          <label class="label mt-6" for="pp">{{ t('momentsAcces.firstName') }}</label>
          <input id="pp" v-model="profil.prenom" maxlength="80" class="input text-base" autocomplete="given-name">
          <label class="label mt-5" for="pn">{{ t('momentsAcces.lastName') }}</label>
          <input id="pn" v-model="profil.nom" maxlength="80" class="input text-base" autocomplete="family-name">
          <label class="label mt-5" for="pe">{{ t('momentsAcces.email') }}</label>
          <input id="pe" v-model="profil.email" type="email" inputmode="email" maxlength="254" class="input text-base" autocomplete="email">
          <p class="mt-2 text-xs text-text-secondary">{{ t('momentsAcces.emailHint') }}</p>
          <label class="label mt-5" for="pc">
            {{ t('momentsAcces.school') }}
            <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
          </label>
          <input id="pc" v-model="profil.conservatoire" maxlength="160" class="input text-base">
          <p v-if="erreurProfil" class="mt-4 text-sm text-red-400">{{ erreurProfil }}</p>
          <div class="mt-7 flex gap-3">
            <button type="button" class="rounded-full px-4 py-3 text-sm text-text-secondary" @click="profil = null">{{ t('momentsEspace.cancel') }}</button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-[15px] font-medium text-background transition hover:bg-gold-light disabled:opacity-60"
              :disabled="busy"
              @click="enregistrerProfil"
            >
              <Icon v-if="busy" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ t('momentsEspace.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
