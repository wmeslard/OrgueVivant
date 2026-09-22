import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis, requireProfesseur } from '~/server/utils/moments'

/** Le professeur corrige le programme d'une séance à venir. */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ programme?: string }>(event)
  const programme = typeof body?.programme === 'string' ? body.programme.trim().slice(0, 600) : ''
  const { data, error } = await getServiceClient()
    .from('moments_seances')
    .update({ programme: programme || null })
    .eq('id', id).eq('professeur_id', prof.id).eq('statut', 'reservee')
    .gte('date', aujourdhuiParis())
    .select().maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  await revalidatePublicPages()
  return data
})
