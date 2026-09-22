import { getServiceClient } from '~/server/utils/superAdminClient'
import { verifyFormToken } from '~/server/utils/formToken'
import { adresseAssociation, envoyerEmail, escapeHtml, paragraphe } from '~/server/utils/moments'

// Même garde-fou que le formulaire de contact : limite par adresse IP, en
// mémoire de l'instance, en plus du jeton signé.
const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 3_600_000
const MAX_PER_WINDOW = 5

interface Corps {
  token?: string
  website?: string
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  conservatoire?: string
  message?: string
}

function champ(v: unknown, max: number, nom: string, requis = false): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (requis && !s) throw createError({ statusCode: 400, statusMessage: `${nom} : champ requis` })
  if (s.length > max) throw createError({ statusCode: 400, statusMessage: `${nom} : trop long` })
  return s || null
}

/**
 * Demande d'accès d'un professeur. L'adresse de la page est publique : c'est
 * la validation par l'association, et non le secret d'un lien, qui protège
 * l'inscription des élèves.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.reset) hits.set(ip, { count: 1, reset: now + WINDOW_MS })
  else if (entry.count >= MAX_PER_WINDOW) throw createError({ statusCode: 429, statusMessage: 'Trop d\'envois, réessayez plus tard.' })
  else entry.count++

  const body = await readBody<Corps>(event)
  if (body?.website) return { ok: true }   // pot de miel
  if (!verifyFormToken(body?.token)) throw createError({ statusCode: 403, statusMessage: 'Formulaire expiré, rechargez la page.' })

  const prenom = champ(body.prenom, 80, 'Prénom', true)!
  const nom = champ(body.nom, 80, 'Nom', true)!
  const email = champ(body.email, 254, 'Email', true)!
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  const demande = {
    prenom, nom, email,
    telephone: champ(body.telephone, 40, 'Téléphone'),
    conservatoire: champ(body.conservatoire, 160, 'Conservatoire'),
    message: champ(body.message, 4000, 'Message', true)
  }

  const client = getServiceClient()
  const { error } = await client.from('moments_demandes').insert(demande)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
  await Promise.all([
    envoyerEmail({
      to: adresseAssociation(),
      replyTo: `${prenom} ${nom} <${email}>`.replace(/[\r\n]/g, ' '),
      subject: `[Moments musicaux] Demande d'accès de ${prenom} ${nom}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Nouvelle demande d'accès</h2>
        <p><strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong> — ${escapeHtml(email)}${demande.telephone ? ' · ' + escapeHtml(demande.telephone) : ''}</p>
        ${demande.conservatoire ? `<p><strong>Conservatoire :</strong> ${escapeHtml(demande.conservatoire)}</p>` : ''}
        ${paragraphe(demande.message!)}
        <p style="margin-top:22px"><a href="${siteUrl}/admin/moments" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Traiter la demande</a></p>`
    }),
    envoyerEmail({
      to: email,
      subject: 'Votre demande d\'accès aux Moments musicaux',
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Merci, ${escapeHtml(prenom)} !</h2>
        <p>Nous avons bien reçu votre demande d'accès à l'espace des professeurs des Moments musicaux, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        <p>Nous revenons vers vous par email. Une fois votre accès ouvert, vous pourrez inscrire vos élèves sur les créneaux libres, autant de fois que vous le souhaitez.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    })
  ])
  return { ok: true }
})
