import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

/** Suppression d'une candidature (droit à l'effacement, ou nettoyage). L'élève éventuel n'est pas touché. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { error } = await getServiceClient().from('moments_candidatures').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
