import { randomUUID } from 'node:crypto'
import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { ESPACE_PHOTOS, erreurPhotos, exigerUuid } from '~/server/utils/photos'

/**
 * Autorisations d'envoi d'une photo de l'album : la grande image et sa
 * vignette. Le navigateur de l'admin réduit la photo puis envoie les deux
 * fichiers directement à Supabase : rien ne transite par une fonction Vercel,
 * limitée à 4,5 Mo par requête.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const { format } = await readBody<{ format?: string }>(event)
  const ext = format === 'jpg' ? 'jpg' : 'webp'
  const client = getServiceClient()

  const { data: album, error: e } = await client.from('photo_albums').select('id').eq('id', id).maybeSingle()
  if (e) throw erreurPhotos(e)
  if (!album) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' })

  const base = `${id}/${randomUUID()}`
  const chemins = { chemin: `${base}.${ext}`, chemin_vignette: `${base}-vignette.${ext}` }
  const [grande, vignette] = await Promise.all([
    client.storage.from(ESPACE_PHOTOS).createSignedUploadUrl(chemins.chemin),
    client.storage.from(ESPACE_PHOTOS).createSignedUploadUrl(chemins.chemin_vignette)
  ])
  if (grande.error) throw erreurPhotos(grande.error)
  if (vignette.error) throw erreurPhotos(vignette.error)
  return { ...chemins, jeton: grande.data.token, jeton_vignette: vignette.data.token }
})
