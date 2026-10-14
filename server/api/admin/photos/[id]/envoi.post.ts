import { randomUUID } from 'node:crypto'
import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { ESPACE_PHOTOS, EXT_ORIGINAUX, erreurPhotos, exigerUuid } from '~/server/utils/photos'

/**
 * Autorisations d'envoi d'une photo de l'album : la copie d'affichage, sa
 * vignette et, avec `original` (son extension), le fichier d'origine. Le
 * navigateur de l'admin envoie les fichiers directement à Supabase : rien ne
 * transite par une fonction Vercel, limitée à 4,5 Mo par requête.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const { format, original } = await readBody<{ format?: string; original?: string }>(event)
  const ext = format === 'jpg' ? 'jpg' : 'webp'
  const extOriginal = typeof original === 'string' ? original.toLowerCase() : ''
  if (original !== undefined && !EXT_ORIGINAUX.includes(extOriginal))
    throw createError({ statusCode: 400, statusMessage: 'Format de photo non pris en charge' })
  const client = getServiceClient()

  const { data: album, error: e } = await client.from('photo_albums').select('id').eq('id', id).maybeSingle()
  if (e) throw erreurPhotos(e)
  if (!album) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' })
  // Vérifié avant tout envoi : sans la colonne, la photo ne pourrait pas être
  // enregistrée et ses fichiers resteraient orphelins dans le stockage.
  if (extOriginal) {
    const { error: c } = await client.from('photos').select('chemin_original').limit(1)
    if (c) throw createError({ statusCode: 503, statusMessage: 'Exécutez supabase/photos-originaux.sql dans Supabase avant d\'envoyer des photos.' })
  }

  const base = `${id}/${randomUUID()}`
  const chemins = { chemin: `${base}.${ext}`, chemin_vignette: `${base}-vignette.${ext}`, chemin_original: extOriginal ? `${base}-original.${extOriginal}` : null }
  const [grande, vignette, orig] = await Promise.all([
    client.storage.from(ESPACE_PHOTOS).createSignedUploadUrl(chemins.chemin),
    client.storage.from(ESPACE_PHOTOS).createSignedUploadUrl(chemins.chemin_vignette),
    chemins.chemin_original ? client.storage.from(ESPACE_PHOTOS).createSignedUploadUrl(chemins.chemin_original) : null
  ])
  if (grande.error) throw erreurPhotos(grande.error)
  if (vignette.error) throw erreurPhotos(vignette.error)
  if (orig?.error) throw erreurPhotos(orig.error)
  return { ...chemins, jeton: grande.data.token, jeton_vignette: vignette.data.token, jeton_original: orig?.data.token ?? null }
})
