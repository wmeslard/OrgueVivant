import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { ESPACE_PHOTOS, avecUrls, erreurPhotos, exigerUuid, type PhotoRow } from '~/server/utils/photos'
import { PHOTOS_ISR_PATHS, revalidatePublicPages } from '~/server/utils/revalidate'

/**
 * Enregistre une photo une fois ses deux fichiers envoyés : à la fin de
 * l'album. La première photo d'un album en devient la couverture.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = exigerUuid(getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event)
  const chemin = String(body?.chemin ?? '')
  const vignette = String(body?.chemin_vignette ?? '')
  // Seuls des chemins délivrés pour cet album sont acceptés.
  const motif = new RegExp(`^${id}/[0-9a-f-]{36}(-vignette)?\\.(webp|jpg)$`)
  if (!motif.test(chemin) || !motif.test(vignette) || chemin.includes('-vignette') || !vignette.includes('-vignette'))
    throw createError({ statusCode: 400, statusMessage: 'Fichier invalide' })
  const dimension = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 && (v as number) < 20000 ? v as number : null)

  const client = getServiceClient()
  const dossier = chemin.slice(0, chemin.indexOf('/'))
  const nom = chemin.slice(chemin.indexOf('/') + 1)
  const { data: presents, error: l } = await client.storage.from(ESPACE_PHOTOS).list(dossier, { search: nom.replace(/\.(webp|jpg)$/, '') })
  if (l) throw erreurPhotos(l)
  if ((presents ?? []).length < 2) throw createError({ statusCode: 400, statusMessage: 'Fichiers non reçus : renvoyez la photo' })

  const [{ data: album, error: a }, { data: derniere }] = await Promise.all([
    client.from('photo_albums').select('id, couverture_id, publie').eq('id', id).maybeSingle(),
    client.from('photos').select('ordre').eq('album_id', id).order('ordre', { ascending: false }).limit(1).maybeSingle()
  ])
  if (a) throw erreurPhotos(a)
  if (!album) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' })

  const { data, error } = await client.from('photos').insert({
    album_id: id, chemin, chemin_vignette: vignette,
    largeur: dimension(body?.largeur), hauteur: dimension(body?.hauteur),
    ordre: (derniere?.ordre ?? -1) + 1
  }).select().single()
  if (error) throw erreurPhotos(error)
  if (!album.couverture_id) await client.from('photo_albums').update({ couverture_id: data.id }).eq('id', id)
  // Un album déjà publié change sur le site (nombre de photos, couverture).
  if (album.publie) await revalidatePublicPages(PHOTOS_ISR_PATHS)
  return avecUrls(client, data as PhotoRow)
})
