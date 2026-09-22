import { Resend } from 'resend'
import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '~/server/utils/superAdminClient'
import { senderAddress } from '~/server/utils/sender'
import {
  MOMENT_DEBUT, MOMENT_FIN, ORGANISTE_REGULIER, type Fermeture, type SeancePublique,
  estFermee, jeudisRegulier, nomPublic
} from '~/utils/moments'

/** Date du jour à Paris (« YYYY-MM-DD ») : les fonctions Vercel tournent en UTC. */
export function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export interface Eleve {
  id: string
  prenom: string
  nom: string
  email: string
  actif: boolean
}

export interface SeanceRow {
  id: string
  date: string
  heure_debut: string
  heure_fin: string
  eleve_id: string
  programme: string | null
  statut: 'reservee' | 'annulee'
  annulee_par: 'eleve' | 'admin' | null
  annulee_at: string | null
  created_at: string
  eleve?: Pick<Eleve, 'prenom' | 'nom' | 'email'> | null
}

/** Compte connecté avec le rôle `eleve` et une fiche active. */
export async function requireEleve(event: H3Event): Promise<Eleve> {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Connexion requise' })
  const role = (user.app_metadata as Record<string, unknown>)?.role
  if (role !== 'eleve') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux élèves' })
  const { data } = await getServiceClient().from('moments_eleves').select('*').eq('id', user.id).maybeSingle()
  if (!data || !data.actif) throw createError({ statusCode: 403, statusMessage: 'Accès désactivé' })
  return data as Eleve
}

/**
 * Les tables des Moments musicaux sont créées à la main dans Supabase
 * (supabase/moments-musicaux.sql), comme les autres migrations du projet : le
 * code peut donc être déployé avant elles. Tant qu'elles manquent, les
 * Moments musicaux restent vides plutôt que de faire échouer ce qui les
 * entoure — en particulier le flux ICS, auquel des visiteurs sont abonnés.
 */
function tableAbsente(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

export async function chargerFermetures(client: SupabaseClient, du: string, au: string): Promise<Fermeture[]> {
  const { data, error } = await client
    .from('moments_fermetures')
    .select('id, date_debut, date_fin, motif')
    .lte('date_debut', au)
    .gte('date_fin', du)
    .order('date_debut')
  if (error && tableAbsente(error)) { console.warn('[moments] table absente, migration non appliquée :', error.message); return [] }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data ?? []) as Fermeture[]
}

/** Séances actives entre deux dates, avec l'élève. */
export async function chargerSeances(client: SupabaseClient, du: string, au: string, statut: 'reservee' | 'toutes' = 'reservee'): Promise<SeanceRow[]> {
  let q = client
    .from('moments_seances')
    .select('*, eleve:moments_eleves(prenom, nom, email)')
    .gte('date', du)
    .lte('date', au)
    .order('date')
  if (statut === 'reservee') q = q.eq('statut', 'reservee')
  const { data, error } = await q
  if (error && tableAbsente(error)) { console.warn('[moments] table absente, migration non appliquée :', error.message); return [] }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data ?? []) as SeanceRow[]
}

/**
 * Le calendrier tel que le site le publie : les jeudis du régulier (hors
 * fermetures) et les séances d'élèves, par date croissante. Rien d'autre que le
 * prénom et l'initiale de l'élève n'en sort.
 */
export async function calendrierPublic(du: string, au: string): Promise<SeancePublique[]> {
  const client = getServiceClient()
  const [fermetures, seances] = await Promise.all([chargerFermetures(client, du, au), chargerSeances(client, du, au)])
  const out: SeancePublique[] = jeudisRegulier(du, au)
    .filter(d => !estFermee(d, fermetures))
    .map(date => ({ date, debut: MOMENT_DEBUT, fin: MOMENT_FIN, type: 'regulier' as const, interprete: ORGANISTE_REGULIER }))
  for (const s of seances) {
    out.push({
      id: s.id,
      date: s.date,
      debut: s.heure_debut.slice(0, 5),
      fin: s.heure_fin.slice(0, 5),
      type: 'eleve',
      interprete: s.eleve ? nomPublic(s.eleve.prenom, s.eleve.nom) : 'Élève organiste',
      programme: s.programme
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
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
 * (une réservation faite reste faite), sauf demande explicite.
 */
export async function envoyerEmail(
  msg: { to: string | string[]; subject: string; html: string; replyTo?: string },
  { strict = false } = {}
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
    html: gabarit(msg.html),
    ...(msg.replyTo && { replyTo: msg.replyTo })
  }).catch(e => ({ error: e }))
  if (error) {
    console.error('[moments] envoi refusé :', error)
    if (strict) throw createError({ statusCode: 500, statusMessage: 'Envoi de l\'email impossible, réessayez plus tard.' })
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
