import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { annulerSeancesImpossibles } from '~/server/utils/moments'

/**
 * Suppression d'une règle d'horaires. Retirer une ouverture peut rendre des
 * séances impossibles : elles sont annulées, professeurs et élèves prévenus.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const client = getServiceClient()
  const { error } = await client.from('moments_horaires').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const seancesAnnulees = await annulerSeancesImpossibles(client)
  await revalidatePublicPages()
  return { ok: true, seances_annulees: seancesAnnulees }
})
