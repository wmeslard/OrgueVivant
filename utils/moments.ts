/**
 * Règles des Moments musicaux, partagées entre les pages, l'espace des
 * professeurs, l'admin, le flux ICS et l'API. Sans dépendance à Nuxt.
 *
 * Les Moments musicaux ont lieu le jeudi, de 13 h 15 à 13 h 45, à l'orgue de
 * chœur de Saint-Maurice. Un jeudi sur deux, Louis-Paul Courtois joue (séance
 * calculée, non stockée) ; l'autre jeudi est proposé aux élèves, inscrits par
 * leur professeur. Un blocage — par défaut ou temporaire — qui tombe sur ce
 * créneau supprime la séance, celle de Louis-Paul comprise.
 */

export const DUREE_MIN = 30
export const ORGANISTE_REGULIER = 'Louis-Paul Courtois'
/** Créneau que Louis-Paul Courtois occupe, un jeudi sur deux. */
export const CRENEAU_REGULIER = '13:15'

/** Horizon d'inscription, en mois. */
export const HORIZON_MOIS = 6
/** Délai minimal, en heures, pour inscrire ou annuler avant le début de la séance. */
export const DELAI_ANNULATION_H = 48

/**
 * Une règle d'horaires. Par défaut, elle vaut chaque semaine le jour
 * `jour_semaine` ; temporaire, elle ne vaut que du `date_debut` au `date_fin`,
 * un jour de la semaine ou tous les jours (`jour_semaine` null). Une fermeture
 * complète est un blocage temporaire de 00:00 à 24:00.
 */
export interface Horaire {
  id?: string
  jour_semaine: number | null
  type: 'ouverture' | 'blocage'
  heure_debut: string
  heure_fin: string
  motif?: string | null
  date_debut?: string | null
  date_fin?: string | null
}

/** Un créneau déjà pris, tel que le calendrier a besoin de le connaître. */
export interface CreneauPris {
  date: string
  heure_debut: string
  /** « Camille D. » — jamais le nom complet ni le professeur. */
  interprete: string
  /** Vrai si c'est le professeur connecté qui l'a inscrit. */
  mien?: boolean
}

