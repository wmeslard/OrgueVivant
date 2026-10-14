import { serverSupabaseClient } from '#supabase/server'

/**
 * Fiches concert et albums photos à inclure dans le sitemap. Lecture avec la clé publique :
 * la politique RLS expose déjà les concerts à tous les visiteurs, inutile
 * d'élever les droits. `_i18nTransform` laisse le module produire la
 * variante anglaise et les liens hreflang entre les deux.
 */
export default defineSitemapEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const [{ data, error }, albums] = await Promise.all([
    client.from('concerts').select('id').order('date', { ascending: false }),
    // Albums photos : la politique RLS ne laisse lire que les albums publiés.
    client.from('photo_albums').select('id')
  ])
  if (error) {
    console.warn('[sitemap] concerts indisponibles :', error.message)
    return []
  }
  if (albums.error) console.warn('[sitemap] albums indisponibles :', albums.error.message)
  return [
    ...(data ?? []).map(c => ({ loc: `/concerts/${c.id}`, _i18nTransform: true })),
    ...(albums.data ?? []).map(a => ({ loc: `/photos/${a.id}`, _i18nTransform: true }))
  ]
})
