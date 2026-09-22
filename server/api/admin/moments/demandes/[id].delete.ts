import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

/** Suppression d'une demande (droit à l'effacement, ou nettoyage). Le compte éventuel n'est pas touché. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { error } = await getServiceClient().from('moments_demandes').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
