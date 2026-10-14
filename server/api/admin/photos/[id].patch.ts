import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { champsAlbum, erreurPhotos, exigerUuid } from '~/server/utils/photos'

/**
 * Modifie un album : titre, date, concert lié, publication, couverture. Avec
 * `ordre` (la liste des identifiants de ses photos), range aussi les photos.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event)
  const champs = champsAlbum(body)
  const client = getServiceClient()

  const { data: siennes, error: e } = await client.from('photos').select('id').eq('album_id', id)
  if (e) throw erreurPhotos(e)
  const ids = new Set((siennes ?? []).map(p => p.id))
  if (champs.couverture_id && !ids.has(champs.couverture_id as string))
    throw createError({ statusCode: 400, statusMessage: 'Cette photo n\'est pas dans l\'album' })

  if (Object.keys(champs).length) {
    const { error } = await client.from('photo_albums').update(champs).eq('id', id)
    if (error) throw erreurPhotos(error)
  }

  if (body?.ordre !== undefined) {
    const ordre = Array.isArray(body.ordre) ? body.ordre.map(String) : []
    if (ordre.length !== ids.size || ordre.some(p => !ids.has(p)))
      throw createError({ statusCode: 400, statusMessage: 'Ordre incomplet : rechargez la page' })
    for (const [i, photo] of ordre.entries()) {
      const { error } = await client.from('photos').update({ ordre: i }).eq('id', photo).eq('album_id', id)
      if (error) throw erreurPhotos(error)
    }
  }
  return { ok: true }
})
