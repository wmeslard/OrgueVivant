import { getServiceClient } from '~/server/utils/superAdminClient'
import { sendRedirect } from 'h3'

const hits = new Map<string, { count: number; reset: number }>()

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

  if (!token || typeof token !== 'string' || token.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Token invalide' })
  }

  const client = getServiceClient()

  const { error } = await client
    .from('newsletter_subscribers')
    .delete()
    .eq('token', token)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la désinscription' })

  return sendRedirect(event, '/?unsubscribed=1', 302)
})
