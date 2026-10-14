import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { champsAlbum, erreurPhotos } from '~/server/utils/photos'

/** Nouvel album, en brouillon : il n'apparaît nulle part tant qu'il n'est pas publié. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { titre, date, concert_id } = champsAlbum(await readBody(event))
  if (!titre) throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
  const { data, error } = await getServiceClient().from('photo_albums')
    .insert({ titre, date: date ?? null, concert_id: concert_id ?? null }).select().single()
  if (error) throw erreurPhotos(error)
  return data
})
