import { getServiceClient } from '~/server/utils/superAdminClient'
import { verifyFormToken } from '~/server/utils/formToken'
import { adresseAssociation, envoyerEmail, escapeHtml, paragraphe } from '~/server/utils/moments'

// Même garde-fou que le formulaire de contact : limite par adresse IP, en
// mémoire de l'instance, en plus du jeton signé.
const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 3_600_000
const MAX_PER_WINDOW = 5

interface Corps {
  jeton?: string
  token?: string
  website?: string
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  conservatoire?: string
  professeur?: string
  niveau?: string
  presentation?: string
  repertoire?: string
  consentement_publication?: boolean
}

function champ(v: unknown, max: number, nom: string, requis = false): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (requis && !s) throw createError({ statusCode: 400, statusMessage: `${nom} : champ requis` })
  if (s.length > max) throw createError({ statusCode: 400, statusMessage: `${nom} : trop long` })
  return s || null
}

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

  const client = getServiceClient()
  const jeton = String(body?.jeton ?? '')
  const { data: param } = await client.from('moments_parametres').select('jeton_candidature').eq('id', 1).maybeSingle()
  if (!param || !/^[0-9a-f]{48}$/.test(jeton) || param.jeton_candidature !== jeton)
    throw createError({ statusCode: 403, statusMessage: 'Lien de candidature invalide.' })

  const prenom = champ(body.prenom, 80, 'Prénom', true)!
  const nom = champ(body.nom, 80, 'Nom', true)!
  const email = champ(body.email, 254, 'Email', true)!
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  const candidature = {
    prenom, nom, email,
    telephone: champ(body.telephone, 40, 'Téléphone'),
    conservatoire: champ(body.conservatoire, 160, 'Conservatoire'),
    professeur: champ(body.professeur, 120, 'Professeur'),
    niveau: champ(body.niveau, 120, 'Niveau'),
    presentation: champ(body.presentation, 4000, 'Présentation', true),
    repertoire: champ(body.repertoire, 2000, 'Répertoire'),
    consentement_publication: body.consentement_publication === true
  }
  if (!candidature.consentement_publication)
    throw createError({ statusCode: 400, statusMessage: 'L\'accord de publication du prénom est nécessaire.' })

  const { error } = await client.from('moments_candidatures').insert(candidature)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
  await Promise.all([
    envoyerEmail({
      to: adresseAssociation(),
      replyTo: `${prenom} ${nom} <${email}>`.replace(/[\r\n]/g, ' '),
      subject: `[Moments musicaux] Candidature de ${prenom} ${nom}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Nouvelle candidature</h2>
        <p><strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong> — ${escapeHtml(email)}${candidature.telephone ? ' · ' + escapeHtml(candidature.telephone) : ''}</p>
        ${candidature.conservatoire ? `<p><strong>Conservatoire :</strong> ${escapeHtml(candidature.conservatoire)}</p>` : ''}
        ${candidature.professeur ? `<p><strong>Professeur :</strong> ${escapeHtml(candidature.professeur)}</p>` : ''}
        ${candidature.niveau ? `<p><strong>Niveau :</strong> ${escapeHtml(candidature.niveau)}</p>` : ''}
        <p><strong>Présentation</strong></p>${paragraphe(candidature.presentation!)}
        ${candidature.repertoire ? `<p><strong>Répertoire envisagé</strong></p>${paragraphe(candidature.repertoire)}` : ''}
        <p style="margin-top:22px"><a href="${siteUrl}/admin/moments" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Traiter la candidature</a></p>`
    }),
    envoyerEmail({
      to: email,
      subject: 'Votre candidature aux Moments musicaux',
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Merci, ${escapeHtml(prenom)} !</h2>
        <p>Nous avons bien reçu votre candidature pour jouer lors des Moments musicaux, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        <p>Nous la lisons avec attention et revenons vers vous par email. Si elle est retenue, vous recevrez un lien pour accéder au calendrier des séances et choisir vos dates.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    })
  ])

  return { ok: true }
})
