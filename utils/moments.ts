/**
 * Règles des Moments musicaux, partagées entre les pages, l'espace des
 * professeurs, l'admin, le flux ICS et l'API. Sans dépendance à Nuxt.
 *
 * Les Moments musicaux ont lieu un jeudi sur deux, de 13 h 15 à 13 h 45, à
 * l'orgue de chœur de Saint-Maurice. On s'y inscrit jusqu'à trois jours avant ;
 * deux jours avant, si personne ne l'a fait, Louis-Paul Courtois est affecté à
 * la séance et prévenu par email (voir affecterOrganiste, côté serveur). Son
 * nom n'est publié qu'une fois affecté. Un blocage — par défaut ou temporaire —
 * qui tombe sur ce créneau supprime la séance.
 */

export const DUREE_MIN = 30
export const ORGANISTE_REGULIER = 'Louis-Paul Courtois'
/** Le créneau des Moments musicaux, le jeudi. */
export const CRENEAU_REGULIER = '13:15'

/** Horizon d'inscription, en mois. */
export const HORIZON_MOIS = 6
/** Délai minimal, en heures, pour annuler avant le début de la séance. */
export const DELAI_ANNULATION_H = 48
/**
 * Jours d'avance pour s'inscrire : jusqu'au lundi pour le jeudi. Le mardi,
 * deux jours avant, la séance sans inscrit revient à Louis-Paul Courtois.
 */
export const DELAI_INSCRIPTION_JOURS = 3
/** Un jeudi de Moment musical : il fixe l'alternance, un jeudi sur deux. */
export const JEUDI_DE_REFERENCE = '2026-10-01'

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

/** Un musicien d'une séance : la personne inscrite, puis celles qui jouent avec elle. */
export interface Musicien {
  prenom: string
  nom: string
  /** Champ libre, « Orgue » proposé d'office pour le premier musicien. */
  instrument: string
}

/** Musiciens au plus par séance, la personne inscrite comprise. */
export const MAX_MUSICIENS = 4
export const INSTRUMENT_PAR_DEFAUT = 'Orgue'

/** Une séance publiée : Louis-Paul Courtois ou une séance inscrite. */
export interface SeancePublique {
  date: string
  debut: string
  fin: string
  /**
   * `regulier` : Louis-Paul Courtois, affecté faute d'inscrit ; `eleve` : une
   * séance inscrite ; `a_venir` : personne encore, aucun nom publié.
   */
  type: 'regulier' | 'eleve' | 'a_venir'
  /** « Salomé G. & Marie D. » ; vide pour une séance à venir. */
  interprete: string
  /** Les musiciens d'une séance inscrite, tels que le site les publie. */
  musiciens?: { nom: string; instrument: string }[]
  programme?: string | null
  /** Identifiant de la réservation, pour les séances inscrites. */
  id?: string
}

// ── Dates ────────────────────────────────────────────────────────────────────

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

/** Un jeudi de Moment musical : un jeudi sur deux, à partir de JEUDI_DE_REFERENCE. */
export function estJeudiMoment(date: string): boolean {
  if (jourSemaine(date) !== JOUR_MOMENTS) return false
  const jour = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  const semaines = Math.round((jour(date) - jour(JEUDI_DE_REFERENCE)) / (7 * 86_400_000))
  return semaines % 2 === 0
}

/** « Camille D. » : ce que le site publie d'une personne inscrite. */
export function nomPublic(prenom: string, nom: string): string {
  const p = prenom.trim()
  const n = nom.trim()
  return n ? `${p} ${n[0].toUpperCase()}.` : p
}

/**
 * Les musiciens d'une séance. Celles enregistrées avant le jeu à plusieurs
 * n'ont que la personne inscrite, sans instrument.
 */
export function musiciensDe(s: { eleve_prenom: string; eleve_nom: string; musiciens?: Musicien[] | null }): Musicien[] {
  return s.musiciens?.length ? s.musiciens : [{ prenom: s.eleve_prenom, nom: s.eleve_nom, instrument: '' }]
}

