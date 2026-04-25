import { getServiceClient } from '~/server/utils/superAdminClient'

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

  const { email } = await readBody<{ email?: string }>(event)

  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  const client = getServiceClient()

  const { data: existing } = await client
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existing) return { ok: true }

  const { error } = await client
    .from('newsletter_subscribers')
    .insert({ email: email.toLowerCase().trim() })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'inscription' })

  return { ok: true }
})
