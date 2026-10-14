import { idYoutube } from '~/utils/youtube'

/**
 * Le lien du teaser saisi dans l'admin, ramené à une forme unique
 * (https://youtu.be/<id>), ou null s'il est vide. Un lien qui n'est pas une
 * vidéo YouTube est refusé.
 */
export function normaliserTeaser(body: Record<string, unknown>) {
  if (!('teaser_url' in body)) return
  const brut = String(body.teaser_url ?? '').trim()
  const id = idYoutube(brut)
  if (brut && !id) throw createError({ statusCode: 400, statusMessage: 'Teaser : lien YouTube non reconnu' })
  body.teaser_url = id ? `https://youtu.be/${id}` : null
}

/** Colonne teaser_url absente : supabase/teaser-concerts.sql pas encore exécuté. */
export function colonneTeaserAbsente(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST204' && /teaser_url/.test(error.message ?? '')
}

export const TEASER_A_INSTALLER = 'Exécutez supabase/teaser-concerts.sql dans Supabase pour enregistrer un teaser.'
