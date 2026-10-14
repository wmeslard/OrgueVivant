import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { affecterOrganiste, annulerSeancesImpossibles, validerRegle } from '~/server/utils/moments'

/**
 * Nouvelle règle d'horaires, par défaut ou temporaire. Les séances déjà
 * inscrites qu'elle rend impossibles sont annulées, les personnes inscrites
 * prévenues.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const regle = validerRegle(await readBody(event))
  const client = getServiceClient()
  const { data, error } = await client.from('moments_horaires').insert(regle).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const seancesAnnulees = await annulerSeancesImpossibles(client, regle.motif)
  // Un jeudi débloqué dans les deux prochains jours revient à Louis-Paul Courtois.
  await affecterOrganiste(client)
  await revalidatePublicPages()
  return { ...data, seances_annulees: seancesAnnulees }
})
