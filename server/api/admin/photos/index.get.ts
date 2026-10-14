import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { erreurPhotos, urlPhoto } from '~/server/utils/photos'

/**
 * Les albums, du plus récent au plus ancien, avec leur nombre de photos et la
 * vignette de couverture (à défaut, la première photo) ; et les concerts, pour
 * relier un album à l'un d'eux.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getServiceClient()
  const [albums, photos, concerts] = await Promise.all([
    client.from('photo_albums').select('*').order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    client.from('photos').select('id, album_id, chemin_vignette, ordre').order('ordre'),
    client.from('concerts').select('id, title, date').is('deleted_at', null).order('date', { ascending: false })
  ])
  if (albums.error) throw erreurPhotos(albums.error)
  if (photos.error) throw erreurPhotos(photos.error)
  if (concerts.error) throw createError({ statusCode: 500, statusMessage: concerts.error.message })
  return {
    albums: (albums.data ?? []).map((a) => {
      const siennes = (photos.data ?? []).filter(p => p.album_id === a.id)
      const couverture = siennes.find(p => p.id === a.couverture_id) ?? siennes[0]
      return { ...a, nombre: siennes.length, couverture: couverture ? urlPhoto(client, couverture.chemin_vignette) : null }
    }),
    concerts: concerts.data ?? []
  }
})