/** Une séance publiée : Louis-Paul Courtois ou une séance inscrite. */
export interface SeancePublique {
  date: string
  debut: string
  fin: string
  type: 'regulier' | 'eleve'
  interprete: string
  programme?: string | null
  /** Identifiant de la réservation, pour les séances d'élèves. */
  id?: string
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** Numéro de semaine ISO 8601 (celui des calendriers français). */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Date locale (minuit) depuis « YYYY-MM-DD », sans passer par UTC. */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Jour de la semaine, 0 = dimanche. */
export function jourSemaine(date: string): number {
  return parseYmd(date).getDay()
}

/** Le créneau de Louis-Paul Courtois : un jeudi de semaine ISO paire. */
export function estJeudiRegulier(date: string): boolean {
  const d = parseYmd(date)
  return d.getDay() === 4 && isoWeek(d) % 2 === 0
}

/** « Camille D. » : ce que le site publie d'un élève. */
export function nomPublic(prenom: string, nom: string): string {
  const p = prenom.trim()
  const n = nom.trim()
  return n ? `${p} ${n[0].toUpperCase()}.` : p
}

/** Date locale décalée de `jours` jours, au format « YYYY-MM-DD ». */
export function plusJours(date: string, jours: number): string {
  const d = parseYmd(date)
  d.setDate(d.getDate() + jours)
  return ymd(d)
}

export function plusMois(date: string, mois: number): string {
  const d = parseYmd(date)
  d.setMonth(d.getMonth() + mois)
  return ymd(d)
}

// ── Heures ───────────────────────────────────────────────────────────────────

/** « 13:15 » ou « 13:15:00 » → minutes depuis minuit. */
export function minutes(h: string): number {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}

/** Minutes depuis minuit → « 13:15 ». */
export function heure(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** « 13:15 » → « 13 h 15 », pour l'affichage. */
export function heureFr(h: string): string {
  return h.slice(0, 5).replace(':', ' h ')
}

/** Fin d'un créneau d'une demi-heure. */
export function finCreneau(debut: string): string {
  return heure(minutes(debut) + DUREE_MIN)
}

/** Début d'un créneau en temps local (navigateur ou serveur). */
export function debutSeance(date: string, h: string): Date {
  const d = parseYmd(date)
  const [hh, mm] = h.split(':').map(Number)
  d.setHours(hh, mm, 0, 0)
  return d
}

// ── Créneaux d'un jour ───────────────────────────────────────────────────────

/** Vrai si la règle est temporaire (bornée par des dates). */
export function estTemporaire(h: Horaire): boolean {
  return !!h.date_debut
}

/** Les règles qui s'appliquent à une date : celles de son jour de semaine, et les temporaires en cours. */
export function reglesDuJour(date: string, horaires: readonly Horaire[]): Horaire[] {
  const jour = jourSemaine(date)
  return horaires.filter(h =>
    (h.jour_semaine === null || h.jour_semaine === jour)
    && (!h.date_debut || (h.date_debut <= date && date <= (h.date_fin ?? h.date_debut))))
}

/** Le jeudi, jour des Moments musicaux (convention JavaScript : 0 = dimanche). */
export const JOUR_MOMENTS = 4

/**
 * Le créneau du jeudi (13 h 15 – 13 h 45) est-il bloqué à cette date ? Il
 * l'est dès qu'un blocage — par défaut ou temporaire, fermeture comprise —
 * empiète sur cette demi-heure.
 */
export function creneauBloque(date: string, horaires: readonly Horaire[]): boolean {
  const a = minutes(CRENEAU_REGULIER)
  const b = a + DUREE_MIN
  return reglesDuJour(date, horaires)
    .some(h => h.type === 'blocage' && minutes(h.heure_debut) < b && minutes(h.heure_fin) > a)
}

/** Louis-Paul Courtois joue-t-il ce jour-là ? Un jeudi sur deux, sauf blocage. */
export function seanceReguliere(date: string, horaires: readonly Horaire[]): boolean {
  return estJeudiRegulier(date) && !creneauBloque(date, horaires)
}

export interface CreneauJour {
  debut: string
  fin: string
  /** Libre, ou la raison pour laquelle il ne l'est pas. */
  etat: 'libre' | 'pris' | 'regulier' | 'passe'
  /** Interprète déjà inscrit, ou Louis-Paul Courtois. */
  interprete?: string
  /** Vrai si c'est le professeur connecté qui a inscrit cet élève. */
  mien?: boolean
}

export interface ContexteJour {
  /** Date du jour, à Paris. */
  aujourdhui: string
  /**
   * Jours de prévenance avant une inscription : 2 pour les professeurs,
   * 0 pour l'association, qui s'arrange directement avec la paroisse.
   */
  delaiJours?: number
  horaires: readonly Horaire[]
  pris: readonly CreneauPris[]
}

/**
 * Le créneau d'une journée, s'il y en a un : les Moments musicaux ont lieu le
 * jeudi seulement, de 13 h 15 à 13 h 45. Un jeudi sur deux est celui de
 * Louis-Paul Courtois ; l'autre est proposé aux élèves. Liste vide les autres
 * jours, les jeudis bloqués et hors de l'horizon d'inscription.
 */
export function creneauxDuJour(date: string, ctx: ContexteJour): CreneauJour[] {
  if (date < ctx.aujourdhui || date > plusMois(ctx.aujourdhui, HORIZON_MOIS)) return []
  if (jourSemaine(date) !== JOUR_MOMENTS || creneauBloque(date, ctx.horaires)) return []

  const debut = CRENEAU_REGULIER
  const fin = finCreneau(debut)
  if (estJeudiRegulier(date)) return [{ debut, fin, etat: 'regulier', interprete: ORGANISTE_REGULIER }]
  const pris = ctx.pris.find(p => p.date === date && p.heure_debut.slice(0, 5) === debut)
  if (pris) return [{ debut, fin, etat: 'pris', interprete: pris.interprete, mien: pris.mien }]
  // Trop tard, le jour même comme la veille, pour prévenir la paroisse et l'élève.
  const tropTot = date < plusJours(ctx.aujourdhui, ctx.delaiJours ?? 2)
  return [{ debut, fin, etat: tropTot ? 'passe' : 'libre' }]
}

/**
 * Vrai si ce créneau est encore proposé, abstraction faite des délais et des
 * autres inscriptions. Sert à repérer les séances qu'un blocage rend
 * impossibles.
 */
export function creneauPossible(date: string, debut: string, horaires: readonly Horaire[]): boolean {
  return creneauxDuJour(date, { aujourdhui: date, delaiJours: 0, horaires, pris: [] })
    .some(c => c.debut === debut.slice(0, 5) && c.etat === 'libre')
}

export type RaisonRefus = 'passe' | 'trop_tot' | 'trop_loin' | 'hors_creneau' | 'ferme' | 'regulier' | 'pris'

/**
 * Pourquoi un créneau n'est pas inscriptible — ou `null` s'il l'est.
 * Même règle côté navigateur (pour griser) et côté serveur (seul juge).
 */
export function raisonNonReservable(date: string, debut: string, ctx: ContexteJour): RaisonRefus | null {
  if (date < ctx.aujourdhui) return 'passe'
  if (date < plusJours(ctx.aujourdhui, ctx.delaiJours ?? 2)) return 'trop_tot'
  if (date > plusMois(ctx.aujourdhui, HORIZON_MOIS)) return 'trop_loin'
  if (jourSemaine(date) !== JOUR_MOMENTS || debut.slice(0, 5) !== CRENEAU_REGULIER) return 'hors_creneau'
  if (creneauBloque(date, ctx.horaires)) return 'ferme'
  const creneau = creneauxDuJour(date, ctx)[0]
  if (!creneau) return 'hors_creneau'
  if (creneau.etat === 'regulier') return 'regulier'
  if (creneau.etat === 'pris') return 'pris'
  if (creneau.etat === 'passe') return 'trop_tot'
  return null
}

/** Une séance peut encore être annulée jusqu'à 48 h avant son début. */
export function annulable(date: string, debut: string, maintenant = new Date()): boolean {
  return debutSeance(date, debut).getTime() - maintenant.getTime() > DELAI_ANNULATION_H * 3_600_000
}
