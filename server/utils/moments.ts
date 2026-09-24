import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '~/server/utils/superAdminClient'
import { senderAddress } from '~/server/utils/sender'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  CRENEAU_REGULIER, HORIZON_MOIS, ORGANISTE_REGULIER, type Horaire, type SeancePublique,
  creneauPossible, finCreneau, heureFr, nomPublic, parseYmd, plusMois, seanceReguliere, ymd
} from '~/utils/moments'

/** Date du jour à Paris (« YYYY-MM-DD ») : les fonctions Vercel tournent en UTC. */
export function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export interface Professeur {
  id: string
  prenom: string
  nom: string
  email: string
  conservatoire: string | null
  actif: boolean
}

export interface SeanceRow {
  id: string
  date: string
  heure_debut: string
  heure_fin: string
  /** Null : séance inscrite par l'association. */
  professeur_id: string | null
  eleve_prenom: string
  eleve_nom: string
  eleve_email: string | null
  programme: string | null
  /** Inscription personnelle ; absent tant que la migration n'est pas appliquée. */
  pour_soi?: boolean
  statut: 'reservee' | 'annulee'
  annulee_par: 'professeur' | 'admin' | null
  annulee_at: string | null
  created_at: string
  professeur?: Pick<Professeur, 'prenom' | 'nom' | 'email'> | null
}

// ── Accès par lien partagé ───────────────────────────────────────────────────
//
// L'association transmet aux professeurs une adresse qui se termine par une
// clé secrète (table moments_lien). Qui l'ouvre se présente, puis reçoit un
// cookie signé qui associe sa fiche à la clé du moment. Régénérer la clé
// invalide d'un coup le lien et tous les cookies émis avec lui.

const COOKIE = 'ov_moments'
const COOKIE_DUREE_S = 365 * 24 * 3600

/** Clé en vigueur, ou null si elle n'existe pas encore (migration non appliquée). */
export async function cleActuelle(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.from('moments_lien').select('cle').eq('id', 1).maybeSingle()
  if (error && schemaAbsent(error)) return null
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data?.cle as string | undefined) ?? null
}

