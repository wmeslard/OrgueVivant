import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { affecterOrganiste, annulerSeancesImpossibles } from '~/server/utils/moments'

/**
 * Suppression d'une règle d'horaires. Retirer une ouverture peut rendre des
 * séances impossibles : elles sont annulées, les personnes inscrites prévenues.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const client = getServiceClient()
  const { error } = await client.from('moments_horaires').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const seancesAnnulees = await annulerSeancesImpossibles(client)
  // Un jeudi débloqué dans les deux prochains jours revient à Louis-Paul Courtois.
  await affecterOrganiste(client)
  await revalidatePublicPages()
  return { ok: true, seances_annulees: seancesAnnulees }
})
