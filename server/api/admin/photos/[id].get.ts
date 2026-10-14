import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { avecUrls, erreurPhotos, exigerUuid, type PhotoRow } from '~/server/utils/photos'

/** Un album et ses photos, dans l'ordre choisi. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const client = getServiceClient()
  const [album, photos] = await Promise.all([
    client.from('photo_albums').select('*').eq('id', id).maybeSingle(),
    client.from('photos').select('*').eq('album_id', id).order('ordre').order('created_at')
  ])
  if (album.error) throw erreurPhotos(album.error)
  if (!album.data) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' })
  if (photos.error) throw erreurPhotos(photos.error)
  return { album: album.data, photos: (photos.data as PhotoRow[]).map(p => avecUrls(client, p)) }
})
