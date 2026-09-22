import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { annulerSeancesImpossibles, validerRegle } from '~/server/utils/moments'

/** Modification d'une règle d'horaires ; mêmes conséquences qu'un ajout pour les séances inscrites. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const regle = validerRegle(await readBody(event))
  const client = getServiceClient()
  const { data, error } = await client.from('moments_horaires').update(regle).eq('id', id).select().maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Règle introuvable' })
  const seancesAnnulees = await annulerSeancesImpossibles(client, regle.motif)
  await revalidatePublicPages()
  return { ...data, seances_annulees: seancesAnnulees }
})
