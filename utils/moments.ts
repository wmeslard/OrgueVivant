/**
 * Règles des Moments musicaux, partagées entre les pages, le calendrier des
 * élèves, l'admin, le flux ICS et l'API. Sans dépendance à Nuxt.
 *
 * Deux sortes de séances :
 *  - celles de l'organiste régulier, un jeudi sur deux (semaines paires),
 *    calculées et non stockées ;
 *  - celles des élèves, réservées un jour de leur choix, stockées en base.
 * Toutes ont lieu à l'orgue de chœur de Saint-Maurice, de 13 h 15 à 13 h 45.
 */

export const MOMENT_DEBUT = '13:15'
export const MOMENT_FIN = '13:45'
export const ORGANISTE_REGULIER = 'Louis-Paul Courtois'

/** Horizon de réservation (mois) et nombre maximal de séances à venir par élève. */
export const HORIZON_MOIS = 6
export const MAX_SEANCES_A_VENIR = 4
/** Délai minimal, en heures, pour réserver ou annuler avant le début de la séance. */
export const DELAI_ANNULATION_H = 48

export interface Fermeture { date_debut: string; date_fin: string; motif?: string | null }

/** Une séance publiée : régulier ou élève. */
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

/** Séance du régulier : un jeudi de semaine ISO paire. */
export function estJeudiRegulier(date: string): boolean {
  const d = parseYmd(date)
  return d.getDay() === 4 && isoWeek(d) % 2 === 0
}

export function estDimanche(date: string): boolean {
  return jourSemaine(date) === 0
}

/** Vrai si la date tombe dans une période d'indisponibilité de l'orgue. */
export function estFermee(date: string, fermetures: readonly Fermeture[]): Fermeture | undefined {
  return fermetures.find(f => f.date_debut <= date && date <= f.date_fin)
}

/** « Camille D. » : ce que le site publie d'un élève. */
export function nomPublic(prenom: string, nom: string): string {
  const p = prenom.trim()
  const n = nom.trim()
  return n ? `${p} ${n[0].toUpperCase()}.` : p
}

/** Jeudis du régulier entre deux dates incluses (« YYYY-MM-DD »). */
export function jeudisRegulier(du: string, au: string): string[] {
  const out: string[] = []
  const cursor = parseYmd(du)
  const fin = parseYmd(au)
  while (cursor <= fin) {
    const s = ymd(cursor)
    if (estJeudiRegulier(s)) out.push(s)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
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

/** Début de la séance en temps local du navigateur ou du serveur. */
export function debutSeance(date: string, heure = MOMENT_DEBUT): Date {
  const d = parseYmd(date)
  const [h, m] = heure.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

export type RaisonRefus =
  | 'passe' | 'trop_tot' | 'trop_loin' | 'dimanche' | 'regulier' | 'fermee' | 'prise'

export interface ContexteReservation {
  aujourdhui: string
  fermetures: readonly Fermeture[]
  /** Dates déjà réservées (séances actives), toutes personnes confondues. */
  datesPrises: ReadonlySet<string>
}

/**
 * Pourquoi une date n'est pas réservable — ou `null` si elle l'est.
 * Même règle côté navigateur (pour griser le calendrier) et côté serveur
 * (qui reste seul juge).
 */
export function raisonNonReservable(date: string, ctx: ContexteReservation): RaisonRefus | null {
  if (date < ctx.aujourdhui) return 'passe'
  // Le jour même et le lendemain matin sont trop courts pour prévenir l'église.
  if (date < plusJours(ctx.aujourdhui, 2)) return 'trop_tot'
  if (date > plusMois(ctx.aujourdhui, HORIZON_MOIS)) return 'trop_loin'
  if (estDimanche(date)) return 'dimanche'
  if (estJeudiRegulier(date)) return 'regulier'
  if (estFermee(date, ctx.fermetures)) return 'fermee'
  if (ctx.datesPrises.has(date)) return 'prise'
  return null
}

/** Une séance peut encore être annulée par l'élève jusqu'à 48 h avant son début. */
export function annulable(date: string, maintenant = new Date()): boolean {
  return debutSeance(date).getTime() - maintenant.getTime() > DELAI_ANNULATION_H * 3_600_000
}
