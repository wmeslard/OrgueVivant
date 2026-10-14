import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { erreurPhotos, exigerUuid } from '~/server/utils/photos'

/** La légende d'une photo, affichée sous la photo dans la visionneuse. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const { legende } = await readBody<{ legende?: unknown }>(event)
  const texte = typeof legende === 'string' ? legende.trim().slice(0, 300) : ''
  const { error } = await getServiceClient().from('photos').update({ legende: texte || null }).eq('id', id)
  if (error) throw erreurPhotos(error)
  return { ok: true }
})
