import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { ESPACE_PHOTOS, erreurPhotos, exigerUuid } from '~/server/utils/photos'

/** Supprime une photo et ses deux fichiers. Si c'était la couverture, l'album n'en a plus. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const client = getServiceClient()
  const { data: photo, error: e } = await client.from('photos').select('chemin, chemin_vignette').eq('id', id).maybeSingle()
  if (e) throw erreurPhotos(e)
  if (!photo) throw createError({ statusCode: 404, statusMessage: 'Photo introuvable' })
  const { error: s } = await client.storage.from(ESPACE_PHOTOS).remove([photo.chemin, photo.chemin_vignette])
  if (s) throw erreurPhotos(s)
  const { error } = await client.from('photos').delete().eq('id', id)
  if (error) throw erreurPhotos(error)
  return { ok: true }
})
