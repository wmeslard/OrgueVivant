import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { affecterOrganiste, champ } from '~/server/utils/moments'

/** L'adresse de Louis-Paul Courtois, prévenu quand personne n'est inscrit. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const email = champ(body?.email_organiste, 254).toLowerCase()
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  const client = getServiceClient()
  const { error } = await client.from('moments_reglages').upsert({ id: 1, email_organiste: email || null })
  if (error?.code === 'PGRST205' || error?.code === '42P01')
    throw createError({ statusCode: 503, statusMessage: 'Exécutez supabase/moments-musicaux-affectations.sql dans Supabase.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  // Une séance déjà affectée mais pas encore annoncée part tout de suite.
  await affecterOrganiste(client)
  return { ok: true }
})
