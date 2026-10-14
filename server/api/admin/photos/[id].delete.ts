import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { ESPACE_PHOTOS, erreurPhotos, exigerUuid } from '~/server/utils/photos'
import { PHOTOS_ISR_PATHS, revalidatePublicPages } from '~/server/utils/revalidate'

/** Supprime un album, ses photos et leurs fichiers. L'admin confirme avant. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const client = getServiceClient()
  const { data: photos, error: e } = await client.from('photos').select('*').eq('album_id', id)
  if (e) throw erreurPhotos(e)
  const fichiers = (photos ?? []).flatMap(p => [p.chemin, p.chemin_vignette, p.chemin_original]).filter(Boolean) as string[]
  for (let i = 0; i < fichiers.length; i += 100) {
    const { error } = await client.storage.from(ESPACE_PHOTOS).remove(fichiers.slice(i, i + 100))
    if (error) throw erreurPhotos(error)
  }
  const { error } = await client.from('photo_albums').delete().eq('id', id)
  if (error) throw erreurPhotos(error)
  await revalidatePublicPages(PHOTOS_ISR_PATHS)
  return { ok: true }
})
