import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Albums photos de l'admin (supabase/photos.sql). Les fichiers vivent dans
 * l'espace « photos », rangés par album : `<album>/<aléatoire>.webp` pour la
 * grande image, `…-vignette.webp` pour la miniature des grilles.
 */
export const ESPACE_PHOTOS = 'photos'

export interface PhotoRow {
  id: string
  album_id: string
  chemin: string
  chemin_vignette: string
  largeur: number | null
  hauteur: number | null
  legende: string | null
  ordre: number
}

/** Table ou espace pas encore créés : on dit quoi exécuter plutôt qu'une erreur brute. */
export function erreurPhotos(error: { code?: string; message?: string } | null) {
  const absent = ['PGRST205', '42P01', 'PGRST200', 'PGRST204', '42703'].includes(error?.code ?? '')
    || /bucket not found/i.test(error?.message ?? '')
  return createError(absent
    ? { statusCode: 503, statusMessage: 'Les albums photos ne sont pas encore créés : exécutez supabase/photos.sql dans Supabase.' }
    : { statusCode: 500, statusMessage: error?.message || 'Erreur' })
}

export function exigerUuid(id: string | undefined): string {
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  return id
}

export function urlPhoto(client: SupabaseClient, chemin: string): string {
  return client.storage.from(ESPACE_PHOTOS).getPublicUrl(chemin).data.publicUrl
}

/** Une photo telle que l'admin l'affiche : ses deux adresses publiques en plus. */
export function avecUrls(client: SupabaseClient, p: PhotoRow) {
  return { ...p, url: urlPhoto(client, p.chemin), url_vignette: urlPhoto(client, p.chemin_vignette) }
}

/** Champs d'album reçus de l'admin, vérifiés. Seuls les champs présents sont renvoyés. */
export function champsAlbum(body: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {}
  if (body?.titre !== undefined) {
    const titre = typeof body.titre === 'string' ? body.titre.trim().slice(0, 160) : ''
    if (!titre) throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
    out.titre = titre
  }
  if (body?.date !== undefined) {
    if (body.date !== null && body.date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)))
      throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
    out.date = body.date || null
  }
  if (body?.concert_id !== undefined) {
    if (body.concert_id !== null && body.concert_id !== '') exigerUuid(String(body.concert_id))
    out.concert_id = body.concert_id || null
  }
  if (body?.publie !== undefined) out.publie = body.publie === true
  if (body?.couverture_id !== undefined) {
    if (body.couverture_id !== null) exigerUuid(String(body.couverture_id))
    out.couverture_id = body.couverture_id
  }
  return out
}
