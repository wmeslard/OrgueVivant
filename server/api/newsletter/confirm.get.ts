import { getServiceClient } from '~/server/utils/superAdminClient'
import { sendRedirect } from 'h3'

const hits = new Map<string, { count: number; reset: number }>()

/** Lien reçu par email : marque l'abonné confirmé, puis renvoie vers l'accueil. */
export default defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + 3_600_000 })
  } else {
    if (entry.count >= 10)
      throw createError({ statusCode: 429, statusMessage: 'Trop de tentatives' })
    entry.count++
  }

  const { token } = getQuery(event)
  if (!token || typeof token !== 'string' || token.length < 10)
    throw createError({ statusCode: 400, statusMessage: 'Lien invalide' })

  const client = getServiceClient()
  const { data, error } = await client
    .from('newsletter_subscribers')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('confirmed_at', null)
    .select('id')

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la confirmation' })

  // Déjà confirmé ou jeton inconnu : même destination, le message reste vrai
  // pour le premier cas et ne renseigne pas le second.
  void data
  return sendRedirect(event, '/?newsletter=confirmed#newsletter', 302)
})
