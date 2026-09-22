import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis, requireEleve } from '~/server/utils/moments'

/** L'élève modifie le programme d'une de ses séances à venir. */
export default defineEventHandler(async (event) => {
  const eleve = await requireEleve(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ programme?: string }>(event)
  const programme = typeof body?.programme === 'string' ? body.programme.trim().slice(0, 600) : ''
  const client = getServiceClient()
  const { data, error } = await client
    .from('moments_seances')
    .update({ programme: programme || null })
    .eq('id', id)
    .eq('eleve_id', eleve.id)
    .eq('statut', 'reservee')
    .gte('date', aujourdhuiParis())
    .select()
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  await revalidatePublicPages()
  return data
})