/** Nouvelle clé : l'ancien lien et les accès ouverts avec lui cessent de fonctionner. */
export async function regenererCle(client: SupabaseClient): Promise<string> {
  const cle = randomBytes(16).toString('hex')
  const { error } = await client.from('moments_lien').upsert({ id: 1, cle, cree_at: new Date().toISOString() })
  if (error && schemaAbsent(error))
    throw createError({ statusCode: 503, statusMessage: 'Table moments_lien absente : exécutez supabase/moments-musicaux-lien.sql dans Supabase.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return cle
}

/** Comparaison à durée constante : la clé ne se devine pas caractère par caractère. */
export function memeCle(a: string, b: string): boolean {
  // Longueurs comparées en octets : timingSafeEqual lève une exception sinon
  // (un caractère accentué compte pour deux).
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Signature du cookie, par HMAC avec une clé dérivée de la clé de service
 * Supabase (même principe que server/utils/formToken.ts). La clé du lien
 * entre dans la signature : c'est ce qui rend les cookies caducs quand elle
 * change.
 */
function signer(professeurId: string, cle: string): string {
  const source = useRuntimeConfig().supabaseServiceRoleKey as string | undefined
  if (!source) throw createError({ statusCode: 500, statusMessage: 'Clé de signature absente' })
  const secret = createHmac('sha256', source).update('orgue-vivant:moments-professeur').digest()
  return createHmac('sha256', secret).update(`${professeurId}:${cle}`).digest('base64url')
}

export function ouvrirAcces(event: H3Event, professeurId: string, cle: string) {
  setCookie(event, COOKIE, `${professeurId}.${signer(professeurId, cle)}`, {
    httpOnly: true, secure: !import.meta.dev, sameSite: 'lax', path: '/', maxAge: COOKIE_DUREE_S
  })
}

export function fermerAcces(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

/**
 * Fiche du professeur dont le cookie est valide pour la clé en vigueur, ou
 * null. `desactive` distingue la fiche coupée par l'administration.
 */
export async function professeurDuCookie(event: H3Event): Promise<Professeur | 'desactive' | null> {
  const [id, sig] = (getCookie(event, COOKIE) ?? '').split('.')
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null
  const client = getServiceClient()
  const [cle, { data }] = await Promise.all([
    cleActuelle(client),
    client.from('moments_professeurs').select('*').eq('id', id).maybeSingle()
  ])
  if (!cle || !memeCle(sig, signer(id, cle)) || !data) return null
  return data.actif ? data as Professeur : 'desactive'
}

/** Professeur entré par le lien en vigueur, avec une fiche active. */
export async function requireProfesseur(event: H3Event): Promise<Professeur> {
  const prof = await professeurDuCookie(event)
  if (!prof) throw createError({ statusCode: 401, statusMessage: 'Ouvrez le lien transmis par l\'association.' })
  if (prof === 'desactive') throw createError({ statusCode: 403, statusMessage: 'Accès désactivé' })
  return prof
}

/** Trace de passage, relevée à l'ouverture de l'espace : l'administration voit qui se sert de l'outil. */
export async function marquerConnexion(client: SupabaseClient, id: string) {
  await client.from('moments_professeurs').update({ derniere_connexion_at: new Date().toISOString() }).eq('id', id)
}

/** Champ texte d'un formulaire, nettoyé et borné. */
export function champ(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

/**
 * Coordonnées d'un professeur, corrigées par lui-même ou par l'administration.
 * Son nom suit sur ses séances à venir où il joue lui-même, que le site
 * annonce à ce nom.
 */
export async function modifierProfesseur(client: SupabaseClient, ancien: Professeur, body: Record<string, unknown>) {
  const prenom = champ(body.prenom, 80)
  const nom = champ(body.nom, 80)
  const email = champ(body.email, 254).toLowerCase()
  const conservatoire = champ(body.conservatoire, 160)
  if (!prenom || !nom || !email) throw createError({ statusCode: 400, statusMessage: 'Prénom, nom et email requis' })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  const { error } = await client.from('moments_professeurs')
    .update({ prenom, nom, email, conservatoire: conservatoire || null }).eq('id', ancien.id)
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Cette adresse email est déjà celle d\'une autre fiche.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (prenom === ancien.prenom && nom === ancien.nom) return
  const { data, error: e } = await client.from('moments_seances')
    .update({ eleve_prenom: prenom, eleve_nom: nom })
    .eq('professeur_id', ancien.id).eq('pour_soi', true).eq('statut', 'reservee').gte('date', aujourdhuiParis())
    .select('id')
  // Colonne pour_soi absente : aucune inscription personnelle à renommer.
  if (e && !schemaAbsent(e)) throw createError({ statusCode: 500, statusMessage: e.message })
  if (data?.length) await revalidatePublicPages()
}

/**
 * Les tables des Moments musicaux sont créées à la main dans Supabase
 * (supabase/moments-musicaux.sql), comme les autres migrations du projet : le
 * code peut donc être déployé avant elles. Tant qu'elles manquent, les
 * Moments musicaux restent vides plutôt que de faire échouer ce qui les
 * entoure — en particulier le flux ICS, auquel des visiteurs sont abonnés.
 */
function schemaAbsent(error: { code?: string } | null): boolean {
  // Table ou colonne inconnue de PostgREST ou de Postgres, ou relation entre
  // deux tables pas encore établie — les cas d'une migration non appliquée.
  return ['PGRST205', '42P01', 'PGRST200', 'PGRST204', '42703'].includes(error?.code ?? '')
}

/** Ce que l'API répond quand un créneau n'est pas inscriptible (voir raisonNonReservable). */
export const MESSAGES_REFUS: Record<string, string> = {
  passe: 'Cette date est passée.',
  trop_tot: 'Les inscriptions ferment deux jours avant la séance.',
  trop_loin: `Les inscriptions sont ouvertes sur ${HORIZON_MOIS} mois.`,
  hors_creneau: 'Les Moments musicaux ont lieu le jeudi, à 13 h 15.',
  ferme: 'L\'orgue n\'est pas disponible ce jeudi-là.',
  pris: 'Ce créneau vient d\'être pris.'
}

export async function chargerHoraires(client: SupabaseClient): Promise<Horaire[]> {
  const { data, error } = await client
    .from('moments_horaires')
    .select('id, jour_semaine, type, heure_debut, heure_fin, motif, date_debut, date_fin')
    .order('date_debut', { nullsFirst: true }).order('jour_semaine').order('heure_debut')
  if (error && schemaAbsent(error)) { console.warn('[moments] schéma non appliqué :', error.message); return [] }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data ?? []) as Horaire[]
}

/** Séances entre deux dates, avec le professeur qui les a inscrites. */
export async function chargerSeances(
  client: SupabaseClient, du: string, au: string, statut: 'reservee' | 'toutes' = 'reservee'
): Promise<SeanceRow[]> {
  let q = client
    .from('moments_seances')
    .select('*, professeur:moments_professeurs(prenom, nom, email)')
    .gte('date', du).lte('date', au)
    .order('date').order('heure_debut')
  if (statut === 'reservee') q = q.eq('statut', 'reservee')
  const { data, error } = await q
  if (error && schemaAbsent(error)) { console.warn('[moments] schéma non appliqué :', error.message); return [] }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data ?? []) as SeanceRow[]
}

/**
 * Les jeudis de Louis-Paul Courtois entre deux dates. Si les horaires ferment
 * le jeudi ou recouvrent son créneau, la séance n'apparaît plus : la règle
 * reste celle de l'orgue, pas une exception.
 */
export function jeudisReguliers(du: string, au: string, horaires: readonly Horaire[]): string[] {
  const out: string[] = []
  const cursor = parseYmd(du)
  const fin = parseYmd(au)
  while (cursor <= fin) {
    const s = ymd(cursor)
    if (seanceReguliere(s, horaires)) out.push(s)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/**
 * Le calendrier tel que le site le publie : chaque jeudi ouvert, la séance
 * inscrite, ou à défaut Louis-Paul Courtois. Rien n'en sort de plus que le
 * prénom et l'initiale de la personne inscrite — ni son nom complet, ni qui l'a
 * inscrite.
 */
export async function calendrierPublic(du: string, au: string): Promise<SeancePublique[]> {
  const client = getServiceClient()
  const [horaires, seances] = await Promise.all([chargerHoraires(client), chargerSeances(client, du, au)])
  const inscrits = new Set(seances.map(s => s.date))
  const out: SeancePublique[] = jeudisReguliers(du, au, horaires).filter(date => !inscrits.has(date)).map(date => ({
    date,
    debut: CRENEAU_REGULIER,
    fin: finCreneau(CRENEAU_REGULIER),
    type: 'regulier' as const,
    interprete: ORGANISTE_REGULIER
  }))
  for (const s of seances) {
    out.push({
      id: s.id,
      date: s.date,
      debut: s.heure_debut.slice(0, 5),
      fin: s.heure_fin.slice(0, 5),
      type: 'eleve',
      interprete: nomPublic(s.eleve_prenom, s.eleve_nom),
      programme: s.programme
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.debut.localeCompare(b.debut))
}

/**
 * Règle d'horaires reçue de l'administration, vérifiée. Par défaut : un jour
 * de la semaine, sans dates. Temporaire : du … au …, un jour ou tous les jours.
 * Une fin à 24:00 permet une fermeture sur toute la journée.
 */
export function validerRegle(b: Record<string, unknown> | null | undefined) {
  const erreur = (m: string) => createError({ statusCode: 400, statusMessage: m })
  if (b?.type !== 'ouverture' && b?.type !== 'blocage') throw erreur('Type invalide')
  const dateOk = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const temporaire = !!b.date_debut
  if (temporaire && (!dateOk(b.date_debut) || !dateOk(b.date_fin) || String(b.date_fin) < String(b.date_debut)))
    throw erreur('Dates invalides')
  const jour = b.jour_semaine === null || b.jour_semaine === undefined || b.jour_semaine === '' ? null : Number(b.jour_semaine)
  if (jour !== null && (!Number.isInteger(jour) || jour < 0 || jour > 6)) throw erreur('Jour invalide')
  if (!temporaire && jour === null) throw erreur('Choisissez un jour de la semaine')
  const debut = String(b.heure_debut ?? ''); const fin = String(b.heure_fin ?? '')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(debut) || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(fin) || fin <= debut)
    throw erreur('Heures invalides')
  return {
    type: b.type,
    jour_semaine: jour,
    heure_debut: debut,
    heure_fin: fin,
    motif: (typeof b.motif === 'string' ? b.motif : '').trim().slice(0, 200) || null,
    date_debut: temporaire ? String(b.date_debut) : null,
    date_fin: temporaire ? String(b.date_fin) : null
  }
}

/**
 * Après une modification des horaires : les séances à venir dont le créneau
 * n'est plus proposé (fermeture, nouveau blocage, ouverture réduite) sont
 * annulées, et leur professeur comme l'élève prévenus. Renvoie leur nombre.
 */
export async function annulerSeancesImpossibles(client: SupabaseClient, motif?: string | null): Promise<number> {
  const aujourdhui = aujourdhuiParis()
  const [horaires, seances] = await Promise.all([
    chargerHoraires(client), chargerSeances(client, aujourdhui, plusMois(aujourdhui, HORIZON_MOIS + 1))
  ])
  const annulees = seances.filter(s => !creneauPossible(s.date, s.heure_debut, horaires))
  if (!annulees.length) return 0
  const { error } = await client.from('moments_seances')
    .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() })
    .in('id', annulees.map(s => s.id))
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await Promise.all(annulees.flatMap((s) => {
    const moment = quand(s.date, s.heure_debut.slice(0, 5), s.heure_fin.slice(0, 5))
    const corps = (prenom: string) => `
      <p>Bonjour ${escapeHtml(prenom)},</p>
      <p>L'orgue de Saint-Maurice ne sera pas disponible le <strong>${escapeHtml(moment)}</strong>${motif ? ` (${escapeHtml(motif)})` : ''} : la séance de ${escapeHtml(s.eleve_prenom)} ${escapeHtml(s.eleve_nom)} est annulée, nous en sommes désolés.</p>
      <p>Pour choisir un autre créneau ou pour toute question : ${escapeHtml(adresseAssociation())}.</p>
      <p>L'équipe d'Orgue Vivant</p>`
    const sujet = `Séance annulée — ${moment.split(',')[0]}`
    return [
      s.professeur && envoyerEmail({ to: s.professeur.email, subject: sujet, html: corps(s.professeur.prenom) }),
      s.eleve_email && envoyerEmail({ to: s.eleve_email, subject: `Votre Moment musical du ${moment.split(',')[0]} est annulé`, html: corps(s.eleve_prenom) })
    ].filter(Boolean)
  }))
  return annulees.length
}

// ── E-mails ──────────────────────────────────────────────────────────────────

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Texte libre (message, programme) rendu en HTML, sauts de ligne compris. */
export const paragraphe = (s: string) => `<p style="white-space:pre-wrap">${escapeHtml(s)}</p>`

export function adresseAssociation(): string {
  return (useRuntimeConfig().contactTo as string) || 'contact@orguevivant.fr'
}

/**
 * Envoi via Resend. Sans clé (développement), le message est journalisé et
 * l'appel réussit : les parcours restent testables hors ligne. Un refus de
 * l'API est journalisé mais n'interrompt pas l'action métier qui l'a déclenché
 * (une inscription faite reste faite).
 */
export async function envoyerEmail(
  msg: { to: string | string[]; subject: string; html: string }
): Promise<boolean> {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.info('[moments] Resend non configuré — email non envoyé :', { to: msg.to, subject: msg.subject })
    return true
  }
  const resend = new Resend(config.resendApiKey as string)
  const { error } = await resend.emails.send({
    from: senderAddress(),
    to: msg.to,
    subject: msg.subject,
    html: gabarit(msg.html)
  }).catch(e => ({ error: e }))
  if (error) {
    console.error('[moments] envoi refusé :', error)
    return false
  }
  return true
}

function gabarit(contenu: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.55">
      <div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#a58b52;margin-bottom:18px">Orgue Vivant · Moments musicaux</div>
      ${contenu}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 14px">
      <div style="font-size:12px;color:#777">Association Orgue Vivant — concerts d'orgue à Lille · <a href="https://orguevivant.fr" style="color:#777">orguevivant.fr</a></div>
    </div>`
}

/** « jeudi 24 septembre 2026 », en français. */
export function dateLongue(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** « jeudi 24 septembre 2026, de 13 h 15 à 13 h 45 ». */
export function quand(date: string, debut: string, fin: string): string {
  return `${dateLongue(date)}, de ${heureFr(debut)} à ${heureFr(fin)}`
}