/** « A », « A & B », « A, B & C ». */
export function lierNoms(noms: string[]): string {
  return noms.length < 2 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} & ${noms.at(-1)}`
}

/** « Salomé G. & Marie D. » — l'initiale reste collée au prénom en fin de ligne. */
export function nomsPublics(musiciens: readonly Musicien[]): string {
  return lierNoms(musiciens.map(m => nomPublic(m.prenom, m.nom).replace(/ (?=\S+$)/, '\u00A0')))
}

/** « Salomé Gamot (orgue) & Marie Dupont (violon) », pour l'administration et les emails. */
export function nomsComplets(musiciens: readonly Musicien[], avecInstruments = false): string {
  return lierNoms(musiciens.map((m) => {
    const nom = `${m.prenom} ${m.nom}`.trim()
    return avecInstruments && m.instrument ? `${nom} (${m.instrument.toLocaleLowerCase('fr')})` : nom
  }))
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

/** Un Moment musical a-t-il lieu ce jour-là ? Un jeudi sur deux, sauf blocage. */
export function momentPrevu(date: string, horaires: readonly Horaire[]): boolean {
  return estJeudiMoment(date) && !creneauBloque(date, horaires)
}

export interface CreneauJour {
  debut: string
  fin: string
  /** Libre, pris, ou trop proche pour s'inscrire (`passe`). */
  etat: 'libre' | 'pris' | 'passe'
  /** Interprète inscrit. */
  interprete?: string
  /** Vrai si c'est la personne connectée qui a fait cette inscription. */
  mien?: boolean
}

export interface ContexteJour {
  /** Date du jour, à Paris. */
  aujourdhui: string
  /**
   * Jours d'avance pour s'inscrire : DELAI_INSCRIPTION_JOURS par le lien,
   * 0 pour l'association, qui s'arrange directement avec la paroisse.
   */
  delaiJours?: number
  horaires: readonly Horaire[]
  pris: readonly CreneauPris[]
}

/**
 * Le créneau d'une journée, s'il y en a un : les Moments musicaux ont lieu un
 * jeudi sur deux, de 13 h 15 à 13 h 45. Liste vide les autres jours, les
 * jeudis bloqués et hors de l'horizon d'inscription.
 */
export function creneauxDuJour(date: string, ctx: ContexteJour): CreneauJour[] {
  if (date < ctx.aujourdhui || date > plusMois(ctx.aujourdhui, HORIZON_MOIS)) return []
  if (!momentPrevu(date, ctx.horaires)) return []

  const debut = CRENEAU_REGULIER
  const fin = finCreneau(debut)
  const pris = ctx.pris.find(p => p.date === date && p.heure_debut.slice(0, 5) === debut)
  if (pris) return [{ debut, fin, etat: 'pris', interprete: pris.interprete, mien: pris.mien }]
  // Deux jours avant, la séance sans inscrit revient à Louis-Paul Courtois.
  const tropTot = date < plusJours(ctx.aujourdhui, ctx.delaiJours ?? DELAI_INSCRIPTION_JOURS)
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

export type RaisonRefus = 'passe' | 'trop_tot' | 'trop_loin' | 'hors_creneau' | 'ferme' | 'pris'

/**
 * Pourquoi un créneau n'est pas inscriptible — ou `null` s'il l'est.
 * Même règle côté navigateur (pour griser) et côté serveur (seul juge).
 */
export function raisonNonReservable(date: string, debut: string, ctx: ContexteJour): RaisonRefus | null {
  if (date < ctx.aujourdhui) return 'passe'
  if (date < plusJours(ctx.aujourdhui, ctx.delaiJours ?? DELAI_INSCRIPTION_JOURS)) return 'trop_tot'
  if (date > plusMois(ctx.aujourdhui, HORIZON_MOIS)) return 'trop_loin'
  if (!estJeudiMoment(date) || debut.slice(0, 5) !== CRENEAU_REGULIER) return 'hors_creneau'
  if (creneauBloque(date, ctx.horaires)) return 'ferme'
  const creneau = creneauxDuJour(date, ctx)[0]
  if (!creneau) return 'hors_creneau'
  if (creneau.etat === 'pris') return 'pris'
  if (creneau.etat === 'passe') return 'trop_tot'
  return null
}

/** Une séance peut encore être annulée jusqu'à 48 h avant son début. */
export function annulable(date: string, debut: string, maintenant = new Date()): boolean {
  return debutSeance(date, debut).getTime() - maintenant.getTime() > DELAI_ANNULATION_H * 3_600_000
}
