import { Resend } from 'resend'
import { senderAddress } from '~/server/utils/sender'
import { getServiceClient } from '~/server/utils/superAdminClient'
import { verifyFormToken } from '~/server/utils/formToken'
import { confirmHtml } from '~/server/utils/newsletterTemplates'

const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 3_600_000 // 1 hour
const MAX_PER_WINDOW = 5

export default defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS })
  } else {
    if (entry.count >= MAX_PER_WINDOW)
      throw createError({ statusCode: 429, statusMessage: 'Trop de tentatives, réessayez plus tard.' })
    entry.count++
  }

  const { email, token, website } = await readBody<{ email?: string; token?: string; website?: string }>(event)

  // Pot de miel : le champ est invisible pour un humain. S'il est rempli, on
  // répond comme si tout allait bien, sans rien enregistrer ni rien révéler.
  if (website) return { ok: true }

  // Jeton émis à l'affichage du formulaire : absent ou trop récent pour une
  // saisie humaine, c'est un script. Le message invite à recharger, seul cas
  // où un visiteur réel peut le rencontrer (page restée ouverte des heures).
  if (!verifyFormToken(token))
    throw createError({ statusCode: 400, statusMessage: 'Formulaire expiré, rechargez la page.' })

  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  const address = email.toLowerCase().trim()
  const client = getServiceClient()

  const { data: existing } = await client
    .from('newsletter_subscribers')
    .select('id, unsubscribe_token, confirmed_at')
    .eq('email', address)
    .maybeSingle()

  // Déjà confirmé : rien à faire, et la réponse ne distingue pas ce cas
  // (elle indiquerait sinon quelles adresses sont abonnées).
  if (existing?.confirmed_at) return { ok: true }

  let confirmToken = existing?.unsubscribe_token
  if (!existing) {
    const { data: inserted, error } = await client
      .from('newsletter_subscribers')
      .insert({ email: address })
      .select('unsubscribe_token')
      .single()
    if (error || !inserted) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'inscription' })
    confirmToken = inserted.unsubscribe_token
  }

  // Le lien de confirmation porte le jeton propre à l'abonné, déjà utilisé
  // pour la désinscription : non devinable, et connu de la seule boîte mail.
  const config = useRuntimeConfig()
  const siteUrl = (config.public.siteUrl as string).replace(/\/$/, '')
  const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${confirmToken}`

  if (!config.resendApiKey) {
    console.info('[newsletter] Resend non configuré — lien de confirmation :', confirmUrl)
    return { ok: true }
  }

  // Le SDK Resend ne lève pas d'exception quand l'API refuse l'envoi : le
  // refus arrive dans `error`, qu'il faut lire pour ne pas répondre « envoyé ».
  const resend = new Resend(config.resendApiKey)
  const { error: sendError } = await resend.emails.send({
    from: senderAddress(),
    to: address,
    subject: 'Confirmez votre inscription à la newsletter',
    html: confirmHtml(confirmUrl, siteUrl)
  }).catch(e => ({ error: e }))
  if (sendError) {
    console.error('[newsletter] envoi de la confirmation refusé :', sendError)
    throw createError({ statusCode: 500, statusMessage: 'Envoi de l\'email de confirmation impossible, réessayez.' })
  }

  return { ok: true }
})
