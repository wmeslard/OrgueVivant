import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis } from '~/server/utils/moments'

/**
 * Suppression définitive d'un professeur et de ses séances, passées comme à
 * venir : celles-ci quittent le site sans que les élèves soient prévenus.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const client = getServiceClient()
  // Les séances d'abord, sans compter sur la cascade de la clé étrangère.
  const { data: seances, error: e } = await client.from('moments_seances')
    .delete().eq('professeur_id', id).select('date, statut')
  if (e) throw createError({ statusCode: 500, statusMessage: e.message })
  const { error } = await client.from('moments_professeurs').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const aujourdhui = aujourdhuiParis()
  if (seances?.some(s => s.statut === 'reservee' && s.date >= aujourdhui)) await revalidatePublicPages()
  return { ok: true }
})
